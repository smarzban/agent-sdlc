// Tests for the sdlc-check CLI skeleton: exit-code contract for a missing/unparseable spec input.
// Spawns the CLI as a subprocess (per the plan) so the exit code and stderr are the real observed
// contract, not an in-process approximation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('./sdlc-check.mjs', import.meta.url));

test('node --check sdlc-check.mjs passes (valid syntax)', () => {
  const result = spawnSync(process.execPath, ['--check', CLI]);
  assert.equal(result.status, 0, result.stderr?.toString());
});

test('no spec path: exits nonzero and names the problem', () => {
  const result = spawnSync(process.execPath, [CLI]);
  assert.notEqual(result.status, 0);
  const stderr = result.stderr.toString();
  assert.match(stderr, /spec/i);
});

test('nonexistent spec path: exits nonzero and names the problem', () => {
  const missingPath = '/tmp/this-path-does-not-exist-sdlc-check/spec.md';
  const result = spawnSync(process.execPath, [CLI, missingPath]);
  assert.notEqual(result.status, 0);
  const stderr = result.stderr.toString();
  assert.match(stderr, new RegExp(missingPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('existing spec path with no checks yet: exits 0 (happy-path leg not yet implemented)', () => {
  const result = spawnSync(process.execPath, [CLI, CLI]);
  assert.equal(result.status, 0, result.stderr?.toString());
});

test('importing the module does not execute the CLI (main-guard regression)', () => {
  // No script file on argv (node -e has none), so process.argv[1] is undefined: the module must
  // not run() merely because it was loaded, whether by static or dynamic import.
  const result = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(CLI)})`]);
  assert.equal(result.status, 0, result.stderr?.toString());
  assert.equal(result.stderr.toString(), '');
});
