import { spawn } from "node:child_process";

// Low-level process + env utilities shared by the model runner and the deterministic scanners. It is a
// NEUTRAL module both import, so neither depends on the other (runner used to reach into scan.ts for
// `envNum`). The single bounded-spawn core lives here so the orphan-hang hardening (force-settle,
// process-group kill, stdio teardown) is written ONCE and every spawn — model agent, git, scanner —
// gets it; previously only the model runner did, and a git/scanner subprocess could still hang.

/** Coerce an env override to a positive finite number, else the default; clamp to setTimeout's 32-bit
 *  max so a bad override can't silently disable a safety cap (NaN) or fire a timer immediately. */
export const envNum = (v: string | undefined, def: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 2_147_483_647) : def;
};

/** The outcome of a bounded spawn. The core NEVER rejects for a process OUTCOME — exit code, signal,
 *  timeout, byte cap, and a missing binary are all reported in fields, so each caller maps the result
 *  to its own contract (throw-on-failure for git/agent runs; pass-through for scanners, where a
 *  non-zero exit is normal). Only an unexpected internal throw would reject. */
export interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number;        // exit code; -1 when killed / signalled / spawn error / no code
  missing: boolean;    // ENOENT — the binary isn't on PATH
  timedOut: boolean;   // the soft deadline fired and the process was killed
  truncated: boolean;  // byteCap:"truncate" — output hit the cap; process killed, partial output kept
  byteAbort: boolean;  // byteCap:"abort" — output hit the cap; treated as a hard failure
}

const KILL_GRACE_MS = 5_000;

/** Spawn a child under a HARD wall-clock deadline + an output byte cap, in its own process group.
 *  Hardened against the orphaned-pipe hang (the PR #4 bug): the deadline FORCE-SETTLES — it does NOT
 *  wait for `'close'` — and we tear down our read handles + `unref` the child, so an orphaned
 *  grandchild holding the stdout pipe can't keep the host alive. `detached` makes the child a group
 *  leader so we can signal the whole group. Settles exactly once.
 *
 *  byteCap "abort"    → on cap: SIGKILL the group + settle now with `byteAbort` (a hard failure).
 *  byteCap "truncate" → on cap: SIGKILL but keep the partial output + the `truncated` flag and settle
 *                       on close/deadline (the caller fails closed on it rather than parse partial). */
export function spawnBounded(
  bin: string, args: string[],
  opts: { cwd: string; timeoutMs: number; maxBytes: number; byteCap: "abort" | "truncate"; graceMs?: number; signal?: AbortSignal; detached?: boolean },
): Promise<SpawnResult> {
  const graceMs = opts.graceMs ?? KILL_GRACE_MS;
  const detached = opts.detached ?? false;
  return new Promise((resolve) => {
    // detached ⇒ the child leads its own process group, so a kill reaches its DESCENDANTS too (the model
    // agent spawns sub-processes that must die with it). Non-detached ⇒ signal just the child — git and
    // the scanners don't fork, and staying in the gate's process group means a Ctrl-C still reaps them.
    // stdin ignored (headless).
    const child = spawn(bin, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"], detached });
    let out = "", err = "", bytes = 0, timedOut = false, truncated = false, byteAbort = false, settled = false;
    const kill = (sig: NodeJS.Signals) => { try { if (child.pid) detached ? process.kill(-child.pid, sig) : child.kill(sig); } catch { /* already gone */ } };
    let hardTimer: ReturnType<typeof setTimeout> | undefined;
    let onAbort: (() => void) | undefined;
    const finish = (over: Partial<SpawnResult>) => {
      if (settled) return; settled = true;
      clearTimeout(softTimer); if (hardTimer) clearTimeout(hardTimer);
      if (onAbort) opts.signal?.removeEventListener("abort", onAbort); // a settled spawn must not react to a later abort
      // Drop OUR read handles + the child ref so the host can exit even if an orphaned grandchild still
      // holds the pipe's write end (force-settling the promise alone leaves the read FD open → libuv
      // keeps the process alive at exit → a parent `wait` still hangs; this is the PR #4/#5 fix).
      child.stdout?.destroy(); child.stderr?.destroy();
      try { child.unref(); } catch { /* already gone */ }
      resolve({ stdout: out, stderr: err, code: -1, missing: false, timedOut, truncated, byteAbort, ...over });
    };
    // SIGTERM, then SIGKILL + FORCE-SETTLE after the grace — never waiting on 'close' (an orphan may hold
    // the pipe). Shared by the DEADLINE and an external ABORT, so a cancelled run gets the same kill
    // escalation + cleanup as a timeout — not Node's per-child SIGTERM (which would leave the group).
    const escalate = (onTimeout: boolean) => {
      if (hardTimer) return;                         // escalation already in progress
      if (onTimeout) timedOut = true;
      kill("SIGTERM");
      hardTimer = setTimeout(() => { kill("SIGKILL"); finish({}); }, graceMs);
    };
    const softTimer = setTimeout(() => escalate(true), opts.timeoutMs);
    // We own abort (rather than passing spawn's `signal`) so cancellation follows the escalation above.
    if (opts.signal) {
      if (opts.signal.aborted) escalate(false);
      else { onAbort = () => escalate(false); opts.signal.addEventListener("abort", onAbort); }
    }
    child.stdout.on("data", (d: Buffer) => {
      bytes += d.length;
      if (bytes > opts.maxBytes) {
        if (opts.byteCap === "abort") { byteAbort = true; kill("SIGKILL"); return finish({}); }
        // truncate: stop the child, keep what we have. Arm a force-settle grace so a child that forks
        // (and may orphan the pipe so 'close' never fires) still settles promptly, not only at the deadline.
        truncated = true; kill("SIGKILL");
        if (!hardTimer) hardTimer = setTimeout(() => finish({}), graceMs);
        return;
      }
      out += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => { if (err.length < opts.maxBytes) err += d.toString(); }); // cap stderr too — no OOM lever
    child.on("error", (e: NodeJS.ErrnoException) => finish({ missing: e.code === "ENOENT", stderr: e.message }));
    // A clean exit (0) wins even if the soft timer just fired; only count timedOut when the kill made
    // it exit non-zero, so a natural exit at the deadline isn't a false timeout.
    child.on("close", (code) => finish({ code: code ?? -1, timedOut: timedOut && code !== 0 }));
  });
}
