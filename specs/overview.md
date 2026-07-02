# smarzban-skills — project overview

## Overview

This repo is a dual-tool plugin marketplace (`smarzban-skills`) holding the **agent-sdlc** SDLC
pipeline plugin and the **review-gate** review/audit plugin. This `specs/` tree applies agent-sdlc
to its own repo: features of the plugins themselves are shaped, gated, and built through the
pipeline they implement.

### Features

- **enforcement-spine** — a deterministic pipeline checker (`sdlc-check`) + terminal AC
  verification at ship, so agent-sdlc's mechanical guarantees are verified by code rather than
  asserted by the executing agent. (in progress)

## Architecture

The marketplace's shape, as it exists (seeded at the first feature-level design):

- **Two plugins, one repo.** `agent-sdlc` — an SDLC pipeline expressed as instruction documents
  (Markdown skills + reference files), dual-tool; `review-gate` — a review gate whose verdict is
  owned by a deterministic spine (committed, runnable form; no install-time build), Claude-only.
- **The committed-artifact pattern.** Anything executable ships committed and runnable as-is
  (review-gate's `dist/` + `bin/`); nothing in the repo requires an install-time build step.
  New executable components follow this pattern.
- **The instruction/enforcement split.** Skills are untrusted-in-principle instructions executed
  by an agent; guarantees that must hold mechanically are owned by trusted committed code
  (review-gate's spine for review verdicts; the `enforcement-spine` feature extends the same
  trust model to agent-sdlc's pipeline mechanics).
- **Cross-plugin contracts are invoke-if-present.** A skill invoking another plugin's capability
  (ship → review-gate) detects availability, invokes when present, and announces a loud degraded
  fallback when absent — never a silent skip.
- **Spec chains live in `specs/`** per the consolidated artifact model (one sectioned spec per
  feature; process reports beside the spec, never inside it).
