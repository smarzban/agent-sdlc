# Build report — plan-ac-contracts

Resumable ledger (SMA-400 + SMA-465). Conductor-driven, subagent-per-task (fresh implementer +
independent reviewer per task; fixer when the reviewer blocks). T-1 is real red→green TDD on the checker;
T-2/T-3 are pipeline prose. Green-bar evidence is **harness-captured** (conductor ran the commands and
pasted actual output, incl. per-test `ok N - <name>` lines — SMA-463 discipline applied here).

## Green bar

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob).
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/plan-ac-contracts/plan-ac-contracts.md`
- **Baseline:** 143 pass / 0 fail; self-checker exit 0 (before T-1).

## Agent-type roster (pinned at build start)

- implementer → `general-purpose`; reviewer → `general-purpose`; fixer → `general-purpose`.
- No substitution required.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `e7a3927` | AC-1, AC-2, AC-3 | checker: pure `extractAcVerification` (per-AC type) + sharpened `checkForwardCoverage` hint for reviewer-checked unreached ACs; real red→green TDD (+5 tests, 148 total). Reviewer CHANGES-NEEDED (1 Important: loose keyword scan misclassified this spec's own AC-1/AC-2 — declaration-first anchor + ambiguity fixture applied by fixer) → re-verified: AC-1/2/3=test-backed, AC-4-7=reviewer-checked; base message byte-unchanged; read-only + never-throw hold |
| T-2 | done | `79c0474` | AC-4, AC-5 | pinned the reviewer-checked carrying-task rule in AC + plan grammar sections (+ AC verification-type + red-flag) and documented the new checker behavior in lockstep; reviewer APPROVE (lockstep confirmed point-by-point vs source incl. hint string; rule in both files; frontmatter byte-identical; NC-1 no-auto-trace stated); 148 green, spec exit 0 |
| T-3 | done | `4d15044` | AC-6, AC-7 | new `build/reference/plan-amendments.md` (detect+STOP→route via plan method→materialize+provenance→inline-gate→ledger; escalation boundary WHAT-vs-HOW; never-authors invariant NC-2) + build SKILL mandate-at-step + rationalization row + red flag + plan SKILL provenance-marked-amendment note; reviewer APPROVE (reuse-not-reinvention: same inline-gate as ingesting-plans.md, no new grammar; scope stays with human; no invariant hole). Non-blocking Minor noted below |

## Green-bar evidence

### T-1 (@ `e7a3927`)

`agent-sdlc/checker/sdlc-check.mjs` + `agent-sdlc/checker/rules.test.mjs` (real code + tests). RED
confirmed (sharpening test + declaration-anchor test failed pre-fix), then GREEN. Reviewer flagged 1
Important (over-broad classifier) → fixer anchored to the `Verification type:` declaration with a loose
fallback + added the ambiguity fixture; re-verified.

```
$ node --test agent-sdlc/checker/*.test.mjs
ok 108 - extractAcVerification classifies each AC by the verification-type text in its own block
ok 109 - extractAcVerification uses the authoritative declaration, not a topic-word mention in prose
ok 110 - extractAcVerification never throws on a ragged / empty Acceptance Criteria block
ok 111 - a reviewer-checked unreached AC gets the carrying-task hint in its coverage-forward finding
ok 112 - a test-backed unreached AC keeps the base coverage-forward message (no hint)
# tests 148 · # pass 148 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/plan-ac-contracts/plan-ac-contracts.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = the two checker files only. 7-AC classification of this spec verified:
AC-1/2/3 = test-backed, AC-4/5/6/7 = reviewer-checked (the misclassification the reviewer caught is fixed
on the shipped spec). Base `coverage-forward` message byte-unchanged; read-only + never-throw confirmed.

### T-2 (@ `79c0474`)

`agent-sdlc/skills/acceptance-criteria/SKILL.md` (+24) + `agent-sdlc/skills/plan/SKILL.md` (+6);
prose-only. Green bar = checker suite + spec checker + independent reviewer APPROVE (lockstep verified
point-by-point vs `sdlc-check.mjs` incl. the hint string; rule pinned in both grammar sections;
frontmatter byte-identical; NC-1 no-auto-trace stated accurately).

```
$ node --test agent-sdlc/checker/*.test.mjs      → # tests 148 · # pass 148 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/plan-ac-contracts/plan-ac-contracts.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = the two SKILL.md files only; 148 pass / 0 fail, spec-exit 0.

### T-3 (@ `4d15044`)

New `agent-sdlc/skills/build/reference/plan-amendments.md` + `agent-sdlc/skills/build/SKILL.md` (+11) +
`agent-sdlc/skills/plan/SKILL.md` (+6); prose-only. Green bar = checker suite + spec checker +
independent reviewer APPROVE (reuse-not-reinvention confirmed vs ingesting-plans.md; escalation boundary
keeps scope with the human; never-authors invariant has no hole; frontmatter untouched).

```
$ node --test agent-sdlc/checker/*.test.mjs      → # tests 148 · # pass 148 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/plan-ac-contracts/plan-ac-contracts.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = the three files only; 148 pass / 0 fail, spec-exit 0.

**Non-blocking Minor (reviewer, recorded for transparency):** a mid-`## Plan` amendment provenance marker
lands mid-section, so the checker's `provenance-marker` rule (which validates only a section's FIRST body
line) does not validate it — it is human-facing provenance; integrity is enforced by the trace/coverage
rules + the inline gate, which the doc states correctly (no over-claim). A one-clause clarification that
the mid-section marker is documentary (not checker-validated) would remove residual ambiguity — left as a
follow-up, or to be folded if review-gate raises it.

## Checker corroboration

- Resume: n/a (fresh build).
- Build-complete: see below (`sdlc-check … --require ledger`).

## Hand-off

All three tasks done, checker-corroborated (below). SMA-465 checker change is real TDD (read-only +
never-throw held); doc pinned in lockstep. SMA-400 amendment protocol reuses the inline gate (no new
grammar). Branch `feat/plan-ac-contracts` (off PR-A head `0a0d49f`, PR-B of the 0.10.0 stack) shipped as
PR #7. Next: maintainer merge authorization (FF SHA-preserving, after PR-A).

## Review-gate — Round 1 (PASS w/ 3 advisory LOWs → fixed) → Round 2 (PASS)

Non-ollama panel. **R1:** holistic ×2 (`claude-opus-4-8` + `codex gpt-5.5`) + `lens-spec` (spec appended)
+ `scan`. Coverage 3/3 voted, 0 missing, scan clean. Lens decision written out (fired lens-spec; skipped
the rest by trigger). opus clean; verdict **PASS** — only 3 LOW/advisory (no critical/high/medium). I
elected to fix all three (cheap, real; #1 corroborated the T-3 reviewer's Minor), committed `122f801`:
- **LOW** — `plan-amendments.md` amendment-marker example → canonical `· ingested YYYY-MM-DD` grammar +
  a documentary clause (mid-`## Plan` stamp is human-facing, not machine-validated; integrity via
  trace/coverage rules + inline gate).
- **LOW** — added a type-unknown (null verification type) coverage-forward fixture (base message, no hint).
- **LOW** — strengthened the reviewer-checked-hint test to assert the full hint wording.

**R2 verification:** single model (`codex gpt-5.5`) over `15ba6a3...HEAD` + scan → **PASS**, all three
resolved, 0 regressions/new. Suite 149 green; `sdlc-check … --require verification-report` exit 0 (the 5
cited test names unchanged). Orchestrator **Approve** (verdict-consistent); **not merged** (parked).
