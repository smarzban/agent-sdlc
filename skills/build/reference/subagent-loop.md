# Subagent loop: dispatch mechanics for the build conductor

How the conductor runs the per-task loop: workspace isolation, the three subagent roles and their
file hand-offs, the three-round remediation protocol, model selection, and ledger recovery. The
conductor reads this; the disciplines the subagents follow are in the sibling reference files.

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

## File hand-offs and review snapshots

Artifacts move as files in BOTH directions. A brief is written to a file (for example,
`.agent-sdlc/briefs/<feature>/T-N.md` in the workspace, so two features never resolve the same
task id to the same file) and the subagent is told to read it. The dispatch prompt is one or two
lines ("Implement task T-N. Read your brief at <path>. Follow the disciplines it names."). Never
paste the plan, session history, or other tasks into a prompt. The same rule governs what comes
back: the implementer writes `T-N-implementer-report.md`, each reviewer writes a round-specific
findings file, and the conductor writes snapshot and diff files beside the brief. A final message is
short status, never the artifact itself.

The conductor produces every review diff **blind** and **scoped to the task's exact files**. Start
with the plan's named files, then add a task-created path only when the implementer's returned
status or a name-only `git status --porcelain -- <task directories>` identifies it. Filter the list
to paths that exist and are not ignored. A plan-named file that was not created remains a review
finding, not a reason to omit the whole hand-off. Never use a repo-wide pathspec: unrelated staged
or untracked work must not enter the review.

### Initial full-review snapshot

The initial review receives the complete task-scoped diff, never a partial or finding-scoped diff,
and completes before remediation can begin. Create the initial immutable tree snapshot after the
implementer reports and before initial-review dispatch. Write its tree id to `T-N-initial.tree`, then create
`T-N-review.diff` with `git diff HEAD "$initial_tree" -- "${task_paths[@]}"`. Assert that this
initial diff is non-empty before dispatching the reviewer. On empty, reconcile the exact task paths
with the plan and name-only status output, then regenerate; do not send a blank review.

### Temporary-index tree snapshots

A snapshot uses a **temporary index**, not the real index. It loads `HEAD` into that private index,
stages only the exact task paths there, and writes an immutable tree object. Create the temporary
index once for the task, remove the empty file before Git initializes it, and clean it up on exit:

```
tmp_index=$(mktemp "${TMPDIR:-/tmp}/agent-sdlc-review-index.XXXXXX")
rm -f "$tmp_index"
trap 'rm -f "$tmp_index" "$tmp_index.lock"' EXIT

snapshot_task_tree() {
  GIT_INDEX_FILE="$tmp_index" git read-tree HEAD || return
  GIT_INDEX_FILE="$tmp_index" git add -- "$@" || return
  GIT_INDEX_FILE="$tmp_index" git write-tree
}

initial_tree=$(snapshot_task_tree "${task_paths[@]}") || stop_and_ask "initial review snapshot failed"
printf '%s\n' "$initial_tree" > .agent-sdlc/briefs/<feature>/T-N-initial.tree
git diff HEAD "$initial_tree" -- "${task_paths[@]}" > .agent-sdlc/briefs/<feature>/T-N-review.diff
```

For the next snapshot, call the same function after the remediation, write its id to
`T-N-remediation-round-<N>.tree`, and create the remediation-only diff with:

```
git diff "$previous_tree" "$next_tree" -- "${task_paths[@]}" > .agent-sdlc/briefs/<feature>/T-N-remediation-round-<N>.diff
```

The temporary index procedure leaves the **real index, working tree, HEAD, and branch unchanged**.
It never uses `git add -N`, `git reset`, `git stash`, or a checkout against the real index. A
snapshot command failure, a missing tree id, or an empty claimed fix (`$previous_tree` equals
`$next_tree`) stops re-review dispatch and raises the task. The conductor does not read either diff:
the reviewer is its reader and the conductor is its courier.

## The three roles

### Implementer

**Brief contains only:**
- The task `T-N` verbatim from the `## Plan`: title, exact files, the failing test to write first,
  the `AC-N` advanced, the component touched, dependencies.
- The global constraints from `constitution.md` that bear on this task (not the whole file).
- Which disciplines to follow: `tdd.md` (red-green-refactor), `source-driven.md` (verify framework
  APIs against official docs before using them), `simplicity.md` (one vertical slice, Rule-0).

**Returns:** a short status: which test now passes, the files touched, any concern. Write the
same facts to `T-N-implementer-report.md`; never paste the diff itself because the working tree
already holds it. Before returning, run the project's formatter and linter so the diff is
format-clean and lint-clean. The conductor's green-bar check is the authoritative gate. The
implementer does **not** commit: the conductor commits after review, so the commit reflects
reviewed code.

### Initial reviewer

**Brief contains:** the complete `T-N-review.diff` (produced blind), the task's contract (the
`AC-N`, named files, and test it had to make pass), and the bearing global constraints. The initial
reviewer reads the complete task-scoped diff, changed files, and their call-sites. It returns
spec-met plus Critical / Important / Minor quality findings in
`T-N-findings-round-0.md`, with verdict and counts in the short status. This is the only full-task
review for the task.

The reviewer reads, it does not re-run. The conductor's own green-bar run (SKILL step 4d) is the
authoritative execution. A reviewer may run a focused check only for a specific doubt, naming the
doubt and command in its findings. One axis is always in scope: **over-build**, an abstraction,
indirection, layer, or dependency the `AC-N` did not call for where a simpler form passes the same
test. Never tell the reviewer what not to flag. A bounded doubt lens is allowed for non-trivial or
security-sensitive tasks.

### Finding-scoped re-reviewer

Every remediation reviewer receives the original task contract, the previous blocking findings,
the remediation diff, and focused test evidence. It checks whether the remediation closes the
prior blockers and whether the remediation surface introduces regressions. It does **not** repeat
the complete task review, reread the settled task diff, or extend its scope to other code.

For **each prior blocking finding**, write a disposition in the round findings file as exactly
`ADDRESSED` or `NOT ADDRESSED`, with a short reason. New Critical or Important findings may arise
only from **new breakage in the remediation diff**. An observation entirely outside the remediation
diff is recorded as an **outside remediation diff, non-blocking** observation and cannot start or
extend remediation. The reviewer returns verdict and counts in a short status, while the full
findings stay in `T-N-findings-round-<N>.md`.

### Remediation dispatch

A remediation round starts only after the preceding review reports a Critical or Important finding.
Before every round, assemble a durable file handoff: the original brief, implementer report, prior
findings, prior review diff, and the latest remediation diff. The conductor does not paste artifacts
into a prompt. It writes a one-line prompt that names the round and tells the recipient to read that
handoff.

**Remediation rounds 1 and 2:** continue the exact original implementer session to address the
prior blocking findings. Snapshot its result, set `next_tree` from that snapshot, create the
remediation-only diff from `previous_tree` to `next_tree`, and stop if the claimed fix is empty.
Then continue the exact original reviewer session for the finding-scoped re-review. After the
review, set `previous_tree=$next_tree` before the next round.

If continuation is unavailable or a continued session is dead, announce a fresh-agent fallback in
`build-report.md` before dispatch: identify the round, role, reason, and pinned replacement. The
pinned fresh agent receives the same durable file handoff: brief, implementer report, findings, and
diff files. This fallback is visible to the reviewer and human, not a silent substitution. A fresh
fallback that dies after dispatch follows the subagent-death policy below.

**Remediation round 3:** do not continue either original session. Dispatch a fresh fixer with the
durable file handoff, snapshot the result, create the remediation-only diff, then dispatch a fresh
reviewer for the same finding-scoped contract. This fresh pair breaks anchoring after two
unsuccessful continued rounds.

After a passing remediation review, proceed to the unchanged conductor-owned staged-snapshot green
bar and atomic commit. After round 3, if any Critical or Important finding remains, mark the task
blocked in `build-report.md`, retain the final findings and diffs, raise it, and make no fourth
remediation dispatch.

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
