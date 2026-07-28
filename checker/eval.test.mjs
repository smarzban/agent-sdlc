// The seeded-defect eval (T-1): the apparatus that scores checker SILENCE, not just checker
// reports. Every seed is a minimal inline spec fixture (per plan Notes: no committed fixture
// files, matching parser.test.mjs's convention) carrying one deliberately planted defect, plus a
// stated disposition:
//   - detected: sdlc-check must report a finding naming the defect. A checker that stops detecting
//     it fails this suite.
//   - expected-miss: sdlc-check is known NOT to report it today, for a stated reason, asserted in
//     BOTH directions: not detected today, and the assertion fails the day it starts being
//     detected, so the ledger cannot silently rot either way.
//
// The Design's contract for this component (checker-silence-eval) says a seed carries its fixture
// text, its disposition, and a short description of the real incident, ONE entry per seed. SEEDS
// below is that ledger: the fixture and the assertion live on the same object, so a seed can never
// be listed with no test behind it and a test can never assert something its own disposition
// disagrees with. A single loop drives the per-seed tests from this array.
//
// The completeness test is written first, against SEEDS = [] (watch it fail), then the corpus is
// filled in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSpec,
  checkForwardCoverage,
  checkBackwardCoverage,
} from './sdlc-check.mjs';

// --- The ledger: every seed's disposition and its own fixture and assertion, in exactly one of --
// --- two states -----------------------------------------------------------------------------
//
// A seed is `{ name, incident, detected, expectedMissReason, fixture, assert }`. `detected` is a
// plain boolean and `expectedMissReason` is either `null` or a non-empty string, never both
// truthy, never both falsy. `assert(fixture)` is the seed's own proof: it parses the fixture and
// asserts the finding-shaped (or, where no finding-shaped path exists, parse-shaped) consequence
// that discriminates the defect. The completeness test below is the sole reader of the disposition
// fields; the loop beneath it is the sole reader of `fixture` and `assert`.
const SEEDS = [
  {
    name: 'block-ownership-coverage',
    incident:
      'the block-splitter mis-attribution: a bold-lead line that is not a definition site (a ' +
      'glossary/content bullet) absorbed a following criterion\'s trace fields, so a criterion ' +
      'cited only there was wrongly counted as reached.',
    detected: true,
    expectedMissReason: null,
    // Discriminates on formatting: AC-2's only citation sits on a bold-lead line that is NOT a
    // definition site (a glossary/content bullet, before any real task definition opens a block),
    // so no task actually advances AC-2. Under the old "first bold-lead id in the blob wins"
    // re-derivation this stray field could be handed to whichever task's block absorbed it; under
    // the id-anchored splitter a non-definition bold-lead line before the first definition site
    // owns nothing, and its field is correctly dropped, so `checkForwardCoverage` must report a
    // coverage-forward finding naming AC-2. Task T-1 is deliberately written marker-less
    // (`**T-1 — First.**`, no leading `- `): with a `- ` list marker the pre-fix splitter also
    // dropped the glossary bullet and this seed would not discriminate (verified by probe against
    // the pre-fix splitter, 683cea1^). If this fixture is ever reformatted to add a marker to T-1,
    // it must keep this property or be re-verified against the pre-fix code.
    fixture: [
      '## Acceptance Criteria',
      '- **AC-1** — first criterion.',
      '- **AC-2** — second criterion, cited only inside a non-definition bullet below.',
      '',
      '## Plan',
      '- **Ownership** — a glossary bullet, not a definition site, carrying a stray *Advances:* AC-2.',
      '  mention, before any real task definition.',
      '',
      '**T-1 — First.** Detail. *Advances:* AC-1. *Component:* none. *Deps:* none.',
    ].join('\n'),
    assert: (fixture) => {
      const m = parseSpec(fixture, 'x.md');
      assert.equal(m.ok, true, 'fixture must itself parse cleanly');
      const findings = checkForwardCoverage(m);
      const hit = findings.find((f) => f.rule === 'coverage-forward' && f.ids.includes('AC-2'));
      assert.ok(hit, 'expected a coverage-forward finding naming AC-2');
      assert.equal(hit.type, 'finding');
    },
  },
  {
    name: 'coverage-cell-scrape',
    incident:
      'a coverage-map cell like "T-1 (supersedes T-2)" scrapes T-2 out of the parenthesized span ' +
      'and counts it as a link, fabricating backward coverage for a task that advances nothing.',
    detected: false,
    expectedMissReason:
      'the coverage-cell link extractor does not yet strip parenthesized spans before counting ' +
      'links (T-3 fixes this); today the parenthetical is scraped and counted as a real link.',
    // Discriminates on the parenthetical: T-2 is cited only inside the parenthesized span of AC-1's
    // coverage-map cell, and T-2's own field is `*Advances:* none.`, so T-2 genuinely advances
    // nothing and a coverage-backward finding naming T-2 would be correct. Today's checker scrapes
    // T-2 out of the parenthetical and counts a link, so no finding fires. Pinned to the actual
    // scrape mechanism, not just its absence: T-2 must be a defined id, and the map-row trace off
    // AC-1 must list T-2 in `refs` (the fabricated link is the miss's mechanism). If either of
    // those stops holding (T-2 no longer defined, or the extractor stops scraping the
    // parenthetical), this assertion fails loudly rather than passing for the wrong reason. T-3
    // must move this seed to `detected`: that is the ledger's second direction firing under real
    // conditions.
    fixture: [
      '## Acceptance Criteria',
      '- **AC-1** — first criterion.',
      '',
      '## Plan',
      '',
      '**T-1 — Supersedes T-2.** Detail. *Advances:* none. *Component:* none. *Deps:* none.',
      '',
      '**T-2 — Superseded.** Detail. *Advances:* none. *Component:* none. *Deps:* none.',
      '',
      '### Task-to-criterion coverage map',
      '',
      '| Criterion | Advanced by |',
      '| --- | --- |',
      '| AC-1 | T-1 (supersedes T-2) |',
    ].join('\n'),
    assert: (fixture) => {
      const m = parseSpec(fixture, 'x.md');
      assert.equal(m.ok, true, 'fixture must itself parse cleanly');
      assert.ok(
        m.ids.some((i) => i.kind === 'T' && i.id === 'T-2'),
        'T-2 must be a defined task id for the scrape to be exercised',
      );
      const row = m.traces.find((t) => t.from === 'AC-1' && t.kind === 'map-row');
      assert.ok(row, 'expected a map-row trace from AC-1');
      assert.ok(
        row.refs.includes('T-2'),
        'expected miss mechanism: the parenthetical "(supersedes T-2)" must be scraped into the ' +
          'map-row refs today',
      );
      const findings = checkBackwardCoverage(m);
      const detectsT2 = findings.some((f) => f.type === 'finding' && f.ids.includes('T-2'));
      assert.equal(
        detectsT2,
        false,
        'expected miss: T-2 is (wrongly) treated as backward-covered today via the scraped ' +
          'parenthetical; this must flip to true once the coverage-cell link extractor strips ' +
          'parentheses before linking',
      );
    },
  },
  {
    name: 'verification-type-absorption',
    incident:
      'the enforcement-spine AC-14 incident: a criterion\'s block absorbed the following "###" ' +
      'heading and drew its verification type from it, resolving reviewer-checked when the ' +
      'criterion\'s own text said test-backed, so the type-dependent rule never ran against it.',
    detected: true,
    expectedMissReason: null,
    // Discriminates on block ownership, not the proof-evidence rule (checkProofEvidenceLinkage
    // never touches parseSpec and cannot exercise this defect; that rule is already covered by
    // checker/rules.test.mjs, verified by probe against a copy of the checker with the
    // SUBHEADING_RE stop removed from splitOwnedBlocks). AC-1 declares neither verification type in
    // its own text (the keyword-fallback form: no explicit "Verification type:" declaration), and
    // is followed by a "### … (reviewer-checked)" subheading in the same section, with AC-1 left
    // unreached by any task. Under the fixed, id-anchored splitter, AC-1's block stops at the
    // subheading, the keyword fallback finds nothing in AC-1's own text, and
    // model.acVerification.get('AC-1') is null, so checkForwardCoverage's unreached-AC finding
    // carries no reviewer-checked hint. If the absorption defect returns (the block-splitter no
    // longer stops at a "###" heading), the heading's "reviewer-checked" text is absorbed into
    // AC-1's block, the keyword fallback misreads AC-1 as reviewer-checked, and the hint appears:
    // this is exactly the AC-14 incident, expressed through an existing, exported, finding-shaped
    // observable with no new checker API.
    fixture: [
      '## Acceptance Criteria',
      '- **AC-1** — a criterion whose own text names neither verification type.',
      '',
      '### Reviewer notes (reviewer-checked)',
      '',
      'Illustrative reviewer commentary, not part of AC-1\'s own declaration.',
      '',
      '## Plan',
      '',
      '**T-1 — Unrelated.** Detail. *Advances:* none. *Component:* none. *Deps:* none.',
    ].join('\n'),
    assert: (fixture) => {
      const m = parseSpec(fixture, 'x.md');
      assert.equal(m.ok, true, 'fixture must itself parse cleanly');
      assert.equal(
        m.acVerification.get('AC-1'),
        null,
        'AC-1 declares neither type in its own block; the following subheading must not be ' +
          'absorbed into it',
      );
      const findings = checkForwardCoverage(m);
      const hit = findings.find((f) => f.rule === 'coverage-forward' && f.ids.includes('AC-1'));
      assert.ok(hit, 'AC-1 is unreached by any task and must still be reported');
      assert.ok(
        !hit.message.includes('reviewer-checked'),
        'the reviewer-checked carrying-task hint must not appear: it would only appear if the ' +
          'following subheading\'s text were absorbed into AC-1\'s own block',
      );
    },
  },
  {
    name: 'fence-blindness',
    incident:
      'a bold-lead id inside a fenced code block (e.g. an illustrative spec example) opens a real ' +
      'owned block exactly as a genuine definition site would, and, since the first occurrence of ' +
      'an id wins, can pin the wrong verification type from fenced example text.',
    detected: false,
    expectedMissReason:
      'pre-existing, no in-tree chain triggers it, and fence-tracking would be a new rule this ' +
      'feature deliberately does not add (see docs/specs/checker-silence-eval NC-2).',
    // Discriminates on fence-awareness: a fenced, purely-illustrative `**AC-1**` line opens a real
    // owned block exactly as a genuine definition site would. Since the first occurrence of an id
    // wins (extractAcVerification), the fenced example's declared type is pinned over the real
    // definition's own declared type below it. The parse-fact form is used here (not a
    // finding-shaped one, unlike verification-type-absorption above) because no rule reacts to a
    // type mismatch by itself: fence-awareness is out of scope (NC-2), so there is no rule-shaped
    // observable to assert on, only the mis-resolved type itself. That type also flows into
    // checkForwardCoverage's hint whenever the real AC-1 is left unreached, so the visible wrong
    // consequence is included as a second assertion, not just the silent parse fact.
    fixture: [
      '## Acceptance Criteria',
      '',
      'Example: a fixture line can look like this:',
      '',
      '```',
      '**AC-1** — Example inside a fence, purely illustrative. Verification type: **reviewer-checked**.',
      '```',
      '',
      '**AC-1** — The real criterion, test-backed. Verification type: **test-backed**.',
    ].join('\n'),
    assert: (fixture) => {
      const m = parseSpec(fixture, 'x.md');
      assert.equal(m.ok, true, 'fixture must itself parse cleanly');
      assert.equal(
        m.acVerification.get('AC-1'),
        'reviewer-checked',
        'expected miss: fence-blindness pins the wrong type from the fenced example (first ' +
          'occurrence wins); this must read test-backed once the splitter becomes fence-aware, and ' +
          'this assertion must fail then',
      );
      const findings = checkForwardCoverage(m);
      const hit = findings.find((f) => f.rule === 'coverage-forward' && f.ids.includes('AC-1'));
      assert.ok(hit, 'AC-1 is unreached by any task in this fixture and must be reported');
      assert.ok(
        hit.message.includes('reviewer-checked'),
        'expected miss, visible consequence: the mis-pinned type makes AC-1 pick up the ' +
          'reviewer-checked carrying-task hint even though the real definition says test-backed; ' +
          'this must stop once the splitter becomes fence-aware',
      );
    },
  },
];

test('AC-8: every seed states exactly one disposition, detected or expected-miss with a non-empty reason', () => {
  assert.ok(SEEDS.length > 0, 'the corpus must not be empty');
  for (const seed of SEEDS) {
    assert.equal(
      typeof seed.detected,
      'boolean',
      `${seed.name}'s detected field must be a plain boolean`,
    );
    const isDetected = seed.detected === true;
    const isExpectedMiss =
      typeof seed.expectedMissReason === 'string' && seed.expectedMissReason.trim() !== '';
    assert.notEqual(
      isDetected,
      isExpectedMiss,
      `${seed.name} must be in exactly one disposition state (detected, or expected-miss with a reason), never neither or both`,
    );
    if (seed.detected) {
      assert.equal(
        seed.expectedMissReason,
        null,
        `${seed.name} is detected and must not also carry an expected-miss reason`,
      );
    } else {
      assert.equal(
        typeof seed.expectedMissReason,
        'string',
        `${seed.name} is not detected and must carry a stated expected-miss reason`,
      );
      assert.notEqual(
        seed.expectedMissReason.trim(),
        '',
        `${seed.name}'s expected-miss reason must not be empty`,
      );
    }
  }
});

// One loop drives every per-seed test from the ledger above: a seed's fixture and its assertion
// live on the same object, so a seed cannot be listed with no test behind it and a test cannot
// assert a disposition its own ledger entry disagrees with.
for (const seed of SEEDS) {
  const disposition = seed.detected ? 'detected' : 'expected-miss';
  test(`${seed.name} (${disposition})`, () => {
    seed.assert(seed.fixture);
  });
}
