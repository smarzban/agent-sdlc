// Tests for the repo facts reader + ledger-vs-git rule (T-6, AC-4).
// Integration-style: builds a real throwaway git repo per test (mkdtemp + execFileSync git
// commands, per plan Notes) rather than mocking git, so the reader is proven against real `git
// log` output. Fixture repos set a LOCAL user.email/user.name (never rely on global git config,
// which may be absent/differ in CI) and are removed in a `finally` block.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseLedger, readRepoFacts, checkLedgerVsGit } from './sdlc-check.mjs';

function makeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'sdlc-check-git-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: dir });
  return dir;
}

function commit(dir, filename, message) {
  writeFileSync(path.join(dir, filename), `${message}\n`);
  execFileSync('git', ['add', filename], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', message], { cwd: dir });
}

// A commit with a SEPARATE subject and body (two `-m` flags — git joins them as subject + blank
// line + body). Used to pin that matching is subject-only: `git log --format=%s` returns only the
// first `-m`, never the second.
function commitWithBody(dir, filename, subject, body) {
  writeFileSync(path.join(dir, filename), `${subject}\n`);
  execFileSync('git', ['add', filename], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', subject, '-m', body], { cwd: dir });
}

function ledgerWithDoneTasks(taskIds) {
  const lines = ['## Task ledger', '', '| Task | Status |', '| --- | --- |'];
  for (const id of taskIds) lines.push(`| ${id} | done |`);
  const result = parseLedger(lines.join('\n'), 'x.md');
  assert.equal(result.ok, true, 'fixture ledger must itself parse cleanly');
  return result;
}

// --- readRepoFacts: typed-failure contract ---

test('readRepoFacts on a non-repo directory yields a typed failure, not a pass', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sdlc-check-notrepo-'));
  try {
    const facts = await readRepoFacts(dir);
    assert.equal(facts.ok, false);
    assert.equal(typeof facts.error.problem, 'string');
    assert.ok(facts.error.problem.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('readRepoFacts on a real repo returns the commit list (id, message)', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): first');
    const facts = await readRepoFacts(dir);
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 1);
    assert.equal(facts.commits[0].message, 'feat(T-1): first');
    assert.equal(typeof facts.commits[0].id, 'string');
    assert.ok(facts.commits[0].id.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- checkLedgerVsGit: the four AC-4 cases + the T-1/T-12 boundary ---

test('a done task with no commit referencing it fails naming the task', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-2): unrelated');
    const facts = await readRepoFacts(dir, ['T-1', 'T-2']);
    assert.equal(facts.ok, true);
    const ledger = ledgerWithDoneTasks(['T-1']);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].type, 'finding');
    assert.equal(findings[0].rule, 'ledger-vs-git');
    assert.deepEqual(findings[0].ids, ['T-1']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a commit referencing two task IDs fails the done task(s) it names', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-3, T-4): shared work');
    const facts = await readRepoFacts(dir, ['T-3', 'T-4']);
    const ledger = ledgerWithDoneTasks(['T-3', 'T-4']);
    const findings = checkLedgerVsGit(ledger, facts);
    const ids = findings.flatMap((f) => f.ids).sort();
    assert.deepEqual(ids, ['T-3', 'T-4']);
    for (const f of findings) assert.equal(f.rule, 'ledger-vs-git');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('exactly one commit per done task passes (no finding)', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): first');
    commit(dir, 'b', 'feat(T-2): second');
    const facts = await readRepoFacts(dir, ['T-1', 'T-2']);
    const ledger = ledgerWithDoneTasks(['T-1', 'T-2']);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a non-repo directory yields a typed failure that the rule/tests assert on (not a pass)', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sdlc-check-notrepo2-'));
  try {
    const facts = await readRepoFacts(dir, ['T-1']);
    assert.equal(facts.ok, false);
    assert.notEqual(facts.ok, true); // never silently reads as a pass
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('T-1 does not cross-match a commit that only references T-12', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-12): twelfth task');
    const facts = await readRepoFacts(dir, ['T-1', 'T-12']);
    const ledger = ledgerWithDoneTasks(['T-1']);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].ids, ['T-1']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('T-12 itself is correctly matched by its own commit (not swallowed by T-1 logic)', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-12): twelfth task');
    const facts = await readRepoFacts(dir, ['T-12']);
    const ledger = ledgerWithDoneTasks(['T-12']);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('checkLedgerVsGit is exhaustive: multiple offending done tasks all reported', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-9): only nine');
    const facts = await readRepoFacts(dir, ['T-1', 'T-5', 'T-9']);
    const ledger = ledgerWithDoneTasks(['T-1', 'T-5', 'T-9']);
    const findings = checkLedgerVsGit(ledger, facts);
    const ids = findings.flatMap((f) => f.ids).sort();
    assert.deepEqual(ids, ['T-1', 'T-5']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a done task with more than one commit referencing only it fails (ambiguous, not exactly one)', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): first attempt');
    commit(dir, 'b', 'feat(T-1): second attempt');
    const facts = await readRepoFacts(dir, ['T-1']);
    const ledger = ledgerWithDoneTasks(['T-1']);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].ids, ['T-1']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Guard: matching is over the commit SUBJECT LINE only (`%s`) — the body is never read. If this
// regresses to `%B` (whole message), a body mention would falsely count as a reference: T-4's own
// commit would wrongly also "reference" T-3 (multi-task false positive on T-4), and T-3 would
// wrongly be considered backed by a commit that never names it in its subject.
test('a task ID mentioned only in a commit BODY (not its subject) is not a reference', async () => {
  const dir = makeRepo();
  try {
    commitWithBody(dir, 'a', 'feat(T-4): work', 'supersedes T-3');
    const facts = await readRepoFacts(dir, ['T-3', 'T-4']);
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 1);
    assert.equal(facts.commits[0].message, 'feat(T-4): work'); // body never captured
    const ledger = ledgerWithDoneTasks(['T-3', 'T-4']);
    const findings = checkLedgerVsGit(ledger, facts);
    // T-4 passes: its one commit's subject-only token set is exactly {T-4}, not polluted by the
    // body's "T-3" mention.
    assert.equal(findings.some((f) => f.ids.includes('T-4')), false);
    // T-3 fails as "no commit references it": a body mention doesn't count.
    const t3Finding = findings.find((f) => f.ids.includes('T-3'));
    assert.ok(t3Finding, 'T-3 must be reported — its only mention is in a commit body');
    assert.match(t3Finding.message, /no commit in git history references it/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a task not marked done is never checked, even with zero matching commits', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): first');
    const facts = await readRepoFacts(dir, ['T-1', 'T-2']);
    const lines = [
      '## Task ledger',
      '',
      '| Task | Status |',
      '| --- | --- |',
      '| T-1 | done |',
      '| T-2 | pending |',
    ];
    const ledger = parseLedger(lines.join('\n'), 'x.md');
    assert.equal(ledger.ok, true);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
