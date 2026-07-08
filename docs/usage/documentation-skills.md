# The documentation skills

Three standalone skills outside the pipeline spine, for the downstream job of documenting what you
build. They work on any repo, independent of an Agent SDLC run. All three are source-grounded —
every concrete claim (a command, a default, an env var, a path) is verified against the actual
code before it's written — and each adapts its structure to the repo's type instead of imposing a
template.

They split by depth:

| Skill | Depth | Produces |
| --- | --- | --- |
| [`writing-readmes`](../../skills/writing-readmes/SKILL.md) | The front door | A `README.md` that leads with what/why, keeps a lean quickstart distinct from full install, and links out to deeper docs instead of inlining them. |
| [`writing-repo-docs`](../../skills/writing-repo-docs/SKILL.md) | The essentials | The docs a repo needs to be usable and contributable: landing index, quickstart, install, per-feature usage, running-it-locally dev setup, contributing + community-health files — plus at most one light architecture overview. |
| [`writing-technical-docs`](../../skills/writing-technical-docs/SKILL.md) | The internals | Maintainer-grade docs: architecture with design rationale, data models, per-subsystem invariants, the security model, and a complete module/API reference under a coverage-ledger contract (every exported symbol documented or explicitly excluded with a reason). |

## Choosing

- README unclear, missing, or grown into a docs dump → `writing-readmes`.
- "Document this repo" / install/usage/contributing docs → `writing-repo-docs`. A library's
  public-API reference belongs here (consumers are programmers, so the public API *is* usage).
- Architecture rationale, internals, a complete symbol-level reference → `writing-technical-docs`,
  after the essentials exist (or standalone when only maintainer docs are needed).

They chain naturally: front door → essentials → internals, each linking down rather than
duplicating. All three share hard guardrails: never invent owner decisions (a license, a security
policy, a code of conduct), and never ship an unverified claim — the verification pass (link check,
fact check, command check) is part of the method, not optional.

Invoke explicitly with `/agent-sdlc:writing-readmes`, `/agent-sdlc:writing-repo-docs`, or
`/agent-sdlc:writing-technical-docs` — or just ask ("write the docs for this repo") and the right
one triggers.

This `docs/` tree and the root `README.md` were produced by these skills — the repo dogfoods its
documentation the way it dogfoods its pipeline.

## See also: `repo-setup`

A fourth standalone skill, [`repo-setup`](repo-setup.md), is the **machinery** counterpart of these
three. It scaffolds a repo's operational baseline — the public/private agent-instruction split,
gitignore/CI/templates/CODEOWNERS — and leaves marked skeletons for these skills to fill:
`repo-setup` stubs, the `writing-*` skills fill.
