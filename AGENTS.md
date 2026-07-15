# AGENTS.md

## Routing guideline

Stranger litmus test: would this instruction make sense to a stranger who cloned this repo? If
no, it belongs in AGENTS.local.md.

A gitignored AGENTS.local.md may exist beside this file; if present, read and follow it before starting work.

Pointer files carry no content: edits go to AGENTS.md or AGENTS.local.md, never CLAUDE.md — it is a
frozen one-line pointer and says so in-file.

Lazy creation: if an agent has private-routed content (per the litmus test above) and no
AGENTS.local.md exists yet in this working copy, it creates one — the committed .gitignore entry
already covers it, so the pattern self-propagates to every clone.

@AGENTS.local.md

## Project overview

agent-sdlc is a full-SDLC pipeline for AI coding agents that takes an idea to a **reviewed PR**,
authored to the open `SKILL.md` standard and served as a **single-plugin marketplace named
`agent-sdlc`** for Claude Code, Cursor, and OpenAI Codex, and as a directly-installable package for
pi. *You own the thinking; the agent owns the breakdown.*

The repo root is both the plugin and its marketplace:

```
agent-sdlc/ (repo root = the plugin AND its marketplace)
├── .claude-plugin/   ← marketplace.json (source "./") + plugin.json   }
├── .cursor-plugin/   ← marketplace.json (source ".")  + plugin.json   } version in LOCKSTEP
├── .codex-plugin/    ← plugin.json (marketplace: .agents/plugins/)    } across all four
├── package.json      ← pi manifest: keywords + pi.skills -> ./skills  } plugin manifests
├── bin/sdlc-check    ← on-PATH launcher (resolves ../checker relative to itself — layout-proof)
├── checker/          ← sdlc-check.mjs (zero-dep Node ≥22 ESM enforcement spine) + its node:test suite
├── skills/           ← the pipeline + documentation + repo-setup skills, some with reference/
├── docs/             ← user + contributor docs (landing index, quickstart, usage/, development)
└── docs/specs/       ← the dogfood spec tree (exemplar chains + a living overview.md)
```

The pipeline: `idea → acceptance-criteria → architecture-design → techstack → plan → gate → build
→ ship`, entered at any stage from any source (start-anywhere, materialized with provenance).
Traceability spine `AC-N → C-N → product → T-N`; the read-only gate walks the chain; `build` is a
subagent-per-task TDD conductor with harness-captured per-test green-bar evidence; `ship` writes
the AC→proof `verification-report.md`, runs `sdlc-check` fail-closed, opens the PR, and hands it to
the Empanel review gate (`/empanel:gate`; a portable multi-lens reviewer-subagent fallback runs
when the gate is absent). A light tier compresses small changes (same gate/build/checker).
`linear-sync` (off by default) mirrors stages into Linear.

## Build / test / verify

Zero runtime dependencies; Node ≥22, ESM.

- **Test:** `node --test checker/*.test.mjs` — read the exit code directly, never piped.
- **Canonical verify (self-gate):** `node checker/sdlc-check.mjs <spec>` — must exit 0 on every
  shipped spec.
- **On-PATH launcher:** `bin/sdlc-check` resolves `../checker` relative to itself (layout-proof).
- CI runs the checker suite + self-gate on push/PR (ubuntu + macos matrix, least-privilege token).

## Conventions

**Authoring (match the existing skills):**
- Frontmatter: `name` (matches the directory) + a rich `description` ending with explicit
  `Use AFTER … BEFORE …` and `Triggers: …` (+ trigger-scope qualifiers). Strict-YAML parseable.
- Body sections, in order: one-paragraph intent; `<HARD-GATE>`; the method (`## Checklist` /
  `## The X bar`); `## Principles`; `## Rationalizations` (excuse→rebuttal table); `## Red flags`;
  `## Done when`; `## The artifact (output)`; `## Conventions`.
- Voice: terse, high-signal, imperative. `->` arrows, em-dashes, no filler.
- Reference files: long material goes in `reference/` subdirs the SKILL.md links on demand. Every
  target harness auto-discovers any `skills/` subdir with a SKILL.md, so no manifest edit per skill.
- Checker coupling: the checker grammar is documented in the stage SKILL bodies — change grammar
  only with tests (`node --test checker/*.test.mjs`, exit code read directly, never piped).
- Skill text stays self-contained: it never cites dogfood spec AC ids or `docs/specs/…` paths
  (irrelevant to a user's agent). The pipeline skills' generic `AC-N` / `docs/specs/<feature>/`
  grammar is their contract and stays.

**Git + release:**
- Conventional Commits with an area scope — `feat(build): …`, `feat(T-N): …` (build tasks; the
  recorded-commit rule matches the scope position), `docs(agent-sdlc): …`, `chore(release): …`.
- Never commit straight to `main`; branch → **merge fast-forward, SHA-preserving** (REQUIRED — the
  checker's recorded-commit rule needs every task SHA reachable; never squash/rebase-merge). Delete
  merged branches. Never `git add -A` (this repo carries intentionally-untracked trees); add paths
  explicitly.
- Releases are gated on a version bump (Claude Code caches by `plugin.json` version): bump **all
  four** version fields in lockstep (`.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`,
  `.codex-plugin/plugin.json`, and `package.json`), refresh the description if scope changed,
  commit, push, then a plugin-scoped annotated tag (`agent-sdlc-vX.Y.Z`) + GitHub release. License:
  **Apache-2.0** (all plugin.jsons + `package.json` carry it). The marketplace manifests
  (`.claude-plugin`, `.cursor-plugin`, `.agents/plugins/marketplace.json`) carry no version.
- Users install/update: **Claude Code** `/plugin marketplace add smarzban/agent-sdlc` +
  `/plugin install agent-sdlc@agent-sdlc` (update via `/plugin marketplace update agent-sdlc`);
  **Cursor** imports the repo URL as a team marketplace (re-import to refresh); **Codex** `codex
  plugin marketplace add smarzban/agent-sdlc` + `codex plugin add agent-sdlc@agent-sdlc`; **pi**
  `pi install git:github.com/smarzban/agent-sdlc`. Full walkthrough in `docs/install.md`.
- Review rounds run through the Empanel gate; a portable multi-lens reviewer-subagent fallback runs
  when the gate is absent. Suite verdicts via a machine-readable reporter; exit codes read directly.
