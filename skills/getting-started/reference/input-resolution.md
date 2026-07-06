# Input resolution — run any stage from any source (shared discipline)

Every stage needs an input: `idea` needs intent, `acceptance-criteria` needs a brief, `build` needs
a gated plan. That input does not have to live in the canonical spec file — it can arrive in the
prompt, a pasted or linked doc, a set of Linear issues, or an existing repo artifact. This discipline
is how any stage resolves its input from whatever source supplied it, **without** weakening the
traceability spine or any quality gate. Each stage references this file rather than restating it.

The one-line contract: **a stage's precondition is that its input exists and is settled — not that
the upstream file exists at its canonical path.** Resolve from any source, materialize into the
canonical spec, then run the normal method. Refuse only when the input genuinely does not exist, and
never fabricate it.

## The resolution order (do in order, stop at the first that yields)

1. **Explicit source** — a source the request named: a Linear ref (`SMA-328..348`, a project/
   milestone), a doc (path or paste), "from this prompt", or an existing repo artifact. Read it.
2. **Canonical spec** — the stage's `##` section in `docs/specs/<feature>/<feature>.md` (or
   `docs/specs/overview.md` at project level; root `specs/` in a repo that already uses it — the
   back-compat rule in the getting-started SKILL). This is the default when no explicit source is given.
3. **Ask / loop back** — if neither yields the input, ask for it or route to the stage that produces
   it. **Never invent the input to clear your own gate.**

A resolved input still has to be *settled*, not merely *present*. If it exists but is fuzzy or
self-contradictory, treat it as today: loop back to the owning stage. Resolution finds the input;
the stage's own bar decides whether it is good enough to run on.

## Materialize before you run (the committed spec is the one source of truth)

When the input came from anything other than the canonical spec, **write it into the canonical spec
section first, then run.** The stage proceeds exactly as if a human had authored that section.

- **Why materialize at all.** The spine has to be walkable (the `gate` traverses
  `AC-N -> C-N -> product -> T-N`) and the run has to survive a compaction (`build` trusts
  `build-report.md` + `git log` over memory). An input held only in context satisfies neither — it
  vanishes on compaction and leaves the gate nothing to walk. Materializing is therefore **forced,
  not optional**: there is no ephemeral mode that keeps the guarantees.
- **Where.** Into the committed spec tree — `docs/specs/<feature>/<feature>.md` (feature) or
  `docs/specs/overview.md` (project); in a repo that already has a root `specs/` tree, materialize
  THERE (the back-compat rule in the getting-started SKILL — never split a repo across both
  locations). The spec files that appear are a feature, not litter: a durable,
  reviewable record of what was built and where it came from, and the thing `ship` links from the PR.
- **Idempotent.** Re-running reads the now-materialized section; it does not re-ingest the source or
  duplicate the section. Materialization writes once and is safe to repeat.
- **Faithful, not creative.** Materializing transcribes the source into the section's shape (e.g. a
  Linear issue set -> `## Plan` tasks). It does not add criteria, components, or tasks the source did
  not contain — that would be fabrication. Use `linear-sync`'s stage<->entity mapping in reverse for
  the Linear case.

(A future `materialize: scratch` knob — write to a git-ignored working dir for "no spec files in my
repo" — is a possible follow-up; it keeps the spine and resumability but loses the permanent record.
Out of scope for now. There is deliberately no fully-ephemeral option.)

## Provenance marker (stamp every materialized section)

A materialized section carries an HTML-comment marker on its first line, naming the source and the
date, so a reader (and the gate, and the PR) can see it was ingested rather than hand-authored:

```
## Plan
<!-- source: linear SMA-328..348 · ingested 2026-06-29 -->
```

Use the real source identifier (`linear <ids>`, `doc <path>`, `prompt`) and an absolute date. A
hand-authored section has no marker.

## Backfill modes (how much upstream to reconstruct)

Entering mid-chain means upstream sections may be absent. Two modes, chosen by the request:

- **Single-stage** — the request wants just this one stage's output ("write AC for this", "plan
  this"). Resolve and materialize *this* stage's input, run it, stop. Do not reconstruct the rest of
  the chain. The output is the one section, provenance-stamped.
- **Resume-to-ship** — the request wants to go from here through to a PR ("build this Linear plan and
  ship it"). Backfill the **minimum** upstream artifacts the spine and the quality gates require —
  no more. For entry at `build` that means: a `## Plan` (materialized) and a **gate verdict** (run
  the gate inline; see the gate skill). It does *not* mean back-writing a full `## Brief` /
  `## Acceptance Criteria` / `## Design` you do not have — those links are marked untraced instead.

## The untraced marker (a missing trace link is visible, never silent)

When a trace link genuinely cannot be filled — e.g. a plan ingested with no upstream acceptance
criteria — **mark it untraced; do not invent the upstream to fake a complete chain.** A task with no
real `AC-N` records `AC: untraced (entered at build, no criteria in source)` rather than a fabricated
`AC-7`. The gate renders these as a mid-chain-entry coverage note (visible, not a silent pass — the
same instinct as never silently dropping review coverage), and `ship` surfaces them in the PR body so
the reviewer knows what was not vetted upstream.

## Rules

- **Precondition is on the input, not the file.** Never STOP merely because the canonical file is
  absent — resolve from the other sources first.
- **Never fabricate an upstream contract.** Missing input -> resolve or loop back. Never invent
  criteria/design/tasks to satisfy a gate.
- **Never weaken a quality gate to enter mid-chain.** `build` still runs the gate (inline if needed)
  and its full per-task loop; `ship` still reviews. Source-agnostic input changes *where the input
  comes from*, never *what the gates check*.
- **One source of truth.** Materialize into the committed spec; do not run off a shadow copy that can
  drift from Linear or the doc.
- **Stay in your stage.** Resolving an input from a richer source does not license doing the next
  stage's work — the tech-agnostic / product-free / no-code-until-build boundaries are unchanged.
- **The default path is unchanged.** With no explicit source, a stage reads its canonical section
  exactly as before. All of the above engages only when entering standalone or fed a non-canonical
  source.

## Worked example — `build` from a Linear plan

The request: "build SMA-328..348 on this branch." No spec tree exists yet.

1. **Resolve** — explicit source = the Linear issue set. Read the issues.
2. **Materialize** — write `docs/specs/optimisations/optimisations.md` `## Plan` from the issues (reverse
   `linear-sync` mapping), stamped `<!-- source: linear SMA-328..348 · ingested <date> -->`. Trace
   each task to a real `AC-N` if the source carries one; otherwise `AC: untraced`.
3. **Gate inline** — run `gate` on the materialized plan; it writes `gate-report.md` with a
   mid-chain-entry coverage note for the untraced links. Proceed only on a clean verdict.
4. **Build normally** — the standard conductor loop: per-task implementer/reviewer/fixer, test-first,
   full green bar, commit-in-isolation, `build-report.md` ledger. Identical to an in-pipeline build.
5. **Ship** — the PR body carries the provenance and the untraced note, so the reviewer sees the plan
   came from Linear and what was not vetted upstream.
