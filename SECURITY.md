# Security policy

## Reporting a vulnerability

Please report suspected vulnerabilities **privately** via GitHub's private vulnerability
reporting: **[Report a vulnerability](https://github.com/smarzban/agent-sdlc/security/advisories/new)**
(Security tab → Report a vulnerability). If that path is unavailable to you, email
`git@smarzban.com`.

Please do not open public issues for security reports.

## Scope

The security-relevant surface of this repo is small and deliberate:

- **`checker/sdlc-check.mjs` + `bin/sdlc-check`** — the one executable. It is read-only by
  design: it parses spec/ledger/report text and reads git facts; it never executes commands from
  the artifacts it checks (declared green-bar commands are treated as text). A change that makes
  the checker execute artifact-declared content would be a vulnerability — report it.
- **The skills** (`skills/*/SKILL.md`) are instructions executed by an AI agent in *your*
  environment. They instruct agents to run builds/tests in your repo — review them like any
  instruction file you hand an agent. Prompt-injection-style issues in skill text (wording that
  could steer an agent into unsafe actions) are in scope for reports.

## Supported versions

The latest release (see [Releases](https://github.com/smarzban/agent-sdlc/releases)) is the
supported version; fixes ship as new releases, not backports.
