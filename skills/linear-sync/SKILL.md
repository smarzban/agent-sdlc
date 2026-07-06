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
- **Project = an Agent SDLC feature.** Milestones and issues hang under it.
- **Milestone = a build phase**; **Issue = a task (`T-N`)**.
- **Version = a label** `version:v1` (point releases `version:v1.2`); labels are `type:*` + `area:*`. Version is **decoupled from structure** — a project is a feature, never a version; the number is a release-time call: PATCH = fixes · MINOR = additive features · MAJOR = a breaking change or a deliberate flagship feature.

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
8. **GitHub-synced issues sync on CONTENT, both ways.** If a repo↔team GitHub Issues Sync exists,
   editing a synced (e.g. Triage-imported) issue's **title or description** propagates back to the
   public GitHub issue — independent of the one-way/two-way *creation* setting. When **promoting**
   such an issue, change only `project` / `labels` / `milestone` / `state` — do NOT rewrite its
   title/description (keep SDLC notes in the feature docs or a comment); `delete_attachment` to unlink
   the GitHub link first if you must restructure it. (Incident on record: promoting a Triage issue
   silently overwrote the external reporter's public issue.)

## Reverse mapping — Linear -> spec (ingestion)

The same stage->entity table read **backwards** is how a stage materializes a plan that already lives
in Linear into the canonical spec (the input-resolution flow; `build`'s ingest adapter). It is a read
of Linear, not a write — the only write is to the spec file, stamped with a provenance marker.

- **Issue (`T-N`) -> a task** in the `## Plan` section; carry its `AC-N` if the issue records one,
  else mark the task `AC: untraced` (never fabricate a criterion).
- **Milestone -> a build phase**; **Project -> the feature** (`docs/specs/<feature>/<feature>.md`);
  **Initiative -> the product** (`docs/specs/overview.md`). Reverse-mapped writes land in the repo's
  actual spec tree (root `specs/` where one already exists — the back-compat rule in getting-started).
- **Faithful, not creative.** Transcribe only what the Linear entities contain; do not invent tasks,
  criteria, or components to fill the chain. Missing upstream links stay `untraced` and surface in the
  gate's coverage note.
- **One source of truth.** After ingestion the materialized spec is what build executes — not the
  Linear issues directly (which can drift). The guards above still apply (skip cleanly if the MCP is
  absent). See [input-resolution](../getting-started/reference/input-resolution.md).

## What each stage does

At its hand-off, each pipeline stage performs its Linear action AFTER writing its `##` section — the
document content IS that section. The full stage -> Linear action table (`idea`,
`acceptance-criteria`, `architecture-design`, `techstack`, `plan`, `gate`, `build`, `ship`) is in
[reference/mapping.md](reference/mapping.md). `build` and `ship` only **transition** the milestones
and `T-N` issues that `plan` already created (Backlog → In Progress → In Review → Done, plus PR
attachment) — they never create entities.
