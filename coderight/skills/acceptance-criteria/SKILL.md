---
name: acceptance-criteria
description: "Turn a settled idea (problem + scope) into a checkable contract: a set of acceptance criteria that are each testable by a test AND checkable by a reviewer, plus a verification map. Use AFTER idea and BEFORE design. Triggers: 'acceptance criteria', 'define done', 'what does done mean', 'write the criteria', or any time you have a settled brief and need the contract the build will be held to. Stays tech-agnostic: WHAT and WHY, never HOW."
---

# Acceptance criteria: turn settled intent into a checkable contract

Take a settled idea and produce the contract that everything downstream is held to:
criteria that are each provable by a test or checkable by a reviewer, plus a map from each
criterion to the thing that proves it. This phase makes "done" unambiguous. It does not design,
choose a stack, plan, or build.

<HARD-GATE>
Input is the `## Brief` section of `specs/<feature>/<feature>.md` (settled intent + scope). Output
is the `## Acceptance Criteria` section of the same file and nothing else. Stay tech-agnostic: criteria state
WHAT must be true and WHY, never HOW (no architecture, no stack, no API names, no code). Do NOT
write design, techstack, plan, tasks, or code. If drafting criteria exposes a fuzzy or unsettled
problem, STOP and loop back to idea rather than papering over it. The terminal action is an
approved acceptance-criteria artifact handed to the design stage.
</HARD-GATE>

## The criterion bar (the whole game)

A candidate is a real acceptance criterion only when it passes all five. Everything else in this
skill is structure around getting each one here.

1. **Atomic** one claim, so a test asserts one thing and a reviewer renders one verdict. If it
   has an "and", split it.
2. **Observable** has a concrete given/when/then (or equivalent), so there is something to drive
   and something to point at.
3. **Falsifiable with a named oracle** you can state what would make it fail, and name what
   decides. For a test, the oracle is an assertion; for a reviewer, it is the criterion text plus
   intended shape. If you cannot name what falsifies it, it is not a criterion yet.
4. **Quantified where it claims a degree** "fast", "robust", "scalable", "secure" get a threshold
   or they are not criteria. No vague adjectives survive.
5. **In scope** bound to this feature. Aspirational creep becomes a non-goal, not a criterion.

## Verification type (every criterion carries one)

Tag each criterion as one of two, defaulting to test-backed:

- **test-backed** name the *kind* of oracle only at this stage: unit / integration / property /
  e2e / manual. Do NOT name concrete tests; test identity is the plan stage's job once a design
  exists. These feed the downstream spec-to-test coverage check.
- **reviewer-checked** name the review axis (e.g. Security, Spec Conformance, Architecture) and
  write out the explicit pass/fail question the reviewer answers. Allowed only with a one-line
  justification of why it cannot be cheaply automated. These feed the downstream Spec Conformance
  reviewer.

Reviewer-checked is a labeled exception, not an escape hatch. If you are reaching for it to dodge
a hard test, that is a red flag (see below).

## Checklist (do in order)

1. **Load the inputs** read the `## Brief` section of `specs/<feature>/<feature>.md`, the root
   `CONTEXT.md` glossary, and `constitution.md`. Confirm intent and scope are actually settled. If they are fuzzy, loop back
   to idea; do not invent intent here.
2. **Derive candidates** turn each distinct observable outcome implied by intent + scope into one
   candidate criterion. Prefer the codebase over guessing: if existing behavior answers a
   question, go read it.
3. **Grill each candidate to the bar** one at a time, leading with your recommended phrasing and
   the alternatives you considered, then let the user decide (the system-wide
   recommend-and-alternatives rule). Sharpen or split until it passes all five tests.
4. **Run the trimmed clarify sweep** scan only the criteria-relevant dimensions: non-functional
   thresholds, edge and error cases, completion signals, integration contracts, and hard
   constraints, plus a light ambiguity check (no vague adjectives, no unresolved TBDs). Ask at
   most a handful of targeted questions, one at a time, each with a recommended answer, and write
   accepted answers straight into the criteria. Do NOT re-litigate scope or terminology
   (idea owns those). Do NOT resolve UX flow or domain-model internals (design owns those).
5. **Quantify** replace every degree-claiming adjective with a threshold, or cut it.
6. **Assign verification type** tag each criterion test-backed (with kind-of-oracle) or
   reviewer-checked (with axis + pass/fail question + justification).
7. **Make non-goals checkable** restate the idea's non-goals as explicit negative criteria
   (out-of-bounds / won't-do) so over-engineering is itself a detectable violation.
8. **Build the verification map** one row per criterion: criterion -> kind-of-oracle, or
   criterion -> review axis. Every criterion appears exactly once.
9. **Settle and write** present the criteria in sections scaled to count, get approval, write the
   artifact.
10. **Hand off** tell the user it is ready for the design stage. Do not start design yourself.

## Principles

- **The bar is non-negotiable.** A criterion that fails any of the five tests is not done being
  written.
- **Recommend, don't just ask.** Every question carries your proposed answer and the alternatives,
  per the system-wide rule. The user decides.
- **Tech-agnostic.** WHAT and WHY only. The moment you reach for a class name or a library, you
  have drifted into design.
- **Code over questions.** If the repo answers it, read it instead of asking.
- **YAGNI.** A criterion the problem does not actually need is scope creep wearing a contract.
- **Loop, don't patch.** Criteria that will not settle usually mean the problem did not. Go back.
- **Criteria are a contract, not a wishlist.** Each one is something you would block a merge over.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "It's obviously testable, I'll skip naming the oracle." | If you cannot name what falsifies it, neither can the test author or the reviewer. Name it. |
| "'Fast enough' is clear from context." | It is not. A threshold or it is not a criterion. |
| "I'll make it reviewer-checked so I don't have to think about a test." | Reviewer-checked needs a justification for why it cannot be automated. Dodging effort is not one. |
| "This criterion covers several things, but they're related." | Related is not atomic. Split it; one verdict each. |
| "The design will clarify this criterion." | Backwards. Criteria are the contract design is held to. If a criterion needs the design to be meaningful, it is a design constraint, not an acceptance criterion. |
| "Let me also note the architecture here while it's fresh." | That is the next stage. Keep this tech-agnostic. |

## Red flags (stop and fix)

- A criterion with "and" in it, or that needs a paragraph to state.
- An adjective of degree with no number.
- More than a few criteria tagged reviewer-checked, or any tagged so without a justification.
- A criterion you could not point to a diff line for, or write a failing test against, even in
  principle.
- You are describing how it works, not what must be true.
- The verification map has a criterion with no oracle and no axis, or a criterion listed twice.

## Done when

- Every criterion passes all five bar tests.
- Every criterion carries a verification type with its oracle-kind or review-axis named.
- Non-goals are stated as negative criteria.
- The verification map is complete: each criterion mapped exactly once.
- Nothing in the criteria contradicts `constitution.md`.
- The user has approved the artifact.

## The artifact (output)

The `## Acceptance Criteria` section of `specs/<feature>/<feature>.md`, containing only:
- **Criteria** each with: ID (`AC-1`, `AC-2`, ...), the statement, verification type
  (test-backed + oracle-kind, or reviewer-checked + axis + pass/fail question + justification).
- **Negative criteria** the non-goals restated as out-of-bounds checks.
- **Verification map** criterion ID -> oracle-kind or review axis, one row each.
- **Deferred** any criterion explicitly postponed, with the reason.
- **Glossary terms touched** new or sharpened terms, mirrored into `CONTEXT.md`.

No design, no stack, no tasks. Those are later stages.

## Conventions

- Lives as the `## Acceptance Criteria` section of `specs/<feature>/<feature>.md`, between
  `## Brief` and `## Design`, kept out of the repo's product `docs/`.
- Criterion IDs (`AC-N`) are stable handles the design, plan, tasks, and verify gate all
  reference. Do not renumber; deprecate instead.
- Reads the `## Brief` section of the same file; resolves terms against root `CONTEXT.md` (or the
  right context if a `CONTEXT-MAP.md` exists).
- Downstream consumers: the design stage (built against these criteria), the verify gate (checks
  every criterion maps to a task), and the review panel (test-backed -> spec-to-test coverage;
  reviewer-checked -> Spec Conformance).
