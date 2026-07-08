# Seed templates — canonical content for every file repo-setup materializes

These fenced blocks are the single source of truth for seeded-file content; the skill body
(`SKILL.md`) never restates it. Materialization = extract the fenced block verbatim, adapting only
clearly-marked `<placeholders>` (project name, stack list, toolchain, etc.) — no other rewording.

No literal `AGENTS.md`/`CLAUDE.md` files live in this plugin tree: a harness working inside
`skills/repo-setup/` could auto-load a real one. Fencing keeps every seeded file one explicit
extraction step away from the plugin's own tree.

**Seed token:** the canonical string is `repo-setup:seed`, always spelled exactly so, wrapped in
the file's native comment syntax. Recommended wrapper text: `repo-setup:seed — skeleton awaiting
real content; fill, then remove this line`. A block's heading declares **awaiting-fill** (carries
the token somewhere in its body) or **complete-at-seed** (no token; nothing left to fill).

Harness facts the AGENTS.md/CLAUDE.md/AGENTS.local.md templates below rely on are recorded in
[harness-loading.md](harness-loading.md) — not restated here.

## AGENTS.md

Seed status: mixed — the routing guideline is **complete-at-seed**; the body sections below it are
**awaiting-fill** (each carries the token).

```markdown
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

<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
<placeholder: one paragraph — what this repo is and does>

## Build / test / verify

<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
- Build: <placeholder>
- Test: <placeholder>
- Canonical verify (the one documented green-bar command): <placeholder>

## Conventions

<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
<placeholder: commit style, branch flow, code-style pointers>
```

## CLAUDE.md

Seed status: **complete-at-seed** — exactly one content line; nothing to fill, ever.

```markdown
<!-- Frozen pointer: content belongs in AGENTS.md or AGENTS.local.md, never here. -->
@AGENTS.md
```

## AGENTS.local.md

Seed status: **awaiting-fill** (carries the token).

```markdown
<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
# AGENTS.local.md

Personal, machine-specific, and cross-project instructions for this working copy only — never
committed, never seen by anyone else's clone. If an instruction would make sense to a stranger who
cloned this repo, it belongs in AGENTS.md instead, not here.

<placeholder: personal directives, local paths, cross-project notes>
```

## .gitignore

Seed status: **awaiting-fill** — the `AGENTS.local.md` entry itself is complete-at-seed; the
stack-derived section carries the token.

```gitignore
# AGENTS.local.md is the private, per-working-copy overlay — never committed.
AGENTS.local.md

# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
# <stack-derived ignores: build output, dependency directories, local env files>
```

## .gitattributes

Seed status: **awaiting-fill** (carries the token where the stack must decide).

```gitattributes
* text=auto eol=lf

# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
# <stack-derived rules: binary paths, linguist-vendored/generated, diff drivers>
```

## .editorconfig

Seed status: **awaiting-fill** (carries the token where the stack must decide).

```editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
# <stack-derived per-language overrides: indent_style, indent_size>
```

## CI workflow skeleton

Seed status: **awaiting-fill** — harness-neutral shape only (checkout → setup toolchain → run the
canonical verify command); the skill fills specifics from the real toolchain at run time.

```yaml
name: CI

# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
on:
  push:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # repo-setup:seed — skeleton awaiting real content; fill, then remove this line
      - name: Set up toolchain
        run: echo "<placeholder: pin the real toolchain setup action + version>"

      # repo-setup:seed — skeleton awaiting real content; fill, then remove this line
      - name: Verify
        run: echo "<placeholder: the repo's single canonical green-bar command>"
```

## Issue template

Seed status: **awaiting-fill** — minimal skeleton; the concrete content is an owner decision.

```markdown
---
name: Bug report
about: Report a problem
---

<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
<placeholder: owner-decided issue template body>
```

## Pull request template

Seed status: **awaiting-fill** — minimal skeleton; the concrete content is an owner decision.

```markdown
<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
## Summary

<placeholder: owner-decided PR template body>

## Test plan

<placeholder>
```

## CODEOWNERS

Seed status: **awaiting-fill** — minimal skeleton; the concrete assignments are an owner decision.

```
# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
# Owner decision — assign paths to reviewers, e.g.:
# *       @owner
```

## README stub

Seed status: **awaiting-fill** — one line only; full content is `writing-readmes`'s job, not this
skill's.

```markdown
<!-- repo-setup:seed — skeleton awaiting real content; fill via the writing-readmes skill -->
# <project name>
```
