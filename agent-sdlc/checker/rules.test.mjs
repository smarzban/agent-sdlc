// Tests for the check-suite rules (T-4): trace integrity + bidirectional coverage.
// Fixtures are minimal inline spec strings run through the real parseSpec() model (per plan
// Notes) — not hand-built model objects — so rules are proven against the actual model shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  parseSpec,
  checkTraceIntegrity,
  checkForwardCoverage,
  checkBackwardCoverage,
} from './sdlc-check.mjs';

function model(spec) {
  const result = parseSpec(spec.join('\n'), 'x.md');
  assert.equal(result.ok, true, 'fixture spec must itself parse cleanly');
  return result;
}

// --- AC-1: trace integrity ---

test('a dangling trace reference yields a finding naming the missing ID', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first criterion.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1, AC-99. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkTraceIntegrity(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'trace-integrity');
  assert.deepEqual(findings[0].ids, ['AC-99']);
});

test('trace integrity returns ALL dangling refs, not just the first', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first criterion.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1, AC-97, AC-98. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkTraceIntegrity(m);
  const ids = findings.flatMap((f) => f.ids).sort();
  assert.deepEqual(ids, ['AC-97', 'AC-98']);
});

test('a dangling ref inside a coverage-map row is also flagged (rule is generic over trace kinds)', () => {
  const m = model([
    '## Plan',
    '### Task-to-criterion coverage map',
    '| Criterion | Advanced by |',
    '| --- | --- |',
    '| AC-1 | T-1, T-99 |',
    '',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkTraceIntegrity(m);
  assert.deepEqual(findings.map((f) => f.ids[0]), ['AC-1', 'T-99']);
});

test('a fully-resolved trace set yields no trace-integrity findings', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first criterion.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  assert.deepEqual(checkTraceIntegrity(m), []);
});

// --- AC-2: forward coverage ---

test('an AC reached by no task yields a finding naming it', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first, reached.',
    '- **AC-2** — second, unreached.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkForwardCoverage(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'coverage-forward');
  assert.deepEqual(findings[0].ids, ['AC-2']);
});

test('a coverage-map row (Advanced by tasks) counts as reaching an AC, same as an Advances field', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-10** — reached only via the map.',
    '',
    '## Plan',
    '### Task-to-criterion coverage map',
    '| Criterion | Advanced by |',
    '| --- | --- |',
    '| AC-10 | T-1 |',
    '',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  assert.deepEqual(checkForwardCoverage(m), []);
});

test('a Criterion-to-component map row does NOT count as task coverage (component refs, not task refs)', () => {
  const m = model([
    '## Design',
    '### Components',
    '1. **Widget** — does widget things.',
    '',
    '## Acceptance Criteria',
    '### Criterion-to-component map',
    '| Criterion | Component |',
    '| --- | --- |',
    '| AC-5 | Widget |',
    '- **AC-5** — realized only by a component map row.',
  ]);
  const findings = checkForwardCoverage(m);
  assert.ok(findings.some((f) => f.ids.includes('AC-5')));
});

test('every AC reached: no forward-coverage findings', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  assert.deepEqual(checkForwardCoverage(m), []);
});

// --- AC-3: backward coverage ---

test('a task with an explicit untraced marker yields a coverage note, not a finding', () => {
  const m = model([
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC: untraced (entered at build, no criteria in source).',
    '  *Component:* none. *Deps:* none.',
  ]);
  const items = checkBackwardCoverage(m);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'note');
  assert.equal(items[0].rule, 'coverage-backward');
  assert.deepEqual(items[0].ids, ['T-1']);
  assert.match(items[0].message, /entered at build, no criteria in source/);
});

test('a task with neither an AC reference nor an untraced marker yields a finding naming it', () => {
  const m = model([
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  const items = checkBackwardCoverage(m);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'finding');
  assert.equal(items[0].rule, 'coverage-backward');
  assert.deepEqual(items[0].ids, ['T-1']);
});

test('citing only a DANGLING AC does not satisfy backward coverage (still a finding, not silently OK)', () => {
  const m = model([
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-99. *Component:* none. *Deps:* none.',
  ]);
  const items = checkBackwardCoverage(m);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'finding');
  assert.deepEqual(items[0].ids, ['T-1']);
});

test('a task with a real AC reference: no backward-coverage finding or note', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  assert.deepEqual(checkBackwardCoverage(m), []);
});

// --- Shared-relation regression: a task linked ONLY via the coverage map (no *Advances:* field
// of its own) must pass backward coverage too — the real false-positive this refactor fixes. ---

test('a task reached ONLY via a Task-to-criterion coverage-map row passes backward coverage (no finding, no note)', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-10** — reached only via the map.',
    '',
    '## Plan',
    '### Task-to-criterion coverage map',
    '| Criterion | Advanced by |',
    '| --- | --- |',
    '| AC-10 | T-1 |',
    '',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  assert.deepEqual(checkBackwardCoverage(m), []);
  assert.deepEqual(checkForwardCoverage(m), []);
});

test('a map-only-linked task still needs the AC side to be a real, defined AC (dangling AC in the map does not discharge it)', () => {
  const m = model([
    '## Plan',
    '### Task-to-criterion coverage map',
    '| Criterion | Advanced by |',
    '| --- | --- |',
    '| AC-99 | T-1 |',
    '',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  const items = checkBackwardCoverage(m);
  assert.equal(items.length, 1);
  assert.equal(items[0].type, 'finding');
  assert.deepEqual(items[0].ids, ['T-1']);
});

// --- Fully clean model: all three rules quiet ---

test('a fully clean model yields no findings from any of the three rules (only a marker-driven note, if any)', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  assert.deepEqual(checkTraceIntegrity(m), []);
  assert.deepEqual(checkForwardCoverage(m), []);
  assert.deepEqual(checkBackwardCoverage(m), []);
});

// --- Empirical regression: run all three rules against the REAL enforcement-spine spec ---
// (source-driven.md) — this is the exact spec whose T-8/T-9/T-12 (linked only via the coverage
// map, no *Advances:* field) exposed the Critical asymmetry. Reading the file with node:fs is
// TEST I/O, not rule I/O — the three rules under test stay pure (spec text/model in, array out).

test('the real enforcement-spine spec yields zero findings from all three rules (this feature would not block its own build)', () => {
  const specPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'specs',
    'enforcement-spine',
    'enforcement-spine.md',
  );
  const text = readFileSync(specPath, 'utf8');
  const result = parseSpec(text, specPath);
  assert.equal(result.ok, true, 'the real spec must parse cleanly');

  const findings = [
    ...checkTraceIntegrity(result),
    ...checkForwardCoverage(result),
    ...checkBackwardCoverage(result),
  ].filter((item) => item.type === 'finding');
  assert.deepEqual(findings, [], 'the real spec has no known dangling refs or coverage gaps');
});
