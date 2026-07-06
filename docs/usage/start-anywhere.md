# Start anywhere

You don't have to run the chain from `idea`, and a stage's input doesn't have to live in the spec
file. Every stage preconditions on its input **existing and being settled** — not on the upstream
file existing at its canonical path. The shared discipline is
[`skills/getting-started/reference/input-resolution.md`](../../skills/getting-started/reference/input-resolution.md).

## Sources

A stage resolves its input, in order, from:

1. **An explicit source** you name — a prompt ("from this prompt"), a pasted or linked doc, a
   Linear issue set or project, an existing repo artifact.
2. **The canonical spec** — the stage's `##` section in `docs/specs/<feature>/<feature>.md` (the
   default; root `specs/` in a repo that already uses it — the back-compat rule).
3. **Ask / loop back** — if neither yields the input, the stage asks for it or routes to the stage
   that produces it. It never invents an input to clear its own gate.

## Materialize, then run

Input that arrived from anywhere other than the spec is **written into the committed spec first**,
with a provenance marker, then the stage runs its normal method. There is no ephemeral mode: the
gate needs a walkable chain and `build` must survive a compaction, so the committed spec stays the
one source of truth. Re-running is idempotent — it reads the materialized section rather than
re-ingesting the source.

## What this looks like

- **Intent in a prompt or doc, no spec yet** → start at `idea` (or `acceptance-criteria` if the
  problem is settled); the source becomes the `## Brief`.
- **A plan already in Linear or a doc** → run `build` directly: it ingests the plan (materializes
  `## Plan`), runs the `gate` inline, then builds with the full per-task loop. Mechanics:
  [`skills/build/reference/ingesting-plans.md`](../../skills/build/reference/ingesting-plans.md).
- **Any single stage on its own** ("just write the criteria", "just plan this") → invoke it; it
  resolves its input from whatever you give it and produces just that section.

## What never loosens

Mid-chain entry weakens nothing: the gate, the per-task TDD loop, traceability, and the
[`sdlc-check`](sdlc-check.md) rules all run as usual. A genuinely absent upstream link is marked
`untraced` and surfaced in the gate's coverage note — never fabricated.
