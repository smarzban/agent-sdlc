# Linear sync (optional)

An optional engine that mirrors the pipeline into [Linear](https://linear.app) as you move through
the stages — it is not a pipeline stage and not on the traceability spine. Each stage calls it at
its hand-off; the mechanics live in [`skills/linear-sync/SKILL.md`](../../skills/linear-sync/SKILL.md).

## The mapping

```
initiative (product) -> project (feature) -> milestone (build phase) -> issue (task)
```

`plan` creates the milestones and the `T-N` issues; `build` and `ship` only transition them
(issue states Backlog → In Progress → In Review → Done — the project itself stays In Progress) and
attach the PR. Sync is idempotent — re-running a
stage updates rather than duplicates.

## Enabling it

Off by default. Two guards, both required:

1. `.agent-sdlc/config.json` in your repo, with `linear.enabled: true`:

   ```json
   {
     "linear": {
       "enabled": false,
       "initiative": "<exact initiative name or UUID>",
       "team": "<team name or id>",
       "idsFile": ".agent-sdlc/linear-ids.json"
     }
   }
   ```

2. The Linear MCP connected (tools namespaced `mcp__plugin_linear_linear__*`).

If either guard fails, every Linear step is skipped with a one-line note — a run never fails or
blocks because Linear is unavailable, and headless runs work unchanged.

## Reverse direction

Linear is also a first-class **input**: a plan living in Linear can drive `build` directly — see
[start anywhere](start-anywhere.md) and the reverse (Linear → spec) mapping in
[`skills/linear-sync/SKILL.md`](../../skills/linear-sync/SKILL.md). The per-stage entity mapping
lives in [`skills/linear-sync/reference/mapping.md`](../../skills/linear-sync/reference/mapping.md).
