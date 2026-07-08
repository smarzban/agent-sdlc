---
name: writing-repo-docs
description: "Use when asked to write or overhaul the documentation a repository needs to be usable and contributable — a landing index, quickstart, installation, running-it-locally dev setup, contributing + community-health files (CONTRIBUTING, SECURITY, changelog, templates), and a comprehensive per-feature usage guide, plus at most a light architecture overview — including the repo-root front-door README itself, produced by the writing-readmes method. Source-grounded, audience-separated, shaped to the repo type; doubles as an in-app help corpus. For deep internals — architecture rationale, data models, a complete module/API reference — use writing-technical-docs instead (or afterwards). Triggers: \"write the docs\", \"document this repo\", \"installation docs\", \"contributing guide\", \"how to run it locally\", \"usage guide\". Scope: standalone — for any repo's docs, independent of the Agent SDLC pipeline."
---

# Writing Repo Docs (the essentials)

Produce **everything a user, operator, or new contributor needs** — accurate, audience-separated, and adapted to what the repo actually is. The output is a tree of small, cross-linked Markdown files plus the repo-root community files. Maintainer internals are explicitly out of scope: that is `writing-technical-docs`. The repo-root README is IN scope — this skill produces the whole essentials set including the front door, applying the `writing-readmes` method for that file; use `writing-readmes` alone when only the README is wanted.

**Announce at start:** "I'm using the writing-repo-docs skill to document this repository."

## The core principle

**Every concrete claim is grounded in the source.** Constants, function/module names, env vars, defaults, endpoints, commands, file paths, behavior — read the code and verify before you write it. Docs that confidently state wrong facts are worse than no docs. The verification pass (Phase 5) is not optional.

The second principle: **separate by audience.** People who *use* the thing, people who *install/operate* it, and people who *contribute* to it need different docs. Don't blend them.

The third: **essentials, not internals.** This skill stops at what an outsider needs to use, run, and contribute. One light `architecture.md` overview is the ceiling — design rationale, data models, and per-subsystem internals belong to `writing-technical-docs`; link there, don't duplicate.

**Two modes — write, and audit-first.** On a green-field or gappy repo you write. On a **mature, already-documented repo, run audit-first (report-only) first**: inventory the doc surface, diff it against the bar (audiences × the feature set), and **report coverage and drift before offering any change** — the `repo-setup` audit-first gate, applied to docs. Don't blind-write over docs that may already be right; surface what's missing, stale, or contradicted, then offer edits. The coverage ledger (below) is what makes this mode a check rather than an impression.

## Checklist (turn each into a tracked task)

1. **Understand the repo** — what it is, its surface, its existing docs and conventions; on a mature, already-documented repo, run this as an audit-first pass (see **Two modes** above) and build the coverage ledger before writing.
2. **Decide audiences + structure** — adapt the skeleton to the repo type.
3. **Write the docs tree** — small files, cross-linked, grounded in source.
4. **Write the repo-root community files** — CONTRIBUTING + the health set that applies.
5. **Verify** — link-check + coverage-check + fact-check + run-the-commands pass; fix every inaccuracy.
6. **Index + report** — landing page, and tell the user what you built and any caveats.

## Phase 1 — Understand the repo (before writing anything)

Read enough to answer: *what is this, who uses it, and how does work actually get done here?*

- **Target scope** — operate on the current working directory's repo unless given an explicit target path; confirm the target with the owner before acting on a self/special repo (the one hosting this skill, or one whose docs are deliberately non-standard) rather than assuming.
- **Project type** — library/SDK, CLI tool, web service/API, full application, framework, or monorepo. This drives everything (see `reference/structure-by-repo-type.md`).
- **Entry points & public surface** — the README, the package manifest, the CLI command definitions, the exported API, the HTTP routes, the config/settings.
- **Existing docs** — README, `docs/`, `CLAUDE.md`/`AGENTS.md`, specs, ADRs. Reuse canonical content, but **treat existing docs as suspect**: they drift. Note contradictions and stale claims rather than copying them forward.
- **The contributor path as it actually is** — how the repo is really built and tested (the CI workflow is the ground truth), the commit convention in `git log`, the branch/PR flow, existing CONTRIBUTING/SECURITY/CHANGELOG/templates, whether there is a release process at all. No tests or CI? Document what actually exists and flag the gap — never invent test instructions.
- **Audiences** — end users? operators/deployers? API consumers? contributors? Decide which audience docs are warranted; don't write an "operator" section for a pure library.
- **The coverage ledger** — enumerate the **user-facing feature set** (CLI commands, public API/exports, HTTP routes, the plugin/skill set — whatever the repo exposes) and the **existing usage pages**. This inventory is the ledger Phase 5 diffs against; it is what turns "usage/ covers every feature" from an assertion into a check. Treat `docs/specs/` and other pipeline/build artifacts as **out-of-audience** — not features, not usage pages (see Phase 5).

Capture a short internal map (project type, audiences, module list, canonical sources, contributor conventions, and the coverage ledger) before structuring.

## Phase 2 — Decide audiences + structure (adapt, don't impose)

Start from the **default skeleton** and trim/extend it for the repo type. Read `reference/structure-by-repo-type.md` for the per-type layouts.

Default skeleton — the docs tree rooted at `docs/`, plus the repo-root files:

```
docs/
README.md          landing page: what it is + a "who starts where" map + index
quickstart.md      the fastest path to a working result
install/           getting set up + configuration reference + (if applicable) deploy/ops
usage/             how to USE each feature — comprehensive, one file per feature/task
development.md     running it locally: clone -> deps -> run -> test -> common tasks
architecture.md    (optional) LIGHT one-page overview; links to the technical docs

repo root:
README.md          the project front door — produce/refresh it BY the writing-readmes
                   skill's method (read that skill; it owns front-door anatomy). docs/README.md
                   above is the docs landing index, NOT a replacement for the root README.
CONTRIBUTING.md    the contributor front door (see Phase 4)
SECURITY.md        how to report a vulnerability (if the repo is public)
CHANGELOG.md       only if a release process exists
.github/           issue/PR templates — refine existing (may be repo-setup seeds);
                   offer creation only if repo-setup never ran; still an owner decision
```

Adapt:
- A **library** has no "deploy"; its `usage/` is API usage and it usually earns a `reference/` for the public API surface (consumers are programmers — the public API *is* usage).
- A **CLI** `usage/` is a command reference + recipes.
- A **service/app** keeps the full split (install + ops, how-to per feature).
- Name sections in the repo's own terms. Drop any section that doesn't apply (**YAGNI** — an empty "auth modes" page is worse than no page).

**Break docs into small, single-section files.** One concept per file: easier to keep accurate, easier to cross-link, and each can be surfaced individually by an in-app help function. Always include a top-level `README.md` index that routes the reader.

## Phase 3 — Write the docs tree, grounded in source

For each file:

- **Verify every concrete claim against the code as you write it.** Don't infer a default, an env var name, a constant, or a behavior — open the source and confirm.
- **`development.md` commands must actually work.** Derive the build/test/run commands from the CI workflow and the package scripts, not from an old README — and run them where the environment allows.
- **`usage/` is the comprehensive half** — one file per feature or task, with real, runnable examples: this is where "all the bells and whistles" get covered, task by task.
- **`architecture.md` (if warranted) stays light** — a system map, the main components, the main flows. No design rationale, no data-model detail; end it with a link to the technical docs (or note they don't exist yet).
- **Match the repo's terminology**, cross-link with relative paths, no filler, no placeholders (a `repo-setup:seed`-marked stub is a fill-target, not a placeholder — see Phase 5).

## Phase 4 — Write the repo-root community files

These are conventions with sharp edges — some must never be invented:

- **CONTRIBUTING.md** — dev-setup pointer (→ `docs/development.md`), how to run the tests, the commit convention **as observed in `git log`**, the branch/PR flow, what reviews expect. Mirror the repo's *actual* conventions; don't import a generic template.
- **SECURITY.md** — the vulnerability-reporting channel. **Confirm the channel with the owner** (email? GitHub private reporting?) — never invent a policy or an SLA. Can't confirm it? Don't create the file — flag it as an owner decision (deriving a channel from git-log metadata counts as inventing).
- **CHANGELOG.md** — only when a release process exists. Backfill only from tags/releases you can verify; never reconstruct history from guesswork.
- **Issue/PR templates** — refine existing templates (they may be `repo-setup` seeds); offer creation only when `repo-setup` never ran (no seeded templates present), shaped to the repo's real triage needs. Still an owner decision.
- **CODE_OF_CONDUCT** — owner decision, always. Flag its absence for a public repo; never pick one unilaterally.
- **LICENSE** — if absent, FLAG it; do not invent a license (same rule as `writing-readmes`).

## Phase 5 — Verify (do not skip)

Read `reference/fact-check-and-verify.md` for the full checklist. At minimum:

- **Link check — mechanize it.** Every internal relative link resolves to a real file and every referenced path exists: run a short script that walks the written files and resolves each link/path (never eyeball this); zero broken is the bar.
- **Coverage check — mechanize it.** Diff the Phase 1 feature ledger against the `usage/` pages: every user-facing feature has a page, or is listed excluded with a reason. A script comparing the enumerated feature set to the usage filenames beats eyeballing — this is what surfaces a missing page instead of asserting completeness (`writing-technical-docs` closes its ledger the same way).
- **Out-of-audience artifacts.** Pipeline/spec trees (`docs/specs/` and the like) are build artifacts — verification reports, ADRs, probes — not audience docs. Exclude them from the coverage ledger and never count them as usage pages; the link check still verifies a link that *points at* one, but a spec is never itself the thing being covered.
- **Fact-check pass** — re-read the docs against the source with fresh eyes; if a subagent is available, dispatch an adversarial fact-check ("find any statement contradicted by the code"). Fix every confirmed error.
- **Command check** — the quickstart, install, and `development.md` command sequences are traced against CI/scripts. Execute only sandbox-safe dev/test commands to confirm them; deploy/ops sequences are trace-only.
- **Placeholder scan** — no TBD/TODO/empty sections. A stub carrying the `repo-setup:seed` token is an intentional fill-target seeded by `repo-setup`: fill it (and remove the token) or report it as awaiting fill — never a placeholder violation.

## Phase 6 — Index + report

- Ensure the landing `README.md` indexes everything and tells each audience where to start.
- **Report the coverage ledger** — which user-facing features have usage pages, which are gaps (offer to fill), which are excluded and why. In audit-first mode this ledger *is* the deliverable, alongside the drift list.
- **Make the docs agent-discoverable (GEO).** Use the real category/stack terms in the landing description; when the docs are/will be published, add an [`llms.txt`](https://llmstxt.org/) at the root — a curated Markdown map linking the key pages. Repo metadata (the GitHub description/topics) is a **remote setting: propose the exact values to the owner** — don't mutate it yourself unless they've said go.
- Tell the user: where the docs live, the file tree, which community files were created vs **flagged as owner decisions** (security channel, code of conduct, license, templates), and any caveats — especially contradictions between existing docs and the code (surface them; offer to fix the code separately).
- **State whether technical docs exist.** When the repo warrants internals documentation, recommend `writing-technical-docs` as the follow-on — the essentials tree deliberately stops short of it.

## Principles

- **Accuracy over completeness over polish** — an unverified claim is a bug.
- **Audience separation** — use / install-operate / contribute are distinct readers.
- **Essentials, not internals** — one light architecture page is the ceiling; deep docs are `writing-technical-docs`.
- **Small files** — one section each; help-function-ready; easy to keep correct.
- **Adapt to the repo** — derive structure from what it *is*; don't force a template.
- **Community files mirror reality** — conventions from `git log` and CI, policies only from the owner.
- **Existing docs are suspect** — reuse canonical phrasing, but verify and flag drift.

## Red flags (stop and fix)

- Writing a default value, constant, env var, endpoint, or command **without opening the source** to confirm it.
- A `development.md` or quickstart command sequence you never traced against CI/scripts.
- An invented security policy, code of conduct, license, or changelog entry.
- Internals creeping in: design rationale or data-model detail in `usage/`, or `architecture.md` growing past one page — move it to the technical docs and link.
- One giant file that mixes user how-to and contributor setup.
- Imposing the full skeleton on a repo that doesn't need half of it.
- Declaring done without the link check, coverage check, fact-check, and command check.
- Blind-writing over a mature repo's existing docs without an audit-first coverage/drift report first.
- Asserting `usage/` coverage instead of diffing the feature ledger against the pages; or counting `docs/specs/` and other pipeline artifacts as audience docs.
- Any "TBD"/placeholder shipped in the output — a `repo-setup:seed`-marked stub reported as awaiting fill is not this (see Phase 5).

## Done when

- The docs tree exists per the chosen structure, every file source-verified, 0 broken links, 0 placeholders (`repo-setup:seed`-marked stubs reported as awaiting fill excepted — see Phase 5).
- The usage coverage ledger is closed: every user-facing feature has a `usage/` page or is listed excluded with a reason (`docs/specs/` and other pipeline artifacts are out-of-audience, not counted); `development.md` gets a newcomer from clone to green tests (or, where no suite exists, to a running instance — with the gap flagged).
- CONTRIBUTING.md reflects the repo's real conventions; the other community files are created or explicitly flagged as owner decisions.
- The landing index routes every audience, and the report lists what was built, what was flagged, and any code/doc drift found.
