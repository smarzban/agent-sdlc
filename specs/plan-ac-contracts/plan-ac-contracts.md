# plan-ac-contracts — mid-build plan-amendment protocol + reviewer-checked carrying-task rule (doc + checker hint)

## Brief

<!-- source: Linear SMA-400, SMA-465 · ingested 2026-07-05 -->

PR-B of the 0.10.0 stack — the plan/AC contracts. Two issues that sharpen how the pipeline handles
reality diverging from the plan, and a counter-intuitive coverage rule that bit an experienced operator
twice.

- **SMA-400 (Medium) — mid-build plan-amendment protocol.** The plan names exact files/tests before code
  exists; some are inevitably wrong at build time. Build is forbidden to edit `## Plan`, and nothing
  defines how a plan is amended mid-build — so it either grinds to a human question per stale path, or the
  implementer silently adapts and the spec drifts from the code (killing the trace the pipeline depends
  on). Define a sanctioned amendment loop reusing the 0.6.0 ingest-adapter shape: detect mismatch → route
  the delta through the `plan` method → materialize into `## Plan` with a provenance marker → run the
  existing inline gate on the delta → the ledger records it. Escalation boundary: mechanical drift is
  amendable in-loop; scope/AC changes stop-and-ask. Invariant: build never *authors* plan content on its
  own judgment.
- **SMA-465 (Medium) — reviewer-checked ACs still need a carrying task.** A reviewer-checked AC (verified
  by inspection, not a test) must **still** appear in some task's `*Advances:*` or bidirectional coverage
  fails — correct behavior, but counter-intuitive; the same operator made the identical mistake on two
  consecutive M5-batch PRs. Deliberately NOT auto-trace (fabricating the link would weaken coverage). Two
  fixes: **pin the rule** in the acceptance-criteria AND plan grammar sections, and **sharpen the checker
  hint** — when forward coverage fails on a reviewer-checked AC, the finding names the shape and points at
  the fix.

The agent-sdlc checker is a single zero-dep `.mjs` (no dist/build step); the SMA-465 checker change is
tests-first, held to the standing never-throw + read-only contracts, with the AC grammar section kept in
lockstep with the source.

## Acceptance Criteria

<!-- source: Linear SMA-400, SMA-465 · ingested 2026-07-05 -->

- **AC-1** — `sdlc-check` parses each acceptance criterion's **verification type** (reviewer-checked vs
  test-backed) from the `## Acceptance Criteria` section, exposed on the parse model. It is a **pure,
  never-throwing** read — no filesystem or git access — and yields a null type for an AC whose block
  states neither. *(Verification type: **test-backed** — unit. Oracle: the parser returns the expected
  type per AC across reviewer-checked / test-backed / typeless fixtures, and does not throw on ragged
  input.)*
- **AC-2** — When forward coverage fails for a **reviewer-checked** AC, the `coverage-forward` finding
  **names the reviewer-checked shape and points at the fix**: a reviewer-checked criterion still needs a
  carrying task — the one that produces the artifact the reviewer checks — so add the AC to that task's
  `*Advances:*`. A test-backed or type-unknown unreached AC keeps the existing base message (no hint).
  *(Verification type: **test-backed** — unit. Oracle: a reviewer-checked unreached AC's finding message
  contains the carrying-task hint; a test-backed unreached AC's does not.)*
- **AC-3** — The checker change is **read-only, never-throws, and non-regressing**: no new fs/git access
  is introduced; a ragged or type-ambiguous `## Acceptance Criteria` block does not throw; the existing
  checker suite stays green and `sdlc-check` exits 0 on this feature's own spec. *(Verification type:
  **test-backed** — unit + integration. Oracle: the full checker suite passes including a ragged-input
  test, and the self-run on this spec exits 0.)*
- **AC-4** — The **acceptance-criteria AND plan** SKILL grammar sections **pin the rule** explicitly:
  every AC, including reviewer-checked ones, must appear in ≥1 task's `*Advances:*` (or a coverage-map
  row); for a reviewer-checked AC the carrying task is the one that produces the artifact the reviewer
  checks. *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: do both grammar sections
  carry the pinned carrying-task line, in the 0.8.0 relational-term-pinning style? Justification: prose
  presence across two files, not automatable.)*
- **AC-5** — The acceptance-criteria grammar section documents the **new checker behavior** (it parses the
  per-AC verification type and sharpens the coverage-forward hint for reviewer-checked ACs) **in lockstep**
  with the checker source — no claim the source does not implement. *(Verification type:
  **reviewer-checked** — axis: Spec Conformance. Q: does the AC grammar section describe the verification-type
  parse + sharpened hint accurately against `sdlc-check.mjs`? Justification: doc-vs-source accuracy, a
  reviewer judgment.)*
- **AC-6** — A **mid-build plan-amendment protocol** exists as a build reference doc
  (`build/reference/plan-amendments.md`), modeled on the ingest-adapter shape: the conductor **detects** a
  plan/reality mismatch → **routes** the delta through the `plan` method → **materializes** the amendment
  into `## Plan` with a **provenance marker** → runs the existing **inline gate** on the delta → the
  **ledger records** it (task renumbering / superseded-task handling). *(Verification type:
  **reviewer-checked** — axis: Spec Conformance. Q: does the doc define detect→route→materialize(+provenance)
  →inline-gate→ledger, reusing the existing inline-gate mechanism? Justification: prose structure, not
  automatable.)*
- **AC-7** — The protocol pins the **escalation boundary** and the **invariant**, and is **wired into the
  skills**: mechanical drift (wrong path, renamed symbol, split task) is amendable in-loop while a
  scope/AC change **stops-and-asks** the human; build never *authors* plan content on its own judgment
  (amendments go through the plan method + inline gate, keeping checker-visible trace integrity); the
  build SKILL body **mandates the doc at the mismatch step** (read-at-step) with a rationalization row,
  and the plan SKILL notes `## Plan` may carry a provenance-marked amendment. *(Verification type:
  **reviewer-checked** — axis: Spec Conformance. Q: are the boundary + invariant stated, the build SKILL
  mandate-at-step + rationalization present, and the plan SKILL note added? Justification: prose across
  three files, not automatable.)*

### Negative criteria (out of bounds)

- **NC-1** — The checker does **NOT auto-create** the carrying-task link (the retro's auto-trace idea is
  rejected — fabricating the link would weaken bidirectional coverage). It only sharpens the error
  message; the rule itself is unchanged. (Reviewed at ship.)
- **NC-2** — The amendment protocol never lets build **author** plan content on its own judgment — every
  amendment goes through the plan method + the inline gate; mechanical-vs-scope escalation is honored.
  (Reviewed at ship.)

## Design

<!-- source: derived from the Acceptance Criteria · ingested 2026-07-05 -->

One real code component (the checker, tests-first) plus pipeline-skill prose + one new build reference doc.

### Components

1. **checker** — `agent-sdlc/checker/sdlc-check.mjs` + its test suite (`agent-sdlc/checker/*.test.mjs`):
   a pure `extractAcVerification` parse of per-AC verification type added to the parse model, and
   `checkForwardCoverage` sharpened to append a carrying-task hint for a reviewer-checked unreached AC
   (AC-1, AC-2, AC-3). Read-only, never-throw, no new fs/git.
2. **stage skill texts** — the pipeline SKILL bodies + one new reference doc
   (`agent-sdlc/skills/{acceptance-criteria,plan,build}/SKILL.md`,
   `agent-sdlc/skills/build/reference/plan-amendments.md`): the pinned carrying-task rule + lockstep
   checker-behavior doc (AC-4, AC-5), and the plan-amendment protocol + wiring (AC-6, AC-7).

### Design decisions (flagged for maintainer ratification)

- **D1 — sharpen, don't auto-trace (NC-1).** SMA-465 explicitly rejects auto-tracing; the rule is right,
  the discoverability is wrong. The checker only improves the finding message; forward coverage still
  requires a real `*Advances:*`/coverage-map link.
- **D2 — verification type parsed from the spec, not the verification report.** The report is often absent
  at gate/build time (it is ship's artifact), so the hint reads the AC block's own `reviewer-checked` /
  `test-backed` text — available whenever the coverage rule runs. Kept pure + never-throw per the standing
  contracts.
- **D3 — amendment reuses existing machinery.** The provenance marker, the inline gate
  (`build/reference/ingesting-plans.md`), and the ledger already exist; the amendment protocol composes
  them rather than adding new checker grammar (SMA-427's grammar sections stay untouched).

## Tech Stack

<!-- source: inherited — No new products — reuses the declared stack (green bar below) · ingested 2026-07-05 -->

**No new products — reuses the declared stack** (dogfooding PR-A's fast-path form): zero-dependency Node
ESM (the existing checker) + Markdown skill prose. Green bar for this feature:

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob) — grows with the new checker tests; stays green.
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/plan-ac-contracts/plan-ac-contracts.md` → exit 0.

There are no load-bearing library claims (no library is used — Node builtins only), so no
`verified-by-probe` probe is required (PR-A's probe rule has no in-feature claim to gate here).

## Plan

<!-- source: derived from the Acceptance Criteria + the checker source + the pipeline SKILL.md files · ingested 2026-07-05 -->

Three atomic tasks. T-1 is real red-green TDD on the checker (tests first). T-2/T-3 are prose whose
per-task green bar is the checker suite staying green + `sdlc-check` on this spec + conformance review.

- **T-1 — Checker: parse per-AC verification type + sharpen the coverage-forward hint (SMA-465a).** Write
  failing tests FIRST in `agent-sdlc/checker/rules.test.mjs` (and/or `parser.test.mjs`): (a) the parser
  classifies a reviewer-checked AC, a test-backed AC, and a typeless AC (→ null) and does not throw on a
  ragged block; (b) a reviewer-checked unreached AC's `coverage-forward` message carries the carrying-task
  hint while a test-backed one does not. Then implement in `agent-sdlc/checker/sdlc-check.mjs`: a pure
  `extractAcVerification(sections)` added to the parse model + a sharpened `checkForwardCoverage`. Keep it
  read-only + never-throw; the full suite green. *Failing test first:* the new reviewer-checked-hint test
  fails against current `checkForwardCoverage`. *Advances:* AC-1, AC-2, AC-3. *Component:* checker.
  *Deps:* none.
- **T-2 — Pin the carrying-task rule + document the checker behavior (SMA-465b).** Add to the
  acceptance-criteria AND plan SKILL grammar sections the explicit pinned line (every AC, incl.
  reviewer-checked, needs a carrying task; the reviewer-checked carrying task is the one producing the
  checked artifact), 0.8.0 relational-term-pinning style; and in the acceptance-criteria grammar section
  document the new checker behavior (per-AC verification-type parse + sharpened hint) in lockstep with T-1's
  source. *Verification (prose):* re-read against AC-4, AC-5.
  *Advances:* AC-4, AC-5. *Component:* stage skill texts. *Deps:* T-1.
- **T-3 — Mid-build plan-amendment protocol + wiring (SMA-400).** Create
  `agent-sdlc/skills/build/reference/plan-amendments.md` (detect→route→materialize+provenance→inline-gate
  →ledger; escalation boundary + never-authors invariant), mandate-at-step read it from
  `agent-sdlc/skills/build/SKILL.md` (+ a rationalization row), and note provenance-marked amendments in
  `agent-sdlc/skills/plan/SKILL.md`. *Verification (prose):* re-read against AC-6, AC-7, NC-2.
  *Advances:* AC-6, AC-7. *Component:* stage skill texts. *Deps:* T-1.

### Task-to-criterion coverage map

| AC | Advanced by |
| --- | --- |
| AC-1 | T-1 |
| AC-2 | T-1 |
| AC-3 | T-1 |
| AC-4 | T-2 |
| AC-5 | T-2 |
| AC-6 | T-3 |
| AC-7 | T-3 |

### Notes

- T-1 first: T-2's lockstep doc describes T-1's actual behavior, so the code lands before the doc that
  documents it. T-2 and T-3 both edit `plan/SKILL.md` — sequential commits, different subsections.
- Every AC names a carrying task above (the reviewer-checked carrying-task rule this PR pins — dogfooded
  here: AC-4/AC-5/AC-6/AC-7 are reviewer-checked and each carries a task).
