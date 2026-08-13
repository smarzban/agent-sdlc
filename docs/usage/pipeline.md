# The pipeline

Idea to a reviewed pull request. The **front half** is five thinking stages plus a read-only gate:
you own the thinking (intent, scope, criteria, shape, stack), the agent owns the breakdown (plan),
and the gate confirms it all hangs together before any code is written. The **back half** is two
agent-driven stages — `build` executes the plan test-first, `ship` opens the PR. The invoke is
`ship`; the job is open the PR. It does not merge.

```
light -> gate -> build -> ship
idea -> acceptance-criteria -> architecture-design -> techstack -> plan -> gate -> build -> ship
```

The first line is the default for small work. The second runs only when the user asks or a
narrow trigger fires. Each stage is a skill; [`getting-started`](../../skills/getting-started/SKILL.md)
is the router that picks your entry stage and states the shared rules every stage obeys.

## The stages

| # | Skill | Owner | Writes |
| --- | --- | --- | --- |
| 0 | [`light`](../../skills/light/SKILL.md) | you review | Brief + AC + Plan (default for small work) |
| 1 | [`idea`](../../skills/idea/SKILL.md) | you | `## Brief` (feature) — or `## Overview` + feature list (project) |
| 2 | [`acceptance-criteria`](../../skills/acceptance-criteria/SKILL.md) | you review | `## Acceptance Criteria` — the contract (`AC-N`) |
| 3 | [`architecture-design`](../../skills/architecture-design/SKILL.md) | you, agent proposes | `## Design` (`C-N`) — feature; `## Architecture` — project |
| 4 | [`techstack`](../../skills/techstack/SKILL.md) | you, agent proposes | `## Tech Stack` — products per kind, probe-verified where load-bearing |
| 5 | [`plan`](../../skills/plan/SKILL.md) | agent | `## Plan` with `T-N` tasks at independently reviewable vertical slice boundaries: useful, green tasks that can be accepted and reverted independently, each naming its files and failing test |
| — | [`gate`](../../skills/gate/SKILL.md) | automated, read-only | `gate-report.md` — the ready-to-build verdict |
| 6 | [`build`](../../skills/build/SKILL.md) | agent | product code (a green branch) + `build-report.md` |
| 7 | [`ship`](../../skills/ship/SKILL.md) | agent | an open PR + `verification-report.md` (does not merge) |

## The traceability spine

```
criterion -> component -> product -> task   (AC-N -> C-N -> product -> T-N)
```

Each stage adds one link. The gate walks the whole chain and flags orphans, gaps, and unresolved
placeholders before build; [`sdlc-check`](sdlc-check.md) verifies the mechanically-decidable half
of the same promises, fail-closed. Anything unmapped surfaces before code, not during it.

## build and ship, briefly

- **`build` is a conductor.** Light specs: the conductor (or one implementer) writes each task
  test-first with **no per-task reviewer**. Full specs: one implementer plus one initial review
  of the complete task-scoped diff; one remediations pass, then stop and ask. Build verifies the
  green bar itself, commits one atomic `feat(T-N): …` commit per task, and records the run in
  `build-report.md`. Disciplines live in [`skills/build/reference/`](../../skills/build/reference/).
- **`ship`** (invoke name; the job is open the PR) verifies green → writes, checker-verifies, and
  commits the `verification-report.md` AC→proof map (all before any PR exists) → pushes → opens a
  PR synthesized from the spec → calls `review_panel` when installed, or a dispatched reviewer
  subagent when not. The owner judges the report. ship **never merges**.

## The artifact model

One sectioned spec file per feature; process reports live beside it, never inside it. Stages 1–5
each own and edit exactly one `##` section; `build` and `ship` never edit the spec.

```
/
├── constitution.md          ← standing principles, seeded by idea (project-wide)
├── CONTEXT.md               ← glossary (project-wide)
└── docs/
    └── specs/
        ├── overview.md      ← project tier: ## Overview · ## Architecture · ## Tech Stack
        ├── adr/             ← decision records (ADR-NNNN-<slug>.md)
        └── <feature>/
            ├── <feature>.md           ← ## Brief · ## Acceptance Criteria · ## Design · ## Tech Stack · ## Plan
            ├── gate-report.md         ← gate output (read-only)
            ├── build-report.md        ← build's resumable task ledger + per-task green-bar evidence
            └── verification-report.md ← ship's AC -> proof map (checker-verified pre-PR)
```

A repo that already has a spec tree at root `specs/` keeps using it — the back-compat rule in the
getting-started skill: never split a repo across both locations, never auto-migrate; new spec
trees are created at `docs/specs/`.

**Spec lifecycle:** a shipped feature spec is an immutable snapshot (`ship` stamps a status header);
`docs/specs/overview.md` is the living project-tier document, updated as the project evolves. This
repo's own [`docs/specs/`](../specs/) tree is a real example — every feature of the pipeline shipped
through the pipeline.

## Shared rules worth knowing

Stated in full in [`getting-started`](../../skills/getting-started/SKILL.md):

- **Recommend, don't just ask** — every stage leads with a recommendation + alternatives; you decide.
- **Loop, don't force** — a stage that exposes an unsettled upstream goes back and re-settles it.
- **YAGNI throughout** — no aspirational criteria, speculative components, or needless dependencies.
- **Evidence before "done"** — a suite is green only after running it and reading the output.
- **Test-first in build** — every task's failing test is written before its code.
