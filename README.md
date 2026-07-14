# Agent SDLC

A pipeline for AI coding agents that takes an idea to a reviewed pull request. The front half
settles intent, a checkable contract, a sound architecture, a grounded stack, and an atomic task
plan, with a read-only gate that confirms it all hangs together before a line of code is written.
The back half executes it: `build` runs the plan test-first — one fresh subagent per task, green
between each — and `ship` opens the reviewed PR.

Test and deploy are the next stages downstream, extending the same chain.

- **You own the thinking; the agent owns the breakdown** — every stage leads with a
  recommendation and alternatives, and you decide.
- **A traceability spine** (`criterion -> component -> product -> task`) runs the whole pipeline;
  a read-only gate walks it before any code exists.
- **Test-first, subagent-driven build** — one fresh implementer per task, one atomic green commit
  per task, resumable from a committed ledger.
- **A deterministic checker** ([`sdlc-check`](docs/usage/sdlc-check.md), zero-dep Node) enforces
  the mechanically-decidable promises — coverage, trace integrity, ledger↔git, proof maps —
  fail-closed.
- **Start anywhere** — enter at any stage, from any source (a prompt, a doc, a Linear issue set),
  without weakening a single gate; a **light tier** compresses authoring for small fixes.
- **Four standalone skills** — three documentation skills (`writing-readmes`, `writing-repo-docs`,
  `writing-technical-docs`) for documenting what you build, plus `repo-setup` for scaffolding it —
  usable on any repo.

Packaged as a plugin for [Claude Code](https://claude.com/claude-code),
[Cursor](https://cursor.com), and [OpenAI Codex](https://developers.openai.com/codex) (**this repo
is its own single-plugin marketplace**, `agent-sdlc`), and installable as a package on
[pi](https://pi.dev). The skills are plain Markdown to the open `SKILL.md` standard, portable to any
agent that reads instruction files.

> **Pairs with [Empanel](https://github.com/smarzban/empanel)** — a multi-model code-review gate
> + whole-repo audit. `ship` hands the open PR to its gate skill (`/empanel:gate`) when installed,
> and degrades to a portable reviewer subagent when it isn't. Empanel ships as its own plugin
> marketplace plus the [`@empanel/cli`](https://www.npmjs.com/package/@empanel/cli) npm package.

**Contents:** [Quickstart](#quickstart) · [The idea](#the-idea) · [Stages](#stages) ·
[Standalone skills](#standalone-skills) · [Install](#install) · [Layout](#layout) ·
[Documentation](#documentation) · [Contributing](#contributing) · [License](#license)

## Quickstart

```text
/plugin marketplace add smarzban/agent-sdlc
/plugin install agent-sdlc
```

Then, in the repo you want to build in, state what you want — *"I want to add a feature: …"* —
and the pipeline picks it up at `idea`, or ask `/agent-sdlc:getting-started` to route you.
A run leaves a committed spec chain in `docs/specs/<feature>/` and ends in a reviewed PR.
Full walkthrough: [docs/quickstart.md](docs/quickstart.md).

## The idea

You own the thinking. The agent owns the breakdown. Every stage leads with a recommendation and
the alternatives, and you decide. A single traceability spine runs through the whole pipeline:

```
criterion -> component -> product -> task
```

Each stage adds one link; the gate walks the whole chain, so anything unmapped surfaces before
code rather than during it.

## Stages

| Skill | Invoke explicitly | Owner | Output |
| --- | --- | --- | --- |
| `idea` | `/agent-sdlc:idea` | you | `## Brief` (problem + scope) |
| `acceptance-criteria` | `/agent-sdlc:acceptance-criteria` | you review | `## Acceptance Criteria` (the contract) |
| `architecture-design` | `/agent-sdlc:architecture-design` | you, agent proposes | `## Design` (`## Architecture` at project level) |
| `techstack` | `/agent-sdlc:techstack` | you, agent proposes | `## Tech Stack` |
| `plan` | `/agent-sdlc:plan` | agent | `## Plan` (atomic tasks) |
| `gate` | `/agent-sdlc:gate` | automated (read-only) | `gate-report.md` |
| `build` | `/agent-sdlc:build` | agent | product code (a green branch) + `build-report.md` |
| `ship` | `/agent-sdlc:ship` | agent | a reviewed PR (hands it to the Empanel gate) |
| `getting-started` | auto / `/agent-sdlc:getting-started` | router | this is the entry point |

Start with `getting-started`; it routes you to the right stage and states the shared rules.

**Start anywhere.** Run the whole chain, or invoke any stage on its own — each resolves its input
from whatever you give it (the spec, a prompt, a doc, a Linear issue set, a repo artifact),
materializes it into the spec with a provenance marker, then runs. A plan already in Linear? `build`
ingests it, runs the `gate` inline, and builds — you don't have to hand-run the front half first. The
gate, the per-task TDD loop, and traceability are never skipped; a missing upstream link is marked
*untraced* and surfaced, never invented. Details: [docs/usage/start-anywhere.md](docs/usage/start-anywhere.md).
For a small self-contained fix, the **light tier** folds brief + criteria + plan into one short
pass — same gate, build, and checker: [docs/usage/light-tier.md](docs/usage/light-tier.md).

> **Invocation.** Installed as a plugin, every skill auto-activates when your request matches its
> `description` — that's the primary path, and you rarely type a command. To invoke one explicitly,
> use the **mandatory** plugin namespace, e.g. `/agent-sdlc:idea`. Bare names like `/idea` resolve
> only to *personal* skills (`~/.claude/skills/`), never to plugin skills — the `agent-sdlc:` prefix
> can't be dropped. Want shorter explicit names (e.g. `/agent-sdlc:criteria`)? Add a
> `commands/<name>.md` file to the plugin; it's still namespaced as `/agent-sdlc:<name>`.

## Standalone skills

Four skills outside the pipeline: three for documenting a codebase, plus `repo-setup` for the
operational machinery. The three documentation skills are source-grounded (every
concrete claim is checked against the actual code) and adapt their structure to the repo's type.
They split by depth: the front door, the essentials, the internals. A fourth standalone skill,
`repo-setup`, sits alongside them — not a documentation skill but its machinery counterpart: it
stubs a repo's operational baseline (the agent-instruction split, CI/templates/CODEOWNERS
scaffolding) for these three to later fill with prose.

| Skill | What it does |
| --- | --- |
| `writing-readmes` | Write/overhaul a project's front-door `README.md` — leads with what/why, keeps a lean quickstart distinct from full install, links out to deeper docs instead of inlining them. |
| `writing-repo-docs` | The essentials a repo needs to be usable and contributable — landing index + quickstart + install + comprehensive per-feature usage + running-it-locally + contributing/community-health files, plus at most a light architecture overview. |
| `writing-technical-docs` | Full maintainer-grade internals — architecture with design rationale, data models, per-subsystem pages with invariants, the security model, and a complete module/API reference under a coverage-ledger contract (every exported symbol documented or explicitly excluded). |
| `repo-setup` | Take a repo — empty or existing — to an operational baseline: the public/private agent-instruction split, gitignore/CI/templates/CODEOWNERS scaffolding, and opt-in pipeline setup. Machinery and marked skeletons, not prose. |

How they chain and when to pick which: [docs/usage/documentation-skills.md](docs/usage/documentation-skills.md).

## Install

```text
/plugin marketplace add smarzban/agent-sdlc
/plugin install agent-sdlc
```

Skills then trigger on their `description`, or invoke explicitly with the plugin namespace, e.g.
`/agent-sdlc:idea` or `/agent-sdlc:writing-readmes`.

**OpenAI Codex:**

```text
codex plugin marketplace add smarzban/agent-sdlc
codex plugin add agent-sdlc@agent-sdlc
```

**pi:**

```text
pi install git:github.com/smarzban/agent-sdlc
```

**Cursor** imports the repo URL as a team marketplace. The skills are plain Markdown to the open
`SKILL.md` standard, portable to any agent that reads instruction files. The per-harness
walkthroughs, updating, and requirements are all in [docs/install.md](docs/install.md).

## Layout

```
agent-sdlc/                          ← repo root = the plugin AND its marketplace
├── .claude-plugin/                  ← marketplace.json + plugin.json (Claude Code)
├── .cursor-plugin/                  ← marketplace.json + plugin.json (Cursor)
├── .codex-plugin/plugin.json        ← plugin manifest (OpenAI Codex)
├── .agents/plugins/marketplace.json ← Codex marketplace manifest
├── package.json                     ← pi package manifest (pi.skills)
├── bin/sdlc-check                   ← on-PATH launcher for the checker
├── checker/sdlc-check.mjs           ← the enforcement-spine checker (zero-dep Node, + tests)
├── skills/
│   ├── idea/SKILL.md
│   ├── acceptance-criteria/SKILL.md
│   ├── architecture-design/SKILL.md
│   ├── techstack/                   ← SKILL.md + reference/probing.md
│   ├── plan/SKILL.md
│   ├── gate/SKILL.md
│   ├── build/                       ← SKILL.md + reference/ (subagent-loop · tdd · source-driven · simplicity · debugging · plan-amendments · ingesting-plans)
│   ├── ship/                        ← SKILL.md + reference/finishing.md
│   ├── getting-started/             ← SKILL.md + reference/ (input-resolution · light-tier)
│   ├── linear-sync/                 ← SKILL.md + reference/mapping.md (optional engine)
│   ├── writing-readmes/             ← documentation skill (front door) + reference/
│   ├── writing-repo-docs/           ← documentation skill (repo essentials) + reference/
│   ├── writing-technical-docs/      ← documentation skill (full internals) + reference/
│   └── repo-setup/                  ← standalone: repo scaffolding + machinery, not prose + reference/
└── docs/                            ← user + contributor documentation (see below)
    └── specs/                       ← this repo's own dogfood spec tree
```

A run produces, per feature:

```
docs/specs/<feature>/
├── <feature>.md            ← ## Brief · ## Acceptance Criteria · ## Design · ## Tech Stack · ## Plan
├── gate-report.md          ← gate output (read-only)
├── build-report.md         ← build output (the resumable task ledger)
└── verification-report.md  ← ship's AC → proof map (checker-verified pre-PR)
```

plus, at project level, `docs/specs/overview.md` (`## Overview` · `## Architecture` · `## Tech Stack`)
and `docs/specs/adr/` for decision records, and root-level `constitution.md` + `CONTEXT.md` (glossary).
(A repo that already has a spec tree at root `specs/` keeps using it — the back-compat rule in the
getting-started skill; new spec trees are created at `docs/specs/`.)
`build` then lands the code on a feature branch and `ship` opens the reviewed PR — neither edits the
spec.

## Linear sync (optional)

Agent SDLC can mirror each stage into [Linear](https://linear.app) as you go — initiative (product)
→ project (feature) → milestone (build phase) → issue (task) — and advance the `T-N` issues as you
build and ship. **Off by default**; enabled via `.agent-sdlc/config.json`, and skipped cleanly when
the Linear MCP isn't connected. Setup + mapping: [docs/usage/linear-sync.md](docs/usage/linear-sync.md).

## Documentation

- **Use it** → [docs/quickstart.md](docs/quickstart.md), the [five-minute example run](docs/example-run.md), then [docs/usage/](docs/README.md#usage)
  — one page per capability (the pipeline, start-anywhere, the light tier, `sdlc-check`,
  Linear sync, the documentation skills — plus `repo-setup`, documented in its own SKILL.md).
- **Install / update it** → [docs/install.md](docs/install.md) — Claude Code, Cursor, any other
  agent.
- **Contribute to it** → [docs/development.md](docs/development.md) +
  [CONTRIBUTING.md](CONTRIBUTING.md).
- **Understand the repo** → [docs/architecture.md](docs/architecture.md); `docs/specs/` is the repo
  building itself through its own pipeline.

## Contributing

Zero-dependency by design: the skills are Markdown, and the only executable is the checker
(Node ≥ 22, `node --test checker/*.test.mjs`). Skills are auto-discovered from `skills/<name>/SKILL.md`
— a new skill needs no manifest edit. Branch → PR, Conventional Commits, fast-forward merges (the
checker depends on preserved SHAs). Full conventions: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache-2.0](LICENSE).
