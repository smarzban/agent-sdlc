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

The skills auto-activate on matching requests — `idea` picks this one up, grills the idea into a
settled brief, and each stage hands off to the next: acceptance criteria → design → techstack →
plan → gate → build → ship. You decide at every question; the agent recommends first.

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
├── <feature>.md            ← the sectioned spec (Brief · AC · Design · Tech Stack · Plan)
├── gate-report.md          ← the pre-build readiness verdict
├── build-report.md         ← build's resumable task ledger
└── verification-report.md  ← ship's AC -> proof map
```

Next: [the pipeline in full](usage/pipeline.md).
