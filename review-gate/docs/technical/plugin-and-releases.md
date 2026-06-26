# Plugin packaging & releases

## Layout

review-gate is a Claude Code plugin in the `smarzban-skills` marketplace:

| Path | Role |
|---|---|
| `.claude-plugin/plugin.json` | the plugin manifest (name, **version**, description, keywords). |
| *(marketplace index)* | not here — the `smarzban/skills` repo root carries `.claude-plugin/marketplace.json`, which lists this plugin with `source: "./review-gate"`. |
| `bin/review-gate` | the `PATH` launcher — resolves `dist/cli.js` relative to itself (through symlinks), so the skills can call `review-gate <verb>` from any directory. |
| `skills/review-gate/`, `skills/repo-audit/` | the two skills. |
| `prompts/` | the reviewer/audit prompts the CLI serves ([../usage/prompts.md](../usage/prompts.md)). |
| `dist/` | the **committed** compiled spine the installed plugin runs. |

**No install-time build:** `dist/` is committed and the spine has **no runtime dependencies** (pure
Node + the `git`/model CLIs), so plain `node` runs it on install.

## Versioning: pinned semver

`plugin.json` carries an explicit **`version`** (semver) — the same release model as the other plugin
in the `smarzban-skills` marketplace. The consequence:

> **Cutting a release = bump `version` → refresh the description if scope changed → commit → push.**
> Claude Code caches an installed plugin by its `version`, so **pushing commits alone does not update
> installed copies** — the version string must change. Bump per semver (MAJOR breaking · MINOR
> additive · PATCH fixes); no git tag or GitHub release is needed.

(review-gate used git-SHA versioning while it was a standalone single-plugin repo; it adopted pinned
semver when it joined `smarzban-skills`, so the whole marketplace shares one release model.)

If `src/` changed, **rebuild and commit `dist/`** before pushing — `npm run build:check` enforces that
the committed `dist/` matches a fresh build (see [extending.md](extending.md)).

## Updating an installed copy

```bash
claude plugin marketplace update smarzban-skills   # refresh the catalog from the repo
claude plugin update review-gate@smarzban-skills    # apply the newest version
```

Notes (verified against Claude Code 2.1.183):

- Use the **marketplace-qualified** name: bare `claude plugin update review-gate` fails with "not
  found"; `review-gate@smarzban-skills` works.
- `smarzban-skills` is a **third-party** marketplace, so **auto-update is off by default** — updates are
  manual unless you enable auto-update for the marketplace in `/plugin` → Marketplaces. (The CLI's own
  `autoUpdates` setting is unrelated — that's the Claude Code binary updating itself.)
- There is **no "update available" notification** — `claude plugin update` is the deliberate check; a
  restart activates the new copy.
- Each version is cached under `~/.claude/plugins/cache/smarzban-skills/review-gate/<version>/`; old version dirs may
  linger.
