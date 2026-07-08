# Migration — adopting the split on a repo that already has rich instructions

The common non-empty case: a repo already carries real agent-instruction content in a
non-conforming file — a single populated `CLAUDE.md`, an `AGENTS.md` that mixes public and private
notes, or a private file under a name no harness auto-loads. The audit reports this as **drifted**
(the file exists but violates the split's contract). The remedy is a **migration**, not a stub:
re-home the existing content into the split. Seeding an empty skeleton over real orientation
destroys it — the one outcome this skill must never produce.

Migration is the single place this otherwise-prose-free skill handles existing prose: it **moves**
content, never authors it. Every line that lands in the split already existed; nothing is written
from scratch (that stays the `writing-*` skills' job).

## Procedure

1. **Read the existing file in full.** It is the source of truth for what the repo's agents already
   know — treat it as content to preserve, not noise to replace.
2. **Triage every line by the stranger litmus test** — *would this make sense to a stranger who
   cloned this repo?* Yes → public, destined for `AGENTS.md`'s body sections. No (local paths,
   personal workflow, machine specifics, private context) → `AGENTS.local.md`.
3. **Re-home, don't rewrite.** Move each line to its side of the split verbatim (light reordering
   into the seeded section headings is fine). Adding, deleting, or rewording content is out of
   scope — that is a `writing-*` task, offered separately.
4. **Establish the pointer chain.** `CLAUDE.md` becomes the frozen one-line pointer; `AGENTS.md`
   imports `AGENTS.local.md`. Confirm the chain loads (the `reference/verification.md` probes prove
   it).
5. **De-leak the now-public half before it is committed** (see the checklist below) — this is the
   highest-risk step and gates the migration.

## The gitignored → tracked `CLAUDE.md` flip (privacy-sensitive — always flag)

In the standard model `CLAUDE.md` is a **committed** pointer and `AGENTS.local.md` is
**gitignored**. A repo that kept its instructions in a **gitignored `CLAUDE.md`** runs the inverted
model: adopting the split flips `CLAUDE.md` from ignored → **tracked** (its content becomes public)
and moves the private material into a newly-gitignored `AGENTS.local.md`.

That flip means **a file that was private becomes public**. Never perform it as a silent side
effect of materialization: call it out explicitly in the audit — name the file, state that its
content will become world-readable once committed, and require the owner's confirmation. On a public
repo this is the moment a leak happens if it is going to.

## Privacy de-leak checklist (run before the public half is committed)

Splitting demands triaging content into public vs private; the public half then enters git history
permanently. Scan the working tree **and** the staged blob (`git show :AGENTS.md`) for each of these
before the commit — grep, don't eyeball:

- **Local absolute paths** — `/home/...`, `/Users/...`, `~/...`, machine or user names in paths.
- **Private tool / project / codenames** — internal names not meant to be public.
- **Personal data** — maintainer email, real names where unwanted, any PII.
- **Internal tracker references** — issue IDs, board/project URLs, ticket links.
- **External-mirror URLs** — links to a private wiki, doc, or dashboard the repo mirrors to.
- **Secrets** — tokens, keys, credentials, internal hostnames (these should never be in any
  instruction file, but the migration is the moment to catch a legacy one).

Anything that trips the scan is private → route it to `AGENTS.local.md`, not `AGENTS.md`. When in
doubt, it is private. Report the scan result in the audit so the owner can see it ran.

## External-mirror coupling (ask; the skill cannot detect it)

The file being restructured may be **mirrored elsewhere** — a wiki page, an issue-tracker document,
a shared doc — sometimes under an explicit keep-in-sync rule. Nothing in the repo reveals this, so
the skill cannot know. Ask the owner once: *is this instruction file mirrored anywhere that must be
kept in sync?* If yes, the split has to be reflected in the mirror too — flag it as a follow-up; do
not attempt to reach the mirror.
