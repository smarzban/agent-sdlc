---
name: using-coderight
description: "Entry point and operating rules for CodeRight, the pipeline that takes an idea to build-ready. Use at the start of any project or feature to pick the right stage, understand the hand-offs, and follow the shared rules every stage obeys. Triggers: 'where do I start', 'what stage am I in', starting a new project or feature, 'use coderight', or deciding which CodeRight skill applies. Read this first; it routes to the others."
---

# Using CodeRight: idea to build-ready

CodeRight is a front-half methodology: take an idea to the point where an agent can build it
autonomously and well. It is five stages plus two cross-cutting pieces. You own the thinking
(intent, scope, criteria, shape, stack); the agent owns the breakdown (plan); a read-only gate
confirms it all hangs together before any code is written. (Build, test, and deploy are later
additions to the same chain.)

## The stages

| # | Skill | Invoke | Owner | Reads | Writes (a section of the tier file) |
| --- | --- | --- | --- | --- | --- |
| 1 | `idea` | `/coderight:idea` | you | the idea | `## Brief` (feature) — or `## Overview` + feature list (project) |
| 2 | `acceptance-criteria` | `/coderight:acceptance-criteria` | you review | `## Brief` | `## Acceptance Criteria` — the contract (`AC-N`) |
| 3 | `architecture-design` | `/coderight:architecture-design` | you (agent proposes) | `## Brief`, `## Acceptance Criteria` | `## Design` (`C-N`) — feature; `## Architecture` — project |
| 4 | `techstack` | `/coderight:techstack` | you (agent proposes) | `## Design`, `## Acceptance Criteria` | `## Tech Stack` (products per kind) |
| 5 | `plan` | `/coderight:plan` | agent | `## Acceptance Criteria`, `## Design`, `## Tech Stack` | `## Plan` — atomic tasks (`T-N`) |

Feature-tier sections live in `specs/<feature>/<feature>.md`; project-tier sections (`## Overview`,
`## Architecture`, `## Tech Stack`) live in `specs/overview.md`. Each stage owns and edits only its
own section.

Cross-cutting: **`constitution.md`** (standing guardrails, seeded by `idea`, checked at design and
plan) and the **`gate`** (`/coderight:gate`; read-only; walks the chain and writes
`gate-report.md` before build).

The flow: `idea -> acceptance-criteria -> architecture-design -> techstack -> plan -> gate -> build`.

## Shared operating rules (every stage obeys these)

Stated once here; the stage skills reference them by name rather than restating.

- **Recommend, don't just ask.** Every stage leads with the agent's recommended answer and the
  alternatives it considered with tradeoffs. You decide. This holds at every question in every
  stage.
- **One question at a time.** Multiple-choice where possible. Walk the decision tree, do not dump.
- **Code over questions.** If the repo answers it, go read it instead of asking.
- **Loop, don't force.** When a stage exposes that an earlier one was not actually settled, go
  back and re-settle, then continue. A fuzzy input is never patched over.
- **Traceability is the spine.** criterion -> component -> product -> task. Each stage adds one
  link; the gate walks the whole chain. Anything unmapped surfaces before code.
- **YAGNI throughout.** Build only what the criteria need, at every stage: no aspirational
  criteria, no speculative components, no needless dependencies, no gold-plated tasks.
- **Stay in your stage.** Tech-agnostic until design; product-free until techstack; no code until
  build. Each stage names the next thing down, not all of them.
- **Ground in live docs over memory**, most of all at techstack: verify current versions and APIs
  against official documentation, and record what you checked and when.

## Routing: project vs feature

Decide the level the way `idea` does, and carry it through.

- **Project** (clean repo, building a whole app): `idea` writes `specs/overview.md` `## Overview`
  (incl. the feature list) and seeds `constitution.md` and `CONTEXT.md`. `architecture-design`
  writes the north-star `## Architecture`, and `techstack` the cross-cutting `## Tech Stack`, both
  in `overview.md`. Each feature then runs the full chain in its own `specs/<feature>/<feature>.md`.
- **Feature** (existing project, adding a piece): run the chain in `specs/<feature>/<feature>.md`,
  fitting the existing `overview.md` architecture and stack, justifying any deviation with an ADR
  in `specs/adr/`.

## File layout

```
/
├── constitution.md          ← standing principles (project-wide)
├── CONTEXT.md               ← glossary (project-wide)
└── specs/
    ├── overview.md          ← project tier: ## Overview · ## Architecture · ## Tech Stack
    ├── adr/                 ← decision records
    │   └── ADR-NNNN-<slug>.md
    └── <feature>/
        ├── <feature>.md     ← feature tier: ## Brief · ## Acceptance Criteria · ## Design · ## Tech Stack · ## Plan
        └── gate-report.md   ← gate output (read-only)
```

## Where to start

- A new app, vague idea: start at **`idea`**, project level.
- A new feature on an existing app: start at **`idea`**, feature level (often a light pass).
- You already have a settled problem and scope: start at **`acceptance-criteria`**.
- You have approved criteria: **`architecture-design`**, then **`techstack`**, then **`plan`**.
- A `## Plan` section exists in `<feature>.md`: run **`gate`**, then build.

If you are unsure which stage you are in, you are probably one stage earlier than you think. The
cheapest fix is always upstream.
