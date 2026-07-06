# Verification report — spec-location-under-docs

AC → proof map, written at ship (pre-park). Checker-verified:
`node checker/sdlc-check.mjs docs/specs/spec-location-under-docs/spec-location-under-docs.md
--require ledger --require verification-report` → exit 0.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | reviewer-checked | Does getting-started's File layout show the `docs/specs/` tree (incl. `verification-report.md`) with the back-compat rule stated exactly once, all three clauses, and both reference docs updated? PASS — T-2 (`9995b15`): the layout block nests `docs/ → specs/`, the **Back-compat rule (the authoritative statement …)** paragraph carries keep / never-split / never-auto-migrate + new-trees-at-`docs/specs/`, and `input-resolution.md` + `light-tier.md` read `docs/specs/…`. Confirmed by the ship review (back-compat lens). |
| AC-2 | reviewer-checked | Does the sweep grep come back empty under the two exclusions (historical `docs/specs/` content; explicit back-compat statements), do stage skills reference (not restate) the rule, and does strict-YAML pass? PASS — T-3 (`5d6aefe`) + T-4 (`2bf34dc`): `grep -rn 'specs/'` over `skills/`, `README.md`, `CONTRIBUTING.md`, `CONTEXT.md`, `llms.txt`, `docs/` (excluding `docs/specs/` content) leaves only back-compat statements, the two nested tree-drawing lines, and relative links that resolve inside `docs/specs/`; every stage skill's artifact-location statement carries the one-line "(root `specs/` … back-compat rule in getting-started)" reference; strict-YAML guard: 13/13 parse, 0 bad. Confirmed by the ship review (sweep lens). |
| AC-3 | test-backed | the real enforcement-spine spec yields zero findings from all three rules (this feature would not block its own build), the real enforcement-spine spec yields zero provenance-marker findings (no markers present), the real enforcement-spine ledger yields zero green-bar-evidence findings (T-1..T-4 done, each with captured evidence) |
| AC-4 | reviewer-checked | Does the migration commit show pure `R100` renames and does the 11-spec checker loop exit 0? PASS — T-1 (`857e176`): `git show 857e176 --diff-filter=R --name-status | grep -c '^R100'` → 42 (every moved file, 100% similarity — historical content byte-unchanged at the move); all 10 migrated feature specs + this spec exit 0 via `node checker/sdlc-check.mjs docs/specs/<feature>/<feature>.md`; the only in-tree content edits across the branch are the living `overview.md` (T-4) and this feature's own chain. |
| AC-5 | reviewer-checked | Does a link-existence check over README + community files + docs pages find zero dangling relative targets? PASS — T-4 (`2bf34dc`): 99 relative links checked, 0 dangling in README/docs pages; the single repo-wide hit is a pre-existing verbatim quotation inside the immutable `docs/specs/evidence-gated-techstack/verification-report.md` (dangling on `main` before the move too — confirmed against `main`'s copy; historical spec content, not a docs page). Confirmed by the ship review (docs/link lens). |
| AC-6 | reviewer-checked | Do both manifests parse at 0.12.0 and is the full green bar green at the release commit? PASS — T-5 (`b912caf`): `.claude-plugin/plugin.json` + `.cursor-plugin/plugin.json` both `JSON.parse` to `version: "0.12.0"` (lockstep; description unchanged — it makes no layout claims); at `b912caf` the suite is 153/153/0 skipped, the 11-spec loop all exit 0, strict-YAML 0 bad. |

**AC-3 context (outside the proof cell — the cell carries only the AC-14 test names):** the three
tests are the re-anchored self-referential rules tests in `checker/rules.test.mjs`, running against
`../docs/specs/enforcement-spine/` with the `existsSync` skip-guard not fired; the full suite run
recorded in the ledger's T-1 evidence reads `# tests 153 / # pass 153 / # fail 0 / # skipped 0`,
exit 0 read directly.

## Negative criteria

| NC | Proof |
| --- | --- |
| NC-1 | `git diff main...HEAD -- checker/sdlc-check.mjs` → empty (checker source byte-untouched); the only checker-directory changes are the three test files' path strings. |
| NC-2 | Root `constitution.md` (absent in this repo) and `CONTEXT.md` untouched in location — `CONTEXT.md` stays at the repo root (one internal path string updated only); no detection/migration code added anywhere (the back-compat rule is prose in getting-started). |
| NC-3 | The migration commit is rename-only (42 × R100); inside `docs/specs/` only `overview.md` (living) and `spec-location-under-docs/` (this feature) have content changes on the branch. |
