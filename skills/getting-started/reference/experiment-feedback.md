# Experiment feedback: reporting a pipeline defect

> EXPERIMENT: run-observability. This note is part of the same throwaway experiment and is deleted
> with the rest of it. Stated once here; the stage skills point to this file rather than restating
> it.

A rare, evidence-bound channel for defects in the pipeline itself, running alongside the recorded
runs. Most runs write nothing here. That is the expected outcome, not a gap to fill.

## Run identity

Gate, build, and ship each invoke the recorder as separate sessions with no state passed between
them, so all three derive the same run identity from something all three already know: the
feature's own directory name in the spec tree (`docs/specs/<feature>/`, i.e. `<feature>` itself).
No coordination, no file to lose, no run-id argument to invent. Pass it as `--run <feature>` to
every recorder call for that run.

A second run of the same feature that must stay distinguishable from the first: the operator
appends a suffix (e.g. `--run <feature>-2`). The default, zero-effort form carries no suffix.

## What qualifies

Only these, and only when they actually happened during a run:

- A documented step of the pipeline was skipped, weakened, or worked around.
- A documented command failed.
- The docs said one thing and the tool did another.
- A step only worked the second way it was tried.

Nothing else qualifies. "This could be clearer" is not a report.

## The evidence rule

Cite the exact command, the exact error, or the exact line that was wrong. If you cannot cite one of
those three, do not write the item.

## Never write

- Praise.
- Feature wishes.
- Speculation about code you did not run.
- A recap of what went fine.

## Where

One markdown file per run, named by the run's identity:
`~/.agent-sdlc-experiments/run-observability/feedback/<run-id>.md`. Never the repository under
work, never any of its worktrees, never any path inside either. Never posted anywhere, never
committed, and never mentioned in a commit message.

## Writing nothing is expected

No qualifying item, no file at all: creating a file is not the default action of a run, it is what
happens only after a trigger above actually fired and its evidence is in hand. A channel full of
filler is a channel people stop reading, and that costs the reports that mattered.

## Item format

One short block per item, nothing more:

```
- Trigger: <skipped | weakened | worked-around | command-failed | docs-contradicted | second-try-only>
- Evidence: <the exact command, the exact error, or the exact quoted line>
- What happened: one or two sentences, tied directly to the evidence above
```
