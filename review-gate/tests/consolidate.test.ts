import { describe, it, expect } from "vitest";
import { consolidate } from "../src/consolidate.js";
import type { ReviewerOutput, Finding } from "../src/types.js";

const f = (file: string, line: number, severity: Finding["severity"], title = "t"): Finding =>
  ({ title, severity, file, line, rationale: "r", suggestion: "s" });
const out = (model: string, findings: Finding[]): ReviewerOutput => ({ reviewer: "holistic", model, findings });

describe("consolidate", () => {
  it("merges nearby findings from different models into one cluster with agreement count", () => {
    const clusters = consolidate([
      out("gpt", [f("App.tsx", 83, "high")]),
      out("deepseek", [f("App.tsx", 90, "high")]),  // within the line window of 83
      out("kimi", [f("App.tsx", 88, "high")]),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].agreement).toEqual({ count: 3, total: 3 });
    expect(clusters[0].contested).toBe(false); // unanimous gating → not contested
  });

  it("marks a gating finding only one model saw as contested", () => {
    const clusters = consolidate([
      out("gpt", [f("a.ts", 10, "high")]),
      out("deepseek", []),
      out("kimi", []),
    ]);
    expect(clusters[0].agreement).toEqual({ count: 1, total: 3 });
    expect(clusters[0].contested).toBe(true);
  });

  it("does not merge findings that are far apart", () => {
    const clusters = consolidate([out("gpt", [f("a.ts", 10, "high"), f("a.ts", 200, "high")])]);
    expect(clusters).toHaveLength(2);
  });

  it("takes the max severity as the cluster severity", () => {
    const clusters = consolidate([out("gpt", [f("a.ts", 5, "medium")]), out("deepseek", [f("a.ts", 6, "critical")])]);
    expect(clusters[0].severity).toBe("critical");
  });

  it("never marks a low/info finding contested (advisory only)", () => {
    const clusters = consolidate([out("gpt", [f("a.ts", 5, "low")]), out("deepseek", []), out("kimi", [])]);
    expect(clusters[0].contested).toBe(false);
  });

  it("sorts clusters by severity descending", () => {
    const clusters = consolidate([out("gpt", [f("a.ts", 5, "low"), f("b.ts", 5, "critical")])]);
    expect(clusters[0].severity).toBe("critical");
  });
});

describe("consolidate — topical split of co-located findings (the adjacent-merge bug from the dogfood)", () => {
  it("does NOT merge distinct adjacent findings whose titles share no significant token", () => {
    const clusters = consolidate([
      out("kimi", [f("bin/review-gate", 7, "low", "Launcher breaks when exposed via symlink")]),
      out("opus", [f("bin/review-gate", 8, "info", "node is required but missing from README prerequisites")]),
    ]);
    expect(clusters).toHaveLength(2); // two unrelated issues at adjacent lines must not become one "2/N" cluster
  });

  it("still merges adjacent SAME-issue findings that share a title token despite different wording", () => {
    const clusters = consolidate([
      out("kimi", [f("foo.ts", 10, "high", "null deref on request body")]),
      out("opus", [f("foo.ts", 11, "high", "unchecked body access")]), // shares "body"
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].agreement.count).toBe(2);
  });

  it("falls back to location-only merging when a title is uninformative (no significant tokens)", () => {
    const clusters = consolidate([
      out("gpt", [f("a.ts", 10, "high", "bug")]),
      out("kimi", [f("a.ts", 12, "high", "the it")]), // only stopwords/short → no signal to split on
    ]);
    expect(clusters).toHaveLength(1); // can't justify a split → keep the conservative location merge
  });

  it("gives two distinct same-line clusters DISTINCT keys (one adjudication must not clear both)", () => {
    const clusters = consolidate([
      out("kimi", [f("a.ts", 8, "high", "symlink resolution is broken")]),
      out("opus", [f("a.ts", 8, "high", "missing null check on the request")]), // same line, different issue
    ]);
    expect(clusters).toHaveLength(2);
    expect(new Set(clusters.map((c) => c.key)).size).toBe(2); // unique keys → decide can't collide them
  });

  it("does NOT merge findings sharing only a generic descriptor word (bug/issue/error)", () => {
    const clusters = consolidate([
      out("kimi", [f("a.ts", 10, "high", "null deref bug in handler")]),
      out("opus", [f("a.ts", 11, "high", "n+1 query bug in list endpoint")]), // share only "bug"
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("still merges a tool finding with a co-located model finding (tool falls back to location)", () => {
    const clusters = consolidate([
      out("gpt", [f("a.ts", 10, "high", "possible secret in a config literal")]),
      toolOut([tf("a.ts", 11, "high")]), // tool title can't share model vocab — but co-location means same spot
    ]);
    expect(clusters.filter((c) => c.key.startsWith("a.ts"))).toHaveLength(1);
  });

  it("does NOT let an uninformative ('bug') title force a merge with a distinct real finding", () => {
    const clusters = consolidate([
      out("real", [f("a.ts", 8, "high", "auth bypass via missing token check")]),
      out("attacker", [f("a.ts", 8, "critical", "bug")]), // contentless title must not absorb (and risk clearing) the real one
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("gives distinct keys to same-line findings whose titles share a long (stopword) prefix — no slug-truncation collision", () => {
    const pre = "the and or but with for not is are be of to in on this that "; // >40 chars of stopwords
    const clusters = consolidate([
      out("m1", [f("a.ts", 8, "high", pre + "alpha")]),
      out("m2", [f("a.ts", 8, "high", pre + "omega")]), // distinct issue (alpha vs omega), shared 40-char prefix
    ]);
    expect(clusters).toHaveLength(2);
    expect(new Set(clusters.map((c) => c.key)).size).toBe(2); // keys must stay unique past 40 chars
  });
});

// Episode 4 (#4): carry the REVIEWER role through to members so one model in several roles is
// attributable — while agreement stays by distinct MODEL (a model in N roles is ONE vote, never inflated).
describe("consolidate — reviewer provenance (one model, several roles)", () => {
  const outR = (reviewer: string, model: string, findings: Finding[]): ReviewerOutput => ({ reviewer, model, findings });

  it("carries the reviewer role + model into cluster members", () => {
    const clusters = consolidate([outR("holistic", "opus", [f("a.ts", 10, "high")])]);
    expect(clusters[0].members[0].reviewer).toBe("holistic");
    expect(clusters[0].members[0].model).toBe("opus");
  });

  it("the SAME model in two roles is ONE vote (no agreement inflation), but both roles stay attributable", () => {
    const clusters = consolidate([
      outR("holistic", "opus", [f("a.ts", 10, "high")]),
      outR("lens-simplify", "opus", [f("a.ts", 11, "high")]), // same model, different role, co-located same issue
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].agreement).toEqual({ count: 1, total: 1 });            // ONE model — not 2
    expect(new Set(clusters[0].members.map((m) => m.reviewer))).toEqual(new Set(["holistic", "lens-simplify"]));
  });

  it("two distinct models on the same issue still count as two (real consensus preserved)", () => {
    const clusters = consolidate([
      outR("holistic", "opus", [f("a.ts", 10, "high", "null deref body")]),
      outR("holistic", "codex", [f("a.ts", 11, "high", "body null deref")]), // shares "body"
    ]);
    expect(clusters[0].agreement.count).toBe(2);
  });
});

// Tool (deterministic) outputs join the same pool but are NOT model reviewers — they must not
// count toward the model-agreement denominator/numerator (the panel-inflation bug from the dogfood).
const toolOut = (findings: Finding[]): ReviewerOutput => ({ reviewer: "tools", model: "deterministic", findings });
const tf = (file: string, line: number, severity: Finding["severity"]): Finding =>
  ({ title: "tool", severity, file, line, rationale: "r", suggestion: "s", source: "tool" });

describe("consolidate — tool outputs vs model agreement", () => {
  it("excludes the tool output from total and count when models also flag the spot", () => {
    const clusters = consolidate([
      out("gpt", [f("a.ts", 10, "high")]),
      out("deepseek", [f("a.ts", 12, "high")]),
      toolOut([tf("a.ts", 10, "high")]),
    ]);
    expect(clusters[0].agreement).toEqual({ count: 2, total: 2 }); // 2 models, not 3
    expect(clusters[0].contested).toBe(false);                      // unanimous among models
  });

  it("does not flip a unanimous model finding to contested just because a tool output exists elsewhere", () => {
    const clusters = consolidate([
      out("gpt", [f("a.ts", 10, "high")]),
      out("deepseek", [f("a.ts", 12, "high")]),
      toolOut([tf("other.ts", 1, "high")]),
    ]);
    const c = clusters.find((x) => x.key.startsWith("a.ts"))!;
    expect(c.agreement).toEqual({ count: 2, total: 2 });
    expect(c.contested).toBe(false);
  });

  it("a tool-only cluster reports 0 model agreement (the tool is not a model)", () => {
    const clusters = consolidate([out("gpt", [f("a.ts", 10, "high")]), toolOut([tf("b.ts", 5, "high")])]);
    const c = clusters.find((x) => x.key.startsWith("b.ts"))!;
    expect(c.agreement).toEqual({ count: 0, total: 1 });
  });

  it("does not cluster a line-0 (file-level) path finding with a lined model finding in the same file", () => {
    const clusters = consolidate([out("gpt", [f("x.ts", 5, "high")]), toolOut([tf("x.ts", 0, "high")])]);
    expect(clusters).toHaveLength(2); // file-level finding stays separate; the model finding isn't masked
  });

  it("does not mark a tool-only cluster contested (a fact is not model disagreement)", () => {
    const clusters = consolidate([out("gpt", [f("a.ts", 5, "high")]), toolOut([tf("b.ts", 10, "high")])]);
    const c = clusters.find((x) => x.key.startsWith("b.ts"))!;
    expect(c.agreement.count).toBe(0);
    expect(c.contested).toBe(false); // count 0 → not "disagreement"; it just blocks
  });
});
