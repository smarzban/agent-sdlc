# Simplicity — vertical slices and Rule-0 (implementer discipline)

Keep each task's change small, complete, and reversible. The plan already sized tasks to leave the
repo green; this discipline keeps the implementer honest while building one.

## Rule 0: simplicity first

Before writing, ask: **would a senior engineer look at this and say "why didn't you just…?"** If the
answer is plausibly yes, take the simpler path. The simplest change that satisfies the task's `AC-N`
and passes its test is the right one. Cleverness that the criteria did not ask for is a liability.

## Vertical slices, not horizontal layers

Build one complete path through the system, not a layer at a time. A task should leave a thin,
working slice end-to-end (the bit of schema + the bit of API + the bit of UI that one behaviour
needs), each step green — not "all the schema", then "all the API". The plan's task ordering already
expresses this; honour it.

## Scope discipline

- **Touch only the task's named files.** The plan named exact files for a reason. Wandering into
  adjacent code is how an atomic task stops being atomic and a clean commit turns into a tangle.
- **No drive-by refactoring.** See something untidy nearby? It is not this task. Note it; do not fix
  it in this commit. (A real, blocking mess routes back through the plan, not into the diff.)
- **No gold-plating.** If no `AC-N` asks for it, it is not in scope. Speculative generality is the
  opposite of YAGNI.

## Safe and reversible

- Keep the repo green after the increment — that is what makes the commit a safe save-point.
- Prefer changes that are easy to revert. One atomic commit per task means the worst case is dropping
  one increment, never untangling several.
- Where a behaviour is half-built across tasks and would otherwise break the build, guard it (a flag,
  a default) so every commit stays shippable.
