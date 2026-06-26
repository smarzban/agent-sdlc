import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Exercises the `prompt` verb end-to-end through the COMMITTED dist/ artifact — the build the
// installed plugin actually runs. Covers cli.ts dispatch + prompt-file resolution, which the
// prompts.ts unit tests (injected read) don't reach; doubles as a smoke test of the shipped binary.
const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const run = (args: string[]) => execFileSync("node", [CLI, ...args], { encoding: "utf8" });

describe("cli `prompt` verb (committed dist/ artifact)", () => {
  it("emits a reviewer prompt followed by its output contract", () => {
    const out = run(["prompt", "holistic"]);
    expect(out).toContain("# Holistic code review");
    expect(out).toContain("# Output contract"); // the output-contract was appended
  });

  it("serves an audit pass + the audit output contract", () => {
    expect(run(["prompt", "audit-tests"])).toContain("# Audit: test suite quality");
  });

  it("serves the simplicity / over-engineering lens + the review output contract", () => {
    const out = run(["prompt", "lens-simplify"]);
    expect(out).toContain("# Lens: simplicity & over-engineering");
    expect(out).toContain("# Output contract"); // review contract appended
  });

  it("serves the over-engineering audit pass + the audit output contract", () => {
    const out = run(["prompt", "audit-over-engineering"]);
    expect(out).toContain("# Audit: over-engineering & needless complexity");
    expect(out).toContain("# Audit output contract"); // audit contract appended
  });

  it("exits non-zero on an unsafe prompt name (no path traversal through the verb)", () => {
    expect(() => run(["prompt", "../../etc/passwd"])).toThrow();
  });
});

describe("cli `decide` verb — run metadata is required, the comment carries it (committed dist/)", () => {
  const dir = mkdtempSync(join(tmpdir(), "rg-cli-decide-"));
  const clusters = join(dir, "clusters.json");
  const adj = join(dir, "adj.json");
  const meta = join(dir, "meta.json");
  writeFileSync(clusters, JSON.stringify([{
    key: "a.ts::1", severity: "low", contested: false, members: [], agreement: { count: 1, total: 4 },
    representative: { title: "minor nit", severity: "low", file: "a.ts", line: 1, rationale: "r", suggestion: "s" },
  }]));
  writeFileSync(adj, "[]");
  writeFileSync(meta, JSON.stringify({
    reviewers: [{ reviewer: "holistic", model: "kimi-k2.7" }, { reviewer: "lens-security", model: "opus-4.8" }],
  }));

  it("emits the comment with the reviewer roster (no embedded sign-off — that's a separate orchestrator comment)", () => {
    const decision = JSON.parse(run(["decide", clusters, adj, meta]));
    expect(decision.verdict).toBe("pass");
    expect(decision.prComment).toContain("_Reviewed by:_ holistic + lens-security");
    expect(decision.prComment).not.toMatch(/orchestrator|sign-off/i);
  });

  it("exits non-zero when the run metadata is omitted — a comment without provenance/sign-off is never produced", () => {
    expect(() => run(["decide", clusters, adj])).toThrow();
  });

  it("exits non-zero when meta.json content is falsy/invalid (`null`) — the guarantee can't be bypassed by a falsy file", () => {
    const bad = join(dir, "meta-null.json");
    writeFileSync(bad, "null");
    expect(() => run(["decide", clusters, adj, bad])).toThrow();
  });

  it("renders the Progress section when a previous-round blocking file is supplied", () => {
    const prev = join(dir, "prev.json");
    writeFileSync(prev, JSON.stringify([{
      key: "a.ts::9::old", severity: "high", contested: false, members: [], agreement: { count: 1, total: 4 },
      representative: { title: "old blocker", severity: "high", file: "a.ts", line: 9, rationale: "r", suggestion: "s" },
    }]));
    const metaR2 = join(dir, "meta-r2.json");
    writeFileSync(metaR2, JSON.stringify({ reviewers: [{ reviewer: "holistic", model: "kimi" }], round: 2 }));
    const decision = JSON.parse(run(["decide", clusters, adj, metaR2, prev]));
    expect(decision.prComment).toContain("## Review Gate — Round 2");
    expect(decision.prComment).toContain("### Progress since Round 1");
    expect(decision.prComment).toMatch(/✅ Resolved \(1\)/); // a.ts::9::old absent from current clusters → resolved
  });

  it("omits the Progress section when no previous-round file is supplied (backward-compat)", () => {
    const decision = JSON.parse(run(["decide", clusters, adj, meta]));
    expect(decision.prComment).not.toContain("Progress since");
  });
});
