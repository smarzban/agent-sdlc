# Changelog

The authoritative release notes live on
[GitHub Releases](https://github.com/smarzban/agent-sdlc/releases) — one release per version,
cut with a plugin-scoped tag (`agent-sdlc-vX.Y.Z`). This file is the one-line index.

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
