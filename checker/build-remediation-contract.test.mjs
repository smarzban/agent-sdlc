// Instruction-contract tests for T-1: bounded, finding-scoped remediation must retain the
// initial independent review and the conductor's verification and commit boundaries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoFile = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const buildSkill = readFileSync(repoFile('skills/build/SKILL.md'), 'utf8');
const loopReference = readFileSync(repoFile('skills/build/reference/subagent-loop.md'), 'utf8');
const pipeline = readFileSync(repoFile('docs/usage/pipeline.md'), 'utf8');

test('build remediation contract keeps the initial review complete', () => {
  assert.match(
    buildSkill,
    /initial full-review snapshot[\s\S]*complete\s+task-scoped\s+(?:review\s+)?diff/i,
    'the first review must retain the complete task-scoped change',
  );
  assert.match(
    loopReference,
    /initial review[\s\S]*complete\s+task-scoped\s+diff[\s\S]*before remediation/i,
    'the detailed loop must keep remediation after the complete initial review',
  );
  assert.match(
    pipeline,
    /initial (?:independent\s+)?review[\s\S]*complete\s+task-scoped\s+diff/i,
    'the public pipeline must not describe remediation as the initial review',
  );
});

test('build remediation contract resumes the original agents for two finding-scoped rounds', () => {
  assert.match(
    buildSkill,
    /remediation\s+rounds?\s+1\s+and\s+2[\s\S]*continue\s+the\s+original\s+implementer\s+session/i,
    'rounds one and two must continue the original implementer session when available',
  );
  assert.match(
    buildSkill,
    /remediation\s+rounds?\s+1\s+and\s+2[\s\S]*continue\s+the\s+original\s+reviewer\s+session/i,
    'rounds one and two must continue the original reviewer session when available',
  );
  assert.match(loopReference, /finding-scoped re-review/i, 'later reviews must be finding-scoped');
  assert.match(loopReference, /each prior blocking finding[\s\S]*`ADDRESSED`[\s\S]*`NOT ADDRESSED`/i);
  assert.match(loopReference, /new breakage[\s\S]*remediation diff/i);
  assert.match(loopReference, /outside (?:the )?remediation diff[\s\S]*non-blocking/i);
});

test('build remediation contract uses a fresh final round and then blocks', () => {
  assert.match(
    buildSkill,
    /remediation round 3[\s\S]*fresh fixer[\s\S]*fresh reviewer/i,
    'the final round must use a fresh fixer-reviewer pair',
  );
  assert.match(
    buildSkill,
    /after remediation round 3[\s\S]*(?:Critical|Important)[\s\S]*blocked[\s\S]*without (?:a )?fourth dispatch/i,
    'open blocking findings after round three must terminate the task',
  );
  assert.match(
    loopReference,
    /(?:continuation\s+is\s+unavailable|continued\s+session\s+is\s+dead)[\s\S]*announce[\s\S]*fresh-agent fallback/i,
    'a missing or dead continuation must use an announced fresh-agent fallback',
  );
  assert.match(loopReference, /durable (?:file )?handoff[\s\S]*brief[\s\S]*findings[\s\S]*diff/i);
});

test('build remediation contract creates remediation-only snapshot diffs without touching the real index', () => {
  assert.match(loopReference, /temporary index/i);
  assert.match(loopReference, /GIT_INDEX_FILE=.*git read-tree HEAD/);
  assert.match(loopReference, /GIT_INDEX_FILE=.*git add --/);
  assert.match(loopReference, /GIT_INDEX_FILE=.*git write-tree/);
  assert.match(loopReference, /git diff .*previous_tree.*next_tree/);
  assert.match(loopReference, /real\s+index,\s+working\s+tree,\s+HEAD,\s+(?:and|or)\s+branch[\s\S]*unchanged/i);
  assert.match(loopReference, /remediation-only diff/i);
});

test('build remediation contract removes the stale bounded fix-cycle pointer', () => {
  assert.doesNotMatch(
    buildSkill,
    /bounded fix cycle/i,
    'the reference pointer must name the three-round remediation protocol',
  );
});

test('build remediation contract records every remediation round', () => {
  assert.doesNotMatch(
    buildSkill,
    /each fixer \+ re-review iteration in 4c|a fix cycle is the next round/i,
    'continued rounds are remediation rounds, not fixer-only fix cycles',
  );
});
