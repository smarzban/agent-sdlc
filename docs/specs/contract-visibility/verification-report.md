# Verification report — contract-visibility

Terminal AC → proof map (ship stage). A prose + manifest change, so every AC is **reviewer-checked**
(conformance re-read + manifest verification — no test-backed rows, no name-appearance linkage). Each
row records the answered question and its per-task reviewer verdict.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | reviewer-checked | Does each artifact-producing SKILL body document the exact grammar it must emit (design components + `### Outside the checker`; plan trace fields + coverage map; build ledger + evidence; ship `Criterion\|Type\|Proof`)? PASS — a "Checker grammar" subsection added to architecture-design/plan/build/ship/acceptance-criteria; the T-1 reviewer cross-checked every documented rule against `sdlc-check.mjs`. |
| AC-2 | reviewer-checked | Does the documented grammar reflect the FINAL post-0.8.0-pool rules (anchored whole-word matching, `none`-only null marker + structured externals, recorded-commit ledger↔git) and NOT the removed substring-allowlist or history-walk models? PASS — T-1 reviewer confirmed AC-2 (no stale rules); the stale "no-wrap" claim was corrected to the real period-termination rule + the multi-word-component-name one-line caveat. |
| AC-3 | reviewer-checked | Is the placement principle stated (contracts in SKILL bodies; `reference/` optional depth) and are the load-bearing references mandated-read at their step? PASS — getting-started shared rules gained "Contracts in the body, depth in `reference/`"; build mandates subagent-loop.md (dispatch) + ingesting-plans.md (ingest), ship mandates finishing.md (PR step); T-2 review PASS. |
| AC-4 | reviewer-checked | Does the acceptance-criteria skill mandate pinning each relational term a rule will consume (step + red flag), before the criteria are settled? PASS — a checklist step "Pin relational terms" + a red flag citing the 3-instance enforcement-spine pattern + a rationalization row; T-3 review PASS (renumbering clean). |
| AC-5 | reviewer-checked | Are both manifests bumped 0.7.0 → 0.8.0 with a refreshed identical description, still valid JSON, the suite green, and `sdlc-check` exit 0? PASS — both `plugin.json` read `0.8.0` with byte-identical descriptions (every claim traced to a shipped pool PR, no overclaim — T-4 review PASS); suite 143 green; `sdlc-check … --require ledger` exit 0. Git tag + GitHub release left to the maintainer. |
