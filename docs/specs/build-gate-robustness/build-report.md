# Build report — build-gate-robustness

Resumable ledger (SMA-424 + SMA-425). Conductor-driven, subagent-per-task. Prose-only feature (two
pipeline SKILL.md edits) — "green bar" per task = the checker suite stays green + `sdlc-check` on this
spec exits 0; correctness of the prose is verified by a conformance-reviewer subagent.

## Green bar

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob form).
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/build-gate-robustness/build-gate-robustness.md`
- **Baseline:** 143 pass / 0 fail; self-checker exit 0.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `9169a75` | AC-1, AC-2, AC-5 | build skill: roster pinning + subagent-death policy (SMA-424); reviewer APPROVE + 1 minor cross-ref polish; suite 143 green, spec exit 0 |
| T-2 | done | `1f3f9a0` | AC-3, AC-4, AC-5 | gate skill: green-bar runnability dry-run (SMA-425); reviewer APPROVE (renumbering clean) + 1 minor clarity polish; suite 143 green, spec exit 0 |

## Checker corroboration

- Resume: n/a (fresh build).
- Build-complete: **PASS** — `sdlc-check specs/build-gate-robustness/build-gate-robustness.md
  --require ledger` → exit 0. Both done tasks' recorded commits (`9169a75`/`1f3f9a0`) are reachable
  ancestors with `feat(T-N):` subjects scoping their task; the structured external components resolve.

### T-2 (@ `1f3f9a0`)

```
$ node --test agent-sdlc/checker/*.test.mjs
# tests 143 · # pass 143 · # fail 0     (unchanged — prose-only)
$ node agent-sdlc/checker/sdlc-check.mjs specs/build-gate-robustness/build-gate-robustness.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: 143 pass / 0 fail, spec-exit 0. Reviewer APPROVE (AC-3+AC-4 met; checklist renumbering
verified clean); +1 Minor clarity polish (red-suite-on-existing-code is a real finding, not a skip).

## Hand-off

Both tasks done, checker-corroborated. Branch `feat/build-gate-robustness` (off `feat/checker-semantics`,
PR #3) is ready. Next: `/agent-sdlc:ship`.

## Review-gate — Round 1 (BLOCK → design pivot)

Panel (no-ollama): holistic ×2 (opus + gpt-5.5) + lens-security + lens-spec + scan. Coverage 3/5 voted,
1 missing (lens-spec opus non-vote, surfaced in the Coverage line). Verdict **BLOCK** on a design flaw
both models caught: my SMA-425 implementation made the **read-only gate execute arbitrary declared
commands** — 2 HIGH security findings (code-execution/side-effect surface, sharpened by start-anywhere
external plans) + mediums (unreconciled read-only invariant; "deterministic oracle" overclaim;
gate-report didn't record the dry-run) + a low (checklist double-run).

**Pivot (both HIGH findings' recommendation): keep every read-only stage read-only; move runnability
EXECUTION to the build baseline.** Commits `d5c55a2` (reverted the gate check-4 execution → gate is
read-only again with a note pointing to the build baseline; added the runnability diagnostic to
build/SKILL.md step 2's isolated baseline: unrunnable command → techstack declaration defect, distinct
from red-repo and vacuous-green) + `1b0b746` (spec + proof-map reworded: AC-3/AC-4 now build-baseline +
gate-read-only; D1 revised with the security rationale). **This deliberately deviates from the issue's
literal "the gate should execute" — flagged in the PR body for maintainer ratification.** Suite stays
143 green; full pre-PR checker exit 0; the gate executes no declared command. Round 2 = a two-model
verification (the pivot was a large/risky fix — escalated beyond single-model).

## Green-bar evidence

### T-1 (@ `9169a75`)

Prose-only skill edit (build/SKILL.md + reference/subagent-loop.md); no code, so the green bar is the
checker suite staying green + `sdlc-check` on this spec, plus the conformance-reviewer's APPROVE.

```
$ node --test agent-sdlc/checker/*.test.mjs
# tests 143 · # pass 143 · # fail 0     (unchanged — no code touched)
$ node agent-sdlc/checker/sdlc-check.mjs specs/build-gate-robustness/build-gate-robustness.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: 143 pass / 0 fail, spec-exit 0. Reviewer APPROVE (AC-1 + AC-2 met, no loop regression); +1
Minor polish (Principle cross-reference to the sanctioned death-takeover exception).
