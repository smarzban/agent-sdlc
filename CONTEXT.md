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
- **public agent file** — the committed `AGENTS.md` at a repo's root: harness-neutral agent
  instructions whose content must be repo-relevant and stranger-readable; carries the routing
  guideline and the pointer to the local overlay.
- **local overlay** — the gitignored `AGENTS.local.md` beside the public agent file: private
  per-working-copy instructions (personal, machine-specific, cross-project), loaded mechanically
  by Claude Code via the import chain and by other harnesses via the prose pointer in the public
  agent file.
- **pointer file** — a frozen one-line shim that routes a harness to the public agent file or
  local overlay (e.g. `CLAUDE.md` = `@AGENTS.md`); never accumulates content and says so in-file.
- **seed marker** — the canonical greppable token (`repo-setup:seed`) repo-setup leaves in
  skeleton files it creates, embedded in each file type's native comment syntax; distinguishes
  "seeded, awaiting fill" from a forgotten TODO and is the contract by which the writing-* skills
  find and fill setup's stubs.
- **visual aid** — a picture the front-half thinking stages produce instead of prose when a
  question is better seen than read; either a spec diagram or a scratch visual. A tool, not a
  mode: producing one never commits the stage to producing more.
- **the visual test** — the per-question heuristic deciding whether to draw at all: *would the
  user understand this better by seeing it than reading it?* A question merely *about* a visual
  topic is not automatically a visual question.
- **spec diagram** — the visual aid expressed in the spec's own text, inline in the spec:
  committed, diffable, and evidence for free because it rots visibly beside the prose it
  describes. The keep-it form ("if the picture is worth keeping, it is a spec diagram").
- **scratch visual** — the visual aid rendered as a standalone page the user opens, for
  comparisons a spec diagram cannot express: throwaway, never committed, and offered for consent
  before first use because it spends tokens and sends the user out of the terminal.
