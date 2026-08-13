---
name: build
description: "Execute a gate-passed plan: test-first, one green commit per task, until the branch is ready for pr-review. Light specs: implement without a per-task reviewer. Full specs: one implementer plus one initial review. Use AFTER the gate verdict is ready to build and BEFORE pr-review. Triggers: 'build', 'implement the plan', 'execute the tasks', a clean gate-report.md with a settled Plan. Scope: only within an Agent SDLC run. Conductor: it dispatches and gates; it writes product code only on the light path or a recorded subagent death."
---

# Build: plan to a green branch

Execute the `## Plan` test-first. Light specs skip the per-task reviewer; whole-change review is
`pr-review`. Full specs keep one initial independent review per task. One remediations pass, then stop
and ask. Do not open the PR.

<HARD-GATE>
Precondition: a **gate verdict of ready to build** for the plan in hand. Resolve the plan per
input-resolution. If no verdict exists, run `/agent-sdlc:gate` inline and proceed only on a clean
verdict. Output is product code on a feature branch, one atomic commit per task, and
`docs/specs/<feature>/build-report.md`. Terminal action: green branch handed to `/agent-sdlc:pr-review`.
</HARD-GATE>

## Light or full

- **Light** when the spec has no `## Design` / `## Tech Stack` (or the user said this is a light
  run). The conductor implements each `T-N` itself (or one implementer). **No per-task reviewer.**
- **Full** otherwise. One implementer + one initial reviewer per task. If that review blocks:
  one remediations pass on the same implementer, then stop and ask. No third reviewer round.

## The loop

1. **Precondition** resolve the plan; ingest an external plan first if needed (read
   [ingesting-plans](reference/ingesting-plans.md) now). Confirm a ready-to-build verdict.
2. **Isolate** worktree (existing isolation -> native tool -> `git worktree`). Run the green bar
   from `## Tech Stack` once. Greenfield missing paths are vacuously green. An unrunnable declared
   command is a techstack defect, not "red code". Pin implementer/reviewer types once; announce
   substitutions once in the ledger.
3. **Ledger** open `build-report.md` and resume from it plus `git log`. If a ledger already exists,
   run `sdlc-check docs/specs/<feature>/<feature>.md --require ledger` first (fail-closed; runtime
   absent -> announced degrade). If `HANDOFF.md` exists at the working-copy root, update it
   (handoff skill, hook-driven case). Never create that file here.
4. **For each `T-N` in dependency order** (dispatch mechanics:
   [subagent-loop](reference/subagent-loop.md)):
   a. Implement test-first: the failing test the plan named, then the minimal code. Light: you
      (or one implementer). Full: dispatch the implementer with a one-task file brief.
   b. **Full only:** one initial reviewer on the complete task-scoped diff. Light: skip.
   c. **Full only, and only if that review has Critical/Important findings:** one remediations
      pass (continue the same implementer). Then stop and ask. Do not start a third round.
   d. Stage the task, run the full green bar on that snapshot (see *Reading the green bar*).
      Capture `cmd > out.txt 2>&1; rc=$?`. Record per-test names from the file.
   e. One atomic commit: `feat(T-N): …`.
   f. Update the ledger: done, SHA, `AC-N`, fenced evidence from **your** run, not the
      subagent's count.
   g. Linear transition if enabled.

   Plan/reality mismatch: read [plan-amendments](reference/plan-amendments.md), stop the task,
   amend through `plan`, gate the delta. Scope or AC change: stop and ask.
   Subagent death: capture -> retry once fresh -> only then conductor-takeover, recorded.
5. **Hand off** when every task is done: `sdlc-check … --require ledger` again, then
   "branch ready, run `/agent-sdlc:pr-review`".

Disciplines for implementers: [tdd](reference/tdd.md), [source-driven](reference/source-driven.md),
[simplicity](reference/simplicity.md), [debugging](reference/debugging.md).

## Reading the green bar

- **Exit code unpiped.** `cmd | filter; echo $?` is the filter's status. Capture first
  (`cmd > out.txt 2>&1; rc=$?`).
- **Machine reporter over human summary.** Exit code, `# fail N`, vitest json `numFailedTests`.
  A reporter disagreement is investigated, never waved off as flake.
- **Record the form** in the ledger: command, exit code, machine counts.

## Principles

- **Light does not review per task.** `pr-review` runs Review panel on the whole change.
- **Full reviews once per task, not in a loop.** One remediations pass, then ask.
- **Test-first.** The plan named the failing test; write it first.
- **One task, one green commit.** The whole bar, isolated.
- **The ledger survives compaction.** Trust it and `git log` over memory.
- **Stop at a blocker.** Do not improvise past an unsettled plan.
- **Evidence is your captured run,** never a transcribed subagent summary.
- **Degrade loud.** No `node` at a checker point: say so in the ledger.

## Rationalizations

| Excuse | Rebuttal |
| --- | --- |
| "I'll add a reviewer on this light task, it's safer." | Light review is `pr-review`. A per-task reviewer is the cost we just removed. |
| "Write the code, test after." | The plan named the failing test. Write it first. |
| "Skip the green bar, pr-review will catch it." | A red commit compounds. Verify now. |
| "Another review round will finish it." | One remediations pass, then ask. Do not spin. |

## Red flags

- Per-task reviewer on a light spec.
- Third review round on a full spec.
- Code before a failing test.
- Done task with no SHA or no conductor-captured evidence block.
- Green bar read through a pipe or a human summary.
- Checker failed at resume or hand-off with no recorded override.

## Done when

- Every `T-N` is test-first, green, atomically committed.
- Light: no per-task reviewer ran. Full: one initial review per task, at most one remediations pass.
- `build-report.md` has every task done with SHA, `AC-N`, and captured evidence.
- Checker corroborated at resume (if any) and at hand-off, or an announced degrade is recorded.
- Hand-off to `/agent-sdlc:pr-review` is stated.

## The artifact (output)

- Product code: one reviewed-or-light, green commit per task.
- `docs/specs/<feature>/build-report.md` — ledger: Task / Status / Commit / AC advanced / Notes;
  per done task a `### T-N (@ \`SHA\`)` heading with a non-empty fenced evidence block that names
  tests; `## Deviations` for any plan delta or death/takeover.

## Checker grammar

- **Task ledger:** `## Task ledger` table, columns by header name (`Task`, `Status`, `Commit`,
  `AC advanced`, `Notes`). `done` triggers evidence and ledger-vs-git. First SHA-shaped token in
  `Commit` is the task's own commit.
- **Green-bar evidence:** one ``### T-N (@ `SHA`)`` heading per done task, at least one non-empty
  fenced block containing per-test names.
- **Ledger-vs-git:** that SHA exists, is reachable from HEAD, and the commit scope is exactly
  `feat(T-N): …`.

## Conventions

- Writes product code + `build-report.md`. Does not author front-half spec sections except
  materializing an ingested plan.
- `sdlc-check … --require ledger` at resume and hand-off. Never `--require verification-report`.
- Downstream: `/agent-sdlc:pr-review`.
