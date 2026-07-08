# Changelog

The authoritative release notes live on
[GitHub Releases](https://github.com/smarzban/agent-sdlc/releases) — one release per version,
cut with a plugin-scoped tag (`agent-sdlc-vX.Y.Z`). This file is the one-line index.

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
