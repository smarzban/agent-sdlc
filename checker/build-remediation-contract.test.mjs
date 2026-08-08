// Instruction-contract tests for T-1 and T-3: bounded, finding-scoped remediation must retain
// the initial independent review and the conductor's verification and commit boundaries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  linkSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoFile = (relativePath) => fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
const buildSkill = readFileSync(repoFile('skills/build/SKILL.md'), 'utf8');
const loopReference = readFileSync(repoFile('skills/build/reference/subagent-loop.md'), 'utf8');
const pipeline = readFileSync(repoFile('docs/usage/pipeline.md'), 'utf8');
const developmentGuide = readFileSync(repoFile('docs/development.md'), 'utf8');
const contributingGuide = readFileSync(repoFile('CONTRIBUTING.md'), 'utf8');
const packageManifest = readFileSync(repoFile('package.json'), 'utf8');

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

test('build remediation contract tests the authoritative remediation dispatch protocol', () => {
  const remediationSection = loopReference.match(
    /### Remediation dispatch\n([\s\S]*?)(?=\n### |\n## |$)/,
  );
  assert.ok(remediationSection, 'the authoritative loop must have a remediation dispatch section');
  const section = remediationSection[1];
  assert.match(section, /#### Rounds 1 and 2: continue the original sessions/i);
  assert.match(
    section,
    /rounds? 1 and 2[\s\S]*continue the exact original implementer session/i,
  );
  assert.match(
    section,
    /rounds? 1 and 2[\s\S]*continue the exact original reviewer session/i,
  );
  assert.match(
    section,
    /continuation is unavailable[\s\S]*announce a fresh-agent fallback[\s\S]*before dispatch/i,
  );
  assert.match(section, /#### Round 3: fresh fixer and reviewer/i);
  assert.match(section, /round 3[\s\S]*fresh fixer[\s\S]*fresh reviewer/i);
  assert.match(section, /after round 3[\s\S]*blocked/i);
  assert.match(section, /no fourth\s+remediation dispatch/i);
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

test('build remediation contract isolates Git snapshot and diff commands from repository execution hooks', () => {
  assert.match(loopReference, /controlled Git environment/i);
  assert.match(loopReference, /controlled_git(?:_env)?/i);
  assert.match(loopReference, /GIT_CONFIG=\/dev\/null/i);
  assert.match(loopReference, /GIT_CONFIG_NOSYSTEM=1/i);
  assert.match(loopReference, /GIT_CONFIG_GLOBAL=\/dev\/null/i);
  assert.match(loopReference, /GIT_CONFIG_SYSTEM=\/dev\/null/i);
  assert.match(loopReference, /GIT_ATTR_NOSYSTEM=1/i);
  assert.match(loopReference, /GIT_EXTERNAL_DIFF=/i);
  assert.match(loopReference, /--no-ext-diff/);
  assert.match(loopReference, /--no-textconv/);
  assert.match(loopReference, /repository-local configuration[\s\S]*disabled/i);
  assert.match(loopReference, /controlled_git read-tree HEAD/i);
  assert.match(loopReference, /controlled_git hash-object --no-filters -w --/i);
  assert.match(loopReference, /controlled_git update-index --add --cacheinfo/i);
  assert.match(loopReference, /controlled_git write-tree/i);
  assert.match(loopReference, /controlled_git diff/i);
});

function controlledGitSource() {
  const helper = loopReference.match(/(controlled_git\(\) \{[\s\S]*?\n\})\n```/);
  assert.ok(helper, 'the documented controlled Git helper must be executable Bash');
  return helper[1];
}

test('build remediation contract executes the controlled Git helper under Bash', () => {
  assert.match(loopReference, /uses Bash arrays[\s\S]*run it with Bash/i);
  assert.match(developmentGuide, /prerequisites.*Bash/i);
  assert.match(contributingGuide, /prerequisites.*Bash/i);
  execFileSync('bash', ['-c', `${controlledGitSource()}\ncontrolled_git --version >/dev/null`], {
    encoding: 'utf8',
  });
});

test('build remediation snapshot staging bypasses repository and Git-info conversion attributes', () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-attributes-'));
  const tempIndex = path.join(repo, 'temporary-index');
  try {
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: repo });
    writeFileSync(path.join(repo, 'subject.txt'), 'before\n');
    execFileSync('git', ['add', '--', 'subject.txt'], { cwd: repo });
    execFileSync('git', ['commit', '-q', '-m', 'subject'], { cwd: repo });
    writeFileSync(path.join(repo, '.gitattributes'), '*.txt working-tree-encoding=UTF-16LE\n');
    execFileSync('git', ['add', '--', '.gitattributes'], { cwd: repo });
    execFileSync('git', ['commit', '-q', '-m', 'attributes'], { cwd: repo });
    writeFileSync(path.join(repo, '.git', 'info', 'attributes'), '*.txt working-tree-encoding=UTF-16LE\n');
    writeFileSync(path.join(repo, 'subject.txt'), 'captured without conversion\n');

    const script = `${controlledGitSource()}
GIT_INDEX_FILE="$1" controlled_git read-tree HEAD
blob=$(GIT_INDEX_FILE="$1" controlled_git hash-object --no-filters -w -- subject.txt)
GIT_INDEX_FILE="$1" controlled_git update-index --add --cacheinfo "100644,$blob,subject.txt"
GIT_INDEX_FILE="$1" controlled_git cat-file blob "$blob"
`;
    const captured = execFileSync('bash', ['-c', script, 'attribute-fixture', tempIndex], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.equal(captured, 'captured without conversion\n');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('build remediation contract creates remediation-only snapshot diffs without touching the real index', () => {
  assert.match(loopReference, /temporary index/i);
  assert.match(loopReference, /GIT_INDEX_FILE=.*controlled_git read-tree HEAD/);
  assert.match(loopReference, /controlled_git (?:hash-object|update-index)/i);
  assert.match(loopReference, /GIT_INDEX_FILE=.*controlled_git write-tree/);
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

test('build remediation contract scopes a root-level plan file to its exact path', () => {
  assert.match(
    loopReference,
    /root-level file[\s\S]*exact plan-named root file[\s\S]*(?:never the repository root|never authorizes the repository root)/i,
  );
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-root-scope-'));
  try {
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repo });
    execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: repo });
    execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: repo });
    writeFileSync(path.join(repo, 'README.md'), 'before\n');
    execFileSync('git', ['add', '--', 'README.md'], { cwd: repo });
    execFileSync('git', ['commit', '-q', '-m', 'fixture'], { cwd: repo });
    writeFileSync(path.join(repo, 'README.md'), 'after\n');
    writeFileSync(path.join(repo, 'unrelated-root.txt'), 'must stay out\n');
    const status = execFileSync('git', ['status', '--porcelain', '--', 'README.md'], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.match(status, /README\.md/);
    assert.doesNotMatch(status, /unrelated-root\.txt/);
    const diff = execFileSync('git', ['diff', '--', 'README.md'], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.match(diff, /README\.md/);
    assert.doesNotMatch(diff, /unrelated-root\.txt/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('build remediation contract confines snapshot paths and preserves deleted task files', () => {
  assert.match(
    loopReference,
    /validate task-derived paths as literal repository-relative files under approved task roots/i,
  );
  assert.match(loopReference, /reject(?:s)? traversal/i);
  assert.match(loopReference, /reject(?:s)?[\s\S]*dot paths?/i);
  assert.match(loopReference, /reject(?:s)?[\s\S]*directory paths?/i);
  assert.match(loopReference, /reject(?:s)?[\s\S]*Git magic pathspecs?/i);
  assert.match(
    loopReference,
    /deleted tracked task files[\s\S]*temporary-index\s+snapshots[\s\S]*stage their removals/i,
  );
  assert.match(loopReference, /validated_task_paths/i);
  assert.match(loopReference, /literal[\s\n]+argument/i);
  assert.match(
    loopReference,
    /approved task roots derive\s+exclusively from the plan(?:'s|’s) exact named paths/i,
  );
  assert.match(
    loopReference,
    /implementer(?:'s|’s) status[\s\S]*only discover(?:s)? files already beneath those roots/i,
  );
  assert.match(
    loopReference,
    /plan-named root file[\s\S]*(?:exact file|only itself|only approved root)[\s\S]*(?:not|never)[\s\S]*repository root/i,
  );
});

test('build remediation contract permits safe new artifact leaves', () => {
  assert.match(
    loopReference,
    /new artifact leaf[\s\S]*does not exist\s+yet[\s\S]*validate(?:d)? lexically/i,
  );
  assert.match(
    loopReference,
    /every existing ancestor[\s\S]*non-symlink directory[\s\S]*approved artifact root/i,
  );
  assert.match(
    loopReference,
    /create the leaf[\s\S]*without following a symlink/i,
  );
});

function artifactHelperSource() {
  const helper = loopReference.match(
    /python3 - (?:"\$repo_root" )?"\$destination" "\$staged_output" <<'PY'\n([\s\S]*?)\nPY/,
  );
  assert.ok(helper, 'the documented safe-artifact helper must be executable Python');
  return helper[1];
}

test('build remediation artifact helper accepts the normal task destination', () => {
  const helper = artifactHelperSource();
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-artifact-'));
  const artifactDirectory = path.join(repo, '.agent-sdlc', 'briefs', 'build-loop-efficiency');
  const destination = path.join(
    '.agent-sdlc',
    'briefs',
    'build-loop-efficiency',
    'T-4-normal-artifact.md',
  );
  const stagedOutput = path.join(repo, 'staged-artifact');
  try {
    mkdirSync(artifactDirectory, { recursive: true });
    writeFileSync(stagedOutput, 'normal artifact\n');
    execFileSync('python3', ['-', repo, destination, stagedOutput], {
      cwd: repo,
      input: helper,
      encoding: 'utf8',
    });
    assert.equal(
      readFileSync(path.join(repo, destination), 'utf8'),
      'normal artifact\n',
      'the helper must write the artifact at the documented task destination',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('build remediation artifact helper anchors writes to the repository root from a nested CWD', () => {
  const helper = artifactHelperSource();
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-root-'));
  const nestedCwd = path.join(repo, 'nested', 'cwd');
  const artifactDirectory = path.join(repo, '.agent-sdlc', 'briefs', 'build-loop-efficiency');
  const lookalikeDirectory = path.join(
    nestedCwd,
    '.agent-sdlc',
    'briefs',
    'build-loop-efficiency',
  );
  const destination = path.join(
    '.agent-sdlc',
    'briefs',
    'build-loop-efficiency',
    'T-4-nested-cwd-artifact.md',
  );
  const stagedOutput = path.join(repo, 'staged-artifact');
  try {
    mkdirSync(artifactDirectory, { recursive: true });
    mkdirSync(lookalikeDirectory, { recursive: true });
    writeFileSync(stagedOutput, 'repository-root artifact\n');
    execFileSync('python3', ['-', repo, destination, stagedOutput], {
      cwd: nestedCwd,
      input: helper,
      encoding: 'utf8',
    });
    assert.equal(
      readFileSync(path.join(repo, destination), 'utf8'),
      'repository-root artifact\n',
      'the helper must resolve the artifact beneath the held repository root',
    );
    assert.equal(
      existsSync(path.join(lookalikeDirectory, 'T-4-nested-cwd-artifact.md')),
      false,
      'a nested-CWD lookalike must not receive the artifact',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

function initialDiffSizeCheckSource() {
  const check = loopReference.match(/(if \[ ! -s "[^\"]+" \]; then[\s\S]*?\nfi)/);
  assert.ok(check, 'the documented initial diff size check must be executable Bash');
  return check[1];
}

test('build remediation initial diff check anchors reads at the repository root from a nested CWD', () => {
  const check = initialDiffSizeCheckSource();
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-initial-diff-root-'));
  const nestedCwd = path.join(repo, 'nested', 'cwd');
  const relativeDiff = '.agent-sdlc/briefs/build-loop-efficiency/T-8-review.diff';
  const rootDiff = path.join(repo, relativeDiff);
  const lookalikeDiff = path.join(nestedCwd, relativeDiff);
  try {
    mkdirSync(path.dirname(rootDiff), { recursive: true });
    mkdirSync(path.dirname(lookalikeDiff), { recursive: true });
    writeFileSync(rootDiff, '');
    writeFileSync(lookalikeDiff, 'lookalike review diff\n');
    assert.equal(readFileSync(rootDiff, 'utf8'), '', 'the authoritative review diff must be empty');
    assert.notEqual(readFileSync(lookalikeDiff, 'utf8').length, 0, 'the lookalike must be nonempty');

    const script = `
repo_root=$1
initial_diff_file=$3
stop_and_ask() { printf '%s\\n' "$1"; }
cd "$2"
${check}
printf 'reviewer-dispatched\\n'
`;
    assert.throws(
      () =>
        execFileSync('bash', ['-c', script, 'initial-diff-fixture', repo, nestedCwd, relativeDiff], {
          cwd: repo,
          encoding: 'utf8',
        }),
      'an empty root-anchored review diff must stop dispatch despite a nonempty nested lookalike',
    );
    assert.match(
      check,
      /\$repo_root\/\$initial_diff_file/,
      'the size check must read the artifact beneath the held repository root',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('build remediation artifact helper preserves all bytes and fails on a zero write', () => {
  const helper = artifactHelperSource();
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-bytes-'));
  const artifactDirectory = path.join(repo, '.agent-sdlc', 'briefs', 'build-loop-efficiency');
  const destination = path.join(
    '.agent-sdlc',
    'briefs',
    'build-loop-efficiency',
    'T-4-byte-artifact.bin',
  );
  const failingDestination = path.join(
    '.agent-sdlc',
    'briefs',
    'build-loop-efficiency',
    'T-4-zero-write.bin',
  );
  const stagedOutput = path.join(repo, 'staged-artifact');
  try {
    mkdirSync(artifactDirectory, { recursive: true });
    const expected = Buffer.from(Array.from({ length: 1024 * 1024 + 137 }, (_, index) => index % 251));
    writeFileSync(stagedOutput, expected);
    const shortWriteHelper = helper.replace(
      'import os\n',
      [
        'import os',
        '_real_write = os.write',
        '',
        'def short_write(fd, data):',
        '    return _real_write(fd, data[:max(1, len(data) // 2)])',
        '',
        'os.write = short_write',
        '',
      ].join('\n'),
    );
    execFileSync('python3', ['-', repo, destination, stagedOutput], {
      cwd: repo,
      input: shortWriteHelper,
      encoding: 'utf8',
    });
    assert.deepEqual(
      readFileSync(path.join(repo, destination)),
      expected,
      'the helper must preserve every staged byte despite short writes',
    );

    const zeroWriteHelper = helper.replace(
      'import os\n',
      ['import os', 'os.write = lambda fd, data: 0', ''].join('\n'),
    );
    assert.throws(
      () =>
        execFileSync('python3', ['-', repo, failingDestination, stagedOutput], {
          cwd: repo,
          input: zeroWriteHelper,
          encoding: 'utf8',
        }),
      'a zero-byte write must fail the artifact helper',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('build remediation artifact helper rejects unsafe destinations and existing leaf types', () => {
  const helper = artifactHelperSource();
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-unsafe-artifact-'));
  const artifactDirectory = path.join(
    repo,
    '.agent-sdlc',
    'briefs',
    'build-loop-efficiency',
  );
  const outsideDirectory = mkdtempSync(path.join(tmpdir(), 'build-remediation-outside-'));
  const stagedOutput = path.join(repo, 'staged-artifact');
  const runHelper = (destination, timeout = 2000) =>
    execFileSync('python3', ['-', repo, destination, stagedOutput], {
      cwd: repo,
      input: helper,
      encoding: 'utf8',
      timeout,
    });
  const rejects = (destination, timeout = 2000) =>
    assert.throws(
      () => runHelper(destination, timeout),
      `unsafe destination must be rejected: ${destination}`,
    );
  try {
    mkdirSync(artifactDirectory, { recursive: true });
    writeFileSync(stagedOutput, 'must not escape\n');

    rejects('.agent-sdlc/briefs/build-loop-efficiency/../escape.md');
    rejects('.agent-sdlc/briefs/build-loop-efficiency/:(glob)');
    rejects('outside-artifact.md');

    const regularLeaf = path.join(artifactDirectory, 'T-5-existing-regular.md');
    writeFileSync(regularLeaf, 'keep regular\n');
    rejects('.agent-sdlc/briefs/build-loop-efficiency/T-5-existing-regular.md');
    assert.equal(readFileSync(regularLeaf, 'utf8'), 'keep regular\n');

    const symlinkTarget = path.join(outsideDirectory, 'symlink-target');
    const symlinkLeaf = path.join(artifactDirectory, 'T-5-existing-symlink.md');
    writeFileSync(symlinkTarget, 'keep symlink target\n');
    symlinkSync(symlinkTarget, symlinkLeaf);
    rejects('.agent-sdlc/briefs/build-loop-efficiency/T-5-existing-symlink.md');
    assert.equal(readFileSync(symlinkTarget, 'utf8'), 'keep symlink target\n');

    const hardLinkTarget = path.join(outsideDirectory, 'hard-link-target');
    const hardLinkLeaf = path.join(artifactDirectory, 'T-5-existing-hard-link.md');
    writeFileSync(hardLinkTarget, 'keep hard link target\n');
    linkSync(hardLinkTarget, hardLinkLeaf);
    rejects('.agent-sdlc/briefs/build-loop-efficiency/T-5-existing-hard-link.md');
    assert.equal(readFileSync(hardLinkTarget, 'utf8'), 'keep hard link target\n');

    const fifoLeaf = path.join(artifactDirectory, 'T-5-existing-fifo');
    execFileSync('mkfifo', [fifoLeaf], { cwd: repo });
    rejects('.agent-sdlc/briefs/build-loop-efficiency/T-5-existing-fifo', 1000);

    rmSync(artifactDirectory, { recursive: true, force: true });
    symlinkSync(outsideDirectory, artifactDirectory);
    rejects('.agent-sdlc/briefs/build-loop-efficiency/T-5-ancestor-symlink.md');
    assert.equal(
      existsSync(path.join(outsideDirectory, 'T-5-ancestor-symlink.md')),
      false,
      'an ancestor symlink must not receive an artifact',
    );
  } finally {
    rmSync(repo, { recursive: true, force: true });
    rmSync(outsideDirectory, { recursive: true, force: true });
  }
});

test('build remediation artifact helper rejects special leaves without timing out', () => {
  const helper = artifactHelperSource();
  assert.match(loopReference, /special files?[\s\S]*normal nonzero/i);
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-special-artifact-'));
  const artifactDirectory = path.join(
    repo,
    '.agent-sdlc',
    'briefs',
    'build-loop-efficiency',
  );
  const destination = path.join(
    '.agent-sdlc',
    'briefs',
    'build-loop-efficiency',
    'T-6-special-artifact',
  );
  const stagedOutput = path.join(repo, 'staged-artifact');
  try {
    mkdirSync(artifactDirectory, { recursive: true });
    writeFileSync(stagedOutput, 'must not block\n');
    execFileSync('mkfifo', [path.join(artifactDirectory, 'T-6-special-artifact')], {
      cwd: repo,
    });
    let failure;
    try {
      execFileSync('python3', ['-', repo, destination, stagedOutput], {
        cwd: repo,
        input: helper,
        encoding: 'utf8',
        timeout: 1000,
      });
    } catch (error) {
      failure = error;
    }
    assert.ok(failure, 'a FIFO destination must be rejected');
    assert.notEqual(failure.code, 'ETIMEDOUT', 'FIFO rejection must not time out');
    assert.equal(failure.signal, null, 'FIFO rejection must not be signal-terminated');
    assert.equal(failure.status, 1, 'FIFO rejection must be a normal nonzero helper exit');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('build remediation contract declares the artifact helper runtime', () => {
  assert.match(loopReference, /python3 - .*staged_output/i);
  assert.match(developmentGuide, /build-host prerequisites[\s\S]*Python 3/i);
  assert.match(developmentGuide, /`python3`/i);
  assert.match(contributingGuide, /build-host prerequisites[\s\S]*Python 3/i);
  assert.match(contributingGuide, /`python3`/i);
  assert.doesNotMatch(packageManifest, /"(?:dependencies|devDependencies)"\s*:/i);
});

test('build remediation contract creates artifact leaves atomically without following symlinks', () => {
  assert.match(
    loopReference,
    /artifact leaf[\s\S]*atomic[\s\S]*no-follow[\s\S]*exclusive-create/i,
  );
  assert.match(loopReference, /O_NOFOLLOW/);
  assert.match(loopReference, /O_EXCL/);
  assert.match(loopReference, /O_CREAT/);
  assert.match(
    loopReference,
    /open(?:Sync)?[\s\S]*O_CREAT[\s\S]*O_EXCL[\s\S]*O_NOFOLLOW/i,
  );
});

test('build remediation contract protects every artifact path component from replacement races', () => {
  assert.match(
    loopReference,
    /open(?:s|ing)? and holds?[\s\S]*trusted artifact-root ancestors?[\s\S]*directory handles/i,
  );
  assert.match(
    loopReference,
    /resolv(?:e|es|ing) every child component[\s\S]*without following links/i,
  );
  assert.match(loopReference, /openat|dir_fd/i);
  assert.match(loopReference, /dir_fd\s*=\s*current_fd/);
  assert.doesNotMatch(loopReference, /openSync\(\s*destination/);
  assert.match(loopReference, /O_DIRECTORY[\s\S]*O_NOFOLLOW/i);
  assert.match(
    loopReference,
    /final leaf[\s\S]*relative to[\s\S]*(?:held|trusted) parent directory handle/i,
  );
  assert.match(
    loopReference,
    /fail closed[\s\S]*helper[\s\S]*(?:unavailable|cannot provide)/i,
  );
});

test('build remediation contract refreshes task paths and initializes remediation trees', () => {
  assert.match(loopReference, /initialize `previous_tree` from the initial snapshot/i);
  assert.match(
    loopReference,
    /after every\s+remediation[\s\S]*refresh(?:es|ed)? the validated task path set/i,
  );
  assert.match(
    loopReference,
    /refresh(?:es|ed)? the validated task path set[\s\S]*before .*snapshot/i,
  );
  assert.match(
    loopReference,
    /record(?:s|ing)? every remediation round[\s\S]*round findings file[\s\S]*remediation-only diff/i,
  );
  assert.match(loopReference, /T-N-remediation-round-<N>\.tree/);
  assert.match(loopReference, /previous_tree=\$next_tree/);
});

test('build remediation contract guards every artifact write and diff command', () => {
  assert.match(
    loopReference,
    /write_artifact\(\)[\s\S]*if ! "\$@" > "\$staged_output"; then[\s\S]*stop_and_ask/i,
  );
  assert.doesNotMatch(loopReference, /"\$@" > "\$destination"/);
  assert.match(
    loopReference,
    /write_artifact[\s\S]*initial_tree_file[\s\S]*initial_diff_file[\s\S]*round_diff_file/i,
  );
  assert.match(
    loopReference,
    /initial_diff_file[\s\S]*-s[\s\S]*stop_and_ask/i,
  );
  assert.match(
    loopReference,
    /failed artifact or diff write[\s\S]*stop(?:s)? reviewer dispatch/i,
  );
});

test('build remediation contract fails closed for unsafe artifacts and invalid snapshots', () => {
  assert.match(
    loopReference,
    /unsafe artifact\s+destination[\s\S]*fail closed[\s\S]*stop(?:s)?\s+(?:re-)?review(?:er)? dispatch/i,
  );
  assert.match(
    loopReference,
    /snapshot command failure[\s\S]*stop(?:s)?\s+(?:re-)?review(?:er)? dispatch/i,
  );
  assert.match(
    loopReference,
    /missing tree id[\s\S]*stop(?:s)?\s+(?:re-)?review(?:er)? dispatch/i,
  );
  assert.match(
    loopReference,
    /empty initial-review diff[\s\S]*stop(?:s)?\s+review(?:er)? dispatch/i,
  );
  assert.match(
    loopReference,
    /unchanged claimed fix[\s\S]*stop(?:s)?\s+(?:re-)?review(?:er)? dispatch/i,
  );
  assert.match(loopReference, /(?:each|every) failure branch[\s\S]*contract-test/i);
});

function git(repo, args) {
  return execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
}

function documentedSnapshotSource() {
  const pathHelper = loopReference.match(
    /(snapshot_task_tree_path\(\) \{[\s\S]*?\n\})\n\n(snapshot_task_tree\(\) \{)/,
  );
  assert.ok(pathHelper, 'the documented snapshot path helper must be executable Bash');
  const treeHelper = loopReference.match(/(snapshot_task_tree\(\) \{[\s\S]*?\n\})/);
  assert.ok(treeHelper, 'the documented snapshot tree helper must be executable Bash');
  return `${pathHelper[1]}\n${treeHelper[1]}`;
}

function createSnapshotFixture() {
  const repo = mkdtempSync(path.join(tmpdir(), 'build-remediation-snapshot-'));
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: repo });
  execFileSync('git', ['config', 'user.email', 'fixture@example.com'], { cwd: repo });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: repo });
  mkdirSync(path.join(repo, 'tasks'), { recursive: true });
  writeFileSync(path.join(repo, 'tasks', 'deleted.txt'), 'tracked before\n');
  writeFileSync(path.join(repo, 'tasks', 'changed.txt'), 'before\n');
  writeFileSync(path.join(repo, 'root-task.txt'), 'root before\n');
  writeFileSync(path.join(repo, 'unrelated.txt'), 'unrelated before\n');
  execFileSync('git', ['add', '.'], { cwd: repo });
  execFileSync('git', ['commit', '-q', '-m', 'fixture'], { cwd: repo });

  writeFileSync(path.join(repo, 'unrelated.txt'), 'unrelated staged\n');
  execFileSync('git', ['add', '--', 'unrelated.txt'], { cwd: repo });
  unlinkSync(path.join(repo, 'tasks', 'deleted.txt'));
  writeFileSync(path.join(repo, 'tasks', 'changed.txt'), 'after\n');
  writeFileSync(path.join(repo, 'root-task.txt'), 'root after\n');
  writeFileSync(path.join(repo, 'tasks', 'created.txt'), 'created\n');
  return repo;
}

test('build remediation snapshot rejects symlinked task paths outside the repository', () => {
  const source = documentedSnapshotSource();
  const repo = createSnapshotFixture();
  const outsideDirectory = mkdtempSync(path.join(tmpdir(), 'build-remediation-symlink-'));
  const indexDir = mkdtempSync(path.join(tmpdir(), 'build-remediation-index-'));
  const tempIndex = path.join(indexDir, 'index');
  const symlinkPath = path.join(repo, 'tasks', 'symlinked.txt');
  try {
    writeFileSync(path.join(outsideDirectory, 'outside.txt'), 'outside bytes\\n');
    symlinkSync(path.join(outsideDirectory, 'outside.txt'), symlinkPath);
    const script = `${controlledGitSource()}\n${source}
repo_root=$(pwd)
exec 9<"$repo_root"
repo_root_fd=9
tmp_index="$1"
validated_task_paths=(tasks/symlinked.txt)
if snapshot_task_tree >/dev/null 2>&1; then
  printf 'accepted\\n'
else
  printf 'rejected\\n'
fi
`;
    const result = execFileSync('bash', ['-c', script, 'symlink-fixture', tempIndex], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.equal(result, 'rejected\n');
  } finally {
    rmSync(indexDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(outsideDirectory, { recursive: true, force: true });
  }
});

test('build remediation snapshot rejects symlinked ancestor directories outside the repository', () => {
  const source = documentedSnapshotSource();
  const repo = createSnapshotFixture();
  const outsideDirectory = mkdtempSync(path.join(tmpdir(), 'build-remediation-symlink-'));
  const indexDir = mkdtempSync(path.join(tmpdir(), 'build-remediation-index-'));
  const tempIndex = path.join(indexDir, 'index');
  const linkedDirectory = path.join(repo, 'tasks', 'linked-directory');
  try {
    writeFileSync(path.join(outsideDirectory, 'outside.txt'), 'outside bytes\\n');
    symlinkSync(outsideDirectory, linkedDirectory);
    const script = `${controlledGitSource()}\n${source}
repo_root=$(pwd)
exec 9<"$repo_root"
repo_root_fd=9
tmp_index="$1"
validated_task_paths=(tasks/linked-directory/outside.txt)
if snapshot_task_tree >/dev/null 2>&1; then
  printf 'accepted\\n'
else
  printf 'rejected\\n'
fi
`;
    const result = execFileSync('bash', ['-c', script, 'symlink-fixture', tempIndex], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.equal(result, 'rejected\n');
  } finally {
    rmSync(indexDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
    rmSync(outsideDirectory, { recursive: true, force: true });
  }
});

test('build remediation snapshot and diff paths anchor at the repository root from a nested CWD', () => {
  const source = documentedSnapshotSource();
  const repo = createSnapshotFixture();
  const nestedCwd = path.join(repo, 'nested', 'conductor');
  const indexDir = mkdtempSync(path.join(tmpdir(), 'build-remediation-index-'));
  const tempIndex = path.join(indexDir, 'index');
  try {
    mkdirSync(nestedCwd, { recursive: true });
    const script = `${controlledGitSource()}\n${source}
repo_root=$1
nested_cwd=$2
tmp_index=$3
cd "$nested_cwd"
exec 9<"$repo_root"
repo_root_fd=9
validated_task_paths=(root-task.txt)
initial_tree=$(snapshot_task_tree) || exit 1
printf 'INITIAL\\n'
controlled_git diff --no-ext-diff --no-textconv HEAD "$initial_tree" -- "\${validated_task_paths[@]}"
printf 'END_INITIAL\\n'
printf 'root remediation\\n' >> "$repo_root/root-task.txt"
next_tree=$(snapshot_task_tree) || exit 1
printf 'REMEDIATION\\n'
controlled_git diff --no-ext-diff --no-textconv "$initial_tree" "$next_tree" -- "\${validated_task_paths[@]}"
printf 'END_REMEDIATION\\n'
`;
    const output = execFileSync(
      'bash',
      ['-c', script, 'nested-cwd-fixture', repo, nestedCwd, tempIndex],
      { cwd: repo, encoding: 'utf8' },
    );
    const initialDiff = output.match(/INITIAL\n([\s\S]*?)\nEND_INITIAL\n/);
    const remediationDiff = output.match(/REMEDIATION\n([\s\S]*?)\nEND_REMEDIATION\n/);
    assert.ok(
      initialDiff,
      `the initial diff must be emitted from the nested CWD, output: ${JSON.stringify(output)}`,
    );
    assert.ok(
      remediationDiff,
      `the remediation diff must be emitted from the nested CWD, output: ${JSON.stringify(output)}`,
    );
    assert.match(initialDiff[1], /root-task\.txt/);
    assert.match(remediationDiff[1], /root-task\.txt/);
  } finally {
    rmSync(indexDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});

test('build remediation snapshot fixture executes the documented snapshot procedure', () => {
  assert.match(loopReference, /throwaway-repository fixture/i);
  assert.match(loopReference, /real index, HEAD, and worktree remain unchanged/i);

  const repo = createSnapshotFixture();
  const indexDir = mkdtempSync(path.join(tmpdir(), 'build-remediation-index-'));
  const tempIndex = path.join(indexDir, 'index');
  try {
    const before = {
      head: git(repo, ['rev-parse', 'HEAD']),
      index: git(repo, ['write-tree']),
      stagedUnrelated: git(repo, ['show', ':unrelated.txt']),
      status: git(repo, ['status', '--porcelain']),
      worktree: git(repo, ['diff', '--binary']),
    };
    const script = `${controlledGitSource()}\n${documentedSnapshotSource()}
repo_root=$(pwd)
exec 9<"$repo_root"
repo_root_fd=9
tmp_index="$1"
validated_task_paths=(tasks/deleted.txt tasks/changed.txt tasks/created.txt)
snapshot=$(snapshot_task_tree) || exit 1
printf 'TREE=%s\\n' "$snapshot"
controlled_git diff --no-ext-diff --no-textconv HEAD "$snapshot" -- "\${validated_task_paths[@]}"
`;
    const output = execFileSync('bash', ['-c', script, 'snapshot-fixture', tempIndex], {
      cwd: repo,
      encoding: 'utf8',
    });
    assert.match(output, /^TREE=[0-9a-f]{40}\n/);
    const taskDiff = output.slice(output.indexOf('\n') + 1);
    assert.match(taskDiff, /deleted file mode/);
    assert.match(taskDiff, /tasks\/created\.txt/);
    assert.doesNotMatch(taskDiff, /unrelated\.txt/);
    assert.equal(git(repo, ['rev-parse', 'HEAD']), before.head);
    assert.equal(git(repo, ['write-tree']), before.index);
    assert.equal(git(repo, ['show', ':unrelated.txt']), before.stagedUnrelated);
    assert.equal(git(repo, ['status', '--porcelain']), before.status);
    assert.equal(git(repo, ['diff', '--binary']), before.worktree);
  } finally {
    rmSync(indexDir, { recursive: true, force: true });
    rmSync(repo, { recursive: true, force: true });
  }
});
