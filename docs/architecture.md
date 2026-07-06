# Architecture

The repo's shape in one page. The living project-tier record — kept current by the pipeline
itself — is [`specs/overview.md`](../specs/overview.md); this page maps the territory.

## The map

```
agent-sdlc/                          ← repo root = the plugin AND its marketplace
├── .claude-plugin/                  ← marketplace.json + plugin.json (Claude Code)
├── .cursor-plugin/                  ← marketplace.json + plugin.json (Cursor)
├── skills/<name>/SKILL.md           ← the pipeline + doc skills (13), some with reference/ depth
├── checker/sdlc-check.mjs           ← the enforcement spine (zero-dep Node ESM) + its test suites
├── bin/sdlc-check                   ← on-PATH launcher resolving the checker from anywhere
└── specs/                           ← the repo's own dogfood spec chains + living overview.md
```

## The load-bearing ideas

- **Instruction / enforcement split.** Skills are instructions an agent executes — powerful but
  unenforceable on their own. Guarantees that must hold mechanically are owned by trusted
  committed code: [`sdlc-check`](usage/sdlc-check.md) for pipeline mechanics, the external
  [Empanel](https://github.com/smarzban/empanel) spine for review verdicts.
- **The committed-artifact pattern.** Anything executable ships committed and runnable as-is —
  bare `node` on the committed source, no install-time build, no dependencies. That's what lets
  the plugin work the moment it's installed.
- **One plugin, self-hosted marketplace.** Both harness manifests list the plugin at the repo
  root; skills are auto-discovered from `skills/`, so the manifests almost never change.
- **Invoke-if-present cross-plugin contracts.** `ship` invokes the Empanel gate (`/empanel:gate`)
  when present and announces a loud degraded fallback (a dispatched reviewer subagent) when not —
  never a silent skip. The checker follows the same rule when Node is absent.
- **The spec tree is the memory.** Every feature of the pipeline shipped through the pipeline;
  `specs/` holds the immutable per-feature chains and the living overview. The artifact model is
  described in [usage/pipeline.md](usage/pipeline.md).

Deeper internals (the checker's rule semantics, parser model, ADRs) live in the source and in
[`specs/`](../specs/) — dedicated technical docs don't exist yet.
