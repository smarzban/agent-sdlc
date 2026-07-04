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

// M-968: the initial branch is pinned to "main" explicitly (`-b main`) rather than left to
// whatever `init.defaultBranch` happens to be configured on the machine running the tests — the
// M-968 scoping logic's fallback candidates include a literal "main", so the fixture's branch name
// must be deterministic for the tests below (in particular the merge-base tests, which checkout a
// second "feature" branch off this one) to be reproducible in any environment.
function makeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), 'sdlc-check-git-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: dir });
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

// SMA-421 nit 2: `git log -z --format=%H%x00%s` ends with a trailing NUL, so split('\0') yields
// 2N tokens plus one trailing '' (odd total). A commit with an EMPTY subject is a legitimate ''
// token in subject position. The old `.filter((f) => f !== '')` dropped it, shifting every later
// (hash, subject) pair by one — so a middle empty-subject commit mis-paired the outer commits'
// hashes with the wrong subjects. This pins positional pairing: each hash keeps ITS OWN subject.
test('readRepoFacts positionally pairs (hash, subject): a middle empty-subject commit does not shift later pairs', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): first');
    // The middle commit has an EMPTY subject (empty %s field in the -z stream).
    execFileSync('git', ['commit', '-q', '--allow-empty', '--allow-empty-message', '-m', ''], {
      cwd: dir,
    });
    commit(dir, 'b', 'feat(T-2): second');

    const h1 = execFileSync('git', ['rev-parse', 'HEAD~2'], { cwd: dir, encoding: 'utf8' }).trim();
    const hMid = execFileSync('git', ['rev-parse', 'HEAD~1'], { cwd: dir, encoding: 'utf8' }).trim();
    const h2 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();

    const facts = await readRepoFacts(dir); // no taskIds filter — get every commit
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 3);

    // Build id -> message and assert each hash is paired with ITS OWN subject (no shift).
    const byId = new Map(facts.commits.map((c) => [c.id, c.message]));
    assert.equal(byId.get(h1), 'feat(T-1): first');
    assert.equal(byId.get(hMid), ''); // empty subject survives as ''
    assert.equal(byId.get(h2), 'feat(T-2): second');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// SMA-421 nit 2, boundary case: the OLDEST (last-listed) commit has the empty subject. `git log`
// emits newest-first, so this commit is LAST in the -z stream — its empty %s field lands immediately
// before the single trailing NUL terminator, so the stream ends `<hash>\0\0`. This is the exact
// `fields.pop()` boundary: the fix must drop ONLY the one trailing terminator empty and keep the
// oldest commit's own empty subject as its ''. A stray extra `.pop()` (or the old blanket filter)
// would either swallow the oldest's subject or mis-pair the terminator — this pins that it doesn't.
test('readRepoFacts positionally pairs (hash, subject): the OLDEST commit having an empty subject exercises the trailing-terminator boundary', async () => {
  const dir = makeRepo();
  try {
    // The FIRST (oldest) commit has an EMPTY subject — its %s lands last in the newest-first stream.
    execFileSync('git', ['commit', '-q', '--allow-empty', '--allow-empty-message', '-m', ''], {
      cwd: dir,
    });
    commit(dir, 'a', 'feat(T-1): first');
    commit(dir, 'b', 'feat(T-2): second');

    const hOldest = execFileSync('git', ['rev-parse', 'HEAD~2'], { cwd: dir, encoding: 'utf8' }).trim();
    const h1 = execFileSync('git', ['rev-parse', 'HEAD~1'], { cwd: dir, encoding: 'utf8' }).trim();
    const h2 = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();

    const facts = await readRepoFacts(dir); // no taskIds filter — get every commit
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 3); // trailing terminator dropped, oldest's empty subject kept

    const byId = new Map(facts.commits.map((c) => [c.id, c.message]));
    assert.equal(byId.get(hOldest), ''); // oldest's own empty subject survives as ''
    assert.equal(byId.get(h1), 'feat(T-1): first');
    assert.equal(byId.get(h2), 'feat(T-2): second');
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
// wrongly be considered backed by a commit that never names it in its subject. (The body is outside
// the subject entirely, so this guard holds independent of the T-6 corrective below — a body
// mention is never even reached, subject-wide or scope-position.)
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
    // T-4 passes: its one commit's scope-position token set is exactly {T-4}, not polluted by the
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

// --- T-6 corrective: scope-position matching (not whole-subject) --------------------------------
//
// The real-repo false positive this guards: a `docs(enforcement-spine): ...(T-1 checkpoint)...`
// commit mentions T-1 in PROSE after the colon, in an AREA scope, not a task scope. Whole-subject
// matching (`\bT-\d+\b` over the full `%s`) wrongly counted this as "referencing T-1", so a task
// with exactly one real `feat(T-1):` commit was flagged as having multiple. Scope-position matching
// fixes this: only the text inside the `type(scope):` parens is searched for task tokens.
test('a docs(area) commit whose SUBJECT PROSE mentions a task ID does not count as referencing it', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): first');
    commit(
      dir,
      'b',
      'docs(enforcement-spine): amend green-bar test command (T-1 checkpoint) + gate re-run clean',
    );
    const facts = await readRepoFacts(dir, ['T-1']);
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 1); // the docs commit's scope has no T-N token, so it's filtered out
    const ledger = ledgerWithDoneTasks(['T-1']);
    const findings = checkLedgerVsGit(ledger, facts);
    // T-1 passes: exactly one commit (the feat(T-1) one) references it; the docs commit's prose
    // mention in an area scope is not a reference. This is the exact real-repo false positive.
    assert.deepEqual(findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Revert-probe: pins that the fix is the SCOPE narrowing, not something else. Reproduces the test
// above's assertion logic directly against the OLD whole-subject regex to prove it would have
// failed (the false positive existed) before proving the NEW regex passes.
test('revert-probe: the docs-prose case fails whole-subject matching, passes scope-position matching', () => {
  const OLD_TASK_TOKEN_RE = /\bT-\d+\b/g;
  function oldDistinctTaskTokens(message) {
    const tokens = new Set();
    OLD_TASK_TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = OLD_TASK_TOKEN_RE.exec(message))) tokens.add(m[0]);
    return tokens;
  }
  const docsSubject =
    'docs(enforcement-spine): amend green-bar test command (T-1 checkpoint) + gate re-run clean';

  // OLD (whole-subject) behavior: the docs commit's message wrongly contains T-1 -> false positive.
  assert.equal(oldDistinctTaskTokens(docsSubject).has('T-1'), true, 'old regex DID false-positive');

  // NEW (scope-position) behavior: the same subject's scope is `enforcement-spine`, no T-N token.
  const COMMIT_HEADER_RE = /^\s*\w+(?:\(([^)]*)\))?!?:/;
  const header = COMMIT_HEADER_RE.exec(docsSubject);
  const scope = header ? header[1] : undefined;
  assert.equal(scope, 'enforcement-spine');
  assert.equal(/\bT-\d+\b/.test(scope), false, 'scope string carries no task token');
});

test('a multi-task SCOPE still references BOTH tasks (feat(T-3, T-4): …)', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-3, T-4): shared work with prose about T-9 too');
    const facts = await readRepoFacts(dir, ['T-3', 'T-4', 'T-9']);
    const ledger = ledgerWithDoneTasks(['T-3', 'T-4']);
    const findings = checkLedgerVsGit(ledger, facts);
    const ids = findings.flatMap((f) => f.ids).sort();
    // T-3 and T-4 both fail: their one matching commit's scope-token-set is {T-3, T-4}, not exactly
    // itself. T-9 (prose only, not in scope) is correctly never even considered — it's not done and
    // its mention is outside the scope position.
    assert.deepEqual(ids, ['T-3', 'T-4']);
    for (const f of findings) assert.equal(f.rule, 'ledger-vs-git');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unscoped or area-scoped commit references no task (chore: bump / fix(area): …)', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'chore: bump T-1 mentioned in prose only');
    commit(dir, 'b', 'fix(enforcement-spine): tweak T-1 wording, no scope token');
    commit(dir, 'c', 'feat(T-1): the real implementing commit');
    const facts = await readRepoFacts(dir, ['T-1']);
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 1); // only the feat(T-1) commit's scope carries the token
    const ledger = ledgerWithDoneTasks(['T-1']);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.deepEqual(findings, []);
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

// --- M-968: scope the walk to this feature's commits (`<mergeBase>..HEAD`), not HEAD's entire
// ancestor history -----------------------------------------------------------------------------
//
// The confirmed real-repo bug: task IDs T-1..T-N restart per feature and `build` mandates
// `feat(T-N): …` as the commit scope. An unbounded `git log` walk over HEAD's whole history means
// a SECOND feature's `feat(T-1): …` commit (already on the default branch, an ancestor of the
// current feature branch) collides with the current feature's OWN `feat(T-1): …` commit — two
// commits reference T-1 → a false "2 commits reference it (expected exactly one)" AC-4 finding,
// even though the current feature did everything right.

test('readRepoFacts scopes to the feature branch: a same-task commit already on the default branch is excluded (cross-feature collision, the exact M-968 bug)', async () => {
  const dir = makeRepo();
  try {
    // A prior feature landed on "main" with its own T-1 (task IDs restart per feature).
    commit(dir, 'a', 'feat(T-1): prior feature, already on main');
    // The current feature branches off main and does its OWN T-1.
    execFileSync('git', ['checkout', '-q', '-b', 'feature'], { cwd: dir });
    commit(dir, 'b', 'feat(T-1): current feature, own commit');

    const facts = await readRepoFacts(dir, ['T-1']);
    assert.equal(facts.ok, true);
    // Scoped to `<mergeBase>..HEAD`: only the feature branch's own commit, not main's.
    assert.equal(facts.commits.length, 1);
    assert.equal(facts.commits[0].message, 'feat(T-1): current feature, own commit');

    const ledger = ledgerWithDoneTasks(['T-1']);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.deepEqual(findings, []); // no false ambiguous-commits finding
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('revert-probe: the same cross-feature fixture returns 2 matches under the OLD unscoped walk, 1 under the NEW scoped walk', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): prior feature, already on main');
    execFileSync('git', ['checkout', '-q', '-b', 'feature'], { cwd: dir });
    commit(dir, 'b', 'feat(T-1): current feature, own commit');

    // OLD behavior: `git log` with NO rev-range walks HEAD's entire ancestor history. main's
    // commit is an ancestor of the feature branch, so the old unscoped walk wrongly returns BOTH.
    const stdout = execFileSync('git', ['-C', dir, 'log', '-z', '--format=%H%x00%s'], {
      encoding: 'utf8',
    });
    const fields = stdout.split('\0').filter((f) => f !== '');
    const oldCommits = [];
    for (let i = 0; i + 1 < fields.length; i += 2) {
      oldCommits.push({ id: fields[i], message: fields[i + 1] });
    }
    const oldMatches = oldCommits.filter((c) => /\bT-1\b/.test(c.message));
    assert.equal(oldMatches.length, 2, 'old unscoped walk DID collide across features');

    // NEW behavior: readRepoFacts (scoped via merge-base) excludes main's commit.
    const facts = await readRepoFacts(dir, ['T-1']);
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 1, 'new scoped walk excludes the other feature commit');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fallback: with no separate default branch to scope against, readRepoFacts falls back to the full-history walk (fail-safe, never an empty/crashed read)', async () => {
  // A single-branch repo ("main" only, no origin): the only candidate default-branch name IS the
  // checked-out branch itself, so `merge-base HEAD main` trivially equals HEAD — M-968 treats that
  // as "undeterminable" and falls back to the unscoped walk rather than returning an empty range.
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): only commit on the only branch');
    commit(dir, 'b', 'feat(T-2): second commit, still no other branch to diff against');
    const facts = await readRepoFacts(dir, ['T-1', 'T-2']);
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 2, 'fallback returns full history, not an empty range');
    const ledger = ledgerWithDoneTasks(['T-1', 'T-2']);
    const findings = checkLedgerVsGit(ledger, facts);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fallback: an unrelated-history repo (orphan branch, no common ancestor) falls back to full history rather than crashing', async () => {
  const dir = makeRepo();
  try {
    commit(dir, 'a', 'feat(T-1): on main');
    // An orphan branch shares no history with main — `merge-base HEAD main` fails (no common
    // ancestor) — this must fall back to full history on the orphan branch's OWN commits, not
    // throw and not silently return an empty read.
    execFileSync('git', ['checkout', '-q', '--orphan', 'orphan'], { cwd: dir });
    execFileSync('git', ['rm', '-rf', '--quiet', '.'], { cwd: dir });
    commit(dir, 'c', 'feat(T-9): orphan branch commit');
    const facts = await readRepoFacts(dir, ['T-9']);
    assert.equal(facts.ok, true);
    assert.equal(facts.commits.length, 1);
    assert.equal(facts.commits[0].message, 'feat(T-9): orphan branch commit');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
