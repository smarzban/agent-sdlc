import { describe, it, expect } from "vitest";
import { buildCommand, parseFindings, parseClaudeResult, parseCodexFinal, runReview, isAffirmativelyEmpty, DEFAULT_ALLOWED_TOOLS, type ModelCall } from "../src/runner.js";

describe("buildCommand", () => {
  it("ollama backend launches claude via ollama with the model after `--`", () => {
    const { bin, args } = buildCommand("ollama", "kimi-k2.7-code:cloud", "review", "/repo");
    expect(bin).toBe("ollama");
    expect(args.slice(0, 5)).toEqual(["launch", "claude", "--model", "kimi-k2.7-code:cloud", "--"]);
    expect(args).toContain("--output-format"); expect(args).toContain("json");
    expect(args).toContain(DEFAULT_ALLOWED_TOOLS);
  });
  it("claude backend runs native claude with the model + read-only tools", () => {
    const { bin, args } = buildCommand("claude", "claude-opus-4-8", "review", "/repo");
    expect(bin).toBe("claude");
    expect(args[args.indexOf("--model") + 1]).toBe("claude-opus-4-8");
    expect(args).toContain("--output-format");
  });
  it("codex backend runs `codex exec` with high reasoning effort + read-only sandbox", () => {
    const { bin, args } = buildCommand("codex", "gpt-5.5", "review", "/repo");
    expect(bin).toBe("codex");
    expect(args.slice(0, 2)).toEqual(["exec", "-C"]);
    expect(args[args.indexOf("-m") + 1]).toBe("gpt-5.5");
    expect(args.join(" ")).toMatch(/model_reasoning_effort="high"/);
    expect(args.join(" ")).toMatch(/sandbox_mode="read-only"/);
  });
  it("read-only tools never include write/edit", () => {
    expect(DEFAULT_ALLOWED_TOOLS).not.toMatch(/Write|Edit/);
  });
  it("ollama and claude cap the agent loop with --max-turns (cost circuit-breaker against runaway request loops)", () => {
    for (const b of ["ollama", "claude"] as const) {
      const { args } = buildCommand(b, "m", "review", "/repo");
      const i = args.indexOf("--max-turns");
      expect(i, b).toBeGreaterThan(-1);
      expect(Number(args[i + 1]), b).toBeGreaterThan(0);
    }
  });
  it("codex does not get --max-turns (different CLI)", () => {
    expect(buildCommand("codex", "m", "review", "/repo").args).not.toContain("--max-turns");
  });
});

describe("parseFindings", () => {
  const one = JSON.stringify([{ title: "[sec] t", severity: "high", file: "a.ts", line: 5, rationale: "r", suggestion: "s" }]);
  it("parses bare / fenced / wrapped / embedded arrays", () => {
    expect(parseFindings(one)).toHaveLength(1);
    expect(parseFindings("```json\n" + one + "\n```")).toHaveLength(1);
    expect(parseFindings(`{"findings": ${one}}`)).toHaveLength(1);
    expect(parseFindings(`Here you go:\n${one}\nDone.`)).toHaveLength(1);
  });
  it("drops malformed rows; null when no array", () => {
    expect(parseFindings(JSON.stringify([{ title: "ok", severity: "low", file: "a", line: 1 }, { x: 1 }]))).toHaveLength(1);
    expect(parseFindings("no array here")).toBeNull();
  });
  it("treats an embedded [] inside prose as ambiguous (null), not an authoritative clean pass", () => {
    expect(parseFindings("No issues. [] But auth is broken at line 7.")).toBeNull(); // can't forge a clean pass with a buried []
    expect(parseFindings("[]")).toEqual([]);                                          // a bare empty array is still a valid empty result
  });
  it("tags findings source=model and IGNORES a model-supplied source (no forging a non-dismissible 'tool' fact)", () => {
    const f = parseFindings(JSON.stringify([{ title: "t", severity: "high", file: "a", line: 1, source: "tool" }]));
    expect(f![0].source).toBe("model");
  });

  it("salvages a fenced array wrapped in prose even when the prose carries stray brackets (the opus/glm failure mode)", () => {
    // Reasoning-heavy models narrate around a ```json fence. The first-[ … last-] slice over-grabs
    // when the prose has its own brackets ([0], array[i]); preferring the fenced block fixes it.
    const findings = [{ title: "[auth] missing authz check", severity: "high", file: "auth.ts", line: 12, rationale: "r", suggestion: "s" }];
    const reply = [
      "Looking at the diff I reviewed the Authenticator[0] path and found one real issue:",
      "",
      "```json",
      JSON.stringify(findings, null, 2),
      "```",
      "",
      "The most severe is the authz gap — note the array[i] indexing also looks suspect.",
    ].join("\n");
    const out = parseFindings(reply);
    expect(out).toHaveLength(1);
    expect(out![0].title).toBe("[auth] missing authz check");
  });

  it("salvages a fenced array tagged with a bare ``` (no json hint) amid bracket-heavy prose", () => {
    const findings = [{ title: "t", severity: "low", file: "a.ts", line: 1, rationale: "r", suggestion: "s" }];
    const reply = `See item[1] below:\n\`\`\`\n${JSON.stringify(findings)}\n\`\`\`\nEnd[.]`;
    expect(parseFindings(reply)).toHaveLength(1);
  });

  it("does NOT treat a fenced EMPTY array wrapped in prose as an authoritative clean pass (still ambiguous → null)", () => {
    const reply = "Here is my result:\n```json\n[]\n```\nBut actually auth.ts[12] is broken.";
    expect(parseFindings(reply)).toBeNull(); // a carved-out [] can't forge a clean vote, fenced or not
  });

  it("prefers the findings fence over an unrelated earlier fence (skips a non-array block)", () => {
    const findings = [{ title: "t", severity: "medium", file: "a.ts", line: 3, rationale: "r", suggestion: "s" }];
    const reply = [
      "First, the config I inspected:",
      "```json",
      '{"setting": true}',          // a non-findings object — must be skipped, not mistaken for the answer
      "```",
      "Then my findings:",
      "```json",
      JSON.stringify(findings),
      "```",
    ].join("\n");
    expect(parseFindings(reply)).toHaveLength(1);
  });

  // The panel (kimi+glm+codex, 3/3) caught these on the FIRST salvage cut: a non-findings / empty /
  // example array in an EARLIER fence either forged a clean [] vote or masked the real findings in a
  // later fence. Fix: take the LAST fence that validates to ≥1 real finding.
  const real = [{ title: "[bug] real", severity: "high", file: "x.ts", line: 9, rationale: "r", suggestion: "s" }];

  it("a non-findings array fence BEFORE the real findings does not forge a clean vote (the medium)", () => {
    const reply = `Files I touched:\n\`\`\`json\n["a.ts","b.ts"]\n\`\`\`\nFindings:\n\`\`\`json\n${JSON.stringify(real)}\n\`\`\``;
    const out = parseFindings(reply);
    expect(out).toHaveLength(1);            // not [] (clean vote), not the string array
    expect(out![0].title).toBe("[bug] real");
  });

  it("surfaces findings from EVERY fence — an example before the real answer is surfaced too, never silently dropped", () => {
    const example = [{ title: "[example] format demo", severity: "info", file: "doc.md", line: 1, rationale: "", suggestion: "" }];
    const reply = `Format I'll use:\n\`\`\`json\n${JSON.stringify(example)}\n\`\`\`\nNow the actual review:\n\`\`\`json\n${JSON.stringify(real)}\n\`\`\``;
    const out = parseFindings(reply);
    expect(out!.some(f => f.title === "[bug] real")).toBe(true);    // the real finding survives
    expect(out).toHaveLength(2);                                    // union: example (advisory info) + real — orchestrator adjudicates the example
  });

  it("an empty [] fence does not shadow real findings in a later fence", () => {
    const reply = `No issues in module A:\n\`\`\`json\n[]\n\`\`\`\nBut module B:\n\`\`\`json\n${JSON.stringify(real)}\n\`\`\``;
    expect(parseFindings(reply)).toHaveLength(1);
  });

  it("a lone non-findings array fence (no real fence) stays a non-vote (null), never a forged clean []", () => {
    const reply = "Changed files:\n```json\n[\"a.ts\", \"b.ts\"]\n```\nThat's the scope.";
    expect(parseFindings(reply)).toBeNull(); // string arrays validate to 0 findings → not a clean vote
  });

  // lens-security (glm+codex): a trailing decoy fence MUST NOT mask a real critical in an earlier fence.
  it("UNIONs findings across fences so a trailing decoy cannot mask a real critical in an earlier fence", () => {
    const critical = [{ title: "[sec] RCE", severity: "critical", file: "x.ts", line: 1, rationale: "r", suggestion: "s" }];
    const decoy = [{ title: "[style] nit", severity: "low", file: "y.ts", line: 2, rationale: "r", suggestion: "s" }];
    const reply = `Serious:\n\`\`\`json\n${JSON.stringify(critical)}\n\`\`\`\nMinor:\n\`\`\`json\n${JSON.stringify(decoy)}\n\`\`\``;
    const out = parseFindings(reply);
    expect(out!.some(f => f.severity === "critical" && f.title.includes("RCE"))).toBe(true); // NOT dropped
    expect(out).toHaveLength(2);
  });

  // lens-security (codex high): a whole-message array of elements that validate to ZERO findings is
  // garbage, not "no findings" — it must be a surfaced non-vote, never a forged clean [] vote.
  it("a whole-message array with elements but ZERO valid findings is a non-vote (null), not a forged clean []", () => {
    expect(parseFindings('["a.ts","b.ts"]')).toBeNull();                    // a list of strings is not a clean result
    expect(parseFindings('{"findings":[{"severity":"high"}]}')).toBeNull(); // no title/file → 0 valid → non-vote
    expect(parseFindings("[]")).toEqual([]);                                // a GENUINE empty array is still a clean vote
    expect(parseFindings('{"findings":[]}')).toEqual([]);                   // …as is a genuine empty wrapper
  });
});

describe("parseClaudeResult / parseCodexFinal", () => {
  it("extracts the result field from a claude envelope", () => {
    const env = JSON.stringify({ is_error: false, result: "[]" });
    expect(parseClaudeResult(env).isError).toBe(false);
  });
  it("flags is_error / unparseable envelopes", () => {
    expect(parseClaudeResult(JSON.stringify({ is_error: true, result: "[]" })).isError).toBe(true);
    expect(parseClaudeResult("nope").isError).toBe(true);
  });
  it("pulls the final assistant block out of a codex trace", () => {
    const trace = ["OpenAI Codex", "exec", "...tool output...", "codex", "thinking aloud", "codex", '[{"x":1}]', "tokens used", "2829"].join("\n");
    expect(parseCodexFinal(trace)).toBe('[{"x":1}]');
  });
});

describe("runReview", () => {
  const clean = JSON.stringify([{ title: "bug", severity: "high", file: "x.ts", line: 1, rationale: "r", suggestion: "s" }]);
  const claudeEnv = (result: string, is_error = false) => JSON.stringify({ is_error, result });
  const codexTrace = (result: string) => `exec\nfoo\ncodex\n${result}\ntokens used\n10`;

  it("parses an ollama/claude backend via the envelope", async () => {
    const call: ModelCall = async () => claudeEnv(clean);
    const { output } = await runReview("holistic", "ollama", "kimi-k2.7-code:cloud", "/repo", "p", { call });
    expect(output!.model).toBe("ollama:kimi-k2.7-code:cloud");
    expect(output!.findings).toHaveLength(1);
  });
  it("parses a codex backend via the trace footer", async () => {
    const call: ModelCall = async () => codexTrace(clean);
    const { output } = await runReview("holistic", "codex", "gpt-5.5", "/repo", "p", { call });
    expect(output!.model).toBe("codex:gpt-5.5");
    expect(output!.findings).toHaveLength(1);
  });
  it("passes backend + repoDir through to the call", async () => {
    let seen = { b: "", dir: "" };
    const call: ModelCall = async (b, _m, _p, dir) => { seen = { b, dir }; return claudeEnv("[]"); };
    await runReview("holistic", "claude", "claude-opus-4-8", "/work/pr", "p", { call });
    expect(seen).toEqual({ b: "claude", dir: "/work/pr" });
  });
  it("warns (never throws) on failure", async () => {
    const call: ModelCall = async () => { throw new Error("timed out after 600000ms"); };
    const { output, warning } = await runReview("holistic", "codex", "gpt-5.5", "/repo", "p", { call });
    expect(output).toBeNull();
    expect(warning).toMatch(/timed out/);
  });

  it("treats a completed 'no issues' prose reply as a 0-findings vote (not a failure)", async () => {
    const call: ModelCall = async () => claudeEnv("No issues found.");
    const { output, warning } = await runReview("holistic", "claude", "claude-opus-4-8", "/repo", "p", { call });
    expect(warning).toBeUndefined();
    expect(output!.findings).toEqual([]);
  });

  it("does NOT swallow a finding hidden behind a 'no issues … but …' reply (stays a non-vote)", async () => {
    const call: ModelCall = async () => claudeEnv("No critical issues, but bin/review-gate:7 is fragile under symlinks.");
    const { output, warning } = await runReview("holistic", "claude", "claude-opus-4-8", "/repo", "p", { call });
    expect(output).toBeNull();
    expect(warning).toMatch(/unparseable/);
  });

  it("also recognizes an empty 'no issues' reply on the codex trace path", async () => {
    const call: ModelCall = async () => codexTrace("No issues found in this change.");
    const { output } = await runReview("holistic", "codex", "gpt-5.5", "/repo", "p", { call });
    expect(output!.findings).toEqual([]);
  });
});

describe("isAffirmativelyEmpty (fail-safe: only an UNAMBIGUOUS whole-message 'no issues' counts)", () => {
  it("accepts a clean, whole-message empty declaration", () => {
    for (const s of ["No issues found.", "no issues", "I found no problems in this change.", "Looks good.", "LGTM", "Nothing to report.", "No bugs found", "[]"]) {
      expect(isAffirmativelyEmpty(s), s).toBe(true);
    }
  });
  it("accepts a fenced empty array", () => {
    expect(isAffirmativelyEmpty("```json\n[]\n```")).toBe(true);
  });
  it("REJECTS anything that hedges or carries extra substance (fail-open traps)", () => {
    for (const s of [
      "No critical issues, but the symlink handling is fragile.",          // contrast → hidden finding
      "No issues. The dist/ drift is a minor nit.",                        // empty phrase + extra substance
      "Overall solid. One concern: committed dist can go stale.",          // a real finding, softly phrased
      "No high-severity issues; see bin/review-gate:7 for a low one.",     // file:line reference
      "Looks good overall, though tests are thin.",                        // 'though' hedge
      '[{"title":"x"}]',                                                    // an actual (malformed) finding attempt
      "No issues, but thin tests.",                                        // COMMA-joined short hedge (the dogfood-found hole)
      "No issues, auth is broken.",                                        // comma-joined finding, no period separator
      "Zero problems, although the regex is fragile.",                     // 'although' after a comma
      "No critical issues found.",                                         // SCOPED — says nothing about lower severities
      "No security vulnerabilities.",                                      // scoped to one dimension
      "No issues 权限绕过",                                                  // non-ASCII finding text after "no issues"
      "No issues. [] But auth is broken at line 7.",                       // embedded [] + a real prose finding
      "No vulnerabilities found in this change.",                          // dimension-SCOPED (says nothing of correctness/perf)
      "No security issues.",                                               // scoped to one dimension
    ]) {
      expect(isAffirmativelyEmpty(s), s).toBe(false);
    }
  });
  it("rejects an empty/blank reply from a 'successful' run (suspect, not confidently empty)", () => {
    expect(isAffirmativelyEmpty("")).toBe(false);
    expect(isAffirmativelyEmpty("   \n  ")).toBe(false);
  });
});
