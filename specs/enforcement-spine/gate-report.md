# Gate report — enforcement-spine

Run 2026-07-02 against `specs/enforcement-spine/enforcement-spine.md` @ `94d1434`,
`specs/overview.md`, `CONTEXT.md`, `specs/adr/ADR-0001`. Chain entered at `idea`; no section
carries a provenance marker; no `untraced` links — full-chain entry, no mid-chain coverage note
required.

## Chain coverage table

| Criterion | Component (design) | Product (techstack) | Task(s) (plan) | Gap |
| --- | --- | --- | --- | --- |
| AC-1 | check suite (+ parser) | pure ESM / stdlib | T-4 | — |
| AC-2 | check suite | pure ESM | T-4 | — |
| AC-3 | check suite | pure ESM | T-3, T-4 | — |
| AC-4 | repo facts reader + check suite | git 2.x via `execFile` | T-6 | — |
| AC-5 | check suite + evidence contract | pure ESM | T-3, T-5 (write: T-11) | — |
| AC-6 | spec parser + check suite | stdlib | T-3, T-5 | — |
| AC-7 | check suite (auto-scoping) | — | T-9 | — |
| AC-8 | CLI shell + reporter | Node ≥ 22 + `parseArgs` | T-1, T-8 | — |
| AC-9 | reporter | stdlib | T-8 | — |
| AC-10 | spec parser + reporter | stdlib | T-1, T-2 | — |
| AC-11 | CLI shell | Node | T-9 | — |
| AC-12 | CLI shell | Node ≥ 22 | T-9 | — |
| AC-13 | check suite + report contract | pure ESM | T-3, T-7 (write: T-12) | — |
| AC-14 | check suite + ADR-0001 | pure ESM | T-7 (write: T-11, T-12) | — |
| AC-15 | gate/build/ship skill texts | prose (no product needed) | T-10, T-11 | — |
| AC-16 | gate/build/ship skill texts | prose | T-10, T-11, T-12 | — |
| AC-17 | gate/build/ship skill texts | prose | T-10, T-11 | — |
| AC-18 | ship skill text | prose | T-12 | — |
| NC-1 | CLI shell | Node | T-9 (tested) | — |
| NC-2 | CLI shell | Node | T-9 (tested) | — |
| NC-3 | plugin packaging | — | constraint on all tasks, reviewed at ship | see note |
| NC-4 | check suite | — | constraint on T-4–T-7, reviewed at ship | see note |

No orphans: all five components, every product, and all twelve tasks trace to at least one
criterion. Dependency order verified — no task depends on a later one. Every task names exact
files and a failing-test-first (or, T-10–T-12, an explicit prose verification).

## Findings

- **MEDIUM — plan — green-bar baseline is unrunnable before T-1.**
  Location: `## Plan` notes vs. the build skill's step 2 ("Run the green bar once... If the
  baseline is red, stop"). The declared green bar targets `agent-sdlc/checker/`, which does not
  exist until T-1 creates it — `node --check` on a nonexistent file and `node --test` on a
  nonexistent directory both fail, so an autonomous build would stop at its baseline check on a
  correct repo. Owner: **plan**. Next action: add a Notes line declaring the baseline
  vacuous-green while `agent-sdlc/checker/` does not yet exist, binding from T-1 onward.
- **LOW — project hygiene — no `constitution.md` exists.**
  Location: repo root. Every stage's Constitution Check (and this gate's check 3) is vacuous.
  Not a defect in this feature; noted so the vacuous pass is visible rather than silent.
  Owner: project level (outside this feature). Next action: none required for this build;
  consider seeding one when project-level principles are worth pinning.

## Notes

- **NC-3 / NC-4 have no task by design:** they demand an *absence* (no manifest/dependency/build
  step; no judgment-based rule). The plan records them as cross-task constraints and the ship
  review verifies them — recorded here so the constraint coverage is visible, not silent.
- Consistency check: terminology matches `CONTEXT.md` across all sections (`sdlc-check`,
  `verification report`, `green-bar evidence`); the file path, green bar, invocation points, and
  evidence contract agree across Brief ↔ Design ↔ Tech Stack ↔ Plan ↔ ADR-0001. No contradictions
  found.
- Verification integrity: every test-backed criterion carries an oracle kind and a task; all four
  reviewer-checked criteria carry the Spec Conformance axis with explicit pass/fail questions;
  both maps (criterion→component, task→criterion) are complete. Green bar is declared and
  concrete (subject to the MEDIUM above).
- Hygiene: no TBDs, placeholders, or decide-later markers. The two `Deferred` entries and the
  techstack caveat are explicit, owned deferrals, not placeholders.

## Verdict

**READY TO BUILD** — no Critical or High findings. One MEDIUM routed to plan (baseline note; a
one-line amendment recommended before build starts so an autonomous run does not halt), one LOW
noted at project level.
