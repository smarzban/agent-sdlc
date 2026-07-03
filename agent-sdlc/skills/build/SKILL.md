---
name: build
description: "Execute a gate-passed plan autonomously: one fresh subagent per task, test-first, committing green between tasks, until the branch is ready to ship. Use AFTER the gate verdict is 'ready to build' and BEFORE ship. Triggers: 'build', 'implement the plan', 'execute the tasks', 'start building', or a clean gate-report.md with a settled `## Plan`. This is the conductor: it dispatches and gates, it does not write code itself."
---

# Build: conduct the plan into a green branch

Execute the `## Plan` task list without a human in the loop. For each task, dispatch a fresh
implementer subagent that writes the failing test first, then the minimal code; review the diff;
commit only when it is green. The skill is a conductor — it holds the task list and a resumable
ledger, and delegates every line of code to a subagent. The disciplines live in reference files the
subagents read, not here.

<HARD-GATE>
Precondition: a **gate verdict of ready to build** (no Critical or High findings) exists **for the
plan in hand**. The plan is resolved per the input-resolution rule
([input-resolution](../getting-started/reference/input-resolution.md)) — the `## Plan` section of
`specs/<feature>/<feature>.md`, or an external plan (a Linear issue set, a doc) materialized into
`## Plan` with a provenance marker first (see [reference/ingesting-plans.md](reference/ingesting-plans.md)).
If no verdict exists for that plan, **run `/agent-sdlc:gate` inline** and proceed only on a clean
verdict — never build on an unblessed chain, whatever the plan's source. Input is the `## Plan`
section (plus the sections it references) and the gate report. Output is product code on a feature branch, one atomic
commit per task, and `specs/<feature>/build-report.md` (the ledger). The terminal action is a green
branch handed to `/agent-sdlc:ship`. Do NOT open the PR — that is ship's job.
</HARD-GATE>

## The loop (the conductor's whole job)

1. **Precondition** resolve the plan (input-resolution rule); if it came from an external source,
   **ingest it first** — materialize `## Plan` + minimal trace links + the green bar, provenance-
   marked, then run `/agent-sdlc:gate` inline (mechanics in
   [reference/ingesting-plans.md](reference/ingesting-plans.md)). Confirm a ready-to-build verdict
   exists for the plan in hand. Proceed only on a clean verdict; else stop.
2. **Isolate** set up an isolated workspace (detect existing isolation → native worktree tool → `git
   worktree` fallback). Run the **green bar** once — the commands `## Tech Stack` declares (compile,
   test, lint, format-check): the baseline MUST be green before touching anything. **Vacuous-green
   exception (general rule):** if the green bar's target paths do not yet exist (a greenfield
   feature — nothing to compile or test yet), the baseline is **vacuously green**, not red — report
   it as such and proceed; the bar becomes binding from the first task that creates those paths
   onward. This is not a per-feature carve-out — do not re-derive it in a plan's Notes.
3. **Ledger** open `build-report.md`. If it already exists, resume from it plus `git log` — never
   re-run a task already marked done. Re-doing completed work is the most expensive failure here.
   **Before continuing, invoke the checker** (resume invocation point, AC-15):
   `node agent-sdlc/checker/sdlc-check.mjs specs/<feature>/<feature>.md --require ledger` (never
   `--require verification-report` at build — that artifact is ship's, T-12). Runtime present → run,
   interpret the exit code: 0 = corroborated, proceed; nonzero, or the checker crashing, is itself a
   failed check (fail-closed) — **stop-and-ask**, do not resume task work; any human override must be
   recorded in `build-report.md` (who/what, why continuing despite the failed check). Runtime absent
   → write an **announced degraded fallback** line into `build-report.md` now — never a silent skip.
4. **For each task `T-N`, in dependency order:**
   a. Dispatch the **implementer** subagent with a file brief for `T-N` only.
   b. Dispatch the **reviewer** subagent on the resulting diff.
   c. If the reviewer finds Critical/Important issues, dispatch a **fixer** and re-review (bounded).
   d. Verify the **green bar** is green — run the full declared set (compile, test, lint,
      format-check), read the output (verification-before-completion). Not just tests: lint or
      format drift caught now is a clean commit; caught later is a reactive scramble. **Capture this
      run** as the task's green-bar evidence — the command line(s) plus the output tail, verbatim.
   e. Commit: one atomic commit for the task, reflecting the reviewed code. Verify it compiles **in
      isolation** — run the bar against the staged snapshot (`git stash --keep-index
      --include-untracked` → bar → pop), not just the working tree: an under-staged commit can pass a
      working-tree check yet fail to build on checkout.
   f. Update `build-report.md`: `T-N` done, the commit SHA, the `AC-N` it advanced, and the captured
      green-bar evidence as a fenced block beside the task — from the first task onward, never
      deferred. This is the write side the checker's evidence-presence (AC-5) and
      name-appearance-linkage (AC-14) checks read: a test-backed proof-map row's cited test
      identifier must literally appear in this text (ADR-0001).
   g. If Linear sync is enabled in `.agent-sdlc/config.json`, transition `T-N`'s issue via the
      `linear-sync` skill.
5. **Hand off** when every task is done and green: **invoke the checker again** (build-complete
   invocation point, AC-15) — same command as step 3 (`--require ledger`, never
   `--require verification-report`). Same interpretation: nonzero or a crash is a failed check →
   stop-and-ask, do not hand off, human override recorded in `build-report.md`; runtime absent →
   announced degraded fallback recorded in `build-report.md`. Only once corroborated (or the
   degraded fallback is recorded): report "branch ready, run `/agent-sdlc:ship`".

The dispatch mechanics, the three subagent briefs, the bounded fix cycle, and ledger recovery are in
[reference/subagent-loop.md](reference/subagent-loop.md). The disciplines the subagents follow are in
[reference/tdd.md](reference/tdd.md), [reference/source-driven.md](reference/source-driven.md),
[reference/simplicity.md](reference/simplicity.md), and [reference/debugging.md](reference/debugging.md).

## Principles

- **Conduct, do not perform.** The conductor never writes product code. Every change comes from a
  subagent with a one-task brief. If you find yourself editing source directly, stop and dispatch.
- **Plan source is irrelevant to the loop.** A plan ingested from Linear or a doc runs the identical
  per-task discipline — test-first, review, green bar, isolation, ledger. The adapter changes only how
  the plan arrives; if any rigour changes because of where it came from, that is a bug.
- **One task, one green commit.** The repo compiles, passes, lints, and is formatted after every
  task — the whole green bar, not just the suite. A task that cannot finish green was mis-sized in
  planning — loop back, do not force it through.
- **Test-first is the subagent's contract.** The plan named the failing test; the implementer writes
  it and watches it fail before any code. Tests-after is a violation, not a shortcut.
- **Context hygiene.** A brief describes one task, never the session history or the whole plan. Hand
  artifacts (brief, diff, findings) through files, not by pasting them into prompts.
- **The ledger is truth after a compaction.** Trust `build-report.md` + `git log` over memory. They
  survive context loss; your recollection does not.
- **Stop at a blocker, do not improvise.** Ambiguity, a contradicted plan, or a task that will not go
  green after bounded fixes: record it blocked and ask. Do not paper over an unsettled plan.
- **Review at two scales.** Every task gets a cheap reviewer subagent here; the whole PR gets the
  heavy `review-gate` once, at ship. Both are real gates; neither replaces the other.
- **Evidence is captured text, never a checkbox.** Each green-bar run is recorded verbatim — the
  command plus its output tail — beside the task, from the first task onward. A task marked done
  with no evidence block is not done.
- **Corroborate at resume and at hand-off.** The checker is a second, mechanical witness to the
  ledger/trace/commits so far — run it before continuing after a break and again before ship. A
  nonzero exit or a crash is a failed check, not noise.
- **Degrade loud, never quiet.** No `node` at either invocation point — the loop still runs, but say
  so in `build-report.md`. A silent skip reads as a clean pass it isn't.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I'll just edit this file directly, it's faster." | The conductor delegates. Direct edits skip the review gate and bloat its context. Dispatch. |
| "Write the code, add the test after." | Tests-after answers "what does it do"; tests-first answers "what should it do". The plan named the failing test — write it first. |
| "Give the subagent the whole plan for context." | One brief = one task. The whole plan is noise that derails an autonomous run. |
| "Skip the per-task review, review-gate catches it at ship." | A whole-PR gate cannot localize a per-task drift cheaply. Review early; fix while it is small. |
| "This task won't go green, I'll wire the next one and come back." | Errors compound. Stop the line: a blocked task is recorded and raised, not deferred. |
| "Trust my memory of what's done after the compaction." | Re-running a done task is the costliest failure. Read the ledger and `git log`. |
| "The plan came from Linear/a doc, it's already reviewed — skip the gate." | A source is not a verdict. An unvetted plan is unvetted whatever its origin — run the gate inline, then build. |
| "The checker isn't installed here, just skip resume/build-complete." | `node` absent is a degraded fallback, announced in `build-report.md` — not a silent skip. |
| "`sdlc-check` failed but the task looks fine, proceed anyway." | A failed checker run is a failed check — stop-and-ask. Proceeding needs an explicit, recorded human override. |
| "I'll add the evidence block later, once more tasks land." | Evidence is captured from the first task, never deferred — a gap left for later is a hole the checker (AC-5/AC-14) will find. |
| "The baseline is red because the target files don't exist yet — stop." | Absence of the declared paths is vacuous green, not red — greenfield has nothing to fail. Proceed; the bar binds once the paths exist. |

## Red flags (stop and fix)

- The conductor edited product code itself instead of dispatching a subagent.
- A commit with a red or unrun green bar (tests, lint, or format-check failing or never run), or
  more than one task in a single commit.
- A commit that is green against the working tree but not in isolation — a needed file left unstaged
  (the green bar ran; the `git add` did not).
- An implementer that wrote code before a failing test, or whose brief carried the whole plan.
- A reviewer prompt told what *not* to flag (pre-judging disqualifies the review).
- A task marked done with no commit SHA, or work re-run because the ledger was not consulted.
- Building past a blocked task instead of stopping to ask.
- An ingested/external plan built without an inline gate verdict, or with fabricated `AC-N` trace
  links instead of an honest `untraced` mark.
- A task marked done with no captured green-bar evidence block.
- Proceeded to the next task at resume, or to ship at build-complete, while `sdlc-check` failed with
  no recorded override.
- The checker silently skipped when `node` was absent, instead of an announced degraded fallback.
- The baseline halted on a greenfield absence instead of recording vacuous green.

## Done when

- Every `T-N` is implemented test-first, reviewed, and committed atomically, the green bar green
  (tests, lint, format-check) between each, and each commit verified to compile in isolation.
- `build-report.md` records every task done with its SHA and `AC-N`; no task left in-progress.
- Every done task carries a captured green-bar evidence block in `build-report.md`, present from the
  first task onward.
- The checker corroborated at resume (if resuming) and at build-complete — or, for either point that
  lacked a runtime, an announced degraded fallback is recorded in its place. A failed checker run
  either blocked the loop or was overridden with the override recorded.
- The branch is green end to end.
- Linear issues are transitioned to Done where sync is enabled (or skipped cleanly where it is not).
- The hand-off to `/agent-sdlc:ship` is stated.

## The artifact (output)

- Product code on a feature branch: one atomic, reviewed, green commit per task.
- `specs/<feature>/build-report.md` — the resumable ledger: per task `T-N` its status (done /
  in-progress / blocked), commit SHA, the `AC-N` advanced, any blocker note, a captured green-bar
  evidence block (fenced command + output tail, from the first task onward), and any
  deferred-shortcut ceilings (`SHORTCUT(T-N)`) the task left in the code, plus the checker's
  resume/build-complete corroboration result (pass, stop-and-ask with any recorded override, or an
  announced degraded fallback). Mirrors `gate-report.md`'s role — process state beside the spec,
  never inside it.

## Conventions

- Reads the `## Plan` and `## Tech Stack` sections of `specs/<feature>/<feature>.md` (the latter for
  the green bar — the commands that define a passing build) and `gate-report.md`; references `T-N`
  and `AC-N` IDs.
- Writes only product code + `build-report.md`. Does not **author** the front-half spec sections (the
  front half owns those) — the one exception is **materializing an ingested plan** (the `## Plan`, and
  a minimal provenance-marked green bar in `## Tech Stack` when none is declared) per the ingest
  adapter, which transcribes the source, never authors criteria/design/product choices. Does not open
  the PR (ship owns that).
- Runs after a clean gate verdict; re-run is safe and resumes from the ledger. The plan may be
  materialized from an external source (Linear/doc) — build runs the gate inline when no verdict
  exists for it (see [reference/ingesting-plans.md](reference/ingesting-plans.md)).
- Invokes `agent-sdlc/checker/sdlc-check.mjs specs/<feature>/<feature>.md --require ledger` (bare
  `node`, no install) at resume and at build-complete, mirroring gate's and ship's checker contract:
  present and clean → corroborated; present and failing (or crashing) → stop-and-ask, override
  recorded in `build-report.md`; absent → an announced degraded fallback, never a silent skip. Never
  `--require verification-report` at build — that artifact is ship's (T-12).
- Downstream consumer: `/agent-sdlc:ship` takes the green branch to a reviewed PR.
