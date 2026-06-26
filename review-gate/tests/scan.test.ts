import { describe, it, expect } from "vitest";
import { parseDiff, gitHygiene, runScan, diffArgs, namesArgs, envNum, secretsScanner, depsScanner, gitHygieneScanner, type Changeset, type ToolRunner } from "../src/scan.js";

const cs = (addedLines: Changeset["addedLines"], files?: string[]): Changeset =>
  ({ files: files ?? [...new Set(addedLines.map((a) => a.file))], addedLines });

describe("parseDiff", () => {
  it("extracts added lines with new-file line numbers, and the changed files", () => {
    const diff = [
      "diff --git a/src/app.ts b/src/app.ts",
      "index 111..222 100644",
      "--- a/src/app.ts",
      "+++ b/src/app.ts",
      "@@ -10,3 +10,4 @@ function f() {",
      " const a = 1;",
      "+const b = 2;",
      "-const old = 0;",
      " const c = 3;",
      "@@ -50,2 +51,3 @@",
      "+const d = 4;",
      " tail",
    ].join("\n");
    const cs = parseDiff(diff);
    expect(cs.files).toEqual(["src/app.ts"]);
    expect(cs.addedLines).toEqual([
      { file: "src/app.ts", line: 11, text: "const b = 2;" },
      { file: "src/app.ts", line: 51, text: "const d = 4;" },
    ]);
  });

  it("ignores deleted files (+++ /dev/null) and counts only added lines", () => {
    const diff = [
      "diff --git a/gone.ts b/gone.ts",
      "--- a/gone.ts",
      "+++ /dev/null",
      "@@ -1,2 +0,0 @@",
      "-was here",
      "-and here",
    ].join("\n");
    const c = parseDiff(diff);
    expect(c.files).toEqual([]);
    expect(c.addedLines).toEqual([]);
  });

  it("skips the '\\ No newline at end of file' marker without advancing line numbers", () => {
    const diff = ["diff --git a/x.ts b/x.ts", "--- a/x.ts", "+++ b/x.ts", "@@ -1,2 +1,2 @@", "-old", "\\ No newline at end of file", "+new", "+after"].join("\n");
    const c = parseDiff(diff);
    expect(c.addedLines.find((a) => a.text === "after")!.line).toBe(2); // not drifted to 3
  });

  it("treats '+++ ...' inside a hunk body as an added line, not a file header (no phantom file, no drift)", () => {
    const diff = [
      "diff --git a/x.ts b/x.ts", "--- a/x.ts", "+++ b/x.ts",
      "@@ -1,1 +1,2 @@", " ok", "+++ plus",
      "@@ -5,1 +6,1 @@", "+tail",
    ].join("\n");
    const c = parseDiff(diff);
    expect(c.files).toEqual(["x.ts"]); // no phantom "plus" file
    expect(c.addedLines.find((a) => a.text === "++ plus")).toMatchObject({ file: "x.ts", line: 2 });
    expect(c.addedLines.find((a) => a.text === "tail")!.line).toBe(6); // line numbers not drifted
  });
});

describe("gitHygiene", () => {
  it("flags a merge conflict marker as critical, sourced from the tool", () => {
    const f = gitHygiene(cs([{ file: "a.ts", line: 5, text: "<<<<<<< HEAD" }]));
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("critical");
    expect(f[0].source).toBe("tool");
    expect(f[0]).toMatchObject({ file: "a.ts", line: 5 });
  });

  it("flags a focused test in a TEST file as advisory (low, non-gating heuristic)", () => {
    const f = gitHygiene(cs([{ file: "a.test.ts", line: 10, text: "  it.only('x', () => {" }]));
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("low");
    expect(f[0].area).toBe("test-coverage");
  });

  it("flags a left-in debugger statement in a JS/TS file", () => {
    const f = gitHygiene(cs([{ file: "a.ts", line: 3, text: "  debugger;" }]));
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("medium");
  });

  it("does NOT flag a line-leading `debugger` identifier in a non-JS file", () => {
    expect(gitHygiene(cs([{ file: "app.py", line: 1, text: "debugger = get_logger()" }]))).toEqual([]);
  });

  it("flags a committed .env file by path (no added line needed)", () => {
    const f = gitHygiene(cs([], [".env"]));
    expect(f).toHaveLength(1);
    expect(f[0].severity).toBe("high");
    expect(f[0].file).toBe(".env");
  });

  it("does not flag .env.example or example variants like .env.example.local", () => {
    expect(gitHygiene(cs([], [".env.example"]))).toEqual([]);
    expect(gitHygiene(cs([], [".env.example.local"]))).toEqual([]);
  });

  it("flags suffix env files like prod.env / secrets.env, not only .env*", () => {
    expect(gitHygiene(cs([], ["config/prod.env"]))[0]?.severity).toBe("high");
    expect(gitHygiene(cs([], ["secrets.env"]))[0]?.severity).toBe("high");
  });

  it("returns [] for a clean changeset", () => {
    expect(gitHygiene(cs([{ file: "a.ts", line: 1, text: "const x = 1;" }]))).toEqual([]);
  });
});

describe("runScan", () => {
  const diffWith = (...added: string[]) =>
    ["diff --git a/x.ts b/x.ts", "--- a/x.ts", "+++ b/x.ts", "@@ -1,1 +1,2 @@", " ok", ...added.map((l) => "+" + l)].join("\n");

  it("parses the diff, runs scanners, and returns one ReviewerOutput tagged source=tool", async () => {
    const { output, warning } = await runScan("/repo", "origin/main", { diff: async () => diffWith("<<<<<<< HEAD"), names: async () => "x.ts\n" });
    expect(warning).toBeUndefined();
    expect(output).toMatchObject({ reviewer: "tools", model: "deterministic" });
    expect(output!.findings).toHaveLength(1);
    expect(output!.findings[0].source).toBe("tool");
  });

  it("passes repoDir + baseRef through to the diff call", async () => {
    let seen = { dir: "", base: "" };
    await runScan("/work/pr", "main", { diff: async (dir, base) => { seen = { dir, base }; return ""; }, names: async () => "" });
    expect(seen).toEqual({ dir: "/work/pr", base: "main" });
  });

  it("flags a committed .env that appears only via --name-only (e.g. a pure rename, no +++ header)", async () => {
    const { output } = await runScan("/r", "main", { diff: async () => "", names: async () => ".env\n" });
    expect(output!.findings.some((f) => f.file === ".env" && f.severity === "high")).toBe(true);
  });

  it("fails CLOSED (emits a gating tool finding, never throws) when the scan can't complete", async () => {
    const { output, warning } = await runScan("/repo", "main", { diff: async () => { throw new Error("git boom"); }, names: async () => "" });
    expect(warning).toMatch(/git boom/);
    expect(output).not.toBeNull(); // a scan that can't run must NOT silently pass
    expect(output!.findings).toHaveLength(1);
    expect(["high", "critical"]).toContain(output!.findings[0].severity);
    expect(output!.findings[0].source).toBe("tool");
  });

  it("aggregates a skipped tool scanner's warning while still returning the other findings", async () => {
    const { output, warning } = await runScan("/r", "main", {
      diff: async () => diffWith("<<<<<<< HEAD"), names: async () => "x.ts\n",
      scanners: [gitHygieneScanner, secretsScanner], run: async () => ({ stdout: "", stderr: "", code: 0, missing: true }),
    });
    expect(output!.findings).toHaveLength(1); // gitHygiene conflict marker
    expect(warning).toMatch(/gitleaks/i);     // secrets-scanner skip surfaced
  });

  it("fails CLOSED on an option-shaped baseRef without running git", async () => {
    let called = false;
    const { output, warning } = await runScan("/r", "--output=/tmp/x", { diff: async () => { called = true; return ""; }, names: async () => "" });
    expect(called).toBe(false); // never reached the git call
    expect(warning).toMatch(/baseRef|ref/i);
    expect(output!.findings.some((f) => f.severity === "high" || f.severity === "critical")).toBe(true);
  });
});

describe("envNum", () => {
  it("falls back to the default for missing / non-numeric / non-positive overrides", () => {
    expect(envNum(undefined, 10)).toBe(10);
    expect(envNum("abc", 10)).toBe(10); // NaN must not disable a safety cap
    expect(envNum("0", 10)).toBe(10);
    expect(envNum("-5", 10)).toBe(10);
    expect(envNum("42", 10)).toBe(42);
  });

  it("clamps an over-large override to setTimeout's max so it can't wrap to a ~1ms instant-fire", () => {
    expect(envNum("999999999999", 10)).toBe(2_147_483_647);
  });
});

// A ToolRunner stub — no real subprocess. `missing:true` mimics the binary not being on PATH;
// `timedOut`/`truncated` mimic a present-but-failed run.
const fakeRun = (r: Partial<{ stdout: string; stderr: string; code: number; missing: boolean; timedOut: boolean; truncated: boolean }>): ToolRunner =>
  async () => ({ stdout: "", stderr: "", code: 0, missing: false, timedOut: false, truncated: false, ...r });
const scanInput = (changeset: Changeset, run: ToolRunner) => ({ repoDir: "/r", changeset, run });

describe("gitHygieneScanner (pure, wrapped)", () => {
  it("produces the gitHygiene findings and never touches the tool runner", async () => {
    let ran = false;
    const r = await gitHygieneScanner.scan(scanInput(cs([{ file: "a.ts", line: 1, text: "<<<<<<< HEAD" }]), async () => { ran = true; return { stdout: "", stderr: "", code: 0, missing: false }; }));
    expect(ran).toBe(false);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].severity).toBe("critical");
  });
});

describe("secretsScanner (gitleaks)", () => {
  it("skips with a warning when gitleaks is not on PATH", async () => {
    const r = await secretsScanner.scan(scanInput(cs([], ["a.ts"]), fakeRun({ missing: true })));
    expect(r.findings).toEqual([]);
    expect(r.warning).toMatch(/gitleaks/i);
    expect(r.warning).toMatch(/not on PATH|skip/i);
  });

  it("maps gitleaks JSON hits to CRITICAL tool findings, scoped to changed files", async () => {
    const json = JSON.stringify([
      { Description: "AWS Access Key", File: "src/config.ts", StartLine: 12, RuleID: "aws-access-key" },
      { Description: "Generic", File: "vendor/x.ts", StartLine: 3, RuleID: "generic-api-key" }, // not changed
    ]);
    const r = await secretsScanner.scan(scanInput(cs([], ["src/config.ts"]), fakeRun({ stdout: json, code: 1 })));
    expect(r.findings).toHaveLength(1); // only the changed-file hit
    expect(r.findings[0]).toMatchObject({ severity: "critical", file: "src/config.ts", line: 12, source: "tool" });
    expect(r.findings[0].area).toBe("security");
  });

  it("returns [] without running gitleaks when no files changed", async () => {
    let ran = false;
    const r = await secretsScanner.scan(scanInput(cs([], []), async () => { ran = true; return { stdout: "", stderr: "", code: 0, missing: false }; }));
    expect(ran).toBe(false);
    expect(r.findings).toEqual([]);
  });

  it("FAILS CLOSED when gitleaks ran but did not exit cleanly (timeout / cap / error)", async () => {
    for (const bad of [{ timedOut: true, code: -1 }, { truncated: true, code: -1 }, { code: 2 }]) {
      const r = await secretsScanner.scan(scanInput(cs([], ["a.ts"]), fakeRun(bad)));
      expect(r.findings).toHaveLength(1);
      expect(r.findings[0].severity).toBe("high"); // gating + (as a tool finding) non-dismissible
      expect(r.warning).toBeTruthy();
    }
  });

  it("treats gitleaks exit 1 (leaks found) as a clean run, not a failure", async () => {
    const json = JSON.stringify([{ File: "a.ts", StartLine: 1, RuleID: "k" }]);
    const r = await secretsScanner.scan(scanInput(cs([], ["a.ts"]), fakeRun({ stdout: json, code: 1 })));
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].severity).toBe("critical");
  });

  it("matches hits reported as ABSOLUTE paths by normalizing to repo-relative", async () => {
    const json = JSON.stringify([{ File: "/work/repo/src/config.ts", StartLine: 5, RuleID: "k" }]);
    const r = await secretsScanner.scan({ repoDir: "/work/repo", changeset: cs([], ["src/config.ts"]), run: fakeRun({ stdout: json, code: 1 }) });
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].file).toBe("src/config.ts");
  });

  it("warns when gitleaks reported hits but none matched the changeset (path-format mismatch)", async () => {
    const json = JSON.stringify([{ File: "totally/elsewhere.ts", StartLine: 5, RuleID: "k" }]);
    const r = await secretsScanner.scan(scanInput(cs([], ["src/config.ts"]), fakeRun({ stdout: json, code: 1 })));
    expect(r.findings).toEqual([]);
    expect(r.warning).toMatch(/none matched|mismatch/i);
  });

  it("FAILS CLOSED when a present gitleaks emits non-JSON stdout (exit 1)", async () => {
    const r = await secretsScanner.scan(scanInput(cs([], ["a.ts"]), fakeRun({ stdout: "gitleaks 8.x\nnot json", code: 1 })));
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].severity).toBe("high");
  });

  it("treats empty gitleaks stdout as a clean no-leaks result (not a failure)", async () => {
    const r = await secretsScanner.scan(scanInput(cs([], ["a.ts"]), fakeRun({ stdout: "", code: 0 })));
    expect(r.findings).toEqual([]);
  });

  it("disables in-source allow comments + neutralizes an in-checkout .gitleaksignore", async () => {
    let seen: string[] = [];
    await secretsScanner.scan(scanInput(cs([], ["a.ts"]), async (_b, args) => { seen = args; return { stdout: "[]", stderr: "", code: 0, missing: false }; }));
    expect(seen).toContain("--ignore-gitleaks-allow");
    expect(seen).toContain("--gitleaks-ignore-path"); // an attacker's committed .gitleaksignore can't suppress detections
  });

  it("flags a gating finding when the PR changes a secret-scanner policy file", async () => {
    const r = await secretsScanner.scan(scanInput(cs([], [".gitleaksignore"]), fakeRun({ stdout: "[]", code: 0 })));
    expect(r.findings.some((f) => f.severity === "high" && /policy/i.test(f.title))).toBe(true);
  });
});

describe("depsScanner (osv-scanner)", () => {
  it("returns [] without running when no manifest/lockfile changed", async () => {
    let ran = false;
    const r = await depsScanner.scan(scanInput(cs([], ["src/a.ts"]), async () => { ran = true; return { stdout: "", stderr: "", code: 0, missing: false }; }));
    expect(ran).toBe(false);
    expect(r.findings).toEqual([]);
  });

  it("skips with a warning when osv-scanner is not installed", async () => {
    const r = await depsScanner.scan(scanInput(cs([], ["package-lock.json"]), fakeRun({ missing: true })));
    expect(r.findings).toEqual([]);
    expect(r.warning).toMatch(/osv-scanner/i);
  });

  it("maps osv vulnerabilities for a changed manifest to HIGH dependency findings", async () => {
    const osv = JSON.stringify({ results: [{ source: { path: "package-lock.json" }, packages: [{ package: { name: "lodash", version: "4.17.20", ecosystem: "npm" }, vulnerabilities: [{ id: "GHSA-xxxx", summary: "Prototype pollution" }] }] }] });
    const r = await depsScanner.scan(scanInput(cs([], ["package-lock.json"]), fakeRun({ stdout: osv, code: 1 })));
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0]).toMatchObject({ severity: "high", source: "tool", area: "dependency" });
    expect(r.findings[0].title).toMatch(/GHSA-xxxx|lodash/);
  });

  it("does NOT mis-attribute a nested manifest's CVE to a changed root manifest", async () => {
    const osv = JSON.stringify({ results: [{ source: { path: "node_modules/foo/package.json" }, packages: [{ package: { name: "foo" }, vulnerabilities: [{ id: "X" }] }] }] });
    const r = await depsScanner.scan(scanInput(cs([], ["package.json"]), fakeRun({ stdout: osv, code: 1 })));
    expect(r.findings).toEqual([]); // nested node_modules manifest must not match the changed root one
  });

  it("FAILS CLOSED when osv-scanner ran but did not exit cleanly", async () => {
    const r = await depsScanner.scan(scanInput(cs([], ["package-lock.json"]), fakeRun({ code: 127 })));
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].severity).toBe("high");
  });

  it("FAILS CLOSED when a present osv-scanner emits non-JSON stdout", async () => {
    const r = await depsScanner.scan(scanInput(cs([], ["package-lock.json"]), fakeRun({ stdout: "log noise, not json", code: 1 })));
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].severity).toBe("high");
  });

  it("flags a gating finding when the PR changes an osv-scanner policy file", async () => {
    const r = await depsScanner.scan(scanInput(cs([], ["osv-scanner.toml"]), fakeRun({ stdout: "{}", code: 0 })));
    expect(r.findings.some((f) => f.severity === "high" && /policy/i.test(f.title))).toBe(true);
  });
});

describe("git invocation flags", () => {
  it("forces deterministic, parseable plumbing output regardless of user/CI git config", () => {
    const d = diffArgs("main").join(" ");
    expect(d).toMatch(/--no-color/);
    expect(d).toMatch(/--no-ext-diff/);
    expect(d).toMatch(/color\.ui=false/);
    expect(d).toMatch(/core\.quotePath=false/);
    expect(d).toMatch(/diff\.noprefix=false/);
    expect(d).toContain("main...HEAD");
    expect(namesArgs("main").join(" ")).toMatch(/--name-only/);
    expect(namesArgs("main")).toContain("-z"); // NUL-delimited names — robust to newlines/control chars in paths
  });

  it("puts --end-of-options immediately before the revision range so an option-shaped ref can't inject", () => {
    for (const a of [diffArgs("main"), namesArgs("main")]) {
      expect(a[a.length - 2]).toBe("--end-of-options");
      expect(a[a.length - 1]).toBe("main...HEAD");
    }
  });
});

describe("gitHygiene focused-test rule — scoped to test files, statement-anchored", () => {
  it("does NOT flag model.fit() or a bare fit( in application code", () => {
    expect(gitHygiene(cs([{ file: "src/model.ts", line: 1, text: "  const m = model.fit(X, y);" }]))).toEqual([]);
    expect(gitHygiene(cs([{ file: "src/chart.ts", line: 1, text: "  fit(container);" }]))).toEqual([]);
  });

  it("does NOT flag .only mentioned in a string or comment (anchored to statement start)", () => {
    expect(gitHygiene(cs([{ file: "a.test.ts", line: 1, text: '  const s = "it.only(x)";' }]))).toEqual([]);
    expect(gitHygiene(cs([{ file: "a.test.ts", line: 2, text: "  // remove it.only() before committing" }]))).toEqual([]);
  });

  it("flags a real focused test (and chained forms) in a TEST file", () => {
    expect(gitHygiene(cs([{ file: "a.test.ts", line: 3, text: "  it.only('x', () => {" }]))).toHaveLength(1);
    expect(gitHygiene(cs([{ file: "a.spec.ts", line: 4, text: "  test.concurrent.only('y', () => {" }]))).toHaveLength(1);
  });

  it("does NOT apply the focused-test rule outside test files", () => {
    expect(gitHygiene(cs([{ file: "src/app.ts", line: 3, text: "  it.only('x', () => {" }]))).toEqual([]);
  });
});

describe("gitHygiene other guards", () => {
  it("only flags a bare ======= when the same file also has a conflict start marker", () => {
    expect(gitHygiene(cs([{ file: "README.md", line: 1, text: "=======" }]))).toEqual([]); // markdown setext underline
    const real = gitHygiene(cs([{ file: "a.ts", line: 1, text: "<<<<<<< HEAD" }, { file: "a.ts", line: 5, text: "=======" }]));
    expect(real.length).toBeGreaterThanOrEqual(1);
  });

  it("collapses many committed node_modules files into a single finding", () => {
    const f = gitHygiene(cs([], ["node_modules/a/index.js", "node_modules/b/x.js", "node_modules/c/y.js"]));
    expect(f.filter((x) => x.title.includes("node_modules"))).toHaveLength(1);
  });
});
