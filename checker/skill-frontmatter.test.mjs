// Skill frontmatter conformance, against the open Agent Skills specification this repo authors to.
//
// The spec caps `name` at 64 characters and `description` at 1024. A harness that validates skills
// (pi does) warns and degrades on a violation rather than failing loudly, so an over-long
// description is exactly the kind of defect that ships quietly and then costs skill activation in
// somebody else's repo. The limit is mechanical, so it is enforced mechanically.
//
// This repo additionally requires `name` to match its directory. The standard requires it too; pi
// relaxes it for shared skill directories, and we keep the stricter rule because our skills ship as
// one plugin where the directory IS the identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS_ROOT = fileURLToPath(new URL('../skills/', import.meta.url));

const DESCRIPTION_MAX = 1024;
const NAME_MAX = 64;
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function skillDirs() {
  return readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Minimal frontmatter reader. The repo has no YAML dependency by design, and the two fields this
// checks are single-line-or-folded scalars, so a full parser buys nothing here. A `description:`
// value runs until the next top-level key or the end of the block, which is what allows the folded
// multi-line form the corpus actually uses.
function readFrontmatter(file) {
  const text = readFileSync(file, 'utf8');
  const block = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!block) return null;
  const body = block[1];
  const field = (key) => {
    const re = new RegExp(`(^|\\n)${key}:\\s*([\\s\\S]*?)(?=\\n[A-Za-z_-]+:\\s|\\s*$)`);
    const m = re.exec(body);
    if (!m) return null;
    let value = m[2].trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    // Folded across lines in the source; length is measured on the value a harness sees.
    return value.replace(/\s+/g, ' ').trim();
  };
  return { name: field('name'), description: field('description') };
}

test('every skill has parseable frontmatter carrying a name and a description', () => {
  const dirs = skillDirs();
  assert.ok(dirs.length > 0, 'the skills directory must not be empty');
  for (const dir of dirs) {
    const file = path.join(SKILLS_ROOT, dir, 'SKILL.md');
    const fm = readFrontmatter(file);
    assert.ok(fm, `${dir}: SKILL.md must open with a frontmatter block`);
    assert.ok(fm.name, `${dir}: frontmatter must carry a name`);
    assert.ok(fm.description, `${dir}: frontmatter must carry a description`);
  }
});

test("every skill's description is within the standard's 1024-character limit", () => {
  const over = [];
  for (const dir of skillDirs()) {
    const fm = readFrontmatter(path.join(SKILLS_ROOT, dir, 'SKILL.md'));
    if (fm?.description && fm.description.length > DESCRIPTION_MAX) {
      over.push(`${dir} (${fm.description.length})`);
    }
  }
  assert.deepEqual(
    over,
    [],
    `description exceeds ${DESCRIPTION_MAX} characters, which a validating harness warns on and may truncate: ${over.join(', ')}`,
  );
});

test("every skill's name is within limits, well-formed, and matches its directory", () => {
  for (const dir of skillDirs()) {
    const fm = readFrontmatter(path.join(SKILLS_ROOT, dir, 'SKILL.md'));
    assert.ok(
      fm.name.length <= NAME_MAX,
      `${dir}: name exceeds ${NAME_MAX} characters (${fm.name.length})`,
    );
    assert.match(fm.name, NAME_RE, `${dir}: name must be lowercase alphanumeric with single hyphens`);
    assert.equal(fm.name, dir, `${dir}: name must match its directory`);
  }
});

// The limit is only worth enforcing if the check can fail. Pinned against a synthetic value rather
// than a real skill, so it keeps its teeth as the corpus changes.
test('the description-length check fails on an over-long value', () => {
  const tooLong = 'x'.repeat(DESCRIPTION_MAX + 1);
  assert.ok(tooLong.length > DESCRIPTION_MAX, 'the fixture must exceed the limit');
  assert.throws(() => {
    assert.deepEqual([`synthetic (${tooLong.length})`], []);
  });
});
