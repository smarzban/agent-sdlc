# Gate report: run-observability (re-gated after scope reduction)

Read-only gate over `docs/specs/run-observability/run-observability.md`. This is the **second** gate
on this chain. The first passed a much larger design; two pre-build consultations then found that
design unsound, and the chain was cut back to a marked, throwaway experiment. This gate is over the
reduced chain.

## What changed, and why

The first chain specified a durable measurement product: schema versioning, a repository keying rule,
cross-repository aggregation, a harvester, an import allowlist, structural privacy.

Two consultations before any code was written returned **7 Critical, 12 Important, 6 Minor** and an
independent second opinion on portability and the cost model. The decisive finding was not a defect
in any component: it was that the instrument as specified would ship and then produce a confidently
wrong conclusion, in the exact shape of the two wrong conclusions that motivated the feature. Its
cost columns would be measured, its quality columns would be the same agent narration under
suspicion, incomplete runs would silently drop out of aggregates, and the rendered table would carry
the authority of a committed instrument.

The scope was then reduced deliberately: this is throwaway instrumentation for a handful of runs on
our own machines, deleted afterwards. That reduction retires most of those findings by removing what
they attacked. What it does not retire are the four that attack the **conclusions**, and every one of
those is now a criterion:

| Consultation finding | Where it landed |
| --- | --- |
| Runs that fail never record an end, so aggregates flatter us | AC-2, AC-9 |
| Self-reported quality rendered beside measured cost reads as fact | AC-4, AC-8 |
| Round counts cannot separate task-size cost from review-round cost | AC-3, AC-7 |
| Wall clock at a boundary silently includes idleness | AC-10 |

The independent second opinion's sharpest point is also here: it argued the single worked example
supports "review-round cost dominates" at least as well as "task size drives cost", and that
separating them needs round-level timestamps rather than counts. That is AC-3, and it corrects a
generalisation made earlier in this repo's own reasoning from one decomposition.

## Chain coverage

| Criterion | Component | Product | Task(s) | Status |
| --- | --- | --- | --- | --- |
| AC-1 | recorder | Node >= 22 ESM (declared stack) | T-1 | traced |
| AC-2 | recorder | Node >= 22 ESM | T-1 | traced |
| AC-3 | recorder | Node >= 22 ESM | T-1 | traced |
| AC-4 | recorder | Node >= 22 ESM, git via fixed argv | T-1 | traced |
| AC-5 | recorder | line-delimited JSON | T-1 | traced |
| AC-6 | recorder | Node >= 22 ESM | T-1 | traced |
| AC-7 | summary | Node >= 22 ESM | T-2 | traced |
| AC-8 | summary | Node >= 22 ESM | T-2 | traced |
| AC-9 | summary | Node >= 22 ESM | T-2 | traced |
| AC-10 | summary | Node >= 22 ESM | T-2 | traced |
| AC-11 | summary | Node >= 22 ESM | T-2 | traced |
| AC-12 | gate, build and ship skill texts | Markdown prose | T-3 | traced |
| AC-13 | feedback note | Markdown prose | T-3 | traced |
| AC-14 | recorder, summary, feedback note | node:test | T-4 | traced |

Coverage is clean in both directions. The checker corroborates: exit 0, 0 findings, 0 notes.

## Findings

### F1 (Low, accepted): T-1 carries six criteria

*Location:* the Plan. *Owner:* plan.

Six criteria on one task is exactly the compound shape flagged as a cost driver elsewhere this week.
Accepted here on two grounds: they describe one program's behaviour rather than several concerns, and
the expected diff is a couple of hundred lines. Recorded so the acceptance is visible rather than
implicit. If T-1's review comes back long, that is the signal that this judgement was wrong.

### F2 (Low, resolved): the removal claim needed an oracle

*Location:* AC-14. *Owner:* acceptance-criteria.

"Everything is marked so removal is a grep" is the kind of promise that is true on the day it is
written and false three commits later. It now carries a test: the marker search returns every touched
file and nothing else. Throwaway code that cannot be found is not throwaway, it is residue.

## Constitution and convention checks

- **Rules-ratchet:** no checker rule, no grammar change, nothing added to the trusted half.
- **Fail-closed:** the recorder writes nothing on doubt and never blocks a stage.
- **No em-dashes** in the new spec text. Checked.
- **Placeholders:** none.
- **Scope honesty:** the chain states plainly that the deliverable is the answer, not the code.

## Risks noted, not findings

- **The experiment can still mislead, just less.** Labelling a column "claimed" does not make it
  true, and a reader determined to act on a self-reported zero can still do so. The mitigation is
  social rather than technical: the summary says what it cannot see, every time.
- **Instrumentation changes what it measures.** Every recorder call is a tool call in the run being
  timed. Small, and it inflates precisely the number under study. Worth checking against an
  unrecorded run rather than assuming.

## Verdict

**Ready to build.** Two findings, both Low, one accepted with its reason and one resolved. The chain
exits 0 under the checker and coverage is complete in both directions.
