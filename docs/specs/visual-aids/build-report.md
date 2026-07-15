# Build report — visual-aids

Resumable ledger for the `visual-aids` build. Branch `feat/visual-aids`, base `main` @ `ba70219`.
Started 2026-07-15 from gate verdict **ready to build** (`gate-report.md`, round 2: M-1 and L-1
closed, L-2 justified, no Critical or High).

## Workspace and roster (pinned once at build start)

**Isolation: inherited, not created.** The build ran on the dedicated `feat/visual-aids` branch in the
primary working copy. No worktree was created, so **ship must not clean one up**. Rationale: the four
tasks are sequential (T-2/T-3/T-4 all depend on T-1) and touch four disjoint files, so there is no
parallel-write hazard for a worktree to solve, and a separate tree would only complicate the
subagents' file paths.

**Agent-type roster — substitution announced once, here.** The declared `implementer` / `reviewer` /
`fixer` agent types do not exist in this harness. All three resolve to **`general-purpose`**. Not
rediscovered per dispatch. Model tiering per dispatch:

| Role | Agent type | Model | Why |
| --- | --- | --- | --- |
| implementer (T-1) | general-purpose (stand-in) | opus | The core deliverable: ~90 lines of load-bearing normative prose where prose quality *is* the product. |
| implementer (T-2..T-4) | general-purpose (stand-in) | sonnet | Short hooks; the brief carries near-complete content. |
| reviewer | general-purpose (stand-in) | sonnet | Small diffs, mid-tier floor. |
| fixer | general-purpose (stand-in) | sonnet | Bounded, subtractive edits. |

**Baseline green bar (step 2), conductor's own run, exit codes read directly and unpiped.** Not
vacuous: the bar's target paths already exist.

```
$ node --check checker/sdlc-check.mjs
EXIT: 0
$ node --test checker/*.test.mjs
# tests 157
# pass 157
# fail 0
EXIT: 0
```

**Checker at step 3:** skipped **by the rule**, not silently. This is a fresh build with no
pre-existing `build-report.md`, so the resume invocation point does not apply; the build-complete run
(step 5) is the first invocation.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `321c698` | AC-1, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11 | Review round 1: 1 Important + 3 Minor, all accepted and fixed; round 2 clean (0 findings). 94 -> 89 lines. |
| T-2 | done | `9f36af2` | AC-1, AC-3 | Review round 1: 1 Important (restated the reference doc's rationale: a hook, not a copy) -> cut; round 2 clean. 187 -> 194 lines. Placement independently re-verified by the conductor. |
| T-3 | done | `25a366a` | AC-2, AC-3 | Review round 1: clean, 0 findings, first pass. 198 -> 200 lines (the tightest budget). Byte-for-byte unchanged through the T-2/T-4 fix round. |
| T-4 | done | `f9a0a38` | AC-2, AC-3 | Review round 1: **spec-met NO** — 1 Important (weaker in force than the primary hook) + 1 Minor (trigger undercounted the step's range); both fixed, round 2 clean. 138 -> 140 lines. |

All four done. No task left in-progress or blocked.

## Green-bar evidence

Each block is the **conductor's own post-review run** on the committed snapshot, captured file-first
(`cmd > out.txt 2>&1; rc=$?`) and read from the file. Exit codes are read directly, never through a
pipe; counts are the machine reporter's own `#` lines, never a scraped human summary or a subagent's
reported count.

**Verification form for every task in this build:** these tasks add **no tests** (the product is
instruction prose; the feature's non-goals forbid a runtime component and forbid adding a test under
`checker/`). Per the loop's rule, a task that adds no tests has no task-specific per-test names, and
its **suite summary is the correct bounded form** — still the conductor's own run. The suite count
staying at exactly 157 is itself a required check here, since the non-goals require the checker's
suite to be unchanged in count.

### T-1 (@ `321c698`)

```
$ node --check checker/sdlc-check.mjs
EXIT: 0

$ node --test checker/*.test.mjs
# tests 157
# pass 157
# fail 0
# cancelled 0
EXIT: 0

$ git diff --stat main -- checker/ bin/ package.json
(empty)
```

Suite unchanged at 157/157 (non-goal: suite count unchanged). The `git diff --stat` guard is empty,
mechanically confirming the two non-goals that forbid a checker change and any runtime component.

### T-2 (@ `9f36af2`)

```
$ node --test checker/*.test.mjs
# tests 157
# pass 157
# fail 0
EXIT: 0
```

Task-specific check (the anchor's pointer, asserting the **expected line** rather than exit 0, since
the resolution loop exits 0 vacuously when it finds nothing):

```
$ <link-check resolution loop>
  OK   skills/getting-started/SKILL.md -> reference/visual-aids.md
```

Placement (the load-bearing check) independently re-verified by the conductor against the file's own
section order, not the subagent's report: `## Shared operating rules (every stage obeys these)` spans
lines 46-92; the anchor lands at line 127. **Outside the every-stage list**, as required.

### T-3 (@ `25a366a`)

```
$ node --test checker/*.test.mjs
# tests 157
# pass 157
# fail 0
EXIT: 0
```

```
$ <link-check resolution loop>
  OK   skills/architecture-design/SKILL.md -> ../getting-started/reference/visual-aids.md
```

### T-4 (@ `f9a0a38`)

```
$ node --test checker/*.test.mjs
# tests 157
# pass 157
# fail 0
EXIT: 0

$ node --check checker/sdlc-check.mjs
EXIT: 0

$ git diff --stat main -- checker/ bin/ package.json
(empty)
```

T-4 is the task that brings the corpus to the three expected pointers, so it is where AC-3's **full
guarded ship oracle** first becomes provable. The conductor ran it here, and it is a genuine
red -> green rather than an assertion:

```
$ <AC-3 full guarded oracle: count >= 3, then resolution>     # BEFORE the pointers existed
FAIL: expected >=3 pointers (anchor + 2 homes), found 0
EXIT: 1

$ <AC-3 full guarded oracle: count >= 3, then resolution>     # AFTER T-2, T-3, T-4
  OK   skills/idea/SKILL.md -> ../getting-started/reference/visual-aids.md
  OK   skills/getting-started/SKILL.md -> reference/visual-aids.md
  OK   skills/architecture-design/SKILL.md -> ../getting-started/reference/visual-aids.md
EXIT: 0
```

That red is the gate's M-1 finding paying off: before the count guard was added, this same oracle
exited **0** on zero pointers and could not have failed.

## Checker corroboration

| Invocation point | Result |
| --- | --- |
| Resume (step 3) | **Skipped by the rule, not silently.** Fresh build, no pre-existing ledger, so the resume point does not apply. |
| Build-complete (step 5) | **Corroborated, pass.** |

```
$ sdlc-check docs/specs/visual-aids/visual-aids.md --require ledger
sdlc-check 0.15.0: all checks passed — 0 findings, 0 notes.
EXIT: 0
```

Resolved per the checker-resolution rule (bare `sdlc-check` is on PATH, first hit wins). Runtime
present, so no degraded fallback was needed. No override taken or required. `--require verification-report`
was **not** passed: that artifact is ship's, not build's.

This run exercises the ledger-vs-git recorded-commit rule against all four tasks: each recorded SHA
exists, is reachable from HEAD, and its commit subject names exactly that task in the `type(scope):`
scope position (`feat(T-1):` … `feat(T-4):`).

## Deviations

Every in-loop departure from the plan's letter, with its disposition.

- **D-1 — the conductor's T-1 brief over-specified beyond the ratified plan.** *Divergence:* the
  implementer brief asked for scratch-visual shape guidance (theme adaptability via `currentColor` /
  `prefers-color-scheme`, and ARIA labelling) that appears only as an informal aside in the tech-stack
  probe log, never in the ratified `## Tech Stack` choices or the plan's "must also carry" list. The
  implementer followed the brief correctly; the review caught it as over-build (Important).
  *Disposition:* **no plan amendment needed — the plan was right and the brief was wrong.** Both
  bullets were cut in the fix round, restoring the document to exactly what the plan ratified. Nothing
  in `## Plan` changed, so there is no delta to materialize. Recorded because a conductor brief that
  silently adds scope is the same class of drift as a task that does, and the ledger is where it
  belongs.
- **D-2 — no em dashes, diverging from the sibling reference docs' punctuation.** *Divergence:* the
  repo's authoring convention lists em dashes as house voice and both calibration siblings
  (`light-tier.md`, `input-resolution.md`) use them heavily; the new document uses none. *Disposition:*
  **deliberate, no amendment.** The maintainer's standing style rule bans em dashes in new text, and
  it overrides. The divergence is punctuation only, not register or density. Flagged by the T-1
  implementer unprompted, which is the right instinct. Surfaced here so review sees it as a decision
  rather than a slip.
- **D-3 — T-3 and T-4 were dispatched before T-2 was reviewed and committed.** *Divergence:* the loop
  runs each task's implement -> review -> commit cycle to completion before the next. Here three tasks'
  changes coexisted in the working tree at once. *Disposition:* **no plan amendment; the plan's
  dependency order was respected** (all three depend only on T-1, which was done, and none depends on
  another). The two risks the loop's ordering guards against were controlled explicitly rather than
  by luck: each task was reviewed against its **own file-scoped diff** (`git diff -- <file>`, produced
  blind), and each was committed as its own atomic single-file commit, so no commit mixes tasks and no
  review saw another task's changes. T-3 was additionally verified byte-for-byte unchanged through
  T-2/T-4's fix round. Recorded because it is a real departure from the loop's letter, and the ledger
  is where a departure belongs even when it cost nothing.
- **D-4 — the brief directory is feature-agnostic, so a previous feature's briefs sat at this
  feature's paths.** *Divergence:* the loop's file hand-off names briefs `.agent-sdlc/briefs/T-N.md`.
  That path carries no feature, so `.agent-sdlc/briefs/T-1.md` still held the **repo-setup** feature's
  T-1 brief from 2026-07-08, along with its findings and diffs. Dispatching against that path would
  have handed a subagent a different feature's task. *Disposition:* **worked around, not amended** —
  this build scoped its briefs to `.agent-sdlc/briefs/visual-aids/`, leaving the stale set untouched.
  No plan delta: the collision is in the tool's convention, not in this feature's plan. Filed as field
  feedback; it is the same class as a canonical scratch path colliding across runs.
