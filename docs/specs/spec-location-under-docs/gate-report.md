# Gate report — spec-location-under-docs

Date: 2026-07-06 · Gate over `docs/specs/spec-location-under-docs/spec-location-under-docs.md`
(spec authored at the NEW canonical location — dogfooding the destination; see Design D3 for the
transient two-tree state, resolved by T-1).

## Verdict: READY TO BUILD

## Chain walk (criterion → component → product → task)

| AC | Component(s) | Product | Task(s) | Status |
| --- | --- | --- | --- | --- |
| AC-1 | getting-started skill text (C-ext-1) | Markdown prose (declared stack) | T-2 | traced |
| AC-2 | stage skill texts (C-ext-2), repo docs surface (C-ext-3) | Markdown prose | T-3, T-4 | traced |
| AC-3 | checker test suite (C-ext-4) | bare-node `node:test` suite (declared stack) | T-1 | traced |
| AC-4 | repo spec tree (C-ext-5) | git rename | T-1 | traced |
| AC-5 | repo docs surface (C-ext-3) | Markdown prose | T-4 | traced |
| AC-6 | — (release criterion; carrying task per the reviewer-checked rule) | JSON manifests | T-5 | traced |

- Every task advances at least one criterion; every criterion has a carrying task (coverage map
  matches the inline `*Advances:*` fields).
- All six reviewer-checked/test-backed verification declarations parse (one type per AC).
- `## Tech Stack` uses the sanctioned no-new-products fast-path — recognized; component→product is
  satisfied by the declared existing stack at once.
- Negative criteria NC-1..NC-3 each name a checkable boundary (checker source byte-untouched;
  no move of root `constitution.md`/`CONTEXT.md`, no migration machinery; no historical-content
  edits) — reviewable at ship.
- No unresolved placeholders, no `untraced` markers, no constitution violations (no
  `constitution.md` exists in this repo; nothing to check against).
- Tier call: full tier via the cross-cutting escalation trigger, compressed (Design on existing
  surfaces, Tech Stack fast-path) — consistent with the router's rules.

## Checker witness

`node checker/sdlc-check.mjs docs/specs/spec-location-under-docs/spec-location-under-docs.md`
→ `sdlc-check 0.11.0: all checks passed — 0 findings, 0 notes.` (exit 0)

One authoring defect was caught and fixed pre-verdict: a `### Notes` bullet contained a literal
`*Component:*` field pattern, which the parser reads as a trace field (trace-integrity finding);
reworded to prose. This is the checker working as designed on its own spec.

## Risks noted (non-blocking)

- T-1's rename must stay a pure `git mv` (no content edits in the same paths) for AC-4's
  `R100`-status oracle to hold.
- The sweep greps (AC-2) exclude historical `docs/specs/` content and explicit back-compat
  statements; the build must keep those two exclusions precise so the grep stays meaningful.
