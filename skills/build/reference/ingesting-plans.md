# Ingesting an external plan — build from a non-canonical source (conductor discipline)

`build` normally reads a `## Plan` the front half wrote and a `gate-report.md` the gate blessed. But a
plan can arrive from outside the spec chain — a set of Linear issues, a doc, a brief in the prompt.
This discipline is how the conductor takes such a plan and reaches the *same* blessed, buildable state
the in-pipeline path reaches, before the normal task loop begins. It changes only **how the plan
arrives**, never **what build does with it**. See the shared
[input-resolution](../../getting-started/reference/input-resolution.md) rule for the general contract.

## When this applies

The plan in hand is not already a gate-passed `## Plan` in `docs/specs/<feature>/<feature>.md`: it lives in
Linear, a doc, or the request itself, or a `## Plan` exists but has no gate verdict yet.

## The ingest sequence (runs once, before the per-task loop)

1. **Resolve the plan.** Per the input-resolution rule: read the explicit source the request named
   (the Linear issue set, the doc). If a canonical `## Plan` already exists, use it — no ingest needed.
2. **Materialize `## Plan` + trace.** Transcribe the source faithfully into the `## Plan` section of
   `docs/specs/<feature>/<feature>.md` (root `specs/` in a repo that already uses it — the back-compat
   rule in getting-started; never split a repo across both locations), reverse of `linear-sync`'s
   mapping for the Linear case, stamped
   with a provenance marker (`<!-- source: linear SMA-… · ingested <date> -->`). Carry each task's
   real `AC-N` if the source has one; otherwise mark it `AC: untraced` — never fabricate a criterion.
   Transcribe only what the source contains; do not invent tasks.
3. **Resolve the green bar.** build cannot run without a concrete green bar (compile, test, lint,
   format-check). Take it from `## Tech Stack` if present; otherwise detect the commands from the repo
   (the manifest / CI config) or ask, and materialize a minimal green-bar declaration **into
   `## Tech Stack`** (provenance-marked) — the only front-half section build writes, and only this
   green-bar line, never product choices. A vague or absent green bar is a blocker — stop and resolve
   it, do not guess.
4. **Run the gate inline.** Invoke `/agent-sdlc:gate` on the materialized plan. It walks what exists,
   renders a mid-chain-entry coverage note for the `untraced` links, and issues a verdict. Proceed
   **only** on ready-to-build — a Critical/High finding stops the line exactly as in-pipeline.
5. **Hand to the normal loop.** From here the conductor's loop is unchanged: per-task implementer/
   reviewer/fixer, test-first, the full green bar between tasks, commit-in-isolation, and the resumable
   `build-report.md` ledger.

## Rules

- **Never skip the inline gate.** "The plan came from Linear, it's already reviewed" is not a gate
  verdict. An unvetted plan is unvetted whatever its source — never build on an unvetted plan.
- **Never fabricate to complete the chain.** Missing upstream links are `untraced` and surfaced, not
  invented. The gate's coverage note must show them.
- **One source of truth.** After ingest, the materialized `## Plan` is what build executes and what
  the ledger and PR reference — not the Linear issues directly (which can drift).
- **The loop is identical.** If anything in the per-task discipline changes because the plan came from
  outside, that is a bug. Source-agnostic in, same rigour out.
- **Idempotent.** A resumed run reads the already-materialized `## Plan` + the ledger; it does not
  re-ingest the source or re-run done tasks.

## Why it preserves the guarantees

Materializing first is what keeps build's promises intact: the gate has a real chain to walk, the
ledger + `git log` remain the compaction-proof source of truth, and `ship` has a spec to synthesize
the PR from. An in-context-only plan would satisfy none of these — which is why there is no ephemeral
path, only this ingest-then-build one.
