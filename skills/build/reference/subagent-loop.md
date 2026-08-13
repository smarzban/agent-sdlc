# Subagent loop: dispatch mechanics for the build conductor

How the conductor runs the per-task loop: workspace isolation, the three subagent roles and their
file hand-offs, the one remediations-pass protocol, model selection, and ledger recovery. The
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
status or a name-only `git status --porcelain -- <discovery paths>` identifies it. Derive each
discovery path from one exact plan path: use its containing directory when the plan path contains a
slash, but use the exact plan-named path for a root-level file, never the repository root or `.`.
Filter the list to paths that exist and are not ignored. A plan-named file that was not created remains
a review finding, not a reason to omit the whole hand-off. Never use a repo-wide pathspec: unrelated
staged or untracked work must not enter the review.

### Path and artifact validation

Validate task-derived paths as literal repository-relative files under approved task roots. The
resulting validated task paths are literal repository-relative files. Approved task roots derive
exclusively from the plan's exact named paths: use the containing directory of each plan-named file
that contains a slash, but use the exact plan-named root file as its only approved root. A root file
never authorizes the repository root or unrelated root paths. The implementer's status or scoped
name-only status only discovers files already beneath those roots; it never adds an approved root.
Validate the raw path before any Git call: reject traversal, dot paths, absolute paths, directory paths,
and Git magic pathspecs (including `:(...)`, `:(glob)`, and `:(exclude)`). Accept a regular
file or a deleted tracked task file, never a directory or a path that only becomes safe after
normalization. Keep only the validated paths in `validated_task_paths`, and pass each as a literal
argument to the controlled Git plumbing below. Validation is not a use-time guarantee:
`snapshot_task_tree_path` is the final no-follow check, rejects a symlink or special file, opens the
current regular file with `O_NOFOLLOW`, and holds that descriptor while copying its bytes to a
private source. If a path changes between validation and snapshotting, the helper fails closed
rather than following it. Do not use `controlled_git add --` on the real worktree: repository
`.gitattributes` and `$GIT_DIR/info/attributes` can select conversions even when system attributes
are disabled. Snapshot staging therefore hashes the held, raw private source with
`controlled_git hash-object --no-filters -w --` plus literal `controlled_git update-index
--cacheinfo` instead of `controlled_git add --`: `--no-filters` prevents clean filters and
attribute-selected working-tree conversions. Preserve deleted tracked task files in temporary-index
snapshots and stage their removals there. A deleted tracked task file remains in that set instead
of dropping it from the review.

Every tree, diff, findings, handoff, report, and other review artifact destination is validated as a
literal repository-relative path below `.agent-sdlc/briefs/<feature>/` before it is opened. An
artifact destination must not exist yet. A new artifact leaf is safe only when it does not exist yet,
is validated lexically, and every existing ancestor is a non-symlink directory under the approved
artifact root. This creates the leaf atomically with no-follow and exclusive-create semantics, without
following a symlink. Create the leaf without following a symlink. Validation and opening must be one
helper operation, not validation followed by opening the destination pathname. The helper starts from
a trusted repository-root directory handle. It opens and holds trusted artifact-root ancestors as
directory handles with `O_DIRECTORY|O_NOFOLLOW`, and resolves every child component relative to the
held parent handle, without following links. It keeps all ancestor handles open until the write
finishes. Before opening the leaf, it rejects every pre-existing leaf, including regular files,
symlinks, hard links, and special files. It creates only a missing final leaf relative to the held
parent with `O_CREAT|O_EXCL|O_NOFOLLOW`. Never use a path-based Node open after validation: Node's
`openSync` receives a pathname, not a held parent directory handle. If the helper, `dir_fd`/`openat`
operation, trusted root handle, or no-follow guarantee is unavailable, reject an unsafe artifact
destination, fail closed, record the task failure, and stop reviewer dispatch. Do not let a
destination, pathspec, symlink, or parent directory escape the approved artifact root.

The smallest concrete helper procedure is a POSIX directory-handle helper invoked from `write_artifact`.
It rejects absolute paths, empty components, `.`, `..`, Git magic pathspecs, and destinations outside
`.agent-sdlc/briefs/<feature>/`. Starting at the trusted repository-root handle, it runs
`openat(parent_fd, component, O_RDONLY|O_DIRECTORY|O_NOFOLLOW)` for every root and child ancestor,
retaining each returned descriptor. It first runs a no-follow `fstatat`-equivalent check for the leaf
relative to the held parent, rejecting any existing leaf without opening it. This rejects regular,
symlink, hard-link, and special leaves, including FIFOs, with a normal nonzero helper exit before
any open, so a FIFO can never block or require a timeout. For a missing leaf it
runs `openat(held_parent_fd, leaf, O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW, 0o600)`, then checks the new
held descriptor with `fstat` before copying the staged bytes. It closes the leaf and all retained
ancestor descriptors in `finally`. A helper without directory-relative open and held ancestor
descriptors cannot provide this guarantee and must return failure before reviewer dispatch.

### Initial full-review snapshot

The initial review receives the complete task-scoped diff, never a partial or finding-scoped diff,
and completes before remediation can begin. Create the initial immutable tree snapshot after the
implementer reports and before initial-review dispatch. Validate the task paths and every artifact
destination first. Write its tree id to `T-N-initial.tree`, then create `T-N-review.diff` with
`controlled_git diff --no-ext-diff --no-textconv HEAD "$initial_tree" --
"${validated_task_paths[@]}"`. Assert that the initial-review diff is non-empty before dispatching
the reviewer. An empty initial-review diff is a failure: stop reviewer dispatch and raise the task,
do not send a blank review.

### Controlled Git environment

Every Git command that creates a snapshot or writes a snapshot/diff artifact runs through one
controlled environment. Do not call bare `git` for these operations. This helper uses Bash arrays,
so the conductor must run it with Bash, not a generic POSIX `sh`. `env -i` removes inherited Git
configuration and execution hooks, `GIT_CONFIG=/dev/null` replaces repository-local configuration,
so repository-local configuration is disabled, and the explicit system/global settings make the
isolation visible. The empty external-diff setting, cleared diff options, and explicit diff flags
disable external diffs and text conversions. `GIT_ATTR_NOSYSTEM=1` disables system attributes, but
it does not disable repository `.gitattributes` or `$GIT_DIR/info/attributes`. Snapshot staging
therefore uses raw `controlled_git hash-object --no-filters -w -- "$path"` plus literal
`controlled_git update-index --cacheinfo` instead of `controlled_git add --`: `--no-filters` prevents
clean filters and attribute-selected working-tree conversions. Preserve the
temporary index needed by the snapshot:

```bash
# Run this function from Bash, for example with `bash -c` or a Bash conductor.
controlled_git() {
  local -a git_environment=(
    "PATH=$PATH"
    "GIT_CONFIG=/dev/null"
    "GIT_CONFIG_NOSYSTEM=1"
    "GIT_CONFIG_GLOBAL=/dev/null"
    "GIT_CONFIG_SYSTEM=/dev/null"
    "GIT_ATTR_NOSYSTEM=1"
    "GIT_EXTERNAL_DIFF="
    "GIT_DIFF_OPTS="
    "GIT_PAGER=cat"
    "GIT_OPTIONAL_LOCKS=0"
  )
  for variable in GIT_DIR GIT_OBJECT_DIRECTORY GIT_WORK_TREE GIT_INDEX_FILE; do
    if [ "${!variable+x}" = x ]; then
      git_environment+=("$variable=${!variable}")
    fi
  done
  if [ -n "${repo_root:-}" ]; then
    env -i "${git_environment[@]}" git -C "$repo_root" "$@"
  else
    env -i "${git_environment[@]}" git "$@"
  fi
}
```

### Temporary-index tree snapshots

A snapshot uses a **temporary index**, not the real index. Once `repo_root` is resolved, every
controlled Git invocation runs with `git -C "$repo_root"`, so literal pathspecs remain rooted at the
repository even when the conductor starts in a nested CWD. It loads `HEAD` into that private index,
stages only the exact validated task paths there, including removals for deleted tracked task files,
and writes an immutable tree object. Create the temporary index once for the task, remove the empty
file before Git initializes it, and clean it up on exit:

```
if ! repo_root=$(pwd -P); then
  stop_and_ask "failed to resolve the starting directory"
fi
if ! repo_root=$(controlled_git rev-parse --show-toplevel); then
  stop_and_ask "failed to resolve the repository root"
fi
[ -n "$repo_root" ] || stop_and_ask "repository root is empty"
exec 9<"$repo_root" || stop_and_ask "failed to hold the repository root"
repo_root_fd=9

tmp_index=$(mktemp "${TMPDIR:-/tmp}/agent-sdlc-review-index.XXXXXX")
rm -f "$tmp_index"
trap 'rm -f "$tmp_index" "$tmp_index.lock"' EXIT

snapshot_task_tree_path() {
  local path=$1
  local mode blob safe_source state
  safe_source=$(mktemp "${TMPDIR:-/tmp}/agent-sdlc-snapshot-source.XXXXXX") || return 1
  rm -f "$safe_source"
  if ! state=$(python3 - "$repo_root_fd" "$path" "$safe_source" <<'PY'
import os
import stat
import sys


root_fd_number, source_path, destination = sys.argv[1:]
root_fd = int(root_fd_number)
parts = source_path.split('/')
if not parts or any(part in ('', '.', '..') for part in parts):
    raise SystemExit('unsafe task path')
parent_fd = os.dup(root_fd)
source_fd = None
destination_fd = None
try:
    for component in parts[:-1]:
        try:
            next_fd = os.open(
                component,
                os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                dir_fd=parent_fd,
            )
        except FileNotFoundError:
            print('missing')
            raise SystemExit(0)
        except OSError as error:
            raise SystemExit(f'unsafe task path: {error}')
        os.close(parent_fd)
        parent_fd = next_fd

    leaf = parts[-1]
    try:
        initial = os.lstat(leaf, dir_fd=parent_fd)
    except FileNotFoundError:
        print('missing')
        raise SystemExit(0)
    if stat.S_ISLNK(initial.st_mode) or not stat.S_ISREG(initial.st_mode):
        raise SystemExit('unsafe task path')
    try:
        source_fd = os.open(
            leaf,
            os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW,
            dir_fd=parent_fd,
        )
    except OSError as error:
        raise SystemExit(f'unsafe task path: {error}')
    source_stat = os.fstat(source_fd)
    if not stat.S_ISREG(source_stat.st_mode):
        raise SystemExit('task path changed to a non-regular file')
    destination_fd = os.open(
        destination,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
        0o600,
    )
    while True:
        chunk = os.read(source_fd, 1024 * 1024)
        if not chunk:
            break
        remaining = memoryview(chunk)
        while remaining:
            written = os.write(destination_fd, remaining)
            if written <= 0:
                raise OSError('snapshot copy made no progress')
            remaining = remaining[written:]
    print('100755' if source_stat.st_mode & 0o111 else '100644')
finally:
    if destination_fd is not None:
        os.close(destination_fd)
    if source_fd is not None:
        os.close(source_fd)
    os.close(parent_fd)
PY
  ); then
    rm -f "$safe_source"
    return 1
  fi
  case "$state" in
    missing)
      rm -f "$safe_source"
      if controlled_git ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then
        controlled_git update-index --remove -- "$path"
        return
      fi
      return 1
      ;;
    100644|100755)
      if IFS=' ' read -r mode _ < <(controlled_git ls-files --stage -- "$path"); then
        :
      else
        mode=$state
      fi
      [ -n "$mode" ] || { rm -f "$safe_source"; return 1; }
      blob=$(controlled_git hash-object --no-filters -w -- "$safe_source") || {
        rm -f "$safe_source"
        return 1
      }
      rm -f "$safe_source"
      controlled_git update-index --add --cacheinfo "$mode,$blob,$path"
      return
      ;;
    *)
      rm -f "$safe_source"
      return 1
      ;;
esac
}

snapshot_task_tree() {
  [ "${#validated_task_paths[@]}" -gt 0 ] || return 1
  GIT_INDEX_FILE="$tmp_index" controlled_git read-tree HEAD || return
  for path in "${validated_task_paths[@]}"; do
    GIT_INDEX_FILE="$tmp_index" snapshot_task_tree_path "$path" || return
  done
  GIT_INDEX_FILE="$tmp_index" controlled_git write-tree
}

if ! initial_tree=$(snapshot_task_tree); then
  stop_and_ask "initial review snapshot failed"
fi
require_tree_id "$initial_tree" || stop_and_ask "initial snapshot has no valid tree id"
previous_tree=$initial_tree
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
        os.stat(parts[-1], dir_fd=current_fd, follow_symlinks=False)
    except FileNotFoundError:
        pass
    else:
        raise SystemExit('artifact destination already exists')
    leaf_fd = os.open(
        parts[-1],
        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
        0o600,
        dir_fd=current_fd,
    )
    if not stat.S_ISREG(os.fstat(leaf_fd).st_mode):
        raise SystemExit('artifact destination is not a regular file')
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
if ! write_artifact "$initial_tree_file" printf '%s\n' "$initial_tree"; then
  stop_and_ask "failed initial tree artifact"
  exit 1
fi
if ! write_artifact "$initial_diff_file" controlled_git diff --no-ext-diff --no-textconv HEAD "$initial_tree" -- "${validated_task_paths[@]}"; then
  stop_and_ask "failed initial review diff artifact"
  exit 1
fi
if [ ! -s "$repo_root/$initial_diff_file" ]; then
  stop_and_ask "empty initial-review diff"
  exit 1
fi
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
if ! write_artifact "$round_tree_file" printf '%s\n' "$next_tree"; then
  stop_and_ask "failed remediation tree artifact"
  exit 1
fi
if ! write_artifact "$round_diff_file" controlled_git diff --no-ext-diff --no-textconv "$previous_tree" "$next_tree" -- "${validated_task_paths[@]}"; then
  stop_and_ask "failed remediation diff artifact"
  exit 1
fi
```

The temporary-index procedure leaves the **real index, working tree, HEAD, and branch unchanged**.
It never uses `git add -N`, `git reset`, `git stash`, or a checkout against the real index. An
unchanged claimed fix (`$previous_tree` equals `$next_tree`) is a failure: stop re-review dispatch
and raise the task. The conductor does not read either diff: the reviewer is its reader and the
conductor is its courier.

Guard every artifact write, including findings, handoffs, reports, tree ids, and diffs, with the
validated destination and `write_artifact`. Every call is terminal on failure: if `write_artifact`
returns nonzero, call `stop_and_ask`, exit the conductor, and do not run a size check, consume the
artifact, hand it to a reviewer, or dispatch a reviewer. A failed artifact or diff write fails
closed, records the task failure, and stops reviewer dispatch before a stale, missing, or empty
artifact can be handed to a reviewer. The initial diff's non-empty assertion is also guarded with
`stop_and_ask` and `exit 1`.

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

A remediations pass starts only after the initial review reports a Critical or Important finding.
Full specs get at most one remediations pass. Light specs do not enter this section.

Before the pass, assemble a durable file handoff: the original brief, implementer report, prior
findings, prior review diff, and the latest remediation diff. The conductor does not paste artifacts
into a prompt. It writes a one-line prompt that names the remediations pass and tells the recipient
to read that handoff.

#### One remediations pass: continue the original implementer

Continue the exact original implementer session to address the prior blocking findings. After the
remediation, refresh and validate the task path set, snapshot its result, set `next_tree` from that
snapshot, create the remediation-only diff from `previous_tree` to `next_tree`, and stop if the
claimed fix is empty. Record every remediation round in `build-report.md` and its round findings file
with the refreshed paths, tree ids, remediation-only diff destination, reviewer verdict, and
Critical / Important / Minor counts. Then continue the exact original reviewer session for the
finding-scoped re-review. After the review, set `previous_tree=$next_tree`.

#### Announced continuation fallback

If continuation is unavailable or a continued session is dead, announce a fresh-agent fallback in
`build-report.md` before dispatch: identify the pass, role, reason, and pinned replacement. The
pinned fresh agent receives the same durable file handoff: brief, implementer report, findings, and
diff files. This fallback is visible to the reviewer and human, not a silent substitution. A fresh
fallback that dies after dispatch follows the subagent-death policy below.

#### After the remediations pass: stop and ask

After a passing remediations review, proceed to the unchanged conductor-owned staged-snapshot green
bar and atomic commit. If any Critical or Important finding remains after the one remediations
pass, mark the task blocked in `build-report.md`, retain the final findings and diffs, raise it,
and make no second remediations dispatch. Stop and ask. There is no third reviewer round and no
fresh fixer/reviewer pair.

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
review is ship's Review panel call on the most capable model. Where the platform has no knob, dispatch
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
