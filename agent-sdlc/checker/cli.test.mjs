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

// Superseded by T-9's wiring: the CLI now actually parses the spec, so a non-spec file (this
// script itself — no "##" sections) is unparseable content and must fail closed (AC-10), not
// pass. The happy-path exit-0 leg is now covered end-to-end by integration.test.mjs.
test('an existing but non-spec path (no "##" sections) exits nonzero, never a pass (AC-10, wired at T-9)', () => {
  const result = spawnSync(process.execPath, [CLI, CLI]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr.toString(), /unparseable/i);
});

test('importing the module does not execute the CLI (main-guard regression)', () => {
  // No script file on argv (node -e has none), so process.argv[1] is undefined: the module must
  // not run() merely because it was loaded, whether by static or dynamic import.
  const result = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(CLI)})`]);
  assert.equal(result.status, 0, result.stderr?.toString());
  assert.equal(result.stderr.toString(), '');
});
