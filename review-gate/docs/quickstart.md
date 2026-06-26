# Quickstart

Get from nothing to a gated PR.

## 1. Install the plugin

review-gate is its own single-plugin marketplace. Inside Claude Code:

```
/plugin marketplace add smarzban/review-gate
/plugin install review-gate@smarzban
```

Non-interactive equivalent: `claude plugin marketplace add smarzban/review-gate` then
`claude plugin install review-gate@smarzban`. See [install/install.md](install/install.md) for
prerequisites and details.

## 2. Have at least one model backend

The reviewers run through a model CLI. You need **at least one** of: `ollama` (with `:cloud` models),
the `claude` CLI, or the `codex` CLI. The gate **degrades gracefully** — a missing backend just means
a thinner panel (and it says so). Also have `git` and `gh`. Full list: [install/install.md](install/install.md).

## 3. Gate a PR

In Claude Code, ask it to review a PR — for example:

> Review this PR and decide whether it can merge: `#123`.

That triggers the **review-gate** skill, which checks out the branch, runs the deterministic scan and
the model panel, consolidates the findings, adjudicates, and produces a single block/pass verdict and
PR comment. The full procedure (and what "done" means) is in [usage/review-gate.md](usage/review-gate.md).

## 4. (Optional) drive the spine directly

The `review-gate` CLI is on your `PATH` once the plugin is installed, so you can exercise it without
the skill:

```bash
review-gate prompt holistic        # print a reviewer prompt + its output contract
review-gate scan /path/to/repo origin/main   # the deterministic tier ($0, no LLM)
```

The full verb list is in [usage/cli.md](usage/cli.md).

## Audit a whole repo instead

For a periodic, advisory health audit of an entire codebase (not a single PR), ask for a repo audit —
that triggers the **repo-audit** skill. See [usage/repo-audit.md](usage/repo-audit.md).
