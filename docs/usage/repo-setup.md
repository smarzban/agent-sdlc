# repo-setup

Take a repo — empty or existing — to a sound operational baseline: the machinery and marked
skeletons that make it workable for humans and agents alike. It is the machinery counterpart of the
[documentation skills](documentation-skills.md) — `repo-setup` **stubs**, the `writing-*` skills
**fill** — and it writes no prose itself. Standalone: independent of the pipeline. Authoritative
method: [`skills/repo-setup/SKILL.md`](../../skills/repo-setup/SKILL.md).

Invoke with `/agent-sdlc:repo-setup`, or just ask ("set up this repo", "AGENTS.md setup").

## Audit first, always

Every run starts by auditing the full target surface **before** anything is created or modified — on
any repo state (an empty repo just degenerates to all-missing; the procedure never branches). Each
item is reported:

- **present** — exists and satisfies its contract (for an awaiting-fill file, the seed token is gone
  and the required elements hold);
- **missing** — absent, or an awaiting-fill stub whose seed token is still there ("awaiting fill");
- **drifted** — exists but violates its contract (e.g. `CLAUDE.md` grew past its one line, or
  `.gitignore` lost the `AGENTS.local.md` entry).

No existing file is ever overwritten wholesale: it is read, diffed against the seed template, and
the exact change is surfaced in the offer.

**Migration, not stubbing, for a repo that already has rich instructions.** When a drifted file
holds real content — a populated `CLAUDE.md`, or an instruction file richer than the seed —
`repo-setup` **migrates** it into the split (public lines → `AGENTS.md`, private →
`AGENTS.local.md`) rather than seeding an empty skeleton over it. If the existing file was a
*gitignored* `CLAUDE.md`, adopting the standard flips it ignored→tracked (its content becomes
public); that flip is called out explicitly and the public half is de-leaked (local paths, private
names, internal issue IDs, external-mirror URLs) before it is committed.

## The eleven seeded files

`AGENTS.md`, `CLAUDE.md`, `AGENTS.local.md`, `.gitignore`, `.gitattributes`, `.editorconfig`, a CI
workflow skeleton, an issue template, a PR template, `CODEOWNERS`, and a README stub. Content is
adapted only at the clearly-marked `<placeholders>` (project name, stack, toolchain) — never
reworded.

## The seed token

The canonical marker is `repo-setup:seed`, wrapped in each file's native comment syntax
(`repo-setup:seed — skeleton awaiting real content; fill, then remove this line`). It marks a stub
as a fill-target — the hand-off point the `writing-*` skills recognize, not a placeholder
violation. It appears in 8 of the 11 files. Three are **complete-at-seed** and never carry it:
`CLAUDE.md` (exactly one line, forever) and `.gitattributes`/`.editorconfig` (their baselines are
self-sufficient — no `writing-*` skill fills machinery; stack-specific rules are an optional owner
extension, not an awaiting-fill obligation).

## The agent-instruction split

The load-bearing pattern `repo-setup` establishes:

- **`AGENTS.md`** — committed, public: a routing guideline + an `@AGENTS.local.md` import + the
  awaiting-fill body sections (project overview, build/test/verify, conventions).
- **`AGENTS.local.md`** — gitignored, private per-working-copy overlay. Created lazily; the
  committed `.gitignore` entry self-propagates the pattern to every clone.
- **`CLAUDE.md`** — a frozen one-line pointer (`@AGENTS.md`, plus a self-label comment) so Claude
  Code loads the whole chain; edits go to the other two, never here.

The **stranger litmus test** routes content: would this instruction make sense to a stranger who
cloned the repo? If no, it belongs in `AGENTS.local.md`. Other harnesses read `AGENTS.md` natively
or via a prose pointer; a per-harness shim beyond `CLAUDE.md` is documented optional hardening,
never seeded, and `AGENTS.override.md` is never seeded or recommended (it shadows the public file
instead of layering on it).

## Owner decisions it never invents

`LICENSE`, the security-report channel, the code of conduct, issue/PR template content, `CODEOWNERS`
assignments, and any remote setting (branch protection, repo metadata) are the owner's call —
flagged or asked, never fabricated. Remote settings are propose-only: it states the exact value,
never mutates it.

## The pipeline half (opt-in)

Asked exactly once, after the universal half is settled: "set this repo up for the agent-sdlc
pipeline too?" On **yes**, it audits and materializes the pipeline artifacts the same audit-first
way (`.agent-sdlc/config.json`, the spec-tree location, `constitution.md`, `CONTEXT.md`). On **no**,
zero pipeline artifacts are created.

## Hand-off

`repo-setup` leaves skeletons; the [documentation skills](documentation-skills.md) fill them —
[`writing-readmes`](../../skills/writing-readmes/SKILL.md) the README front door, and
[`writing-repo-docs`](../../skills/writing-repo-docs/SKILL.md) the essentials tree.
