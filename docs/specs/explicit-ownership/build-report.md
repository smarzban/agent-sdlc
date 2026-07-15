# Build report: explicit-ownership

Branch `feat/explicit-ownership`. Both tasks done, reviewed, and green.

## Agent-type roster (pinned at build start)

No custom `implementer` / `reviewer` / `fixer` agent types are registered in this working copy, so
all three roles ran as **`general-purpose` stand-ins**, announced once here rather than rediscovered
per dispatch. Model: opus for every role.

## Isolation

The build ran on branch `feat/explicit-ownership` in the maintainer's working copy, not in a created
worktree (the repo's local practice is branch + fast-forward merge). Each task's green bar was
verified against its **staged snapshot** with everything else stashed
(`git stash push --keep-index --include-untracked` -> bar -> `pop`), so neither task's uncommitted
work could make the other look green. That mattered here: T-1 and T-5 were in flight concurrently.

## Baseline

`node --test checker/*.test.mjs` -> **157/157, exit 0** (read directly, unpiped). All six chains
under `docs/specs/` exited 0. Green, not vacuous.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `683cea1` | AC-1, AC-2, AC-3, AC-4 | 2 Important + 2 Minor from review, all closed; ratified one behaviour (see Deviations D-1) |
| T-5 | done | `84e2e47` | AC-9 | prose only; 0 Critical, 0 Important; 2 Minor closed |

## Green-bar evidence

### T-1 (@ `683cea1`)

Conductor's own run against the staged snapshot (T-5's uncommitted prose stashed out), exit code
read directly, verdict from the machine reporter:

```
$ git stash push --keep-index --include-untracked   # only checker/ staged remains
$ node --test checker/*.test.mjs > t1-bar.txt 2>&1 ; rc=$?
SUITE EXIT (read directly): 0
# tests 173
# pass 173
# fail 0

ok 96 - a criterion defined with NO list marker is classified from its own block (AC-1)
ok 97 - a task defined with NO list marker owns its own trace fields, and no other id's (AC-1)
ok 98 - a criterion defined with an INDENTED list marker is still its own block (AC-1)
ok 99 - a bold-lead line that is NOT a definition site never owns a following id's fields (AC-2)
ok 100 - a bold-lead non-definition line before the first definition site owns nothing (AC-2)
ok 101 - a block closes at the next `###` subheading rather than absorbing it
ok 102 - lines after a subheading that opens no new block belong to no block
ok 103 - the block splitter degrades to FEWER blocks on ragged input, never throws or fabricates an owner
ok 79 - an untraced marker on a non-definition continuation line is attributed to the block's owner
ok 80 - an untraced marker following a subheading is dropped, escalating its task to a FINDING (fail-closed)
ok 40 - AC-4: every criterion of repo-setup (14) and visual-aids (11) resolves a verification type
ok 41 - AC-1: every newly-typed criterion resolves to the type its OWN source declaration states
ok 42 - AC-3: no chain's resolved verification type changes, except enforcement-spine AC-14
ok 44 - the real chains' trace fields and forward-coverage links are preserved element-wise
ok 45 - every chain under docs/specs/ still exits 0 under the real CLI

$ for d in docs/specs/*/ ; do node checker/sdlc-check.mjs "$d$(basename $d).md" ; echo $? ; done
adoption-quickwins        exit 0
enforcement-spine         exit 0
explicit-ownership        exit 0
repo-setup                exit 0
spec-location-under-docs  exit 0
visual-aids               exit 0
```

Baseline was 157; T-1 adds 16 tests (13 from the implementer, 3 from the review fixes).

### T-5 (@ `84e2e47`)

T-5 is a prose task and adds no tests, so its suite summary is the correct bounded form: still the
conductor's own run against the staged snapshot, not a subagent's report:

```
$ git stash push --keep-index --include-untracked   # only skills/build/reference/subagent-loop.md staged remains
$ node --test checker/*.test.mjs > t5-bar.txt 2>&1 ; rc=$?
SUITE EXIT (read directly): 0
# tests 173
# pass 173
# fail 0
```

AC-9 is reviewer-checked; its proof is the review verdict, recorded below.

## Verification form

Every bar reading in this build: the exact command captured to a file first (`cmd > out.txt 2>&1;
rc=$?`), the exit code read from the unpiped command's own status, and the verdict taken from the
machine reporter's `# fail N` line, never a scraped human summary, never a pipeline's exit, never a
subagent's transcribed count.

## Review record

| Task | Round 1 | Fixes | Round 2 |
| --- | --- | --- | --- |
| T-1 | spec-met, 0 Critical, **2 Important**, 7 Minor | I1 ratified + pinned, I2 fixed, M1 recorded | **all three closed**, 0 Critical, 0 Important, 2 Minor -> both taken |
| T-5 | PASS, 0 Critical, 0 Important, 2 Minor | both Minors taken | n/a (nothing outstanding) |

Both T-1 reviewers verified rather than accepted:

- The **pre-change pinning claim** was checked by reconstructing the pre-change checker from
  `git show HEAD:checker/sdlc-check.mjs` and re-measuring: `TYPES_BEFORE`, `FIELD_TRACES_BEFORE` and
  `LINKS_BEFORE` match element-wise. The tables are real pre-change measurements, not a post-change
  regeneration.
- The **I2 fix** was mutation-tested: a mutant keeping every criterion non-null while inverting every
  declared value makes AC-4's test pass and the new source-grounded oracle test fail, which is
  exactly the hole I2 named.
- The **M1 sharpening** was mutation-tested: making `checkBackwardCoverage` lenient about a missing
  marker turns the test red, and only that test. It bites.

## Deviations

- **D-1: a behaviour ratified in review, not planned.** An `AC: untraced` marker on a
  non-definition continuation line is now attributed to its block's owning task. Pre-change it parsed
  as `from: null`, which `checkBackwardCoverage` (its only consumer, looking markers up by task id)
  can never match, so it was dead data that silenced nothing. The new behaviour makes the marker do
  what its author asked. **Disposition:** ratified by the conductor and pinned by test rather than
  amended into `## Plan`: it changes no plan text, adds no rule (NC-1/NC-3 forbid that), and no
  in-tree chain carries an `untraced` marker at all. It is the only change in the diff that makes the
  gate quieter, which is why it was ruled on explicitly rather than absorbed.
- **D-2: the review diff had to be scoped by hand.** The hand-off's documented blind-diff command
  (`git add -N . ':(exclude).agent-sdlc'`) swept `tool-feedback-2026-07-15.md`, an intentionally
  untracked file, into T-1's review diff. Scoped to `git add -N checker/` instead. **Disposition:**
  no plan change; banked as field feedback. It is the same class as the `git add -A` ban this repo's
  AGENTS.md already carries, and it bites this repo precisely because it deliberately keeps untracked
  trees.
- **D-3: this feature's own defect was live during its own build.** `.agent-sdlc/briefs/` held
  `repo-setup`'s flat `T-1.md`..`T-8.md` from 2026-07-08. Dispatching T-1 at the documented path would
  have handed the implementer another feature's brief. Briefs were written to
  `.agent-sdlc/briefs/explicit-ownership/`, which is what T-5 then made the standing rule. The stale
  `repo-setup` set was left untouched: deleting another feature's record is not a build's call.
  **Disposition:** none needed; this is T-5's fix applied to itself.

## Banked follow-ups (out of scope, recorded so they are not rediscovered)

- **Fence-blindness (review M2).** A bold-lead id inside a fenced code block opens a block and can pin
  the wrong type. Verified **pre-existing**: the pre-change build mis-classifies identically; the
  marker-less broadening only widens the trigger surface. No chain has a bold-lead id inside a fence.
  Fence-tracking would be a new rule AC-1..AC-4 never called for.
- **The blind-diff command's `git add -N .` breadth** (D-2 above).
- **A coverage-map cell's prose is scraped for ids**: `| AC-10 | T-8 (supersedes T-5) |` creates a
  link claiming the superseded T-5 advances AC-10. Verified benign today: no criterion on any chain is
  reached only by a scraped ref. Recorded in the spec under "Known and unfixed".

## Checker corroboration

- **Resume:** not applicable (this was a fresh build with no prior ledger).
- **Build-complete:** **corroborated, exit 0.**

```
$ node checker/sdlc-check.mjs docs/specs/explicit-ownership/explicit-ownership.md --require ledger
sdlc-check 0.15.0: all checks passed — 0 findings, 0 notes.
BUILD-COMPLETE CHECKER EXIT (read directly): 0
```

This is the run that matters for the ledger: it holds every `done` task's recorded SHA to existing,
being reachable from HEAD, and carrying that task's own id in its commit subject's scope position.
Both `feat(T-1)` and `feat(T-5)` pass it. The runtime was present, so no degraded fallback applies.

## Hand-off

Branch ready. Run `/agent-sdlc:ship`.
