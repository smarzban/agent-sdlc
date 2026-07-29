// EXPERIMENT: run-observability
//
// Tests for checker/experiment-report.mjs, pinning the five properties from the T-2 brief plus
// the T-2 review-fix findings (round-count undercounting, run-state classification, the
// changed-lines wiring signal, and the readability restructure). Uses a real throwaway git repo
// per test that needs one (mkdtemp + execFileSync git commands, matching experiment-record.test.mjs's
// house style) and a real throwaway store root (mkdtemp under the OS tmp dir, never the process's
// actual home directory). Timing- and shape-sensitive fixtures are hand-crafted JSONL events so
// round/task durations are exact and reproducible, rather than sleeping in real time.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseSummaryArgs,
  buildRunView,
  buildReportModel,
  render,
  run,
} from './experiment-report.mjs';
import { storeFilePath } from './experiment-record.mjs';

const CLI = fileURLToPath(new URL('./experiment-report.mjs', import.meta.url));

function makeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'experiment-report-repo-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: dir });
  writeFileSync(path.join(dir, 'a.txt'), 'one\n');
  execFileSync('git', ['add', 'a.txt'], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', 'initial'], { cwd: dir });
  return dir;
}

function headSha(dir) {
  return execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function commitFile(dir, name, content) {
  writeFileSync(path.join(dir, name), content);
  execFileSync('git', ['add', name], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', `add ${name}`], { cwd: dir });
  return headSha(dir);
}

function commitEmpty(dir, message) {
  execFileSync('git', ['commit', '-q', '--allow-empty', '-m', message], { cwd: dir });
  return headSha(dir);
}

function makeStoreRoot() {
  return mkdtempSync(path.join(tmpdir(), 'experiment-report-store-'));
}

function appendEvent(filePath, event) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, `${JSON.stringify(event)}\n`);
}

function nullStderr() {
  return { write: () => {} };
}

function nullStdout() {
  return { write: () => {} };
}

// --- syntax + main-guard sanity -----------------------------------------------------------

test('node --check experiment-report.mjs passes (valid syntax)', () => {
  const result = spawnSync(process.execPath, ['--check', CLI]);
  assert.equal(result.status, 0, result.stderr?.toString());
});

test('importing the module does not execute the CLI (main-guard regression)', () => {
  const result = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(CLI)})`]);
  assert.equal(result.status, 0, result.stderr?.toString());
  assert.equal(result.stderr.toString(), '');
});

// --- T-2 test-first: an unpaired event renders as unpaired, never as zero -----------------

test('T-2 test-first: an unpaired event renders as unpaired, never as zero', () => {
  const model = {
    caveat: 'caveat text',
    anyIncomplete: false,
    runs: [
      {
        runId: 'r1',
        state: 'finished',
        outcome: 'finished',
        detail: null,
        startNote: null,
        malformed: 0,
        foreignEventsDropped: 0,
        readError: null,
        tasks: [
          {
            taskId: 'T-1',
            elapsed: { status: 'unsupported', reason: 'unpaired: no matching start and end recorded' },
            startSha: 'abc1234',
            endSha: null,
            rounds: [
              {
                round: 1,
                duration: { status: 'unsupported', reason: 'unpaired: no matching start and end recorded' },
                findings: { status: 'no-round-end' },
                notes: [],
              },
            ],
            missingRounds: [],
            changed: {
              status: 'unsupported',
              reason: 'missing head commit: task-start and/or task-end were not both recorded exactly once',
            },
          },
        ],
      },
    ],
  };

  const text = render(model);

  // Never a bare zero standing in for the unpaired data.
  assert.doesNotMatch(text, /\|\s*0\s*\|/);
  assert.match(text, /unpaired/i);
  assert.match(text, /unknown \[[a-z]\d*\]/);
  assert.match(text, /\[[a-z]\d*\] unpaired: no matching start and end recorded/);
  assert.match(text, /unpaired \(no round-end recorded\)/);
  assert.match(text, /\[[a-z]\d*\] missing head commit/);
});

// --- T-2 test-first: a view containing an incomplete run says so prominently --------------

test('T-2 test-first: a view containing an incomplete run says so prominently', () => {
  const model = {
    caveat: 'caveat text',
    anyIncomplete: true,
    runs: [
      { runId: 'good-run', state: 'finished', outcome: 'finished', detail: null, startNote: null, malformed: 0, foreignEventsDropped: 0, readError: null, tasks: [] },
      { runId: 'bad-run', state: 'no-end', outcome: null, detail: 'no run-end recorded', startNote: null, malformed: 0, foreignEventsDropped: 0, readError: null, tasks: [] },
    ],
  };

  const text = render(model);
  const lines = text.split('\n');

  assert.match(text, /INCOMPLETE RUNS PRESENT/);
  assert.match(text, /bad-run \(no run-end recorded\)/);

  // Prominent: the banner appears before any run heading, not buried after it.
  const bannerLine = lines.findIndex((l) => l.includes('INCOMPLETE RUNS PRESENT'));
  const headingLine = lines.findIndex((l) => l.startsWith('## '));
  assert.ok(bannerLine !== -1 && headingLine !== -1 && bannerLine < headingLine);
});

test('a fully complete view prints no incomplete-runs banner', () => {
  const model = {
    caveat: 'caveat text',
    anyIncomplete: false,
    runs: [{ runId: 'r1', state: 'finished', outcome: 'finished', detail: null, startNote: null, malformed: 0, foreignEventsDropped: 0, readError: null, tasks: [] }],
  };
  const text = render(model);
  assert.doesNotMatch(text, /INCOMPLETE RUNS PRESENT/);
});

// --- AC-8 / I3: every rendered column, and the run's outcome, is marked measured or claimed -

test('AC-8: the table header marks every column measured or claimed', () => {
  const model = {
    caveat: 'x',
    anyIncomplete: false,
    runs: [{ runId: 'r1', state: 'finished', outcome: 'finished', detail: null, startNote: null, malformed: 0, foreignEventsDropped: 0, readError: null, tasks: [
      { taskId: 'T-1', elapsed: { status: 'measured', ms: 1000 }, startSha: 'a', endSha: 'a', rounds: [], missingRounds: [], changed: { status: 'measured', lines: 1, files: 1 } },
    ] }],
  };
  const text = render(model);
  assert.match(text, /Elapsed \[measured\]/);
  assert.match(text, /Rounds \[measured\]/);
  assert.match(text, /Between boundaries \(lines\/files\) \[measured\]/);
  assert.match(text, /Findings by severity \[claimed\]/);
  assert.match(text, /Notes \[claimed\]/);
});

test('I3: a run\'s reported outcome is marked claimed in its heading', () => {
  const model = {
    caveat: 'x',
    anyIncomplete: false,
    runs: [{ runId: 'r1', state: 'finished', outcome: 'finished', detail: null, startNote: null, malformed: 0, foreignEventsDropped: 0, readError: null, tasks: [] }],
  };
  const text = render(model);
  assert.match(text, /## r1 \[claimed outcome: finished\]/);
});

// --- AC-10: the wall-clock caveat is always printed ----------------------------------------

test('AC-10: the caveat line is always printed, even with zero runs', () => {
  const text = render({ caveat: 'caveat text', anyIncomplete: false, runs: [] });
  assert.match(text, /caveat text/);

  const text2 = render({
    caveat: 'caveat text',
    anyIncomplete: false,
    runs: [{ runId: 'r1', state: 'finished', outcome: 'finished', detail: null, startNote: null, malformed: 0, foreignEventsDropped: 0, readError: null, tasks: [] }],
  });
  assert.match(text2, /caveat text/);
});

test('AC-10: the shipped caveat text names waiting/idleness, not just "time"', () => {
  const text = render({ caveat: undefined, anyIncomplete: false, runs: [] });
  assert.match(text, /backoff/i);
  assert.match(text, /idle/i);
  assert.match(text, /inference/i);
});

test('the header legend line marks [measured] and [claimed]', () => {
  const text = render({ caveat: 'x', anyIncomplete: false, runs: [] });
  assert.match(text, /\[measured\] = read from a clock or from git\./);
  assert.match(text, /\[claimed\] = the agent's word\./);
});

// --- AC-7 + AC-9 + AC-11: full model derivation over real events and real git -------------

test('AC-7/AC-9/AC-11: per-task elapsed, round durations, changed lines/files, findings by severity; incomplete run counted and shown', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const startSha = headSha(repo);
    const endSha = commitFile(repo, 'b.txt', 'two\nthree\n');

    const t0 = new Date('2024-01-01T00:00:00.000Z');
    const iso = (offsetMs) => new Date(t0.getTime() + offsetMs).toISOString();

    const runId = 'milestone-1';
    const filePath = storeFilePath(runId, storeRoot);

    appendEvent(filePath, { kind: 'run-start', run: runId, task: null, round: null, machine: { timestamp: iso(0), headCommit: startSha }, reported: {} });
    appendEvent(filePath, { kind: 'task-start', run: runId, task: 'T-1', round: null, machine: { timestamp: iso(0), headCommit: startSha }, reported: {} });
    appendEvent(filePath, { kind: 'round-start', run: runId, task: 'T-1', round: 1, machine: { timestamp: iso(0), headCommit: startSha }, reported: {} });
    appendEvent(filePath, {
      kind: 'round-end',
      run: runId,
      task: 'T-1',
      round: 1,
      machine: { timestamp: iso(241000), headCommit: startSha },
      reported: { critical: 0, important: 1, minor: 2, notes: ['flaky test'] },
    });
    appendEvent(filePath, { kind: 'task-end', run: runId, task: 'T-1', round: null, machine: { timestamp: iso(372000), headCommit: endSha }, reported: {} });
    appendEvent(filePath, { kind: 'run-end', run: runId, task: null, round: null, machine: { timestamp: iso(372000), headCommit: endSha }, reported: { outcome: 'finished' } });

    const model = await buildReportModel([runId], { storeRoot, repoCwd: repo });

    assert.equal(model.anyIncomplete, false);
    const [run1] = model.runs;
    assert.equal(run1.state, 'finished');
    assert.equal(run1.outcome, 'finished');

    const [task] = run1.tasks;
    assert.equal(task.taskId, 'T-1');
    assert.equal(task.elapsed.status, 'measured');
    assert.equal(task.elapsed.ms, 372000);

    assert.equal(task.rounds.length, 1);
    assert.equal(task.rounds[0].duration.status, 'measured');
    assert.equal(task.rounds[0].duration.ms, 241000);
    assert.deepEqual(task.rounds[0].findings, { status: 'reported', values: { critical: 0, important: 1, minor: 2 } });
    assert.deepEqual(task.rounds[0].notes, ['flaky test']);

    assert.equal(task.changed.status, 'measured');
    assert.equal(task.changed.files, 1);
    assert.equal(task.changed.lines, 2); // "two\nthree\n" = 2 insertions

    const text = render(model);
    assert.match(text, /\| T-1 \| 372s \|/); // task elapsed
    assert.match(text, /r1 241s/); // round duration
    assert.match(text, /critical 0, important 1, minor 2/);
    assert.match(text, /flaky test/);
    assert.match(text, /\| 2 \/ 1 \|/); // changed lines/files column, one column
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('AC-9: a run with no run-end is incomplete, still counted and shown alongside a complete run', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const sha = headSha(repo);
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();

    const goodPath = storeFilePath('good-run', storeRoot);
    appendEvent(goodPath, { kind: 'run-start', run: 'good-run', task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
    appendEvent(goodPath, { kind: 'run-end', run: 'good-run', task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: { outcome: 'finished' } });

    const abandonedPath = storeFilePath('abandoned-run', storeRoot);
    appendEvent(abandonedPath, { kind: 'run-start', run: 'abandoned-run', task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
    appendEvent(abandonedPath, { kind: 'task-start', run: 'abandoned-run', task: 'T-1', round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
    // No task-end, no run-end: the run stops mid-flight.

    const model = await buildReportModel(['good-run', 'abandoned-run'], { storeRoot, repoCwd: repo });

    assert.equal(model.anyIncomplete, true);
    assert.equal(model.runs.length, 2); // never dropped
    const abandoned = model.runs.find((r) => r.runId === 'abandoned-run');
    assert.equal(abandoned.state, 'no-end');
    assert.equal(abandoned.detail, 'no run-end recorded');
    assert.equal(abandoned.tasks.length, 1);
    assert.equal(abandoned.tasks[0].elapsed.status, 'unsupported');

    const text = render(model);
    assert.match(text, /good-run/);
    assert.match(text, /abandoned-run/);
    assert.match(text, /INCOMPLETE RUNS PRESENT: 1 of 2/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('AC-9: a run-end with outcome failed or abandoned is incomplete', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const sha = headSha(repo);
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    for (const outcome of ['failed', 'abandoned']) {
      const runId = `run-${outcome}`;
      const filePath = storeFilePath(runId, storeRoot);
      appendEvent(filePath, { kind: 'run-start', run: runId, task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
      appendEvent(filePath, { kind: 'run-end', run: runId, task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: { outcome } });

      const model = await buildReportModel([runId], { storeRoot, repoCwd: repo });
      assert.equal(model.anyIncomplete, true);
      assert.equal(model.runs[0].state, outcome);
      assert.equal(model.runs[0].outcome, outcome);
    }
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

// --- I2: ambiguous run-start must not hide a recorded outcome; no-data is not "did not finish" -

test('I2: two run-start events alongside a clean finished run-end is reported as finished, with a note, not hidden as incomplete', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const sha = headSha(repo);
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const runId = 'r1';
    const filePath = storeFilePath(runId, storeRoot);
    appendEvent(filePath, { kind: 'run-start', run: runId, task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
    appendEvent(filePath, { kind: 'run-start', run: runId, task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
    appendEvent(filePath, { kind: 'run-end', run: runId, task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: { outcome: 'finished' } });

    const model = await buildReportModel([runId], { storeRoot, repoCwd: repo });
    assert.equal(model.anyIncomplete, false);
    assert.equal(model.runs[0].state, 'finished');
    assert.equal(model.runs[0].outcome, 'finished');
    assert.match(model.runs[0].startNote, /ambiguous: 2 run-start events recorded/);

    const text = render(model);
    assert.doesNotMatch(text, /INCOMPLETE RUNS PRESENT/);
    assert.match(text, /\[claimed outcome: finished\]/);
    assert.match(text, /note: ambiguous: 2 run-start events recorded/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('I2: a run id with no store file at all is shown as "no data", never counted as "did not cleanly finish"', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const model = await buildReportModel(['typo-d-run-id'], { storeRoot, repoCwd: repo });
    assert.equal(model.runs[0].state, 'no-data');
    assert.equal(model.anyIncomplete, false); // no-data is not "did not cleanly finish"

    const text = render(model);
    assert.doesNotMatch(text, /INCOMPLETE RUNS PRESENT/);
    assert.match(text, /\[no data for this run id\]/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('I2: a run id that started and never ended is still counted as "did not cleanly finish", distinct from no-data', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const sha = headSha(repo);
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const runId = 'started-then-died';
    const filePath = storeFilePath(runId, storeRoot);
    appendEvent(filePath, { kind: 'run-start', run: runId, task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });

    const model = await buildReportModel([runId, 'no-such-run'], { storeRoot, repoCwd: repo });
    const started = model.runs.find((r) => r.runId === runId);
    const noData = model.runs.find((r) => r.runId === 'no-such-run');
    assert.equal(started.state, 'no-end');
    assert.equal(noData.state, 'no-data');
    assert.equal(model.anyIncomplete, true);

    const text = render(model);
    assert.match(text, /INCOMPLETE RUNS PRESENT: 1 of 2/);
    assert.match(text, new RegExp(`${runId} \\(no run-end recorded\\)`));
    assert.doesNotMatch(text, /no-such-run \(/); // no-data is not listed in the "did not finish" banner
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('a run-end recorded without a recognized outcome is ambiguous, not silently treated as finished or failed', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const sha = headSha(repo);
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const runId = 'r1';
    const filePath = storeFilePath(runId, storeRoot);
    appendEvent(filePath, { kind: 'run-start', run: runId, task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
    appendEvent(filePath, { kind: 'run-end', run: runId, task: null, round: null, machine: { timestamp: t0, headCommit: sha }, reported: { outcome: 'made-up-outcome' } });

    const model = await buildReportModel([runId], { storeRoot, repoCwd: repo });
    assert.equal(model.runs[0].state, 'ambiguous');
    assert.equal(model.anyIncomplete, false); // ambiguous is unknown, not "did not finish"
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

// --- I1: the round count never undercounts when a round-number gap exists -----------------

test('I1: a missing middle round does not reduce the rendered round count', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'round-start', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'round-end', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:01:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'round-start', task: 'T-1', round: 3, machine: { timestamp: '2024-01-01T00:02:00.000Z', headCommit: 'a' }, reported: {} },
  ]);
  const [task] = view.tasks;
  assert.equal(task.rounds.length + task.missingRounds.length, 3); // 1, 2 (gap), 3: three round numbers
  task.changed = { status: 'measured', lines: 0, files: 0 };

  const text = render({ caveat: 'x', anyIncomplete: false, runs: [{ ...view, state: 'finished', outcome: 'finished', detail: null, startNote: null, malformed: 0, foreignEventsDropped: 0, readError: null }] });
  assert.match(text, /3 round\(s\): r1 60s, r2 missing \[[a-z]\d*\], r3 unknown \[[a-z]\d*\]/);
  assert.doesNotMatch(text, /^2 round\(s\)/m);
});

// --- AC-11: derive nothing that cannot be supported -----------------------------------------

test('C1/AC-11: identical head commits render as an explicit "unsupported, likely a wiring problem" reason, never a zero', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const sha = headSha(repo);
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const runId = 'r1';
    const filePath = storeFilePath(runId, storeRoot);
    appendEvent(filePath, { kind: 'task-start', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
    appendEvent(filePath, { kind: 'task-end', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });

    const model = await buildReportModel([runId], { storeRoot, repoCwd: repo });
    const task = model.runs[0].tasks[0];
    assert.equal(task.changed.status, 'unsupported'); // never "identical", never measured
    assert.match(task.changed.reason, /identical head commits/);
    assert.match(task.changed.reason, /wiring problem/);
    assert.match(task.changed.reason, /AC-12/);

    const text = render(model);
    assert.doesNotMatch(text, /\|\s*0 \/ 0\s*\|/); // never a bare zero pair
    assert.match(text, /unknown \[[a-z]\d*\]/);
    assert.match(text, /identical head commits.*wiring problem.*AC-12/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('I4: two distinct commits with an identical tree render a measured 0/0 with its own reason, never a bare zero', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const startSha = headSha(repo);
    const endSha = commitEmpty(repo, 'empty commit');
    assert.notEqual(startSha, endSha);
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const runId = 'r1';
    const filePath = storeFilePath(runId, storeRoot);
    appendEvent(filePath, { kind: 'task-start', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: startSha }, reported: {} });
    appendEvent(filePath, { kind: 'task-end', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: endSha }, reported: {} });

    const model = await buildReportModel([runId], { storeRoot, repoCwd: repo });
    const task = model.runs[0].tasks[0];
    assert.equal(task.changed.status, 'measured');
    assert.equal(task.changed.files, 0);
    assert.equal(task.changed.lines, 0);
    assert.match(task.changed.reason, /no diff between two distinct commits/);

    const text = render(model);
    assert.doesNotMatch(text, /\|\s*0 \/ 0\s*\|/); // never a bare, unmarked 0/0
    assert.match(text, /0 \/ 0 \[[a-z]\d*\]/);
    assert.match(text, /no diff between two distinct commits/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('AC-11: a commit that no longer resolves in the repository renders as unsupported, never a fabricated number', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const startSha = headSha(repo);
    const fakeSha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'; // never an object in this repo
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const runId = 'r1';
    const filePath = storeFilePath(runId, storeRoot);
    appendEvent(filePath, { kind: 'task-start', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: startSha }, reported: {} });
    appendEvent(filePath, { kind: 'task-end', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: fakeSha }, reported: {} });

    const model = await buildReportModel([runId], { storeRoot, repoCwd: repo });
    const task = model.runs[0].tasks[0];
    assert.equal(task.changed.status, 'unsupported');

    const text = render(model);
    assert.match(text, /unknown \[[a-z]\d*\]/);
    assert.match(text, /could not resolve/);
    assert.doesNotMatch(text, /\|\s*0 \/ 0\s*\|/); // never a fabricated 0/0 pair
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('AC-11: an absent/non-repository working tree renders changed lines/files as unsupported', async () => {
  const notARepo = mkdtempSync(path.join(tmpdir(), 'experiment-report-norepo-'));
  const storeRoot = makeStoreRoot();
  try {
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const runId = 'r1';
    const filePath = storeFilePath(runId, storeRoot);
    appendEvent(filePath, { kind: 'task-start', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: 'aaaaaaa' }, reported: {} });
    appendEvent(filePath, { kind: 'task-end', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: 'bbbbbbb' }, reported: {} });

    const model = await buildReportModel([runId], { storeRoot, repoCwd: notARepo });
    const task = model.runs[0].tasks[0];
    assert.equal(task.changed.status, 'unsupported');
    assert.match(task.changed.reason, /could not resolve|unavailable/);
  } finally {
    rmSync(notARepo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('M2: a head commit that is not a valid hex sha (a hand-edited store line) is rejected before it ever reaches git', async () => {
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    const runId = 'r1';
    const filePath = storeFilePath(runId, storeRoot);
    appendEvent(filePath, { kind: 'task-start', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: '--upload-pack=evil' }, reported: {} });
    appendEvent(filePath, { kind: 'task-end', run: runId, task: 'T-1', round: null, machine: { timestamp: t0, headCommit: 'bbbbbbb' }, reported: {} });

    const model = await buildReportModel([runId], { storeRoot, repoCwd: repo });
    const task = model.runs[0].tasks[0];
    assert.equal(task.changed.status, 'unsupported');
    assert.match(task.changed.reason, /not a valid hex commit id/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('M3: deriveChangedStats surfaces whatever status a git call returns, including a distinct timeout reason', async () => {
  const timedOutGitDiff = async () => ({ status: 'unsupported', reason: 'git diff timed out after 5000ms' });
  const repo = makeRepo();
  const storeRoot = makeStoreRoot();
  try {
    const sha = headSha(repo);
    const otherSha = commitFile(repo, 'x.txt', 'x\n');
    const filePath = storeFilePath('r2', storeRoot);
    const t0 = new Date('2024-01-01T00:00:00.000Z').toISOString();
    appendEvent(filePath, { kind: 'task-start', run: 'r2', task: 'T-1', round: null, machine: { timestamp: t0, headCommit: sha }, reported: {} });
    appendEvent(filePath, { kind: 'task-end', run: 'r2', task: 'T-1', round: null, machine: { timestamp: t0, headCommit: otherSha }, reported: {} });
    const model = await buildReportModel(['r2'], { storeRoot, repoCwd: repo, gitDiffShortstat: timedOutGitDiff });
    assert.equal(model.runs[0].tasks[0].changed.status, 'unsupported');
    assert.match(model.runs[0].tasks[0].changed.reason, /timed out/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

test('M3: the git wrapper itself distinguishes a timeout from an unresolvable commit/repository', () => {
  const source = readFileSync(CLI, 'utf8');
  assert.match(source, /err\.killed \|\| err\.code === 'ETIMEDOUT'/);
  assert.match(source, /git diff timed out after/);
});

test('AC-11: an unpaired task-start (no task-end) never derives an elapsed time or changed stats', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'run-start', task: null, round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'task-start', task: 'T-1', round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
  ]);
  const [task] = view.tasks;
  assert.equal(task.elapsed.status, 'unsupported');
  assert.equal(task.startSha, 'a');
  assert.equal(task.endSha, null); // no task-end at all
});

test('AC-11: a round-start with no round-end renders duration unsupported and findings as no-round-end, never zero findings', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'task-start', task: 'T-1', round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'round-start', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
  ]);
  const [task] = view.tasks;
  assert.equal(task.rounds.length, 1);
  assert.equal(task.rounds[0].duration.status, 'unsupported');
  assert.deepEqual(task.rounds[0].findings, { status: 'no-round-end' });
});

test('AC-11: a round-end with no severity flags reported renders "not reported", distinct from a reported zero', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'round-start', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'round-end', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:00:01.000Z', headCommit: 'a' }, reported: {} },
  ]);
  const [task] = view.tasks;
  assert.deepEqual(task.rounds[0].findings, { status: 'not-reported' });

  const view2 = buildRunView('r1', [
    { run: 'r1', kind: 'round-start', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'round-end', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:00:01.000Z', headCommit: 'a' }, reported: { critical: 0 } },
  ]);
  assert.deepEqual(view2.tasks[0].rounds[0].findings, { status: 'reported', values: { critical: 0 } });
});

test('AC-11: a gap in round numbering renders the missing round explicitly', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'round-start', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'round-end', task: 'T-1', round: 1, machine: { timestamp: '2024-01-01T00:00:01.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'round-start', task: 'T-1', round: 3, machine: { timestamp: '2024-01-01T00:00:02.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'round-end', task: 'T-1', round: 3, machine: { timestamp: '2024-01-01T00:00:03.000Z', headCommit: 'a' }, reported: {} },
  ]);
  assert.deepEqual(view.tasks[0].missingRounds, [2]);
  view.tasks[0].changed = { status: 'measured', lines: 0, files: 0 };
  const text = render({ caveat: 'x', anyIncomplete: false, runs: [{ ...view, state: 'finished', outcome: 'finished', detail: null, startNote: null, malformed: 0, foreignEventsDropped: 0, readError: null }] });
  assert.match(text, /r2 missing \[[a-z]\d*\]/);
});

test('AC-11: ambiguous duplicate boundary events (more than one start or end) render unsupported, never a guessed pairing', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'task-start', task: 'T-1', round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'task-start', task: 'T-1', round: null, machine: { timestamp: '2024-01-01T00:05:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'task-end', task: 'T-1', round: null, machine: { timestamp: '2024-01-01T00:10:00.000Z', headCommit: 'a' }, reported: {} },
  ]);
  assert.equal(view.tasks[0].elapsed.status, 'unsupported');
  assert.match(view.tasks[0].elapsed.reason, /ambiguous: 2 start events recorded/);
});

// --- M4: tasks render in execution order, not lexicographic order --------------------------

test('M4: tasks are ordered by first recorded event, so T-2 precedes T-10', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'task-start', task: 'T-2', round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'r1', kind: 'task-start', task: 'T-10', round: null, machine: { timestamp: '2024-01-01T00:05:00.000Z', headCommit: 'a' }, reported: {} },
  ]);
  assert.deepEqual(view.tasks.map((t) => t.taskId), ['T-2', 'T-10']);
});

// --- M5: events for a different run id are never attributed to this run --------------------

test('M5: an event whose run id does not match this run is dropped, not attributed', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'run-start', task: null, round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
    { run: 'other-run', kind: 'task-start', task: 'T-1', round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
  ]);
  assert.equal(view.tasks.length, 0);
  assert.equal(view.foreignEventsDropped, 1);
});

// --- M6: a completed run can still surface tasks with unpaired boundaries ------------------

test('M6: the run heading names how many tasks have unpaired boundaries', () => {
  const view = buildRunView('r1', [
    { run: 'r1', kind: 'run-end', task: null, round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: { outcome: 'finished' } },
    { run: 'r1', kind: 'task-start', task: 'T-1', round: null, machine: { timestamp: '2024-01-01T00:00:00.000Z', headCommit: 'a' }, reported: {} },
  ]);
  view.tasks[0].changed = { status: 'unsupported', reason: 'missing head commit: task-start and/or task-end were not both recorded exactly once' };
  const text = render({ caveat: 'x', anyIncomplete: false, runs: [{ ...view, malformed: 0, foreignEventsDropped: 0, readError: null }] });
  assert.match(text, /1 task\(s\) with unpaired boundaries/);
});

// --- M7: a store file that cannot be read surfaces a typed diagnostic, not a thrown stack trace -

test('M7: a store file the process cannot read is reported as a typed read error, not a thrown exception', async () => {
  const storeRoot = makeStoreRoot();
  const runId = 'unreadable';
  const filePath = storeFilePath(runId, storeRoot);
  mkdirSync(filePath); // a directory where the file should be: readFileSync throws EISDIR
  try {
    const model = await buildReportModel([runId], { storeRoot, repoCwd: makeRepo() });
    assert.equal(model.runs[0].readError !== null, true);
    const text = render(model);
    assert.match(text, /could not read the store file/);
  } finally {
    rmSync(storeRoot, { recursive: true, force: true });
  }
});

// --- CLI ---------------------------------------------------------------------------------

test('CLI: missing run id exits nonzero with a diagnostic', async () => {
  const code = await run([], { stdout: nullStdout(), stderr: nullStderr() });
  assert.equal(code, 1);
});

test('CLI: an invalid run id exits nonzero with a diagnostic', async () => {
  const code = await run(['not a valid id'], { stdout: nullStdout(), stderr: nullStderr() });
  assert.equal(code, 1);
});

test('CLI end-to-end (subprocess): a run id with no store file renders as "no data", not folded into "did not cleanly finish"', () => {
  const home = makeStoreRoot();
  const repo = makeRepo();
  try {
    const result = spawnSync(process.execPath, [CLI, 'never-started', '--repo', repo], {
      env: { ...process.env, HOME: home },
    });
    assert.equal(result.status, 0, result.stderr?.toString());
    const text = result.stdout.toString();
    assert.match(text, /never-started/);
    assert.match(text, /\[no data for this run id\]/);
    assert.doesNotMatch(text, /INCOMPLETE RUNS PRESENT/);
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

// --- marker (T-4 sweeps this repo-wide; pinned locally too) ---

test('carries the EXPERIMENT: run-observability marker', () => {
  const source = readFileSync(CLI, 'utf8');
  assert.match(source, /EXPERIMENT: run-observability/);
});

test('carries no em-dashes', () => {
  const source = readFileSync(CLI, 'utf8');
  assert.doesNotMatch(source, /\u2014/);
});
