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
