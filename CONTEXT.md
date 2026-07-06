# CONTEXT.md — glossary

Canonical vocabulary for this repo's spec chain. Glossary only — no implementation detail.

- **enforcement spine** — the deterministic layer (`sdlc-check` + terminal AC verification) that
  verifies agent-sdlc's mechanical promises with trusted code instead of agent self-assertion.
- **sdlc-check** — the dependency-free checker script committed inside the agent-sdlc plugin;
  parses the consolidated spec and verifies trace, coverage, ledger-vs-git, green-bar evidence,
  and provenance markers. Reports; never edits.
- **AC → proof map** — the ship-produced table mapping each acceptance criterion to the named
  passing test(s) or the answered reviewer check that proves it; published in the PR body.
- **green-bar evidence** — captured output of the declared green-bar command proving it ran and
  passed, as opposed to a ledger assertion that it did; captured as a fenced command + output
  block in the build ledger.
- **verification report** — the ship-written report file beside the spec
  (`docs/specs/<feature>/verification-report.md`) holding the AC → proof map; validated by
  `sdlc-check`, copied into the PR body.
