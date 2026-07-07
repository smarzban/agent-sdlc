# Subagent loop — dispatch mechanics for the build conductor

How the conductor runs the per-task loop: workspace isolation, the three subagent roles and their
file hand-offs, the bounded fix cycle, model selection, and ledger recovery. The conductor reads this;
the disciplines the subagents follow are in the sibling reference files.

## Workspace isolation (step 2 of the loop)

1. **Detect existing isolation first.** If already in a worktree, a sandbox, or a harness-managed
   branch, use it. Never nest isolation.
2. **Native tool, then fallback.** Use the platform's worktree/branch tool if there is one; else
   `git worktree add` under `.worktrees/<feature>` from the base branch.
3. **Baseline green.** Run the full green bar once before any task — the commands `## Tech Stack`
   declares. If the baseline is red, stop — you cannot tell your regressions from pre-existing
   ones. Report "baseline N passing" and proceed. Greenfield target paths that do not exist yet
   are **vacuously green**, not red — the full rule and the baseline-failure routing are normative
   in the SKILL body (step 2); do not re-derive them here.
4. **Provenance for cleanup.** Note whether you created the worktree (`.worktrees/`) or inherited it.
   ship preserves the worktree on the PR path; only an explicitly created, finished one is cleaned.

## File hand-offs — the rule

Artifacts move as files in BOTH directions. A brief is written to a file (e.g.
`.agent-sdlc/briefs/T-N.md` in the workspace) and the subagent is told to read it. The dispatch
prompt is one or two lines ("Implement task T-N. Read your brief at <path>. Follow the disciplines
it names."). Never paste the plan, the session history, or other tasks into the prompt. The same
rule governs what comes BACK: reports and findings land in files beside the brief; a subagent's
final message is a short status, never the artifact itself. And the conductor produces the
reviewer's diff file **blind** — `git add -N . ':(exclude).agent-sdlc' && git diff >
.agent-sdlc/briefs/T-N-review.diff` (intent-to-add first, so NEW files — a TDD task's first
artifact — appear in the diff; nothing gets staged) — never by
reading the diff into its own context first: the reviewer is the diff's reader, the conductor is
its courier. Context bloat in the conductor is the failure subagent-driven development exists to
avoid.

## The three roles

### Implementer

**Brief contains only:**
- The task `T-N` verbatim from the `## Plan`: title, exact files, the failing test to write first,
  the `AC-N` advanced, the component touched, dependencies.
- The global constraints from `constitution.md` that bear on this task (not the whole file).
- Which disciplines to follow: `tdd.md` (red-green-refactor), `source-driven.md` (verify framework
  APIs against official docs before using them), `simplicity.md` (one vertical slice, Rule-0).

**Returns:** a short status — which test now passes, the files touched, any concern — never the
diff itself: the working tree already holds it, and pasting it back into the conductor defeats
the isolation. Before returning, the implementer runs the project's formatter and linter so the diff is already
format-clean and lint-clean — the conductor's green-bar check is the authoritative gate, not a
surprise. The implementer does **not** commit — the conductor commits after review, so the commit
reflects reviewed code.

### Reviewer

**Brief contains:** the diff file (produced blind — see the hand-off rule), the task's contract
(the `AC-N`, the named files, the test it had to make pass), and the bearing global constraints.
The reviewer **reads, it does not re-run**: it reads the diff, the changed files, and their
call-sites, and returns spec-met (does the diff satisfy `T-N`'s contract?) plus quality findings
rated Critical / Important / Minor — the findings written to a file beside the brief
(`.agent-sdlc/briefs/T-N-findings.md`), verdict and counts in the return message. The conductor's
own green-bar run (SKILL step 4d) is the loop's authoritative execution — a reviewer re-running
the suite duplicates it and buys nothing; it may run a *focused* check only for a specific doubt
its reading raised, naming the doubt and what it ran in its findings. One axis is always in scope:
**over-build** — an abstraction, indirection, layer, or dependency the `AC-N` did not call for,
where a simpler form passes the same test. Flag it like any other finding; the cheapest code to
review is the code that was never written.

**Never tell the reviewer what not to flag.** "Treat X as minor", "don't worry about Y" — pre-judging
disqualifies the review. State the contract and let it judge. Optionally add a **doubt lens**: a
second, adversarial pass that assumes the implementer was overconfident and hunts for what is wrong
rather than confirming what is right — useful for non-trivial or security-sensitive tasks, bounded so
it does not loop.

### Fixer (only when the reviewer finds Critical/Important)

**Brief contains:** the findings file and the diff file. The fixer follows `tdd.md` (a fix gets a guarding
test) and `debugging.md` (stop-the-line: root cause, not symptom). Regenerate the diff file (same blind command), then re-review after each fix. **Bound
the cycle to ~2–3 rounds**; if it still fails, the task is blocked — record it and raise it, do not
grind.

## Subagent death (a dispatch that dies mid-task)

A dispatched subagent can die mid-task — a session/token limit, an API error, a crash — returning no
diff or a truncated one. The response is a fixed sequence, not an improvisation:

1. **Capture any partial work.** Salvage whatever the dead subagent left — a partial diff, a written
   test, notes — into the workspace. Do not discard it; it may seed the retry.
2. **Retry once with a fresh subagent.** Re-dispatch the same file brief to a new subagent (a died
   session does not resume — fresh context). One retry, not a loop.
3. **Only then, conductor-takeover.** If the retry also dies, the conductor may complete the task
   itself — the one sanctioned exception to conduct-do-not-perform, because a stalled line is worse
   than a localized, recorded deviation. Take over minimally.
4. **Record the deviation in `build-report.md`.** Which task, what died (the failure subtype), what
   partial work was recovered, whether isolation was lost, and whether step 3 (takeover) was reached.
   A silent takeover with no ledger record is the exact failure this policy exists to prevent.

A recovered or conductor-completed task clears the same gates as any other — the per-task review, the
full green bar, and the staged-isolation check all still run before it commits. The roster pinned at
build start (SKILL step 2) is what a retry re-dispatches against; a substitution already announced
there is not re-announced per death.

## Commit (conductor, after the reviewer passes)

The conductor — not a subagent — verifies and commits: one task = one atomic commit. The
verification is SKILL step 4d's single staged-snapshot run — stage the task's changes, run the
full declared bar against exactly what will be committed (`git stash --keep-index
--include-untracked` → bar → pop, or commit first and run the bar on a clean checkout of HEAD),
reading the output itself, never trusting a subagent's reported counts. An under-staged commit is
a broken commit even when the working tree is green.

**Capture the evidence block from that run** — file-first, then extract. The capture, boundedness,
and no-transcription rules are normative in SKILL step 4d and *Reading the green bar*; they are
not restated here. A well-formed block (command exactly as run, then the run's own output):

    ### T-3 (@ `4ddd29e`)

    ```
    $ node --test tests/*.test.mjs
    ok 1 - resolver rejects a dangling ID
    ok 2 - resolver accepts a defined ID
    # pass 2
    # fail 0
    ```

The message states the task and the `AC-N` (e.g. `feat(T-3): root resolver — advances AC-1`).
Then update the ledger — the evidence block, plus any `SHORTCUT(T-N)` markers the diff introduced,
so evidence and deferred ceilings are recorded beside the task in `build-report.md`.

## Model selection (specify it where the platform can)

Turn count beats token price — but an **unspecified dispatch inherits the session's model, usually
the most expensive**, so on platforms with a per-dispatch model knob (e.g. Claude Code's Agent
tool), specify it on every dispatch. Tiering: a task whose plan text contains the complete
code/content to write is transcription — cheapest tier; a prose-spec or multi-file integration
task — mid-tier; reviewers — mid-tier floor, scaled to the diff's size and risk; the whole-PR
review is ship's Empanel gate on the most capable model. Where the platform has no knob, dispatch
with the default model; the loop is unchanged.

## Ledger recovery (after a compaction or crash)

`build-report.md` is the durable record. On resume:
1. Read `build-report.md` for the per-task status.
2. Cross-check with `git log` — a task with a commit is done even if the ledger missed the write.
3. Resume at the first task not marked done. **Never re-run a done task.**
4. **Invoke the checker before continuing** (the resume invocation point) — a second, mechanical
   witness to 1–3: `sdlc-check docs/specs/<feature>/<feature>.md --require
   ledger` (never `--require verification-report` here — that artifact is ship's). Runtime present →
   interpret the exit code: 0 proceeds; nonzero, or the checker crashing, is a failed check
   (fail-closed) — **stop-and-ask**, do not resume task work, and record any human override in
   `build-report.md`. Runtime absent → write an announced degraded fallback line into
   `build-report.md` — never a silent skip.
Trust the ledger and git history over any recollection of what happened before the break.
