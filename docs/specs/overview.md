# agent-sdlc — project overview

## Overview

This repo is **agent-sdlc's own repo**: a full-SDLC pipeline for AI coding agents, packaged as a
single plugin and served from the repo root as its own marketplace, across **four targets**: Claude
Code and Cursor (each a marketplace importing the plugin at the repo root), OpenAI Codex (a
marketplace under `.agents/plugins/`), and pi (a direct package install, not a marketplace). This
`docs/specs/` tree applies agent-sdlc to itself: features of the pipeline are shaped, gated, and
built through the pipeline they implement. This overview is the living project-tier document; a
feature's spec is the record of how it shipped, kept as authored and pruned when it stops earning
its place, rather than frozen (the immutable-snapshot framing was walked back in 0.13.0, and a
review gate may still correct a spec that turns out to be wrong).

The repo previously hosted a second plugin, **review-gate**, as the two-plugin marketplace
`smarzban-skills`; that gate is now the standalone **Empanel** product (`smarzban/empanel` — its
own marketplace + the `@empanel/cli` npm package) and its tree left this repo with the
single-plugin restructure.

### Features

Each `docs/specs/<feature>/` chain shipped through the pipeline itself (spec → gate → build →
ship → reviewed PR). Three exemplar runs are kept in-tree: `enforcement-spine` (0.7.0, the
`sdlc-check` checker + terminal AC verification), `adoption-quickwins` (0.10.0), and
`spec-location-under-docs` (0.12.0, the canonical spec tree moves under `docs/`). The other
shipped chains (`checker-correctness`, `checker-semantics`, `build-gate-robustness`,
`contract-visibility`, `evidence-gated-techstack`, `plan-ac-contracts`,
`harness-captured-evidence`, `diagnosability-pool`) were pruned from the working tree in 0.13.0
— their full spec chains live in git history (`git log --diff-filter=D -- docs/specs/`).

`repo-setup` shipped in 0.14.0: a standalone skill (fourth sibling of the `writing-*` set) taking
an empty or existing repo to an operational baseline of machinery and marked skeletons: the
public/private agent-instruction split (`AGENTS.md` + gitignored `AGENTS.local.md`),
gitignore/CI/templates/verify-command scaffolding, audit mode on existing repos, and opt-in
agent-sdlc pipeline adoption.

`visual-aids` shipped 2026-07-15: the front-half thinking stages gained a sanctioned way to draw
instead of talk when a question is better seen than read. One per-question heuristic (the visual
test) plus two kinds of visual aid, a committed spec diagram and a throwaway consent-gated scratch
visual, stated once in a shared reference doc that `architecture-design` (primary) and `idea`
(secondary) each hook. No interactive companion, no checker change, no runtime.

## Architecture

The repo's shape, as it exists:

- **One plugin, one repo, four install targets.** The pipeline is expressed as instruction documents
  (Markdown skills + reference files) at `skills/`, and every target reads that one tree. Three carry
  a plugin manifest whose `version` moves in lockstep (`.claude-plugin/`, `.cursor-plugin/`,
  `.codex-plugin/`) plus the root `package.json` (pi's manifest, `pi.skills` -> `./skills`) — **four
  version fields, bumped together**, since a stale version is how a harness serves a cached plugin.
  The marketplace manifests (`.claude-plugin/`, `.cursor-plugin/`, `.agents/plugins/`) carry no
  version. Claude Code and Cursor import the repo as a marketplace; Codex reads
  `.agents/plugins/marketplace.json`; pi installs the package directly and has no marketplace.
- **The committed-artifact pattern.** Anything executable ships committed and runnable as-is —
  the `checker/sdlc-check.mjs` enforcement spine plus its `bin/sdlc-check` on-PATH launcher;
  nothing in the repo requires an install-time build step. New executable components follow this
  pattern.
- **The instruction/enforcement split.** Skills are untrusted-in-principle instructions executed
  by an agent; guarantees that must hold mechanically are owned by trusted committed code (the
  enforcement spine for pipeline mechanics; the external Empanel spine for review verdicts).
- **Cross-plugin contracts are invoke-if-present.** ship invokes the external Empanel gate
  (`/empanel:gate`; legacy name `/review-gate:review-gate` accepted) when present and announces a
  loud degraded fallback (a dispatched reviewer subagent) when absent — never a silent skip.
- **Spec chains live in `docs/specs/`** per the consolidated artifact model (one sectioned spec per
  feature; process reports beside the spec, never inside it); a repo that already has a root
  `specs/` tree keeps it (the back-compat rule in getting-started).

## Tech Stack

Cross-cutting reality:

- **agent-sdlc** — Markdown skills (no runtime). Executable additions are zero-dependency,
  committed, bare-`node` ESM (floor ≥ 22, checked 2026-07-02); tests via stdlib `node:test`.
  **Green bar:** `node --check checker/sdlc-check.mjs` + `node --test checker/*.test.mjs`.
- **The Empanel gate** (external) — consumed as a product via `/empanel:gate` + `@empanel/cli`;
  its stack is its own repo's concern.
