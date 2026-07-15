# Gate report: explicit-ownership

**Current verdict (round 2, after re-scope): READY TO BUILD.** No Critical or High findings.
Round 1's verdict and findings are preserved below unedited: they are why the feature is now half
its original size, and the reasoning is the point. Jump to "Round 2" for the current state.

**Note on ids:** round 1's findings cite `NC-5` and `NC-6` under the round-1 numbering. The negative
criteria were renumbered during the re-scope (criterion and task ids were not), so those citations no
longer resolve to the cited content. Recorded rather than rewritten: this report is a dated record,
and silently re-pointing it would be the same class of edit round 1 rejected.

---

# Round 1: 2026-07-15

**Verdict: NOT READY TO BUILD.** Blocking: C1, C2, H1, H2, H3, H4.

Run 2026-07-15. Read-only: this gate modified no artifact other than this file. The chain was
authored in one pass by the agent that also gathered its evidence, so the walk was run twice: once
mechanically here, and once by an independent adversarial reviewer with no stake in the reasoning.
Most of what follows came from the second walk, which is the point of having had one.

## Chain coverage

| Criterion | Component | Product | Task(s) | Status |
| --- | --- | --- | --- | --- |
| AC-1 | block splitter | in-stack fast-path | T-1 | ok |
| AC-2 | block splitter | in-stack fast-path | T-1 | ok |
| AC-3 | block splitter | in-stack fast-path | T-1 | ok (but see M1) |
| AC-4 | block splitter | in-stack fast-path | T-1 | ok (but see H4) |
| AC-5 | corroboration rule | in-stack fast-path | T-4 | ok |
| AC-6 | corroboration rule | in-stack fast-path | T-4 | ok |
| AC-7 | link-source extractor, corroboration rule | in-stack fast-path | T-2 | **mis-traced (H3)** |
| AC-8 | in-tree spec chains | in-stack fast-path | T-3 | **not falsifiable as written (H2)** |
| AC-9 | build skill text | in-stack fast-path | T-5 | ok |

Coverage is clean in both directions: every criterion reaches a task, every task traces to a
criterion, every component is justified. The failures below are not gaps; they are false premises.

## Findings

### C1: Critical. The "three disagreeing tasks" claim is false; there are two.

*Location:* AC-8, Plan T-3, ADR-0002 Context. *Owner:* acceptance-criteria + plan + design (ADR).

Measured under both splitters, the relation disagrees on **two** tasks (`enforcement-spine` T-2 and
T-3). `repo-setup` T-5 does not: its field is `*Advances:* none.`, the checker's established null
marker, so it names zero links, and the Design's contract fires only when both sources "name at
least one link". T-5's apparent disagreement is an artifact of the coverage-map cell
`| AC-10 | T-8 (supersedes T-5) |`, whose prose parenthetical is scraped into a real link. T-5 is a
correctly-marked superseded task.

*Failure scenario:* T-3's builder finds two failures, not three, and either edits T-5 anyway
(violating NC-5) or rewrites `*Advances:* none.` into a claim that is simply false. ADR-0002's
licence to open `repo-setup` at all rests on a case that does not exist.

### C2: Critical. The rule is largely blind to the failure the Brief defines it against.

*Location:* Brief ("the coverage map masks total loss of the per-task trace") vs AC-7. *Owner:* idea.

AC-7 specifies that a task carrying only a coverage-map row reports nothing, because map-only is
sanctioned. But *total loss of a task's field is indistinguishable from map-only*. Replaying the
motivating incident (four tasks' fields collapsed onto T-2): T-1, T-3 and T-4 each lose their field
entirely, so each looks map-only and stays silent. Only T-2, whose field survived and bloated,
fires. The rule catches the incident by luck of where the bloat landed, and detects 1 of 4 corrupted
tasks. The Brief's claim that this rule makes the masking loud is not delivered by this design.

### H1: High. The errata delete accurate information; ADR-0002's premise is false.

*Location:* ADR-0002 Consequences, NC-6, Plan T-3. *Owner:* design (ADR) + idea.

`enforcement-spine` T-2's field reads `AC-10 (and grounds AC-1/2/3)` and T-3's reads
`grounds AC-3/5/6/13/14`. Both are **accurate**: "grounds" is a genuinely weaker relation than
"advances", and each coverage map correctly records only the advancing links. NC-6 itself concedes a
parser cannot know the difference. So both in-tree firings are false positives of a capture
limitation, and the erratum deletes a true annotation to satisfy the parser.

ADR-0002 asserts the errata correct "a record that was wrong on the day it shipped." **Both records
are right.** Its own narrow-precedent clause ("does not license rewriting a shipped spec to match
later thinking") forbids what it then does. PR #17 does not transfer: there the spec misdescribed
the artifact; here the spec is correct and the checker cannot read it. The ADR also offers a false
trichotomy (note / errata / weaken the relation) that omits the option which makes both the specs
and the rule correct: **extend the grammar to express the weaker relation**. And it rejects option
(c) as "the worst option" for tuning a relation until known failures fall outside it, while adopting
the mirror image: tuning the corpus until the known failures disappear.

### H2: High. AC-8 is already satisfied; T-3 cannot advance it.

*Location:* AC-8, coverage map row `AC-8 | T-3`. *Owner:* acceptance-criteria.

AC-8 reads "every spec chain in `docs/specs/` exits 0 under the checker". Verified: all six exit 0
today. A criterion true before the work begins cannot be advanced by a task, and T-3 quietly
substitutes a different test. AC-8 only becomes falsifiable once T-4 lands the rule, so it is a
constraint on T-4 mis-traced to T-3.

### H3: High. AC-7 is traced to T-2 but implemented and tested by T-4.

*Location:* criterion-to-component map, coverage map, T-2, T-4. *Owner:* plan.

AC-7 is rule behaviour. No rule exists at T-2, so T-2's test cannot assert it. T-4's own failing test
covers exactly AC-7's two cases, yet T-4's trace field names only AC-5 and AC-6.

### H4: High. The Brief's headline evidence table is wrong for `enforcement-spine`.

*Location:* Brief evidence table, AC-4. *Owner:* idea + acceptance-criteria.

The table reports `enforcement-spine` "18 of 18" under the header "AC verification types detected".
But `enforcement-spine` carries **zero** `Verification type:` declarations in source, and only 14 of
18 criteria resolve to a non-null type. "18 of 18" counts *blocks with an owner* (nulls included);
"0 of 14" and "1 of 11" count *declarations classified*. Two yardsticks in one row. The Tech Stack's
own flagged section (AC-15..AC-18 are null) contradicts the Brief directly. AC-4 inherits the error:
under AC-4's own metric, `enforcement-spine` is 0 of 0.

### M1: Medium. This spec's AC-3 declares `integration`; its verification map says `unit`.

*Owner:* acceptance-criteria. The internal-inconsistency class ADR-0002 licenses errata for, in the
spec authoring the licence, in the criterion that adjudicates corrections by map-row agreement.

### M2: Medium. Seam rot: the Brief still describes the pre-probe design.

*Owner:* idea. The subheading boundary appears only in Design, Tech Stack and Plan. The Brief's Scope
still says "a block opens at a line-start id definition", its Chosen approach still says "one
change", and its load-bearing claim is still worded "preserves 18-of-18", which variant B does not
do, and which is why AC-3 was reframed. A start-anywhere re-entry from the Brief rebuilds variant A.

### M3: Medium. The self-gate is never probed under the new splitter.

*Owner:* techstack. The probe measures classification and owner counts only; it never runs
`sdlc-check` under variant B. T-1 makes previously-invisible text visible (`repo-setup` 0→14 blocks,
`visual-aids` 1→11), and newly-visible blocks can emit traces with dangling citations, producing new
findings. This gate verified that forward-coverage links are preserved exactly on all five chains,
which is necessary but not sufficient: trace-integrity findings were not checked. On a feature whose
thesis is "the green bar is the real defect", not probing the green bar is the gap that matters.

### M4: Medium. T-2's second failing test is unwritable before the change and tautological after.

*Owner:* plan. "The union equals the flat relation" cannot be written before the refactor and is
trivially true after, since the flat relation is derived from the sources.

### L1: Low. The Brief and AC-4 say "three in-tree chains"; there are five (six with this one).

*Owner:* idea.

## Constitution check

`constitution.md` does not exist in this repo. Feature level does not require one, so this is
recorded rather than skipped: no MUST principles were available to check against, and nothing in the
chain was validated against project-wide guardrails because none are declared.

## Load-bearing claim check

One claim, tagged `verified-by-probe`, referencing `probes/probe-output.txt`, present and
well-shaped. Tag and shape are all this gate checks; it does not re-run the probe or authenticate its
truth. Note M3: the probe is real but does not cover the green bar the claim's own feature turns on.

## Checker corroboration

`node checker/sdlc-check.mjs docs/specs/explicit-ownership/explicit-ownership.md` -> exit **0**, 0
findings, 0 notes. Corroborated, and beside the point: the checker cannot see any of C1, C2, H1, H2
or H4, because each is a false premise stated in prose the checker does not evaluate. A clean
mechanical pass over a chain whose evidence table is wrong is a precise illustration of this
feature's own thesis.

## Verdict

**NOT READY TO BUILD.**

C1, H1, H2 and H4 are fixable in place by the owning stages. **C2 and H1 together warrant re-opening
the idea stage rather than patching.** If the corroboration rule's only two in-tree firings are false
positives of a known capture limitation, and the rule is blind to 3 of the 4 corrupted tasks in the
incident that justified it, then the ratified scope ("id-anchoring + corroboration rule") and the
Brief's claim that corroboration is "the more valuable half" both rest on evidence this chain's own
data does not support. The id-anchoring half is unaffected: it is probe-verified, its red steps are
genuine, and it fixes a measured defect.

---

# Round 2: 2026-07-15, after re-scope

**Verdict: READY TO BUILD.** No Critical, no High.

The maintainer took round 1's recommendation: the corroboration rule, the spec errata, the
link-source extractor, and ADR-0002 were withdrawn. What remains is id-anchored block splitting
(AC-1..AC-4, T-1) and the build brief path (AC-9, T-5). Withdrawn criterion and task ids are
deferred, not reused.

## Round 1 findings: disposition

| Finding | Disposition |
| --- | --- |
| C1 (false "three disagreeing tasks") | Resolved. No erratum claim survives; the Brief records the correction. |
| C2 (rule blind to total trace loss) | Resolved by withdrawal. The blindness is recorded verbatim in the Brief, not softened. |
| H1 (errata delete accurate information) | Resolved by withdrawal. The Brief states both records are accurate, and preserves the option ADR-0002 omitted (extend the grammar). |
| H2 (AC-8 satisfied before the work) | Resolved. Deferred, with the defect named in the Deferred entry. |
| H3 (AC-7 mis-traced to T-2) | Resolved. Deferred with the rule. |
| H4 (evidence table mixed two yardsticks) | Resolved and independently re-measured: 14/18, 0/14, 1/11, 7/7, 6/6 under one yardstick. |
| M1 (AC-3 declared integration, map said unit) | Resolved. |
| M2 (Brief described the pre-probe design) | Resolved in the Brief; a surviving instance in `CONTEXT.md` was found and fixed in round 2. |
| M3 (self-gate never probed under the new splitter) | **Resolved by direct measurement.** See below. |
| L1 ("three in-tree chains") | Resolved: five. |

## M3, closed by execution rather than argument

Round 2's reviewer did not accept the probe. It applied variant B to `splitTopBullets` in a scratch
copy of the checker and ran the real self-gate: **all six chains exit 0, 0 findings, 0 notes**, and
the existing suite regresses **zero** tests. It also re-derived the trace-field counts (32/32, 24/24,
12/12, 15/15, 15/15) and verified forward-coverage links **element-wise** rather than by count
(36/36, 23/23, 15/15, 11/11, 7/7: zero lost, zero gained). The sole classification change across
every chain is `enforcement-spine` AC-14, corroborated by its own map row.

Every remaining criterion was checked for the H2 defect (already-satisfied). All five are false today
and true after their task, AC-3 included.

## Round 2 findings

**Critical: none. High: none.**

- **M1: Medium (fixed in place).** `CONTEXT.md`'s `id-anchored block` entry still defined the
  falsified variant A ("runs to the next one", no subheading boundary) and said "line-start" where
  the design allows indentation. This mattered more than its severity suggests: `CONTEXT.md` outlives
  the spec (chains get pruned, per the 0.13.0 precedent), the criteria section explicitly delegates
  this term to it, and it is the one term not restated inline. The glossary would have permanently
  described the variant the probe rejected. Corrected, along with a withdrawn-marker on the
  `corroboration rule` entry (round 2 L1).
- **L2: Low (accepted, recorded above).** Negative-criterion ids were renumbered at re-scope while
  criterion and task ids were not, so round 1's `NC-5`/`NC-6` citations no longer resolve.
- **L3: Low (accepted).** The probe covers five chains; AC-3 quantifies over `docs/specs/`, now six.
  The reviewer verified the sixth independently (stable under variant B).
- **L4: Low (fixed in place).** T-1's regression assertion is a golden table that would be
  tautological if generated after the change; T-1 now pins its expected values to
  `probes/probe-output.txt`, produced before it.
- **L5: Low (accepted, pre-existing).** Id *definition* still matches anywhere in a line while
  block-opening is line-start-anchored, so an id defined mid-line would exist and own no block.
  Unreachable on all six chains today; noted because the feature's thesis is one definition of
  ownership.

## Checker corroboration (round 2)

`node checker/sdlc-check.mjs docs/specs/explicit-ownership/explicit-ownership.md` -> exit **0**, 0
findings, 0 notes. It earned its keep this round: the first re-scope draft wrote deferred ids as
bold-leads (`**AC-5**`), which re-defines them, and the checker returned 5 findings for criteria and
tasks that no longer exist. Fixed by writing deferred ids unbolded.

## Verdict

**READY TO BUILD.** Blocking findings: none.
