// EXPERIMENT: run-observability
//
// Keeps AC-14's removal claim honest: "every file this chain touches carries the marker, and
// nothing else does" is a promise that is true on the day it is written and false three commits
// later unless something enforces it. This test is that something.
//
// Scope: every file tracked by git, or untracked but not gitignored, under the repo root (the
// same universe `git add` would ever put in a commit), found via `git ls-files --cached --others
// --exclude-standard` so a newly-added file is caught before it is even committed. One deliberate
// exception: `docs/specs/run-observability/` is the experiment's permanent record (the same as any
// other shipped feature's spec chain) and stays after the code goes, so its files are excluded from
// the completeness check below rather than asserted either way. See
// docs/usage/experiment-run-observability.md for the full removal instructions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = 'EXPERIMENT: run-observability';
const GIT_TIMEOUT_MS = 5000;

// Layout-proof: resolved relative to this file, exactly like bin/sdlc-record resolves the
// recorder relative to itself, so this test does not depend on the invoking cwd.
const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');

// The one deliberate exception (see file header). Excluded from the completeness assertion, not
// asserted to lack the marker either: it is a record of the experiment, not code the marker's
// delete-instruction applies to.
const EXEMPT_PREFIX = 'docs/specs/run-observability/';

// Scratch conductor state, never a commit candidate: this repo intentionally carries untracked
// trees (task briefs, review diffs, per-task reports) that are local working state for the
// pipeline itself, not part of any shipped diff. `git diff --name-only main...HEAD` (the brief's
// own definition of "touched") can never contain them, so they are out of scope here for the same
// reason, not swept either way.
const SCRATCH_PREFIXES = ['.agent-sdlc/'];

// Root-level untracked feedback docs are the same convention: `tool-feedback-<date>.md` is a
// working note the pipeline itself writes, never a commit candidate, but its own entries can quote
// marker-ish strings verbatim (e.g. this experiment's marker, discussed as a finding). A file
// matching this prefix turning the suite red is the wrong diagnosis: exclude it the same way, and
// read this comment first if that happens instead of deleting the doc.
const SCRATCH_ROOT_FILE_PREFIXES = ['tool-feedback-'];

// Every file this chain has touched or creates that must carry the marker, outside the exemption
// above. Both directions matter: missing one of these is a file that would survive removal; an
// unlisted file turning up marked is a stray that removal would delete by mistake.
const EXPECTED_FILES = [
  'bin/sdlc-record',
  'bin/sdlc-report',
  'checker/experiment-record.mjs',
  'checker/experiment-record.test.mjs',
  'checker/experiment-report.mjs',
  'checker/experiment-report.test.mjs',
  'checker/experiment-marker.test.mjs',
  'skills/build/SKILL.md',
  'skills/gate/SKILL.md',
  'skills/ship/SKILL.md',
  'skills/getting-started/reference/experiment-feedback.md',
  'CONTEXT.md',
  'docs/README.md',
  'docs/usage/experiment-run-observability.md',
].sort();

// Every git-known path (tracked, or untracked-but-not-ignored) under the repo root, forward-slash
// relative paths. `--cached --others --exclude-standard` is the same universe `git add .` would
// ever consider, so a file that only exists on disk unrecognized by git (e.g. something actually
// gitignored) is correctly out of scope: it was never a candidate for a commit in the first place.
function allKnownFiles() {
  let stdout;
  try {
    stdout = execFileSync(
      'git',
      ['-C', REPO_ROOT, 'ls-files', '--cached', '--others', '--exclude-standard', '-z'],
      { encoding: 'utf8', timeout: GIT_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (err) {
    throw new Error(`the marker sweep needs a git checkout (git ls-files failed: ${err.message})`);
  }
  return stdout.split('\0').filter((p) => p.length > 0);
}

function filesCarryingMarker() {
  const marked = [];
  for (const rel of allKnownFiles()) {
    let content;
    try {
      content = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    } catch {
      continue; // e.g. a submodule gitlink or a symlink to nowhere: not a text file to search
    }
    if (content.includes(MARKER)) marked.push(rel);
  }
  return marked;
}

test('the marker search returns exactly the expected files, outside the spec-chain record', () => {
  const marked = filesCarryingMarker();
  const outsideExemption = marked
    .filter((rel) => !rel.startsWith(EXEMPT_PREFIX))
    .filter((rel) => !SCRATCH_PREFIXES.some((prefix) => rel.startsWith(prefix)))
    .filter((rel) => !SCRATCH_ROOT_FILE_PREFIXES.some((prefix) => rel.startsWith(prefix)))
    .sort();
  assert.deepEqual(
    outsideExemption,
    EXPECTED_FILES,
    'a search for EXPERIMENT: run-observability must return every touched file (outside the spec ' +
      'chain, which is exempt) and nothing else: a missing entry is a file that would survive ' +
      'removal, an extra one is a file removal would delete by mistake',
  );
});

test('every expected file is readable and genuinely carries the marker', () => {
  for (const rel of EXPECTED_FILES) {
    const content = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    assert.match(content, new RegExp(MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${rel} is missing the marker`);
  }
});

test('the removal document names every file the sweep expects', () => {
  const doc = readFileSync(path.join(REPO_ROOT, 'docs/usage/experiment-run-observability.md'), 'utf8');
  for (const rel of EXPECTED_FILES) assert.ok(doc.includes(rel), `removal doc does not name ${rel}`);
});

test('carries the EXPERIMENT: run-observability marker', () => {
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  assert.match(source, /EXPERIMENT: run-observability/);
});
