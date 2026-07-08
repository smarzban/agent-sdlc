# Build report — repo-setup

Conductor ledger. Branch `repo-setup` off `main` (`49cc961`), spec + gate committed `8ab52b6`.
Fresh build 2026-07-08 (no prior ledger — resume-point checker correctly skipped; build-complete
run will be the first `--require ledger` invocation).

**Isolation:** existing dedicated feature branch in the maintainer's working copy (repo
precedent; FF-merge discipline) — no worktree created. `.agent-sdlc/briefs/` used for file
hand-offs, untracked (explicit-path commits only).

**Baseline (vacuous-green rule not needed — suite exists):**

```
$ node --check checker/sdlc-check.mjs   # exit 0
$ node --test checker/*.test.mjs        # exit 0 (file-first capture, exit read directly)
# tests 157
# pass 157
# fail 0
```

**Agent-type roster (pinned at build start):** the platform registry has no dedicated
implementer/reviewer/fixer types → **implementer → general-purpose stand-in; reviewer →
general-purpose stand-in; fixer → general-purpose stand-in** (announced once here, per the
roster rule). Model tiering: prose-spec implementer tasks and reviewers dispatched on the
mid-tier model (sonnet); T-6 is a conductor-run verification task (no product diff — no
implementer; rationale in its ledger row).

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `747cbd3` | AC-14 | reviewer: spec-met, 1 Minor (tag consistency — accepted) |
| T-2 | done | `a123055` | AC-3, AC-4, AC-7 | reviewer: spec-met, 1 Minor (seed-status labeling granularity — accepted; T-4's declared list counts AGENTS.md as token-carrying) |
| T-3 | done | `b2241a0` (+corrective `a48a25b`) | AC-3, AC-5, AC-6, AC-7 | reviewer R1: 2 Important (broken probe link ../ depth; step-2 find count claim) → fixer → R2 clean; corrective at T-6 execution (step-6 grep shim, see Deviations) |
| T-4 | done | `705e431` | AC-1, AC-2, AC-7, AC-8, AC-9, AC-12 | reviewer R1: 1 Important (audit "drifted" = byte-divergence from template — misreads filled files as drift) → fixer (contract-based semantics) → R2 clean |
| T-5 | superseded | — | — | R1 found a Critical coherence gap exceeding the planned file set → amended to T-8 (see Deviations) |
| T-6 | done | `74dc295` | AC-3, AC-5, AC-6, AC-7 | conductor-run (no product diff — the evidence capture IS the conductor's step-4d duty; no implementer dispatched, rationale recorded); step 6 R1 false-fail → fix(T-3) `a48a25b` → all assertions pass |
| T-7 | done | `1e1c83f` | AC-13 | reviewer: PASS, 1 Minor (README section framing) — fixed in-task (section renamed Standalone skills); JSON parse + lockstep verified by conductor |
| T-8 | done | `eefb0f3` | AC-10, AC-11 | supersedes T-5; inline gate round 3 clean; re-review: 0 findings |

## Green-bar evidence

### T-1 (@ `747cbd3`)

Prose task — adds no tests; suite summary is the correct bounded form (conductor's own
staged-snapshot run: `git stash --keep-index --include-untracked` → bar → pop; exits read
directly, file-first capture).

```
$ node --check checker/sdlc-check.mjs    # exit 0
$ node --test checker/*.test.mjs         # exit 0
# tests 157
# pass 157
# fail 0
```

### T-2 (@ `a123055`)

Prose task — adds no tests; suite summary (conductor's own staged-snapshot run, same form as
T-1).

```
$ node --check checker/sdlc-check.mjs    # exit 0
$ node --test checker/*.test.mjs         # exit 0
# tests 157
# pass 157
# fail 0
```

### T-3 (@ `b2241a0`)

Prose task — adds no tests; suite summary (conductor's own staged-snapshot run).

```
$ node --check checker/sdlc-check.mjs    # exit 0
$ node --test checker/*.test.mjs         # exit 0
# tests 157
# pass 157
# fail 0
```

### T-4 (@ `705e431`)

Prose task — adds no tests; suite summary (conductor's own staged-snapshot run).

```
$ node --check checker/sdlc-check.mjs    # exit 0
$ node --test checker/*.test.mjs         # exit 0
# tests 157
# pass 157
# fail 0
```

### T-8 (@ `eefb0f3`)

Prose task — adds no tests; suite summary (conductor's own staged-snapshot run).

```
$ node --check checker/sdlc-check.mjs    # exit 0
$ node --test checker/*.test.mjs         # exit 0
# tests 157
# pass 157
# fail 0
```

### T-6 (@ `74dc295`)

Conductor's own fixture-verification run — the full captured transcript is the committed probe
artifact `probes/fixture-run-2026-07-08.md` (same commit); the deciding observations:

```
step2-count: 11
present: AGENTS.md / CLAUDE.md / AGENTS.local.md / .gitignore   (step 3 — AC-3)
step 4 CLAUDE.md exact-content diff-exit:0                      (AC-3)
step 5 git check-ignore AGENTS.local.md → AGENTS.local.md, exit:0 (AC-3)
step 6 token grep vs declared list diff-exit:0 (10 files, CLAUDE.md in neither) (AC-7)
step 7 probe (present): ZEBRA42 + FALCON77 recalled, exit:0     (AC-5)
step 8 probe (absent): ZEBRA42 only, no error/warning, exit:0   (AC-6)
teardown-exit:0
```

Suite (staged snapshot): `node --check` exit 0; `node --test` exit 0 — # tests 157 / # pass 157
/ # fail 0.

### T-7 (@ `1e1c83f`)

Prose/manifest task — adds no tests; suite summary (conductor's own staged-snapshot run), plus
conductor-verified `JSON.parse` on all four manifests, `cmp` lockstep-identical plugin.json pair.

```
$ node -e "[...4 manifests...].forEach(f=>JSON.parse(readFileSync(f)))"   # json-ok
$ cmp .claude-plugin/plugin.json .cursor-plugin/plugin.json               # lockstep-identical
$ node --check checker/sdlc-check.mjs    # exit 0
$ node --test checker/*.test.mjs         # exit 0
# tests 157
# pass 157
# fail 0
```

## Checker corroboration

- Resume point: N/A — fresh build (no prior ledger; rule followed, first invocation deferred to
  build-complete).
- Build-complete: `bin/sdlc-check docs/specs/repo-setup/repo-setup.md --require ledger` →
  **exit 0** (all checks passed, 0 findings, 0 notes; sdlc-check 0.13.0). Corroborated —
  branch handed to `/agent-sdlc:ship`.

## Ship review (Empanel gate, PR #14)

- **R1 (head `75dec73`): BLOCK.** Full pinned roster — 4 holistic seats (deepseek, glm-5.2,
  gpt-5.5, opus-4-8) + lens-spec ×2 (gpt, deepseek) + deterministic scan; zero non-votes.
  Blocker: llms.txt skill-inventory omission (medium, 2 models, code-confirmed). Advisory lows:
  docs landing caption; SKILL.md description pointer wording. Two single-model mediums (CLAUDE.md
  template vs AC-3's letter) dismissed with code-checked justifications — root = AC-3 wording
  erratum, logged for the maintainer; dismissal log at `.empanel/pr14-round1-dismissals.json`.
  Fixes: `7dd5aac`.
- **R2 (head `7dd5aac`): PASS.** Single-model verification (gpt-5.5) + fresh scan: blocker
  resolved, advisories fixed, no regressions. Verdict comments posted per round; merge parked
  for the maintainer.

## Deviations

- **T-6 step-6 false-fail → corrective `fix(T-3)` `a48a25b` (2026-07-08).** Divergence: the
  procedure's recursive token grep silently omitted the gitignored `AGENTS.local.md` under this
  harness's `grep` shim (`ugrep --ignore-files` honors .gitignore) — a false red the fail-closed
  rule correctly stopped on. Also exposed: T-3's implementer had reported steps 1–6 "pass as
  written" from its own dry-run; the conductor's run did not reproduce that for step 6 —
  corroborating the evidence-is-the-conductor's-own-run rule. **Disposition:** mechanical
  command-form defect in T-3's artifact (not plan drift — no `## Plan` change needed; exact
  files unchanged); fixed in place (`command grep` + rationale note), committed as the
  tolerated corrective annotated in T-3's ledger cell, step 6 re-run green.

- **T-5 → T-8 (mid-build amendment, 2026-07-08).** Divergence: T-5's reviewer found a Critical
  coherence gap — the seed-marker exception landed at the Phase 5 placeholder scan while three
  other unqualified no-placeholder statements in the same skill and the delegated
  `reference/fact-check-and-verify.md` still read absolute; fixing it requires a file outside
  T-5's exact-files list. Mechanical drift (same WHAT, wider WHERE). **Amendment disposition:**
  delta routed through the plan method, materialized into `## Plan` with the provenance marker
  (`source: mid-build amendment … · ingested 2026-07-08`), T-5 marked superseded (id retained),
  T-8 created with the full file set, coverage map updated; inline gate round 3 on the amended
  chain = READY TO BUILD (`sdlc-check` exit 0, recorded in `gate-report.md`). T-5's uncommitted
  working-tree diff carried forward as T-8's starting point.
