# Install

review-gate is a Claude Code plugin distributed as its **own single-plugin marketplace** (the repo is
both the marketplace and the plugin).

## Install the plugin

Inside Claude Code:

```
/plugin marketplace add smarzban/review-gate
/plugin install review-gate@smarzban
```

Non-interactive equivalent:

```bash
claude plugin marketplace add smarzban/review-gate
claude plugin install review-gate@smarzban         # add --scope project to share with a repo's team
```

The repo is **private**, so the marketplace add uses your own GitHub access (it clones via SSH/HTTPS).

Once installed, the **review-gate** skill triggers when you ask Claude to review / sign off on a PR,
and **repo-audit** when you ask for a whole-repo health audit. Updating and the release model are
covered in [../technical/plugin-and-releases.md](../technical/plugin-and-releases.md).

## The `review-gate` CLI

The plugin ships a `bin/review-gate` launcher that Claude Code adds to the Bash `PATH` on install, so
the skills (and you) can call `review-gate <verb>` from any directory. There is **no install-time
build**: the compiled spine is committed under `dist/` and has **no runtime dependencies** (pure Node
plus the `git`/model CLIs), so plain `node` runs it.

If `review-gate` isn't found after install, add the plugin's `bin/` to your `PATH`, or from a clone
run `npm i && npm run build && npm link`.

## Prerequisites (user-installed — the plugin can't bundle these)

- **`node`** — runs the spine and the `bin/review-gate` launcher.
- **`git`** + **`gh`** — check out the PR branch and post the single PR comment.
- **Model backends — at least one of:**
  - **`ollama`** with `:cloud` models — runs the Claude Code harness against open models (e.g. kimi, glm).
  - the **`claude`** CLI — the Anthropic closed lineage (e.g. opus).
  - the **`codex`** CLI — the OpenAI closed lineage (e.g. gpt-5.5), run at high reasoning effort.

  The gate **degrades gracefully**: a missing backend just yields a thinner panel, surfaced as a
  warning. The exact commands each backend runs are in
  [../technical/reviewers-and-scanners.md](../technical/reviewers-and-scanners.md); the roster of
  which models to run is served by `review-gate prompt backends`.
- **Optional scanners** for the deterministic tier's full set:
  - **`gitleaks`** — committed-secret detection.
  - **`osv-scanner`** — vulnerable-dependency detection.

  Without them, the always-on **git-hygiene** scanner still runs (conflict markers, focused tests,
  `debugger`, committed `node_modules`/`.env`). A scanner that is present but **can't complete fails
  closed** (blocks), never silently passes — see
  [../technical/reviewers-and-scanners.md](../technical/reviewers-and-scanners.md).

## Configuration

All tunables are environment variables — see [configuration.md](configuration.md).
