# Changelog

The authoritative release notes live on
[GitHub Releases](https://github.com/smarzban/agent-sdlc/releases) — one release per version,
cut with a plugin-scoped tag (`agent-sdlc-vX.Y.Z`). This file is the one-line index.

- **[0.18.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.18.0)** (2026-07-29) —
  **a temporary measurement experiment, and skill frontmatter limits enforced by test.** The
  experiment (carrying a greppable removal marker in every file it touches) records what a run costs to a **local file under your
  home directory** and renders it as a table: stage, task and review-round boundaries, findings by
  severity, and changes between boundaries. **It is on by default and records automatically when a
  pipeline stage runs.** Nothing is transmitted anywhere and no file contents, prompts, or secrets
  are recorded (counts, durations and enumerated values only), it never blocks a stage, and
  `docs/usage/experiment-run-observability.md` documents both how to read it and how to remove it
  completely. It exists to answer one question, whether elapsed time goes to task size or to review
  rounds, and is deleted once it has. Separately, skill `description` (max 1024) and `name` (max 64)
  are now held to the open standard's limits by test, because a validating harness only warns and
  still loads the skill, so an over-long description degrades activation quietly in someone else's
  repo.
- **[0.17.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.17.0)** (2026-07-28) —
  **`handoff`, a fifth standalone skill**: the pipeline handed a *feature* forward well and the
  *working copy* not at all. `HANDOFF.md` is the repo-root live-state doc the next agent reads to
  resume, and the skill scaffolds, updates, and prunes it. One litmus decides what belongs in it
  (wrong next week -> the doc; true next month -> the standing rules), three modes select
  deterministically, and the prune trigger is **mechanical**: it fires on size, on structure, or on
  an entry describing something already merged, shipped, closed, or decided. Both of its escape
  hatches are stamp-bound and expire, because "prune aggressively" as advice is what every bloated
  doc was already under. Ignored by default, so it can be written frankly. `repo-setup` seeds it,
  `getting-started` routes to it, and `build` (at entry) and `ship` (at park) update it when it
  already exists, never creating it and never blocking.
- **[0.16.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.16.0)** (2026-07-28) —
  two new install targets and a checker that is now scored on its silence. **OpenAI Codex** (a
  marketplace under `.agents/plugins/`) and **pi** (a direct package install, `pi.skills` in
  `package.json`) join Claude Code and Cursor, so **four** version fields now move in lockstep.
  `idea` and `architecture-design` gain a **visual-aid discipline**: one per-question test, a
  committed inline spec diagram or a throwaway consent-gated scratch visual, never a drawing mode.
  The checker's parsed blocks are **anchored to identity** rather than to bullets (a section's trace
  fields could be handed wholesale to one id), and a **coverage cell now links only the ids it
  lists**, so `T-8 (supersedes T-5)` annotates instead of fabricating a link (`adr/ADR-0002`; one
  erratum on a shipped chain). New **seeded-defect eval**: defects that actually occurred are seeded
  as fixtures and scored, with an expected-miss ledger asserted in both directions so a known blind
  spot cannot rot unnoticed. `build` scopes the reviewer's diff to the task's own files (a repo-wide
  intent-to-add was sweeping unrelated untracked files into reviews), and `ship` follows Empanel's
  `gate` -> `merge-gate` rename and carries its third verdict, `inconclusive`.
- **[0.15.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.15.0)** (2026-07-08) —
  standalone-skills hardening from the first `repo-setup` field runs: `repo-setup` gains a
  **migration mode** (an existing rich instruction file is migrated into the public/private split,
  never stubbed over — with a gitignored→tracked `CLAUDE.md` flip call-out and a privacy de-leak
  checklist), `.gitattributes`/`.editorconfig` become complete-at-seed, and a
  single-unambiguous-owner `CODEOWNERS` case. `writing-repo-docs` gains a first-class
  **audit-first (report-only) mode** and a **mechanized usage coverage ledger** (with a
  per-repo-type feature-enumeration source), treating spec/pipeline trees as out-of-audience
  wherever rooted. All four standalone skills document a CWD/target-repo scope convention.
- **[0.14.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.14.0)** (2026-07-08) —
  `repo-setup`, the fourth standalone skill: take an empty or existing repo to an operational
  baseline — audit-first (never blind-overwrite), the public/private agent-instruction split
  (committed `AGENTS.md` + frozen `CLAUDE.md` pointer (self-label comment + `@AGENTS.md` import) +
  gitignored `AGENTS.local.md`,
  loading chain probe-verified per harness), eleven seed templates under the `repo-setup:seed`
  marker, opt-in agent-sdlc pipeline adoption; the `writing-*` skills recognize seed markers as
  fill targets; CI now runs the checker suite + self-gate on macOS as well as Linux.
- **[0.13.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.13.0)** (2026-07-07) —
  review-hardening + loop economics: checker fixes (git anchored to the spec's repo, whole-word
  proof types, shallow-clone hints), CI, one checker-resolution rule for non-Claude-Code
  harnesses, runtime-corpus de-leak, spec-tree pruned to exemplars, a five-minute example run;
  build runs the bar once per task against the staged snapshot, reviewers read instead of
  re-running, subagent I/O moves through files both ways, model tiering by default; a
  rules-ratchet convention; linear-sync's ship mapping drops the nonexistent Linear project
  state; plan sizes compile blast radius at plan time.
- **[0.12.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.12.0)** (2026-07-06) —
  spec trees live under `docs/specs/` (back-compat: existing root `specs/` repos keep theirs);
  `writing-repo-docs` produces the front-door README too (by the `writing-readmes` method);
  gate invocation simplified to `/empanel:gate`; runtime-corpus denoise.
- **[0.11.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.11.0)** (2026-07-06) —
  standalone single-plugin repo: flattened layout, marketplace `agent-sdlc`, review-gate removed
  (now [Empanel](https://github.com/smarzban/empanel)), `ship` invokes `/empanel:gate`.
- **[0.10.1](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.10.1)** (2026-07-06) —
  diagnosability + discipline: `sdlc-check` stamps its version; green-bar reading discipline
  (direct exit codes, machine-readable reporters); ship parks only with the reviewed head pushed.
- **[0.10.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.10.0)** (2026-07-05) —
  evidence-gated techstack (runnable probes), mid-build plan amendments, harness-captured
  per-task green-bar evidence, the light authoring tier, spec-lifecycle policy.
- **[0.9.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.9.0)** (2026-07-05) —
  documentation skills split by depth: `writing-repo-docs` (essentials) + new
  `writing-technical-docs` (full internals under a coverage-ledger contract).
- **[0.8.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.8.0)** (2026-07-04) —
  enforcement hardening: structured external-component declarations, recorded-commit ledger↔git
  rule, build roster pinning + subagent-death policy, checker grammar documented in the skills.
- **[0.7.0](https://github.com/smarzban/agent-sdlc/releases/tag/agent-sdlc-v0.7.0)** (2026-07-03) —
  the enforcement spine: `sdlc-check` (zero-dep checker; trace, coverage, evidence, proof-map
  rules) wired into gate, build, and ship; the terminal AC→proof `verification-report.md`.

Earlier versions (≤ 0.6.0) predate the tagged-release model; their history is in the git log.
