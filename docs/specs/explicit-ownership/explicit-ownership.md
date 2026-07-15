# explicit-ownership

## Brief

### Problem / intent

Two shipped defects share one class: **the owner of a thing is inferred from an incidental token
instead of carried explicitly**, so the wrong owner is silently assumed while every check stays
green.

**1. The checker infers block ownership from presentation, not identity.** `splitTopBullets`
(`checker/sdlc-check.mjs:528`) opens a per-id block only at `TOP_BULLET_RE = /^-\s+\*\*/`: a
column-0 bullet followed by bold. Every reader of per-id blocks inherits that constraint:
`extractAcVerification` (:378), `extractFieldTraces` (:555), and the untraced-marker scan (:702).
Measured across the five in-tree spec chains, counting criteria whose verification type the checker
resolves to a non-null value:

| Spec | Criteria defined | Verification type resolved |
| --- | --- | --- |
| `enforcement-spine` | 18 | 14 |
| `repo-setup` | 14 | **0** |
| `visual-aids` | 11 | **1** |
| `adoption-quickwins` | 7 | 7 |
| `spec-location-under-docs` | 6 | 6 |

The `visual-aids` result is the diagnostic one, and it disproves the "bulleted vs paragraph criterion
format" framing the source issue was filed under. Its `## Acceptance Criteria` section opens with a
terminology glossary written as top-level bullets. The last glossary bullet opens a block, nothing
after it matches, so that one block swallows the `### Criteria` subheading and all eleven criteria.
`ID_DEFINITION_RE` then takes the first bold-lead id in the blob (AC-1) as owner of everything in
it. AC-1 is classified correctly only by luck: it sits first, so the first `Verification type:`
declaration found happens to be its own. All eleven criteria declare their type in the source; the
parser can see one. **A single glossary bullet is enough to destroy criterion parsing regardless of
how the criteria themselves are formatted.**

The same mechanism in `## Plan` is the previously-banked plan-bullet trap: a bolded content bullet
inside T-1's body opened a block that swallowed the rest of the section, collapsing all four tasks'
trace fields onto T-2 (every one reporting the same line) while `sdlc-check` printed
`all checks passed - 0 findings, 0 notes` and exited 0. It bit an operator who knew about it, was
warned about it in the task brief, and was watching for it.

**2. The build loop omits identity from the brief path.** `build/reference/subagent-loop.md` names a
subagent brief `.agent-sdlc/briefs/T-N.md`. That path carries no feature identifier, so every
feature's `T-1` resolves to the same file. Writing a new build's `T-1.md` silently overwrites the
previous feature's record; not overwriting it and dispatching by path hands a subagent the wrong
feature's task. The read side is worse than the write side: a stale `T-N-findings.md` or
`T-N-review.diff` from a prior feature is indistinguishable, by path, from this feature's, and a
fixer brief is built from it. This is live in the working tree today: `repo-setup`'s flat `T-1`
through `T-8` set sits beside `visual-aids`' workaround subdirectory.

### Scope

- Anchor block ownership to **identity**: a block opens at a line-start id definition and closes at
  the next definition or the next subheading, whichever comes first.
- Scope the build's brief path by feature.
- Regression coverage over the criterion formats both shipped spec styles use.

### Non-goals

- **A corroboration rule cross-checking a task's trace field against its coverage-map row.**
  Originally the larger half of this feature and ratified as such; **withdrawn at the gate** on its
  own evidence. See "Withdrawn scope" below. This is the single most important thing to read before
  proposing it again.
- **Correcting shipped specs as errata.** Followed the corroboration rule and fell with it. No spec
  in `docs/specs/` is edited by this feature, so the immutable-snapshot lifecycle rule is untouched
  and needs no exception.
- **A multi-id-block rule.** The source issue's first-ranked fix; id-anchoring makes the state it
  detects unreachable by construction, so the rule would guard a condition that cannot arise.
- **A brief front-matter guard.** The path carries the identity once scoped; a second rule for the
  same defect fails the rules-ratchet convention.
- **Reformatting existing specs.** The published grammar says ids are defined at a bold-lead and has
  never required that bold-lead to also be a bullet. The code is wrong, not the specs.
- **A grammar-doc rewrite mandating bullets.** Same reason: id-anchoring makes the code match the
  contract already published, so the docs need clarification at most, not a new requirement.
- **A seeded-defect eval corpus.** This pool is evidence one is needed; it is SMA-405's checker half
  and the follow-up this work earns, not part of it.
- **Any change to how a trace field's value is captured.** Prose naming a field token is still
  scraped into a trace, and a coverage-map cell's prose parenthetical is still scraped into a link
  (`| AC-10 | T-8 (supersedes T-5) |` creates a link for the superseded T-5). Both are real and both
  are out of scope; recorded under "Known and unfixed".
- **Empanel's canonical-path collision** (SMA-527). Same root idea, different tool and repo.

### Withdrawn scope: the corroboration rule

The feature was ratified as two halves: id-anchoring, plus a rule reporting a task whose two link
sources (its own trace field, and the coverage-map row naming it) disagree. The Brief argued the
rule was "the more valuable half" because it addressed *why* the defect stayed invisible: forward
coverage is the **union** of the two sources, so either alone satisfies it and the map can mask a
lost field.

The gate falsified the rule on its own data. Recorded here rather than deleted, because the argument
for it is seductive and will be made again:

- **Its only two firings in the whole tree are false positives.** `enforcement-spine` T-2's field
  reads `AC-10 (and grounds AC-1/2/3)` and T-3's reads `grounds AC-3/5/6/13/14`. Both are
  **accurate**: "grounds" is a genuinely weaker relation than "advances", and each coverage map
  correctly records only the advancing links. The disagreement is an artifact of a capture
  limitation the checker's own source already documents, and the proposed remedy was to delete the
  true annotations so the parser would stop mis-reading them.
- **A third apparent firing did not exist at all.** `repo-setup` T-5 was counted as disagreeing; its
  field is `*Advances:* none.`, the established null marker, and its "disagreement" came from the
  prose in `| AC-10 | T-8 (supersedes T-5) |` being scraped into a link. The rule's own contract
  excludes it. The claim that three tasks disagreed was wrong; it was two, and both were spurious.
- **It is blind to the failure it was built for.** A task that loses its field entirely is
  indistinguishable from a task that legitimately carries links through the map alone, which is a
  sanctioned pattern. Replaying the motivating incident: three of the four corrupted tasks lost
  their field, so each looked map-only and stayed silent. The rule fires on one, and only because
  that task's field survived and bloated. It detects partial corruption, never the total loss its
  own justification names.

**If this is revisited, the option to weigh first is the one the original design never considered:
extend the grammar so a spec can state the weaker relation explicitly.** That makes the specs and
the rule correct simultaneously, instead of deleting true statements to satisfy a parser. Filed
against the same follow-up as SMA-405's checker half.

### Chosen approach

**Id-anchored block splitting.** A block opens at a definition site and closes at the next
definition site or the next subheading, whichever comes first.

Splitting on identity fixes both symptoms of defect 1 with one change, because both symptoms are one
mechanism. A glossary bullet defines no id, so it stops opening a block and stops swallowing the
criteria after it. A bolded content bullet inside a task body defines no id, so it stops opening a
block and stops stealing the tasks that follow. The plan-bullet trap dies as a consequence of the
root-cause fix rather than needing a rule of its own.

The subheading boundary is not a detail, and it was not in the first design: a probe showed that
anchoring on identity alone just relocates the swallowing, since the last id in a subsection then
absorbs every trailing line until the next definition site. See `## Tech Stack`.

**Alternatives considered.**

- *Id-anchoring plus a corroboration rule.* The ratified scope, withdrawn at the gate. See above.
- *All three fixes as the source issue filed them.* Rejected on the multi-id-block rule (unreachable
  under id-anchoring) and on the corroboration rule (falsified).
- *Document the bullet requirement and keep the parser.* Rejected: it makes every conformant spec
  wrong retroactively and contradicts the grammar the product already publishes.

### Resolved key decisions

| Decision | Resolution |
| --- | --- |
| Framing of the defect | Not an unsupported criterion format. Block boundaries key off a presentation token instead of the semantic one. The source issue's framing is superseded by the `visual-aids` evidence. |
| Block boundary | A definition site **or** a subheading closes a block. Probe-driven; identity alone was insufficient. |
| Corroboration rule | **Withdrawn at the gate** on its own evidence, after being ratified. See "Withdrawn scope". |
| Errata to shipped specs | Withdrawn with the rule. No spec is edited; ADR-0002 was drafted and then retracted unpublished. |
| SMA-602 scope | Path scoping only. No front-matter guard. |
| Ceremony | Full pipeline, one pool, both issues. Maintainer's call. |
| Tier | Full chain. Cross-cutting trigger fires: the change alters the parsing spine every downstream reader inherits. |

### Known and unfixed

Recorded so they are not re-discovered as new, and because two of them nearly drove this feature into
deleting correct information:

- **A trace field's value is captured to the first period,** so a parenthetical naming other ids
  (`AC-10 (and grounds AC-1/2/3)`) is read as citations. The checker's source already reasons that no
  clean terminator exists.
- **A coverage-map cell's prose is scraped for ids,** so `| AC-10 | T-8 (supersedes T-5) |` creates a
  link claiming the superseded T-5 advances AC-10. Verified benign across the tree today: no
  criterion in any chain is reached *only* by a scraped ref.
- **`enforcement-spine` AC-15 through AC-18 resolve to `null`** both before and after this change:
  they carry their type on a group subheading (`### Skill wiring (reviewer-checked)`) rather than
  per-criterion, and neither the declaration regex nor the keyword fallback reads a group heading.
- **`enforcement-spine` AC-14 is mis-classified today** as `reviewer-checked` while its own text and
  its verification-map row both say test-backed. This feature **fixes** it as a side effect; it is
  listed here because the fix is a behaviour change on a shipped spec, not a no-op.

### Glossary terms touched

`definition site`, `block owner`, `id-anchored block`. Added to `CONTEXT.md`. The `corroboration
rule` entry is retained there: the term is still the name of the withdrawn idea, and the
"Withdrawn scope" section above refers to it.

### ADRs

None. **ADR-0002 was drafted and retracted before publication**: it argued for correcting shipped
specs as errata rather than weakening the corroboration rule, and the gate showed its central
premise ("a record that was wrong on the day it shipped") was false for both cases. The reasoning is
preserved in `gate-report.md` finding H1. The remaining decisions do not meet the three-part test:
each is reversible, unsurprising given the evidence, and settled by measurement rather than
judgment.

## Acceptance Criteria

Relational terms this section hands to a mechanical rule are pinned in `CONTEXT.md`. One is
load-bearing enough to restate inline: a **definition site** is a line whose first non-whitespace
content, after an optional list marker, is a bold-lead id (`**AC-N**`, `**C-N**`, `**T-N**`);
indentation and list markers are presentation and never decide ownership.

Criterion ids are stable handles and are never renumbered. AC-5 through AC-8 were defined against the
withdrawn corroboration rule and are recorded under "Deferred" rather than reused.

### Block ownership (test-backed)

- **AC-1** — Given a section whose criteria are defined at definition sites carrying no list
  marker, each defined id's own trace fields and verification-type declaration are attributed to
  that id and to no other id. *(Verification type: **test-backed** — unit.)*
- **AC-2** — Given a bold-lead line that is not a definition site (a glossary term, a content
  bullet) placed before or between definition sites, every id defined after it retains ownership of
  its own trace fields and verification-type declaration. *(Verification type: **test-backed** —
  unit.)*
- **AC-3** — Given the spec chains in `docs/specs/`, no criterion's resolved verification type
  changes except where the change corrects a demonstrable mis-attribution, and every such correction
  agrees with that spec's own verification-map row. Falsifiable: exactly one correction is expected
  (`enforcement-spine` AC-14, resolved `reviewer-checked` today because its block absorbs the
  following `### Skill wiring (reviewer-checked)` heading, while its own text and its
  verification-map row both say test-backed). *(Verification type: **test-backed** — integration.)*
- **AC-4** — Given `repo-setup` (14 criteria) and `visual-aids` (11 criteria), whose criteria are
  defined at definition sites carrying no list marker, every criterion's verification type resolves
  to a non-null value. Measured before this change: 0 of 14 and 1 of 11. *(Verification type:
  **test-backed** — integration.)*

### Build brief path (reviewer-checked)

Justification: the deliverable is skill prose (Markdown instructions) that no cheap test harness can
execute; conformance is judged by reading the skill text against the criterion. Axis: **Spec
Conformance**.

- **AC-9** — Does the build skill's subagent-brief hand-off name a brief path that carries the
  feature identifier, so no two features resolve a given task id to the same file? Pass = the
  stated path is scoped by feature; fail = any brief path is feature-agnostic. *(Verification type:
  **reviewer-checked** — axis: Spec Conformance.)*

### Negative criteria

- **NC-1** — No rule cross-checking a task's trace field against its coverage-map row. Withdrawn at
  the gate; re-proposing it is a scope change requiring the "Withdrawn scope" section to be answered
  first.
- **NC-2** — No spec under `docs/specs/` is edited by this feature. The only in-tree behaviour change
  is AC-3's single classification correction, which changes no spec text.
- **NC-3** — No rule detecting a block that contains more than one id definition. Id-anchoring makes
  that state unreachable.
- **NC-4** — No guard refusing a brief whose front matter names a different feature. The scoped path
  carries the identity.
- **NC-5** — No new requirement, in any skill body, that a bold-lead id also be bulleted.
- **NC-6** — No change to how a trace field's value or a coverage-map cell is captured. Both scrape
  prose into citations; both are recorded under "Known and unfixed" and neither is fixed here.
- **NC-7** — No seeded-defect eval corpus. That is SMA-405's checker half and this work's follow-up.

### Verification map

| Criterion | Oracle kind / review axis |
| --- | --- |
| AC-1 | unit |
| AC-2 | unit |
| AC-3 | integration |
| AC-4 | integration |
| AC-9 | Spec Conformance |

### Deferred

Ids below are written unbolded on purpose: a bold-lead id is a *definition*, and a deferred criterion
must not re-enter the coverage set it was removed from.

- Criteria five, six and seven (`AC-5`/`AC-6`/`AC-7`) — the corroboration rule's behaviour (fires on
  disagreement, silent on agreement, silent on a single source). Deferred with the rule; see the
  Brief's "Withdrawn scope".
- Criterion eight (`AC-8`) — "every spec chain exits 0 under the checker". Deferred, and it was
  defective as written: every chain exits 0 **today**, so the criterion was satisfied before the work
  began and could not be advanced by any task. It only becomes falsifiable alongside a rule that can
  fail it.

### Glossary terms touched

`definition site` added to `CONTEXT.md` at the acceptance-criteria stage; `block owner` and
`id-anchored block` at the idea stage.

## Design

Fits the existing architecture: the enforcement spine is trusted committed code, the skills are
untrusted instructions, and the split between them is unchanged. No new component kind, no new
dependency, no new runtime.

With the corroboration rule withdrawn, the link-source extractor it required goes with it: nothing
else needs the two link sources kept apart, and an abstraction with no caller is a cost rather than
flexibility.

### Components

1. **block splitter** — Partitions a section's lines into blocks and names each block's owner. The
   single definition of what a block is and who owns it. Kind: a pure text-partitioning function
   inside the enforcement spine.

### Outside the checker (changed components)

1. **build skill text** — The subagent-brief hand-off that names where a task's brief lives.

### Contracts

**block splitter.** In: a section's body lines. Out: an ordered list of blocks, each carrying its
owner id, its start offset, and its lines. A block opens at a definition site and closes at the next
definition site **or the next subheading, whichever comes first**. Lines before the first definition
site, and lines after a subheading that opens no new block, belong to no block and are dropped.
Errors: never throws (the spine's standing never-throw contract on untrusted spec text); a body with
no definition site yields zero blocks, never a fabricated one.

The splitter **names the owner** rather than leaving each caller to re-derive it. Today three callers
independently run "first bold-lead id in the blob wins" over a block they were handed, which is the
exact step that mis-attributed every field to `T-2`. Once a block is anchored to the identity that
opens it, the owner is known at partition time and the three re-derivations disappear. This removes
the mis-attribution path structurally rather than by correcting each caller.

The subheading boundary is load-bearing: without it the last id in a subsection absorbs every
trailing line until the next definition site, which is how `enforcement-spine` AC-18 reached the
right classification from text belonging to the negative criteria. A boundary that stops at identity
but not at structure just relocates the swallowing. Probed, not assumed: see `## Tech Stack`.

**Consumers (unchanged contracts, corrected inputs).** `extractAcVerification`, `extractFieldTraces`
and `extractUntracedMarkers` each take the owner from the block instead of re-deriving it. Their
outputs keep today's shape; only the attribution they were given changes. The union relation
`buildTaskAcLinks` computes, and the forward and backward coverage rules that read it, are untouched
by this feature.

### Data flow and key state

Spec text arrives as lines, becomes sections, and the block splitter turns each section into owned
blocks. Three readers consume those blocks: the verification-type classifier, the trace-field
extractor, and the untraced-marker scan. All three inherit their notion of ownership from the
splitter and none of them re-derives it. The model those readers populate feeds the rules unchanged.

No state persists between invocations. The checker reads, decides, and prints; it never edits.

### Trust and failure boundaries

Spec text is **untrusted input**: it is hand-authored Markdown, and the spine's contract is that no
input shape may cause a throw. The block splitter is where untrusted text becomes structure, so that
boundary is where malformed input must degrade to "fewer blocks", never to an exception and never to
a fabricated owner. This feature adds no new trust boundary and moves none.

The failure mode that matters is the one this feature exists to remove: a reader silently attributing
a field to the wrong owner while every check passes. The splitter's failure mode after the change is
to yield **no** owner rather than a **wrong** one, which surfaces as a coverage finding rather than a
false green. Losing a block is loud; mis-owning one is silent, and that asymmetry is the point.

### Criterion to component map

| Criterion | Component |
| --- | --- |
| AC-1 | block splitter |
| AC-2 | block splitter |
| AC-3 | block splitter |
| AC-4 | block splitter |
| AC-9 | build skill text |

### ADRs created

None. ADR-0002 was drafted and retracted before publication; see the Brief.

### Glossary terms touched

None beyond those already recorded.

## Tech Stack

**No new products — reuses the declared stack** (green bar: `node --test checker/*.test.mjs`, exit
code read directly and never through a pipe; plus the canonical self-gate `node
checker/sdlc-check.mjs <spec>`, which must exit 0 on every shipped spec). Every component this
feature touches is an existing function inside the committed `checker/sdlc-check.mjs` (Node >= 22,
ESM, zero runtime dependencies) or existing skill prose. The in-stack fast-path applies: this one
declared claim satisfies the component-to-product link for both components at once.

### Load-bearing claims

**Claim: id-anchored block splitting does not regress the format that works today, and does not turn
the self-gate red.** The whole approach rests on it, and the Brief carried it here rather than
asserting it.

`verified-by-probe` -> [`probes/probe-output.txt`](probes/probe-output.txt), produced by
[`probes/probe-id-anchor.mjs`](probes/probe-id-anchor.mjs) (re-runnable: `node
docs/specs/explicit-ownership/probes/probe-id-anchor.mjs`). The probe re-implements both candidate
splitters and the three readers that consume them, then diffs old-versus-new classification and
task-owner attribution across all five in-tree spec chains.

**The probe falsified the claim as first designed, which is why it exists.** Anchoring on a
definition site alone changed `enforcement-spine` AC-18 from `null` to `reviewer-checked`: with no
`NC-N` bullet to bound it, AC-18's block swallowed the negative criteria and the verification map,
and the keyword scan found its answer in text belonging to other criteria. The right answer, by luck,
from the wrong text. That is the same failure the feature exists to remove, relocated rather than
fixed.

The design was refined in response: a block closes at a definition site **or a subheading**,
whichever comes first. Re-probed, that variant changes exactly one classification across all five
chains, and it is a correction the spec itself corroborates:

```
AC-3 adjudication: AC-14 reviewer-checked -> test-backed
                 | map row says "unit" => test-backed | CORRECTION (map corroborates)
VERDICT: variant B introduces no regression. Every changed classification is
         corroborated by the spec's own verification map.
```

Task-owner attribution is unchanged on every chain (9/9, 8/8, 4/4, 5/5, 5/5 distinct owners before
and after), so the fix reaches the mis-attribution path without disturbing specs that never hit it.

**The green-bar half of the claim was probed separately**, after the gate observed that classification
counts alone do not establish it: the refined splitter makes previously-invisible text visible
(`repo-setup` 0 -> 14 blocks, `visual-aids` 1 -> 11), and a newly-visible block could emit a trace
citing an id that does not exist, which is a finding and a red gate. Measured across all five chains:
the refined splitter yields **zero** newly-visible trace fields (32 -> 32, 24 -> 24, 12 -> 12,
15 -> 15, 15 -> 15) and therefore no new dangling citation, because the blocks it newly reveals are
criterion blocks, which carry declarations rather than trace fields. Forward-coverage links are also
preserved exactly (36/36, 23/23, 15/15, 11/11, 7/7). The self-gate stays green at T-1.

### Unverified / flagged

None. The one claim this feature rests on is probed on both halves.

### Glossary terms touched

None.

## Plan

Task ids are stable handles and are never renumbered. T-2 through T-4 were defined against the
withdrawn corroboration rule and are recorded under "Deferred" rather than reused.

### Tasks

- **T-1 — Block splitter: anchor blocks to identity and name the owner.** Change
  `checker/sdlc-check.mjs`: replace `TOP_BULLET_RE` with a definition-site match
  (`/^\s*(?:[-*+]\s+)?\*\*(AC|C|T)-(\d+)\b/`); rewrite `splitTopBullets` so a block opens at a
  definition site and closes at the next definition site or the next `###` subheading, whichever
  comes first, and so each returned block carries its owner id; update all three callers
  (`extractAcVerification`, `extractFieldTraces`, `extractUntracedMarkers`) to read the block's owner
  instead of re-deriving it with `ID_DEFINITION_RE`. All three callers move in this task because the
  returned shape changes and they are its only consumers. Extend `checker/parser.test.mjs` and
  `checker/integration.test.mjs`.
  *Failing test first:* a section whose criteria are defined without list markers classifies each
  criterion from its own block rather than yielding zero; a non-id bold-lead line placed before and
  between definition sites leaves every following id owning its own fields; a criterion's block stops
  at a following subheading rather than absorbing it; across the real chains in `docs/specs/`, every
  criterion of `repo-setup` and `visual-aids` resolves a verification type (0 of 14 and 1 of 11
  today); and no other chain's resolved type changes except `enforcement-spine` AC-14 to test-backed,
  asserted explicitly against its verification-map row. Pin the regression half's expected values
  from `probes/probe-output.txt`, which was produced **before** the change: a golden table generated
  from the post-change run would assert only that the code agrees with itself.
  *Advances:* AC-1, AC-2, AC-3, AC-4. *Component:* block splitter. *Deps:* none.
- **T-5 — Build brief path: carry the feature identifier.** Change
  `skills/build/reference/subagent-loop.md`: scope the subagent-brief hand-off path by feature
  (`.agent-sdlc/briefs/<feature>/T-N.md`) at all three places it names a brief path (the dispatch
  hand-off, the review-diff capture, and the findings hand-back), so no two features resolve a given
  task id to the same file. Prose only; no checker involvement, since briefs are ephemeral build
  scratch rather than spec.
  *Verification (prose):* re-read the changed hand-off against AC-9, confirming every brief path it
  names is feature-scoped and none remains feature-agnostic.
  *Advances:* AC-9. *Component:* build skill text. *Deps:* none.

### Task-to-criterion coverage map

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-1 |
| AC-2 | T-1 |
| AC-3 | T-1 |
| AC-4 | T-1 |
| AC-9 | T-5 |

### Deferred

Ids below are written unbolded on purpose: a bold-lead id is a *definition*, and a deferred task must
not re-enter the coverage set it was removed from.

Tasks two, three and four (`T-2` link-source extractor, `T-3` spec errata, `T-4` corroboration rule)
are deferred with the withdrawn rule. `T-3` additionally rested on a false premise: two of its three
named erratum targets were accurate records the parser mis-reads, and the third never disagreed at
all.

### Notes

- **The plan-bullet trap is still live while this plan is executed.** It is what T-1 fixes. Until
  T-1 lands, any task body here that grew a column-0 bold bullet would silently reassign its trace
  fields to a neighbour and the checker would still print all-checks-passed. Verify this section by
  dumping traces and asserting distinct owners per task, never by reading the exit code.
- **The two tasks are independent** and may land in either order. Each leaves the suite and the
  self-gate green on its own; T-1's green-bar safety is probe-verified in `## Tech Stack`.
- **The green bar is `node --test checker/*.test.mjs`**, exit code read directly and never through a
  pipe, plus `node checker/sdlc-check.mjs <spec>` exiting 0 on every chain in `docs/specs/`.
