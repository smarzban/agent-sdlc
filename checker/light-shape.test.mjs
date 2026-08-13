// Light-shape contract: a spec with no Design and no Tech Stack may cite an existing
// component by name. The checker must keep that name (not force `none`) and must not
// treat it as dangling. A full spec still requires a Design-defined component.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseSpec, checkTraceIntegrity } from './sdlc-check.mjs';

const repoFile = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const lightSkill = readFileSync(repoFile('skills/light/SKILL.md'), 'utf8');
const gateSkill = readFileSync(repoFile('skills/gate/SKILL.md'), 'utf8');
const buildSkill = readFileSync(repoFile('skills/build/SKILL.md'), 'utf8');

function parse(lines) {
  const result = parseSpec(lines.join('\n'), 'x.md');
  assert.equal(result.ok, true, 'fixture spec must parse');
  return result;
}

const lightSpec = [
  '## Brief',
  'Fix the widget helper timeout.',
  '',
  '## Acceptance Criteria',
  '- **AC-1** Widget helper times out instead of hanging.',
  '  *(Verification type: **test-backed** — unit.)*',
  '',
  '## Plan',
  '**T-1: Add timeout to widget helper**',
  '*Advances:* AC-1. *Component:* widget helper. *Deps:* none.',
];

test('a light spec may cite an existing component by name without a Design list', () => {
  const m = parse(lightSpec);
  const componentTrace = m.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.ok(componentTrace, 'the *Component:* field must parse');
  assert.equal(componentTrace.unresolvedComponent, null);
  assert.ok(
    componentTrace.refs.some((id) => id.startsWith('C-exist-')),
    'the named existing component must become a C-exist-N ref',
  );
  const implicit = m.components.find((c) => c.name === 'widget helper');
  assert.ok(implicit, 'the name must stay in the model');
  assert.equal(implicit.id, componentTrace.refs.find((id) => id.startsWith('C-exist-')));
  assert.deepEqual(checkTraceIntegrity(m).filter((f) => f.type === 'finding'), []);
});

test('a light spec still accepts *Component:* none', () => {
  const m = parse([
    '## Brief',
    'A one-line edit.',
    '',
    '## Acceptance Criteria',
    '- **AC-1** The edit lands.',
    '  *(Verification type: **test-backed** — unit.)*',
    '',
    '## Plan',
    '**T-1: Edit the line**',
    '*Advances:* AC-1. *Component:* none. *Deps:* none.',
  ]);
  const componentTrace = m.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.equal(componentTrace.unresolvedComponent, null);
  assert.deepEqual(componentTrace.refs, []);
  assert.deepEqual(checkTraceIntegrity(m).filter((f) => f.type === 'finding'), []);
});

test('two light tasks that cite the same existing name share one C-exist id', () => {
  const m = parse([
    '## Brief',
    'Two edits in the same helper.',
    '',
    '## Acceptance Criteria',
    '- **AC-1** Helper A.',
    '- **AC-2** Helper B.',
    '',
    '## Plan',
    '**T-1: First**',
    '*Advances:* AC-1. *Component:* widget helper. *Deps:* none.',
    '**T-2: Second**',
    '*Advances:* AC-2. *Component:* widget helper. *Deps:* none.',
  ]);
  const exist = m.components.filter((c) => c.id.startsWith('C-exist-'));
  assert.equal(exist.length, 1);
  assert.equal(exist[0].name, 'widget helper');
  const refs = m.traces
    .filter((t) => t.kind === 'component')
    .map((t) => t.refs.filter((id) => id.startsWith('C-exist-')));
  assert.deepEqual(refs, [[exist[0].id], [exist[0].id]]);
});

test('a full spec with Design still flags a name that is not defined there', () => {
  const m = parse([
    '## Design',
    '### Components',
    '1. **Gizmo** — does gizmo things.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* widget helper. *Deps:* none.',
  ]);
  const componentTrace = m.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.equal(componentTrace.unresolvedComponent, 'widget helper');
  const findings = checkTraceIntegrity(m).filter((f) => f.type === 'finding');
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /widget helper/);
});

test('a spec that has Tech Stack is not light: an undefined component name still dangles', () => {
  const m = parse([
    '## Tech Stack',
    'Reuses the declared stack.',
    '',
    '## Plan',
    '- **T-1 — Do it.** Detail. *Component:* widget helper. *Deps:* none.',
  ]);
  const componentTrace = m.traces.find((t) => t.from === 'T-1' && t.kind === 'component');
  assert.equal(componentTrace.unresolvedComponent, 'widget helper');
  assert.ok(checkTraceIntegrity(m).some((f) => f.type === 'finding' && f.message.includes('widget helper')));
});

test('light skill states named existing components are valid without Design', () => {
  assert.match(lightSkill, /\*Component:\*[\s\S]*existing component/i);
  assert.match(lightSkill, /none/i);
  assert.doesNotMatch(
    lightSkill,
    /only `none`|must be none/i,
    'forcing none on every light task makes the field decoration',
  );
});

test('gate skill accepts a light spec without Design or Tech Stack', () => {
  assert.match(gateSkill, /light spec/i);
  assert.match(gateSkill, /no `## Design`/i);
  assert.match(gateSkill, /not a gap/i);
});

test('build skill names a green-bar fallback when Tech Stack is absent', () => {
  assert.match(
    buildSkill,
    /on light[\s\S]*green bar[\s\S]*(?:overview\.md|declared commands)/i,
    'light build must say where the green bar comes from without a feature Tech Stack',
  );
});

test('light build skips the per-task reviewer and full build does not', () => {
  assert.match(buildSkill, /Light specs skip the per-task reviewer/i);
  assert.match(buildSkill, /Full only:[\s\S]*one initial reviewer[\s\S]*Light: skip/i);
  assert.match(buildSkill, /Per-task reviewer on a light spec/);
  assert.match(lightSkill, /no per-task reviewer/i);
});
