# Development

Running and changing this repo locally. The contribution rules live in
[CONTRIBUTING.md](../CONTRIBUTING.md); this page is the mechanics.

## Setup

```bash
git clone https://github.com/smarzban/agent-sdlc.git
cd agent-sdlc
```

That's the whole setup. The repo is **zero-dependency by design** — there is no `package.json`, no
install step, no build step. The skills are plain Markdown; the only executable code is the
checker, a single ESM file run by bare **Node ≥ 22**.

## Run the tests

```bash
node --test checker/*.test.mjs
```

153 tests across six suites (`parser`, `rules`, `git`, `reporter`, `cli`, `integration`), all
stdlib `node:test` — expect `# pass 153`, `# fail 0`. A syntax check is even cheaper:

```bash
node --check checker/sdlc-check.mjs
```

## Run the checker

```bash
node checker/sdlc-check.mjs docs/specs/<feature>/<feature>.md
```

See [usage/sdlc-check.md](usage/sdlc-check.md) for flags and rules. The repo is self-verifying:
every shipped feature spec in `docs/specs/` passes its own check —

```bash
for d in docs/specs/*/; do
  f="$d$(basename "$d").md"
  [ -f "$f" ] && node checker/sdlc-check.mjs "$f"
done
```

— each line should read `sdlc-check <version>: all checks passed`. (This is also why history is
merged fast-forward: the `ledger-vs-git` rule verifies each recorded task commit is reachable from
`HEAD`.)

## Author or change a skill

Skills live in `skills/<name>/SKILL.md` — both Claude Code and Cursor auto-discover any `skills/`
subdirectory containing a `SKILL.md`, so a new skill needs **no manifest edit**.

```markdown
---
name: <skill-name>
description: "Use when … — a precise trigger so the right tasks pick it up."
---

# <Skill Name>

…the method…
```

Conventions (match the existing skills — they are the style guide):

- **Frontmatter is strict YAML**: `name` matches the directory; `description` is a quoted string
  (descriptions contain colons) ending with explicit `Use AFTER … BEFORE …`, `Triggers: …`, and a
  `Scope:` qualifier so auto-triggers don't fire on everyday words.
- **Pipeline-stage skills share a body shape** — an intent paragraph, a `<HARD-GATE>` stating
  inputs/outputs, a bar + ordered checklist, `## Principles`, `## Rationalizations` (excuse →
  rebuttal), `## Red flags`, `## Done when`, `## The artifact (output)`. Read
  [`skills/plan/SKILL.md`](../skills/plan/SKILL.md) as a model.
- **Keep the SKILL.md scannable**; long mechanics, templates, and disciplines go in a `reference/`
  subdirectory the body links to — and where a reference file is load-bearing at a specific step,
  the body mandates reading it at that step.
- **Contracts the checker parses stay in sync**: the stage skills document the exact grammar
  `sdlc-check` consumes (e.g. `## Checker grammar` in `plan`). If you change what the checker
  parses, change the corresponding skill text in the same PR, and vice versa.
- Voice: terse, high-signal, imperative. `->` arrows and em-dashes. No filler.

## Change the checker

`checker/sdlc-check.mjs` is trusted code — the enforcement half of the instruction/enforcement
split (see [architecture.md](architecture.md)). Test-first, stdlib `node:test` only, zero
dependencies, never-throw on ragged input, fail-closed on every error path. Keep the suite green
and add tests with the change.

## How this repo builds itself

Changes to the pipeline go **through** the pipeline: a feature gets a spec chain in
`docs/specs/<feature>/` (spec → `gate-report.md` → `build-report.md` → `verification-report.md`),
is built one task per commit (`feat(T-N): …`), and ships as a reviewed PR. The committed chains
double as worked examples — start with
[`docs/specs/enforcement-spine/`](specs/enforcement-spine/) and the living
[`docs/specs/overview.md`](specs/overview.md).

## Releases

Installed plugins update only when the manifest `version` changes — pushing commits alone does
not reach installed copies. A release:

1. Bumps `version` in **both** manifests, in lockstep: `.claude-plugin/plugin.json` and
   `.cursor-plugin/plugin.json` (semver: MAJOR breaking · MINOR additive · PATCH fixes), refreshing
   the descriptions if scope changed.
2. Commits (`chore(release): agent-sdlc X.Y.Z — …`).
3. Tags `agent-sdlc-vX.Y.Z` and cuts a GitHub release.

Users then pull it with `/plugin marketplace update agent-sdlc` + `/plugin install agent-sdlc`
(Cursor: re-import the marketplace).
