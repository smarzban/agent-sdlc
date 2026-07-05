# harness-captured-evidence — conductor-run green-bar output, not subagent self-report (SMA-463)

## Brief

<!-- source: Linear SMA-463 · ingested 2026-07-05 -->

PR-C of the 0.10.0 stack. The per-task green-bar evidence in `build-report.md` is, in practice,
**conductor-transcribed subagent self-report**: the conductor types the subagent's reported `Tests N
passed` summary into the ledger. Two holes, observed across all four M5-batch pipeline runs:

1. **Trust-the-subagent** — a subagent could report a false count; truth was only caught because the
   conductor separately re-ran the full suite at build-complete.
2. **Summary lines, never per-test names** — the build skill has mandated per-test `ok - <name>` capture
   since 0.7.0, but transcription-based capture degrades to summaries in practice. Consequence: AC-14's
   name-appearance linkage passed only by accident (proof maps cited oracle-kinds, so nothing needed
   matching); had any AC cited a real test name, summary-only evidence would have failed the checker.

This is the enforcement-spine philosophy applied to its own weakest link: the skill *exhorts* per-test
capture; nothing *mechanizes* it. The fix is a build-discipline sharpening — the **conductor runs the
declared green-bar command itself** after accepting each task (it already does at build-complete) and
pipes the **actual per-test output** into the ledger; evidence becomes harness-captured fact, not
transcription. Bounded (tail/cap) for big suites.

It is deliberately **not** a checker change: the checker reads plain text and cannot distinguish captured
from transcribed output (they are byte-identical) — so this is unmechanizable and stays a build discipline.

## Acceptance Criteria

<!-- source: Linear SMA-463 · ingested 2026-07-05 -->

- **AC-1** — The build SKILL states, at the per-task green-bar step, that the **conductor runs the declared
  green-bar command itself** after accepting each task and captures its **actual output** into the ledger's
  evidence block (harness-captured fact) — explicitly **not** transcribing the subagent's reported
  summary/count. *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: does the build SKILL
  per-task step mandate a conductor-run command whose actual output is captured, and forbid transcribing the
  subagent's report? Justification: prose presence, not automatable.)*
- **AC-2** — The captured evidence is the **per-test listing** (e.g. `node --test`'s `ok N - <name>` lines),
  not summary counts, and a **bounded tail/cap** policy is stated for large suites (retain the per-test names
  the proof map depends on while bounding ledger size). *(Verification type: **reviewer-checked** — axis:
  Spec Conformance. Q: does the SKILL require per-test names + state a tail/cap bound? Justification: prose
  presence, not automatable.)*
- **AC-3** — The two named holes are closed as discipline: **(i)** trust-the-subagent — the recorded count
  is harness-observed, so a false subagent count cannot enter the ledger; **(ii)** summary-only degradation —
  per-test capture is mandated. The SKILL carries a matching **rationalization row** (transcribe the
  subagent's count → rebuttal) and a **red flag** (a transcribed summary presented as evidence).
  *(Verification type: **reviewer-checked** — axis: Spec Conformance. Q: are both holes named + closed, with
  a rationalization row + red flag? Justification: prose presence, not automatable.)*
- **AC-4** — `build/reference/subagent-loop.md`'s capture section is aligned: the **authoritative** green-bar
  evidence is the **conductor's own post-acceptance run's captured output**; the implementer's TDD test runs
  are the subagent's business, not the recorded evidence. *(Verification type: **reviewer-checked** — axis:
  Spec Conformance. Q: does subagent-loop.md make the conductor's run the authoritative captured evidence,
  consistent with the build SKILL? Justification: cross-file prose consistency, not automatable.)*
- **AC-5** — Regression + scope guard: the checker suite stays green (`node --test agent-sdlc/checker/*.test.mjs`)
  and `sdlc-check` exits 0 on this feature's own spec, and **no `sdlc-check.mjs` change** ships (SMA-463 is a
  build-discipline change — the checker cannot distinguish captured from transcribed text). *(Verification
  type: **reviewer-checked** — axis: Regression. Q: suite green, `sdlc-check` exit 0 on this spec,
  `agent-sdlc/checker/` untouched in the diff? Justification: run-and-read whole a reviewer confirms.)*

### Negative criteria (out of bounds)

- **NC-1** — No rule is added to `sdlc-check.mjs` to detect transcription vs capture — it is unmechanizable
  (captured and transcribed text are byte-identical); this stays a build discipline. (Reviewed at ship.)

## Design

<!-- source: derived from the Acceptance Criteria (build-skill prose only) · ingested 2026-07-05 -->

Pipeline build-skill prose only; no product code, no checker change. Changed things declared with the
structured "outside the checker" form.

### Outside the checker (changed components)

1. **build skill text** — `agent-sdlc/skills/build/SKILL.md` (the per-task green-bar step 4d/4f + a
   rationalization row + a red flag + a done-when line; AC-1, AC-2, AC-3) and
   `agent-sdlc/skills/build/reference/subagent-loop.md` (the Capture section alignment; AC-4).

### Design decisions (flagged for maintainer ratification)

- **D1 — discipline, not mechanization (NC-1).** Captured and transcribed evidence text are byte-identical,
  so the checker cannot tell them apart. SMA-463 is closed by making the *conductor's own run* the mandated
  source of the recorded text, not by a new checker rule. This dogfooded itself: this whole 0.10.0 campaign
  captured green-bar evidence by the conductor running the command and pasting the real output.

## Tech Stack

<!-- source: inherited — No new products — reuses the declared stack (green bar below) · ingested 2026-07-05 -->

**No new products — reuses the declared stack** (SMA-464 fast-path): build-skill Markdown prose, no runtime,
no dependency. Green bar for this feature:

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob) — stays green (no checker source change).
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/harness-captured-evidence/harness-captured-evidence.md` → exit 0.
- **Diff guard (AC-5/NC-1):** `agent-sdlc/checker/` unchanged in this feature's diff.

No load-bearing library claims (no library used), so no `verified-by-probe` probe is required.

## Plan

<!-- source: derived from the Acceptance Criteria + the build SKILL / subagent-loop.md · ingested 2026-07-05 -->

Two atomic tasks, build-skill prose. Per-task green bar = checker suite stays green + `sdlc-check` on this
spec exits 0; correctness of the prose is conformance-reviewed. AC-5 (regression + scope guard) is advanced
by both tasks — each keeps the suite green, the spec checker green, and `agent-sdlc/checker/` untouched.

- **T-1 — Build SKILL: conductor-run harness-captured evidence (SMA-463).** Sharpen the per-task green-bar
  step (4d/4f) in `agent-sdlc/skills/build/SKILL.md` so it is unambiguous that the **conductor runs the
  declared green-bar command itself** post-acceptance and captures the **actual output** (harness fact) into
  the ledger — never transcribes the subagent's reported summary; capture the **per-test listing** with a
  bounded tail/cap for big suites; name the two holes (trust-the-subagent, summary-only); add a
  rationalization row + a red flag + a done-when line. *Verification (prose):* re-read against AC-1, AC-2,
  AC-3. *Advances:* AC-1, AC-2, AC-3, AC-5. *Component:* build skill text. *Deps:* none.
- **T-2 — Align subagent-loop.md's capture section (SMA-463).** Update the Capture section of
  `agent-sdlc/skills/build/reference/subagent-loop.md` so the **authoritative** evidence is the conductor's
  own post-acceptance run's captured output (consistent with T-1), and the implementer's TDD test runs are
  not the recorded evidence. *Verification (prose):* re-read against AC-4. *Advances:* AC-4, AC-5.
  *Component:* build skill text. *Deps:* T-1.

### Task-to-criterion coverage map

| AC | Advanced by |
| --- | --- |
| AC-1 | T-1 |
| AC-2 | T-1 |
| AC-3 | T-1 |
| AC-4 | T-2 |
| AC-5 | T-1, T-2 |

### Notes

- T-1 before T-2 (T-2 aligns the reference doc to the sharpened SKILL body). Every AC is reviewer-checked and
  names a carrying task (the SMA-465 rule this stack pins).
