# Verification report — enforcement-spine

Terminal AC → proof map (ship stage). Each defined `AC-N` is settled against a named proof:
test-backed rows name the test(s) whose captured green-bar evidence proves them (name-appearance,
ADR-0001); reviewer-checked rows record the answered Spec-Conformance question. NC rows are advisory
(the checker's AC-13 scopes to defined ACs).

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | test-backed | a dangling trace reference yields a finding naming the missing ID |
| AC-2 | test-backed | an AC reached by no task yields a finding naming it |
| AC-3 | test-backed | a task with an explicit untraced marker yields a coverage note, not a finding |
| AC-4 | test-backed | a done task with no commit referencing it fails naming the task |
| AC-5 | test-backed | a done task with no evidence entry at all yields a finding naming it |
| AC-6 | test-backed | a provenance marker missing its source yields a finding naming the section |
| AC-7 | test-backed | AC-7 happy path: a fully valid fixture (spec + ledger + report + matching git history) exits 0 |
| AC-8 | test-backed | three distinct findings: all three appear in the text, exit code nonzero (AC-9 + AC-8) |
| AC-9 | test-backed | three distinct findings: all three appear in the text, exit code nonzero (AC-9 + AC-8) |
| AC-10 | test-backed | no spec path: exits nonzero and names the problem |
| AC-11 | test-backed | AC-11/NC-2: a full run leaves the fixture tree byte-identical (no file created/modified/deleted) |
| AC-12 | test-backed | AC-12/NC-1(a): every import in sdlc-check.mjs is node:-prefixed stdlib only |
| AC-13 | test-backed | a defined AC with no row at all in the proof map yields a finding naming it |
| AC-14 | test-backed | a test-backed row whose named test is ABSENT from the captured evidence yields a finding naming the row |
| AC-15 | reviewer-checked | Do gate/build/ship each mandate invoking the checker at a defined point when runtime available? PASS — gate SKILL.md check 6 + step 5; build SKILL.md steps 3 (resume) + 5 (build-complete); ship SKILL.md step 3. (T-10/T-11/T-12 conformance reviews all PASS.) |
| AC-16 | reviewer-checked | Does a failed check stop-and-ask, override recorded? PASS — gate → gate-report.md; build → build-report.md; ship → PR body. All three reviews PASS. |
| AC-17 | reviewer-checked | Runtime absent → announced degraded fallback, never silent? PASS — mandated in gate + build (and ship) texts; T-10/T-11 reviews PASS. |
| AC-18 | reviewer-checked | Does ship publish the AC → proof map in the PR body? PASS — ship SKILL.md step 5 + finishing.md "Verification" PR-body section (T-12 review PASS). |
