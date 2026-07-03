// Tests for the spec parser: sections, AC/C/T IDs, and trace references (T-2).
// Fixtures are minimal inline spec strings (per plan Notes) — no committed fixture files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSpec } from './sdlc-check.mjs';

// --- Typed parse failure: never a throw, never an empty-model pass ---

test('missing spec content (undefined) fails cleanly, naming the file and the problem', () => {
  const result = parseSpec(undefined, 'specs/x/x.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'specs/x/x.md');
  assert.match(result.error.problem, /missing|empty/i);
});

test('null spec content fails cleanly', () => {
  const result = parseSpec(null, 'specs/x/x.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'specs/x/x.md');
});

test('non-string spec content fails cleanly (never throws)', () => {
  const result = parseSpec(42, 'specs/x/x.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'specs/x/x.md');
});

test('empty string spec content fails cleanly', () => {
  const result = parseSpec('', 'specs/x/x.md');
  assert.equal(result.ok, false);
  assert.match(result.error.problem, /missing|empty/i);
});

test('whitespace-only spec content fails cleanly', () => {
  const result = parseSpec('   \n  \n', 'specs/x/x.md');
  assert.equal(result.ok, false);
});

test('unparseable content (no "##" sections at all) fails cleanly, never an empty-model pass', () => {
  const result = parseSpec('just some prose with no headings at all', 'specs/x/x.md');
  assert.equal(result.ok, false);
  assert.equal(result.error.file, 'specs/x/x.md');
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
