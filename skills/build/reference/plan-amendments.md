# Amending the plan mid-build — when reality diverges from `## Plan` (conductor discipline)

The plan names exact files, symbols, and tests before any code exists, so some of them are inevitably
wrong at build time — a path that moved, a symbol that got renamed, a task that has to split, a
dependency the plan assumed differently. build is forbidden to edit `## Plan` on its own judgment, and
silently adapting drifts the spec from the code and kills the trace the pipeline depends on. This
discipline is the sanctioned loop for changing `## Plan` mid-build. It **reuses existing machinery** —
the provenance marker, the inline gate, and the ledger — and adds no new checker grammar. It is the
sibling of [ingesting-plans.md](ingesting-plans.md): same register, same materialize-then-gate shape;
that adapter changes how a plan *arrives*, this one changes how a plan *evolves*. See the shared
[input-resolution](../../getting-started/reference/input-resolution.md) rule for the general contract.

## When this applies

Mid-build, an implementer (or the conductor verifying a diff) hits a plan/reality mismatch that the
task cannot honour as written:

- a named file or path is wrong (moved, renamed, never existed);
- a symbol the plan named was renamed or has a different signature;
- a task must split — it cannot finish green in one atomic commit as sized;
- a dependency the plan assumed (a library, an interface, an earlier task's output) differs from reality.

This is **mechanical drift** — the *what* we build is unchanged, only *how* or *where* a task touches
the code. It is **not** a scope or acceptance-criteria change: that escalates (see the boundary below).

## The amendment sequence (runs when a mismatch is detected, before continuing the task)

1. **Detect and STOP the affected task.** The implementer reports the mismatch; do **not** silently
   adapt. Silent adaptation is exactly what drifts the materialized `## Plan` from the code and breaks
   the checker-walkable trace. Stop the task at the mismatch — a mid-task fork is not a licence to
   free-hand the plan.
2. **Route the delta through the `plan` method.** The amendment is authored to the **plan bar** —
   atomic, exact files, the failing test to write first, and a real `*Advances:*` / `*Component:*`
   trace — not by the conductor's free judgment. Same bar the original `## Plan` was held to; the
   delta is a plan edit, so it obeys the plan skill.
3. **Materialize into `## Plan` with a provenance marker.** Write the amended task(s) into the
   `## Plan` section, stamped like a start-anywhere ingest:
   `<!-- source: mid-build amendment (<why>) · ingested YYYY-MM-DD -->` (canonical provenance grammar
   — `source: … · ingested <date>`, the same shape every ingest marker uses). This mid-`## Plan` stamp
   is **documentary / human-facing provenance**, not a machine-validated gate: the checker's
   provenance-marker rule validates only a section's **first** body line (`extractProvenanceMarkers` in
   `checker/sdlc-check.mjs`), so a marker sitting mid-section is not checked at all. Trace
   integrity is enforced by the trace + coverage rules plus the inline gate (step 4), never by this
   stamp — write it for the human reader, don't lean on it as an enforcement point. Handle ids so the
   trace stays walkable — a **superseded task is marked, not deleted** (its id stays, annotated
   superseded); **new or split tasks get fresh `T-N` ids** (never reuse a spent id); the coverage map is
   updated so every `AC-N` still traces to a carrying task. Faithful, not creative — transcribe the real
   delta, never invent tasks or criteria.
4. **Run the inline gate on the delta.** Invoke `/agent-sdlc:gate` inline — the exact mechanism
   [ingesting-plans.md](ingesting-plans.md) already uses. It re-walks the amended chain and issues a
   verdict; proceed **only** on a clean (ready-to-build) verdict for the amended chain. A Critical/High
   finding stops the line exactly as in-pipeline.
5. **Record it in the ledger.** The amendment goes in `build-report.md` — what changed, why, and which
   tasks were superseded or renumbered — so the ledger + `git log` stay the compaction-proof record of
   what was built and why the plan moved.

Only then resume the task against the amended `## Plan`.

## The escalation boundary (mechanical drift vs a scope change)

The crisp test: **does this change WHAT we build, or just HOW/WHERE a task touches the code?**

- **HOW / WHERE — mechanical drift** (wrong path, renamed symbol, a task that must split, a differing
  assumed dependency): **amendable in-loop** by the sequence above. The acceptance criteria and the
  design are untouched; only the task's mechanics move.
- **WHAT — a scope or acceptance-criteria change** (a criterion is wrong or missing, the design shape
  is off, a task would build something no `AC-N` asks for): **stop-and-ask the human.** build never
  decides scope. Record it blocked and raise it; do not amend your way into new scope.

When unsure which side a mismatch falls on, treat it as scope and ask — the fail-safe direction is
stop-and-ask, never silent expansion.

## The invariant (NC-2)

**build never *authors* plan content on its own judgment.** Every amendment goes through the plan
method (step 2) and the inline gate (step 4), so the materialized `## Plan` stays a real, gated,
checker-walkable artifact — trace integrity is preserved, not eroded. Mirroring
[ingesting-plans.md](ingesting-plans.md)'s rule: **the loop is identical whatever the source of the
delta.** Source-agnostic in, same rigour out — an amendment that skipped the plan bar or the inline
gate is a bug, exactly as a build off an unvetted plan is.

## Why it preserves the guarantees

Materializing the amendment (rather than adapting in context) is what keeps build's promises intact:
the materialized `## Plan` stays the **single source of truth** the gate re-walks and `ship` synthesizes
the PR from; the ledger + `git log` stay **compaction-proof** (a resumed run reads the amended plan and
the recorded amendment, never a lost in-context edit); and the inline gate has a **real chain to
re-walk** for the delta. An in-context-only adaptation would satisfy none of these — which is why the
amendment is materialized-then-gated, never silently applied.
