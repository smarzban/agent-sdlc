---
name: gate
description: "Read-only consistency and coverage gate before build. Walks the full chain criterion -> component -> product -> task across the whole spec, flags orphans, gaps, constitution violations, and unresolved placeholders, severity-rates every finding, and routes each fix to the stage that owns it. Use AFTER plan and BEFORE build. Triggers: 'verify', 'analyze', 'is this ready to build', 'check coverage', 'spec consistency'. Modifies nothing; it reports."
---

# Gate: walk the chain before anyone writes code

Confirm the spec is internally consistent and fully covered before build begins. Walk the chain
from every acceptance criterion through the component that owns it, the product that realizes it,
and the tasks that build it, and report anything broken. This is a gate, not an editor: it reads
everything and changes nothing, routing each fix to the stage that owns it.

<HARD-GATE>
Reads the `## Brief`, `## Acceptance Criteria`, `## Design`, `## Tech Stack`, and `## Plan` sections
of `specs/<feature>/<feature>.md` (plus `specs/overview.md` at project level), `constitution.md`,
and `CONTEXT.md`. A section may be materialized from a non-canonical source (a provenance marker on
its first line) and the chain may be entered mid-way (some upstream links marked `untraced`); the
gate honours both — see [input-resolution](../getting-started/reference/input-resolution.md).
Writes only `specs/<feature>/gate-report.md`. Modifies NO other file, fixes
NOTHING, writes no code and no plan. Findings are reported with the owning stage
named, so the fix happens there and the gate stays trustworthy. The terminal action is a report and
a verdict: ready to build, or not.
</HARD-GATE>

## The checks (walk all of them)

1. **Coverage, both directions.** Every `AC-N` traces to a component (design), to a product where
   one is needed (techstack), and to at least one task (plan). Flag any criterion with a gap, and
   any component, product, or task that no criterion justifies (orphan / gold-plating). **Mid-chain
   entry:** when the chain was entered below `idea` (e.g. a plan ingested from Linear with no upstream
   criteria), a task whose upstream link is explicitly `untraced` is **not** an orphan — record it in
   the mid-chain-entry coverage note (loud, never a silent pass) rather than flagging it Critical.
   Still flag a genuine gap (a criterion that exists but reaches no task) and any *fabricated* link (a
   trace to an `AC-N` that does not exist).
2. **Consistency.** Terminology matches `CONTEXT.md` across all artifacts, and the artifacts do not
   contradict each other (a criterion the design ignores, a task that fights the design, a product
   the design did not call for).
3. **Constitution.** Nothing across the spec violates a MUST principle.
4. **Verification integrity.** Each test-backed criterion has a kind-of-oracle and a task;
   each reviewer-checked criterion has a named review axis; the design's criterion-to-component map
   and the plan stage's task-to-criterion map are both complete. The project's **green bar** — the
   runnable commands that define a passing build (compile, test, lint, format-check) — is declared
   and concrete (no placeholders), so build inherits one definition of "green". Concreteness is all
   the gate checks here — *runnability* (does each declared command actually run?) is executed and
   diagnosed at the **build baseline** (build stage), where the workspace is isolated and side-effects
   are expected. The gate never executes declared commands: it stays read-only. **Load-bearing library
   claims** in `## Tech Stack` must each be `verified-by-probe` (a probe ran, output kept + referenced)
   or explicitly `asserted` — an `asserted` (or untagged) load-bearing claim is a **finding routed to
   techstack**. The gate checks the **tag and the kept probe output's presence and shape ONLY — it
   never runs the probe and never authenticates its history**: a `verified-by-probe` tag plus a
   referenced, shaped output present -> the claim is treated as probed; an `asserted` or untagged
   load-bearing claim -> a finding; the gate does not and cannot re-verify the probe's truth
   (consistency-not-truth, ADR-0001). The probe itself runs at techstack/spike time — interactive,
   human-in-loop — never in the gate.
5. **Hygiene.** No unresolved TBDs, placeholders, or "decide later" markers remain.
6. **Mechanical corroboration.** After checks 1–5, run the bundled checker as a second, automated
   witness to the same chain: `sdlc-check specs/<feature>/<feature>.md`
   (bare `node`, no install; a plain run auto-scopes to whatever artifacts exist at gate time — do
   not `--require` the ledger or verification report, they don't exist yet). `node` present -> run it
   and interpret the exit code: 0 = corroborated; **nonzero, or the checker crashing, is itself a
   failed check** (fail-closed) — it blocks the verdict exactly like a Critical finding, even if
   checks 1–5 came back clean. `node` absent -> checks 1–5 still stand alone, but state a loud,
   explicit **degraded fallback** line in the report; never skip this check silently.

## Checklist (do in order)

1. **Load every artifact** every section of `specs/<feature>/<feature>.md` plus `specs/overview.md`
   and root `constitution.md` and `CONTEXT.md`.
2. **Build the chain map** for each `AC-N`, assemble criterion -> component -> product -> task(s)
   from the artifacts.
3. **Note provenance + entry point** record which sections carry a source marker (materialized, not
   hand-authored) and where the chain was entered; treat explicitly `untraced` links as entry
   artifacts to surface, not defects to block on.
4. **Run checks 1–5** mechanically, not by impression. The value of this gate is the literal walk.
5. **Run the checker (check 6)** invoke `sdlc-check` over the spec when `node` is present. A nonzero
   exit or a crash is a failed check — do not issue *ready to build*; treat it as a stop-and-ask, and
   if a human explicitly overrides it, record the override in `gate-report.md` (who/what, and why the
   verdict proceeded despite the failed check). `node` absent -> write the degraded-fallback line into
   the report now, so it can't be dropped later.
6. **Severity-rate each finding** Critical (blocks build), High (blocks build), Medium, Low. A failed
   checker run (check 6) rates Critical.
7. **Route each finding** name the owning stage that should fix it (criteria, design, techstack, or
   plan) and a suggested next action.
8. **State the verdict** ready to build only if there are no Critical or High findings AND check 6
   did not fail (or its failure was explicitly overridden and the override is recorded).
9. **Write `gate-report.md`** and stop. Do not fix anything. If Linear sync is enabled in
   `.agent-sdlc/config.json`, also post the gate's status update + report via the `linear-sync` skill.

## Principles

- **Read-only.** A gate that edits its own inputs cannot be trusted to judge them. Report, never
  fix.
- **The chain is the spine.** The walk from criterion to task is the whole point; do it literally.
- **Honest severity.** Critical is Critical. A gate that downgrades findings to pass is theater.
- **Route, don't repair.** Each fix belongs to the stage that produced the gap. Send it back there.
- **Believe the artifacts, flag the contradictions.** Take each artifact at face value and surface
  where they disagree, rather than guessing the intent.
- **Corroborate, don't just impress-check.** The checker is a second, mechanical witness to the same
  chain — a nonzero exit means the automation caught something the walk missed, or contradicts it.
  Either way that's a real finding, not noise to wave past.
- **Degrade loud, never quiet.** No `node`, no corroboration — the manual checks still stand, but say
  so in the report. A silent skip reads as a clean pass it isn't.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I'll just fix this small gap while I'm here." | Then the gate is grading its own work. Report it; the owning stage fixes it. |
| "It obviously hangs together, skip the chain walk." | The mechanical walk is the entire value. Impressions miss the orphan task and the uncovered criterion. |
| "Downgrade this so the build can start." | Severity is honest or the gate is decoration. Block on Critical and High. |
| "No need to name the owning stage." | A finding with no owner does not get fixed. Route it. |
| "The checker isn't installed here, just skip check 6." | `node` absent is a degraded fallback, announced in the report — not a silent skip. |
| "sdlc-check failed but the manual walk looked fine, issue ready to build anyway." | A failed checker run is a failed check — stop-and-ask. Proceeding needs an explicit, recorded human override. |

## Red flags (stop and fix the gate's behavior)

- The gate edited any artifact other than the report.
- A criterion with no task passed as acceptable.
- A "ready to build" verdict issued with a Critical or High finding open.
- A "ready to build" verdict with no green bar declared — build then has no shared definition of "green".
- A "ready to build" verdict issued with a load-bearing library claim left `asserted` (or untagged) —
  an unprobed load-bearing claim passed off as settled.
- Findings stated as impressions rather than located in a specific artifact.
- An `untraced` link or a materialized section silently dropped from the report — a mid-chain entry
  passed off as a fully-traced chain (the same failure as silently dropping review coverage).
- A "ready to build" verdict issued while `sdlc-check` failed, with no recorded override.
- The checker silently skipped when `node` was absent, instead of an announced degraded fallback.

## Done when

- The full chain has been walked for every criterion.
- Load-bearing library claims in `## Tech Stack` are each `verified-by-probe` (tag + referenced kept
  output present) or the `asserted` ones are surfaced as findings.
- All six checks have run, including the checker's mechanical corroboration — or, when `node` was
  absent, a loud degraded fallback is recorded in its place.
- A failed checker run either blocked the verdict or was overridden with the override recorded.
- Every finding is severity-rated, located, owner-named, and given a next action.
- A clear verdict is stated.
- `gate-report.md` is written, and nothing else was modified.

## The artifact (output)

`specs/<feature>/gate-report.md`, containing only:
- **Chain coverage table** `AC-N` -> component -> product -> task(s), with gaps marked.
- **Findings by severity** each with: location (which artifact and where), the issue, the owning
  stage, and a suggested next action.
- **Mid-chain entry / coverage note** (when applicable) — if any section was materialized from an
  external source or any upstream link is `untraced`: name the entry stage, the source (from the
  provenance marker), and which links are unvetted upstream. Visible, never a silent pass.
- **Checker corroboration result** — pass, or failed (stop-and-ask stated, plus the recorded override
  if one was taken), or an announced degraded fallback (`node` absent). Never left implicit.
- **Verdict** ready to build, or not, with the blocking findings listed.

## Conventions

- Lives at `specs/<feature>/gate-report.md`. Read-only over every other artifact.
- Run after the `## Plan` section exists and before build. Re-run after any fix until the verdict is clean.
- Invokes `sdlc-check` (bare `node`, no install) after its own chain walk for
  mechanical corroboration, mirroring the existing ship <-> review-gate contract: present and clean ->
  corroborated; present and failing (or crashing) -> stop-and-ask, override recorded; absent -> an
  announced degraded fallback, never a silent skip. The checker is read-only, same as the gate itself.
- May be invoked **inline by `build`** on a freshly materialized plan (build runs the gate itself when
  no verdict exists for the plan in hand), as well as standalone — the checks are identical either way.
- Critical and High findings block build; the owning stage fixes them and the gate is re-run.
- Mirrors spec-kit's analyze: a read-only consistency and coverage pass that modifies nothing.
- Downstream consumer: the build stage proceeds only on a clean or explicitly accepted report.
