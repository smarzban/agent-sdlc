import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { spawnWithDeadline } from "../src/runner.js";

// Reproduces the PR #4 dogfood hang: a model run that never settles because a child (or an orphaned
// grandchild re-parented to init) holds the stdout pipe open, so 'close' never fires. The fix is a
// hard wall-clock deadline that force-SETTLES the promise regardless of the child's state (plus a
// best-effort process-group kill). No network — pure local subprocesses.
const node = process.execPath;
const opts = { cwd: process.cwd(), timeoutMs: 250, graceMs: 250, maxBytes: 1 << 20 };

describe("spawnWithDeadline (hard wall-clock — must never hang)", () => {
  it("force-rejects within the deadline when a child never exits and holds stdout open", async () => {
    // setInterval keeps it alive forever; self-exits at 30s only as a leak backstop (we kill it first)
    await expect(
      spawnWithDeadline(node, ["-e", "setTimeout(()=>process.exit(0),30000); setInterval(()=>{},1e9)"], opts),
    ).rejects.toThrow(/timed out/i);
  }, 8000);

  it("force-rejects even when the PARENT exits but a detached grandchild keeps the pipe open (the orphan case)", async () => {
    // parent spawns a detached grandchild that INHERITS stdout (our pipe), unrefs it, then exits at 50ms.
    // the grandchild holds the pipe ~3s (self-exits) so 'close' can't fire on our child within the deadline.
    const orphan =
      "const cp=require('child_process');" +
      "cp.spawn(process.execPath,['-e','setTimeout(()=>process.exit(0),3000)'],{detached:true,stdio:['ignore','inherit','ignore']}).unref();" +
      "setTimeout(()=>process.exit(0),50);";
    await expect(spawnWithDeadline(node, ["-e", orphan], opts)).rejects.toThrow(/timed out/i);
  }, 8000);

  it("resolves with stdout when the command exits cleanly before the deadline", async () => {
    const out = await spawnWithDeadline(node, ["-e", "process.stdout.write('hello')"], { ...opts, timeoutMs: 5000 });
    expect(out).toBe("hello");
  }, 8000);

  it("rejects with the exit code on a non-zero exit", async () => {
    await expect(
      spawnWithDeadline(node, ["-e", "process.stderr.write('boom'); process.exit(3)"], { ...opts, timeoutMs: 5000 }),
    ).rejects.toThrow(/exited 3/);
  }, 8000);

  it("rejects via the byte-cap when a child floods stdout past maxBytes", async () => {
    await expect(
      spawnWithDeadline(node, ["-e", "setInterval(()=>process.stdout.write('x'.repeat(100000)),1)"], { ...opts, timeoutMs: 5000, maxBytes: 1000 }),
    ).rejects.toThrow(/output exceeded/);
  }, 8000);

  // glm-5.2 caught this in the PR #5 dogfood: force-settling the PROMISE isn't enough — if we don't
  // tear down our read handles, an orphan holding the pipe keeps the HOST process alive at exit
  // (libuv won't drain), so `review-gate run` collected by a parent `wait` would still hang.
  it("lets the HOST process exit after a force-settle even while an orphan still holds the pipe", async () => {
    const distRunner = fileURLToPath(new URL("../dist/runner.js", import.meta.url));
    // child spawns a detached grandchild that INHERITS (holds) stdout for ~10s, then the child spins forever.
    const orphan =
      "const cp=require('child_process');" +
      "cp.spawn(process.execPath,['-e','setTimeout(()=>process.exit(0),10000)'],{detached:true,stdio:['ignore','inherit','ignore']}).unref();" +
      "setInterval(()=>{},1e9);";
    // probe: force-settle against that child, then DO NOTHING — a correct teardown means this process exits.
    const probe =
      `import { spawnWithDeadline } from ${JSON.stringify("file://" + distRunner)};` +
      `spawnWithDeadline(process.execPath, ["-e", ${JSON.stringify(orphan)}], { cwd: process.cwd(), timeoutMs: 250, graceMs: 250, maxBytes: 1<<20 }).catch(() => {});`;
    const start = Date.now();
    const ms = await new Promise<number>((resolve) => {
      const p = execFile(node, ["--input-type=module", "-e", probe], { timeout: 5000 }, () => {});
      p.on("close", () => resolve(Date.now() - start));
    });
    // Fixed: exits ~right after the 500ms settle. Buggy: hangs until execFile SIGKILLs it at ~5s.
    expect(ms).toBeLessThan(3000);
  }, 9000);
});
