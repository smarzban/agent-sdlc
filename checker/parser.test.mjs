// Tests for the spec parser: sections, AC/C/T IDs, and trace references (T-2); provenance/untraced
// markers and ledger/verification-report parsing (T-3).
// Fixtures are minimal inline spec strings (per plan Notes) — no committed fixture files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpec, parseLedger, parseVerificationReport } from './sdlc-check.mjs';

// --- Typed parse failure: never a throw, never an empty-model pass ---

test('missing spec content (undefined) fails cleanly, naming the file and the problem', () => {
  const result = parseSpec(undefined, 'docs/specs/x/x.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'docs/specs/x/x.md');
  assert.match(result.error.problem, /missing|empty/i);
});

test('null spec content fails cleanly', () => {
  const result = parseSpec(null, 'docs/specs/x/x.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'docs/specs/x/x.md');
});

test('non-string spec content fails cleanly (never throws)', () => {
  const result = parseSpec(42, 'docs/specs/x/x.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'docs/specs/x/x.md');
});

test('empty string spec content fails cleanly', () => {
  const result = parseSpec('', 'docs/specs/x/x.md');
  assert.equal(result.ok, false);
  assert.match(result.error.problem, /missing|empty/i);
});

test('whitespace-only spec content fails cleanly', () => {
  const result = parseSpec('   \n  \n', 'docs/specs/x/x.md');
  assert.equal(result.ok, false);
});

test('unparseable content (no "##" sections at all) fails cleanly, never an empty-model pass', () => {
  const result = parseSpec('just some prose with no headings at all', 'docs/specs/x/x.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'docs/specs/x/x.md');
  assert.match(result.error.problem, /section/i);
});

test('defaults the file name in the error when none is given', () => {
  const result = parseSpec('');
  assert.equal(result.ok, false);
  assert.ok(result.error.file);
});

// --- Sections ---

test('parses "##" sections in order, ignoring "###" subheadings as separate sections', () => {
  const spec = [
    '# Title',
    '',
    '## Brief',
    'Some brief text.',
    '',
    '## Acceptance Criteria',
    '### Checker mechanics',
    '- **AC-1** — a criterion.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.deepEqual(result.sections.map((s) => s.name), ['Brief', 'Acceptance Criteria']);
});

// --- IDs ---

test('parses AC and T IDs wherever they are defined', () => {
  const spec = [
    '## Acceptance Criteria',
    '- **AC-1** — first criterion.',
    '- **AC-2** — second criterion.',
    '',
    '## Plan',
    '- **T-1 — Do the thing.** Some detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
    '- **T-2 — Do another thing.** More detail. *Advances:* AC-2. *Component:* Widget. *Deps:* T-1.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const ids = result.ids.map((i) => i.id).sort();
  assert.deepEqual(ids, ['AC-1', 'AC-2', 'T-1', 'T-2']);
  assert.equal(result.ids.find((i) => i.id === 'T-2').kind, 'T');
});

test('parses component list entries under a Components subheading into synthetic C-N IDs', () => {
  const spec = [
    '## Design',
    '### Components',
    '1. **Widget** — does widget things.',
    '2. **Gadget** — does gadget things.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.components.map((c) => [c.id, c.name]),
    [['C-1', 'Widget'], ['C-2', 'Gadget']],
  );
  assert.ok(result.ids.some((i) => i.id === 'C-1' && i.kind === 'C'));
});

test('does not mistake an unrelated numbered/bold list for component definitions', () => {
  const spec = [
    '## Brief',
    '1. **Something wrong.** Not a component.',
    '2. **Something else.** Also not a component.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.equal(result.components.length, 0);
});

// --- Trace references ---

test('captures a task\'s Advances/Component/Deps citations as trace references', () => {
  const spec = [
    '## Plan',
    '- **T-1 — Build it.** Detail. *Advances:* AC-1, AC-2. *Component:* Widget. *Deps:* none.',
    '- **T-2 — Build more.** Detail. *Advances:* AC-2. *Component:* Widget. *Deps:* T-1.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const advancesFromT1 = result.traces.find((t) => t.from === 'T-1' && t.kind === 'advances');
  assert.deepEqual(advancesFromT1.refs.sort(), ['AC-1', 'AC-2']);
  const depsFromT2 = result.traces.find((t) => t.from === 'T-2' && t.kind === 'deps');
  assert.deepEqual(depsFromT2.refs, ['T-1']);
});

test('resolves a Component citation by name to its synthetic C-N id', () => {
  const spec = [
    '## Design',
    '### Components',
    '1. **Widget** — does widget things.',
    '',
    '## Plan',
    '- **T-1 — Build it.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const componentTrace = result.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.ok(componentTrace.refs.includes('C-1'));
});

test('a dangling component name that merely contains a real component name as a substring does NOT resolve (anchored, AC-5)', () => {
  const spec = [
    '## Design',
    '### Components',
    '1. **Gate** — the merge gate.',
    '',
    '## Plan',
    '- **T-1 — Build the gateway.** Detail. *Advances:* AC-1. *Component:* Gateway. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const componentTrace = result.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.equal(componentTrace.refs.includes('C-1'), false, 'Gateway must not resolve to Gate');
  assert.equal(componentTrace.unresolvedComponent, 'Gateway');
});

test('the exact component name still resolves as its own word, even inside surrounding prose (AC-5)', () => {
  const spec = [
    '## Design',
    '### Components',
    '1. **Gate** — the merge gate.',
    '',
    '## Plan',
    '- **T-1 — Wire it.** Detail. *Advances:* AC-1. *Component:* the Gate skill text. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const componentTrace = result.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.ok(componentTrace.refs.includes('C-1'), 'the exact name Gate must still resolve');
  assert.equal(componentTrace.unresolvedComponent, null);
});

test('an exact component name whose own edges are non-word chars still resolves (lookaround anchoring, AC-5)', () => {
  const spec = [
    '## Design',
    '### Components',
    '1. **C++** — the native core.',
    '',
    '## Plan',
    '- **T-1 — Build it.** Detail. *Advances:* AC-1. *Component:* C++. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const componentTrace = result.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.ok(componentTrace.refs.includes('C-1'), 'the exact name C++ must resolve');
  assert.equal(componentTrace.unresolvedComponent, null);
});

test('a structured "Outside the checker" subheading defines real components with C-ext-N ids that resolve by name (SMA-419, AC-1)', () => {
  const spec = [
    '## Design',
    '### Outside the checker (changed components)',
    '1. **gate skill text** — the gate SKILL.md prose, not a numbered component.',
    '',
    '## Plan',
    '- **T-1 — Wire it.** Detail. *Advances:* AC-1. *Component:* gate skill text. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const ext = result.components.find((c) => c.name === 'gate skill text');
  assert.ok(ext, 'expected an external component named "gate skill text"');
  assert.equal(ext.id, 'C-ext-1');
  const componentTrace = result.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.ok(componentTrace.refs.includes('C-ext-1'), 'the external component must resolve by name');
  assert.equal(componentTrace.unresolvedComponent, null);
});

test('inside "### Components" and outside "### Outside the checker" lists both start at 1. but get distinct namespaces (C-1 vs C-ext-1), both resolve (SMA-419, AC-2)', () => {
  const spec = [
    '## Design',
    '### Components',
    '1. **Reporter** — the numbered component.',
    '',
    '### Outside the checker (changed components)',
    '1. **gate skill text** — the gate SKILL.md prose.',
    '',
    '## Plan',
    '- **T-1 — Build reporter.** Detail. *Advances:* AC-1. *Component:* Reporter. *Deps:* none.',
    '- **T-2 — Touch the gate.** Detail. *Advances:* AC-2. *Component:* gate skill text. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const inside = result.components.find((c) => c.name === 'Reporter');
  const outside = result.components.find((c) => c.name === 'gate skill text');
  assert.equal(inside.id, 'C-1');
  assert.equal(outside.id, 'C-ext-1');
  assert.notEqual(inside.id, outside.id, 'the two lists must not collide');
  const t1 = result.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  const t2 = result.traces.find((t) => t.from === 'T-2' && t.kind === 'component');
  assert.ok(t1.refs.includes('C-1') && t1.unresolvedComponent === null, 'Reporter resolves to C-1');
  assert.ok(t2.refs.includes('C-ext-1') && t2.unresolvedComponent === null, 'gate skill text resolves to C-ext-1');
});

test('an unrelated "###" subheading after "### Outside the checker" stops absorbing its list items (mode reset, SMA-419)', () => {
  const spec = [
    '## Design',
    '### Outside the checker (changed components)',
    '1. **gate skill text** — the gate SKILL.md prose.',
    '',
    '### Data flow',
    '1. **Not a component** — just a numbered note under an unrelated subheading.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.ok(result.components.find((c) => c.name === 'gate skill text'));
  assert.equal(result.components.find((c) => c.name === 'Not a component'), undefined,
    'a list under an unrelated subheading must not be parsed as components');
});

test('captures a coverage-map table row as a trace reference (citing site + cited IDs)', () => {
  const spec = [
    '## Plan',
    '### Task-to-criterion coverage map',
    '| Criterion | Advanced by |',
    '| --- | --- |',
    '| AC-10 | T-1, T-2 |',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const row = result.traces.find((t) => t.from === 'AC-10' && t.kind === 'map-row');
  assert.ok(row, 'expected a map-row trace for AC-10');
  assert.deepEqual(row.refs.sort(), ['T-1', 'T-2']);
});

test('expands a slash-abbreviated citation run, carrying the prefix across the whole run', () => {
  const spec = [
    '## Plan',
    '- **T-2 — Do it.** Detail. *Advances:* AC-10 (and grounds AC-1/2/3). *Component:* Widget.',
    '  *Deps:* T-1.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const advances = result.traces.find((t) => t.from === 'T-2' && t.kind === 'advances');
  assert.deepEqual(advances.refs.sort(), ['AC-1', 'AC-10', 'AC-2', 'AC-3']);
});

test('expands a multi-digit slash-abbreviated citation run', () => {
  const spec = [
    '## Plan',
    '- **T-3 — Do it.** Detail. *Advances:* grounds AC-3/5/6/13/14. *Component:* Widget.',
    '  *Deps:* T-2.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const advances = result.traces.find((t) => t.from === 'T-3' && t.kind === 'advances');
  assert.deepEqual(advances.refs.sort(), ['AC-13', 'AC-14', 'AC-3', 'AC-5', 'AC-6']);
});

test('an out-of-scope NC-N citation does not leak its embedded C-N', () => {
  const spec = [
    '## Plan',
    '- **T-2 — Do it.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* NC-3.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const deps = result.traces.find((t) => t.from === 'T-2' && t.kind === 'deps');
  assert.deepEqual(deps.refs, []);
});

test('name-resolution does not inject a false C-ref from an Advances/Deps field', () => {
  const spec = [
    '## Design',
    '### Components',
    '1. **Reporter** — renders findings.',
    '',
    '## Plan',
    '- **T-1 — Build the reporter.** Detail mentioning Reporter in the advances prose.',
    '  *Advances:* AC-1. *Component:* none. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const advances = result.traces.find((t) => t.from === 'T-1' && t.kind === 'advances');
  assert.deepEqual(advances.refs, ['AC-1']);
  const component = result.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.deepEqual(component.refs, []);
});

test('a table whose second column is not component/advancement is not read as a trace map', () => {
  const spec = [
    '## Acceptance Criteria',
    '### Verification map',
    '| Criterion | Oracle kind |',
    '| --- | --- |',
    '| AC-1 | unit |',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.equal(result.traces.some((t) => t.kind === 'map-row'), false);
});

// --- Provenance markers (T-3) ---

test('parses a well-formed provenance marker into source + date, on its section', () => {
  const spec = [
    '## Plan',
    '<!-- source: linear SMA-328..348 · ingested 2026-06-29 -->',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.equal(result.provenance.length, 1);
  const marker = result.provenance[0];
  assert.equal(marker.section, 'Plan');
  assert.equal(marker.source, 'linear SMA-328..348');
  assert.equal(marker.date, '2026-06-29');
  assert.equal(marker.malformed, false);
});

test('a provenance marker missing the source identifier parses as present-but-malformed, not a parse failure', () => {
  const spec = [
    '## Plan',
    '<!-- ingested 2026-06-29 -->',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const marker = result.provenance[0];
  assert.equal(marker.source, null);
  assert.equal(marker.malformed, true);
});

test('a provenance marker missing an absolute date parses as present-but-malformed', () => {
  const spec = [
    '## Plan',
    '<!-- source: linear SMA-328..348 -->',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  const marker = result.provenance[0];
  assert.equal(marker.date, null);
  assert.equal(marker.malformed, true);
});

test('a provenance marker with a non-absolute date (e.g. "recently") is malformed', () => {
  const spec = [
    '## Plan',
    '<!-- source: linear SMA-328..348 · ingested recently -->',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.equal(result.provenance[0].malformed, true);
});

test('a hand-authored section (no leading HTML comment) carries no provenance marker', () => {
  const spec = [
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.equal(result.provenance.length, 0);
});

// --- untraced markers (T-3) ---

test('parses an explicit untraced marker with its reason, attributed to the owning task', () => {
  const spec = [
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC: untraced (entered at build, no criteria in source).',
    '  *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.equal(result.untraced.length, 1);
  const marker = result.untraced[0];
  assert.equal(marker.from, 'T-1');
  assert.equal(marker.reason, 'entered at build, no criteria in source');
});

test('an untraced marker with no parenthetical reason still parses (empty reason, not dropped)', () => {
  const spec = [
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC: untraced. *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.equal(result.untraced.length, 1);
  assert.equal(result.untraced[0].reason, '');
});

test('a task with a real AC reference carries no untraced marker', () => {
  const spec = [
    '## Plan',
    '- **T-1 — Do it.** Detail. *Advances:* AC-1. *Component:* Widget. *Deps:* none.',
  ].join('\n');
  const result = parseSpec(spec, 'x.md');
  assert.equal(result.ok, true);
  assert.equal(result.untraced.length, 0);
});

// --- Ledger parsing: task table + green-bar evidence blocks (T-3) ---

test('missing ledger content fails cleanly, naming the file and the problem', () => {
  const result = parseLedger(undefined, 'docs/specs/x/build-report.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'docs/specs/x/build-report.md');
  assert.match(result.error.problem, /missing|empty/i);
});

test('unparseable ledger content (no task table, no evidence headings) fails cleanly', () => {
  const result = parseLedger('just some prose with no ledger structure at all', 'build-report.md');
  assert.equal(result.ok, false);
  assert.match(result.error.problem, /ledger/i);
});

test('parses the task ledger table into status/commit/AC-advanced rows', () => {
  const ledger = [
    '## Task ledger',
    '',
    '| Task | Status | Commit | AC advanced | Notes |',
    '| --- | --- | --- | --- | --- |',
    '| T-1 | done | `823bc91` | AC-8, AC-10 | some notes |',
    '| T-2 | pending | — | AC-1 | |',
  ].join('\n');
  const result = parseLedger(ledger, 'build-report.md');
  assert.equal(result.ok, true);
  const t1 = result.tasks.find((t) => t.task === 'T-1');
  assert.equal(t1.status, 'done');
  assert.equal(t1.commit, '823bc91');
  assert.equal(t1.acAdvanced, 'AC-8, AC-10');
  const t2 = result.tasks.find((t) => t.task === 'T-2');
  assert.equal(t2.status, 'pending');
});

test('parses a fenced green-bar evidence block under a "### T-N (@ SHA)" heading', () => {
  const ledger = [
    '## Green-bar evidence',
    '',
    '### T-1 (@ `823bc91`)',
    '',
    '```',
    '$ node --check agent-sdlc/checker/sdlc-check.mjs',
    '(exit 0)',
    '$ node --test "agent-sdlc/checker/*.test.mjs"',
    'ok 1 - some test name',
    '(exit 0)',
    '```',
    '',
    '### T-2 (@ `abc1234`)',
    '',
    '```',
    '$ node --check agent-sdlc/checker/sdlc-check.mjs',
    '```',
  ].join('\n');
  const result = parseLedger(ledger, 'build-report.md');
  assert.equal(result.ok, true);
  const t1 = result.evidence.find((e) => e.task === 'T-1');
  assert.equal(t1.sha, '823bc91');
  assert.match(t1.text, /ok 1 - some test name/);
  assert.deepEqual(t1.commands, [
    'node --check agent-sdlc/checker/sdlc-check.mjs',
    'node --test "agent-sdlc/checker/*.test.mjs"',
  ]);
  const t2 = result.evidence.find((e) => e.task === 'T-2');
  assert.equal(t2.sha, 'abc1234');
});

test('a ledger heading with no fenced block at all is a present-claim with empty evidence (a bare claim), not dropped', () => {
  const ledger = [
    '## Green-bar evidence',
    '',
    '### T-3 (@ `deadbee`)',
    '',
    'Passed, trust me.',
  ].join('\n');
  const result = parseLedger(ledger, 'build-report.md');
  assert.equal(result.ok, true);
  const t3 = result.evidence.find((e) => e.task === 'T-3');
  assert.ok(t3, 'expected an evidence entry for T-3 even with no fenced block');
  assert.deepEqual(t3.blocks, []);
  assert.equal(t3.text, '');
});

test('parses real-shaped multi-task ledger evidence (grounded in the actual build-report.md shape)', () => {
  const ledger = [
    '## Task ledger',
    '',
    '| Task | Status | Commit | AC advanced | Notes |',
    '| --- | --- | --- | --- | --- |',
    '| T-1 | done | `823bc91` | AC-8, AC-10 | 1 fix round. |',
    '| T-2 | done | `0f5381e` | AC-10 | Re-review clean. |',
    '',
    '## Green-bar evidence',
    '',
    '### T-1 (@ `823bc91`)',
    '',
    '```',
    '$ node --check agent-sdlc/checker/sdlc-check.mjs',
    '(exit 0)',
    '```',
    '',
    '### T-2 (@ `0f5381e`)',
    '',
    '```',
    '$ node --check agent-sdlc/checker/sdlc-check.mjs',
    '(exit 0)',
    '$ node --test "agent-sdlc/checker/*.test.mjs"',
    '1..24',
    '# pass 24',
    '```',
  ].join('\n');
  const result = parseLedger(ledger, 'build-report.md');
  assert.equal(result.ok, true);
  assert.equal(result.tasks.length, 2);
  assert.equal(result.evidence.length, 2);
  assert.match(result.evidence.find((e) => e.task === 'T-2').text, /# pass 24/);
});

test('a ragged ledger data row (fewer cells than the header) fails cleanly, never a thrown TypeError', () => {
  const ledger = [
    '## Task ledger',
    '',
    '| Task | Status | Commit | AC advanced | Notes |',
    '| --- | --- | --- | --- | --- |',
    '| T-1 | done | `823bc91` |',
  ].join('\n');
  const result = parseLedger(ledger, 'build-report.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'build-report.md');
  assert.match(result.error.problem, /ragged|fewer cells|malformed/i);
  assert.match(result.error.problem, /5/); // names the 1-based line number of the offending row
});

test('a well-formed ledger row with an empty-but-present trailing cell is NOT ragged and still parses', () => {
  const ledger = [
    '## Task ledger',
    '',
    '| Task | Status | Commit | AC advanced | Notes |',
    '| --- | --- | --- | --- | --- |',
    '| T-2 | pending | — | AC-1 | |',
  ].join('\n');
  const result = parseLedger(ledger, 'build-report.md');
  assert.equal(result.ok, true);
  assert.equal(result.tasks.find((t) => t.task === 'T-2').status, 'pending');
});

// --- Verification-report parsing (T-3) ---

test('missing verification-report content fails cleanly', () => {
  const result = parseVerificationReport(undefined, 'verification-report.md');
  assert.equal(result.ok, false);
  assert.match(result.error.problem, /missing|empty/i);
});

test('unparseable verification-report content (no proof-map table) fails cleanly', () => {
  const result = parseVerificationReport('just some prose, no table here', 'verification-report.md');
  assert.equal(result.ok, false);
  assert.match(result.error.problem, /verification|proof/i);
});

test('parses a test-backed proof-map row with its named test identifier', () => {
  const report = [
    '## Verification Report',
    '',
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | test-backed | parser.test.mjs: "parses AC and T IDs wherever they are defined" |',
  ].join('\n');
  const result = parseVerificationReport(report, 'verification-report.md');
  assert.equal(result.ok, true);
  const row = result.rows.find((r) => r.criterion === 'AC-1');
  assert.equal(row.type, 'test-backed');
  assert.match(row.proof, /parses AC and T IDs/);
});

test('parses a reviewer-checked proof-map row with its answered pass/fail question', () => {
  const report = [
    '## Verification Report',
    '',
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-15 | reviewer-checked | Yes — gate/build/ship all name the invocation point. |',
  ].join('\n');
  const result = parseVerificationReport(report, 'verification-report.md');
  assert.equal(result.ok, true);
  const row = result.rows.find((r) => r.criterion === 'AC-15');
  assert.equal(row.type, 'reviewer-checked');
  assert.match(row.proof, /invocation point/);
});

test('a ragged verification-report data row (fewer cells than the header) fails cleanly, never a thrown TypeError', () => {
  const report = [
    '## Verification Report',
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-3 | test-backed |',
  ].join('\n');
  const result = parseVerificationReport(report, 'verification-report.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'verification-report.md');
  assert.match(result.error.problem, /ragged|fewer cells|malformed/i);
  assert.match(result.error.problem, /4/); // names the 1-based line number of the offending row
});

test('a proof-map row with an empty proof cell still parses (empty proof, for T-13\'s rule to flag)', () => {
  const report = [
    '## Verification Report',
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-2 | test-backed | |',
  ].join('\n');
  const result = parseVerificationReport(report, 'verification-report.md');
  assert.equal(result.ok, true);
  const row = result.rows.find((r) => r.criterion === 'AC-2');
  assert.equal(row.proof, '');
});

test('a Type cell merely containing "test" as a substring is NOT normalized to test-backed', () => {
  const report = [
    '| Criterion | Type | Proof |',
    '| --- | --- | --- |',
    '| AC-1 | attested | someone vouched for it |',
    '| AC-2 | test-backed | tests/foo.test.mjs > proves it |',
    '| AC-3 | unit test | tests/bar.test.mjs > proves it too |',
  ].join('\n');
  const parsed = parseVerificationReport(report, 'verification-report.md');
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows[0].type, 'attested');      // raw passthrough, not 'test-backed'
  assert.equal(parsed.rows[1].type, 'test-backed');
  assert.equal(parsed.rows[2].type, 'test-backed');   // whole word "test" still matches
});
