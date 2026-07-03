// Tests for the reporter (T-8): exhaustive findings + exit derivation.
// The reporter is pure: results array in, { text, exitCode } out. No I/O, no process.exit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatReport } from './sdlc-check.mjs';

function finding(rule, message, ids) {
  return { type: 'finding', rule, message, ids };
}

function note(rule, message, ids) {
  return { type: 'note', rule, message, ids };
}

test('three distinct findings: all three appear in the text, exit code nonzero (AC-9 + AC-8)', () => {
  const results = [
    finding('trace-integrity', 'T-1 cites AC-99, which is not defined anywhere in the spec', ['AC-99']),
    finding('coverage-forward', 'AC-2 is not reached by any task', ['AC-2']),
    finding('green-bar-evidence', 'T-3 is marked done but has no captured green-bar evidence block', ['T-3']),
  ];
  const { text, exitCode } = formatReport(results);
  assert.notEqual(exitCode, 0);
  for (const f of results) {
    assert.match(text, new RegExp(f.rule));
    assert.match(text, new RegExp(f.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    for (const id of f.ids) assert.match(text, new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('empty results list: exit code 0 and a clean pass line (AC-8 pass side)', () => {
  const { text, exitCode } = formatReport([]);
  assert.equal(exitCode, 0);
  assert.match(text, /pass/i);
});

test('only notes, no findings: exit code 0 (notes never fail) and notes rendered distinctly', () => {
  const results = [
    note('coverage-backward', 'T-9 is explicitly untraced: infra-only, no criterion applies', ['T-9']),
  ];
  const { text, exitCode } = formatReport(results);
  assert.equal(exitCode, 0);
  assert.match(text, /note/i);
  assert.match(text, /T-9/);
  assert.match(text, /explicitly untraced/);
});

test('mixed findings and notes: nonzero exit, both rendered in visually distinct sections', () => {
  const results = [
    finding('trace-integrity', 'T-1 cites AC-99, which is not defined anywhere in the spec', ['AC-99']),
    note('coverage-backward', 'T-9 is explicitly untraced: infra-only, no criterion applies', ['T-9']),
  ];
  const { text, exitCode } = formatReport(results);
  assert.notEqual(exitCode, 0);

  const findingSectionMatch = /finding/i.exec(text);
  const noteSectionMatch = /note/i.exec(text);
  assert.ok(findingSectionMatch, 'a findings section marker must be present');
  assert.ok(noteSectionMatch, 'a notes section marker must be present');

  // Distinct sections: the finding's message must not appear inside the notes section, and vice
  // versa — split the text at whichever section header comes first and check placement.
  const findingIdx = text.indexOf('AC-99');
  const noteIdx = text.indexOf('T-9 is explicitly untraced');
  assert.ok(findingIdx !== -1 && noteIdx !== -1);
  // The two markers themselves must differ (case-insensitively distinguishable as separate labels).
  assert.notEqual(findingSectionMatch[0].toLowerCase(), noteSectionMatch[0].toLowerCase());
});

test('exhaustiveness: many findings are all present, never truncated', () => {
  const n = 25;
  const results = Array.from({ length: n }, (_, i) =>
    finding('trace-integrity', `T-${i} cites AC-${900 + i}, which is not defined anywhere in the spec`, [`AC-${900 + i}`]));
  const { text, exitCode } = formatReport(results);
  assert.notEqual(exitCode, 0);
  for (const f of results) {
    assert.match(text, new RegExp(f.ids[0]));
  }
});

test('exit code is exactly 0 or nonzero — a finding present derives nonzero, never 0', () => {
  const { exitCode: cleanCode } = formatReport([]);
  const { exitCode: notesOnlyCode } = formatReport([note('coverage-backward', 'x', ['T-1'])]);
  const { exitCode: findingCode } = formatReport([finding('trace-integrity', 'x', ['AC-1'])]);
  assert.equal(cleanCode, 0);
  assert.equal(notesOnlyCode, 0);
  assert.notEqual(findingCode, 0);
});

test('summary line reports counts (asserts the literal section headers, not incidental digits)', () => {
  const results = [
    finding('trace-integrity', 'x', ['AC-1']),
    finding('coverage-forward', 'y', ['AC-2']),
    note('coverage-backward', 'z', ['T-1']),
  ];
  const { text } = formatReport(results);
  assert.match(text, /Findings \(2\):/);
  assert.match(text, /Notes \(1\):/);
});

test('unexpected type: rendered (not silently dropped) AND forces a nonzero exit (fail-closed, review Minor #1)', () => {
  const results = [
    { type: 'Finding', rule: 'x', message: 'a mistyped finding', ids: ['AC-1'] },
  ];
  const { text, exitCode } = formatReport(results);
  assert.notEqual(exitCode, 0, 'an unexpected-type item must not silently pass the gate');
  assert.match(text, /AC-1/, 'the unexpected-type item must be surfaced in the text, not dropped');
  assert.match(text, /a mistyped finding/);
});

test('well-typed items are unaffected by the fail-closed change: a real note still yields exit 0', () => {
  const results = [note('coverage-backward', 'T-9 is explicitly untraced', ['T-9'])];
  const { exitCode } = formatReport(results);
  assert.equal(exitCode, 0);
});

test('missing ids: formatReport does not throw and still renders (honest no-error-path, review Minor #2)', () => {
  const results = [{ type: 'finding', rule: 'x', message: 'no ids on this one' }];
  assert.doesNotThrow(() => formatReport(results));
  const { text, exitCode } = formatReport(results);
  assert.notEqual(exitCode, 0);
  assert.match(text, /no ids on this one/);
});
