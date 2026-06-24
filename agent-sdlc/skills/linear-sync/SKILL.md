---
name: linear-sync
description: "Optional layer that mirrors each Agent SDLC stage's output into Linear — initiative (product) -> project (feature) -> milestone (build phase) -> issue (task) — idempotently. Invoked by each pipeline stage at its hand-off when Linear sync is enabled in .agent-sdlc/config.json. Use when mirroring Agent SDLC specs to Linear, creating/updating a feature's Linear project, or performing a stage's Linear action. Skips silently when disabled or the Linear MCP is absent."
---

# Linear sync: mirror Agent SDLC into Linear

Optional engine that mirrors the Agent SDLC pipeline into Linear as you move through the stages. It
is **not** a pipeline stage and **not** on the `criterion -> component -> product -> task` spine —
each stage calls it at its hand-off. All the mechanics (config, the stage->entity mapping, ID
persistence, idempotency, and the Linear API gotchas) live here, stated once, so the stage skills
stay focused on the methodology.

Uses the `plugin:linear` MCP (tools namespaced `mcp__plugin_linear_linear__*`; load them with
ToolSearch when deferred, e.g. `select:mcp__plugin_linear_linear__save_project`).

## Guards — check BOTH first, every time

If either fails, skip all Linear work and say so in one line. **Never fail or block the pipeline
because Linear is unavailable.**

1. **Enabled?** `.agent-sdlc/config.json` has `linear.enabled: true`. If absent or false, skip.
2. **MCP available?** The `mcp__plugin_linear_linear__*` tools resolve (they will not in a
   headless/cron run). If not, skip.

## Config — `.agent-sdlc/config.json`

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

Enable/disable is just flipping `linear.enabled`. Nothing else in Agent SDLC changes.

## Hierarchy (summary; full mapping in [reference/mapping.md](reference/mapping.md))

- **Initiative = the product** — one, resolved by name (or created) via `save_initiative`. It
  carries the project-tier artifacts directly: `## Overview` as its `description` + `summary`, and
  `## Architecture` / `## Tech Stack` as documents attached to it (`save_document` with an
  `initiative` parent).
- **Project = a Agent SDLC feature.** Milestones and issues hang under it.
- **Milestone = a build phase**; **Issue = a task (`T-N`)**.
- **Version = a label** `version:v1` (point releases `version:v1.2`); labels are `type:*` + `area:*`.

## Idempotency — mandatory; re-running a stage must never duplicate

Before any create, in order:

1. Read the IDs file (`linear.idsFile`). If it already has the entity's id, `save_*` BY id (update).
2. Otherwise `list_*` / `get_*` by name to find an existing entity; if found, update by id; else create.
3. Persist every new id back to the IDs file immediately.
4. For initiative links, VERIFY with `get_project` — a `save_project` response alone can silently
   fail to link (returns `initiatives: []`).

The `linear-ids.json` shape is in [reference/mapping.md](reference/mapping.md).

## Gotchas — bake every one in

1. **Never HTML-escape.** Send literal `&`, `<`, quotes, and real newlines — not `&amp;` or a
   backslash-n. The MCP stores exactly what you send; escaped text shows up literally.
2. **Resolve the initiative, don't guess.** `list_initiatives` / `get_initiative` find it by name,
   and `save_initiative` creates or updates it (pass `id` to update) — the MCP fully supports
   initiatives. When LINKING a feature-project to it, pass the resolved id and VERIFY with
   `get_project`: a `save_project` link by name can silently no-op (returns `initiatives: []`).
3. **No delete tools exist.** Never design a flow that needs to delete a project or milestone;
   prefer list/get-then-update, and don't over-create.
4. **Idempotency is mandatory** (procedure above).
5. **`save_issue`:** `team` + `title` required on CREATE; `state` is a status NAME
   ("Backlog"/"Todo"/"In Progress"/"In Review"/"Done"); `milestone`/`project` by id; `labels` by
   NAME (the label must already exist — create it first with `create_issue_label`);
   `links:[{url,title}]` attaches PRs. On UPDATE pass `id`, NOT `team`.
6. **`save_document`:** `title` + exactly ONE parent (`project`).
7. **Graceful absence:** if disabled or the MCP is missing, skip with a notice; never fail the run.

## What each stage does

At its hand-off, each pipeline stage performs its Linear action AFTER writing its `##` section — the
document content IS that section. The full stage -> Linear action table (`idea`,
`acceptance-criteria`, `architecture-design`, `techstack`, `plan`, `gate`) is in
[reference/mapping.md](reference/mapping.md). Build-stage issue transitions are deferred to the
future build-process skills.
