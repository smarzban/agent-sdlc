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
invocation) yet passed the gate; the autonomous build then halted at its baseline on a correct repo.
**Fix (gate skill):** the gate **executes each declared green-bar command once** (respecting the
vacuous-green rule when target paths don't yet exist) and fails with the command's actual output when a
declared command is unrunnable. Runnability is mechanically decidable (a deterministic exit-code
oracle — NC-4 compatible).

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
- **AC-3** — The gate **executes each declared green-bar command once** and fails the gate (with the
  command's actual output) when a declared command is unrunnable — runnability, not just concreteness.
  *(Reviewer-checkable: gate check 4 mandates executing the bar, not only checking it is concrete.)*
- **AC-4** — The gate's runnability dry-run **respects the vacuous-green rule**: when a command's target
  paths do not yet exist, it is vacuously green (skipped), and the bar binds once the paths exist —
  consistent with the 0.7.0 build-baseline rule. *(Reviewer-checkable: the vacuous-green carve-out is
  stated so a greenfield spec is not falsely failed.)*
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
   the start-of-build agent-roster pinning and the subagent-death policy (AC-1, AC-2).
2. **gate skill text** — `agent-sdlc/skills/gate/SKILL.md`: gains the green-bar runnability dry-run in
   check 4 (AC-3, AC-4).

### Design decisions (flagged for maintainer ratification)

- **D1 — SMA-425 lives in the GATE skill (prose), not in `sdlc-check`.** The issue says "the gate *or*
  sdlc-check." I chose the gate: executing declared commands belongs where execution already happens
  (the agent-driven gate/build), and keeping `sdlc-check` **read-only / no-write** preserves its
  NC-1/NC-2 trust properties (a checker that shells out arbitrary declared commands is a much larger,
  side-effecting trust surface). The oracle is still deterministic (run each command, read its exit
  code), so it is mechanically decidable per the issue. **If the maintainer prefers a stronger,
  checker-enforced dry-run mode, that is a clean follow-up** (a dedicated opt-in `sdlc-check` verb, not
  a change to the read-only default).
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

- **T-1 — Build skill hardening: roster pinning + subagent-death policy (SMA-424).** Edit
  `agent-sdlc/skills/build/SKILL.md` (and `reference/subagent-loop.md`): add, to the loop, a
  start-of-build step that resolves + pins the agent-type roster (announce any substitution once,
  record it in the ledger); and a stated subagent-death policy (capture partial → retry once fresh →
  conductor-takeover, each deviation recorded). *Verification (prose):* re-read against AC-1/AC-2.
  *Advances:* AC-1, AC-2, AC-5. *Component:* build skill text. *Files:*
  `agent-sdlc/skills/build/SKILL.md`, `agent-sdlc/skills/build/reference/subagent-loop.md`.
- **T-2 — Gate green-bar runnability dry-run (SMA-425).** Edit `agent-sdlc/skills/gate/SKILL.md`: extend
  check 4 so the gate executes each declared green-bar command once (vacuous-green-aware) and fails
  with the command's actual output when a command is unrunnable; add the matching checklist step,
  red-flag, and rationalization rows. *Verification (prose):* re-read against AC-3/AC-4.
  *Advances:* AC-3, AC-4, AC-5. *Component:* gate skill text. *Files:*
  `agent-sdlc/skills/gate/SKILL.md`.

AC-5 is a cross-cutting regression guard advanced by both tasks (each keeps the checker suite green and
the spec checker exiting 0).
