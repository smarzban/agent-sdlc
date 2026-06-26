import { describe, it, expect } from "vitest";
import { runScan, gitHygieneScanner } from "../src/scan.js";
import { consolidate } from "../src/consolidate.js";
import { decide } from "../src/decide.js";
import type { ReviewerOutput, Finding } from "../src/types.js";

// End-to-end wiring of the whole pool → spine path: scan → consolidate → decide. The per-stage unit
// tests hand-craft cluster keys (e.g. "a.ts::1") and never chain the stages, so nothing verifies that
// the key consolidate PRODUCES (`file::line::slug`) is the key decide EXPECTS for an adjudication
// lookup, nor that a scan-emitted tool fact survives consolidation and stays non-dismissible at the
// verdict. These pin those contracts — break either side and one of these fails.

const mf = (over: Partial<Finding>): Finding => ({
  title: "[area] x", severity: "high", file: "src/x.ts", line: 1,
  rationale: "r", suggestion: "s", source: "model", ...over,
});
const model = (m: string, findings: Finding[]): ReviewerOutput => ({ reviewer: "holistic", model: m, findings });

const CONFLICT_DIFF = [
  "diff --git a/src/app.ts b/src/app.ts",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,1 +1,3 @@",
  " const x = 1;",
  "+<<<<<<< HEAD",
  "+const y = 2;",
].join("\n");

describe("integration: scan → consolidate → decide", () => {
  it("a scan-detected conflict marker flows through consolidate→decide and CANNOT be dismissed (fact stays blocking)", async () => {
    const { output } = await runScan("/repo", "main", {
      diff: async () => CONFLICT_DIFF, names: async () => "src/app.ts\0", scanners: [gitHygieneScanner],
    });
    expect(output).toBeTruthy();
    const conflict = output!.findings.find((f) => f.title.includes("merge conflict"));
    expect(conflict).toBeTruthy();
    expect(conflict!.severity).toBe("critical");
    expect(conflict!.source).toBe("tool"); // a fact, not an opinion — must be tagged tool

    const clusters = consolidate([output!]);
    const toolCluster = clusters.find((c) => c.members.some((m) => m.finding.source === "tool"));
    expect(toolCluster).toBeTruthy();

    // Try to dismiss the FACT with a justification, keyed by consolidate's REAL cluster key.
    const d = decide(clusters, [{ key: toolCluster!.key, decision: "dismissed", justification: "looks intentional to me" }]);
    expect(d.verdict).toBe("block"); // the spine refuses to clear a tool fact
    expect(d.blocking.some((c) => c.key === toolCluster!.key)).toBe(true);
    expect(d.dismissed.some((x) => x.cluster.key === toolCluster!.key)).toBe(false); // never honored
  });

  it("two models agreeing on one spot form ONE cluster, and a justified dismissal keyed by consolidate's real key is honored at decide", () => {
    const m1 = model("ollama:glm-5.2:cloud", [mf({ title: "[security] missing authorization on endpoint", file: "src/api.ts", line: 10 })]);
    const m2 = model("codex:gpt-5.5", [mf({ title: "[security] endpoint authorization not enforced", file: "src/api.ts", line: 12 })]);

    const clusters = consolidate([m1, m2]);
    const c = clusters.find((x) => x.representative.file === "src/api.ts");
    expect(c).toBeTruthy();
    expect(c!.agreement).toEqual({ count: 2, total: 2 }); // both models merged into the one cluster

    // Unadjudicated → blocks. (Sanity: this is a gating cluster.)
    expect(decide(clusters).verdict).toBe("block");

    // A justified dismissal keyed by the EXACT key consolidate emitted is honored end-to-end.
    const d = decide(clusters, [{ key: c!.key, decision: "dismissed", justification: "endpoint sits behind the gateway's authz; verified" }]);
    expect(d.verdict).toBe("pass");
    expect(d.dismissed.some((x) => x.cluster.key === c!.key)).toBe(true);
  });

  it("two DISTINCT issues at the same file:line get distinct keys, so dismissing one leaves the other blocking", () => {
    const m = model("ollama:glm-5.2:cloud", [
      mf({ title: "[security] sql injection in query builder", file: "src/db.ts", line: 5 }),
      mf({ title: "[perf] n plus one fetch loop", file: "src/db.ts", line: 5 }),
    ]);
    const clusters = consolidate([m]);
    const dbClusters = clusters.filter((c) => c.representative.file === "src/db.ts");
    expect(dbClusters.length).toBe(2); // NOT merged — distinct issues
    expect(new Set(clusters.map((c) => c.key)).size).toBe(clusters.length); // all keys unique (no collision)

    const sql = dbClusters.find((c) => c.key.includes("sql"))!;
    const perf = dbClusters.find((c) => c.key.includes("plus"))!; // the n-plus-one cluster
    const d = decide(clusters, [{ key: sql.key, decision: "dismissed", justification: "parameterized query; false positive" }]);
    expect(d.verdict).toBe("block");
    expect(d.dismissed.map((x) => x.cluster.key)).toEqual([sql.key]); // ONLY the sql one cleared
    expect(d.blocking.map((c) => c.key)).toEqual([perf.key]);         // the perf issue is the one still blocking
  });
});
