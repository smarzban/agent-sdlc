# spec-location-under-docs — the canonical spec tree moves to `docs/specs/` + 0.12.0 bump

## Brief

<!-- source: maintainer direction (2026-07-06) · ingested 2026-07-06 -->

The pipeline's canonical spec location moves from root `specs/` to **`docs/specs/`**: spec chains
are documentation and belong under the docs tree; the repo root stays clean. The change is
cross-cutting — the layout is a shared contract stated across the getting-started router, every
stage skill, and the repo's own docs — so the full tier applies (escalation trigger: cross-cutting
change), compressed where honest: no new component or product, so `## Design` maps the change onto
existing surfaces and `## Tech Stack` takes the no-new-products fast-path.

Four decided pieces (maintainer + overseer; not relitigated here):

1. **New canonical layout** everywhere the artifact model is stated: `docs/specs/overview.md`,
   `docs/specs/adr/ADR-*.md`, `docs/specs/<feature>/{<feature>.md, gate-report.md, build-report.md,
   verification-report.md}`. Root-level `constitution.md` + `CONTEXT.md` do NOT move (out of scope).
2. **Back-compat rule, stated once** in getting-started (the shared rules) and referenced elsewhere:
   a repo that already has a spec tree at root `specs/` KEEPS using it — never split a repo across
   both locations, never auto-migrate a user's repo. New spec trees are created at `docs/specs/`.
3. **Sweep every skill and doc** for root-`specs/` path references. The checker takes the spec path
   as an argument and is location-agnostic (verified: zero hardcoded spec-tree strings in
   `checker/sdlc-check.mjs`), so no checker source change rides.
4. **Migrate THIS repo's own tree** (`git mv specs docs/specs`, history-preserving) and fix
   everything that referenced it — including the three self-referential checker tests that resolve
   the real enforcement-spine spec relative to `checker/`.

Plus: bump agent-sdlc **0.11.0 → 0.12.0** (MINOR: a default-behavior change) in both manifests,
lockstep, as the release commit. Tag + GitHub release left to the maintainer.

## Acceptance Criteria

<!-- source: maintainer direction (2026-07-06) · ingested 2026-07-06 -->

- **AC-1** — getting-started states the canonical layout and the back-compat rule, **once,
  authoritatively**: its File layout block shows the `docs/specs/` tree (`overview.md`, `adr/`,
  `<feature>/` with spec + `gate-report.md` + `build-report.md` + `verification-report.md`), and the
  back-compat rule is stated there as the single authoritative statement — an existing root
  `specs/` tree keeps being used, never split across both locations, never auto-migrated; new trees
  are created at `docs/specs/`. Its reference docs (`input-resolution.md`, `light-tier.md`) use the
  new paths. *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: does the File
  layout show `docs/specs/`, is the back-compat rule stated exactly once as the authoritative
  statement with all three clauses (keep / never split / never auto-migrate), and do both reference
  docs read `docs/specs/`? Justification: prose structure, not automatable.)*
- **AC-2** — The sweep is complete and referenced, not restated: every root-`specs/` path reference
  in `skills/*/SKILL.md`, `skills/*/reference/*.md`, `README.md`, `CONTRIBUTING.md`, `CONTEXT.md`,
  `llms.txt`, and `docs/` (outside `docs/specs/`) reads `docs/specs/`; each stage skill that states
  where its artifact lives carries a short reference to getting-started's back-compat rule instead
  of restating it. A repo-wide grep finds **zero** remaining root-`specs/` path references outside
  `docs/specs/` historical spec content and explicit back-compat statements; the strict-YAML
  frontmatter guard still parses all 13 skills. *(Verification type: **reviewer-checked** — axis:
  Spec Conformance. Q: does the grep come back empty under those two exclusions, do the stage
  skills reference (not restate) the rule, and does the strict-YAML guard pass? Justification: a
  run-and-read whole; "reference not restate" is judgment.)*
- **AC-3** — The checker suite is green with the self-referential tests **running, not skipping**:
  `node --test checker/*.test.mjs` exits 0 with 153 pass / 0 fail / **0 skipped**, and the three
  enforcement-spine self-referential tests in `checker/rules.test.mjs` resolve
  `../docs/specs/enforcement-spine/` and execute their assertions (the `existsSync` skip-guard does
  not fire). *(Verification type: **test-backed** — the three tests "the real enforcement-spine
  spec yields zero findings from all three rules (this feature would not block its own build)",
  "the real enforcement-spine spec yields zero provenance-marker findings (no markers present)",
  and "the real enforcement-spine ledger yields zero green-bar-evidence findings (T-1..T-4 done,
  each with captured evidence)" appear as `ok` lines in the captured suite run, with `# skipped 0`.)*
- **AC-4** — The migration is history-preserving and self-verifying: the tree moves via git rename
  (the migration commit records `R`-status renames for every moved file, so `git log --follow`
  traces each spec's history); every previously shipped feature spec (all 10) **and this spec**
  exit 0 via `node checker/sdlc-check.mjs docs/specs/<feature>/<feature>.md`; migrated historical
  spec content is byte-unchanged (rename-only) — the only in-tree content edits are the living
  `docs/specs/overview.md` layout mentions and this feature's own chain. *(Verification type:
  **reviewer-checked** — axis: Regression. Q: does the migration commit show pure `R100` renames
  for the historical chains, and does the 11-spec checker loop exit 0 throughout? Justification:
  a run-and-read whole (git status letters + a loop of exit codes), no single named test.)*
- **AC-5** — Every relative link in `README.md` and `docs/` that points into the spec tree resolves
  on disk after the move (e.g. `docs/development.md` and `docs/architecture.md` now point at
  `specs/…` *relative to `docs/`*, `docs/usage/pipeline.md` at `../specs/`, root `README.md` and
  `llms.txt` at `docs/specs/…`). *(Verification type: **reviewer-checked** — axis: Docs accuracy.
  Q: does a link-existence check over README + docs (markdown relative links, resolved against each
  file's directory) find zero dangling targets? Justification: run-and-read link check.)*
- **AC-6** — Release + regression guard: agent-sdlc is bumped **0.11.0 → 0.12.0** in BOTH manifests
  (`.claude-plugin/plugin.json` + `.cursor-plugin/plugin.json`), lockstep, both valid JSON; at the
  release commit the checker suite, the 11-spec checker loop, and the strict-YAML guard are green.
  *(Verification type: **reviewer-checked** — axis: Regression. Q: do both manifests parse at
  0.12.0, and is the full green bar green at the release commit? Justification: the green bar is a
  run-and-read whole the reviewer confirms.)*

### Negative criteria (out of bounds)

- **NC-1** — `checker/sdlc-check.mjs` is **byte-untouched**: it is location-agnostic (takes the
  spec path as an argument; zero hardcoded spec-tree strings, verified at design time), and no
  checker rule or grammar change rides this feature. (Reviewed at ship.)
- **NC-2** — Root-level `constitution.md` + `CONTEXT.md` **do not move**, and no auto-migration
  machinery is added anywhere — the back-compat rule is prose, not code. (Reviewed at ship.)
- **NC-3** — No historical spec content is edited (immutable snapshots): inside the migrated tree
  only the living `docs/specs/overview.md` and this feature's own chain change. (Rides AC-4's
  oracle; reviewed at ship.)

## Design

<!-- source: derived from the Acceptance Criteria + a repo-wide reference survey · ingested 2026-07-06 -->

No new component and no product code: skill/doc prose, three checker *test* files, and a git rename
of the repo's own tree. Changed things are declared with the structured "outside the checker" form
(they are texts and repo surfaces, not numbered `### Components`).

### Outside the checker (changed components)

1. **getting-started skill text** — `skills/getting-started/SKILL.md` plus
   `skills/getting-started/reference/input-resolution.md` and
   `skills/getting-started/reference/light-tier.md`: owns the canonical `docs/specs/` layout and
   the single authoritative back-compat statement (AC-1).
2. **stage skill texts** — the other nine pipeline SKILL.mds (`idea`, `acceptance-criteria`,
   `architecture-design`, `techstack`, `plan`, `gate`, `build`, `ship`, `linear-sync`) plus
   `build/reference/subagent-loop.md`, `build/reference/ingesting-plans.md`, and
   `ship/reference/finishing.md`: path sweep + a short reference to the back-compat rule where each
   states its artifact's location (AC-2).
3. **repo docs surface** — `README.md`, `CONTRIBUTING.md`, `CONTEXT.md`, `llms.txt`, the `docs/`
   tree (`README`, `quickstart`, `architecture`, `development`, `usage/{pipeline, light-tier,
   start-anywhere, sdlc-check}`), and the **living** `docs/specs/overview.md` layout mentions:
   path sweep + relative-link fixes (AC-2, AC-5).
4. **checker test suite** — `checker/rules.test.mjs` (the three self-referential path anchors gain
   the `docs` segment), `checker/integration.test.mjs` (the temp-dir fixture path mirrors the new
   canonical layout), `checker/parser.test.mjs` (synthetic path labels updated for canonical
   consistency). The checker itself is out of the change (NC-1) (AC-3).
5. **repo spec tree** — the `specs/ → docs/specs/` migration of this repo's own dogfood chains,
   via `git mv` (AC-4).

### Design decisions

- **D1 — back-compat by prose rule, not machinery.** Existing root-`specs/` repos keep working
  because every stage resolves the spec tree at run time and the checker takes the spec path as an
  argument (verified: `grep -c 'specs' checker/sdlc-check.mjs` → 0). The rule is stated once in
  getting-started; adding detection/migration code would be over-build.
- **D2 — this repo migrates in the same change.** Dogfooding the destination: the repo's own tree
  moves by git rename in one task, so `git log --follow` and the ledger-recorded task SHAs (which
  the `ledger-vs-git` rule verifies as reachable from HEAD) survive intact.
- **D3 — transient two-tree state is branch-internal.** This spec chain is authored at the NEW
  location before the migration task lands, so for the first commits of the feature branch both
  `specs/` and `docs/specs/` exist. T-1 resolves it immediately; `main` never sees a split tree
  (FF merge of the whole branch).

## Tech Stack

<!-- source: inherited — No new products — reuses the declared stack (green bar below) · ingested 2026-07-06 -->

**No new products — reuses the declared stack** (fast-path): Markdown skill/doc prose, the existing
zero-dependency bare-node checker test suite, git itself for the rename, and the two JSON
manifests. Green bar for this feature:

- **Tests:** `node --test checker/*.test.mjs` — 153 pass / 0 fail / **0 skipped** (the skip count
  is load-bearing: the three self-referential tests must RUN against `docs/specs/`).
- **Checker (self + migrated):** `node checker/sdlc-check.mjs docs/specs/<feature>/<feature>.md` →
  exit 0 for this spec and for all 10 migrated feature specs (run the repo checker directly, never
  the on-PATH launcher).
- **Sweep guard:** `grep -rn 'specs/'` over the non-spec surfaces (excluding `docs/specs/` content
  and explicit back-compat statements) → empty.
- **Strict-YAML frontmatter guard:** every `skills/*/SKILL.md` `description:` scalar JSON-parses.
- **Manifests (AC-6):** both `plugin.json` parse as JSON and read `0.12.0` (after T-5).

No load-bearing library claims → no `verified-by-probe` probe required.

## Plan

<!-- source: derived from the Acceptance Criteria + the repo-wide reference survey (87 skill refs + 33 docs/root refs + 3 test anchors) · ingested 2026-07-06 -->

Five atomic tasks, dependency-ordered. Per-task green bar = the checker suite green (153/0/0
skipped) + `sdlc-check` on this spec exit 0 + (where a SKILL is touched) the strict-YAML guard.
T-1 moves the tree first so every later task's paths and links verify against the real layout.

- **T-1 — Migrate the repo's own tree + re-anchor the checker tests.** `git mv specs docs/specs`
  (history-preserving rename; no content edits). In `checker/rules.test.mjs`, re-anchor the three
  self-referential tests' path arrays from `'..', 'specs', 'enforcement-spine'` to
  `'..', 'docs', 'specs', 'enforcement-spine'` (spec ×2, ledger ×1). In
  `checker/integration.test.mjs`, point the temp-dir fixture at `docs/specs/enforcement-spine`
  (mirrors the new canonical layout). In `checker/parser.test.mjs`, update the synthetic
  `specs/x/…` path labels to `docs/specs/x/…` (canonical consistency; assertions updated in
  lockstep). Test-first shape: re-anchor the test paths FIRST and observe the three tests skip
  (the exact regression the bar forbids), then the `git mv` makes them run. *Verification:* suite
  153 pass / 0 skipped with the three tests as `ok` lines; the 11-spec checker loop
  (`docs/specs/*/`) exits 0. *Advances:* AC-3, AC-4. *Component:* checker test suite, repo spec
  tree. *Deps:* none.
- **T-2 — getting-started: canonical layout + the back-compat rule, once.** In
  `skills/getting-started/SKILL.md`: the File layout block becomes the `docs/specs/` tree (incl.
  `verification-report.md`, which the current block omits), the routing / spec-lifecycle /
  where-to-start path mentions move to `docs/specs/…`, and the back-compat rule lands once as the
  authoritative statement (keep an existing root `specs/` tree / never split / never auto-migrate;
  new trees at `docs/specs/`). Update `reference/input-resolution.md` +
  `reference/light-tier.md` paths. *Verification (prose):* re-read against AC-1; strict-YAML guard.
  *Advances:* AC-1. *Component:* getting-started skill text. *Deps:* T-1.
- **T-3 — Stage-skills sweep.** In the nine other pipeline SKILL.mds + `build/reference/
  subagent-loop.md` + `build/reference/ingesting-plans.md` + `ship/reference/finishing.md`: every
  root-`specs/` path reference becomes `docs/specs/…`, and each skill's artifact-location statement
  (its Conventions "Lives as/at …" line) gains a short reference to getting-started's back-compat
  rule (reference, not restatement). *Verification (prose):* the sweep grep over `skills/` is
  empty under the two exclusions; strict-YAML guard; re-read against AC-2. *Advances:* AC-2.
  *Component:* stage skill texts. *Deps:* T-1.
- **T-4 — Docs + root surfaces sweep.** Update `README.md`, `CONTRIBUTING.md`, `CONTEXT.md`,
  `llms.txt`, `docs/README.md`, `docs/quickstart.md`, `docs/architecture.md`,
  `docs/development.md`, `docs/usage/{pipeline, light-tier, start-anywhere, sdlc-check}.md` to the
  `docs/specs/` layout, fixing the relative links that the move re-bases (`../specs/…` → `specs/…`
  from `docs/`; `../../specs/` → `../specs/` from `docs/usage/`), and update the **living**
  `docs/specs/overview.md` layout mentions (its `## Overview` tree sentence + the `## Architecture`
  "Spec chains live in …" bullet). Add the back-compat note where the docs state the canonical
  location (README layout section; usage/pipeline.md artifact model). *Verification (prose):* the
  sweep grep over docs/root surfaces is empty under the two exclusions; the relative-link
  existence check passes; re-read against AC-2, AC-5, NC-3. *Advances:* AC-2, AC-5.
  *Component:* repo docs surface. *Deps:* T-1.
- **T-5 — Version bump 0.11.0 → 0.12.0 (both manifests) (release).** Bump `version` to `0.12.0`
  in `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json`, lockstep; the description
  gains no claims (the layout is not part of the description text). *Verification:* both manifests
  parse as JSON and read `0.12.0`; the full green bar (suite + 11-spec loop + strict-YAML + sweep
  grep) is green. *Advances:* AC-6. *Component:* none. *Deps:* T-1, T-2, T-3, T-4.

### Task-to-criterion coverage map

| AC | Advanced by |
| --- | --- |
| AC-1 | T-2 |
| AC-2 | T-3, T-4 |
| AC-3 | T-1 |
| AC-4 | T-1 |
| AC-5 | T-4 |
| AC-6 | T-5 |

### Notes

- T-1 first: after it, every later task's paths and links are checked against the real moved tree,
  and the 0-skipped invariant is locked in from the first commit.
- AC-4 and AC-6 are reviewer-checked release/regression wholes, so they name their carrying tasks
  (T-1, T-5) per the reviewer-checked-carrying-task rule.
- T-5's component field carries the sanctioned `none` null marker — a pure manifest edit advancing
  a criterion without a distinct product.
- The three escalation-relevant facts for the tier call: cross-cutting (fires → full tier), no new
  dependency, no new component (→ Design maps onto existing surfaces; Tech Stack fast-path).
