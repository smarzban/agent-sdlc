# build-gate-robustness — conductor policy + gate green-bar runnability

## Brief

<!-- source: Linear SMA-424, SMA-425 · ingested 2026-07-04 -->

Two agent-sdlc **skill-discipline** hardening items from the SMA-411 build retro + the enforcement-spine
build, both currently handled by conductor/gate improvisation. Both are prose changes to the pipeline
skills (no product code): they turn an improvised behavior into a stated, deterministic policy.

### SMA-424 — build hardening: pin the agent roster + a subagent-death policy

The SMA-411 build hit two mechanical failure modes handled ad hoc: (1) the custom implementer/reviewer
agent types churned out of the registry mid-run and the conductor rediscovered the degradation
per-dispatch; (2) subagents died on session-limit errors and the conductor silently took over their
work, losing isolation. **Fix (build skill):** resolve and **pin the agent-type roster at build
start** — announce any substitution ONCE up front and record it in the ledger; and state an explicit
**subagent-death policy** — capture partial work, retry once with a fresh subagent, then
conductor-takeover, with every deviation recorded in the ledger.

### SMA-425 — gate: dry-run the declared green bar (runnability, not just concreteness)

Gate check 4 verifies the green bar is *concrete* (no placeholders) but not that it *runs*. In the
enforcement-spine build the declared bar `node --test agent-sdlc/checker/` exited 1 as written (a bad
invocation) yet passed the gate; the autonomous build then halted at its baseline on a correct repo,
with no clear signal that the *declaration* was the problem. **Fix (build baseline — see D1, revised
after review):** the **build baseline** (which already executes the green bar in the isolated
workspace) runs each declared command, respects vacuous-green, and **distinguishes an unrunnable
command (a mis-declared command → STOP and route the fix to techstack, with the actual output) from a
genuinely-red repo from vacuous-green** — turning the confusing halt into an actionable diagnostic.
The **gate and `sdlc-check` stay read-only**: a review-gate panel showed executing arbitrary
spec-declared commands in a read-only stage is a code-execution/side-effect surface (esp. with
start-anywhere external plans), so execution stays where side-effects are expected and isolated.

Scope is exactly these two issues. No product code changes; the checker itself is untouched.

## Acceptance Criteria

<!-- source: Linear SMA-424, SMA-425 · ingested 2026-07-04 -->

- **AC-1** — The build skill resolves and **pins the agent-type roster at build start**; if a type is
  unavailable, the substitution is announced ONCE up front and recorded in the ledger, rather than
  rediscovered per dispatch. *(Reviewer-checkable: the build SKILL text mandates a start-of-build
  roster resolution + one-time announced substitution + ledger record.)*
- **AC-2** — The build skill states an explicit **subagent-death policy**: on a subagent death, capture
  any partial work, retry once with a fresh subagent, and only then conductor-takeover — with the
  deviation recorded in the ledger. *(Reviewer-checkable: the policy is stated as a deterministic
  sequence, not left to improvisation.)*
- **AC-3** — The **build baseline** (where the green bar is already executed in the isolated
  workspace) **executes each declared green-bar command once** and, on a nonzero exit, **distinguishes
  an unrunnable command** (a mis-declared/bad-form command — STOP and route the fix back to techstack,
  the green-bar owner, with the command's actual output) **from a genuinely-red repo** (a real failure
  — the normal red-baseline stop) **from vacuously-green** (targets absent — skip). This turns the
  "autonomous build halts confusingly on a correct repo" case into an actionable diagnostic.
  *(Reviewer-checkable: the build baseline mandates executing each command and separating unrunnable
  from red from vacuous, with the unrunnable case routed to techstack.)*
- **AC-4** — Execution stays where side-effects are expected and isolated: the **build baseline** runs
  the commands (respecting the **vacuous-green rule** — targets absent → skip, binds once they exist),
  while the **gate and `sdlc-check` remain read-only** — no read-only stage executes arbitrary
  spec-declared commands (a code-execution/side-effect surface, sharpened by start-anywhere plans that
  may be external). The gate check-4 change is limited to a note that runnability is verified at the
  build baseline. *(Reviewer-checkable: the gate stays read-only per its HARD-GATE; the vacuous-green
  carve-out is stated; no arbitrary command runs in a read-only stage.)*
- **AC-5** — No regression to the existing pipeline: the two skill edits are internally consistent with
  the existing checker-invocation wiring (they do not contradict gate check 6 or the build loop), the
  full checker suite stays green, and `sdlc-check` exits 0 on this feature's own spec. *(Reviewer-checkable
  + testable: suite passes; spec run exits 0.)*

## Design

<!-- source: derived from the Acceptance Criteria (prose skill edits) · ingested 2026-07-04 -->

No product code; two pipeline skill texts change. The components are declared with the structured
"outside the checker" format SMA-419 introduced (dogfooding it) — they are agent-sdlc's own SKILL.md
files, not numbered checker components.

### Outside the checker (changed components)

1. **build skill text** — `agent-sdlc/skills/build/SKILL.md` (+ `reference/subagent-loop.md`): gains
   the start-of-build agent-roster pinning and the subagent-death policy (AC-1, AC-2), AND the
   green-bar **runnability diagnostic** at the isolated build baseline (AC-3, AC-4).
2. **gate skill text** — `agent-sdlc/skills/gate/SKILL.md`: check 4 keeps verifying the bar is
   *concrete* and adds a one-line note that *runnability* is verified at the build baseline — the gate
   stays **read-only** (AC-4).

### Design decisions (flagged for maintainer ratification)

- **D1 — SMA-425 runnability lives at the BUILD BASELINE, not in the gate or `sdlc-check` (revised
  after review-gate R1).** The issue says "the gate *or* sdlc-check." A review-gate panel (2 HIGH
  security findings, both models) showed that making a **read-only** stage (gate OR checker) execute
  arbitrary spec-declared commands is a genuine code-execution/side-effect surface — a mis-declared or
  malicious `## Tech Stack` command could mutate the repo or exfiltrate secrets, and with the
  **start-anywhere** feature the plan/spec may be external/attacker-controlled. So execution stays where
  it is already done, isolated, and expected: the **build baseline** (build/SKILL.md step 2 runs the
  green bar in the isolated workspace). The build baseline is enhanced to **distinguish an unrunnable
  command from a red repo from vacuous-green** and route an unrunnable command back to techstack. The
  gate and `sdlc-check` stay strictly read-only. **This is a deliberate deviation from the issue's
  literal "the gate should execute," justified by the security findings — flagged for maintainer
  ratification.** ("Deterministic" is honest here: a nonzero baseline exit always STOPS; the
  unrunnable-vs-red label is a routing hint, not the stop decision.)
- **D2 — the death policy is bounded (retry once, then takeover).** A single fresh-subagent retry before
  conductor-takeover balances isolation against progress; unbounded retries would stall an autonomous
  run. Every deviation is recorded so the loss of isolation is visible, never silent.

## Tech Stack

<!-- source: inherited — no products; the deliverable is skill prose · ingested 2026-07-04 -->

No products or dependencies: the deliverable is Markdown skill text under `agent-sdlc/skills/`. The
only mechanical check is the existing checker suite + `sdlc-check` on this spec: green bar =
`node --test agent-sdlc/checker/*.test.mjs` (glob form) + `node agent-sdlc/checker/sdlc-check.mjs
specs/build-gate-robustness/build-gate-robustness.md`.

## Plan

<!-- source: derived from the Acceptance Criteria + the build/gate SKILL.md files · ingested 2026-07-04 -->

Two atomic tasks, one per skill text. Verification is a conformance re-read (reviewer-checked) plus the
checker suite staying green — these are prose edits with no test harness (mirrors enforcement-spine's
T-10/T-11/T-12 skill-wiring tasks).

- **T-1 — Build skill: roster pinning + subagent-death policy + green-bar runnability diagnostic
  (SMA-424 + SMA-425's execution home).** Edit `agent-sdlc/skills/build/SKILL.md` (and
  `reference/subagent-loop.md`): (a) a start-of-build step that resolves + pins the agent-type roster
  (announce any substitution once, record in the ledger); (b) a subagent-death policy (capture partial
  → retry once fresh → conductor-takeover, each deviation recorded); (c) enhance the **step-2 baseline**
  (which already runs the green bar in the isolated workspace) to run each declared command, respect
  vacuous-green, and **distinguish an unrunnable command (STOP + route to techstack with the output)
  from a genuinely-red repo from vacuous-green**. *Verification (prose):* re-read against AC-1/AC-2/AC-3
  and AC-4's build half. *Advances:* AC-1, AC-2, AC-3, AC-4, AC-5. *Component:* build skill text.
  *Files:* `agent-sdlc/skills/build/SKILL.md`, `agent-sdlc/skills/build/reference/subagent-loop.md`.
- **T-2 — Gate stays read-only; runnability is at the build baseline (SMA-425 gate half).** Edit
  `agent-sdlc/skills/gate/SKILL.md`: check 4 keeps verifying the bar is *concrete* and adds a one-line
  note that *runnability* is verified at the build baseline (not executed in the read-only gate); the
  gate's read-only HARD-GATE is preserved. *Verification (prose):* re-read against AC-4's read-only
  half. *Advances:* AC-4, AC-5. *Component:* gate skill text. *Files:* `agent-sdlc/skills/gate/SKILL.md`.

AC-5 is a cross-cutting regression guard advanced by both tasks. **Note (review-gate R1 pivot):** the
runnability EXECUTION moved from the gate (T-2, reverted) to the build baseline (T-1) after two HIGH
security findings — keeping every read-only stage read-only. The commits reflect this as review-round
fixes over the original T-1/T-2.
