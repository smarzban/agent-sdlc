// Instruction-contract tests for T-2: plan tasks must stop at useful independent review
// boundaries rather than the smallest possible green edit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoFile = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const planSkill = readFileSync(repoFile('skills/plan/SKILL.md'), 'utf8');
const simplicity = readFileSync(repoFile('skills/build/reference/simplicity.md'), 'utf8');
const pipeline = readFileSync(repoFile('docs/usage/pipeline.md'), 'utf8');

test('plan task bar requires independently reviewable vertical slices', () => {
  assert.match(
    planSkill,
    /independently reviewable vertical slice[\s\S]*repository green[\s\S]*useful (?:behavio(?:u)?r|artifact)[\s\S]*accepted and reverted independently/i,
    'a plan task must be useful, green, independently acceptable, and independently reversible',
  );
  assert.match(
    planSkill,
    /supporting (?:tests, )?configuration, setup, (?:and )?documentation[\s\S]*carrying behavio(?:u)?r/i,
    'support work needed only by one behaviour belongs in that behaviour task',
  );
  assert.match(planSkill, /compile fallout[\s\S]*same task/i, 'a vertical slice still carries its compile fallout');
  assert.match(
    simplicity,
    /independently reviewable vertical slice[\s\S]*useful[\s\S]*accepted and reverted independently/i,
    'the build discipline must preserve the planning boundary',
  );
  assert.match(
    pipeline,
    /independently reviewable vertical slice[\s\S]*useful[\s\S]*accepted and reverted independently/i,
    'the public pipeline must describe the plan task boundary',
  );
});

test('plan task bar combines microtasks but preserves independent behavior boundaries', () => {
  assert.match(
    planSkill,
    /order\s+candidate\s+vertical\s+slices\s+by\s+dependency[\s\S]*run\s+the\s+adjacent-pair\s+sanity\s+check/i,
    'candidate slices must be dependency ordered before the adjacent-pair check',
  );
  assert.match(
    planSkill,
    /combine (?:the )?pair[\s\S]*same\s+behavio(?:u)?r[\s\S]*share\s+the\s+primary\s+verification[\s\S]*neither\s+leaves\s+a\s+useful\s+independently\s+reviewable\s+state/i,
    'adjacent microtasks that carry one behaviour must combine',
  );
  assert.match(
    planSkill,
    /run\s+the\s+adjacent-pair\s+sanity\s+check\s+to\s+a\s+fixed\s+point[\s\S]*repeat[\s\S]*complete\s+pass\s+makes\s+no\s+combination[\s\S]*only\s+then\s+assign\s+final\s+`T-N`\s+identities/i,
    'qualifying pairs must combine repeatedly to a fixed point before final task identities',
  );
  assert.match(
    planSkill,
    /separate tasks[\s\S]*(?:accepted or reverted independently|distinct failure or review boundary|unrelated behavio(?:u)?r)/i,
    'independent or unrelated behaviours must retain separate tasks',
  );
  assert.match(
    planSkill,
    /contract\s+or\s+schema[\s\S]*earlier\s+foundation\s+task\s+only\s+when\s+it\s+independently[\s\S]*repository\s+green[\s\S]*useful\s+(?:behavio(?:u)?r|artifact)[\s\S]*accepted\s+and\s+reverted\s+independently[\s\S]*otherwise[\s\S]*behavio(?:u)?r\s+slice\s+that\s+needs\s+it/i,
    'a contract or schema is an earlier task only when it is itself a complete vertical slice',
  );
  assert.match(
    planSkill,
    /do\s+not\s+split\s+by\s+file,\s+layer,\s+or\s+implementation\s+step\s+alone/i,
    'file-by-file or horizontal splits are not task boundaries',
  );
  assert.match(
    planSkill,
    /do not batch unrelated behavio(?:u)?rs/i,
    'unrelated behaviours must not be batched merely to reduce task count',
  );
});
