# Debugging — stop the line (fixer discipline)

When something unexpected happens — a test that will not go green, a build error, a regression in the
baseline — stop adding behaviour and triage. Errors compound: a second task built on a broken first
multiplies the cost of finding the cause.

## Stop the line

The moment a task does not behave as the plan expects, halt forward progress. Do not start the next
behaviour, do not wire around the failure. Fix the line before it moves.

## The triage

1. **Reproduce reliably.** Get a deterministic failing case. An intermittent failure you cannot
   reproduce is not yet understood.
2. **Localize.** Which layer, which file, which call? Narrow it before theorizing.
3. **Reduce.** Strip the case to the minimal input that still fails. The minimal case usually names
   the cause.
4. **Fix the root cause, not the symptom.** A patch that makes the test pass without explaining the
   failure is a future regression. If you cannot say *why* it failed, you have not fixed it.
5. **Guard.** Add (or keep) a test that reproduces the original failure so it cannot return. This is
   where debugging rejoins `tdd.md`.
6. **Verify end-to-end.** Run the full suite, read the output. Confirm the fix and confirm it broke
   nothing else.

## Regressions: bisect

If the baseline was green and a change broke it, find the change. `git log` / `git bisect` over the
task's commits beats guessing. The conductor's one-commit-per-task discipline makes the culprit easy
to isolate.

## When the fix will not converge

Bound the attempt (~2–3 cycles, per the subagent loop). If the task still will not go green, it is
**blocked**: record it in `build-report.md` with what you tried and the smallest failing case, and
raise it. A blocked task is surfaced, never deferred or forced. Often the real fix is upstream — an
unsettled plan or design — and belongs back in that stage, not in the diff.
