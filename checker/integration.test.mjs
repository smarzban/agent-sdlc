// Integration tests for the wired CLI (T-9): auto-scoping, --require, and the end-to-end
// properties (AC-7, AC-11, AC-12, NC-1, NC-2). Spawns the real CLI as a subprocess (spawnSync,
// same pattern as cli.test.mjs) so exit codes and output are the real observed contract, not an
// in-process approximation. Fixtures are built at runtime (mkdtemp + inline artifact strings +
// `git init`, per plan Notes) — no committed fixture files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const CLI = fileURLToPath(new URL('./sdlc-check.mjs', import.meta.url));
const SOURCE = fileURLToPath(new URL('./sdlc-check.mjs', import.meta.url));

// --- fixture builders -----------------------------------------------------------------------

function makeRepoDir() {
  return mkdtempSync(path.join(tmpdir(), 'sdlc-check-int-'));
}

function gitInit(dir) {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: dir });
}

// Commits and returns the new commit's full SHA — option-(b) verifies the ledger's RECORDED SHA
// against the repo, so a fixture ledger must record the ACTUAL commit hash (see happyLedger).
function gitCommit(dir, filename, message) {
  writeFileSync(path.join(dir, filename), `${message}\n`);
  execFileSync('git', ['add', filename], { cwd: dir });
  execFileSync('git', ['commit', '-q', '-m', message], { cwd: dir });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
}

function treeHash(dir) {
  execFileSync('git', ['add', '-A'], { cwd: dir });
  return execFileSync('git', ['write-tree'], { cwd: dir }).toString().trim();
}

// Writes the spec (+ optional ledger/report) under <dir>/docs/specs/enforcement-spine/ — the real
// artifact layout (siblings of the spec file) — and returns the spec's absolute path.
function writeSpecTree(dir, { spec, ledger, report }) {
  const specDir = path.join(dir, 'docs', 'specs', 'enforcement-spine');
  mkdirSync(specDir, { recursive: true });
  const specPath = path.join(specDir, 'enforcement-spine.md');
  writeFileSync(specPath, spec);
  if (ledger !== undefined) writeFileSync(path.join(specDir, 'build-report.md'), ledger);
  if (report !== undefined) writeFileSync(path.join(specDir, 'verification-report.md'), report);
  return specPath;
}

function runCli(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', ...opts });
}

// --- fixture content -------------------------------------------------------------------------

const HAPPY_SPEC = [
  '## Acceptance Criteria',
  '',
  '- **AC-1** — first criterion.',
  '',
  '## Design',
  '',
  '### Components',
  '',
  '1. **Widget** — does the thing.',
  '',
  '## Plan',
  '',
  '- **T-1 — Build the widget.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
].join('\n');

// Option-(b): the ledger records the ACTUAL commit SHA of the done task's `feat(T-1):` commit, so
// the ledger-vs-git rule (which looks up that recorded SHA and checks its subject scope) passes.
// `sha` defaults to a placeholder for the not-a-repo fail-closed test, where the SHA is irrelevant
// (the reader fails systemically before any lookup).
function happyLedger(sha = 'abc1234') {
  return [
    '## Task ledger',
    '',
    '| Task | Status | Commit | AC advanced | Notes |',
    '| --- | --- | --- | --- | --- |',
    `| T-1 | done | \`${sha}\` | AC-1 | |`,
    '',
    `### T-1 (@ \`${sha}\`)`,
    '',
    '```',
    '$ node --test agent-sdlc/checker/*.test.mjs',
    'ok 1 - widget builds correctly',
    '```',
  ].join('\n');
}

const HAPPY_REPORT = [
  '## Verification',
  '',
  '| Criterion | Type | Proof |',
  '| --- | --- | --- |',
  '| AC-1 | test-backed | widget builds correctly |',
].join('\n');

// A mid-chain-entry variant: a materialized `## Plan` (well-formed provenance marker) plus a
// second task carrying an explicit `untraced` marker instead of a real AC reference.
const VARIANT_SPEC = [
  '## Acceptance Criteria',
  '',
  '- **AC-1** — first criterion.',
  '',
  '## Design',
  '',
  '### Components',
  '',
  '1. **Widget** — does the thing.',
  '',
  '## Plan',
  '',
  '<!-- source: linear SMA-42 · ingested 2026-07-01 -->',
  '',
  '- **T-1 — Build the widget.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
  '- **T-2 — Infra glue.** Detail. *Advances:* AC: untraced (infra-only, no criterion applies). *Component:* Widget. *Deps:* none.',
].join('\n');

// --- AC-7: happy path (auto-scoped rules all run, fully clean) --------------------------------

test('AC-7 happy path: a fully valid fixture (spec + ledger + report + matching git history) exits 0', () => {
  const dir = makeRepoDir();
  try {
    gitInit(dir);
    const sha = gitCommit(dir, 'a', 'feat(T-1): implement widget');
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC, ledger: happyLedger(sha), report: HAPPY_REPORT });
    const result = runCli([specPath], { cwd: dir });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /all checks passed/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ledger-vs-git resolves against the spec\'s repo when the CLI is invoked from an unrelated cwd', async (t) => {
  const dir = makeRepoDir();
  try {
    gitInit(dir);
    const sha = gitCommit(dir, 'a', 'feat(T-1): implement widget');
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC, ledger: happyLedger(sha), report: HAPPY_REPORT });
    // Run the CLI from a directory that is NOT inside the fixture repo
    const elsewhere = mkdtempSync(path.join(tmpdir(), 'sdlc-elsewhere-'));
    try {
      const res = runCli([specPath], { cwd: elsewhere });
      assert.equal(res.status, 0, `expected exit 0, got ${res.status}\n${res.stdout}\n${res.stderr}`);
      assert.doesNotMatch(res.stdout + res.stderr, /unavailable|not a git repo/i);
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- SMA-480: the real CLI stamps its own (adjacent-manifest) version into the report ---------

test('SMA-480: the real CLI stamps the adjacent manifest semver version onto the clean-pass line', () => {
  const dir = makeRepoDir();
  try {
    gitInit(dir);
    const sha = gitCommit(dir, 'a', 'feat(T-1): implement widget');
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC, ledger: happyLedger(sha), report: HAPPY_REPORT });
    const result = runCli([specPath], { cwd: dir });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /sdlc-check \d+\.\d+\.\d+: all checks passed/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- AC-7: mid-chain-entry variant — untraced links render as NOTES, not findings -------------

test('AC-7 mid-chain-entry variant: well-formed provenance + untraced marker exits 0 with a coverage NOTE', () => {
  const dir = makeRepoDir();
  try {
    gitInit(dir);
    const sha = gitCommit(dir, 'a', 'feat(T-1): implement widget');
    const specPath = writeSpecTree(dir, { spec: VARIANT_SPEC, ledger: happyLedger(sha), report: HAPPY_REPORT });
    const result = runCli([specPath], { cwd: dir });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Notes \(1\):/);
    assert.match(result.stdout, /T-2/);
    assert.match(result.stdout, /explicitly untraced/);
    // T-2 must appear only in the Notes section, never inside the Findings section's own body.
    const findingsBody = result.stdout.slice(result.stdout.indexOf('Findings'), result.stdout.indexOf('Notes'));
    assert.doesNotMatch(findingsBody, /T-2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- --require: an invoking stage can force an artifact's absence to fail ---------------------

test('--require verification-report with the file absent exits nonzero, naming the missing artifact', () => {
  const dir = makeRepoDir();
  try {
    gitInit(dir);
    const sha = gitCommit(dir, 'a', 'feat(T-1): implement widget');
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC, ledger: happyLedger(sha) });
    const result = runCli([specPath, '--require', 'verification-report'], { cwd: dir });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /verification-report/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--require ledger with the file absent exits nonzero, naming the missing artifact', () => {
  const dir = makeRepoDir();
  try {
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC });
    const result = runCli([specPath, '--require', 'ledger'], { cwd: dir });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /ledger/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an unrecognized --require token is a usage error: exits nonzero, never silently ignored', () => {
  const dir = makeRepoDir();
  try {
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC });
    const result = runCli([specPath, '--require', 'bogus-artifact'], { cwd: dir });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /bogus-artifact/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- auto-scoping: absent, non-required artifacts are skipped, not a failure ------------------

test('auto-scoping: the same spec with no ledger and no report present still exits 0, no spurious findings', () => {
  const dir = makeRepoDir();
  try {
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC });
    const result = runCli([specPath], { cwd: dir });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /all checks passed/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- AC-11 / NC-2: no writes, ever — the fixture tree hash is byte-identical before/after -----

test('AC-11/NC-2: a full run leaves the fixture tree byte-identical (no file created/modified/deleted)', () => {
  const dir = makeRepoDir();
  try {
    gitInit(dir);
    const sha = gitCommit(dir, 'a', 'feat(T-1): implement widget');
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC, ledger: happyLedger(sha), report: HAPPY_REPORT });
    const before = treeHash(dir);
    const result = runCli([specPath], { cwd: dir });
    assert.equal(result.status, 0, result.stderr);
    const after = treeHash(dir);
    assert.equal(after, before, 'the checker must never write to the repo it checks');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- AC-12 / NC-1: bare node, stdlib-only, no network -------------------------------------------

test('AC-12/NC-1(a): every import in sdlc-check.mjs is node:-prefixed stdlib only', () => {
  const source = readFileSync(SOURCE, 'utf8');
  const importRe = /^import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm;
  const specifiers = [...source.matchAll(importRe)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, 'the source must contain at least one import to scan');
  for (const spec of specifiers) {
    assert.match(spec, /^node:/, `import specifier "${spec}" is not node:-prefixed stdlib`);
  }
});

test('AC-12/NC-1(b): the CLI completes under a minimal env (PATH only — enough to find node+git)', () => {
  const dir = makeRepoDir();
  try {
    gitInit(dir);
    const sha = gitCommit(dir, 'a', 'feat(T-1): implement widget');
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC, ledger: happyLedger(sha), report: HAPPY_REPORT });
    // Minimal env: PATH only (enough for the OS to resolve `git`; no other var, no proxy/network
    // config, nothing that could route a request anywhere). Combined with (a) above — no
    // non-stdlib import exists to reach out over a network in the first place — this evidences
    // NC-1: there is no code path capable of network access, and the run completes without one.
    const result = spawnSync(process.execPath, [CLI, specPath], {
      cwd: dir,
      encoding: 'utf8',
      env: { PATH: process.env.PATH },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /all checks passed/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- fail-closed: missing/unparseable spec, and a ledger with no backing git repo --------------

test('fail-closed: an unparseable spec (no "##" sections) exits nonzero, never a pass (AC-10 end-to-end)', () => {
  const dir = makeRepoDir();
  try {
    const specPath = path.join(dir, 'garbage.md');
    writeFileSync(specPath, 'just some prose, no sections at all\n');
    const result = runCli([specPath], { cwd: dir });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unparseable/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fail-closed: a ledger present but the run directory is not a git repo exits nonzero (facts-failure, not a silent pass)', () => {
  const dir = makeRepoDir();
  try {
    // Deliberately no gitInit(dir): the ledger names a done task, so the ledger-vs-git rule would
    // run, but the run directory is not a git repo — the per-SHA reader fails systemically
    // (unavailable), which the CLI surfaces fail-closed, never a silent pass.
    const specPath = writeSpecTree(dir, { spec: HAPPY_SPEC, ledger: happyLedger(), report: HAPPY_REPORT });
    const result = runCli([specPath], { cwd: dir });
    assert.notEqual(result.status, 0, 'a systemic reader failure must never silently pass');
    assert.match(result.stdout, /commit subjects unavailable/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
