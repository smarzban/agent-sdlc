# adoption-quickwins — light tier + quick-win batch + 0.10.0 version bump (SMA-401, SMA-402)

## Brief

<!-- source: Linear SMA-401, SMA-402 · ingested 2026-07-05 -->

PR-D of the 0.10.0 stack — the adoption + quick-wins tranche, sequenced LAST so it carries the version
bump. Docs-heavy; touches every skill's `Triggers:` line, so strict-YAML frontmatter integrity across all
skills is a first-class verification (the 0.9.0 HIGH finding was a strict-YAML regression on the `Triggers:`
tails).

- **SMA-401 (light tier).** The full chain is right for a feature and absurd for a 30-line change, and
  `getting-started` routes only by entry point, never by size — so small work bypasses the pipeline and the
  discipline erodes from the edges. Add a compressed tier: brief + AC + plan folded into one short pass;
  design/techstack only when a trigger fires (new dependency, new component, cross-cutting change). Same
  gate + build discipline (trace, green bar, one-task commits) — the tier compresses *authoring*, never
  *verification*. The router gains a size/complexity question with explicit escalation triggers; the spec
  artifact stays the same sectioned file, so the checker works unchanged.
- **SMA-402 (quick-win batch).** (1) A spec-lifecycle policy (feature specs are immutable snapshots with a
  status header stamped at ship; `overview.md` is living; each feature's design owns updating `##
  Architecture` on material change). (2) Trigger-scope qualifiers: the auto-triggers fire on everyday words
  ("plan", "design", "verify", "build") — add a scope qualifier to every skill's `Triggers:` line. (3)
  Dangling-promise cleanup: point cross-skill references at real owners or mark them planned. (4)
  Shared-rules drift check: dedupe rules restated per-skill into `getting-started`'s shared-rules section
  where feasible, reference instead of restate.

Plus: bump agent-sdlc **0.9.0 → 0.10.0** in both manifests + description refresh (tag + GitHub release left
to the maintainer).

## Acceptance Criteria

<!-- source: Linear SMA-401, SMA-402 · ingested 2026-07-05 -->

- **AC-1** — A **light-tier** reference doc (`getting-started/reference/light-tier.md`) defines the
  compressed pass: brief + AC + plan folded into one short authoring pass, with `## Design`/`## Tech Stack`
  written **only** when a trigger fires (new dependency, new component, cross-cutting change); it keeps the
  **same gate + build discipline** (trace, green bar, one atomic commit per task) and the **same sectioned
  spec file** (fewer/shorter sections). *(Verification type: **reviewer-checked** — axis: Spec Conformance.
  Q: does light-tier.md define the compressed pass + the design/techstack triggers + the same-verification
  invariant + same spec file? Justification: prose structure, not automatable.)*
- **AC-2** — The `getting-started` **router** gains a size/complexity routing question with explicit
  **escalation triggers**, a mid-flight **tier upgrade** routes through the normal materialize path (no
  ephemeral mode), and the router **mandates reading `light-tier.md` at the light-tier branch**
  (read-at-step). *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: does the router add
  the size question + escalation triggers + upgrade-through-materialize + the mandate-at-step read?
  Justification: prose presence, not automatable.)*
- **AC-3** — A **spec-lifecycle policy** is stated in `getting-started` conventions: feature specs are
  **immutable snapshots** with a status header stamped at ship; `specs/overview.md` is **living**; each
  feature's **design stage** owns updating `## Architecture` on material change. *(Verification type:
  **reviewer-checked** — axis: Spec Conformance. Q: is the immutable-snapshot / living-overview /
  design-owns-architecture policy stated once in a shared place? Justification: prose presence, not
  automatable.)*
- **AC-4** — Every skill's `Triggers:` line carries a **scope qualifier**, polarity-correct: the
  pipeline-spine skills (idea, acceptance-criteria, architecture-design, techstack, plan, gate, build, ship)
  are scoped to "only in an Agent SDLC run / when a spec chain exists"; the **standalone documentation
  skills** (writing-readmes, writing-repo-docs, writing-technical-docs) are explicitly marked **independent
  of the pipeline** (so they are not wrongly narrowed); and **all** skill frontmatter stays **strict-YAML**
  valid. *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: does every Triggers line
  carry the right-polarity scope qualifier, with the doc skills kept standalone and all frontmatter
  strict-YAML valid? Justification: cross-file prose + a parse the AC-7 guard also checks mechanically.)*
- **AC-5** — Dangling cross-skill references point at **real owners**: the acceptance-criteria skill's
  "spec-to-test coverage check" → the shipped **terminal AC verification** (the ship-stage
  verification-report + `sdlc-check --require verification-report`, SMA-398); "the review panel" (in
  acceptance-criteria, architecture-design, techstack, plan) → **review-gate** (the real downstream
  consumer). *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: do the former
  dangling references now name real, shipped owners? Justification: prose presence, not automatable.)*
- **AC-6** — Shared rules restated per-skill are **deduped** into `getting-started`'s shared-rules section
  where feasible (reference instead of restate), reducing the drift that caused the 0.6.0 ship-checklist-vs-
  HARD-GATE contradiction. *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: is at
  least one restated shared rule deduped to a reference into getting-started's shared-rules? Justification:
  prose judgment, not automatable.)*
- **AC-7** — Release + strict-YAML + regression guard: agent-sdlc is bumped **0.9.0 → 0.10.0** in BOTH
  manifests (`.claude-plugin` + `.cursor-plugin`) with the description refreshed to the pool's scope; both
  manifests are valid JSON reading `0.10.0`; **every** skill's frontmatter description parses as a valid
  strict-YAML (double-quoted) scalar; the checker suite stays green and `sdlc-check` exits 0 on this spec.
  *(Verification type: **reviewer-checked** — axis: Regression. Q: do both manifests parse at 0.10.0, does
  the strict-YAML frontmatter guard pass over every skill, does the checker suite pass, and does `sdlc-check`
  exit 0 on this spec? Justification: the green bar is a run-and-read whole the reviewer confirms; no
  per-test name to link.)*

### Negative criteria (out of bounds)

- **NC-1** — The light tier compresses **authoring only, never verification**: the gate + build discipline
  (trace, green bar, one-task commits) and the T1 checker are unchanged (same sectioned spec file).
  (Reviewed at ship.)
- **NC-2** — The three documentation skills are **not** narrowed to pipeline-only — they stay standalone
  (usable for any repo's docs). (Reviewed at ship.)

## Design

<!-- source: derived from the Acceptance Criteria · ingested 2026-07-05 -->

Pipeline-skill prose + one new reference doc + the two version manifests. No product code, no checker
change. Changed things declared with the structured "outside the checker" form.

### Outside the checker (changed components)

1. **getting-started skill text** — `agent-sdlc/skills/getting-started/SKILL.md` + new
   `agent-sdlc/skills/getting-started/reference/light-tier.md`: the light-tier router + doc (AC-1, AC-2),
   the spec-lifecycle policy (AC-3), and the shared-rules dedupe (AC-6).
2. **pipeline skill triggers** — the `Triggers:` lines across all skills and the downstream-consumer
   cross-references in `agent-sdlc/skills/{acceptance-criteria,architecture-design,techstack,plan}/SKILL.md`:
   the scope-qualifier sweep (AC-4) and the dangling-reference cleanup (AC-5).
3. **plugin manifests** — `agent-sdlc/.claude-plugin/plugin.json` + `agent-sdlc/.cursor-plugin/plugin.json`:
   the 0.9.0 → 0.10.0 bump + description refresh (AC-7).

### Design decisions (flagged for maintainer ratification)

- **D1 — trigger-qualifier polarity is per-skill, not blanket.** SMA-402 says "every skill's Triggers
  line", but a blanket "only in the pipeline" qualifier would wrongly narrow the standalone documentation
  skills (they fire on any repo's doc request, and their triggers are doc words, not the everyday pipeline
  words the issue targets). So the spine skills are pipeline-scoped and the doc skills are explicitly marked
  standalone — consistent (every line gets a scope clarifier) and correct (NC-2).
- **D2 — strict-YAML verified mechanically.** No js-yaml in this zero-dep repo, so the AC-7 guard parses each
  skill's `description:` scalar with `JSON.parse` (a valid double-quoted YAML scalar is JSON-parseable) —
  enough to catch the 0.9.0-style unescaped-quote regression.
- **D3 — light tier is same-file, same-verification (NC-1).** It compresses authoring; the sectioned spec,
  the gate, the build discipline, and the checker are untouched, so the T1 enforcement spine keeps working.

## Tech Stack

<!-- source: inherited — No new products — reuses the declared stack (green bar below) · ingested 2026-07-05 -->

**No new products — reuses the declared stack** (SMA-464 fast-path): Markdown skill prose + the two JSON
manifests. Green bar for this feature:

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob) — stays green (no checker source change).
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/adoption-quickwins/adoption-quickwins.md` → exit 0.
- **Strict-YAML frontmatter guard (AC-4/AC-7):** a `node` one-liner that `JSON.parse`s every
  `agent-sdlc/skills/*/SKILL.md` `description:` scalar → all parse.
- **Manifests (AC-7):** both `plugin.json` parse as JSON and read `0.10.0`.

No load-bearing library claims → no `verified-by-probe` probe required.

## Plan

<!-- source: derived from the Acceptance Criteria + the pipeline SKILL.md files + manifests · ingested 2026-07-05 -->

Five atomic tasks, prose + manifests. Per-task green bar = checker suite green + `sdlc-check` on this spec +
(from T-3 on) the strict-YAML frontmatter guard; correctness of the prose is conformance-reviewed. AC-7
(release + strict-YAML + regression guard) is advanced by every task — each keeps the suite green, the
frontmatter strict-YAML valid, and the spec checker green; T-5 lands the bump.

- **T-1 — Light tier: router question + `light-tier.md` (SMA-401).** Create
  `agent-sdlc/skills/getting-started/reference/light-tier.md` (compressed brief+AC+plan pass;
  design/techstack only on a trigger — new dependency / new component / cross-cutting; same gate+build
  discipline; same sectioned spec file) and add to `agent-sdlc/skills/getting-started/SKILL.md` a
  size/complexity routing question + escalation triggers + upgrade-through-materialize + a mandate-at-step
  read of light-tier.md. *Verification (prose):* re-read against AC-1, AC-2, NC-1.
  *Advances:* AC-1, AC-2, AC-7. *Component:* getting-started skill text. *Deps:* none.
- **T-2 — Spec-lifecycle policy + shared-rules dedupe (SMA-402).** Add to
  `agent-sdlc/skills/getting-started/SKILL.md` the spec-lifecycle policy (immutable feature snapshots +
  status header at ship; living `overview.md`; design owns `## Architecture` updates) and dedupe at least
  one per-skill-restated shared rule into the shared-rules section (reference instead of restate).
  *Verification (prose):* re-read against AC-3, AC-6.
  *Advances:* AC-3, AC-6, AC-7. *Component:* getting-started skill text. *Deps:* T-1.
- **T-3 — Trigger-scope qualifier sweep (SMA-402).** Add a polarity-correct scope qualifier to every
  skill's `Triggers:` line: pipeline-spine skills scoped to "only in an Agent SDLC run / a spec chain
  exists"; the three documentation skills marked explicitly standalone (independent of the pipeline).
  Preserve strict-YAML quoting in every file (spine skills use `'...'` inside a double-quoted description;
  the doc skills use `\"...\"`). *Verification:* the strict-YAML frontmatter guard passes + re-read against
  AC-4, NC-2. *Advances:* AC-4, AC-7. *Component:* pipeline skill triggers. *Deps:* none.
- **T-4 — Dangling-reference cleanup (SMA-402).** Repoint "spec-to-test coverage check" (acceptance-criteria
  SKILL) → the shipped terminal AC verification (verification-report + `sdlc-check --require
  verification-report`, SMA-398), and "the review panel" (acceptance-criteria, architecture-design,
  techstack, plan) → **review-gate**. *Verification (prose):* re-read against AC-5.
  *Advances:* AC-5, AC-7. *Component:* pipeline skill triggers. *Deps:* none.
- **T-5 — Version bump 0.9.0 → 0.10.0 (both manifests) (release).** Bump `version` to `0.10.0` in both
  `agent-sdlc/.claude-plugin/plugin.json` and `agent-sdlc/.cursor-plugin/plugin.json` and refresh the
  description to the 0.10.0 pool's scope; leave the git tag + GitHub release to the maintainer.
  *Verification:* both manifests parse as JSON and read 0.10.0; the strict-YAML guard + suite + spec checker
  stay green. *Advances:* AC-7. *Component:* plugin manifests. *Deps:* T-1, T-2, T-3, T-4.

### Task-to-criterion coverage map

| AC | Advanced by |
| --- | --- |
| AC-1 | T-1 |
| AC-2 | T-1 |
| AC-3 | T-2 |
| AC-4 | T-3 |
| AC-5 | T-4 |
| AC-6 | T-2 |
| AC-7 | T-1, T-2, T-3, T-4, T-5 |

### Notes

- T-5 last (the release lands after the pool's content). T-1/T-2 both edit getting-started/SKILL.md
  (sequential; different sections). T-3 edits every skill's Triggers (incl. getting-started's own).
- AC-7 is the **reviewer-checked** release + regression guard (the green bar — frontmatter guard, manifest
  parse, suite, spec checker — is a run-and-read whole the reviewer confirms), advanced by every task. Every
  AC is reviewer-checked and names a carrying task (the SMA-465 rule this stack pins).
