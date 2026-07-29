// EXPERIMENT: run-observability
//
// Tests for checker/experiment-record.mjs, pinning the six properties from the T-1 brief. Uses a
// real throwaway git repo per test (mkdtemp + execFileSync git commands, matching git.test.mjs's
// house style) rather than mocking git, and a real throwaway store root (mkdtemp under the OS tmp
// dir, never the process's actual home directory) so no test ever touches a real home directory or
// the repository under work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEventArgs, run, readEvents, storeFilePath, defaultStoreRoot } from './experiment-record.mjs';

const CLI = fileURLToPath(new URL('./experiment-record.mjs', import.meta.url));

function makeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'experiment-record-repo-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: dir });
  writeFileSync(path.join(dir, 'a.txt'), 'one\n');
  execFileSync('git', ['add', 'a.txt'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'initial'], { cwd: dir });
  return dir;
}

function makeStoreRoot() {
  return mkdtempSync(path.join(tmpdir(), 'experiment-record-store-'));
}

function nullStderr() {
  return { write: () => {} };
}

// --- syntax + main-guard sanity -----------------------------------------------------------

test('node --check experiment-record.mjs passes (valid syntax)', () => {
  const result = spawnSync(process.execPath, ['--check', CLI]);
  assert.equal(result.status, 0, result.stderr?.toString());
});

test('importing the module does not execute the CLI (main-guard regression)', () => {
  const result = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(CLI)})`]);
  assert.equal(result.status, 0, result.stderr?.toString());
  assert.equal(result.stderr.toString(), '');
});

// --- property 1: the recorder owns the clock; a caller-supplied time/duration is REJECTED ---

// `parseArgs`'s schema only declares caller-facing fields (run, task, round, outcome, severities,
// notes), so any machine-derived name is simply undeclared and `parseArgs` rejects it as an
// unknown option: rejected, not ignored, with no separate allowlist to keep in sync (I3).
test('AC-1: a caller-supplied --timestamp is rejected, not silently ignored', () => {
  const parsed = parseEventArgs(['run-start', '--run', 'r1', '--timestamp', '2020-01-01T00:00:00.000Z']);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /unknown option.*timestamp/i);
});

test('AC-1: a caller-supplied --duration is rejected', () => {
  const parsed = parseEventArgs(['round-end', '--run', 'r1', '--task', 'T-1', '--round', '1', '--duration', '90']);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /unknown option.*duration/i);
});

test('AC-1: a caller-supplied --elapsed is rejected', () => {
  const parsed = parseEventArgs(['task-end', '--run', 'r1', '--task', 'T-1', '--elapsed', '3600']);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /unknown option.*elapsed/i);
});

// --- property 2: an explicit outcome; a start with no end is representable, never == finished ---

test('AC-2: a run-end requires an explicit outcome, and rejects an unrecognized one', () => {
  const missing = parseEventArgs(['run-end', '--run', 'r1']);
  assert.equal(missing.ok, false);
  assert.match(missing.error, /outcome/i);

  const bad = parseEventArgs(['run-end', '--run', 'r1', '--outcome', 'sort-of-done']);
  assert.equal(bad.ok, false);
  assert.match(bad.error, /outcome/i);

  const good = parseEventArgs(['run-end', '--run', 'r1', '--outcome', 'abandoned']);
  assert.equal(good.ok, true);
  assert.equal(good.outcome, 'abandoned');
});

test('AC-2: a run with a start and no end is representable, and distinguishable from a finished run', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const startCode = await run(['run-start', '--run', 'started-only'], { cwd: repo, storeRoot, stderr: nullStderr() });
    assert.equal(startCode, 0);

    const { events } = readEvents(storeFilePath('started-only', storeRoot));
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'run-start');
    assert.equal(events[0].reported.outcome, undefined); // no outcome key at all: never a fabricated one

    // A finished run, for contrast: its end event carries an explicit outcome the started-only
    // run's (nonexistent) end event cannot be confused with.
    await run(['run-start', '--run', 'finished-run'], { cwd: repo, storeRoot, stderr: nullStderr() });
    await run(['run-end', '--run', 'finished-run', '--outcome', 'finished'], { cwd: repo, storeRoot, stderr: nullStderr() });
    const { events: finishedEvents } = readEvents(storeFilePath('finished-run', storeRoot));
    assert.equal(finishedEvents.length, 2);
    assert.equal(finishedEvents[1].kind, 'run-end');
    assert.equal(finishedEvents[1].reported.outcome, 'finished');
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

// --- property 3: review rounds are their own start/end events; duration is derivable ---

test('AC-3: round-start and round-end are separate events, so a round duration is derivable', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    await run(['round-start', '--run', 'r1', '--task', 'T-1', '--round', '1'], { cwd: repo, storeRoot, stderr: nullStderr() });
    await run(
      ['round-end', '--run', 'r1', '--task', 'T-1', '--round', '1', '--critical', '0', '--important', '1', '--minor', '2'],
      { cwd: repo, storeRoot, stderr: nullStderr() },
    );
    const { events } = readEvents(storeFilePath('r1', storeRoot));
    assert.equal(events.length, 2);
    const [start, end] = events;
    assert.equal(start.kind, 'round-start');
    assert.equal(end.kind, 'round-end');
    assert.equal(start.round, 1);
    assert.equal(end.round, 1);
    // Each event carries its OWN timestamp; the duration is derived from the pair, not stored.
    const startMs = Date.parse(start.machine.timestamp);
    const endMs = Date.parse(end.machine.timestamp);
    assert.ok(Number.isFinite(startMs) && Number.isFinite(endMs));
    assert.ok(endMs >= startMs);
    assert.equal(end.reported.important, 1);
    assert.equal(end.reported.minor, 2);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('AC-3: --round is required for round-start/round-end', () => {
  const parsed = parseEventArgs(['round-start', '--run', 'r1', '--task', 'T-1']);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /round/i);
});

// A round number is bounded so a huge one can never make the summary's round-gap rendering
// unbounded work (a wide-enough span would otherwise loop billions of times filling in "missing"
// rounds between the lowest and highest recorded round number).
test('AC-3: a round number above the bound is rejected, not silently accepted', () => {
  const tooLarge = parseEventArgs(['round-start', '--run', 'r1', '--task', 'T-1', '--round', '100001']);
  assert.equal(tooLarge.ok, false);
  assert.match(tooLarge.error, /round/i);

  const atBound = parseEventArgs(['round-start', '--run', 'r1', '--task', 'T-1', '--round', '100000']);
  assert.equal(atBound.ok, true);
});

// --- property 4: machine vs reported namespaces; a caller-supplied machine value is rejected ---

for (const flag of ['head-commit', 'commit', 'sha']) {
  test(`AC-4: a caller-supplied --${flag} is rejected`, () => {
    const parsed = parseEventArgs(['task-end', '--run', 'r1', '--task', 'T-1', `--${flag}`, 'x']);
    assert.equal(parsed.ok, false);
    assert.match(parsed.error, /unknown option/i);
  });
}

// Changed lines and files are no longer read by the recorder at all (I4): the summary derives them
// from a pair of recorded head commits, so there is nothing here to reject a caller-supplied value
// for. --changed-lines/--changed-files fall through to the same generic unknown-option rejection.
for (const flag of ['changed-lines', 'changed-files']) {
  test(`AC-4: a caller-supplied --${flag} is rejected as an unknown option`, () => {
    const parsed = parseEventArgs(['task-end', '--run', 'r1', '--task', 'T-1', `--${flag}`, 'x']);
    assert.equal(parsed.ok, false);
    assert.match(parsed.error, /unknown option/i);
  });
}

test('AC-4: machine-read and agent-reported fields are stored under separate namespaces', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    await run(['round-end', '--run', 'r1', '--task', 'T-1', '--round', '1', '--critical', '1'], {
      cwd: repo,
      storeRoot,
      stderr: nullStderr(),
    });
    const { events: [event] } = readEvents(storeFilePath('r1', storeRoot));
    assert.ok('machine' in event);
    assert.ok('reported' in event);
    assert.equal(typeof event.machine.timestamp, 'string');
    assert.equal(typeof event.machine.headCommit, 'string');
    assert.equal(event.reported.critical, 1);
    // The reported namespace never carries a timestamp or a commit; those are machine-only.
    assert.equal('timestamp' in event.reported, false);
    assert.equal('headCommit' in event.reported, false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

// No free-text field exists anywhere in the schema (NC-3: no secrets, source, or prompts
// recorded): a caller-supplied --notes is not a declared option at all, so it is rejected the same
// way any undeclared flag is, with no separate allowlist to keep in sync.
test('AC-4/NC-3: there is no free-text field; a caller-supplied --notes is rejected as an unknown option', () => {
  const parsed = parseEventArgs(['round-end', '--run', 'r1', '--task', 'T-1', '--round', '1', '--notes', 'flaky test']);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /unknown option.*notes/i);
});

test('AC-4/NC-3: a written event never carries a notes field of any kind', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    await run(['round-end', '--run', 'r1', '--task', 'T-1', '--round', '1', '--critical', '2', '--important', '1', '--minor', '0'], {
      cwd: repo,
      storeRoot,
      stderr: nullStderr(),
    });
    const { events: [event] } = readEvents(storeFilePath('r1', storeRoot));
    assert.equal('notes' in event.reported, false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('AC-4: severity flags are rejected on event kinds other than round-end', () => {
  const parsed = parseEventArgs(['task-end', '--run', 'r1', '--task', 'T-1', '--critical', '1']);
  assert.equal(parsed.ok, false);
  assert.match(parsed.error, /round-end/i);
});

// --- property 5: appends only, outside the repository under work; tolerant of bad lines ---

test('AC-5: the default store root lives under the home directory, never inside a repository', () => {
  const root = defaultStoreRoot();
  assert.ok(root.startsWith(homedir()));
  assert.ok(!root.startsWith(process.cwd()));
});

test('AC-5: each run identity gets its own file', () => {
  const root = '/tmp/example-root';
  assert.notEqual(storeFilePath('run-a', root), storeFilePath('run-b', root));
});

// The repository under work is never a safe place for the default store, even in the one
// environment where the naive home-directory join WOULD land inside it: some CI sandboxes set HOME
// to the workspace/repository itself. AC-5 forbids the default store resolving inside the
// repository under work outright, so this must fall back rather than silently violate that.
test('AC-5: if the home directory lies inside the repository under work, the store falls back outside it', () => {
  const repo = makeRepo();
  try {
    const root = defaultStoreRoot(repo, repo); // HOME == the repository under work
    assert.notEqual(root, repo);
    assert.ok(!root.startsWith(`${repo}${path.sep}`));
    assert.ok(root.startsWith(tmpdir()));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('AC-5: if the home directory equals the repository under work exactly, the store still falls back', () => {
  const repo = makeRepo();
  try {
    const nested = path.join(repo, 'sub', 'dir');
    // homeDir nested under the repo (not just equal to it) is the same failure mode.
    const root = defaultStoreRoot(repo, nested);
    assert.ok(!root.startsWith(`${repo}${path.sep}`));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('AC-5 (subprocess): HOME set to the repository under work never writes inside it', () => {
  const repo = makeRepo();
  try {
    const result = spawnSync(process.execPath, [CLI, 'run-start', '--run', 'home-in-repo'], {
      cwd: repo,
      env: { ...process.env, HOME: repo },
    });
    assert.equal(result.status, 0, result.stderr?.toString());
    const untracked = execFileSync(
      'git',
      ['-C', repo, 'ls-files', '--others', '--exclude-standard'],
      { encoding: 'utf8' },
    );
    assert.doesNotMatch(untracked, /agent-sdlc-experiments/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('AC-5: a malformed (newline-terminated) earlier line never prevents a later append or crashes the reader', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  const filePath = storeFilePath('r1', storeRoot);
  try {
    writeFileSync(filePath, '{"not valid json\nstill not json\n');
    appendFileSync(filePath, `${JSON.stringify({ kind: 'run-start', run: 'r1' })}\n`);

    // Reading tolerates the garbage lines: no throw, the one valid line survives, and the two
    // malformed lines are counted, not silently dropped.
    const before = readEvents(filePath);
    assert.equal(before.events.length, 1);
    assert.equal(before.events[0].kind, 'run-start');
    assert.equal(before.malformed, 2);

    // Appending after the garbage still succeeds.
    const code = await run(['run-end', '--run', 'r1', '--outcome', 'finished'], { cwd: repo, storeRoot, stderr: nullStderr() });
    assert.equal(code, 0);

    const after = readEvents(filePath);
    assert.equal(after.events.length, 2);
    assert.equal(after.events[1].kind, 'run-end');
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

// C1 (Critical): the fixture above is newline-terminated, so it pins malformation, not truncation.
// A TRUNCATED last line (no trailing newline, as left behind by a process that died mid-write) is
// the case that actually destroyed a valid, fully-reported event: without a newline guard before
// appending, the torn line concatenates with the next append into one unparseable line, and
// `readEvents` drops both the torn line AND the new, otherwise-complete event.
test('C1: a TRUNCATED (no trailing newline) last line does not swallow the next appended event', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  const filePath = storeFilePath('t1', storeRoot);
  try {
    // No trailing newline: this is what a process dying mid-write leaves behind.
    writeFileSync(filePath, '{"kind":"run-start","run":"t1","machine":{"headCom');

    const code = await run(['run-end', '--run', 't1', '--outcome', 'finished'], { cwd: repo, storeRoot, stderr: nullStderr() });
    assert.equal(code, 0);

    const { events, malformed } = readEvents(filePath);
    // The torn line is unparseable and correctly dropped, but the new run-end event must survive:
    // before the newline guard, both lines were lost (events.length === 0).
    assert.equal(malformed, 1);
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'run-end');
    assert.equal(events[0].reported.outcome, 'finished');
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

// --- property 6: failure is loud and total; nothing partial written ---

// Property 6's git-read branch: readHeadCommit's own failure path, exercised end to end via a cwd
// that is not a git repository at all, so `git rev-parse HEAD` itself fails.
test('AC-6: a cwd that is not a git repository fails loudly via the git-read failure path, writing nothing', async () => {
  const notARepo = mkdtempSync(path.join(tmpdir(), 'experiment-record-norepo-'));
  const storeRoot = makeStoreRoot();
  const stderrChunks = [];
  try {
    const code = await run(['run-start', '--run', 'r1'], {
      cwd: notARepo,
      storeRoot,
      stderr: { write: (s) => stderrChunks.push(s) },
    });
    assert.equal(code, 1);
    assert.match(stderrChunks.join(''), /could not read HEAD commit via git/i);
    assert.deepEqual(readdirSync(storeRoot), []);
  } finally {
    rmSync(notARepo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('AC-6: a missing --run exits nonzero with a diagnostic and writes nothing', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const code = await run(['run-start'], { cwd: repo, storeRoot, stderr: nullStderr() });
    assert.equal(code, 1);
    // A run id was never validated far enough to name a file, so nothing was written at all: the
    // store root itself (created only by mkdtempSync above, not by the recorder) stays empty.
    assert.deepEqual(readdirSync(storeRoot), []);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('AC-6: an unrecognized event kind exits nonzero with a diagnostic on stderr', () => {
  const result = spawnSync(process.execPath, [CLI, 'not-a-kind', '--run', 'r1'], {
    env: { ...process.env, HOME: makeStoreRoot() },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr.toString(), /unrecognized event kind/i);
});

test('AC-6: the CLI end-to-end (subprocess): valid run-start exits 0 and writes exactly one line', () => {
  const home = makeStoreRoot();
  try {
    const result = spawnSync(process.execPath, [CLI, 'run-start', '--run', 'cli-run'], {
      cwd: process.cwd(),
      env: { ...process.env, HOME: home },
    });
    assert.equal(result.status, 0, result.stderr?.toString());
    const filePath = path.join(home, '.agent-sdlc-experiments', 'run-observability', 'cli-run.jsonl');
    const lines = readFileSync(filePath, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const event = JSON.parse(lines[0]);
    assert.equal(event.kind, 'run-start');
    assert.equal(event.run, 'cli-run');
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('AC-6: the CLI (subprocess) rejects a caller-supplied --timestamp with nonzero exit and writes nothing', () => {
  const home = makeStoreRoot();
  try {
    const result = spawnSync(process.execPath, [CLI, 'run-start', '--run', 'cli-run-2', '--timestamp', 'now'], {
      env: { ...process.env, HOME: home },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr.toString(), /unknown option.*timestamp/i);
    const filePath = path.join(home, '.agent-sdlc-experiments', 'run-observability', 'cli-run-2.jsonl');
    assert.equal(existsSync(filePath), false);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

// --- HIGH: the bin/ launcher itself is executed, not only the .mjs it wraps -----------------

// bin/sdlc-record is the invocation path the wiring skills actually name. Nothing else in this
// suite runs it: a break in the launcher's own path resolution (e.g. `dirname`/`readlink`
// portability) would still show every other test green while every stage boundary silently fails
// to record, announces, and proceeds into an empty store, exactly the failure this feature has
// already had once. Resolved the same layout-proof way as the .mjs tests: relative to this file.
const BIN_RECORD = fileURLToPath(new URL('../bin/sdlc-record', import.meta.url));

test('HIGH: bin/sdlc-record (subprocess) actually resolves, runs, and appends an event', () => {
  const repo = makeRepo();
  const home = makeStoreRoot();
  try {
    const result = spawnSync(BIN_RECORD, ['run-start', '--run', 'launcher-run'], {
      cwd: repo,
      env: { ...process.env, HOME: home },
    });
    assert.equal(result.status, 0, result.stderr?.toString());
    const filePath = path.join(home, '.agent-sdlc-experiments', 'run-observability', 'launcher-run.jsonl');
    const events = readFileSync(filePath, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'run-start');
    assert.equal(events[0].run, 'launcher-run');
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test('HIGH: bin/sdlc-record (subprocess) propagates a failure (nonzero exit, diagnostic, nothing written)', () => {
  const repo = makeRepo();
  const home = makeStoreRoot();
  try {
    const result = spawnSync(BIN_RECORD, ['run-start'], {
      cwd: repo,
      env: { ...process.env, HOME: home },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr.toString(), /--run/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

// --- HIGH: nothing is transmitted anywhere (NC-3) -------------------------------------------

test('HIGH/NC-3: the recorder imports only Node standard-library modules, none network-capable', () => {
  const source = readFileSync(CLI, 'utf8');
  const specifiers = [...source.matchAll(/^import\s+.*?from\s+['"]([^'"]+)['"];?/gm)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, 'expected at least one import to check');
  const NETWORK_CAPABLE = new Set(['http', 'https', 'net', 'dgram', 'tls', 'dns', 'http2']);
  for (const spec of specifiers) {
    assert.match(spec, /^node:/, `${spec} must be an explicit node: standard-library import`);
    const bare = spec.slice('node:'.length);
    assert.ok(!NETWORK_CAPABLE.has(bare), `${spec} is network-capable and must not be imported`);
  }
});

// --- marker (T-4 sweeps this repo-wide; pinned locally too) ---

test('carries the EXPERIMENT: run-observability marker', () => {
  const source = readFileSync(CLI, 'utf8');
  assert.match(source, /EXPERIMENT: run-observability/);
});

// --- gate round 2 residual: the temporary-directory fallback was itself unchecked ---
//
// defaultStoreRoot falls back to the system temp dir when the home-based root would land inside the
// repository under work. That fallback was not checked against the same rule, so a TMPDIR pointing
// inside the repo put the store back exactly where it must never be. Found by probing the fix for
// the store-location finding, not by the fix itself.
test('a temporary-directory fallback that also lands inside the repo is refused, never used', async () => {
  const os = await import('node:os');
  const repo = mkdtempSync(path.join(tmpdir(), 'exp-repo-'));
  const realTmpdir = os.default.tmpdir;
  os.default.tmpdir = () => path.join(repo, 'tmpx');
  try {
    let resolved = null;
    let threw = false;
    try {
      resolved = defaultStoreRoot(repo, repo);
    } catch {
      threw = true;
    }
    assert.ok(
      threw || !resolved.startsWith(repo + path.sep),
      'the store must never resolve inside the repository under work, by either root',
    );
  } finally {
    os.default.tmpdir = realTmpdir;
    rmSync(repo, { recursive: true, force: true });
  }
});
