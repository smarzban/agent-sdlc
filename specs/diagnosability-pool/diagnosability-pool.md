# diagnosability-pool — checker version stamp + green-bar & parking discipline + 0.10.1 bump (SMA-480, SMA-482, SMA-483)

## Brief

<!-- source: Linear SMA-480, SMA-482, SMA-483 · ingested 2026-07-06 -->

The 0.10.1 diagnosability/discipline pool — three small, self-contained items mined from the
2026-07-05/06 Empanel field episodes, plus the PATCH version bump. Light tier: brief + AC + plan in
one pass; no `## Design` (no new component — every task edits an existing surface) and only a
fast-path `## Tech Stack` (no new product). Same gate + build + checker as the full tier.

- **SMA-480 (checker version stamp).** Twice in one week a **stale checker** produced spurious
  `trace-integrity` findings — once a cached 0.7.0 installed-plugin copy resolved on PATH, once a
  0.9.0 copy run against a 0.10.0 spec — and in both cases the report gave *no indication of which
  version produced it*, so version skew read as spec defects. Make the failure self-diagnosing:
  `sdlc-check` stamps its own version (read locally from the plugin manifest adjacent to the checker,
  `(version unknown)` when absent) into every report, exactly once. The ONE code change of the pool;
  never-throw contract and exit codes untouched.
- **SMA-482 (green-bar discipline).** Two recurrences of a false green/red: a builder read `$?` after
  `sdlc-check … | head` (the pager's exit, not the checker's) and reported a green bar that was
  exit 1; and a human-reporter flake ("N failed") was trusted over the machine reporter's
  `numFailedTests: 0`. Pin a discipline block in the build skill (referenced from ship's verify step):
  exit codes read directly (never `cmd | filter; $?`), suite verdicts from a machine-readable
  reporter, and the ledger notes the verification form.
- **SMA-483 (ship parking = reviewed head).** A builder gated a large rework to PASS and "parked for
  the overseer's merge review" without pushing — origin sat 19 commits behind, so the open PR showed
  stale code while the gate comments described the new head. Pin in ship: before parking/handoff the
  branch is pushed and the PR head equals the local reviewed head (SHA stated), and every post-open
  fix round re-pushes before re-parking.

Plus: bump agent-sdlc **0.10.0 → 0.10.1** (PATCH) in both manifests; description untouched (scope
unchanged). Tag + GitHub release left to the maintainer.

## Acceptance Criteria

<!-- source: Linear SMA-480, SMA-482, SMA-483 · ingested 2026-07-06 -->

- **AC-1** — `sdlc-check`'s report carries the checker's **own version, exactly once** per run:
  with a resolvable manifest the terminal line reads `sdlc-check <version>: …` (both the clean-pass
  line and the findings-summary line), and the version is resolved **locally** from the plugin
  manifest adjacent to the checker (never a network call). *(Verification type: **test-backed** —
  a reporter unit test asserts the version label appears exactly once on both the clean and the
  findings paths, and an integration test asserts the real CLI stdout carries `sdlc-check <semver>:`.)*
- **AC-2** — Version resolution is **fail-safe**: an absent or unparseable adjacent manifest resolves
  to `(version unknown)` and the report still renders; `resolveCheckerVersion` **never throws**.
  *(Verification type: **test-backed** — a unit test drives `resolveCheckerVersion` at a bogus path
  (returns `null`, does not throw) and `formatReport(results, null)` (renders `(version unknown)`).)*
- **AC-3** — The version stamp is **display-only**: it changes neither the set of findings nor the
  exit codes — a clean result still exits 0 with `all checks passed`, a result carrying a finding
  still exits nonzero and still renders every finding. *(Verification type: **test-backed** — a
  reporter unit test asserts the exit-code and findings invariants hold with a version argument
  supplied.)*
- **AC-4** — The **build skill** carries a green-bar discipline block (referenced from ship's verify
  step) requiring: **exit codes read directly** — never `cmd | filter; $?` (capture-to-file or an
  explicit `PIPESTATUS`/`pipefail` instead); **suite verdicts from a machine-readable reporter** (not
  a parsed human summary — a human/machine discrepancy is investigated via the machine reporter, never
  explained away); and the ledger's evidence **notes the verification form used**. *(Verification
  type: **reviewer-checked** — axis: Spec Conformance. Q: does the build skill state all three rules,
  with matching principle/red-flag rows, and does ship's verify step reference it? Justification: prose
  structure, not automatable.)*
- **AC-5** — The **ship skill** pins that, before declaring ship-parked / handing a PR off for review,
  the branch is **pushed and the PR head equals the local reviewed head** (`git rev-parse HEAD` ==
  the PR's `headRefOid`), with the **SHA stated in the handoff**; a **red-flag row** for "gate
  comments posted for a head the PR doesn't show"; and every **post-open fix round re-pushes before
  re-parking**. *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: does ship carry
  the push-before-park checklist item + the SHA-in-handoff rule + the re-push-before-re-park rule + the
  red-flag row (SKILL + finishing.md)? Justification: prose presence, not automatable.)*
- **AC-6** — Release + regression guard: agent-sdlc is bumped **0.10.0 → 0.10.1** in BOTH manifests
  (`.claude-plugin` + `.cursor-plugin`) with the **description unchanged** (scope unchanged); both
  manifests are valid JSON reading `0.10.1`; the checker suite stays green and `sdlc-check` exits 0 on
  this spec. *(Verification type: **reviewer-checked** — axis: Regression. Q: do both manifests parse
  at 0.10.1 with an untouched description, does the checker suite pass, and does `sdlc-check` exit 0 on
  this spec? Justification: the green bar is a run-and-read whole the reviewer confirms; no per-test
  name to link for this AC.)*

### Negative criteria (out of bounds)

- **NC-1** — The version stamp is **display-only** — it never alters the verdict, the findings set, or
  the exit codes (the fail-closed contract is intact). (Rides AC-3's oracle; reviewed at ship.)
- **NC-2** — **No checker rule or grammar change** beyond the version stamp; SMA-482/483 are
  **prose-only** skill edits (no new checker behavior, no new dependency). (Reviewed at ship.)

## Tech Stack

<!-- source: inherited — No new products — reuses the declared stack (green bar below) · ingested 2026-07-06 -->

**No new products — reuses the declared stack** (SMA-464 fast-path): bare-node checker source (one
edited `.mjs`, zero-dependency), Markdown skill prose, and the two JSON manifests. Green bar for this
feature:

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob) — must stay green; the version-stamp
  change adds tests and touches `formatReport`/`run`, so the suite is the load-bearing check for T-1.
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/diagnosability-pool/diagnosability-pool.md`
  → exit 0. Run the **repo** checker directly (never the on-PATH launcher — a stale plugin cache is
  exactly the skew SMA-480 fixes).
- **Strict-YAML frontmatter guard:** a `node` one-liner that `JSON.parse`s every
  `agent-sdlc/skills/*/SKILL.md` `description:` scalar → all parse (T-2/T-3 edit SKILL **bodies**, not
  frontmatter — this proves no accidental frontmatter regression).
- **Manifests (AC-6):** both `plugin.json` parse as JSON and read `0.10.1` (after T-4).

No load-bearing library claims → no `verified-by-probe` probe required.

## Plan

<!-- source: derived from the Acceptance Criteria + agent-sdlc/checker/sdlc-check.mjs + the build/ship skills + manifests · ingested 2026-07-06 -->

Four atomic tasks. Per-task green bar = checker suite green + `sdlc-check` on this spec exit 0 +
(where a SKILL is touched) the strict-YAML frontmatter guard. T-1 is test-first product code; T-2/T-3
are conformance-reviewed prose; T-4 lands the bump. `## Design` is absent by design (no new component
— every task edits an existing surface); `## Tech Stack` is the no-new-products fast-path.

- **T-1 — Checker version stamp (SMA-480).** In `agent-sdlc/checker/sdlc-check.mjs`: add a
  never-throwing `resolveCheckerVersion()` that reads the `version` from the plugin manifest adjacent
  to the checker (`../.claude-plugin/plugin.json` via `import.meta.url`; `null` on any fs/JSON
  failure), thread a `version` argument through `formatReport` (rendering `sdlc-check <version>:` or
  `sdlc-check (version unknown):` on both the clean and findings lines), and resolve-and-pass it in
  `run()`. Test-first: the failing tests land in `agent-sdlc/checker/reporter.test.mjs` (label appears
  exactly once on both paths; `(version unknown)` fallback; exit-code/findings invariants unchanged
  with a version arg) and `agent-sdlc/checker/integration.test.mjs` (real CLI stdout carries
  `sdlc-check <semver>:`). Exit codes and the never-throw contract are untouched.
  *Verification:* the checker suite is green and the new per-test `ok - <name>` lines are captured.
  *Advances:* AC-1, AC-2, AC-3. *Component:* none. *Deps:* none.
- **T-2 — Green-bar discipline block: build skill + ship reference (SMA-482).** In
  `agent-sdlc/skills/build/SKILL.md` add a green-bar discipline block — exit codes read directly
  (never `cmd | filter; $?`; capture-to-file or `PIPESTATUS`/`pipefail`), suite verdicts from a
  machine-readable reporter (a human/machine discrepancy investigated via the machine one, never
  explained away), ledger evidence notes the verification form — plus a matching principle and
  red-flag row(s); reference the discipline from `agent-sdlc/skills/ship/SKILL.md`'s verify step.
  Prose only; strict-YAML frontmatter untouched. *Verification (prose):* re-read against AC-4, NC-2.
  *Advances:* AC-4. *Component:* none. *Deps:* none.
- **T-3 — Ship parking = reviewed head (SMA-483).** In `agent-sdlc/skills/ship/SKILL.md` pin the
  parking/handoff rule (push before parking; PR head == local reviewed head; state the SHA;
  re-push before every re-park) as a checklist item + a red-flag row, and add the mechanics to
  `agent-sdlc/skills/ship/reference/finishing.md`. Prose only; strict-YAML frontmatter untouched.
  *Verification (prose):* re-read against AC-5, NC-2. *Advances:* AC-5. *Component:* none. *Deps:* none.
- **T-4 — Version bump 0.10.0 → 0.10.1 (both manifests) (release).** Bump `version` to `0.10.1` in
  both `agent-sdlc/.claude-plugin/plugin.json` and `agent-sdlc/.cursor-plugin/plugin.json`, leaving
  the description **unchanged** (scope unchanged); tag + GitHub release left to the maintainer.
  *Verification:* both manifests parse as JSON and read `0.10.1` with an untouched description; the
  suite + spec checker + strict-YAML guard stay green. *Advances:* AC-6. *Component:* none.
  *Deps:* T-1, T-2, T-3.

### Task-to-criterion coverage map

| AC | Advanced by |
| --- | --- |
| AC-1 | T-1 |
| AC-2 | T-1 |
| AC-3 | T-1 |
| AC-4 | T-2 |
| AC-5 | T-3 |
| AC-6 | T-4 |

### Notes

- T-4 last (the release lands after the pool's content). T-1 is the only source change; T-2/T-3 are
  independent prose edits (no ordering dependency between them). Every task's component field is the
  `none` null marker — a light-tier spec with no `## Design`, every task a pure edit of an existing
  surface (sanctioned by `getting-started/reference/light-tier.md`).
- AC-6 is the **reviewer-checked** release + regression guard (the green bar — suite, spec checker,
  strict-YAML guard, manifest parse — is a run-and-read whole the reviewer confirms), so it names its
  own carrying task (T-4) per the SMA-465 reviewer-checked-carrying-task rule.
