# Gate report: checker-silence-eval

Read-only consistency and coverage gate over `docs/specs/checker-silence-eval/checker-silence-eval.md`.
Full-chain entry (idea -> acceptance-criteria -> design -> techstack -> plan in one session), so no
provenance markers and no mid-chain-entry coverage note.

## Chain coverage

| Criterion | Component | Product | Task(s) | Status |
| --- | --- | --- | --- | --- |
| AC-1 | coverage-cell link extractor | Node >= 22 ESM (declared stack) | T-3 | traced |
| AC-2 | coverage-cell link extractor | Node >= 22 ESM | T-3 | traced |
| AC-3 | coverage-cell link extractor | Node >= 22 ESM | T-3 | traced |
| AC-4 | coverage-cell link extractor | Node >= 22 ESM | T-3 | traced |
| AC-5 | coverage-cell link extractor | Node >= 22 ESM | T-3 | traced |
| AC-6 | seed corpus | `node:test` (declared stack) | T-1 | traced |
| AC-7 | seed corpus | `node:test` | T-1 | traced |
| AC-8 | seed corpus | `node:test` | T-1 | traced |
| AC-9 | coverage-cell link extractor, seed corpus | `node:test` | T-4 | traced |
| AC-10 | plan skill text, acceptance-criteria skill text | Markdown prose | T-5 | traced |
| AC-11 | repo-setup spec chain | Markdown prose | T-2 | traced |

Coverage is clean in both directions: every criterion is advanced by at least one task, every task
advances at least one criterion, and every component named by a task exists in the Design. The
checker corroborates: `node checker/sdlc-check.mjs docs/specs/checker-silence-eval/checker-silence-eval.md`
exits 0 with 0 findings and 0 notes.

## Findings

### F1 (Critical, resolved before the verdict): AC-9's falsifiable claim was false

*Location:* AC-9. *Owner:* acceptance-criteria.

AC-9 named the links the fix deletes: `AC-14 -> T-11`, `AC-14 -> T-12`, `AC-10 -> T-5`,
`AC-11 -> T-5`. Measured against the real corpus before the change, the actual deletions are
`T-12 -> AC-13`, `T-12 -> AC-14`, `T-5 -> AC-10`, `T-5 -> AC-11`.

The error was in the T-11 half. T-11 is cited inside two parentheticals
(`T-3, T-5 (write side: T-11)` on AC-5, `T-7 (write side: T-11, T-12)` on AC-14), so it looked like
it would lose those links, but T-11 carries its own advances-field naming both criteria, and the link
set is a union. T-12 is the one whose two links exist ONLY as map-derived scrapes.

This is the failure mode the whole feature exists to remove, committed by the spec that proposes the
fix, and caught only because the criterion was written to be falsifiable rather than plausible. AC-9
now carries the measured numbers (`enforcement-spine` 36 -> 34, `repo-setup` 23 -> 21) and the
"nothing is added" direction.

### F2 (Important, resolved): the spec's own prose scraped into a trace

*Location:* AC-9 (original wording). *Owner:* acceptance-criteria.

AC-9's prose contained the literal token `*Advances:* AC-14` while quoting how T-11 keeps its field.
The checker read it as a real trace field on AC-9's block and reported a dangling citation, since
AC-14 is not defined in this chain. Reworded to name the criterion in words.

Recorded rather than merely fixed: it is a live instance of NC-7 (a trace FIELD's value is scraped
from prose), the sibling of the coverage-cell defect being fixed here, and it argues the follow-up
grammar work is real. It is already a seeded case in T-1's corpus by way of the third historical
defect.

### F3 (Important, resolved): a wrapped component field did not resolve

*Location:* T-1's `*Component:*` field. *Owner:* plan.

`*Component:* seed corpus.` was line-wrapped between the two words, so the field's captured value was
`seed\n  corpus`, which resolved to no component and was reported as dangling. Rewrapped so each
task's trace fields sit on one line.

Worth noting as a usability observation rather than a defect to fix here: the capture is
newline-naive, and the author-visible symptom (a dangling component that plainly exists) does not
point at line wrapping. Out of scope, and not seeded, since it is a capture-shape issue rather than a
silence issue: the checker was loud and correct.

### F4 (Advisory, accepted): this chain does not exercise its own edge case

*Location:* the Task-to-criterion coverage map. *Owner:* plan.

Every coverage cell in this plan is a plain comma-separated list, so the chain never exercises the
parenthetical case it fixes. Accepted and recorded in the plan's Notes: the edge cases belong in the
seeds, and writing an artificial parenthetical into this plan purely to self-exercise would put a
fabricated annotation into the record.

## Constitution and convention checks

- **Rules-ratchet:** one new note on an existing rule path, no new rule. The mentioned-not-linked
  note attaches to the coverage-map arm that already exists.
- **No em-dashes** in the new spec text (the feature's own files). Checked.
- **Fail-closed direction:** the extractor's degradation yields fewer links, so ragged input surfaces
  as a coverage finding rather than a fabricated link.
- **Immutability:** AC-11's erratum edits a shipped chain. Sanctioned by `AGENTS.md`'s exemplar-chain
  framing (`01d6f91`), scoped to one line, and justified in the Brief: it replaces a fabricated link
  with the truth, the inverse of the errata that sank the corroboration rule.
- **Unresolved placeholders:** none. No TBD, no TODO, no "decide later" in any section.

## Ordering check

The plan's ordering is load-bearing and holds: T-1 (eval, coverage-cell seed recorded as an expected
miss) -> T-2 (erratum, so `repo-setup` never goes red) -> T-3 (the fix, which forces the seed's
disposition to move) -> T-4 (real-corpus assertions) -> T-5 (grammar publication and ADR). Every
commit is green, and the expected-miss ledger's second direction fires under real conditions at T-3
rather than in a hypothetical.

## Verdict

**Ready to build.** Three findings were raised and resolved in-flight (F1 Critical, F2 and F3
Important), one advisory accepted. No finding remains open, the chain exits 0 under the checker, and
coverage is complete in both directions.
