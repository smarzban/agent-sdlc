# Verification report — build-gate-robustness

Terminal AC → proof map (ship stage). This feature is a prose change to two pipeline skills, so every
AC is **reviewer-checked** (conformance re-read, mirroring enforcement-spine's T-10/11/12 skill-wiring
verification) — there are no test-backed rows and no name-appearance (AC-14) linkage. Each row records
the answered conformance question and its per-task reviewer verdict.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | reviewer-checked | Does the build skill pin the agent-type roster at build start, announcing any substitution once up front and recording it in the ledger (not per-dispatch)? PASS — build/SKILL.md step 2 mandates start-of-build roster resolution + one-time announced substitution + ledger record; the T-1 conformance reviewer confirmed placement and wording. |
| AC-2 | reviewer-checked | Is the subagent-death policy a deterministic sequence (capture partial → retry once fresh → conductor-takeover), with the deviation recorded and the retry bounded? PASS — reference/subagent-loop.md states the 4-step policy with "one retry, not a loop" and enumerated ledger recording; a taken-over task still clears review + green bar + isolation (T-1 review confirmed). |
| AC-3 | reviewer-checked | Does gate check 4 now EXECUTE each declared green-bar command once and fail (with the command's actual output) on an unrunnable command — runnability, not just concreteness? PASS — check 4 mandates the dry-run, fail-closed, Critical-on-unrunnable, worded like check 6 (T-2 review confirmed). |
| AC-4 | reviewer-checked | Does the dry-run respect vacuous-green (target paths absent → skip) and distinguish an unrunnable command from a vacuous skip and from a genuinely-red suite, while keeping sdlc-check read-only? PASS — the vacuous-green carve-out + the unrunnable-vs-red distinction are stated; no sdlc-check execution proposed (design D1); T-2 review confirmed the checker stays read-only. |
| AC-5 | reviewer-checked | No regression to the existing pipeline? PASS — the additions don't contradict the loop / check 6 / the concreteness clause (both per-task reviews confirmed no regression); the full checker suite stays 143 green and `sdlc-check` on this spec + `--require ledger` both exit 0. |
