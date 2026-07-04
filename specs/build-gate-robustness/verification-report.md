# Verification report — build-gate-robustness

Terminal AC → proof map (ship stage). This feature is a prose change to two pipeline skills, so every
AC is **reviewer-checked** (conformance re-read, mirroring enforcement-spine's T-10/11/12 skill-wiring
verification) — there are no test-backed rows and no name-appearance (AC-14) linkage. Each row records
the answered conformance question and its per-task reviewer verdict.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | reviewer-checked | Does the build skill pin the agent-type roster at build start, announcing any substitution once up front and recording it in the ledger (not per-dispatch)? PASS — build/SKILL.md step 2 mandates start-of-build roster resolution + one-time announced substitution + ledger record; the T-1 conformance reviewer confirmed placement and wording. |
| AC-2 | reviewer-checked | Is the subagent-death policy a deterministic sequence (capture partial → retry once fresh → conductor-takeover), with the deviation recorded and the retry bounded? PASS — reference/subagent-loop.md states the 4-step policy with "one retry, not a loop" and enumerated ledger recording; a taken-over task still clears review + green bar + isolation (T-1 review confirmed). |
| AC-3 | reviewer-checked | Does the BUILD BASELINE execute each declared green-bar command and distinguish an unrunnable command (STOP + route to techstack with the actual output) from a genuinely-red repo from vacuous-green? PASS — build/SKILL.md step 2 classifies each result at the stop level; an unrunnable command is a techstack declaration defect routed there, distinct from a red-code stop and a vacuous skip, with matching Rationalization + Red-flag. (Review-gate R1 pivot: gate execution reverted; runnability moved to the build baseline after 2 HIGH security findings.) |
| AC-4 | reviewer-checked | Does execution stay isolated at the build baseline while the gate and `sdlc-check` remain read-only, with vacuous-green respected? PASS — gate/SKILL.md check 4 reverted to concreteness-only + a note that runnability is verified at the build baseline; the gate's read-only HARD-GATE/Principles/Conventions are intact and it executes NO declared command; `sdlc-check` untouched; vacuous-green preserved. |
| AC-5 | reviewer-checked | No regression to the existing pipeline? PASS — the additions don't contradict the loop / check 6 / the concreteness clause (both per-task reviews confirmed no regression); the full checker suite stays 143 green and `sdlc-check` on this spec + `--require ledger` both exit 0. |
