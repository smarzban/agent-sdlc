# Install

This repo is both the plugin and its own single-plugin marketplace: `.claude-plugin/` holds the
Claude Code manifests, `.cursor-plugin/` the Cursor ones, both listing the plugin at the repo root.

## Claude Code

```text
/plugin marketplace add smarzban/agent-sdlc
/plugin install agent-sdlc
```

The explicit `plugin@marketplace` form — `/plugin install agent-sdlc@agent-sdlc` — is only needed
if another installed marketplace also offers a plugin named `agent-sdlc`.

Once installed:

- Skills trigger automatically when a request matches their `description`.
- Explicit invocation is always namespaced: `/agent-sdlc:idea`, `/agent-sdlc:gate`,
  `/agent-sdlc:writing-readmes`, … A bare `/idea` resolves only to personal skills
  (`~/.claude/skills/`), never to a plugin skill.
- The plugin's `bin/` goes on the Bash PATH, so [`sdlc-check`](usage/sdlc-check.md) resolves from
  any working directory.

### Updating

Claude Code caches an installed plugin by the `version` in its `plugin.json` — new commits alone
do not reach installed copies; releases do. To pull a release:

```text
/plugin marketplace update agent-sdlc
/plugin install agent-sdlc
```

## Cursor

Settings → Plugins → **Import** under Team Marketplaces, paste the repo URL
(`https://github.com/smarzban/agent-sdlc`), review the parsed plugin, and enable it. Cursor tracks
the default branch automatically. Skills auto-activate by context, or invoke them by name via `@` /
slash. To update, re-import the marketplace.

## Any other agent

The skills are plain Markdown to the open `SKILL.md` standard (`name` + `description` frontmatter
+ a Markdown body), so they work with any agent that reads instruction files — e.g. Codex reads
`SKILL.md` from `.codex/skills/`. Copy or symlink the individual `skills/<name>` directories into
wherever your harness discovers skills; the `.claude-plugin/` and `.cursor-plugin/` wrappers are
simply ignored elsewhere.

The checker needs no install step anywhere: it is a single zero-dependency ESM file run by bare
Node ≥ 22 — `node checker/sdlc-check.mjs <spec>` from a checkout, or the `bin/sdlc-check` launcher
from any directory.

## Requirements

- **Skills:** none — Markdown read by your agent harness.
- **`sdlc-check`:** Node ≥ 22 (no packages, no build). Without Node the pipeline still runs; the
  stages that invoke the checker announce a degraded fallback instead of failing silently.
- **[Linear sync](usage/linear-sync.md):** optional; needs the Linear MCP and an explicit opt-in.
- **The [Empanel](https://github.com/smarzban/empanel) review gate:** optional; `ship` invokes it
  when installed and falls back to a dispatched reviewer subagent when not.
