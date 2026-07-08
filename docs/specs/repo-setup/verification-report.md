# Verification report — repo-setup

AC → proof map (ship, 2026-07-08). Test-backed proofs cite identifiers from `build-report.md`'s
captured green-bar evidence (the conductor's own T-6 fixture run, committed in full at
`probes/fixture-run-2026-07-08.md`). Reviewer-checked proofs record the answered pass/fail
question from ship's Spec-Conformance read; the post-PR Empanel gate corroborates them.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | reviewer-checked | Does the skill unconditionally sequence the audit before every create/modify step? Yes — `skills/repo-setup/SKILL.md` Checklist step 1 is the audit (present/missing/drifted per contract); every create/modify step follows and references the audit's offer. |
| AC-2 | reviewer-checked | Is every existing-file path read-then-update-with-offer with no overwrite instruction? Yes — the HARD-GATE and Checklist forbid wholesale replacement; existing files are read and updated with each change surfaced. |
| AC-3 | test-backed | step 4 CLAUDE.md exact-content diff-exit:0 |
| AC-4 | reviewer-checked | Are all five enumerated elements present in the seeded AGENTS.md template? Yes — `skills/repo-setup/reference/templates.md` AGENTS.md block: litmus test; lazy-creation rule; pointer-files-carry-no-content rule; prose pointer; the `@AGENTS.local.md` line (corroborated by T-2 review). |
| AC-5 | test-backed | step 7 probe (present): ZEBRA42 + FALCON77 recalled |
| AC-6 | test-backed | step 8 probe (absent): ZEBRA42 only |
| AC-7 | test-backed | step 6 token grep vs declared list diff-exit:0 |
| AC-8 | reviewer-checked | Does each owner-decision item's path end in flag/ask with nothing fabricated? Yes — SKILL.md's owner-decision discipline covers LICENSE/security/CoC/templates/CODEOWNERS/remote values; remote settings propose-only. |
| AC-9 | reviewer-checked | Single pipeline ask, no pipeline artifact reachable on the no path? Yes — one opt-in question; yes-path artifacts enumerated; no-path creates none. |
| AC-10 | reviewer-checked | Do writing-repo-docs and writing-readmes carry the seed-marker recognition statement? Yes — both cite `repo-setup:seed` as an intentional fill-target, never a placeholder violation (T-8; all formerly-unqualified no-placeholder statements now carry the exception). |
| AC-11 | reviewer-checked | Does the templates bullet state refine-existing / offer-only-when-repo-setup-never-ran? Yes — writing-repo-docs Phase 4 (and the Phase 2 skeleton line matches). |
| AC-12 | reviewer-checked | Frontmatter strict-YAML and the conventional section skeleton? Yes — name matches dir; description ends with Triggers + standalone scope; body sections in order (intent, HARD-GATE, Checklist, Principles, Rationalizations, Red flags, Done when, The artifact, Conventions). |
| AC-13 | reviewer-checked | Does each named surface enumerate repo-setup? Yes — README (four spots incl. the renamed Standalone skills section), docs/README.md row, llms.txt, and all four manifest descriptions (plugin.json pair lockstep-identical). |
| AC-14 | reviewer-checked | All three harness statements present and accurate? Yes — `skills/repo-setup/reference/harness-loading.md`: Cursor no-private-mechanism; Codex override-shadowing don't; OpenCode optional instructions hardening, not seeded — tags match the spec's Tech Stack list. |

Negative criteria (not required rows, recorded for the reviewer): NC-1..NC-6 hold — no dev-env
onboarding content, no writing-* deliverables, no `AGENTS.override.md`, no remote mutation, no
runtime/checker change (suite untouched at 157), no default shim beyond CLAUDE.md.

Checker (pre-PR): see PR body Verification section for the run result.
