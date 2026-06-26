import { describe, it, expect } from "vitest";
import { spawnBounded, envNum } from "../src/proc.js";

const NODE = process.execPath;
// Run a node one-liner as the child, so these tests need no fixtures and no network.
const node = (src: string) => ["-e", src];

describe("envNum", () => {
  it("takes a positive finite override, else the default; clamps to setTimeout's 32-bit max", () => {
    expect(envNum("42", 7)).toBe(42);
    expect(envNum(undefined, 7)).toBe(7);
    expect(envNum("0", 7)).toBe(7);        // non-positive ⇒ default
    expect(envNum("nope", 7)).toBe(7);     // NaN ⇒ default (a bad override can't disable a cap)
    expect(envNum("999999999999", 7)).toBe(2_147_483_647); // clamped
  });
});

describe("spawnBounded", () => {
  it("resolves a result with code 0 and stdout on a clean exit", async () => {
    const r = await spawnBounded(NODE, node("process.stdout.write('hello')"), { cwd: process.cwd(), timeoutMs: 5000, maxBytes: 1 << 20, byteCap: "abort" });
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("hello");
    expect(r.timedOut).toBe(false);
    expect(r.byteAbort).toBe(false);
  });

  it("reports a non-zero exit code in the result — it does NOT reject (scanners exit non-zero normally)", async () => {
    const r = await spawnBounded(NODE, node("process.exit(3)"), { cwd: process.cwd(), timeoutMs: 5000, maxBytes: 1 << 20, byteCap: "truncate" });
    expect(r.code).toBe(3);
    expect(r.timedOut).toBe(false);
  });

  it("byteCap 'truncate' caps output, flags truncated, keeps the partial output (≤ cap), does not abort", async () => {
    // 200-byte chunks so several land before the 1024 cap — proves partial output is kept and bounded.
    const r = await spawnBounded(NODE, node("setInterval(()=>process.stdout.write('x'.repeat(200)),1)"), { cwd: process.cwd(), timeoutMs: 5000, maxBytes: 1024, byteCap: "truncate" });
    expect(r.truncated).toBe(true);
    expect(r.byteAbort).toBe(false);
    expect(r.stdout.length).toBeGreaterThan(0);
    expect(r.stdout.length).toBeLessThanOrEqual(1024); // never appends the chunk that crosses the cap
  });

  it("byteCap 'abort' flags byteAbort when output exceeds the cap", async () => {
    const r = await spawnBounded(NODE, node("setInterval(()=>process.stdout.write('x'.repeat(4096)),1)"), { cwd: process.cwd(), timeoutMs: 5000, maxBytes: 1024, byteCap: "abort" });
    expect(r.byteAbort).toBe(true);
  });

  it("reports missing:true for a binary not on PATH (ENOENT)", async () => {
    const r = await spawnBounded("definitely-not-a-real-binary-xyzzy", [], { cwd: process.cwd(), timeoutMs: 5000, maxBytes: 1 << 20, byteCap: "abort" });
    expect(r.missing).toBe(true);
    expect(r.code).toBe(-1);
  });

  it("force-settles within the deadline when a child never exits (the orphan-hang hardening, now on every spawn)", async () => {
    const r = await spawnBounded(NODE, node("setInterval(()=>{}, 1<<30)"), { cwd: process.cwd(), timeoutMs: 150, maxBytes: 1 << 20, byteCap: "abort", graceMs: 80 });
    expect(r.timedOut).toBe(true);
  }, 2000); // the 2s test timeout proves it settled well before then (timeoutMs 150 + grace 80)

  it("an external abort runs the kill escalation and force-settles (cancellation follows the deadline path, not a hang)", async () => {
    const ac = new AbortController();
    // Deadline is far off (60s); only the abort→escalate path can settle this in time. If abort weren't
    // wired to the escalation, the child would run to the 60s deadline and blow the 2s test timeout.
    const p = spawnBounded(NODE, node("setInterval(()=>{}, 1<<30)"), { cwd: process.cwd(), timeoutMs: 60_000, maxBytes: 1 << 20, byteCap: "abort", graceMs: 80, signal: ac.signal });
    ac.abort();
    const r = await p;
    expect(r.code).toBe(-1); // killed, not a clean exit
  }, 2000);
});
