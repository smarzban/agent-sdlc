# review-gate

**Multi-model AI code-review gate + whole-repo audit, packaged as a [Claude Code](https://code.claude.com) plugin.**
An agent orchestrates *holistic* code reviews across several diverse models; a thin **deterministic
spine** owns the block/pass verdict, the no-silent-dismissal rule, and the single PR comment — so the
reviewers can be **untrusted** and a prompt-injected diff or a steered agent still **cannot flip the
gate**.

- **Multi-model panel** — holistic review across up to four diverse lineages (`ollama` open models,
  the `claude` CLI, the `codex` CLI), plus conditional lenses fired by trigger (security, tests,
  subtle-correctness, simplify, …).
- **Untrusted reviewers, trustworthy verdict** — the verdict is computed by code from structured
  findings, not by any model.
- **No silent dismissal** — a model gating finding can be dismissed *only* with a written
  justification; a **tool**-detected fact (committed secret, conflict marker) **can't be dismissed at
  all**.
- **Deterministic scan tier** — `$0` git-hygiene + optional `gitleaks`/`osv-scanner`, all **fail closed**.
- **Two skills, one spine** — `review-gate` (per-PR merge gate) and `repo-audit` (advisory whole-repo
  health audit).

> Distilled from a bake-off against a 30-reviewer specialist panel: a clean *holistic* prompt across a
> few diverse models matched or beat the specialists at far lower cost, and the durable value was the
> deterministic spine — not the specialization. This keeps the spine, drops the fan-out.

📚 **Full documentation: [`docs/`](docs/README.md).**

## How it works

```
PR ─► agent checks out the branch (worktree)
   ─► reviewers (UNTRUSTED, read-only): each is a diverse model in an agent harness,
        told "review this PR" — it explores the repo itself (git diff, read, grep) → findings JSON
        holistic × N diverse models  +  conditional lenses fired by trigger
   ─► tools (TRUSTED, deterministic): `scan` runs git-diff scanners (conflict markers, focused
        tests, committed secrets/artifacts) → findings JSON, merged into the SAME pool
   ─► consolidate  (cluster by location, agreement across models)
   ─► agent adjudicates contested clusters  ─► spine enforces no-silent-dismissal
   ─► decide  ─► verdict (block/pass) + the gate findings comment (verdict + reviewer roster)
   ─► agent posts a separate orchestrator review comment (what's implemented / not · approve|changes)
   ─► CI required-check uses the verdict to block/allow merge
```

The agent does the flexible reviewing; the spine (`consolidate` + `decide`, pure code) owns the
verdict and the trust boundary. Why this is safe even with untrusted reviewers:
[docs/technical/trust-boundary.md](docs/technical/trust-boundary.md).

## Quickstart

Install the plugin (it's its own single-plugin marketplace), then ask Claude to review a PR:

```
/plugin marketplace add smarzban/review-gate
/plugin install review-gate@smarzban
```

> *"Review this PR and decide whether it can merge: #123."* → triggers the **review-gate** skill.

You also need `git`, `gh`, and **at least one** model backend (`ollama` with `:cloud` models, the
`claude` CLI, or the `codex` CLI). Full walk-through: [docs/quickstart.md](docs/quickstart.md).

## Install

```bash
claude plugin marketplace add smarzban/review-gate
claude plugin install review-gate@smarzban       # add --scope project to share with a repo's team
```

No install-time build: the spine is committed under `dist/` with **no runtime dependencies**, so plain
`node` runs it. Prerequisites, model backends, and optional scanners (`gitleaks`, `osv-scanner`):
[docs/install/install.md](docs/install/install.md).

## CLI

The `review-gate` CLI is on your `PATH` once installed (the skills call it for you):

```bash
review-gate prompt <name>                                          # print a reviewer/audit prompt + its output contract
review-gate run <reviewerId> <backend> <model> <repoDir> <prompt>  # one reviewer (untrusted)
review-gate scan <repoDir> <baseRef>                               # deterministic tier (trusted, no LLM)
review-gate consolidate <outputs.json>                             # cluster + agreement
review-gate decide <clusters.json> <adjudications.json> <meta.json> # deterministic verdict + PR comment
```

Reference: [docs/usage/cli.md](docs/usage/cli.md). The prompt catalog (holistic, the lenses, the audit
passes, the contracts): [docs/usage/prompts.md](docs/usage/prompts.md).

## Configuration

Everything is tunable via `REVIEW_GATE_*` environment variables — all have safe defaults. The full
reference (12 variables) is in [docs/install/configuration.md](docs/install/configuration.md).

> **Trust note.** The scanners defend the repo they scan. When gating *untrusted* PRs, pin a trusted
> config outside the checkout (`REVIEW_GATE_GITLEAKS_CONFIG` / `REVIEW_GATE_OSV_CONFIG`) so a committed
> `.gitleaks.toml` can't weaken scanning; a change to an in-repo scanner policy file is itself flagged,
> and a configured-but-failing scanner **fails closed** (blocks), never silently passes.

## Releasing & updates

This plugin uses **git-SHA versioning**: the manifests carry no `version` field, so **a release is just
a push to `main`** (every commit is a new version). To update an installed copy:

```bash
claude plugin marketplace update smarzban
claude plugin update review-gate@smarzban         # use the @marketplace-qualified name; restart to activate
```

`smarzban` is a third-party marketplace, so auto-update is **off by default** (updates are manual).
Details: [docs/technical/plugin-and-releases.md](docs/technical/plugin-and-releases.md).

## Documentation

Full docs live in [`docs/`](docs/README.md), routed by audience:

- **Use it** → [docs/quickstart.md](docs/quickstart.md), [docs/usage/](docs/usage/) (the gate, the
  audit, the CLI, the prompts).
- **Install & configure** → [docs/install/install.md](docs/install/install.md),
  [docs/install/configuration.md](docs/install/configuration.md).
- **Understand or extend** → [docs/technical/architecture.md](docs/technical/architecture.md),
  [trust-boundary.md](docs/technical/trust-boundary.md),
  [consolidate-and-decide.md](docs/technical/consolidate-and-decide.md),
  [extending.md](docs/technical/extending.md).

## Layout

```
.claude-plugin/   plugin.json + marketplace.json (this repo is its own marketplace)
skills/           review-gate/ (the gate) · repo-audit/ (the whole-repo audit)
src/              the spine: runner · scan · consolidate · decide · proc · prompts · cli · types
dist/             the committed compiled spine the installed plugin runs
bin/review-gate   the PATH launcher (resolves dist/cli.js relative to itself)
prompts/          holistic + 8 lenses + 7 audit passes + 2 output contracts + backends (the model roster)
ci/               example required-check wiring (dormant — automation deferred)
tests/            npm test, no network
```

## Development

```bash
npm install        # dev deps (tsx, typescript, vitest)
npm test           # full suite, no network
npm run typecheck  # tsc --noEmit (src + tests)
npm run build      # tsc → dist/
npm run build:check # build, then fail if committed dist/ drifts from src/
```

Adding a lens or audit pass, and the test discipline:
[docs/technical/extending.md](docs/technical/extending.md). Rebuild and commit `dist/` whenever you
change `src/` (prompt/skill markdown changes don't touch `dist/`).
