---
name: repo-setup
description: "Use when setting up a new repo or auditing an existing one for the operational baseline: the agent-instruction set (a public AGENTS.md plus a gitignored AGENTS.local.md private overlay, wired through a frozen CLAUDE.md pointer for Claude Code and read natively or via a prose pointer by other harnesses), gitignore/gitattributes/editorconfig, a CI skeleton, issue/PR templates, CODEOWNERS, a canonical verify command, and a README stub — machinery and marked skeletons, never prose. On a repo that already carries rich agent-instructions (e.g. a populated CLAUDE.md), it migrates them into the split rather than stubbing over them. The machinery counterpart of the writing-* docs skills: this skill stubs, they fill. Triggers: \"set up this repo\", \"repo setup\", \"scaffold the repo\", \"bootstrap the repo\", \"agent instructions setup\", \"AGENTS.md setup\", \"migrate CLAUDE.md to AGENTS.md\". Scope: standalone scaffolding for any repo, independent of the Agent SDLC pipeline — it materializes machinery and skeletons, not code review, code-quality audits, or evaluation."
---

# Repo setup: machinery and marked skeletons

Take a repo — empty or existing — to a sound operational baseline: the machinery and marked
skeletons that make it workable for humans and agents alike, plus the public/private split for
agent instructions. This phase never writes prose. It stubs; the `writing-*` skills fill.

<HARD-GATE>
An audit of the full target surface — each item reported present / missing / drifted — precedes
every create/modify step, on any repo state (an empty repo just degenerates to all-missing; the
procedure does not branch). No existing target file is ever replaced wholesale: read it, diff it
against the seed template, and surface the proposed change in the same offer. Owner-decision items
(LICENSE, security policy, code of conduct, issue/PR template content, CODEOWNERS assignments,
remote-settings values) are flagged or asked, never invented. Remote settings are propose-only —
state the exact value, never mutate it. The agent-sdlc pipeline half is asked exactly once, and its
artifacts exist only after an explicit yes. Do NOT write README/CONTRIBUTING/SECURITY/CHANGELOG/
usage content, or any dev-environment onboarding walkthrough — that is the `writing-*` skills' job
against the skeletons this skill leaves behind.
</HARD-GATE>

## Checklist (do in order)

1. **Audit the universal target surface** — enumerate all eleven seeded files: `AGENTS.md`,
   `CLAUDE.md`, `AGENTS.local.md`, `.gitignore`, `.gitattributes`, `.editorconfig`, the CI workflow
   skeleton, the issue template, the PR template, `CODEOWNERS`, and the README stub. Judge each
   against its **contract** (`reference/templates.md`'s block purpose), never against byte-identity
   with the raw template: report **present** (exists and satisfies its contract — for an
   awaiting-fill file, the seed token is gone and the required elements hold; a properly filled file
   is present, never drifted), **missing** (absent, OR an awaiting-fill file whose seed token is
   still there — report as "awaiting fill", offer nothing destructive), or **drifted** (exists but
   violates its contract: `AGENTS.md` lost one of its five routing-guideline elements, `CLAUDE.md`
   grew past its one-line pointer, `.gitignore` lost the `AGENTS.local.md` entry, or a
   template/`CODEOWNERS` file was emptied). On an empty repo every item is missing — same procedure,
   not a shortcut.
2. **Present the audit report** before proposing any change. Nothing is created or modified until
   the owner sees the full present/missing/drifted picture.
3. **Offer each missing item** — propose materializing it from the matching fenced block in
   `reference/templates.md`, adapting only the clearly-marked `<placeholders>` (project name, stack,
   toolchain) to the real repo. Never reword or add content beyond that. Owner-decision items (see
   step 5) are flagged or asked in the same offer, not auto-filled.
4. **Offer each drifted item** — read the existing file, diff it against the template, and propose
   an in-place update that surfaces exactly what would change. Never propose (or perform) a
   wholesale overwrite, even when the drift is large. **When the drifted file holds richer content
   than the seed** — an existing instruction file (e.g. a populated `CLAUDE.md`), not an empty
   stub — the update is a **migration**: re-home its content into the split (public → `AGENTS.md`,
   private → `AGENTS.local.md`), never seed an empty skeleton over it. See
   [`reference/migration.md`](reference/migration.md) for the procedure, the gitignored→tracked
   `CLAUDE.md` flip call-out, the privacy de-leak checklist, and external-mirror coupling.
5. **Hold the line on owner decisions** — LICENSE, security policy, code of conduct, issue/PR
   template content, `CODEOWNERS` assignments, and any remote-settings value (branch protection,
   repo metadata) are never fabricated. LICENSE absence is flagged, never invented (the
   `writing-readmes` rule — cite it). Remote settings are proposed as exact values for the owner to
   apply; this skill never mutates them. **`CODEOWNERS` exception for a single unambiguous owner:**
   when the repo has exactly one owner (a sole committer / the repo owner), propose the obvious
   `* @<owner>` line for confirmation — proposing the one obvious assignment for the owner to
   confirm is not inventing. Assigning *other* people, or guessing among several candidates, still
   is: flag it, don't fabricate.
6. **Materialize only on confirmation** — create or modify strictly what the owner confirmed from
   the audit/offer above. Nothing else.
7. **Ask once about the pipeline half** — "set this repo up for the agent-sdlc pipeline too?" Ask
   this exactly one time, after the universal half is settled.
   - **No** → stop here. Zero pipeline artifacts.
   - **Yes** → audit the pipeline artifacts the same way (`.agent-sdlc/config.json`, the spec-tree
     location, `constitution.md`, `CONTEXT.md` — present/missing/drifted, offer, confirm), then
     materialize what was confirmed.
8. **Declare the seed token and the awaiting-fill list** in the report: the canonical token is
   `repo-setup:seed`. It appears in `AGENTS.md` (body sections only — the routing guideline itself
   is complete-at-seed), `AGENTS.local.md`, `.gitignore`, the CI workflow skeleton, the issue
   template, the PR template, `CODEOWNERS`, and the README stub — 8 of the 11 seeded files. Three
   are complete-at-seed and never carry it: `CLAUDE.md` (exactly one line, forever) and
   `.gitattributes`/`.editorconfig` (self-sufficient baselines — no `writing-*` skill fills
   machinery; stack rules are an optional owner extension, not an awaiting-fill obligation).
9. **Report** what was created, what was updated in place (with the surfaced diff), what remains
   flagged as an owner decision, and — if opted in — the pipeline artifacts created or flagged.

## Principles

- **Audit before act, unconditionally.** The report precedes creation on every repo state, including
  the degenerate all-missing case. There is no fast path around it.
- **No blind overwrite.** Existing files are read, diffed, and updated in place with the change
  surfaced — never replaced wholesale, regardless of how stale they are.
- **Migrate, don't stub, over existing content.** A drifted instruction file richer than the seed
  is re-homed into the split (content moved, never authored) — never overwritten with an empty
  skeleton. Splitting a formerly-private file into a public `AGENTS.md` is privacy-sensitive: flag
  the flip and de-leak the public half before it is committed (`reference/migration.md`).
- **Owner decisions are never invented.** LICENSE, security policy, code of conduct, template
  content, CODEOWNERS assignments, and remote-settings values are the owner's call; this skill flags
  or asks, and stops there.
- **Remote settings are propose-only.** Branch protection and repo metadata: state the exact value
  proposed, never mutate it.
- **One ask for the pipeline half.** Never assumed, never asked twice.
- **Machinery, not prose.** Skeletons only; `writing-repo-docs` and `writing-readmes` fill the
  content — their own trigger lists are the hand-off point, not this skill's business.
- **Single source of truth for seed content.** Every seeded file's canonical content lives in
  `reference/templates.md`; this skill body never restates it.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "The repo's empty, I can just create everything without auditing first." | The audit still runs — it just degenerates to all-missing. The procedure never branches on repo state. |
| "This file already looks fine, I won't mention it in the report." | Existing files are read and checked every time; drift (or its absence) is surfaced regardless of whether a change is proposed. |
| "I'll just rewrite the file to match the template, it's simpler than diffing." | No blind overwrite. Read it, diff it, offer the update in place — never replace wholesale. |
| "No LICENSE file, I'll pick MIT so we're not blocked." | Never invent a license or any owner decision. Flag it and move on. |
| "I'll just set branch protection while I'm in here, it's the obviously right setting." | Remote settings are propose-only. State the value; never mutate it. |
| "Setting up the pipeline half too is obviously useful, I'll just do it." | Ask once, explicitly. No pipeline artifact exists before a yes. |
| "I'll paste the AGENTS.md content into this file, it's handy to have it here." | Content lives in `reference/templates.md`, once. Restating it here is exactly the drift the single-source rule exists to prevent. |
| "Codex support would be stronger with an `AGENTS.override.md` too." | Never seed or recommend it — it shadows the public file instead of layering on it. |
| "The repo already has a rich CLAUDE.md, I'll seed the standard AGENTS.md alongside it." | If that file holds real orientation, an empty skeleton destroys it. Migrate the content into the split; don't stub over it (`reference/migration.md`). |
| "The old instruction file was gitignored, I'll just track the new AGENTS.md and move on." | That flips a private file to public. Flag the flip and de-leak the public half before committing — silent is how a leak ships. |

## Red flags (stop and fix)

- Any create/modify step reachable before the audit report is presented.
- A file replaced wholesale instead of read → diffed → offered as an in-place update.
- An existing rich instruction file stubbed over with an empty seed skeleton instead of migrated —
  destroying orientation the repo already had (`reference/migration.md`).
- A gitignored→tracked `CLAUDE.md` flip, or any formerly-private content becoming public, performed
  without an explicit privacy call-out and de-leak scan in the audit.
- LICENSE, security policy, code of conduct, template content, CODEOWNERS assignments, or a
  remote-settings value invented rather than flagged or asked.
- The pipeline question asked more than once, or a pipeline artifact created without an explicit
  yes.
- Seed content duplicated in this SKILL.md instead of linked from `reference/templates.md`.
- `AGENTS.override.md` seeded or recommended.
- A per-harness shim beyond `CLAUDE.md` seeded by default (e.g. an `opencode.json` `instructions`
  entry) — that is documented optional hardening, never seeded.
- Dev-environment onboarding content, or any `writing-*` deliverable (README body beyond the
  stub, install/usage docs, CONTRIBUTING/SECURITY/CHANGELOG/`llms.txt` content) written by this
  skill instead of stubbed for `writing-*` to fill.

## Done when

- The audit report was presented before any file was touched, covering the full target surface
  (universal half, plus the pipeline half if opted in) with a present/missing/drifted verdict per
  item.
- Every materialization is confirmed and drawn from `reference/templates.md`'s fenced blocks, with
  only the marked `<placeholders>` adapted.
- No owner-decision item was invented; each was flagged, asked, or confirmed by the owner.
- The pipeline half was asked exactly once, and its artifacts exist only if the answer was yes.
- The report names the seed token and the awaiting-fill file list, matching
  `reference/templates.md`'s declarations exactly.

## The artifact (output)

- **The report to the owner** — the audit table (present/missing/drifted, one row per target-surface
  item), the create/update offers with each proposed change, owner decisions flagged or asked, the
  `repo-setup:seed` token declaration + the awaiting-fill file list, and — if the pipeline question
  was asked — its answer and resulting artifacts (or their absence).
- **The materialized files themselves**, drawn only from `reference/templates.md`, at the paths each
  file conventionally occupies in a repo root.

## Conventions

- Seed content lives in [`reference/templates.md`](reference/templates.md); this skill never
  restates it — link, don't duplicate.
- Harness facts the templates rely on — what actually loads `AGENTS.md` / `AGENTS.local.md` /
  `CLAUDE.md` per harness, and each harness's limitations — live in
  [`reference/harness-loading.md`](reference/harness-loading.md).
- The end-to-end regression procedure for the templates — a maintainer/build-time proof, not a
  per-invocation step of this skill — lives in
  [`reference/verification.md`](reference/verification.md).
- Migrating a repo that already has rich agent-instruction content into the split — the procedure,
  the gitignored→tracked flip call-out, the privacy de-leak checklist, and external-mirror
  coupling — lives in [`reference/migration.md`](reference/migration.md).
- **Target scope:** operates on the current working directory unless given an explicit target path.
  Confirm the target with the owner before acting on a self/special repo (the one hosting this
  skill, or one whose setup is deliberately non-standard) rather than assuming.
- The seed token is exactly `repo-setup:seed`, spelled identically everywhere it appears.
- A seed-marked stub is a fill-target for `writing-repo-docs` / `writing-readmes`, never a
  placeholder violation — that is the hand-off point between the two skill families, not overlap.
- Standalone: independent of the Agent SDLC pipeline. The pipeline half is opt-in within a single
  run of this skill, not a separate invocation.
