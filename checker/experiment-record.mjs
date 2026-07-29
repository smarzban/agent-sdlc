// EXPERIMENT: run-observability
//
// experiment-record: appends ONE line-delimited-JSON event per invocation to a local file
// outside the repository under work. Throwaway instrumentation for a handful of real runs: no
// schema version, no migration path, no configuration system, no second backend. Deleted with the
// rest of the experiment; see docs/specs/run-observability/run-observability.md.
//
// Six properties, each guarding a specific way an earlier reading was misled (brief T-1):
//   1. The recorder owns the clock. It reads the timestamp itself; a caller-supplied time or
//      duration is REJECTED, not ignored. Elapsed is derived later from a pair of events.
//   2. A run's end event carries an explicit outcome: finished, failed, or abandoned. A run with a
//      start and no end is representable and never silently equivalent to a finished run.
//   3. Review rounds are their own start and end events, so a round's DURATION is derivable, not
//      just its count.
//   4. Machine-read fields (timestamp, head commit) and agent-reported fields (findings by
//      severity) live in separate namespaces. A caller-supplied value for a machine field is
//      rejected. There is no free-text field anywhere: reported fields are numeric or enumerated
//      only, so there is nothing for a secret, source, or prompt fragment to land in (NC-3).
//      Changed lines and files are NOT read here: they are derived at summary time from a pair of
//      recorded head commits (T-2's job), so a git-diff failure here can never discard an
//      otherwise-complete event.
//   5. Appends only, outside the repository under work. A malformed or truncated earlier line
//      never prevents a later append and never crashes a reader.
//   6. Failure is loud and total: on any error, non-zero exit, a diagnostic on stderr, nothing
//      partial written.
//
// Interface: `experiment-record <kind> --run <id> [--task <id>] [--round <n>] [--outcome ...]
// [--critical N --important N --minor N]`. Kinds: run-start, run-end, task-start, task-end,
// round-start, round-end. Store: one file per run identity under the user's home (defaultStoreRoot),
// never inside any repository under work.
import { parseArgs, promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT_MS = 5000;

const EVENT_KINDS = new Set(['run-start', 'run-end', 'task-start', 'task-end', 'round-start', 'round-end']);
const OUTCOMES = new Set(['finished', 'failed', 'abandoned']);
const ID_RE = /^[A-Za-z0-9._-]+$/;
// A generous upper bound on a review round number: real runs use small integers. This exists
// solely so a round number can never make the summary's round-gap rendering unbounded work (a
// span this wide could otherwise loop billions of times filling in "missing" rounds).
const MAX_ROUND = 100000;

// --- pure argument parsing (no IO) -------------------------------------------------------

// Property 1 + 4: the schema below declares only the fields a caller is allowed to supply. Any
// other flag, including every machine-derived name (--timestamp, --head-commit, --changed-lines,
// and so on), is not declared, so `parseArgs`'s default strict mode rejects it as an unknown
// option on its own; there is no separate allowlist to keep in sync.
export function parseEventArgs(argv) {
  const [kind, ...rest] = argv;
  if (!kind) {
    return { ok: false, error: 'missing event kind (run-start|run-end|task-start|task-end|round-start|round-end)' };
  }
  if (!EVENT_KINDS.has(kind)) {
    return { ok: false, error: `unrecognized event kind '${kind}'` };
  }

  let parsed;
  try {
    parsed = parseArgs({
      args: rest,
      allowPositionals: false,
      options: {
        run: { type: 'string' },
        task: { type: 'string' },
        round: { type: 'string' },
        outcome: { type: 'string' },
        critical: { type: 'string' },
        important: { type: 'string' },
        minor: { type: 'string' },
      },
    });
  } catch (err) {
    return { ok: false, error: `could not parse arguments: ${err.message}` };
  }

  const v = parsed.values;
  if (!v.run || !ID_RE.test(v.run)) {
    return { ok: false, error: '--run <id> is required and must match [A-Za-z0-9._-]+' };
  }

  const needsTask = kind !== 'run-start' && kind !== 'run-end';
  if (needsTask && (!v.task || !ID_RE.test(v.task))) {
    return { ok: false, error: '--task <id> is required for this event kind and must match [A-Za-z0-9._-]+' };
  }

  const needsRound = kind === 'round-start' || kind === 'round-end';
  let round = null;
  if (needsRound) {
    if (!v.round || !/^\d+$/.test(v.round)) {
      return { ok: false, error: '--round <n> is required for this event kind and must be a non-negative integer' };
    }
    round = Number(v.round);
    if (round > MAX_ROUND) {
      return { ok: false, error: `--round must be at most ${MAX_ROUND}` };
    }
  }

  let outcome = null;
  if (kind === 'run-end') {
    if (!v.outcome || !OUTCOMES.has(v.outcome)) {
      return { ok: false, error: `--outcome is required for run-end and must be one of: ${[...OUTCOMES].join(', ')}` };
    }
    outcome = v.outcome;
  }
  // Note: only a run's end event carries an outcome (AC-2). A task-end carries none, so an
  // abandoned task is representable as "no end recorded" only at the run level; per-task
  // abandonment is a T-2 rendering concern, not a T-1 recording gap.

  const severities = {};
  for (const sev of ['critical', 'important', 'minor']) {
    if (v[sev] === undefined) continue;
    if (kind !== 'round-end') {
      return { ok: false, error: `--${sev} is only accepted on round-end` };
    }
    if (!/^\d+$/.test(v[sev])) {
      return { ok: false, error: `--${sev} must be a non-negative integer` };
    }
    severities[sev] = Number(v[sev]);
  }

  // Property 4's reported namespace is numeric or enumerated only: findings by severity and the
  // run outcome. No free-text field exists anywhere in this schema (NC-3): there is nothing for a
  // secret, source, or prompt fragment to land in.
  return { ok: true, kind, run: v.run, task: needsTask ? v.task : null, round, outcome, severities };
}

// --- machine reads: the recorder's own clock and git HEAD, never caller-supplied ---------

async function readHeadCommit(cwd) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', cwd, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      timeout: GIT_TIMEOUT_MS,
    });
    return { ok: true, sha: stdout.trim() };
  } catch (err) {
    return { ok: false, error: `could not read HEAD commit via git: ${err.message}` };
  }
}

// --- store location + tolerant reader -----------------------------------------------------

// Outside any repository under work: under the user's home, in a dedicated directory (property 5).
// `cwd` names the repository under work (the same directory the caller runs git operations from).
// If the user's home directory itself lies inside (or is) that repository, as some CI sandboxes
// arrange by setting HOME to the workspace, the preferred path would resolve inside the repository
// under work, which AC-5 forbids outright; fall back to the OS temp directory instead, which this
// repository can never contain.
// Symlinks decide this, not strings. On macOS `/var` is a symlink to `/private/var`, so a child
// process started with cwd inside a temporary directory reports the RESOLVED cwd while `$HOME`
// keeps the unresolved form. Comparing those as strings says "not inside the repository" about two
// paths that are the same directory, and the store lands in the repo the check exists to protect.
// Resolve both sides before comparing, and fall back to the literal path when a component does not
// exist yet (the store root usually does not).
function realOrResolved(target) {
  const resolved = path.resolve(target);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

export function defaultStoreRoot(cwd = process.cwd(), homeDir = os.homedir()) {
  const realHome = realOrResolved(homeDir);
  const preferred = path.join(realHome, '.agent-sdlc-experiments', 'run-observability');
  const resolvedCwd = realOrResolved(cwd);
  const inside = (candidate) =>
    candidate === resolvedCwd || candidate.startsWith(resolvedCwd + path.sep);
  if (!inside(preferred)) return preferred;
  // The home-based root would land inside the repository under work, so fall back to the system
  // temporary directory. That fallback is checked too: TMPDIR can itself point inside the repo,
  // which would put the store back exactly where it must never be.
  const fallback = path.join(realOrResolved(os.tmpdir()), '.agent-sdlc-experiments', 'run-observability');
  if (!inside(fallback)) return fallback;
  throw new Error(
    'experiment store: both the home and temporary roots resolve inside the repository under work; ' +
      'set a store root outside it',
  );
}

// One file per run identity.
export function storeFilePath(runId, root = defaultStoreRoot()) {
  return path.join(root, `${runId}.jsonl`);
}

// Tolerant reader: a malformed or truncated line is skipped, never thrown (property 5), and
// counted so a consumer can say how many lines were unparseable instead of undercounting
// silently. Returns { events: [], malformed: 0 } when the file does not exist yet.
export function readEvents(filePath) {
  if (!existsSync(filePath)) return { events: [], malformed: 0 };
  const raw = readFileSync(filePath, 'utf8');
  const events = [];
  let malformed = 0;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      malformed += 1; // malformed/truncated line: skipped, never thrown, never blocks a later append
    }
  }
  return { events, malformed };
}

// --- orchestration: validate everything, THEN write once ---------------------------------

export async function run(argv, opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  const storeRoot = opts.storeRoot ?? defaultStoreRoot(cwd);
  const stderr = opts.stderr ?? process.stderr;

  const parsed = parseEventArgs(argv);
  if (!parsed.ok) {
    stderr.write(`experiment-record: ${parsed.error}\n`);
    return 1;
  }

  const filePath = storeFilePath(parsed.run, storeRoot);

  const head = await readHeadCommit(cwd);
  if (!head.ok) {
    stderr.write(`experiment-record: ${head.error}\n`);
    return 1;
  }

  const machine = { timestamp: new Date().toISOString(), headCommit: head.sha };

  // Reported (agent-supplied) namespace, kept separate from `machine` above (property 4). A field
  // the caller did not report is simply absent, never fabricated as zero or empty.
  const reported = {};
  if (parsed.kind === 'run-end') reported.outcome = parsed.outcome;
  if (parsed.kind === 'round-end') {
    if ('critical' in parsed.severities) reported.critical = parsed.severities.critical;
    if ('important' in parsed.severities) reported.important = parsed.severities.important;
    if ('minor' in parsed.severities) reported.minor = parsed.severities.minor;
  }

  const event = {
    kind: parsed.kind,
    run: parsed.run,
    task: parsed.task,
    round: parsed.round,
    machine,
    reported,
  };

  // Property 6: the whole line is built before any write is attempted, and there is exactly one
  // write call carrying the complete line. On any failure here, nothing has been written yet, or
  // the single write call itself throws before completing: never a half-written line.
  //
  // Property 5's other half: a torn earlier line (no trailing newline, e.g. a process that died
  // mid-write) would otherwise concatenate with this append into one unparseable line, silently
  // destroying both the torn line and this one. Guard by ensuring the file ends in a newline
  // before appending.
  const line = `${JSON.stringify(event)}\n`;
  try {
    mkdirSync(storeRoot, { recursive: true });
    let prefix = '';
    if (existsSync(filePath)) {
      const existing = readFileSync(filePath, 'utf8');
      if (existing.length > 0 && !existing.endsWith('\n')) prefix = '\n';
    }
    appendFileSync(filePath, prefix + line, 'utf8');
  } catch (err) {
    stderr.write(`experiment-record: could not append event: ${err.message}\n`);
    return 1;
  }
  return 0;
}

// Portable ESM main-guard (matches sdlc-check.mjs): compares resolved URLs so this holds under a
// relative invocation the same as an absolute one; `process.argv[1]` is guarded for undefined
// (e.g. `node -e '...'`, no script file).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      process.stderr.write(`experiment-record: unexpected internal error: ${err && err.stack ? err.stack : err}\n`);
      process.exitCode = 1;
    });
}
