// The build-to-PR boundary is an explicit owner decision. A green branch must not open a PR by itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repoFile = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const buildSkill = readFileSync(repoFile('skills/build/SKILL.md'), 'utf8');
const prReviewSkill = readFileSync(repoFile('skills/pr-review/SKILL.md'), 'utf8');
const gettingStarted = readFileSync(repoFile('skills/getting-started/SKILL.md'), 'utf8');
const inputResolution = readFileSync(
  repoFile('skills/getting-started/reference/input-resolution.md'),
  'utf8',
);
const readme = readFileSync(repoFile('README.md'), 'utf8');
const pipeline = readFileSync(repoFile('docs/usage/pipeline.md'), 'utf8');

function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  assert.ok(match, 'skill must have frontmatter');
  return match[1];
}

function section(text, heading) {
  const match = text.match(new RegExp(`<${heading}>\\n([\\s\\S]*?)\\n<\\/${heading}>`));
  assert.ok(match, `skill must have a ${heading} section`);
  return match[1];
}

test('build asks before starting pr-review', () => {
  const hardGate = section(buildSkill, 'HARD-GATE');
  assert.match(
    hardGate,
    /Terminal action: report the green branch, then ask whether to run `\/agent-sdlc:pr-review`/i,
  );
  assert.doesNotMatch(hardGate, /green branch handed to `\/agent-sdlc:pr-review`/i);
  assert.match(
    buildSkill,
    /The branch is ready\. Should I run `\/agent-sdlc:pr-review`\?[\s\S]*?Stop there until the user answers/i,
  );
  assert.doesNotMatch(buildSkill, /branch ready, run `\/agent-sdlc:pr-review`/i);
  assert.match(buildSkill, /never start it from build alone/i);
});

test('pr-review needs explicit authorization and has no automatic trigger', () => {
  const prReviewFrontmatter = frontmatter(prReviewSkill);
  assert.match(prReviewFrontmatter, /AFTER build reports the branch ready and the user approves/i);
  assert.doesNotMatch(prReviewFrontmatter, /'ship'/i);
  assert.doesNotMatch(prReviewFrontmatter, /build-report\.md with every task done/i);
  assert.match(prReviewSkill, /green branch alone never\s+starts this stage/i);
  assert.doesNotMatch(prReviewSkill, /old invoke `ship`/i);
});

test('the router and public docs preserve the authorization boundary', () => {
  assert.match(gettingStarted, /after\s+build, the agent always asks whether to start `pr-review`/i);
  assert.match(gettingStarted, /Once authorized, pr-review runs\s+autonomously/i);
  assert.match(
    gettingStarted,
    /branch is built and green[\s\S]*ask whether to run \*\*`pr-review`\*\*/i,
  );
  assert.match(
    gettingStarted,
    /\| 7 \| `pr-review` \| `\/agent-sdlc:pr-review` \| you authorize, agent runs \|/i,
  );
  assert.match(inputResolution, /PR-review, after authorization/i);
  assert.doesNotMatch(inputResolution, /\*\*Ship\*\*/i);
  assert.match(readme, /then asks whether to run `pr-review`/i);
  assert.match(readme, /\| `pr-review` \| `\/agent-sdlc:pr-review` \| you authorize, agent runs \|/i);
  assert.match(pipeline, /then asks whether to run `pr-review`/i);
  assert.match(pipeline, /build-report\.md`, then asks whether to start `pr-review`/i);
  assert.match(pipeline, /\| 7 \| .*`pr-review`.*\| you authorize, agent runs \|/i);
});
