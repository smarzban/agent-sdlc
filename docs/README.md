# Agent SDLC — documentation

Agent SDLC is a full-SDLC pipeline for AI coding agents — from an idea to a reviewed pull
request — packaged as a plugin for Claude Code and Cursor. This tree is the user- and
contributor-facing documentation; the skills themselves (in [`../skills/`](../skills/)) are the
authoritative method.

## Who starts where

- **You want to try it** → [Quickstart](quickstart.md) — install + first run in two commands.
- **You're installing or updating** → [Install](install.md) — Claude Code, Cursor, other agents,
  and how updates actually reach you.
- **You're using the pipeline** → [Usage](#usage) below — one page per capability.
- **You're contributing** → [Development](development.md) + the root
  [CONTRIBUTING.md](../CONTRIBUTING.md).
- **You want the repo's shape** → [Architecture](architecture.md) — one light page.

## Usage

| Page | Covers |
| --- | --- |
| [The pipeline](usage/pipeline.md) | The stage chain `idea -> … -> gate -> build -> ship`, who owns each stage, and the spec artifacts a run produces. |
| [Start anywhere](usage/start-anywhere.md) | Entering the pipeline at any stage, from any source — a prompt, a doc, a Linear issue set, a repo artifact. |
| [The light tier](usage/light-tier.md) | The compressed authoring pass for small, self-contained changes — same gate, build, and checker. |
| [sdlc-check](usage/sdlc-check.md) | The enforcement-spine checker as a standalone tool: invocation, rules, exit codes. |
| [Linear sync](usage/linear-sync.md) | The optional engine that mirrors each stage into Linear. Off by default. |
| [Documentation skills](usage/documentation-skills.md) | `writing-readmes`, `writing-repo-docs`, `writing-technical-docs` — three standalone skills outside the pipeline. |

## Everything else

- [README](../README.md) — the front door.
- [Development](development.md) — clone → run the checker tests → author a skill → release.
- [Architecture](architecture.md) — the repo's shape in one page.
- [`docs/specs/`](specs/) — this repo's own pipeline output: agent-sdlc builds itself through the
  pipeline it implements, and the spec chains are committed as evidence.
- License: [Apache-2.0](../LICENSE).
