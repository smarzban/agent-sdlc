# Linear sync — full mapping

## Hierarchy

```
Initiative: "<product>"        ← product; ties all features; resolved-or-created via save_initiative
   · description + summary = ## Overview
   · documents             = ## Architecture, ## Tech Stack   (save_document, parent = initiative)
 ├─ Project: <feature-a>   → milestones (build phases) + T-issues + feature docs   [label version:v1]
 └─ Project: <feature-b>   → …                                                       [label version:v1]
```

- **Milestone** = a build phase (a dependency-ordered cluster of the feature's plan tasks).
- **Issue** = a plan task (`T-N`). Sub-issues only when a task genuinely needs splitting; the
  red-green-refactor steps are the issue's checklist, not a level.
- **Labels:** `type:*` (feature/bug/tech-debt/enhancement/docs/test/perf/chore) + `area:*` (one per
  component) + `version:vN` (point releases `version:vN.M`). **Version lives on the label, never in a
  project name** — the number is a release-time call: PATCH = fixes · MINOR = additive features ·
  MAJOR = a breaking change or a deliberate flagship feature. Issue bodies REFERENCE ACs
  ("Advances: AC-3, AC-7") — never paste full AC text; the contract lives in the Acceptance-Criteria
  document.

## Stage → Linear action

Each stage runs its action AFTER writing its `##` section; the document content IS that section.

| Stage (tier) | Linear action |
| --- | --- |
| `idea` (project) | resolve-or-create the Initiative via `save_initiative`; set its `description` = `## Overview` plus a one-line `summary`. |
| `idea` (feature) | `save_project` for the feature (under the initiative, label `version:v1`, lead, summary, state "Backlog"/"Planned"); `save_document` "Brief — <feature>" (content = `## Brief`). |
| `acceptance-criteria` | `save_document` "Acceptance Criteria — <feature>" (content = `## Acceptance Criteria`), parent = feature project. |
| `architecture-design` (feature) | `save_document` "Design — <feature>" (content = `## Design`); `create_issue_label` `area:<component>` per component. |
| `architecture-design` (project) | `save_document` "Architecture" (content = `## Architecture`), parent = initiative. |
| `techstack` (feature) | `save_document` "Tech Stack — <feature>" (content = `## Tech Stack`), parent = feature project. |
| `techstack` (project) | `save_document` "Tech Stack" (content = `## Tech Stack`), parent = initiative. |
| `plan` | per build phase: `save_milestone` (feature project, name, description). Per task `T-N`: `save_issue` (team, title "T-N — …", project = feature, milestone, labels = [area + type], state "Backlog"/"Todo", body = "Advances: AC-x · Component: … · Files: … · Test-first: …"). Set the feature project state to "In Progress". |
| `gate` | `save_status_update` (type "project", feature project, health onTrack/atRisk/offTrack, body = the go/no-go verdict); `save_document` "Gate report — <feature>" (content = the gate report). |
| `build` | per task `T-N`, transition the existing issue (do NOT create): `save_issue` BY id (from `linear-ids.json`), `state` → "In Progress" (implementer starts) → "In Review" (reviewer runs) → "Done" (reviewed, green, committed). Pass `id` on update, never `team`. A blocked task: `save_comment` on the issue with the blocker (no "Blocked" status is assumed to exist). When a milestone's last task reaches Done, `save_status_update` (project) noting the milestone complete. |
| `ship` | attach the PR: `save_issue` BY id with `links:[{url:"<pr-url>",title:"PR"}]` on the feature's issues; `save_status_update` (project, body "PR open: <pr-url>"); set the feature project state to "In Review". No merge transition — merge is out of scope for ship. |

build and ship only **transition** entities the `plan` stage already created (milestones + `T-N`
issues, recorded in `linear-ids.json`); they never create. The build-stage transitions previously
deferred here now live in the `build` and `ship` skills.

## `linear-ids.json` shape

Persisted at `linear.idsFile` (default `.agent-sdlc/linear-ids.json`) so later stages and re-runs
reference existing entities instead of re-creating them.

```json
{
  "initiative": "<uuid>",
  "initiativeDocs": { "architecture": "<id>", "techstack": "<id>" },
  "features": {
    "<feature>": {
      "project": "<id>",
      "docs": { "brief": "<id>", "criteria": "<id>", "design": "<id>", "techstack": "<id>", "gate": "<id>" },
      "milestones": { "Foundation": "<id>", "Core services": "<id>" },
      "issues": { "T-1": "<id>", "T-2": "<id>" }
    }
  }
}
```

## Run-side (bugs / enhancements / incoming) — NOT projects

Ongoing or unplanned work mirrors Linear's native model rather than being forced into a project:

- A bug, small enhancement, cross-cutting tech-debt, or incoming request is a **team-level issue
  with no project**, labelled `type:bug` / `type:enhancement` / `type:tech-debt` (+ `area:*`),
  entering through **Triage**. Never create a project per bug.
- To ship one, **promote** it: attach it to the relevant feature project + a release-milestone —
  don't duplicate it. **When promoting a GitHub-synced issue, change only project / labels /
  milestone / state — never its title or description** (see the sync warning below).
- A point release becomes a **release-milestone in the relevant feature project**, not a new project.

Wiring GitHub↔Linear (so issues/PRs flow into Triage and PR magic-words like "Fixes SMA-123"
auto-transition the linked issue) is a one-time Linear/GitHub workspace setup — outside these skills.
**Beware the content sync it creates:** for a repo↔team Issues Sync, editing a synced issue's title
or description in Linear **propagates back to the public GitHub issue** (independent of the
one-way/two-way *creation* setting). Promote by moving/labelling only; keep rewrites out of the
title/description, or `delete_attachment` to unlink first. (Incident on record: promoting a
Triage-imported issue silently overwrote the external reporter's public GitHub issue.)
