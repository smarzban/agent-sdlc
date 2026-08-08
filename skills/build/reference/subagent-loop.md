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

### Path and artifact validation

Validate task-derived paths as literal repository-relative files under approved task roots. The
resulting validated task paths are literal repository-relative files. Approved task roots derive
exclusively from the plan's exact named paths: use the containing directory of each plan-named file
(or the repository root for a plan-named root file). The implementer's status or scoped name-only
status only discovers files already beneath those roots; it never adds an approved root. Validate
the raw path before any Git call: reject traversal, dot paths, absolute paths, directory paths, and
Git magic pathspecs (including `:(...)`, `:(glob)`, and `:(exclude)`). Accept a regular file or a
deleted tracked task file, never a directory or a path that only becomes safe after normalization.
Keep only the validated paths in `validated_task_paths`, then pass them as literal arguments with
`git add -- "${validated_task_paths[@]}"`. Preserve deleted tracked task files in temporary-index
snapshots and stage their removals there. A deleted tracked task file remains in that set instead
of dropping it from the review.

Every tree, diff, findings, handoff, report, and other review artifact destination is validated as a
literal repository-relative path below `.agent-sdlc/briefs/<feature>/` before it is opened. An
existing destination must be a regular file. A new artifact leaf is safe only when it does not exist
yet, is validated lexically, and every existing ancestor is a non-symlink directory under the
approved artifact root. This creates the leaf atomically with no-follow and exclusive-create semantics,
without following a symlink. Create the leaf without following a symlink. Validation and opening
must be one helper operation, not validation followed
by opening the destination pathname. The helper starts from a trusted repository-root directory
handle. It opens and holds trusted artifact-root ancestors as directory handles with
`O_DIRECTORY|O_NOFOLLOW`, and resolves every child component relative to the held parent handle,
without following links. It keeps
all ancestor handles open until the write finishes. It opens an existing final leaf relative to the
held parent directory handle with `O_WRONLY|O_NOFOLLOW`, verifies the held descriptor is a regular
file, then truncates that descriptor. It creates a new final leaf relative to the held parent with
`O_CREAT|O_EXCL|O_NOFOLLOW`. Never use a path-based Node open after validation: Node's `openSync`
receives a pathname, not a held parent directory handle. If the helper, `dir_fd`/`openat` operation,
trusted root handle, or no-follow guarantee is unavailable, reject an unsafe artifact destination,
fail closed, record the task failure, and stop reviewer dispatch. Do not let a destination, pathspec,
symlink, or parent directory escape the approved artifact root.

The smallest concrete helper procedure is a POSIX directory-handle helper invoked from `write_artifact`.
It rejects absolute paths, empty components, `.`, `..`, Git magic pathspecs, and destinations outside
`.agent-sdlc/briefs/<feature>/`. Starting at the trusted repository-root handle, it runs
`openat(parent_fd, component, O_RDONLY|O_DIRECTORY|O_NOFOLLOW)` for every root and child ancestor,
retaining each returned descriptor. It then runs `openat(held_parent_fd, leaf, O_WRONLY|O_NOFOLLOW)`
for an existing leaf, checks `fstat(fd)` for a regular file, and uses `ftruncate(fd, 0)` before copying
the staged bytes to that descriptor. For a missing leaf it instead runs
`openat(held_parent_fd, leaf, O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW, 0o600)`. It closes the leaf and
all retained ancestor descriptors in `finally`. A helper without directory-relative open and held
ancestor descriptors cannot provide this guarantee and must return failure before reviewer dispatch.

### Initial full-review snapshot

The initial review receives the complete task-scoped diff, never a partial or finding-scoped diff,
and completes before remediation can begin. Create the initial immutable tree snapshot after the
implementer reports and before initial-review dispatch. Validate the task paths and every artifact
destination first. Write its tree id to `T-N-initial.tree`, then create `T-N-review.diff` with
`git diff HEAD "$initial_tree" -- "${validated_task_paths[@]}"`. Assert that the initial-review diff
is non-empty before dispatching the reviewer. An empty initial-review diff is a failure: stop
reviewer dispatch and raise the task, do not send a blank review.

### Temporary-index tree snapshots

A snapshot uses a **temporary index**, not the real index. It loads `HEAD` into that private index,
stages only the exact validated task paths there, including removals for deleted tracked task files,
and writes an immutable tree object. Create the temporary index once for the task, remove the empty
file before Git initializes it, and clean it up on exit:

```
tmp_index=$(mktemp "${TMPDIR:-/tmp}/agent-sdlc-review-index.XXXXXX")
rm -f "$tmp_index"
trap 'rm -f "$tmp_index" "$tmp_index.lock"' EXIT

snapshot_task_tree() {
  [ "${#validated_task_paths[@]}" -gt 0 ] || return 1
  GIT_INDEX_FILE="$tmp_index" git read-tree HEAD || return
  GIT_INDEX_FILE="$tmp_index" git add -- "${validated_task_paths[@]}" || return
  GIT_INDEX_FILE="$tmp_index" git write-tree
}

if ! initial_tree=$(snapshot_task_tree); then
  stop_and_ask "initial review snapshot failed"
fi
require_tree_id "$initial_tree" || stop_and_ask "initial snapshot has no valid tree id"
previous_tree=$initial_tree
if ! repo_root=$(git rev-parse --show-toplevel); then
  stop_and_ask "failed to resolve the repository root"
fi
[ -n "$repo_root" ] || stop_and_ask "repository root is empty"
write_artifact() {
  local destination=$1
  shift
  local staged_output
  staged_output=$(mktemp "${TMPDIR:-/tmp}/agent-sdlc-artifact.XXXXXX") || {
    stop_and_ask "failed artifact staging: $destination"
    return 1
  }
  if ! "$@" > "$staged_output"; then
    rm -f "$staged_output"
    stop_and_ask "failed artifact or diff write: $destination"
    return 1
  fi
  if ! python3 - "$repo_root" "$destination" "$staged_output" <<'PY'
import os
import stat
import sys


repo_root, destination, staged_output = sys.argv[1:]
parts = destination.split('/')
if (
    not destination.startswith('.agent-sdlc/briefs/')
    or len(parts) != 4
    or any(part in ('', '.', '..') for part in parts)
    or any(part.startswith(':(') for part in parts)
):
    raise SystemExit('unsafe artifact destination')

ancestor_fds = []
leaf_fd = None
try:
    current_fd = os.open(repo_root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    ancestor_fds.append(current_fd)
    for component in parts[:-1]:
        current_fd = os.open(
            component,
            os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
            dir_fd=current_fd,
        )
        ancestor_fds.append(current_fd)
    try:
        leaf_fd = os.open(
            parts[-1],
            os.O_WRONLY | os.O_NOFOLLOW,
            dir_fd=current_fd,
        )
        if not stat.S_ISREG(os.fstat(leaf_fd).st_mode):
            raise SystemExit('artifact destination is not a regular file')
        os.ftruncate(leaf_fd, 0)
    except FileNotFoundError:
        leaf_fd = os.open(
            parts[-1],
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
            dir_fd=current_fd,
        )
    with open(staged_output, 'rb') as source:
        while chunk := source.read(1024 * 1024):
            remaining = memoryview(chunk)
            while remaining:
                try:
                    written = os.write(leaf_fd, remaining)
                except OSError as error:
                    raise OSError('artifact write failed') from error
                if written <= 0:
                    raise OSError('artifact write made no progress')
                remaining = remaining[written:]
finally:
    if leaf_fd is not None:
        os.close(leaf_fd)
    for fd in reversed(ancestor_fds):
        os.close(fd)
PY
  then
    rm -f "$staged_output"
    stop_and_ask "failed artifact or diff write: $destination"
    return 1
  fi
  rm -f "$staged_output"
}
initial_tree_file=.agent-sdlc/briefs/<feature>/T-N-initial.tree
initial_diff_file=.agent-sdlc/briefs/<feature>/T-N-review.diff
write_artifact "$initial_tree_file" printf '%s\n' "$initial_tree"
write_artifact "$initial_diff_file" git diff HEAD "$initial_tree" -- "${validated_task_paths[@]}"
[ -s "$initial_diff_file" ] || stop_and_ask "empty initial-review diff"
```

A tree id is valid only when it is non-empty and resolves to a tree object. A snapshot command failure
or a missing tree id is a failure: stop reviewer dispatch and raise the task.

Initialize `previous_tree` from the initial snapshot before any remediation. After every
remediation, the conductor refreshes the validated task path set from the plan and the scoped names
reported by that remediation. Re-validate every candidate under the approved task roots, reject any
unsafe candidate, and refresh `validated_task_paths` before taking the next snapshot or writing its
diff. Then call the same function, write its id to `T-N-remediation-round-<N>.tree`, and create the
remediation-only diff with:

```
if ! next_tree=$(snapshot_task_tree); then
  stop_and_ask "remediation snapshot command failed"
fi
require_tree_id "$next_tree" || stop_and_ask "remediation snapshot has no valid tree id"
round_tree_file=.agent-sdlc/briefs/<feature>/T-N-remediation-round-<N>.tree
round_diff_file=.agent-sdlc/briefs/<feature>/T-N-remediation-round-<N>.diff
write_artifact "$round_tree_file" printf '%s\n' "$next_tree"
write_artifact "$round_diff_file" git diff "$previous_tree" "$next_tree" -- "${validated_task_paths[@]}"
```

The temporary-index procedure leaves the **real index, working tree, HEAD, and branch unchanged**.
It never uses `git add -N`, `git reset`, `git stash`, or a checkout against the real index. An
unchanged claimed fix (`$previous_tree` equals `$next_tree`) is a failure: stop re-review dispatch
and raise the task. The conductor does not read either diff: the reviewer is its reader and the
conductor is its courier.

Guard every artifact write, including findings, handoffs, reports, tree ids, and diffs, with the
validated destination and `write_artifact`. A failed artifact or diff write fails closed, records
the task failure, and stops reviewer dispatch before a stale, missing, or empty artifact can be
handed to a reviewer. The initial diff's non-empty assertion is also guarded with `stop_and_ask`.

Contract-test every failure branch above, including an unsafe artifact destination, a failed
snapshot command, a missing tree id, an empty initial-review diff, and an unchanged claimed fix.
Also contract-test positive remediation-round recording, including the round findings file, tree
ids, refreshed task paths, reviewer verdict and counts, and the remediation-only diff.

The repository proof is a throwaway-repository fixture: include a deleted tracked task file, a new
and changed task file, and an unrelated changed file. Assert that the task-scoped snapshot diff
contains only the task paths and that the real index, HEAD, and worktree remain unchanged after
snapshot creation. The fixture must remove its temporary index and repository in cleanup.

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
prior blocking findings. After each remediation, refresh and validate the task path set, snapshot
its result, set `next_tree` from that snapshot, create the remediation-only diff from
`previous_tree` to `next_tree`, and stop if the claimed fix is empty. For each successful round,
record every remediation round in `build-report.md` and its round findings file with the refreshed
paths, tree ids, remediation-only diff destination, reviewer verdict, and Critical / Important /
Minor counts. Then continue the exact original reviewer session for the finding-scoped re-review.
After the review, set `previous_tree=$next_tree` before the next round.

If continuation is unavailable or a continued session is dead, announce a fresh-agent fallback in
`build-report.md` before dispatch: identify the round, role, reason, and pinned replacement. The
pinned fresh agent receives the same durable file handoff: brief, implementer report, findings, and
diff files. This fallback is visible to the reviewer and human, not a silent substitution. A fresh
fallback that dies after dispatch follows the subagent-death policy below.

**Remediation round 3:** do not continue either original session. Dispatch a fresh fixer with the
durable file handoff, refresh and validate the task path set, snapshot the result, create the
remediation-only diff, then dispatch a fresh reviewer for the same finding-scoped contract. Record
the successful remediation round with its round findings file, refreshed paths, tree ids, diff
destination, verdict, and counts. This fresh pair breaks anchoring after two unsuccessful continued
rounds.

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
