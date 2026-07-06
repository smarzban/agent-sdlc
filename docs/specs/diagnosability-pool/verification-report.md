# Verification report — diagnosability-pool (AC → proof map)

Terminal mechanical settle of "every AC met" against captured reality, written pre-PR. Test-backed
rows name test identifiers that appear verbatim in `build-report.md`'s captured green-bar evidence
(ADR-0001 name-appearance linkage); reviewer-checked rows record the answered pass/fail question.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | test-backed | SMA-480 AC-1: the version label appears exactly once on both the clean-pass and findings paths, SMA-480: the real CLI stamps the adjacent manifest semver version onto the clean-pass line |
| AC-2 | test-backed | SMA-480 AC-2: resolveCheckerVersion fails safe to null on a bogus path and formatReport renders (version unknown) |
| AC-3 | test-backed | SMA-480 AC-3: the version is display-only — exit code and findings are unchanged with a version arg |
| AC-4 | reviewer-checked | Q: does the build skill state exit-codes-direct + machine-readable-reporter + ledger-notes-form, with matching principle/red-flag rows, and does ship's verify step reference it? A: Yes — build/SKILL.md "Reading the green bar" section (3 rules) + a principle, red-flag, and two rationalization rows + the step-4f note; ship/SKILL.md step 2 references the discipline. Independent reviewer confirmed AC-4 satisfied. |
| AC-5 | reviewer-checked | Q: does ship pin push-before-park + HEAD==headRefOid + SHA-in-handoff + re-push-before-re-park + a red-flag row? A: Yes — ship/SKILL.md step 9 + red-flag row + rationalization row + Done-when line; finishing.md "Parking / handing off for review" section. Independent reviewer confirmed AC-5 satisfied and the 9→10 renumber broke no cross-reference. |
| AC-6 | reviewer-checked | Q: both manifests bumped to 0.10.1 with the description unchanged, suite green, sdlc-check exit 0 on this spec? A: Yes — both plugin.json read 0.10.1; each description's SHA-1 is byte-identical to HEAD (unchanged); suite 153/153 (# fail 0); sdlc-check 0.10.1 exits 0 on this spec. |

**Negative criteria.** NC-1 (version stamp display-only — never alters verdict/findings/exit codes) is
discharged by AC-3's test-backed oracle above. NC-2 (no checker rule/grammar change beyond the version
stamp; SMA-482/483 prose-only, no new dependency) is a whole-diff judgment confirmed at review: the
only `src` change is the version-stamp diff in `sdlc-check.mjs`; the build/ship edits are Markdown.

**Checker corroboration (pre-PR):** `sdlc-check specs/diagnosability-pool/diagnosability-pool.md
--require ledger --require verification-report` → recorded in the PR body; run with the **repo**
checker directly.

**Verification form (SMA-482, practised here):** every exit code above was read directly (unpiped);
suite verdicts are the machine-reporter counts (`# tests / # pass / # fail`), not a scraped human
summary.
