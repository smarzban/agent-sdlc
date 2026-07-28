# Gate report: handoff-skill

Read-only consistency and coverage gate over `docs/specs/handoff-skill/handoff-skill.md`. Full-chain
entry (idea through plan in one session), so no provenance markers and no mid-chain-entry coverage
note.

## Chain coverage

| Criterion | Component | Product | Task(s) | Status |
| --- | --- | --- | --- | --- |
| AC-1 | handoff skill | Markdown prose (declared stack) | T-1 | traced |
| AC-2 | handoff skill | Markdown prose | T-1 | traced |
| AC-3 | handoff skill | Markdown prose | T-1 | traced |
| AC-4 | handoff skill | Markdown prose | T-1 | traced |
| AC-5 | handoff skill | Markdown prose | T-1 | traced |
| AC-6 | handoff skill | Markdown prose | T-1 | traced |
| AC-7 | handoff skill | Markdown prose | T-1 | traced |
| AC-8 | handoff skill | Markdown prose + strict-YAML frontmatter | T-1 | traced |
| AC-9 | handoff skill | Markdown prose | T-1 | traced |
| AC-10 | repo-setup skill text | Markdown prose + the seed marker | T-2 | traced |
| AC-11 | build skill text | Markdown prose | T-3 | traced |
| AC-12 | getting-started skill text | Markdown prose | T-4 | traced |
| AC-13 | ship skill text | Markdown prose | T-3 | traced |
| AC-14 | repo docs surface | Markdown prose | T-4 | traced |

Coverage is clean in both directions after the two findings below were resolved. The checker
corroborates: `node checker/sdlc-check.mjs docs/specs/handoff-skill/handoff-skill.md` exits 0 with 0
findings and 0 notes.

## Findings

### F1 (Medium, resolved): a compound criterion that could be half-met and still read as satisfied

*Location:* AC-11 as originally written. *Owner:* acceptance-criteria.

AC-11 asserted both hooks at once, the build-entry trigger and the ship park trigger, under one set
of conditions. The two sit at different stages, in different files, at opposite ends of a run, and
either can be implemented while the other is missed. A criterion that can be half-satisfied while
still reading as met is exactly the kind of thing this repo's checker cannot catch, because coverage
is structural: T-3 would have advanced AC-11, the chain would have walked clean, and a missing ship
hook would have surfaced only in review, if at all.

Split: AC-11 is now the build-entry hook, AC-13 the ship park hook, with the reason stated inline so
they are not re-merged later. T-3 advances both.

### F2 (Medium, resolved): an orphan component, and an undeclared deliverable

*Location:* the criterion-to-component map versus T-4's component field. *Owner:*
acceptance-criteria.

T-4 named `repo docs surface` as a component and the Design listed it among the changed components,
but no criterion mapped to it: the usage page was a deliverable no criterion held the build to. Under
this repo's own docs convention every user-facing skill carries a usage page and the coverage ledger
must close, so the page is required rather than optional, and a required deliverable with no
criterion is how something ships half-done and passes.

The checker does not catch this class: it verifies that a cited component exists, not that every
component is reached by a criterion. This is the walk earning its keep.

Added AC-14, mapped to `repo docs surface`, advanced by T-4.

## Constitution and convention checks

- **Rules-ratchet:** no new checker rule, no new grammar, nothing added to the trusted half. NC-1
  states it explicitly.
- **Stranger litmus:** AC-9 exists precisely because the personal tooling this idea came from
  hardcodes a vendor configuration directory and a private remote. It is stated falsifiably (a
  search), not as an aspiration.
- **Self-containment:** no skill body may cite this repo's spec ids or spec-tree paths; AC-9 covers
  it for the new skill, and the four edited skills inherit the standing rule.
- **No em-dashes** in the new spec text. Checked.
- **Unresolved placeholders:** none. The one number left open at the idea stage (the prune ceiling)
  is now bounded by AC-3's structure-and-content trigger, so an exact line count is an authoring
  detail rather than an open decision.

## Ordering check

T-1 first, since the discipline must exist before anything points at it. T-2, T-3 and T-4 depend only
on T-1 and are independent of each other, so they can run concurrently. T-1 is deliberately large:
its nine criteria are one document's internal coherence, and splitting them would mean reviewing a
discipline in pieces that only make sense whole.

## Risk noted, not a finding

T-1's size makes it the task most likely to come back with review findings, and the criteria it
carries are all reviewer-checked, so its quality bar rests on the review rather than on a suite. The
build should expect a fix round there and should not treat a clean first pass as confirmation.

## Verdict

**Ready to build.** Two findings raised and resolved in-flight, both Medium, both structural rather
than textual. No finding remains open, the chain exits 0 under the checker, and coverage is complete
in both directions.
