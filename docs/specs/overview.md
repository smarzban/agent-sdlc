# agent-sdlc — project overview

## Overview

This repo is **agent-sdlc's own repo**: a full-SDLC pipeline for AI coding agents, packaged as a
single plugin and served from the repo root as its own dual-tool marketplace (`agent-sdlc`, Claude
Code + Cursor). This `specs/` tree applies agent-sdlc to itself: features of the pipeline are
shaped, gated, and built through the pipeline they implement. Feature specs are immutable
snapshots; this overview is the living project-tier document.

The repo previously hosted a second plugin, **review-gate**, as the two-plugin marketplace
`smarzban-skills`; that gate is now the standalone **Empanel** product (`smarzban/empanel` — its
own marketplace + the `@empanel/cli` npm package) and its tree left this repo with the
single-plugin restructure.

### Features

Each `specs/<feature>/` chain below shipped through the pipeline itself (spec → gate → build →
ship → reviewed PR); see the per-feature spec and reports for scope and evidence. Shipped:
`enforcement-spine` (0.7.0, the `sdlc-check` checker + terminal AC verification) and its
hardening/adoption successors (`checker-correctness`, `checker-semantics`, `build-gate-robustness`,
`contract-visibility`, 0.8.0), `evidence-gated-techstack`, `plan-ac-contracts`,
`harness-captured-evidence`, `adoption-quickwins` (0.10.0), and `diagnosability-pool` (0.10.1).

## Architecture

The repo's shape, as it exists:

- **One plugin, one repo, self-hosted marketplace.** The pipeline is expressed as instruction
  documents (Markdown skills + reference files) at `skills/`; both harness manifests
  (`.claude-plugin/`, `.cursor-plugin/`) list the plugin at the repo root.
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
- **Spec chains live in `specs/`** per the consolidated artifact model (one sectioned spec per
  feature; process reports beside the spec, never inside it).

## Tech Stack

Cross-cutting reality:

- **agent-sdlc** — Markdown skills (no runtime). Executable additions are zero-dependency,
  committed, bare-`node` ESM (floor ≥ 22, checked 2026-07-02); tests via stdlib `node:test`.
  **Green bar:** `node --check checker/sdlc-check.mjs` + `node --test checker/*.test.mjs`.
- **The Empanel gate** (external) — consumed as a product via `/empanel:gate` + `@empanel/cli`;
  its stack is its own repo's concern.
