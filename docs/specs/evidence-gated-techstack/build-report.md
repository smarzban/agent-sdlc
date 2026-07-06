# Build report — evidence-gated-techstack

Resumable ledger (SMA-399 + SMA-464). Conductor-driven, subagent-per-task (fresh implementer +
independent reviewer per task). Skill/reference prose — per-task "green bar" = the checker suite stays
green (`node --test agent-sdlc/checker/*.test.mjs`) + `sdlc-check` on this spec exits 0; correctness of
the prose is conformance-reviewed. Green-bar evidence blocks are **harness-captured** (the conductor ran
the commands and pasted the actual output), not subagent self-report.

## Green bar

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob).
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/evidence-gated-techstack/evidence-gated-techstack.md`
- **Diff guard (AC-7/NC-1):** `agent-sdlc/checker/` unchanged in this feature's diff.
- **Baseline:** 143 pass / 0 fail; self-checker exit 0 (before T-1).

## Agent-type roster (pinned at build start)

- implementer → `general-purpose`; reviewer → `general-purpose`; fixer → `general-purpose` (if needed).
- No substitution required.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `81187a7` | AC-2, AC-3, AC-7 | probing.md — throwaway-spike + runnable-probe discipline + 3 pinned boundary constraints; reviewer APPROVE (scope-clean, accurate vs source: does NOT claim the checker walks component→product; read-only boundary intact); 143 green, spec exit 0 |
| T-2 | done | `fa07fc9` | AC-1, AC-4, AC-7 | techstack SKILL: probe rule (checklist step 5 + choice-bar 7 + principle), verified-by-probe/asserted tags in artifact contract, mandate-at-step read of probing.md; reviewer APPROVE (renumbering sequential 1-11 / 1-8, frontmatter untouched, read-only boundary intact, no fast-path leak); 143 green, spec exit 0 |
| T-3 | done | `3d00ad4` | AC-5, AC-7 | gate check 4 flags asserted/untagged load-bearing library claims (finding routed to techstack) + red flag + done-when; read-only mechanics pinned (reads tag + output presence/shape only, never runs the probe); reviewer APPROVE (CRITICAL boundary clean, consistent with existing check 4, frontmatter untouched); 143 green, spec exit 0 |
| T-4 | done | `97a1072` | AC-6, AC-7 | in-stack "No new products — reuses the declared stack" fast-path form: defined in techstack artifact contract, recognized in gate check-1 walk; framed gate-recognized (D3, grep-verified: checker does not walk component→product), NOT a checker rule; reviewer APPROVE (purely additive, checker untouched, frontmatter untouched, no T-1..T-3 regression); 143 green, spec exit 0 |

## Green-bar evidence

### T-1 (@ `81187a7`)

New reference doc `agent-sdlc/skills/techstack/reference/probing.md` (prose-only). Green bar =
checker suite + spec checker + independent conformance reviewer APPROVE (scope confirmed single-file;
accuracy cross-checked vs `sdlc-check.mjs` + `gate/SKILL.md`; read-only boundary intact).

```
$ node --test agent-sdlc/checker/*.test.mjs      → # tests 143 · # pass 143 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/evidence-gated-techstack/evidence-gated-techstack.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = probing.md only (`git diff --cached --name-only`); 143 pass / 0 fail,
spec-exit 0. Reviewer APPROVE (no Critical/Important; 2 Minor follow-ups noted for T-2's tag-format).

### T-2 (@ `fa07fc9`)

`agent-sdlc/skills/techstack/SKILL.md` (+30/−8; prose-only). Green bar = checker suite + spec checker +
independent conformance reviewer APPROVE (AC-1/AC-2/AC-4 all satisfied; renumbering verified sequential;
frontmatter byte-identical; read-only boundary intact).

```
$ node --test agent-sdlc/checker/*.test.mjs      → # tests 143 · # pass 143 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/evidence-gated-techstack/evidence-gated-techstack.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = `agent-sdlc/skills/techstack/SKILL.md` only; 143 pass / 0 fail, spec-exit 0.

### T-3 (@ `3d00ad4`)

`agent-sdlc/skills/gate/SKILL.md` (+13/−1; prose-only). Green bar = checker suite + spec checker +
independent conformance reviewer APPROVE (AC-5 finding + red flag + done-when; the CRITICAL read-only
boundary confirmed clean — the added text reads tag + output presence/shape only, never executes).

```
$ node --test agent-sdlc/checker/*.test.mjs      → # tests 143 · # pass 143 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/evidence-gated-techstack/evidence-gated-techstack.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = `agent-sdlc/skills/gate/SKILL.md` only; 143 pass / 0 fail, spec-exit 0.

### T-4 (@ `97a1072`)

`agent-sdlc/skills/techstack/SKILL.md` (+10/−1) + `agent-sdlc/skills/gate/SKILL.md` (+8/−1); prose-only,
purely additive. Green bar = checker suite + spec checker + independent reviewer APPROVE (AC-6 + D3
framing; `agent-sdlc/checker/` grep-verified untouched and confirmed not to walk component→product).

```
$ git diff --cached --name-only   → agent-sdlc/skills/gate/SKILL.md, agent-sdlc/skills/techstack/SKILL.md  (checker untouched ✓)
$ node --test agent-sdlc/checker/*.test.mjs      → # tests 143 · # pass 143 · # fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/evidence-gated-techstack/evidence-gated-techstack.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: staged snapshot = the two SKILL.md files only; 143 pass / 0 fail, spec-exit 0.

## Checker corroboration

- Resume: n/a (fresh build).
- Build-complete: see below (`sdlc-check … --require ledger`).

## Hand-off

All four tasks done, checker-corroborated (below). Enforcement is gate-walk (no `sdlc-check.mjs` change —
NC-1); read-only boundary intact (NC-2). Branch `feat/evidence-gated-techstack` (off `main`, PR-A of the
0.10.0 stack) shipped as PR #6. Next: maintainer merge authorization (FF SHA-preserving).

## Review-gate — Round 1 (BLOCK → fixed) → Round 2 (PASS)

Non-ollama panel (per campaign steer). **R1 discovery:** holistic ×2 (`claude-opus-4-8` + `codex gpt-5.5`)
+ `lens-spec` (spec appended) + deterministic `scan`. Coverage 3/3 voted, 0 missing, scan clean. opus
first non-voted (prosed then appended `[]`) → re-ran array-only → clean vote, 0 findings. gpt-5.5 holistic
raised **2 mediums** (single-model, contested — opus reviewed the same areas clean); I read both in-code,
**confirmed real** (boundary-declaration gaps, the 0.6.0 ship-checklist-vs-HARD-GATE class), and **fixed**
(not dismissed) in `7f87ce4`:
- **MEDIUM** — techstack HARD-GATE ("do NOT write code") contradicted step 5 (write/run a probe script):
  HARD-GATE now exempts throwaway spike files + the durable kept probe-output artifact, forbids
  product-tree/manifest/lockfile mutation (probing.md constraint (i)).
- **MEDIUM** — gate check-4 read the kept probe output, outside the gate HARD-GATE's declared read set:
  read set now includes "any probe-output artifact a `## Tech Stack` claim references (read-only, presence
  + shape only)"; check 4 names the minimal evidence shape and reaffirms the gate never executes.

**R2 verification:** single model (`codex gpt-5.5`) over the fix diff `56df641...HEAD` + scan → **PASS**,
both findings resolved, 0 regressions, 0 new. Suite 143 green; `sdlc-check … --require verification-report`
exit 0; `agent-sdlc/checker/` untouched `main..HEAD`. Orchestrator **Approve** (verdict-consistent);
**not merged** (parked for maintainer authorization).
