# Subagent loop — dispatch mechanics for the build conductor

How the conductor runs the per-task loop: workspace isolation, the three subagent roles and their
file briefs, the bounded fix cycle, model selection, and ledger recovery. The conductor reads this;
the disciplines the subagents follow are in the sibling reference files.

## Workspace isolation (step 2 of the loop)

1. **Detect existing isolation first.** If already in a worktree, a sandbox, or a harness-managed
   branch, use it. Never nest isolation.
2. **Native tool, then fallback.** Use the platform's worktree/branch tool if there is one; else
   `git worktree add` under `.worktrees/<feature>` from the base branch.
3. **Baseline green.** Run the full green bar once before any task — the commands `## Tech Stack`
   declares (compile, test, lint, format-check). If the baseline is red, stop — you cannot tell your
   regressions from pre-existing ones. Report "baseline N passing" and proceed. **Vacuous-green
   exception (general rule, not a per-feature carve-out):** a green bar whose target paths do not yet
   exist (greenfield — nothing to compile or test yet) is not red, it is **vacuously green** — there
   is nothing to fail. Report it as such and proceed; the bar becomes binding from the first task
   that creates those paths, not before.
4. **Provenance for cleanup.** Note whether you created the worktree (`.worktrees/`) or inherited it.
   ship preserves the worktree on the PR path; only an explicitly created, finished one is cleaned.

## File briefs — the rule

A brief is written to a file (e.g. `.agent-sdlc/briefs/T-N.md` in the workspace) and the subagent is
told to read it. The dispatch prompt is one or two lines ("Implement task T-N. Read your brief at
<path>. Follow the disciplines it names."). Never paste the plan, the session history, or other
tasks into the prompt — that is the context bloat subagent-driven development exists to avoid.

## The three roles

### Implementer

**Brief contains only:**
- The task `T-N` verbatim from the `## Plan`: title, exact files, the failing test to write first,
  the `AC-N` advanced, the component touched, dependencies.
- The global constraints from `constitution.md` that bear on this task (not the whole file).
- Which disciplines to follow: `tdd.md` (red-green-refactor), `source-driven.md` (verify framework
  APIs against official docs before using them), `simplicity.md` (one vertical slice, Rule-0).

**Returns:** an uncommitted diff plus a one-line statement of which test now passes. Before
returning, the implementer runs the project's formatter and linter so the diff is already
format-clean and lint-clean — the conductor's green-bar check is the authoritative gate, not a
surprise. The implementer does **not** commit — the conductor commits after review, so the commit
reflects reviewed code.

### Reviewer

**Brief contains:** the diff, the task's contract (the `AC-N`, the named files, the test it had to
make pass), and the bearing global constraints. The reviewer runs the code, reads the changed files
and their call-sites, and returns a verdict: spec met (does the diff satisfy `T-N`'s contract?) plus
quality findings rated Critical / Important / Minor. One axis is always in scope: **over-build** — an
abstraction, indirection, layer, or dependency the `AC-N` did not call for, where a simpler form
passes the same test. Flag it like any other finding; the cheapest code to review is the code that
was never written.

**Never tell the reviewer what not to flag.** "Treat X as minor", "don't worry about Y" — pre-judging
disqualifies the review. State the contract and let it judge. Optionally add a **doubt lens**: a
second, adversarial pass that assumes the implementer was overconfident and hunts for what is wrong
rather than confirming what is right — useful for non-trivial or security-sensitive tasks, bounded so
it does not loop.

### Fixer (only when the reviewer finds Critical/Important)

**Brief contains:** the findings and the diff. The fixer follows `tdd.md` (a fix gets a guarding
test) and `debugging.md` (stop-the-line: root cause, not symptom). Re-review after each fix. **Bound
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

The conductor — not a subagent — verifies the green bar green (runs the full declared set — compile,
test, lint, format-check — and reads the output itself, never trusting a subagent's reported test
counts or pass/fail claim) and makes one atomic commit per task. One task = one commit.

**Verify the staged snapshot, not just the working tree.** The green bar runs against the working
tree, which can hold files the commit will omit — so a green check can still produce a commit that
fails to compile in isolation (a needed file left unstaged). Before committing: stage the task's
changes, then run the bar against exactly what will be committed — `git stash --keep-index
--include-untracked`, run the bar, `git stash pop` — or, after committing, build a clean checkout of
HEAD. An under-staged commit is a broken commit even when the working tree is green.

**Capture the evidence block.** The task's evidence is the **conductor's own** verification run above
— the full declared bar the conductor (not a subagent) runs after the reviewer passes / before commit
— captured **verbatim**: a fenced block recording the command line(s) exactly as run plus the run's
actual output (the per-test `ok N - <name>` listing), never a checkbox and **never a transcription of
the implementer subagent's reported counts**. The implementer's own red→green TDD test runs during
the task are the subagent's business, not the recorded evidence — the conductor never trusts a
subagent's reported test counts (above), so the authoritative recorded run is the conductor's, not the
subagent's word for it. Capture it from the first task onward, never deferred: it is what the checker's evidence-presence
check (AC-5) and name-appearance-linkage check (AC-14) read, so a test-backed proof-map row's cited
test identifier must literally appear in this text (ADR-0001). **Capture the per-test listing, not
just summary counts.** A test runner that prints one line per test (e.g. `node --test` → `ok N -
<name>`) must have those `ok - <name>` lines recorded in the block — a summary tail (`# pass N`)
alone names no test, so ship's AC-14 linkage cannot match any proof row against it and the terminal
gate blocks. **Bounded for large suites:** retain in full the `ok N - <name>` lines for **the tests
this task adds or exercises** — the failing test(s) the plan named for `T-N` (test-first), which the
conductor knows at capture time; the rest of a large **pre-existing** suite (tests this task did not
add) may be capped to its summary tail. **A task that adds no tests** (e.g. a prose/doc task) has no
task-specific per-test names to retain — its suite summary (e.g. `# pass N`) is then the correct
bounded form (still the conductor's own run, never a transcription); this is the ONLY case where a
summary alone suffices. (If a full per-task listing is impractical, at minimum a build-complete
comprehensive block carrying the full per-test listing satisfies the union AC-14 searches — but the
per-test names, never mere counts, are the load-bearing content.) The canonical worked example is this very feature's own ledger —
`specs/enforcement-spine/build-report.md`'s `## Green-bar evidence` section.

The message states the task and the `AC-N` (e.g. `feat(T-3): root resolver — advances AC-1`). Then
updates the ledger — the captured green-bar evidence block for this task, plus any `SHORTCUT(T-N)`
markers the diff introduced, so evidence and deferred ceilings are recorded beside the task in
`build-report.md` rather than buried in the code or lost after the run.

## Model selection (optional, platform-dependent)

Turn count beats token price: prefer a cheaper, faster model for mechanical implementer work, a
mid-tier or better for reviewers, and the most capable for the final whole-PR review (that one is
ship's Empanel gate). This is **guidance, not a requirement** — the per-dispatch model knob is
specific to some platforms (e.g. Claude Code's Agent tool) and absent in others. Where it is absent,
dispatch with the default model; the loop is unchanged.

## Ledger recovery (after a compaction or crash)

`build-report.md` is the durable record. On resume:
1. Read `build-report.md` for the per-task status.
2. Cross-check with `git log` — a task with a commit is done even if the ledger missed the write.
3. Resume at the first task not marked done. **Never re-run a done task.**
4. **Invoke the checker before continuing** (resume invocation point, AC-15) — a second, mechanical
   witness to 1–3: `sdlc-check specs/<feature>/<feature>.md --require
   ledger` (never `--require verification-report` here — that artifact is ship's). Runtime present →
   interpret the exit code: 0 proceeds; nonzero, or the checker crashing, is a failed check
   (fail-closed) — **stop-and-ask**, do not resume task work, and record any human override in
   `build-report.md`. Runtime absent → write an announced degraded fallback line into
   `build-report.md` — never a silent skip.
Trust the ledger and git history over any recollection of what happened before the break.
