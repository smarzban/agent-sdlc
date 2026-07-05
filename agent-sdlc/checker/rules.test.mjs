// Tests for the check-suite rules (T-4): trace integrity + bidirectional coverage.
// Fixtures are minimal inline spec strings run through the real parseSpec() model (per plan
// Notes) — not hand-built model objects — so rules are proven against the actual model shape.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  parseSpec,
  parseLedger,
  parseVerificationReport,
  extractAcVerification,
  checkTraceIntegrity,
  checkForwardCoverage,
  checkBackwardCoverage,
  checkProvenanceMarkers,
  checkGreenBarEvidence,
  checkProofMapCompleteness,
  checkProofEvidenceLinkage,
} from './sdlc-check.mjs';

function model(spec) {
  const result = parseSpec(spec.join('\n'), 'x.md');
  assert.equal(result.ok, true, 'fixture spec must itself parse cleanly');
  return result;
}

function ledger(lines) {
  const result = parseLedger(lines.join('\n'), 'x.md');
  assert.equal(result.ok, true, 'fixture ledger must itself parse cleanly');
  return result;
}

function verificationReport(lines) {
  const result = parseVerificationReport(lines.join('\n'), 'x.md');
  assert.equal(result.ok, true, 'fixture verification report must itself parse cleanly');
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

// H1 (review-gate R1): a *Component:* field can cite a component by NAME rather than by ID (see
// resolveComponentRefs), so a name matching no defined component previously produced NO ref at all
// (no C-N token, no name match) and trace-integrity had nothing to flag — AC-1's component half
// was unenforced for name-citations. Closes review finding M-42.

test('a task citing a component by a name that matches no defined component yields a trace-integrity finding naming it', () => {
  const m = model([
    '## Design',
    '### Components',
    '1. **Gizmo** — does gizmo things.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* MissingWidget. *Deps:* none.',
  ]);
  const findings = checkTraceIntegrity(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'trace-integrity');
  assert.ok(findings[0].message.includes('MissingWidget'));
  assert.deepEqual(findings[0].ids, ['T-1']);
});

test('a task citing a component by a name that DOES match a defined component yields no finding (no false positive)', () => {
  const m = model([
    '## Design',
    '### Components',
    '1. **Widget** — does widget things.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* Widget. *Deps:* none.',
  ]);
  assert.deepEqual(checkTraceIntegrity(m), []);
});

// SMA-418 (T-1): the TABLE path must be symmetric with the *Component:* field path above. A
// Criterion-to-component MAP row citing a component by name that resolves to no defined component
// was silently dropped (extractTableTraces only pushed when refs.size > 0), so trace-integrity had
// nothing to flag — the same gap H1 closed for the field path, one table over.

test('a component-map row citing a name that matches no defined component yields a trace-integrity finding naming it', () => {
  const m = model([
    '## Design',
    '### Components',
    '1. **Gizmo** — does gizmo things.',
    '',
    '## Acceptance Criteria',
    '### Criterion-to-component map',
    '| Criterion | Component |',
    '| --- | --- |',
    '| AC-5 | MissingWidget |',
    '- **AC-5** — realized only by a component map row.',
  ]);
  const findings = checkTraceIntegrity(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'trace-integrity');
  assert.ok(findings[0].message.includes('MissingWidget'));
  assert.deepEqual(findings[0].ids, ['AC-5']);
});

test('a component-map row citing a name that DOES match a defined component yields no trace-integrity finding', () => {
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
    '- **AC-5** — realized by a real component.',
  ]);
  assert.deepEqual(checkTraceIntegrity(m), []);
});

test('a component-map row citing a structured external component (declared "outside the checker") or `none` yields no trace-integrity finding (SMA-419, AC-3)', () => {
  const m = model([
    '## Design',
    '### Components',
    '1. **Gizmo** — does gizmo things.',
    '',
    '### Outside the checker (changed components)',
    '1. **gate skill text** — the gate SKILL.md prose.',
    '',
    '## Acceptance Criteria',
    '### Criterion-to-component map',
    '| Criterion | Component |',
    '| --- | --- |',
    '| AC-5 | gate skill text |',
    '| AC-6 | none |',
    '- **AC-5** — realized by a pipeline-stage skill.',
    '- **AC-6** — realized by nothing concrete.',
  ]);
  assert.deepEqual(checkTraceIntegrity(m), []);
});

test('with the allowlist gone, a *Component:* field citing "gate skill text" and NO structured declaration is a dangling trace-integrity finding; `none` stays non-dangling (SMA-419, AC-3)', () => {
  const m = model([
    '## Design',
    '### Components',
    '1. **Gizmo** — does gizmo things.',
    '',
    '## Plan',
    '- **T-1 — Touch the gate.** Detail. *Advances:* AC-1. *Component:* gate skill text. *Deps:* none.',
    '- **T-2 — Nothing concrete.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  const t1 = m.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.equal(t1.unresolvedComponent, 'gate skill text', 'no declaration => the skill-text citation is unresolved');
  const t2 = m.traces.find((t) => t.from === 'T-2' && t.kind === 'component');
  assert.equal(t2.unresolvedComponent, null, '`none` stays the field null marker, never dangling');
  const findings = checkTraceIntegrity(m);
  const dangling = findings.filter((f) => f.message.includes('gate skill text'));
  assert.equal(dangling.length, 1, 'exactly the skill-text citation is flagged dangling');
  assert.deepEqual(dangling[0].ids, ['T-1']);
  assert.equal(findings.some((f) => f.message.includes('none')), false, '`none` never produces a finding');
});

test('a coverage ("Advanced by") map row citing a dangling task is NOT reported as a dangling component (task-ID values, not components)', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first criterion.',
    '',
    '## Plan',
    '### Task-to-criterion coverage map',
    '| Criterion | Advanced by |',
    '| --- | --- |',
    '| AC-1 | T-99 |',
    '',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkTraceIntegrity(m);
  // Exactly the dangling TASK ref T-99 (via the refs loop), and NOT a bogus "dangling component"
  // finding — a coverage table's second-column values are task IDs, never components.
  assert.deepEqual(findings.map((f) => f.ids[0]), ['T-99']);
  assert.ok(findings.every((f) => !/component/.test(f.message) || f.message.includes('T-99')));
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

// --- SMA-465a: per-AC verification type parse + sharpened reviewer-checked coverage hint ---

test('extractAcVerification classifies each AC by the verification-type text in its own block', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — reviewer-checked, axis Spec Conformance.',
    '- **AC-2** — test-backed, unit.',
    '- **AC-3** — plain criterion, no verification type stated.',
  ]);
  const types = extractAcVerification(m.sections);
  assert.equal(types.get('AC-1'), 'reviewer-checked');
  assert.equal(types.get('AC-2'), 'test-backed');
  assert.equal(types.get('AC-3'), null);
});

test('extractAcVerification uses the authoritative declaration, not a topic-word mention in prose', () => {
  const m = model([
    '## Acceptance Criteria',
    // test-backed AC whose STATEMENT discusses "reviewer-checked" as a topic word — the loose scan
    // would misclassify it; the authoritative declaration must win.
    '- **AC-1** — the parser classifies each AC across reviewer-checked / test-backed fixtures.',
    '  *(Verification type: **test-backed** — unit. Oracle: returns the expected type per AC.)*',
    // reviewer-checked AC whose prose mentions "test-backed" as a topic word — again the declaration wins.
    '- **AC-2** — both grammar sections pin the rule for test-backed and reviewer-checked ACs alike.',
    '  *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: do both sections pin it?)*',
  ]);
  const types = extractAcVerification(m.sections);
  assert.equal(types.get('AC-1'), 'test-backed');
  assert.equal(types.get('AC-2'), 'reviewer-checked');
});

test('extractAcVerification never throws on a ragged / empty Acceptance Criteria block', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — a bullet with no verification type text at all.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  assert.doesNotThrow(() => extractAcVerification(m.sections));
  // an empty section body must also return cleanly (typed Map), never throw
  const empty = model(['## Acceptance Criteria', '', '## Plan', '- **T-1 — x.** *Advances:* AC: untraced.']);
  let result;
  assert.doesNotThrow(() => {
    result = extractAcVerification(empty.sections);
  });
  assert.ok(result instanceof Map);
});

test('a reviewer-checked unreached AC gets the carrying-task hint in its coverage-forward finding', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — reviewer-checked, unreached by any task.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkForwardCoverage(m);
  assert.equal(findings.length, 1);
  // shape unchanged
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'coverage-forward');
  assert.deepEqual(findings[0].ids, ['AC-1']);
  // sharpened: names the reviewer-checked shape and points at the *Advances:* fix
  assert.ok(findings[0].message.includes('reviewer-checked'));
  assert.ok(findings[0].message.includes('*Advances:*'));
  // and carries the substantive guidance, not just the topic word: the carrying-task instruction
  // plus the reviewer-checked-specific "which task carries it" phrasing.
  assert.ok(findings[0].message.includes('carrying task'));
  assert.ok(findings[0].message.includes('produces the artifact the reviewer checks'));
});

test('a test-backed unreached AC keeps the base coverage-forward message (no hint)', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — test-backed, unreached by any task.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkForwardCoverage(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'coverage-forward');
  assert.deepEqual(findings[0].ids, ['AC-1']);
  // base message only — no reviewer-checked hint
  assert.ok(!findings[0].message.includes('reviewer-checked'));
  assert.ok(findings[0].message.startsWith('AC-1 is not reached by any task'));
});

test('a type-unknown unreached AC (no verification type stated) keeps the base coverage-forward message (no hint)', () => {
  // closes the null branch: neither `reviewer-checked` nor `test-backed`, no `Verification type:`
  // declaration — extractAcVerification classifies it null, so the reviewer-checked hint must NOT append.
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — a plain criterion, no verification type stated, unreached by any task.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  assert.equal(m.acVerification.get('AC-1'), null, 'sanity check: type is unknown (null) for this AC');
  const findings = checkForwardCoverage(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'coverage-forward');
  assert.deepEqual(findings[0].ids, ['AC-1']);
  // base message only — the reviewer-checked hint must not appear for a type-unknown AC
  assert.ok(!findings[0].message.includes('reviewer-checked'));
  assert.ok(findings[0].message.startsWith('AC-1 is not reached by any task'));
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

test('the real enforcement-spine spec yields zero findings from all three rules (this feature would not block its own build)', (t) => {
  const specPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'specs',
    'enforcement-spine',
    'enforcement-spine.md',
  );
  if (!existsSync(specPath)) {
    t.skip('real enforcement-spine spec not present (not committed to this checkout, or running outside the repo)');
    return;
  }
  const text = readFileSync(specPath, 'utf8');
  // SMA-419 dropped the `/\bskill texts?\b/` allowlist that let this spec's "outside the checker"
  // skill-text citations (AC-15-18, T-10-12) resolve as non-dangling. The structured replacement is
  // a `### Outside the checker (…)` subheading; T-2 migrated THIS spec to it, so the skill-text
  // components are declared as real `C-ext-N` components and every citation resolves by name.
  const result = parseSpec(text, specPath);
  assert.equal(result.ok, true, 'the real spec must parse cleanly');

  const findings = [
    ...checkTraceIntegrity(result),
    ...checkForwardCoverage(result),
    ...checkBackwardCoverage(result),
  ].filter((item) => item.type === 'finding');
  assert.deepEqual(findings, [], 'the real spec has no known dangling refs or coverage gaps');
});

// --- AC-6: provenance marker well-formedness ---

test('a provenance marker missing its source yields a finding naming the section', () => {
  const m = model([
    '## Plan',
    '<!-- ingested 2026-07-02 -->',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkProvenanceMarkers(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'provenance-marker');
  assert.deepEqual(findings[0].ids, ['Plan']);
  assert.match(findings[0].message, /missing source/);
});

test('a provenance marker missing its date yields a finding naming the section', () => {
  const m = model([
    '## Plan',
    '<!-- source: Linear SMA-1 -->',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkProvenanceMarkers(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'provenance-marker');
  assert.deepEqual(findings[0].ids, ['Plan']);
  assert.match(findings[0].message, /missing date/);
});

test('a well-formed provenance marker yields no finding', () => {
  const m = model([
    '## Plan',
    '<!-- source: Linear SMA-1 · ingested 2026-07-02 -->',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  assert.deepEqual(checkProvenanceMarkers(m), []);
});

test('a provenance marker with source and date present but date not absolute yields a finding naming the date as non-absolute', () => {
  const m = model([
    '## Plan',
    '<!-- source: Linear SMA-1 · ingested 2026/07/02 -->',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  const findings = checkProvenanceMarkers(m);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'provenance-marker');
  assert.deepEqual(findings[0].ids, ['Plan']);
  assert.match(findings[0].message, /date is not an absolute \(YYYY-MM-DD\) date/);
});

test('a section with no provenance marker at all yields no finding (hand-authored, no marker attempt)', () => {
  const m = model([
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* none. *Deps:* none.',
  ]);
  assert.deepEqual(checkProvenanceMarkers(m), []);
});

// --- AC-5: green-bar evidence presence ---

test('a done task with no evidence entry at all yields a finding naming it', () => {
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
  ]);
  const findings = checkGreenBarEvidence(l);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'green-bar-evidence');
  assert.deepEqual(findings[0].ids, ['T-1']);
});

test('a done task with an evidence heading but no fenced block yields a finding naming it', () => {
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    'no fenced block here',
  ]);
  const findings = checkGreenBarEvidence(l);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'green-bar-evidence');
  assert.deepEqual(findings[0].ids, ['T-1']);
});

test('a done task with a non-empty evidence block yields no finding', () => {
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '$ node --check foo.mjs',
    '(exit 0)',
    '```',
  ]);
  assert.deepEqual(checkGreenBarEvidence(l), []);
});

test('a pending task with no evidence yields no finding (no claim yet)', () => {
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | pending |',
  ]);
  assert.deepEqual(checkGreenBarEvidence(l), []);
});

test('a done task with a whitespace-only fenced evidence block yields a finding naming it (fail-open guard)', () => {
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '   ',
    '```',
  ]);
  const findings = checkGreenBarEvidence(l);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'green-bar-evidence');
  assert.deepEqual(findings[0].ids, ['T-1']);
});

test('a done task with an empty fenced evidence block (blocks:[""]) yields a finding naming it', () => {
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '```',
  ]);
  const findings = checkGreenBarEvidence(l);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'green-bar-evidence');
  assert.deepEqual(findings[0].ids, ['T-1']);
});

// --- Empirical regression: the REAL spec + REAL ledger yield zero AC-5/AC-6 findings ---

test('the real enforcement-spine spec yields zero provenance-marker findings (no markers present)', (t) => {
  const specPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'specs',
    'enforcement-spine',
    'enforcement-spine.md',
  );
  if (!existsSync(specPath)) {
    t.skip('real enforcement-spine spec not present (not committed to this checkout, or running outside the repo)');
    return;
  }
  const text = readFileSync(specPath, 'utf8');
  const result = parseSpec(text, specPath);
  assert.equal(result.ok, true, 'the real spec must parse cleanly');
  assert.deepEqual(checkProvenanceMarkers(result), []);
});

test('the real enforcement-spine ledger yields zero green-bar-evidence findings (T-1..T-4 done, each with captured evidence)', (t) => {
  const ledgerPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'specs',
    'enforcement-spine',
    'build-report.md',
  );
  if (!existsSync(ledgerPath)) {
    t.skip('build-report.md is an untracked build ledger — absent in a clean checkout/isolation snapshot');
    return;
  }
  const text = readFileSync(ledgerPath, 'utf8');
  const result = parseLedger(text, ledgerPath);
  assert.equal(result.ok, true, 'the real ledger must parse cleanly');
  assert.deepEqual(checkGreenBarEvidence(result), []);
});

// --- AC-13: proof-map completeness ---

test('a defined AC with no row at all in the proof map yields a finding naming it', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first, has a row.',
    '- **AC-2** — second, missing entirely.',
  ]);
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/foo.test.mjs > covers AC-1 |',
  ]);
  const findings = checkProofMapCompleteness(m, vr);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'proof-map-completeness');
  assert.deepEqual(findings[0].ids, ['AC-2']);
});

test('a proof-map row with an EMPTY proof cell yields a finding naming the criterion', () => {
  const m = model(['## Acceptance Criteria', '- **AC-1** — has a row, but no proof.']);
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed |  |',
  ]);
  const findings = checkProofMapCompleteness(m, vr);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'proof-map-completeness');
  assert.deepEqual(findings[0].ids, ['AC-1']);
});

test('a reviewer-checked row with a recorded answer counts as present for AC-13 (no completeness finding)', () => {
  const m = model(['## Acceptance Criteria', '- **AC-1** — reviewer-checked, answered.']);
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | reviewer-checked | pass — all three skills name the invocation point |',
  ]);
  assert.deepEqual(checkProofMapCompleteness(m, vr), []);
});

test('every defined AC covered by a non-empty row: no proof-map-completeness findings', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — first.',
    '- **AC-2** — second.',
  ]);
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/foo.test.mjs > case one |',
    '| AC-2 | reviewer-checked | pass |',
  ]);
  assert.deepEqual(checkProofMapCompleteness(m, vr), []);
});

test('NC coverage decision: an NC criterion mentioned only in spec prose is OUT of proof-map-completeness scope (parseSpec never defines an NC id, so none is expected)', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — the only DEFINED criterion (parseSpec has no NC-kind ids).',
    '- **NC-1** — a negative criterion, prose-only from parseSpec\'s point of view.',
  ]);
  assert.ok(
    !m.ids.some((i) => i.id === 'NC-1'),
    'sanity check: parseSpec does not define NC-1 as an id at all (T-2 grammar excludes NC)',
  );
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/foo.test.mjs > case one |',
  ]);
  // No NC-1 row exists in the proof map, and none is required: NC-1 is simply not part of the
  // universe this rule iterates (sourced from parseSpec().ids, kind === 'AC').
  assert.deepEqual(checkProofMapCompleteness(m, vr), []);
});

// --- AC-14: proof-evidence linkage (name-appearance, ADR-0001) ---

test('a test-backed row whose named test is ABSENT from the captured evidence yields a finding naming the row', () => {
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/foo.test.mjs > the missing case |',
  ]);
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '$ node --test tests/foo.test.mjs',
    'ok 1 - tests/foo.test.mjs > a completely different case',
    '```',
  ]);
  const findings = checkProofEvidenceLinkage(vr, l);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'proof-evidence-linkage');
  assert.deepEqual(findings[0].ids, ['AC-1']);
});

test('a test-backed row whose named test IS present (name-appearance) in the captured evidence yields no finding', () => {
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/foo.test.mjs > the present case |',
  ]);
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '$ node --test tests/foo.test.mjs',
    'ok 1 - tests/foo.test.mjs > the present case',
    '```',
  ]);
  assert.deepEqual(checkProofEvidenceLinkage(vr, l), []);
});

test('a reviewer-checked row with a recorded answer is NOT subject to name-appearance linkage (no AC-14 finding even though nothing resembling it appears in evidence)', () => {
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | reviewer-checked | pass — the skill text names the invocation point |',
  ]);
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '$ node --test tests/foo.test.mjs',
    'ok 1 - unrelated',
    '```',
  ]);
  assert.deepEqual(checkProofEvidenceLinkage(vr, l), []);
});

test('name-appearance is searched across the UNION of all evidence entries, not just one task heading', () => {
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/bar.test.mjs > lives under a different task heading |',
  ]);
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '| T-2 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '$ node --test tests/foo.test.mjs',
    'ok 1 - tests/foo.test.mjs > unrelated case',
    '```',
    '',
    '### T-2 (@ `def456`)',
    '',
    '```',
    '$ node --test tests/bar.test.mjs',
    'ok 1 - tests/bar.test.mjs > lives under a different task heading',
    '```',
  ]);
  assert.deepEqual(checkProofEvidenceLinkage(vr, l), []);
});

test('a proof cell naming SEVERAL test identifiers (comma-separated) requires each to appear; only the missing one is named', () => {
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/foo.test.mjs > case one, tests/foo.test.mjs > case two |',
  ]);
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '$ node --test tests/foo.test.mjs',
    'ok 1 - tests/foo.test.mjs > case one',
    '```',
  ]);
  const findings = checkProofEvidenceLinkage(vr, l);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'proof-evidence-linkage');
  assert.deepEqual(findings[0].ids, ['AC-1']);
  assert.match(findings[0].message, /case two/);
});

test('an empty proof cell on a test-backed row yields no AC-14 finding (AC-13 already covers the empty-proof case)', () => {
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed |  |',
  ]);
  const l = ledger(['## Task ledger', '| Task | Status |', '| --- | --- |', '| T-1 | done |']);
  assert.deepEqual(checkProofEvidenceLinkage(vr, l), []);
});

// --- AC-13 exhaustiveness lock (review Minor #2): TWO distinct missing ACs must BOTH be named —
// guards against a future `break`-after-first-finding regression in checkProofMapCompleteness,
// which the single-missing-AC test above cannot distinguish from exhaustive behavior. ---

test('a verification report missing rows for TWO distinct defined ACs: the findings name BOTH criteria (exhaustiveness lock)', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — has a row.',
    '- **AC-2** — missing entirely.',
    '- **AC-3** — also missing entirely.',
  ]);
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/foo.test.mjs > covers AC-1 |',
  ]);
  const findings = checkProofMapCompleteness(m, vr);
  assert.ok(findings.length >= 2, 'must report both missing ACs, not short-circuit at the first');
  const ids = findings.flatMap((f) => f.ids);
  assert.ok(ids.includes('AC-2'), 'AC-2 must be named');
  assert.ok(ids.includes('AC-3'), 'AC-3 must be named too — not just the first missing AC');
});

// --- Whitespace-only proof assertion (review Minor #3): the parser trims the proof cell so a
// `|    |` cell arrives as '' — verified end-to-end here, not just at the parser, so a future
// parser change that stops trimming would be caught by THIS rule's own test, the same fail-open
// shape closed for green-bar evidence in T-5. ---

test('a whitespace-only proof cell (parser-trimmed to empty) on a test-backed row yields a proof-map-completeness finding naming the criterion', () => {
  const m = model(['## Acceptance Criteria', '- **AC-1** — test-backed, whitespace-only proof cell.']);
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed |     |',
  ]);
  assert.equal(vr.rows[0].proof, '', 'sanity check: the parser trims a whitespace-only cell to empty string');
  const findings = checkProofMapCompleteness(m, vr);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'finding');
  assert.equal(findings[0].rule, 'proof-map-completeness');
  assert.deepEqual(findings[0].ids, ['AC-1']);
});

// --- Unrecognized/empty `type` cell (review Minor #3): pins CURRENT behavior (not a change) — a
// row whose type cell is neither 'test-backed' nor 'reviewer-checked' is out of AC-14's linkage
// scope (only type === 'test-backed' rows are checked), but AC-13 still counts the row as present
// as long as its proof cell is non-empty (AC-13 never looks at type at all). ---

test('a row with a blank/unrecognized type cell is NOT subject to AC-14 linkage, but AC-13 still counts it present given a non-empty proof (current behavior, pinned)', () => {
  const m = model(['## Acceptance Criteria', '- **AC-1** — blank type cell, non-empty proof.']);
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 |  | tests/foo.test.mjs > a case absent from any evidence |',
  ]);
  assert.equal(vr.rows[0].type, '', 'sanity check: normalizeProofType leaves a blank cell as the empty string, not a default');
  // AC-13: present, because the proof cell is non-empty — type is irrelevant to this rule.
  assert.deepEqual(checkProofMapCompleteness(m, vr), []);
  // AC-14: type !== 'test-backed', so linkage is never checked for this row — no finding even
  // though the named test does not appear anywhere in the (empty) evidence below.
  const l = ledger(['## Task ledger', '| Task | Status |', '| --- | --- |', '| T-1 | done |']);
  assert.deepEqual(checkProofEvidenceLinkage(vr, l), []);
});

// --- A complete, fully-linked map covering all criteria: no findings from either rule (happy path) ---

test('a complete, fully-linked proof map covering every defined AC yields no findings from either rule', () => {
  const m = model([
    '## Acceptance Criteria',
    '- **AC-1** — test-backed, linked.',
    '- **AC-2** — reviewer-checked, answered.',
  ]);
  const vr = verificationReport([
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | tests/foo.test.mjs > case one |',
    '| AC-2 | reviewer-checked | pass |',
  ]);
  const l = ledger([
    '## Task ledger',
    '| Task | Status |',
    '| --- | --- |',
    '| T-1 | done |',
    '',
    '### T-1 (@ `abc123`)',
    '',
    '```',
    '$ node --test tests/foo.test.mjs',
    'ok 1 - tests/foo.test.mjs > case one',
    '```',
  ]);
  assert.deepEqual(checkProofMapCompleteness(m, vr), []);
  assert.deepEqual(checkProofEvidenceLinkage(vr, l), []);
});
