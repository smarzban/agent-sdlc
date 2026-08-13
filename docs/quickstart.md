# Quickstart

The shortest path from nothing to a running pipeline. Full options (Cursor, other agents,
updates) are in [Install](install.md).

## 1. Install (Claude Code)

```text
/plugin marketplace add smarzban/agent-sdlc
/plugin install agent-sdlc
```

## 2. Run it

In the repo you want to build in, just state what you want:

> I want to add a feature: …

The skills auto-activate on matching requests. **Light is the default:** a small change goes
`light -> gate -> build -> ship`. The full chain (`idea` through `plan`, then gate, build, ship)
runs only when you ask for it or a trigger fires (new runtime dependency, new public API, new
trust or process boundary). You decide at every question; the agent recommends first.

Unsure where you are? Ask for the router explicitly:

```text
/agent-sdlc:getting-started
```

It picks the right entry stage — including the [light tier](usage/light-tier.md) for a small fix,
or a mid-chain start when you already have criteria or a plan (see
[start anywhere](usage/start-anywhere.md)).

## 3. What you get

A run leaves a committed spec chain in your repo and ends in a reviewed PR:

```
docs/specs/<feature>/
├── <feature>.md            ← Brief · AC · Plan (light); plus Design · Tech Stack on the full chain
├── gate-report.md          ← the pre-build readiness verdict
├── build-report.md         ← build's resumable task ledger
└── verification-report.md  ← ship's AC -> proof map
```

Next: [the pipeline in full](usage/pipeline.md).
