# visual-aids

## Brief
<!-- source: linear SMA-586 · ingested 2026-07-14 -->

*Shaped 2026-07-14 (idea stage). Settled intent and scope only; criteria, design, and plan are
later sections.*

### Problem / intent

The front-half thinking stages (`idea`, `architecture-design`) can only talk. Some of what they
settle is inherently visual: component and data-flow shape, trust and failure boundaries, the
difference between two candidate structures. Prose makes the user rebuild that picture in their
head, and a picture rebuilt wrong is a design defect that survives into the plan, where it is
expensive.

The agent has no sanctioned way to say *"this is easier to see than to read"* and draw it. The gap
is narrow and specific: communicating a settled or candidate **shape** while the thinking stages
are still thinking. It is not about producing product UI, and not about the build half.

### Scope & non-goals

**In scope**

- One shared discipline deciding, per question, whether to draw at all: **the visual test**.
- Two kinds of **visual aid**:
  - a **spec diagram**: a diagram expressed in the spec's own text, living inline in the spec; and
  - a **scratch visual**: a standalone rendered page the user opens, for comparisons a text
    diagram cannot express.
- A just-in-time consent offer, before the first scratch visual only.
- Homes: `architecture-design` (primary, its content is the most visual) and `idea` (secondary,
  for framing options and scope).

**Non-goals**

- **An interactive companion.** No background process, no click-back selection, no live reload.
  Deferred; reasons under Chosen approach.
- **`techstack`.** Its comparisons are tabular, which the visual test routes to the terminal.
- **The build half.** `build` and `ship` produce no visual aids.
- **Product UI, mockup polish, look and feel.** The front half is deliberately tech-agnostic, so
  pixel-level design is out of character here and out of scope.
- **Any checker or grammar change.** A visual aid is an aid, not a spine artifact; the
  `AC-N -> C-N -> product -> T-N` chain is untouched.

### Chosen approach

A **two-kind visual aid** governed by one heuristic, with the kind deciding persistence.

Alternatives considered:

1. **In-spec diagrams only.** Simplest and fully portable, but cannot show two candidate shapes
   side by side, which is precisely where seeing beats reading. Too narrow.
2. **In-spec diagrams plus a standalone rendered page (chosen).** Covers both "draw the shape" and
   "compare the shapes". Needs only a file write and something to view it with, so it carries no
   runtime, no background process, and works wherever the pipeline works.
3. **The above plus an interactive companion** (click-to-select, live reload). Adds a real
   capability: the user clicks a choice and the agent reads it back. Rejected *for now*, not on
   principle. Its unique benefit is choosing among visual mockups, which a tech-agnostic front
   half barely does; it needs a background process kept alive per harness, so it would work fully
   on only some targets and degrade to option 2 on the rest; and the terminal already accepts
   "B" as an answer. Cheap to add later behind the same fallback discipline if real runs show it
   is missed.

### Resolved key decisions

- **The visual test decides whether to draw, per question, not per session.** *Would the user
  understand this better by seeing it than reading it?* A question merely *about* a visual topic is
  not automatically a visual question.
- **The kind decides persistence.** A spec diagram is text in the spec: committed, diffable,
  reviewable, and it rots visibly beside the prose it describes, so it is evidence for free. A
  scratch visual is a throwaway comparison aid and is never committed. Rule of thumb: **if the
  picture is worth keeping, it is a spec diagram.** This dissolves the per-run "should I save
  this?" judgment call rather than answering it.
- **Consent gates the scratch visual only.** A spec diagram costs the user nothing and never
  leaves the terminal, so asking permission to write one is pure ceremony. The offer exists
  because a scratch visual spends tokens and sends the user somewhere else to look.
- **The offer is just-in-time, not upfront:** made the first time a question genuinely reads
  better drawn, as a message of its own. A decline is honoured for the rest of the run.
- **A visual aid is a tool, not a mode.** Accepting the offer does not route every later question
  through a visual.
- **Degrade loudly, never silently.** Where the user cannot view a scratch visual, say so and fall
  back to a spec diagram or prose, consistent with the repo's existing invoke-if-present contracts.
- **State the discipline once.** Both stages share it rather than each carrying a copy, following
  the existing precedent for cross-stage discipline.
- **Inherited leaning, for `techstack` to ratify.** The source pre-settles the two kinds as a
  lightweight text diagram notation and a self-contained page. Naming those products is
  `techstack`'s call, not this stage's; recorded here so the leaning is not lost.

### Glossary terms touched

New: **visual aid**, **the visual test**, **spec diagram**, **scratch visual**. Captured in
`CONTEXT.md`.

### ADRs

None. Every decision above fails the three-part test (hard to reverse AND surprising without
context AND a real tradeoff). Deferring the interactive companion is explicitly cheap to revisit,
and the persistence and consent rules are prose rules, changed by editing them.

## Acceptance Criteria

*Written 2026-07-15 on the approved Brief; autonomous run (maintainer's word: approve and continue),
recommended phrasings adopted. The Brief's scope is settled and is not re-litigated here.*

*Clarify-sweep sharpening: the Brief's discipline is one artifact with three rules (the visual test,
the two kinds and their persistence, the consent gate). The criteria below hold the shipped prose to
each rule separately, because each fails independently.*

**Terms pinned inline** (the criteria turn on these; nothing mechanical consumes them, but a reviewer
and the author must read them the same way):

- **the discipline** = the single normative statement of the visual test, the two kinds and their
  persistence, and the consent gate.
- **stated once** = the discipline's normative content appears in exactly one document in the skills
  corpus. Another document may *name* the discipline and point to it; it may not restate its rules.
- **directs** = the stage's SKILL body instructs the agent to apply the discipline at a named step of
  that stage's own checklist, in the mandating form the contracts-in-body rule requires — not a bare
  link (an agent may legitimately never open a doc that is only linked).
- **the two homes** = the `idea` and `architecture-design` stages. Every other pipeline stage
  (`acceptance-criteria`, `techstack`, `plan`, `gate`, `build`, `ship`) is out of the homes.

### Criteria

**AC-1** — Single-source discipline: the discipline is stated once in the skills corpus, and every
other mention of it points to that statement instead of restating its rules.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does exactly one
document carry the discipline's normative content, with every other mention pointing to it?
Justification: restatement is a judgment on prose meaning, not string identity — a grep catches a
copied sentence but not a paraphrase.)*

**AC-2** — Both homes apply it: each of the two homes directs the agent to the discipline at a named
step of its own checklist.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does each of the two
stage bodies direct, as pinned above, rather than merely link? Justification: the difference between
mandating and linking is a reading of instruction force, not a string match.)*

**AC-3** — The pointer resolves: every reference to the discipline document from the skills corpus
resolves to an existing file at the cited path.
*(Verification type: **test-backed** — manual (mechanized link resolution over the corpus, run as a
command at ship). Note: the oracle is a command, not a suite test — a test file under `checker/`
would violate NC-4.)*

**AC-4** — The visual test governs per question: the discipline states the heuristic as re-applied at
each question, with a question merely *about* a visual topic explicitly not qualifying on that basis
alone.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is the test stated as
deciding per question, with the topic-alone guard present? Justification: a per-question-versus-
per-session reading is a semantic judgment over instruction prose.)*

**AC-5** — A tool, not a mode: the discipline states that producing one visual aid does not route
later questions through visuals.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does the discipline
deny visual momentum after an accepted offer? Justification: same — instruction-prose semantics, no
runtime.)*

**AC-6** — The kind decides persistence: the discipline states that a spec diagram lives inline in
the spec and is committed, and that a scratch visual is never committed.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is each kind's
persistence pinned to exactly one answer? Justification: prose-content judgment.)*

**AC-7** — Kind choice leaves no per-run judgment: the discipline resolves which kind applies by a
stated rule, so no "should I save this one?" decision remains open at run time.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: can a reader pick the
kind from the stated rule without a judgment call the discipline leaves unanswered? Justification:
"leaves a decision open" is a judgment about the rule's completeness, not a string check.)*

**AC-8** — Consent gates the scratch visual only: the discipline requires consent before the first
scratch visual and requires none for a spec diagram.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is consent required
for exactly the scratch visual, and not for a spec diagram? Justification: an exclusivity claim over
instruction prose.)*

**AC-9** — The offer is just-in-time: the discipline states the offer is made at the first question
that passes the visual test, as a message of its own, and never as an upfront ask at stage start.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is the offer bound to
the first passing question rather than to stage entry? Justification: conversational-flow constraint
in an instruction document.)*

**AC-10** — A decline is durable: the discipline states that a declined offer is honoured for the
remainder of the run and not re-asked.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is a decline scoped to
the run, with no re-ask path? Justification: same.)*

**AC-11** — Degrade loudly: the discipline states that where the user cannot view a scratch visual,
the agent says so and falls back to a spec diagram or prose — never silently skips.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is the fallback both
announced and specified, with silence excluded? Justification: consistency-of-prose judgment against
the repo's existing invoke-if-present contracts.)*

### Negative criteria (out of bounds — over-engineering is a violation)

**NC-1** — No interactive companion: no background process, no click-back selection, no live reload.
**NC-2** — No visual-aid instruction outside the two homes: `acceptance-criteria`, `techstack`,
`plan`, `gate`, `build`, and `ship` gain none.
**NC-3** — No product-UI content: no mockup polish, no look-and-feel guidance, no pixel-level design.
**NC-4** — No checker or grammar change: `checker/` is unmodified, its suite count is unchanged, and
the `AC-N -> C-N -> product -> T-N` chain is untouched.
**NC-5** — No runtime component: nothing executable, no dependency, no build step, no background
process. The feature ships as instruction prose only.

### Verification map

| Criterion | Oracle kind / review axis |
| --- | --- |
| AC-1 | reviewer-checked — Spec Conformance |
| AC-2 | reviewer-checked — Spec Conformance |
| AC-3 | test-backed — manual (mechanized link resolution) |
| AC-4 | reviewer-checked — Spec Conformance |
| AC-5 | reviewer-checked — Spec Conformance |
| AC-6 | reviewer-checked — Spec Conformance |
| AC-7 | reviewer-checked — Spec Conformance |
| AC-8 | reviewer-checked — Spec Conformance |
| AC-9 | reviewer-checked — Spec Conformance |
| AC-10 | reviewer-checked — Spec Conformance |
| AC-11 | reviewer-checked — Spec Conformance |

*Reviewer-checked density note: 10 of 11 — accepted deliberately, on the same grounds as the
`repo-setup` chain. This feature's entire product is instruction prose governing agent behaviour;
there is no runtime to drive and no materialized artifact to probe, so every criterion carries its
own justification. The one claim that can be driven mechanically (the pointer resolving) is
test-backed. A behavioural probe of the heuristic itself was considered and rejected: whether a given
question "reads better drawn" is a judgment, so such a probe would assert a non-deterministic
outcome and flake.*

### Deferred

None. The interactive companion is a scope non-goal (NC-1), not a deferred criterion — the Brief
records it as cheap to revisit if real runs show it is missed.

### Glossary terms touched

None new. The four terms this feature turns on (**visual aid**, **the visual test**, **spec
diagram**, **scratch visual**) were pinned in `CONTEXT.md` at the idea stage. **the discipline**,
**stated once**, **directs**, and **the two homes** are pinned inline above: they are scaffolding for
reading these criteria, not repo-wide vocabulary, so they do not earn a `CONTEXT.md` entry.
