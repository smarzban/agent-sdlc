# Plugin packaging & releases

## Layout

review-gate is a Claude Code plugin that is also its own marketplace:

| Path | Role |
|---|---|
| `.claude-plugin/plugin.json` | the plugin manifest (name, description, keywords). |
| `.claude-plugin/marketplace.json` | declares this repo as a single-plugin marketplace (`smarzban` → `review-gate`, `source: "./"`). |
| `bin/review-gate` | the `PATH` launcher — resolves `dist/cli.js` relative to itself (through symlinks), so the skills can call `review-gate <verb>` from any directory. |
| `skills/review-gate/`, `skills/repo-audit/` | the two skills. |
| `prompts/` | the reviewer/audit prompts the CLI serves ([../usage/prompts.md](../usage/prompts.md)). |
| `dist/` | the **committed** compiled spine the installed plugin runs. |

**No install-time build:** `dist/` is committed and the spine has **no runtime dependencies** (pure
Node + the `git`/model CLIs), so plain `node` runs it on install.

## Versioning: git-SHA (model B)

Neither `plugin.json` nor `marketplace.json` carries a `version` field. With no explicit version,
Claude Code uses the **commit SHA of the default branch** as the version. The consequence:

> **Cutting a release = pushing to `main`.** Every pushed commit is a new version (its SHA). No version
> bump, git tag, or GitHub release is needed.

This was a deliberate switch *away* from a pinned `version`. With an explicit version, "pushing new
commits alone is not enough" — Claude Code skips the update unless the version string changes — which
had silently meant earlier pushes would never reach an installed copy. SHA versioning removes that
footgun for an actively-developed plugin. (To switch back to semver later, add a `version` to **both**
manifests and bump it on every release.)

If `src/` changed, **rebuild and commit `dist/`** before pushing — `npm run build:check` enforces that
the committed `dist/` matches a fresh build (see [extending.md](extending.md)).

## Updating an installed copy

```bash
claude plugin marketplace update smarzban       # refresh the catalog from the repo
claude plugin update review-gate@smarzban        # apply the newest commit
```

Notes (verified against Claude Code 2.1.183):

- Use the **marketplace-qualified** name: bare `claude plugin update review-gate` fails with "not
  found"; `review-gate@smarzban` works.
- `smarzban` is a **third-party** marketplace, so **auto-update is off by default** — updates are
  manual unless you enable auto-update for the marketplace in `/plugin` → Marketplaces. (The CLI's own
  `autoUpdates` setting is unrelated — that's the Claude Code binary updating itself.)
- There is **no "update available" notification** — `claude plugin update` is the deliberate check; a
  restart activates the new copy.
- Each version is cached under `~/.claude/plugins/cache/smarzban/review-gate/<sha>/`; old SHA dirs may
  linger.
