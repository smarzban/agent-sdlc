# review-gate documentation

**review-gate** is a multi-model code-review gate and whole-repo audit, packaged as a
[Claude Code](https://code.claude.com) plugin. An agent orchestrates code reviews across several
independent models; a small **deterministic spine** (`consolidate` + `decide`) owns the block/pass
verdict and the trust boundary — so the reviewers can be *untrusted* (a prompt-injected diff or a
steered model can't flip the gate), and tool-detected facts like a committed secret can't be
silently dismissed.

It ships **two skills**:
- **review-gate** — a per-PR merge gate: review *this* change, block or pass.
- **repo-audit** — a periodic, advisory whole-repo health audit (no verdict, just a backlog).

Both drive the same `review-gate` CLI spine, which also serves its own reviewer prompts.

## Who starts where

| You want to… | Start here |
|---|---|
| **Use it** — gate a PR or audit a repo | [quickstart.md](quickstart.md), then [usage/](usage/) |
| **Install & configure** it | [install/install.md](install/install.md) and [install/configuration.md](install/configuration.md) |
| **Understand or extend** it | [technical/architecture.md](technical/architecture.md) |

## Index

- **[quickstart.md](quickstart.md)** — install the plugin and gate your first PR.
- **install/**
  - [install.md](install/install.md) — install the plugin, prerequisites, model backends, optional scanners.
  - [configuration.md](install/configuration.md) — the `REVIEW_GATE_*` environment-variable reference + scanner-config trust.
- **usage/**
  - [review-gate.md](usage/review-gate.md) — running the per-PR gate end to end.
  - [repo-audit.md](usage/repo-audit.md) — running the whole-repo audit.
  - [cli.md](usage/cli.md) — the `review-gate` command reference (`prompt`/`run`/`scan`/`consolidate`/`decide`).
  - [prompts.md](usage/prompts.md) — the prompt catalog: holistic, the lenses, the audit passes, the contracts, the roster.
- **technical/**
  - [architecture.md](technical/architecture.md) — the spine, the data flow, and the trust boundary (the *why*).
  - [trust-boundary.md](technical/trust-boundary.md) — untrusted reviewers vs. the trusted spine; no-silent-dismissal.
  - [consolidate-and-decide.md](technical/consolidate-and-decide.md) — clustering, agreement, the cluster-key contract, the verdict.
  - [reviewers-and-scanners.md](technical/reviewers-and-scanners.md) — the model runner and the deterministic scan tier.
  - [plugin-and-releases.md](technical/plugin-and-releases.md) — git-SHA versioning, the `bin` launcher, install/update.
  - [extending.md](technical/extending.md) — add a lens or an audit pass; the test discipline.
