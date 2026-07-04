# contract-visibility — document the checker grammar + placement + relational terms; 0.8.0 bump

## Brief

<!-- source: Linear SMA-422, SMA-423, SMA-426 · ingested 2026-07-04 -->

The 0.8.0 enforcement-hardening pool's final batch: make the checker's contract **visible to the author**
(prose changes to the pipeline skills), plus the 0.8.0 version bump. Sequenced LAST so it documents the
**final grammar** as it stands after this pool's PRs (structured external components + `none`-only null
marker + anchored component matching + recorded-commit ledger↔git) — not the 0.7.0 grammar.

- **SMA-422 (High) — document the checker grammar in the stage SKILL bodies.** In the SMA-411 retro,
  gate round 1 threw 33 findings / 0 links parsed — entirely format: the plan was written to the plan
  skill's *described* shape, which `sdlc-check` rejected, and the builder reverse-engineered the real
  grammar from the regexes. The contract belongs where the author is: each artifact-producing stage's
  SKILL body states the exact grammar it must emit. Docs-first (uncontroversial); parser *tolerance* is
  a separate, deferred judgment call (do not chase leniency — strict-plus-documented beats
  loose-plus-surprising for a fail-closed tool).
- **SMA-423 (Medium) — placement principle.** The SMA-411 builder opened 2 of 10 `reference/` docs and
  still passed the gate. So anything the pipeline REQUIRES that lives only in `reference/` is mis-filed:
  state the principle (load-bearing contracts live in SKILL **bodies**; `reference/` is optional depth),
  and where a reference doc IS load-bearing at a step, the SKILL body **mandates reading it at that
  step**, not merely links it.
- **SMA-426 (Medium) — pin relational-term definitions at the AC stage.** Three enforcement-spine
  defects shared one root: an AC's relational term left under-specified (AC-3 "carries", AC-4
  "referencing", AC-4 "which history"). The acceptance-criteria skill gains a step/red-flag: for every
  criterion a mechanical rule will consume, define each relational term (carries/references/reaches/
  linked/history/reachable…) before the section is settled.

Plus: bump agent-sdlc **0.7.0 → 0.8.0** in both manifests (tag + GitHub release left to the maintainer).
Prose + manifests only; no checker code changes.

## Acceptance Criteria

<!-- source: Linear SMA-422, SMA-423, SMA-426 · ingested 2026-07-04 -->

- **AC-1** — Each artifact-producing stage's SKILL body **documents the exact checker grammar** it must
  emit: architecture-design (the `### Components` numbered bold list AND the `### Outside the checker`
  external list); plan (the period-terminated, non-wrapping asterisk-emphasized Advances / Component /
  Deps trace fields + the coverage-map 2nd-column-header rule + literal `T-N` rows); build (the `## Task ledger`
  table + `### T-N (@ SHA)` fenced evidence); ship (the `Criterion | Type | Proof` map with
  substring-in-evidence proofs). *(Reviewer-checkable: each named grammar element appears in the owning
  SKILL body.)*
- **AC-2** — The documented grammar reflects the **final (post-0.8.0-pool) rules**, not the superseded
  0.7.0 ones: component citations resolve by an **anchored whole-word** match (not raw substring),
  `none` is the **only** null marker (the skill-text allowlist is gone; external components are declared
  structurally), and ledger↔git verifies the **ledger-recorded commit** (exists + reachable + subject
  scope-position), not a history walk. *(Reviewer-checkable: no doc describes the removed substring
  allowlist or history-walk model.)*
- **AC-3** — The **placement principle** is stated (load-bearing contracts in SKILL bodies; `reference/`
  is optional depth), and each clearly load-bearing reference doc is **mandated-at-step** by its owning
  SKILL body (read it at the moment it binds), not merely linked. *(Reviewer-checkable: the principle is
  stated once in a shared place, and the load-bearing references carry a read-at-step mandate.)*
- **AC-4** — The acceptance-criteria skill mandates **pinning each relational term** a mechanical rule
  will consume, before the criteria are settled — as an explicit step and a red flag. *(Reviewer-checkable:
  the AC skill body carries the relational-term-definition step + red flag.)*
- **AC-5** — agent-sdlc is bumped **0.7.0 → 0.8.0** in BOTH manifests (`.claude-plugin` +
  `.cursor-plugin`) with the description refreshed to the pool's scope; both manifests remain valid
  JSON, the checker suite stays green, and `sdlc-check` exits 0 on this feature's own spec.
  *(Testable: both manifests parse + read 0.8.0; suite passes; spec run exits 0.)*

## Design

<!-- source: derived from the Acceptance Criteria (prose + manifest edits) · ingested 2026-07-04 -->

No product code; pipeline skill prose + the two version manifests change. Components declared with the
structured "outside the checker" format (dogfooding SMA-419).

### Outside the checker (changed components)

1. **stage skill texts** — the artifact-producing pipeline SKILL bodies
   (`agent-sdlc/skills/{acceptance-criteria,architecture-design,plan,build,ship,getting-started}/SKILL.md`):
   gain the documented checker grammar (AC-1, AC-2), the placement principle + mandate-at-step reads
   (AC-3), and the relational-term-pinning step (AC-4).
2. **plugin manifests** — `agent-sdlc/.claude-plugin/plugin.json` + `agent-sdlc/.cursor-plugin/plugin.json`:
   the 0.7.0 → 0.8.0 version bump + description refresh (AC-5).

### Design decisions (flagged for maintainer ratification)

- **D1 — docs-only for SMA-422; parser tolerance deferred.** The issue's part 2 (relax the parser where
  unambiguous, e.g. accept bullet OR numbered component lists) is a checker *code* change and a
  case-by-case judgment; this PR does the uncontroversial docs half and leaves parser tolerance as a
  deliberate follow-up (a fail-closed tool is better strict-plus-documented than loose-plus-surprising).
- **D2 — SMA-423 is proportionate, not a full migration.** SMA-422 already lifts the grammar contracts
  into the skill bodies; SMA-423 here states the placement *principle* + adds mandate-at-step reads for
  the clearly load-bearing references (e.g. build→subagent-loop, ship→finishing). A line-by-line audit
  of all 14 reference docs is a larger follow-up, flagged, not attempted wholesale.

## Tech Stack

<!-- source: inherited — no products; deliverable is skill prose + version manifests · ingested 2026-07-04 -->

No products/dependencies. Green bar = `node --test agent-sdlc/checker/*.test.mjs` (glob) + `node
agent-sdlc/checker/sdlc-check.mjs specs/contract-visibility/contract-visibility.md` + both manifests
valid JSON at 0.8.0 (`node -e 'require(...)'`).

## Plan

<!-- source: derived from the Acceptance Criteria + the pipeline SKILL.md files · ingested 2026-07-04 -->

Four atomic tasks. Verification is a conformance re-read (reviewer-checked) plus the checker suite
staying green + both manifests parsing — prose/manifest edits with no test harness.

- **T-1 — Document the final checker grammar in the stage SKILL bodies (SMA-422).** State, in each
  artifact-producing stage's SKILL body, the exact grammar it must emit (design components + external
  list; plan trace fields + coverage map; build ledger + evidence; ship verification report; AC/NC
  definition shape) — reflecting the FINAL post-0.8.0-pool rules (anchored matching, `none`-only null
  marker, recorded-commit ledger↔git). *Verification (prose):* re-read against AC-1/AC-2.
  *Advances:* AC-1, AC-2, AC-5. *Component:* stage skill texts. *Files:*
  `agent-sdlc/skills/architecture-design/SKILL.md`, `agent-sdlc/skills/plan/SKILL.md`,
  `agent-sdlc/skills/build/SKILL.md`, `agent-sdlc/skills/ship/SKILL.md`,
  `agent-sdlc/skills/acceptance-criteria/SKILL.md`.
- **T-2 — Placement principle + mandate-at-step reads (SMA-423).** State the placement principle in a
  shared location (getting-started's shared operating rules) and add a read-at-step mandate to each
  clearly load-bearing reference (build→subagent-loop, ship→finishing, build→ingesting-plans on the
  ingest path). *Verification (prose):* re-read against AC-3.
  *Advances:* AC-3, AC-5. *Component:* stage skill texts. *Files:*
  `agent-sdlc/skills/getting-started/SKILL.md`, `agent-sdlc/skills/build/SKILL.md`,
  `agent-sdlc/skills/ship/SKILL.md`.
- **T-3 — Pin relational-term definitions at the AC stage (SMA-426).** Add to the acceptance-criteria
  skill an explicit step + red flag: for every criterion a mechanical rule will consume, define each
  relational term (carries/references/reaches/linked/history/reachable…) in the glossary or inline
  before the section is settled. *Verification (prose):* re-read against AC-4.
  *Advances:* AC-4, AC-5. *Component:* stage skill texts. *Files:*
  `agent-sdlc/skills/acceptance-criteria/SKILL.md`.
- **T-4 — Version bump 0.7.0 → 0.8.0 (both manifests) (SMA-405/release).** Bump `version` to `0.8.0` in
  both `agent-sdlc/.claude-plugin/plugin.json` and `agent-sdlc/.cursor-plugin/plugin.json` and refresh
  the description to the pool's scope; leave the git tag + GitHub release to the maintainer.
  *Verification:* both manifests parse as JSON and read 0.8.0.
  *Advances:* AC-5. *Component:* plugin manifests. *Files:* `agent-sdlc/.claude-plugin/plugin.json`, `agent-sdlc/.cursor-plugin/plugin.json`.

AC-5 (regression + release guard) is advanced by all four tasks (each keeps the suite green + the spec
checker green; T-4 lands the bump).
