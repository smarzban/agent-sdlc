# Build report — harness-captured-evidence

Resumable ledger (SMA-463). Conductor-driven, subagent-per-task. Build-skill prose. Per-task green bar =
checker suite stays green (`node --test agent-sdlc/checker/*.test.mjs`) + `sdlc-check` on this spec exits 0.
Evidence blocks are **harness-captured** (the conductor ran the commands and pasted the actual output) —
dogfooding this feature's own rule. **Both tasks are prose-only and add no tests**, so per the re-anchored
tail/cap rule (retain the per-test `ok - <name>` lines of the tests *this task adds/exercises*; a task
adding none records the suite summary) the correct retained form here is the checker-suite **summary** —
there are no task-specific per-test names to capture. The summary below is the conductor's own run output,
not a transcription of any subagent count.

## Green bar

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob).
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/harness-captured-evidence/harness-captured-evidence.md`
- **Diff guard (AC-5/NC-1):** `agent-sdlc/checker/` unchanged in this feature's diff.
- **Baseline:** 149 pass / 0 fail; self-checker exit 0 (before T-1; on the PR-B checker).

## Agent-type roster (pinned at build start)

- implementer → `general-purpose`; reviewer → `general-purpose`; fixer → `general-purpose` (if needed).
- No substitution required.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `ca38d30` | AC-1, AC-2, AC-3, AC-5 | build SKILL step 4d/4f sharpened: conductor runs the declared green-bar command itself + captures actual output (harness fact), transcription forbidden; per-test listing + tail/cap bound (retains proof-cited names); both holes named; rationalization row + red flag + done-when; reviewer APPROVE (genuine sharpening not restatement; tail/cap retains per-test names; consistent w/ subagent-loop.md; frontmatter + checker-grammar untouched); 149 green, spec exit 0 |
| T-2 | done | `c02b65b` | AC-4, AC-5 | subagent-loop.md capture section tightened: the authoritative evidence is the conductor's own post-acceptance run (was "one of the runs"); implementer's TDD runs marked not-the-recorded-evidence; reviewer APPROVE (consistent w/ sharpened build SKILL, no correct content removed, no over-claim); 149 green, spec exit 0 |

## Green-bar evidence

### T-1 (@ `ca38d30`)

`agent-sdlc/skills/build/SKILL.md` (+29/−11; prose-only — adds no tests → suite summary is the retained
form). Green bar = checker suite + spec checker + independent conformance reviewer APPROVE (AC-1/AC-2/AC-3;
genuine sharpening confirmed; tail/cap preserves AC-14 per-test names; no checker rule / no over-claim).

```
$ node --test agent-sdlc/checker/*.test.mjs      → # tests 149 · # pass 149 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/harness-captured-evidence/harness-captured-evidence.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = `agent-sdlc/skills/build/SKILL.md` only; 149 pass / 0 fail, spec-exit 0.

### T-2 (@ `c02b65b`)

`agent-sdlc/skills/build/reference/subagent-loop.md` (+8/−3; prose-only — adds no tests → suite summary is
the retained form). Green bar = checker suite + spec checker + independent reviewer APPROVE (AC-4;
consistent with the sharpened build SKILL; no correct existing content removed; no over-claim).

```
$ node --test agent-sdlc/checker/*.test.mjs      → # tests 149 · # pass 149 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/harness-captured-evidence/harness-captured-evidence.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = `agent-sdlc/skills/build/reference/subagent-loop.md` only; 149 pass / 0 fail,
spec-exit 0.

## Checker corroboration

- Resume: n/a (fresh build).
- Build-complete: see below (`sdlc-check … --require ledger`).

## Hand-off

Both tasks done, checker-corroborated (below). SMA-463 is a build-discipline sharpening (no checker change
— NC-1; the checker can't distinguish captured from transcribed text). Branch `feat/harness-captured-evidence`
(off PR-B head `7b8a35a`, PR-C of the 0.10.0 stack) ready. Next: `/agent-sdlc:ship`.
