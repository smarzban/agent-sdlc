# Contributing

Thanks for improving Agent SDLC. The repo is small and zero-dependency, so the mechanics are
light — but the conventions below are real: the repo's own checker enforces some of them.

## Setup and tests

See [docs/development.md](docs/development.md). The short version:

```bash
git clone https://github.com/smarzban/agent-sdlc.git
cd agent-sdlc
node --test checker/*.test.mjs   # Node >= 22; expect 153 passing
```

Before opening a PR, the suite must be green, and every shipped spec must still self-verify
(`node checker/sdlc-check.mjs specs/<feature>/<feature>.md` → exit 0 — the loop command is in
[docs/development.md](docs/development.md)).

## Branch and merge flow

- Never commit straight to `main` — branch first (`feat/…`, `fix/…`, `docs/…`).
- History is merged **fast-forward, SHA-preserving** — no merge commits, no squash, no rebase
  merges. This is load-bearing, not taste: the checker's `ledger-vs-git` rule verifies each
  recorded task commit exists and is reachable from `HEAD`, so rewriting SHAs breaks the shipped
  specs' self-verification.
- Delete branches once merged.

## Commit convention

Conventional Commits with an area scope, as in the existing `git log`:

- `feat(<area>): …` / `fix(<area>): …` / `docs(<area>): …` / `chore(release): …` — areas are the
  thing touched: a skill name (`fix(ship): …`), `checker`, `marketplace`, `agent-sdlc` for
  cross-cutting docs.
- During a pipeline build, task commits use the task scope: `feat(T-N): …` — the checker matches
  that scope position against the build ledger.
- One logical change per commit.

## What to change where

- **Skills** (`skills/<name>/SKILL.md` + `reference/`): plain Markdown. Frontmatter must be
  strict YAML (quoted `description`); match the existing skills' shape and voice — the authoring
  conventions are in [docs/development.md](docs/development.md).
- **Checker** (`checker/`): trusted code — test-first, stdlib `node:test`, zero dependencies,
  fail-closed. A change to the grammar the checker parses and the skill text documenting that
  grammar land together, in the same PR.
- **Manifests** (`.claude-plugin/`, `.cursor-plugin/`): the two `plugin.json` versions move in
  lockstep; version bumps are release commits (see
  [releases in docs/development.md](docs/development.md#releases)).

## Changes to the pipeline go through the pipeline

This repo dogfoods itself: a non-trivial change to the pipeline is expected to ship as a spec
chain in `specs/<feature>/` — gate-passed plan, test-first build with one green commit per task,
a reviewed PR. Small self-contained fixes can take the
[light tier](docs/usage/light-tier.md). The committed chains in [`specs/`](specs/) show exactly
what that looks like.

## What review expects

- Green suite, self-verifying specs, no broken relative links in docs.
- Skills changes hold the house voice and the strict-YAML frontmatter.
- No secrets, no personal/internal paths — the repo is public.

## License

[Apache-2.0](LICENSE) — contributions are accepted under the same license.
