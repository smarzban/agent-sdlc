# Verification report — plan-ac-contracts

Terminal AC → proof map (ship stage). AC-1/AC-2/AC-3 are **test-backed** (the SMA-465a checker change) —
their proof names the tests that prove them, and each named test appears verbatim in the build ledger's
captured green-bar evidence (AC-14 name-appearance linkage). AC-4/AC-5/AC-6/AC-7 are **reviewer-checked**
(pipeline prose) — each row records the answered question + verdict. `sdlc-check …
--require verification-report` exit 0; suite 148 green.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | test-backed | extractAcVerification classifies each AC by the verification-type text in its own block, extractAcVerification never throws on a ragged / empty Acceptance Criteria block |
| AC-2 | test-backed | a reviewer-checked unreached AC gets the carrying-task hint in its coverage-forward finding, a test-backed unreached AC keeps the base coverage-forward message (no hint) |
| AC-3 | test-backed | extractAcVerification never throws on a ragged / empty Acceptance Criteria block |
| AC-4 | reviewer-checked | Is the carrying-task rule pinned in BOTH the acceptance-criteria AND plan grammar sections (every AC incl. reviewer-checked must appear in ≥1 task's `*Advances:*` / coverage-map row; the reviewer-checked carrying task produces the artifact the reviewer checks)? PASS — pinned in `acceptance-criteria/SKILL.md` (Verification-type + Red-flags + Checker-grammar) and `plan/SKILL.md` (Checker-grammar); T-2 reviewer confirmed it is in both. |
| AC-5 | reviewer-checked | Does the acceptance-criteria grammar section document the new checker behavior (per-AC verification-type parse + sharpened coverage-forward hint) in lockstep with `sdlc-check.mjs`? PASS — T-2 reviewer verified point-by-point vs source: declaration-first parse + keyword fallback, hint appended only for reviewer-checked unreached ACs, base message unchanged, and NC-1 (no auto-trace) stated; the doc's quoted hint matches the code string. |
| AC-6 | reviewer-checked | Does `build/reference/plan-amendments.md` define detect→route(plan method)→materialize(+provenance marker)→inline-gate→ledger, reusing the existing inline-gate mechanism (no new checker grammar)? PASS — T-3 reviewer confirmed reuse-not-reinvention against `ingesting-plans.md` (same `/agent-sdlc:gate` inline mechanism), provenance marker + ledger reused, no new grammar. |
| AC-7 | reviewer-checked | Are the escalation boundary (mechanical drift in-loop; scope/AC change stops-and-asks) + the never-authors invariant (NC-2) stated, and is it wired in (build SKILL mandate-at-step + rationalization row; plan SKILL note)? PASS — T-3 reviewer confirmed the WHAT-vs-HOW boundary keeps scope with the human (fail-safe = stop-and-ask), the invariant has no free-author hole, and the build/plan wiring is present. |
