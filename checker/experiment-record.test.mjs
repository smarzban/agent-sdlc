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
    await run(['round-end', '--run', 'r1', '--task', 'T-1', '--round', '1', '--critical', '1', '--notes', 'flaky test'], {
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
    assert.deepEqual(event.reported.notes, ['flaky test']);
    // The reported namespace never carries a timestamp or a commit; those are machine-only.
    assert.equal('timestamp' in event.reported, false);
    assert.equal('headCommit' in event.reported, false);
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

// --- marker (T-4 sweeps this repo-wide; pinned locally too) ---

test('carries the EXPERIMENT: run-observability marker', () => {
  const source = readFileSync(CLI, 'utf8');
  assert.match(source, /EXPERIMENT: run-observability/);
});
