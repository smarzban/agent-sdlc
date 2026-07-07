// Tests for the per-SHA commit-subject reader + the ledger-vs-git rule (AC-4, option-(b)).
// Integration-style: builds a real throwaway git repo per test (mkdtemp + execFileSync git
// commands, per plan Notes) rather than mocking git, so the reader is proven against real `git
// show` output. Fixture repos set a LOCAL user.email/user.name (never rely on global git config,
// which may be absent/differ in CI) and are removed in a `finally` block.
//
// Model (SMA-420): the ledger is the AUTHORITATIVE task↔commit link. For each `done` task the rule
// verifies the task's own ledger-RECORDED commit SHA — the SHA must exist in the repo and its
// subject's scope position must reference EXACTLY that task. No git-history walk: a recorded SHA is
// looked up individually, so task IDs restarting per feature can never collide (the old rev-range
// walk's failure mode is structurally gone).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  parseLedger,
  readCommitSubject,
  checkLedgerVsGit,
  checkLedgerCommitCap,
  MAX_LEDGER_COMMITS,
  isShallowRepo,
} from './sdlc-check.mjs';

function makeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'sdlc-check-git-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: dir });
  return dir;
}

// Commit with the given subject; returns the new commit's full SHA.
function commit(dir, filename, subject) {
  writeFileSync(path.join(dir, filename), `${subject}\n`);
  execFileSync('git', ['add', filename], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', subject], { cwd: dir });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
}

// A commit with a SEPARATE subject and body (two `-m` flags — git joins them as subject + blank
// line + body). Used to pin that the reader captures the SUBJECT only (`%s`), never the body.
function commitWithBody(dir, filename, subject, body) {
  writeFileSync(path.join(dir, filename), `${subject}\n`);
  execFileSync('git', ['add', filename], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', subject, '-m', body], { cwd: dir });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
}

// Build a parseLedger() model from rows { id, status?, commit? }. `commit` is the RAW cell text
// (so a test can embed an annotated cell like "abc1234 (+corrective def5678)"); default status is
// 'done', default commit is the "—" no-commit marker.
function makeLedger(rows) {
  const lines = ['## Task ledger', '', '| Task | Status | Commit |', '| --- | --- | --- |'];
  for (const r of rows) lines.push(`| ${r.id} | ${r.status ?? 'done'} | ${r.commit ?? '—'} |`);
  const result = parseLedger(lines.join('\n'), 'x.md');
  assert.equal(result.ok, true, 'fixture ledger must itself parse cleanly');
  return result;
}

// Mirrors run()'s gather step: for each done task with a recorded SHA, read that commit via the
// reader into a `sha -> { found, reachable, subject }` map — the exact shape checkLedgerVsGit
// consumes. `reachable` (FIX 1) distinguishes a resolvable-but-orphaned SHA from a reachable one.
async function gatherSubjects(dir, ledger) {
  const map = new Map();
  for (const t of ledger.tasks) {
    if (!/^done$/i.test(t.status) || !t.commit || map.has(t.commit)) continue;
    const res = await readCommitSubject(dir, t.commit);
    if (res.ok) map.set(t.commit, { found: true, reachable: true, subject: res.subject });
    else if (res.unreachable) map.set(t.commit, { found: true, reachable: false, subject: null });
    else if (res.notFound) map.set(t.commit, { found: false, reachable: false, subject: null });
    // res.unavailable (git absent / not a repo / timeout) is a systemic failure the CLI handles.
  }
  return map;
}

// --- readCommitSubject: the per-SHA reader contract ---

test('readCommitSubject returns the subject line of a known commit (subject only, never the body)', async () => {
  const dir = makeRepo();
  try {
    const sha = commitWithBody(dir, 'a', 'feat(T-1): the subject', 'a body that mentions T-9');
    const res = await readCommitSubject(dir, sha);
    assert.equal(res.ok, true);
    assert.equal(res.subject, 'feat(T-1): the subject'); // body never captured, no trailing newline
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readCommitSubject on a nonexistent SHA yields a typed not-found (never a crash)', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): first');
    const res = await readCommitSubject(dir, 'deadbeef'); // valid-shaped, not a real object
    assert.equal(res.ok, false);
    assert.equal(res.notFound, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readCommitSubject on a non-repo directory yields a typed systemic failure, not a pass', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sdlc-check-notrepo-'));
  try {
    const res = await readCommitSubject(dir, 'deadbeef');
    assert.equal(res.ok, false);
    assert.equal(res.unavailable, true);
    assert.equal(typeof res.error.problem, 'string');
    assert.ok(res.error.problem.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- checkLedgerVsGit: the AC-4 option-(b) recorded-commit cases ---

test('a done task whose recorded commit subject scopes exactly it passes (no finding)', async () => {
  const dir = makeRepo();
  try {
    const sha = commit(dir, 'a', 'feat(T-1): first');
    const ledger = makeLedger([{ id: 'T-1', commit: sha }]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.deepEqual(findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a done task whose recorded commit references a DIFFERENT task fails naming it', async () => {
  const dir = makeRepo();
  try {
    const sha = commit(dir, 'a', 'feat(T-2): a different task'); // recorded for T-1 in the ledger
    const ledger = makeLedger([{ id: 'T-1', commit: sha }]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'ledger-vs-git');
    assert.deepEqual(findings[0].ids, ['T-1']);
    assert.match(findings[0].message, /does not reference it/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a done task whose recorded commit references NO task (area scope) fails naming it', async () => {
  const dir = makeRepo();
  try {
    const sha = commit(dir, 'a', 'docs(enforcement-spine): a task-less area-scoped subject');
    const ledger = makeLedger([{ id: 'T-1', commit: sha }]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].ids, ['T-1']);
    assert.match(findings[0].message, /does not reference it/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a done task whose recorded commit is a multi-task feat(T-3, T-4) subject fails (references more than one)', async () => {
  const dir = makeRepo();
  try {
    const sha = commit(dir, 'a', 'feat(T-3, T-4): shared work');
    const ledger = makeLedger([{ id: 'T-3', commit: sha }, { id: 'T-4', commit: sha }]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    const ids = findings.flatMap((f) => f.ids).sort();
    assert.deepEqual(ids, ['T-3', 'T-4']); // both done tasks fail — the shared commit names both
    for (const f of findings) {
      assert.equal(f.rule, 'ledger-vs-git');
      assert.match(f.message, /also references|exactly one task/);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a done task whose recorded SHA does not exist in the repo fails naming it', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): a real commit, but not the one recorded');
    const ledger = makeLedger([{ id: 'T-1', commit: 'deadbeef' }]); // not a real object
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].ids, ['T-1']);
    assert.match(findings[0].message, /deadbeef/);
    assert.match(findings[0].message, /not found in the repo/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a done task with an EMPTY commit cell fails with "no recorded commit"', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): a commit exists but the ledger records none');
    const ledger = makeLedger([{ id: 'T-1', commit: '—' }]); // no SHA-shaped token → t.commit null
    assert.equal(ledger.tasks.find((t) => t.task === 'T-1').commit, null);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].ids, ['T-1']);
    assert.match(findings[0].message, /records no commit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// D6: the commit cell is not always a bare SHA — a real ledger annotates it (the enforcement-spine
// T-6 cell is "`4ddd29e` (+corrective `d3c4275`)"). The FIRST SHA-shaped token is the authoritative
// task commit. This pins that: the first SHA's subject (feat(T-6)) is used; a wrong second-SHA pick
// would read the unrelated `chore` subject and (wrongly) fail.
test('an annotated commit cell uses the FIRST SHA (D6): "sha (+corrective otherSha)" resolves to the first', async () => {
  const dir = makeRepo();
  try {
    const shaReal = commit(dir, 'a', 'feat(T-6): the authoritative task commit');
    const shaOther = commit(dir, 'b', 'chore: an unrelated corrective, not a task commit');
    const ledger = makeLedger([{ id: 'T-6', commit: `\`${shaReal}\` (+corrective \`${shaOther}\`)` }]);
    assert.equal(ledger.tasks.find((t) => t.task === 'T-6').commit, shaReal); // first SHA extracted
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.deepEqual(findings, []); // first SHA's subject is feat(T-6) → passes
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkLedgerVsGit is exhaustive: every offending done task is reported, not just the first', async () => {
  const dir = makeRepo();
  try {
    const shaBad1 = commit(dir, 'a', 'feat(T-2): wrong scope for T-1');
    const shaGood = commit(dir, 'b', 'feat(T-5): correct');
    const shaBad2 = commit(dir, 'c', 'chore: no task at all for T-9');
    const ledger = makeLedger([
      { id: 'T-1', commit: shaBad1 },
      { id: 'T-5', commit: shaGood },
      { id: 'T-9', commit: shaBad2 },
    ]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    const ids = findings.flatMap((f) => f.ids).sort();
    assert.deepEqual(ids, ['T-1', 'T-9']); // T-5 passes; both others reported
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('T-1 does not cross-match a recorded commit whose subject scopes T-12', async () => {
  const dir = makeRepo();
  try {
    const sha = commit(dir, 'a', 'feat(T-12): twelfth task'); // recorded for T-1
    const ledger = makeLedger([{ id: 'T-1', commit: sha }]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].ids, ['T-1']);
    assert.match(findings[0].message, /does not reference it/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('T-12 is correctly matched by its own recorded feat(T-12) commit (not swallowed by T-1 logic)', async () => {
  const dir = makeRepo();
  try {
    const sha = commit(dir, 'a', 'feat(T-12): twelfth task');
    const ledger = makeLedger([{ id: 'T-12', commit: sha }]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.deepEqual(findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a task not marked done is never checked, even with a missing/wrong recorded commit', async () => {
  const dir = makeRepo();
  try {
    const sha = commit(dir, 'a', 'feat(T-1): first');
    const ledger = makeLedger([
      { id: 'T-1', status: 'done', commit: sha },
      { id: 'T-2', status: 'pending', commit: '—' },
    ]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.deepEqual(findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- FIX 1 (reachability): a recorded SHA must be REACHABLE from HEAD, not merely resolvable ---
//
// `git show` resolves ANY object in the store — including a dangling pre-amend commit — so a ledger
// recording a stale SHA that is not in the shipped history used to false-pass (a fail-open
// regression from the old reachable-only `git log` walk). readCommitSubject now gates on
// `git merge-base --is-ancestor <sha> HEAD` first: a resolvable-but-unreachable SHA → a finding.

test('readCommitSubject on a resolvable-but-UNREACHABLE (pre-amend dangling) sha yields a typed unreachable', async () => {
  const dir = makeRepo();
  try {
    const preAmend = commit(dir, 'a', 'feat(T-1): pre-amend');
    execFileSync('git', ['commit', '--amend', '-q', '-m', 'feat(T-1): amended'], { cwd: dir });
    // The pre-amend commit is now dangling but still resolvable by `git show` (the false-pass risk).
    const shown = execFileSync('git', ['show', '-s', '--format=%s', preAmend, '--'], {
      cwd: dir,
      encoding: 'utf8',
    }).trim();
    assert.equal(shown, 'feat(T-1): pre-amend'); // still resolvable → exactly the fail-open the gate closes
    const res = await readCommitSubject(dir, preAmend);
    assert.equal(res.ok, false);
    assert.equal(res.unreachable, true); // object exists but is not an ancestor of HEAD
    assert.notEqual(res.notFound, true);
    assert.notEqual(res.unavailable, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('FIX 1: a done task whose recorded commit is a pre-amend DANGLING sha fails as unreachable (not a silent pass)', async () => {
  const dir = makeRepo();
  try {
    const preAmend = commit(dir, 'a', 'feat(T-1): pre-amend');
    execFileSync('git', ['commit', '--amend', '-q', '-m', 'feat(T-1): amended'], { cwd: dir });
    const ledger = makeLedger([{ id: 'T-1', commit: preAmend }]);
    const findings = checkLedgerVsGit(ledger, await gatherSubjects(dir, ledger));
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'ledger-vs-git');
    assert.deepEqual(findings[0].ids, ['T-1']);
    assert.match(findings[0].message, /not reachable from HEAD/);
    assert.match(findings[0].message, /stale or orphaned/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- FIX 2 (bound the subprocesses): a cap on distinct recorded done commits ---
//
// The checker spawns one git subprocess per distinct done-task SHA. checkLedgerCommitCap refuses
// (fail closed, one finding) above MAX_LEDGER_COMMITS BEFORE any lookup runs — the CLI skips the
// per-SHA loop entirely when it fires, so no git subprocess is spawned. Tested directly (no git).

test('FIX 2: an over-cap ledger (> MAX_LEDGER_COMMITS distinct done commits) yields a fail-closed cap finding', () => {
  const rows = [];
  for (let i = 1; i <= MAX_LEDGER_COMMITS + 1; i += 1) {
    rows.push({ id: `T-${i}`, commit: i.toString(16).padStart(7, '0') }); // distinct 7-hex SHA-shaped tokens
  }
  const ledger = makeLedger(rows);
  const finding = checkLedgerCommitCap(ledger);
  assert.ok(finding, 'exceeding the cap must produce a finding');
  assert.equal(finding.type, 'finding');
  assert.equal(finding.rule, 'ledger-vs-git');
  assert.deepEqual(finding.ids, ['ledger']);
  assert.match(finding.message, /refusing to spawn unbounded git lookups/);
  assert.match(finding.message, new RegExp(`more than ${MAX_LEDGER_COMMITS}`));
});

test('FIX 2: a ledger with exactly MAX_LEDGER_COMMITS distinct done commits is UNDER the cap (>, not >=)', () => {
  const rows = [];
  for (let i = 1; i <= MAX_LEDGER_COMMITS; i += 1) {
    rows.push({ id: `T-${i}`, commit: i.toString(16).padStart(7, '0') });
  }
  const ledger = makeLedger(rows);
  assert.equal(checkLedgerCommitCap(ledger), null); // exactly at the cap does not trip it
});

test('FIX 2: distinct SHAs are counted (not rows): many done tasks sharing one commit stay under the cap', () => {
  const rows = [];
  for (let i = 1; i <= MAX_LEDGER_COMMITS + 5; i += 1) {
    rows.push({ id: `T-${i}`, commit: 'aaaaaaa' }); // all share ONE distinct SHA → distinct size 1
  }
  const ledger = makeLedger(rows);
  assert.equal(checkLedgerCommitCap(ledger), null);
});

// --- Shallow clone detection and shallow-repo hint in not-found findings ---

test('isShallowRepo: true for a depth-1 clone, false for a full repo', async (t) => {
  const origin = makeRepo();
  try {
    const sha1 = commit(origin, 'a.txt', 'feat(T-1): one');
    const sha2 = commit(origin, 'b.txt', 'feat(T-2): two');
    const cloneDir = mkdtempSync(path.join(tmpdir(), 'sdlc-shallow-'));
    execFileSync('git', ['clone', '--depth', '1', `file://${origin}`, cloneDir], { stdio: 'ignore' });
    try {
      assert.equal(await isShallowRepo(cloneDir), true);
      assert.equal(await isShallowRepo(origin), false);
    } finally {
      rmSync(cloneDir, { recursive: true, force: true });
    }
  } finally {
    rmSync(origin, { recursive: true, force: true });
  }
});

test('checkLedgerVsGit appends a shallow-clone hint to not-found findings when shallowRepo is set', () => {
  const ledger = { tasks: [{ task: 'T-1', status: 'done', commit: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef' }], evidence: new Map() };
  const subjects = new Map([['deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', { found: false, reachable: false, subject: null }]]);
  const withHint = checkLedgerVsGit(ledger, subjects, { shallowRepo: true });
  assert.match(withHint[0].message, /shallow/i);
  const withoutHint = checkLedgerVsGit(ledger, subjects);
  assert.doesNotMatch(withoutHint[0].message, /shallow/i);
});
