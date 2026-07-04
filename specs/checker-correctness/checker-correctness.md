# checker-correctness — sdlc-check correctness + parser hardening

## Brief

<!-- source: Linear SMA-418, SMA-421 · ingested 2026-07-04 -->

Close four checker-correctness gaps in `sdlc-check` (`agent-sdlc/checker/sdlc-check.mjs`), all filed
as follow-ups from agent-sdlc v0.7.0's review-gate R1 pass. None is a live false pass on current
specs — every one is fail-safe today — but each is a genuine latent asymmetry or a contract
violation worth closing while the code is fresh.

- **SMA-418 — table-path dangling-component drop.** The v0.7.0 H1 fix made the `*Component:*`
  **field** path flag a dangling component-by-name (a name resolving to no defined component → an
  AC-1 trace-integrity finding). But the coverage/component-map **table** path (`extractTableTraces`,
  the `refs.size > 0` guard) still **silently drops** an unresolved component name. Same
  enforcement-asymmetry class the checker itself caught during its own build (the T-4 forward/backward
  asymmetry). No false pass today — AC-1's live locus is the task's `*Component:*` field, and the
  enforcement-spine spec's own AC-15–18 map rows cite recognized "skill text" values — but the two
  paths must enforce symmetrically.

- **SMA-421 — three parser-hardening nits.**
  1. **Ragged markdown row.** A table data row with fewer cells than its header makes a parser reach
     past the row's cells and throw a `TypeError`, violating the parsers' never-throw contract.
  2. **Empty-NUL mis-pair.** `readRepoFacts` splits `git log -z --format=%H%x00%s` output and filters
     out empty fields; a commit with an **empty subject** is then dropped, mis-pairing every later
     `(hash, subject)` record.
  3. **Substring false-negative.** `resolveComponentRefs` matches a component name with an unanchored
     `lower.includes(name)`, so a dangling name that *contains* a real component name resolves and
     escapes the dangling check. Fails toward not-flagging (fail-safe), but should anchor.

Scope is exactly these two issues (four fixes). No behaviour change on well-formed input: the checker
must still exit 0 on the current repo and keep the full existing test suite green.

## Acceptance Criteria

<!-- source: Linear SMA-418, SMA-421 · ingested 2026-07-04 -->

- **AC-1** — A component/coverage map-row that cites a component by a name resolving to **no** defined
  component (and not a recognized non-dangling value) yields a `trace-integrity` finding naming the
  dangling component — symmetric with the Component field path. *(Testable: a spec fixture with
  such a map-row → a finding whose message names the component. Reviewer-checkable: the table path and
  field path now share dangling-component enforcement.)*
- **AC-2** — A map-row citing a **recognized** non-dangling component value (a `skill text` reference
  or `none`) or a value that **resolves** to a real component still yields **no** dangling finding
  (no false positive; the enforcement-spine spec's own AC-15–18 rows stay clean). *(Testable: a
  fixture with a `skill text` map-row and a resolvable map-row → zero trace-integrity findings.)*
- **AC-3** — A markdown table **data row with fewer cells than its header** yields a typed parse
  failure (`{ ok: false }` naming the file and the offending line), never a thrown `TypeError` — for
  both the ledger task table and the verification-report proof-map table. *(Testable: a ragged-row
  fixture through `parseLedger` and `parseVerificationReport` → `ok:false`, no throw.)*
- **AC-4** — `readRepoFacts` pairs commit `(hash, subject)` records **positionally**, so a commit with
  an **empty subject** does not mis-pair later records, and the trailing `-z` NUL terminator is handled
  without dropping interior empty fields. *(Testable: a temp repo with an empty-subject commit between
  two normal ones → each commit's hash pairs with its own subject.)*
- **AC-5** — `resolveComponentRefs` resolves a component name only on a **whole-word (anchored)**
  match, so a dangling name that merely **contains** a real component name as a substring does not
  resolve. *(Testable: a Component field citing `<real-component-name>` embedded in a longer word
  → unresolved → a dangling finding; the exact component name still resolves.)*
- **AC-6** — No verdict change on well-formed input: the full existing checker test suite stays green
  and `sdlc-check` still exits 0 on **this feature's own spec** (a well-formed spec that passed before
  and after), with no rule's happy-path verdict altered by these changes. *(Testable: the suite
  passes; `node agent-sdlc/checker/sdlc-check.mjs specs/checker-correctness/checker-correctness.md`
  exits 0. Reviewer-checkable: no rule's happy-path verdict moved.)* **Scoping note:** running the
  checker against `specs/enforcement-spine/` from a **feature branch** exits nonzero — its
  ledger-vs-git rule scopes to `merge-base..HEAD` (the M-968 rev-range shipped in v0.7.0), which
  legitimately excludes enforcement-spine's own task commits once they are behind the merge-base. That
  is **pre-existing rev-range behavior, not a regression introduced here** (those artifacts validate
  from a checkout where their commits are in range, e.g. `main`), so AC-6 is scoped to a spec whose
  commits are in range for this branch.

## Design

<!-- source: derived from the Acceptance Criteria (in-place fix of an existing component) · ingested 2026-07-04 -->

One existing component is modified in place; nothing new is introduced (least-code: reuse over
addition).

### Components

1. **sdlc-check** — the enforcement-spine checker (`agent-sdlc/checker/sdlc-check.mjs`), a single
   zero-dependency Node ESM file. The four fixes touch four already-present functions —
   `extractTableTraces` + `checkTraceIntegrity` (AC-1/AC-2), the table parsers `extractLedgerTasks` +
   `parseVerificationReport` (AC-3), `readRepoFacts` (AC-4), and `resolveComponentRefs` (AC-5) — with
   the existing `node:test` suite (`agent-sdlc/checker/*.test.mjs`) extended per task. No new
   component, product, or dependency.

## Tech Stack

<!-- source: inherited from the enforcement-spine feature (no new products) · ingested 2026-07-04 -->

Inherited unchanged: **Node ≥22 (ESM)**, standard-library only (`node:util`, `node:fs`, `node:path`,
`node:url`, `node:child_process`); tests in **`node:test`** + `node:assert/strict`. No new
dependency (NC-1/NC-3 from the enforcement spine hold).

## Plan

<!-- source: derived from the Acceptance Criteria + sdlc-check source · ingested 2026-07-04 -->

Four atomic tasks, one per fix, each test-first against the **sdlc-check** component.

- **T-1 — Table-path dangling-component symmetry (SMA-418).** Make `extractTableTraces` stop silently
  dropping a component-map row whose value resolves to no component: emit a trace carrying
  `unresolvedComponent` (reusing `isNonDanglingComponentValue` for the `skill text`/`none` allowlist),
  and widen `checkTraceIntegrity`'s dangling-component arm to fire on any trace with
  `unresolvedComponent` set (field or map-row). *Failing test first:* a spec fixture with a
  component-map row citing a nonexistent component → a `trace-integrity` finding naming it; a
  `skill text` row and a resolvable row → no finding.
  *Advances:* AC-1, AC-2, AC-6. *Component:* sdlc-check. *Files:* `agent-sdlc/checker/sdlc-check.mjs`,
  `agent-sdlc/checker/rules.test.mjs`, `agent-sdlc/checker/parser.test.mjs`.
- **T-2 — Ragged-row typed parse failure (SMA-421 nit 1).** Detect a data row with fewer cells than
  its header in the ledger task table and the verification-report proof-map table, and return a typed
  parse failure (`{ ok: false, error: { file, problem } }` naming the offending line) instead of
  indexing past the row and throwing. *Failing test first:* a ragged ledger row and a ragged proof-map
  row each return `ok:false` and do not throw.
  *Advances:* AC-3, AC-6. *Component:* sdlc-check. *Files:* `agent-sdlc/checker/sdlc-check.mjs`,
  `agent-sdlc/checker/parser.test.mjs`.
- **T-3 — Positional NUL pairing in readRepoFacts (SMA-421 nit 2).** Replace the empty-field filter
  with positional pairing: drop only the single trailing empty produced by `-z`'s terminator (an odd
  final element), never an interior empty subject. *Failing test first:* a temp repo with an
  empty-subject commit between two normal ones → each hash pairs with its own subject.
  *Advances:* AC-4, AC-6. *Component:* sdlc-check. *Files:* `agent-sdlc/checker/sdlc-check.mjs`,
  `agent-sdlc/checker/git.test.mjs`.
- **T-4 — Anchored component-name resolution (SMA-421 nit 3).** Anchor `resolveComponentRefs` to a
  whole-word match (escaped, case-insensitive) so a substring collision no longer resolves.
  *Failing test first:* a Component field citing a real component name embedded in a longer word
  → unresolved (dangling finding); the exact name still resolves.
  *Advances:* AC-5, AC-6. *Component:* sdlc-check. *Files:* `agent-sdlc/checker/sdlc-check.mjs`,
  `agent-sdlc/checker/parser.test.mjs`.

AC-6 is a cross-cutting regression guard — every task advances it (each must keep the full suite
green; a real-repo run must still exit 0), so it carries no task of its own but is reached by all
four.
