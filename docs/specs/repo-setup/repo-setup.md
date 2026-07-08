# repo-setup

## Brief

*Shaped 2026-07-08 (idea stage). Settled intent and scope only — criteria, design, and plan are
later sections.*

### Problem / intent

Repos start (or limp along) without the operational skeleton that makes them workable for humans
AND agents: agent instruction files, gitignore, CI shell, templates, a declared green-bar command.
The `writing-*` skills produce the repo's prose; nothing produces its machinery. And there is no
first-class public/private split for agent instructions — personal directives ("Slack me when
done", cross-project paths) leak into committed files, or repo knowledge stays trapped in a
maintainer-local file.

`repo-setup` is a new standalone skill (the fourth sibling of the `writing-*` set) that takes a
repo — empty or existing — to a sound operational baseline of **machinery and marked skeletons**,
which the writing-* skills and future agents then fill.

### Scope & non-goals

**Two modes, one skill:**
- **Empty/near-empty repo** — create the full skeleton set.
- **Existing repo** — audit first: report what is missing or drifted, offer to create; check and
  update existing scaffolding, never blind-overwrite (the writing-repo-docs posture, applied to
  machinery).

**Creates (universal half):**
- **Agent-instruction set** — the core of the skill (see Chosen approach): committed `AGENTS.md`
  (public agent file) + frozen `CLAUDE.md` pointer + gitignored `AGENTS.local.md` (local overlay,
  seeded here; other clones create it lazily per the baked-in rule) + gitignore entry.
- `.gitignore` derived from the actual stack; `.gitattributes`; `.editorconfig`.
- CI workflow skeleton derived from the real toolchain.
- Issue/PR templates (owner decision, owned here; writing-repo-docs refines existing ones and only
  offers creation when setup never ran).
- CODEOWNERS (owner decision).
- A canonical verify command (single documented green-bar entry point in the stack's task runner).
- README stub — one marked seed line deferring to writing-readmes.
- LICENSE: flag/owner decision, never invent (the writing-readmes rule).

**Creates (pipeline half, opt-in within the run):** asked once — "set up for the agent-sdlc
pipeline too?" If yes: `.agent-sdlc/config.json`, spec-tree location, `constitution.md` +
`CONTEXT.md` seeds.

**Non-goals:**
- Dev-environment onboarding (clone → green tests) — that is `docs/development.md`'s job, an agent
  following it.
- Prose/docs content — installation, usage, CONTRIBUTING, SECURITY, CHANGELOG, `llms.txt` stay
  owned by the writing-* skills; setup stops at skeletons.
- Devcontainers/dotfiles-grade tooling — flag, don't build.
- Remote settings (branch protection, repo metadata) — propose-only, never mutate.
- Codex `AGENTS.override.md` — never seeded; it shadows the public file rather than appending
  (verified in codex source); documented as a don't.

### Chosen approach

**Machinery/prose boundary:** setup owns machinery and skeletons; writing-* skills own prose and
fill what setup stubbed. Skeletons carry a canonical greppable **seed marker** distinguishing
"seeded, awaiting fill" from a forgotten TODO — the contract that keeps writing-repo-docs's
no-placeholder red flag from colliding with setup's stubs, and what makes audit mode cheap
(missing = file absent OR marker still present).

**Agent-instruction design — one content pair, layered loading:**
- Content lives in exactly two files: `AGENTS.md` (public: repo-relevant, stranger-readable) and
  `AGENTS.local.md` (private: per-working-copy, gitignored). Everything else is a frozen one-line
  pointer that never accumulates content and says so in-file.
- `AGENTS.md` bakes in the routing guideline both ways: the litmus test ("would this make sense to
  a stranger who cloned the repo? no → AGENTS.local.md") plus a prose pointer + `@AGENTS.local.md`
  line. The `@` line is a mechanical import for Claude Code and, wrapped in the prose sentence, a
  prompt-level import any AGENTS.md harness (Codex, Cursor, OpenCode) follows by reading the file.
  The guideline includes the lazy-creation rule: an agent with private-routed content and no
  `AGENTS.local.md` creates it (the committed gitignore entry already covers it) — the pattern
  self-propagates to every clone, not just the working copy setup ran in.
- Harness-pointer principle: one universal mechanism (the prose pointer) plus a dedicated pointer
  file ONLY where a harness cannot read `AGENTS.md` at all (Claude Code → `CLAUDE.md`). No
  per-harness shims otherwise; OpenCode's deterministic option (`opencode.json`
  `"instructions": ["AGENTS.local.md"]`, missing files silently skipped — verified in source) is
  documented as optional hardening, not seeded.
- Claude Code chain verified empirically 2026-07-08 (live CLI, headless fixtures):
  `CLAUDE.md → @AGENTS.md → @AGENTS.local.md` expands recursively, and a missing
  `AGENTS.local.md` is silently skipped (undocumented behavior; fallback if it ever regresses = a
  gitignored `CLAUDE.local.md` = `@AGENTS.local.md` shim, dropped from this design as redundant).

**Alternatives considered:**
- *Dev-env onboarding as the skill's meaning* — rejected: duplicates `development.md`.
- *Pipeline setup as a separate skill or inside getting-started* — folded in as the opt-in half
  instead; one setup entry point.
- *`CLAUDE.local.md` as the private file* — superseded: Claude-only; the harness-neutral
  `AGENTS.local.md` + import chain covers Claude Code deterministically and other harnesses via
  the prose pointer.
- *Cursor/Codex private-side workarounds* — rejected: seed only officially supported mechanisms;
  the limitation is documented instead.

### Resolved key decisions

1. Scope = greenfield scaffolding + opt-in agent-sdlc adoption (A+C); dev-env onboarding (B)
   rejected.
2. Standalone skill, pipeline-independent, like the writing-* trio; pipeline half is opt-in within
   the run.
3. Existing-repo mode audits and reports before creating; existing files are checked/updated, not
   skipped.
4. Issue/PR templates owned by setup; writing-repo-docs refines/offers-if-absent.
5. Seed marker convention is the setup↔writing-* contract (exact marker string = design-stage
   decision).
6. Agent content in exactly `AGENTS.md` + `AGENTS.local.md`; all other files frozen pointers,
   self-labelled.
7. Private overlay loads: Claude Code mechanically (verified import chain), every other harness
   via the baked-in prose pointer. Pointer files only where a harness cannot read `AGENTS.md`
   (Claude Code); the OpenCode instructions shim is documented optional hardening, not seeded.
8. `AGENTS.local.md` is seeded by setup in its working copy AND created lazily by any agent in any
   clone when private-routed content first appears (rule baked into the `AGENTS.md` guideline).
9. LICENSE/SECURITY/CoC/policy rules unchanged: owner decisions, never invented.

### Glossary terms touched

public agent file · local overlay · pointer file · seed marker (added to `CONTEXT.md`).

### ADRs

None — every decision above is reversible at the skill level; none meets the hard-to-reverse bar.

## Acceptance Criteria

*Written 2026-07-08. Autonomous run on the approved Brief (Saeed's word); recommended phrasings
adopted. Clarify-sweep sharpening: the Brief's two modes resolve to one **audit-first** procedure —
the audit always precedes creation, degenerating to "all missing" on an empty repo. "Target
surface" below = the Brief's creates-list (universal half + opt-in pipeline half).*

### Criteria

**AC-1** — Audit before act: on any repo state, the skill orders an audit of the target surface —
each item reported present / missing / drifted — before any file is created or modified.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does the skill
unconditionally sequence the audit report before every create/modify step? Justification: the
deliverable is an instruction document; a step-ordering constraint on agent behavior has no
runtime to automate against.)*

**AC-2** — No blind overwrite: the skill never instructs replacing an existing target file
wholesale; existing files are read, checked, and updated in place, with each proposed change
surfaced in the audit/offer.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is every
existing-file path through the skill read-then-update-with-offer, with no overwrite instruction?
Justification: same — instruction-document behavior, no runtime.)*

**AC-3** — Agent-instruction file set: materializing the skill's seeded agent-instruction files
into a fresh git repo yields exactly AGENTS.md, CLAUDE.md whose entire content is the one-line
AGENTS.md import, AGENTS.local.md, and a `.gitignore` under which `git check-ignore
AGENTS.local.md` exits 0 — and no other agent-instruction file.
*(Verification type: **test-backed** — manual (e2e fixture): materialize into a temp git repo,
assert the file set and the check-ignore exit code.)*

**AC-4** — Routing guideline content: the seeded AGENTS.md contains all of (a) the stranger
litmus test routing non-repo-relevant content to AGENTS.local.md, (b) the lazy-creation rule,
(c) the pointer-files-carry-no-content rule, (d) the prose pointer telling any agent to read
AGENTS.local.md when present, and (e) the `@AGENTS.local.md` import line.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: are all five
enumerated elements present in the seeded template? Justification: element presence is a judgment
on prose meaning, not string identity — a grep proves the `@` line but not (a)–(d).)*

**AC-5** — Overlay loads through the chain: with the seeded set in a fixture repo, a headless
Claude Code session surfaces distinctive content placed in both AGENTS.md and AGENTS.local.md.
*(Verification type: **test-backed** — manual (e2e fixture): token-recall probe, the 2026-07-08
method recorded in the Brief.)*

**AC-6** — Graceful absence: the same fixture with AGENTS.local.md removed runs a headless
Claude Code session with no instruction-file error or warning, still surfacing AGENTS.md content.
*(Verification type: **test-backed** — manual (e2e fixture): same probe, absent-file case.)*

**AC-7** — Seed marker: the skill defines exactly one canonical seed-marker string, and in the
fixture materialization a grep for that string lists exactly the seeded files that await later
fill — no awaiting-fill stub without it, no filled/frozen file with it.
*(Verification type: **test-backed** — manual (e2e fixture): grep over the materialized tree
against the skill's declared awaiting-fill list.)*

**AC-8** — Owner-decision discipline: every owner-decision item the skill touches (LICENSE,
security policy, code of conduct, issue/PR templates, CODEOWNERS, remote-settings values) is
flagged or asked with the decision left to the owner; none is fabricated.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does each
owner-decision item's path end in flag/ask, never in invented content? Justification: "fabricated
vs flagged" is a semantic judgment over the skill's instructions.)*

**AC-9** — Pipeline half is opt-in: the skill asks exactly once whether to set up the agent-sdlc
pipeline, and the pipeline artifacts (`.agent-sdlc/config.json`, spec-tree location,
`constitution.md` + `CONTEXT.md` seeds) are instructed only after an explicit yes.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: single ask, and no
pipeline artifact reachable on the no path? Justification: conversational-flow constraint in an
instruction document.)*

**AC-10** — Seed-marker recognition in writing-*: writing-repo-docs and writing-readmes each
state that a seed-marked stub is an intentional fill-target — filled, or reported as awaiting
fill — never a placeholder violation.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does each of the
two skills carry the recognition statement? Justification: cross-document prose contract.)*

**AC-11** — Template-ownership contract: writing-repo-docs's issue/PR-template behavior reads as
refine-existing, offering creation only when repo-setup never ran.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does the templates
bullet state exactly that precedence? Justification: prose contract in one document.)*

**AC-12** — Authoring conventions: `skills/repo-setup/SKILL.md` carries strict-YAML frontmatter
(name matching the directory; description ending with Triggers plus a standalone scope qualifier)
and the repo's body-section set in order.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: frontmatter parses
strict-YAML and the section skeleton matches the repo convention? Justification: no skill-lint
exists; adding one is out of scope (NC-5).)*

**AC-13** — Inventory surfaces: every user-facing skill inventory in the repo (front-door README,
docs landing page, and the marketplace description where it enumerates skills) lists repo-setup;
"lists" = the skill name appears in that surface's skill enumeration. The plan names the concrete
surface files.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: each named surface
enumerates repo-setup? Justification: which surfaces enumerate skills is editorial, not
mechanical.)*

**AC-14** — Harness-coverage honesty: the skill (or its seeded AGENTS.md) documents all three:
Cursor has no private per-repo mechanism; Codex users must not use `AGENTS.override.md` (it
shadows the public file); OpenCode deterministic loading is available as optional hardening via
its instructions config, not seeded.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: all three
statements present and accurate to the Brief's verified facts? Justification: accuracy-of-prose
judgment.)*

### Negative criteria (out of bounds — over-engineering is a violation)

**NC-1** — No dev-environment onboarding content (clone → green-tests walkthroughs); that is
`docs/development.md`'s job via writing-repo-docs.
**NC-2** — No writing-* deliverables written: no README body beyond the marked stub line, no
installation/usage docs, no CONTRIBUTING/SECURITY/CHANGELOG/llms.txt content.
**NC-3** — `AGENTS.override.md` is never seeded nor recommended.
**NC-4** — No remote setting is mutated (branch protection, repo metadata): propose-only.
**NC-5** — No executable/runtime component is added and the checker grammar is untouched.
**NC-6** — No per-harness shim beyond CLAUDE.md is seeded by default (no `opencode.json`).

### Verification map

| Criterion | Oracle kind / review axis |
| --- | --- |
| AC-1 | reviewer-checked — Spec Conformance |
| AC-2 | reviewer-checked — Spec Conformance |
| AC-3 | test-backed — manual (e2e fixture) |
| AC-4 | reviewer-checked — Spec Conformance |
| AC-5 | test-backed — manual (e2e fixture) |
| AC-6 | test-backed — manual (e2e fixture) |
| AC-7 | test-backed — manual (e2e fixture) |
| AC-8 | reviewer-checked — Spec Conformance |
| AC-9 | reviewer-checked — Spec Conformance |
| AC-10 | reviewer-checked — Spec Conformance |
| AC-11 | reviewer-checked — Spec Conformance |
| AC-12 | reviewer-checked — Spec Conformance |
| AC-13 | reviewer-checked — Spec Conformance |
| AC-14 | reviewer-checked — Spec Conformance |

*Reviewer-checked density note: 10 of 14 — accepted deliberately; the feature's product is
instruction prose, and each carries its justification. The four behavioral claims that CAN be
driven are test-backed via one fixture.*

### Deferred

None.

### Glossary terms touched

None new — public agent file, local overlay, pointer file, seed marker already pinned in
`CONTEXT.md` at the idea stage. "Target surface" is pinned inline above.

## Design

*Written 2026-07-08. Feature level, against the repo architecture in `docs/specs/overview.md`
(instruction documents at `skills/`, long material in `reference/` subdirs, no runtime — NC-5
keeps the enforcement spine untouched). Autonomous run; recommended shape adopted.*

### Components

1. **repo-setup skill** — the method document (`skills/repo-setup/SKILL.md`): audit-first
   procedure over the target surface, no-blind-overwrite rule, owner-decision discipline, the
   single pipeline opt-in ask, the seed-token declaration and the awaiting-fill list, authored to
   the repo's skill conventions. *Contract in:* a repo working tree in any state (untrusted).
   *Contract out:* an audit report (item → present/missing/drifted), then user-confirmed
   materializations drawn exclusively from the seed templates; errors = anything unresolvable is
   flagged to the owner, never guessed.
2. **seed templates** — reference document(s) under `skills/repo-setup/reference/` holding the
   canonical content of every seeded file as **fenced template blocks** (never literal
   `AGENTS.md`/`CLAUDE.md` files inside the plugin tree — a harness working in that subtree could
   auto-load them; the fenced-block shape makes seeding an explicit extraction). Single source of
   truth: the skill body never duplicates template content. Each block declares whether the
   materialized file carries the seed token (awaiting-fill) or is complete-at-seed. *Contract out:*
   the AGENTS.md template carries the five AC-4 elements; the CLAUDE.md template is exactly the
   one-line import; the AGENTS.local.md template is the what-belongs-here header.
3. **harness-loading reference** — reference document recording the verified loading facts the
   templates rely on: the Claude Code import chain and its graceful absence (with the 2026-07-08
   empirical method and the shim fallback if the undocumented skip ever regresses), Cursor's
   no-private-mechanism limitation, the Codex `AGENTS.override.md` shadowing don't, OpenCode's
   optional `instructions` hardening. *Contract out:* the accuracy source AC-14's statements are
   checked against.
4. **fixture verification procedure** — reference document scripting the manual e2e proof: extract
   templates into a fresh temp git repo, assert the exact file set + `git check-ignore
   AGENTS.local.md` (AC-3), token-recall headless probe present/absent (AC-5/AC-6), seed-token grep
   vs the declared awaiting-fill list (AC-7). *Contract out:* command sequences whose captured
   output is the build ledger's green-bar evidence for these ACs; failure semantics = any
   assertion mismatch blocks the task.
5. **writing-repo-docs skill (changed)** — existing skill, absorbing the cross-skill contract:
   seed-marked stubs are intentional fill-targets (fill or report, never a placeholder violation),
   and issue/PR-template behavior becomes refine-existing / offer-creation-only-when-repo-setup-
   never-ran.
6. **writing-readmes skill (changed)** — existing skill, absorbing the seed-marker recognition
   statement (a marked README stub is a fill-target, not a violation).
7. **inventory surfaces (changed)** — the user-facing skill enumerations: front-door `README.md`,
   `docs/` landing page, and both marketplace/plugin descriptions where they enumerate or count
   skills; each lists repo-setup with its standalone framing.

### Data flow and key state

Run-time (of the skill, in a user's repo): repo tree → audit inventory (ephemeral, presented) →
owner confirmations → files materialized from template blocks. The only persistent state is the
seeded files themselves; the seed token embedded in awaiting-fill files IS the state the writing-*
skills and audit re-runs read (missing = file absent OR token still present). The token is one
canonical string, `repo-setup:seed`, embedded in each file type's native comment syntax (the token
is the greppable invariant; the wrapper adapts — hash comments in gitignore/CI, HTML comments in
Markdown).

### Trust and failure boundaries

- **Untrusted input:** the target repo's existing content (audit reads it, never trusts it as
  correct — drift is reported) and its owner's answers (owner-decision items are recorded as
  given, never embellished).
- **Loading-chain failure:** the `@AGENTS.local.md` import rides verified-but-undocumented
  graceful-skip behavior; regression fallback (a gitignored one-line `CLAUDE.local.md` shim) is
  documented in the harness-loading reference. Non-Claude harnesses degrade to the prose pointer —
  instruction-following, not guaranteed loading; documented, never silent.
- **Missing harness at fixture time:** the verification procedure requires captured evidence; if
  a headless session cannot run, the proof is absent and the ACs it backs stay unproven — fail
  closed, no self-assertion.

### Criterion → Component map

| Criterion | Component(s) |
| --- | --- |
| AC-1 | repo-setup skill |
| AC-2 | repo-setup skill |
| AC-3 | seed templates, fixture verification procedure |
| AC-4 | seed templates |
| AC-5 | seed templates, harness-loading reference, fixture verification procedure |
| AC-6 | seed templates, harness-loading reference, fixture verification procedure |
| AC-7 | repo-setup skill, seed templates, fixture verification procedure |
| AC-8 | repo-setup skill |
| AC-9 | repo-setup skill |
| AC-10 | writing-repo-docs skill (changed), writing-readmes skill (changed) |
| AC-11 | writing-repo-docs skill (changed) |
| AC-12 | repo-setup skill |
| AC-13 | inventory surfaces (changed) |
| AC-14 | harness-loading reference |

### ADRs created

None — the candidate (relying on undocumented import-skip behavior) fails the hard-to-reverse
test: the shim fallback restores documented behavior with one gitignored file. Recorded as a
failure boundary instead.

### Glossary terms touched

`CONTEXT.md`'s **seed marker** entry sharpened with the canonical token (`repo-setup:seed`).

## Tech Stack

*Written 2026-07-08. Feature level against the declared stack in `docs/specs/overview.md`.
Autonomous run.*

**No new products — reuses the declared stack** (green bar: `node --check checker/sdlc-check.mjs`
+ `node --test checker/*.test.mjs` — the feature is Markdown-only (NC-5), so the bar is the
existing suite staying green, plus the fixture verification procedure's captured evidence for the
manual test-backed ACs). All seven components are instruction documents; no dependency, manifest,
or executable is added.

### Load-bearing external-harness claims

The templates' correctness leans on harness behaviors, tagged per the probe discipline:

- **Claude Code expands `CLAUDE.md → @AGENTS.md → @AGENTS.local.md` recursively** —
  `verified-by-probe` → [probes/import-chain-2026-07-08.md](probes/import-chain-2026-07-08.md)
  (run C). Docs: https://code.claude.com/docs/en/memory.md (imports; checked 2026-07-08).
- **A missing `@AGENTS.local.md` import is skipped silently** — `verified-by-probe` →
  [probes/import-chain-2026-07-08.md](probes/import-chain-2026-07-08.md) (run B). Undocumented
  behavior (docs silent on missing imports; checked 2026-07-08); fallback recorded in the design's
  failure boundaries. Re-probed at build (AC-5/AC-6 evidence).
- **Claude Code does not auto-discover `AGENTS.md`** (hence the CLAUDE.md pointer) —
  `verified-by-probe` → [probes/import-chain-2026-07-08.md](probes/import-chain-2026-07-08.md)
  (run A; probed after the gate flagged it `asserted` — the probe also exposed and eliminated a
  tool-read confound in the original chain runs, now re-run tools-disabled). Docs:
  https://code.claude.com/docs/en/memory.md#agents-md (checked 2026-07-08).
- **Cursor reads AGENTS.md; no per-repo private mechanism** — `asserted`; docs:
  https://cursor.com/docs/rules (checked 2026-07-08). Drives a documented limitation only.
- **Codex reads AGENTS.md; `AGENTS.override.md` shadows rather than appends** — `asserted`;
  source: `codex-rs/core/src/agents_md.rs` (openai/codex main, checked 2026-07-08). Drives the
  NC-3 "don't" only.
- **OpenCode reads AGENTS.md; missing `instructions` files silently skipped** — `asserted`;
  docs: https://opencode.ai/docs/rules/ + source `packages/opencode/src/session/instruction.ts`
  (checked 2026-07-08). Drives the optional-hardening note only (nothing seeded, NC-6).

The three `asserted` non-Claude claims are deliberately un-probed: each backs prose documentation
(a limitation, a don't, an optional note), not seeded behavior; no fixture correctness leans on
them.

### Unverified / flagged

- The graceful-skip behavior is probe-verified but undocumented — flagged as the one behavior a
  harness update could regress; mitigation designed (shim fallback), re-probed at build.

### Glossary terms touched

None.

## Plan

*Written 2026-07-08. Autonomous run. Blast radius measured: the feature is Markdown + JSON
descriptions only — zero compile fallout; the green bar (`node --test checker/*.test.mjs`) must
simply stay green after every task. Every task's verification is explicit (instruction-document
feature; the fixture procedure is the executable proof).*

### Tasks

- **T-1** — Author the harness-loading reference: the verified loading facts (Claude Code import
  chain + graceful absence with the probe link and the shim fallback; Cursor no-private-mechanism;
  Codex `AGENTS.override.md` shadowing don't; OpenCode optional `instructions` hardening, not
  seeded). Files: `skills/repo-setup/reference/harness-loading.md` (create). Test-first: explicit
  verification — every claim matches the `## Tech Stack` tag list, and the relative link to
  `docs/specs/repo-setup/probes/import-chain-2026-07-08.md` resolves.
  *Advances:* AC-14. *Component:* harness-loading reference. *Deps:* none.

- **T-2** — Author the seed templates as fenced blocks (never literal AGENTS/CLAUDE files in the
  plugin tree): the AGENTS.md template carrying the five AC-4 elements — stranger litmus test,
  lazy-creation rule, pointer-files-carry-no-content rule, prose pointer, `@AGENTS.local.md` line —
  plus templates for the one-line CLAUDE.md pointer, the AGENTS.local.md what-belongs-here header,
  `.gitignore` (AGENTS.local.md entry + stack-derived section), `.gitattributes`, `.editorconfig`,
  CI workflow skeleton, issue/PR templates, CODEOWNERS, and the one-line README stub. Each block
  declares awaiting-fill (carries the `repo-setup:seed` token in the file's native comment syntax)
  or complete-at-seed. Files: `skills/repo-setup/reference/templates.md` (create). Test-first:
  explicit verification — AC-4's five elements each present in the AGENTS.md block; every block
  carries its awaiting-fill/complete declaration; token spelled identically throughout.
  *Advances:* AC-3, AC-4, AC-7. *Component:* seed templates. *Deps:* T-1.

- **T-3** — Author the fixture verification procedure: materialize the template blocks into a fresh
  temp git repo; assert the exact agent-instruction file set; assert `git check-ignore
  AGENTS.local.md` exits 0; grep the `repo-setup:seed` token and diff against the declared
  awaiting-fill list; run the two headless token-recall probes (present + absent cases, the probe
  method of `docs/specs/repo-setup/probes/import-chain-2026-07-08.md`). Files:
  `skills/repo-setup/reference/verification.md` (create). Test-first: explicit verification — each
  of AC-3/5/6/7 maps to a named assertion in the procedure; commands are runnable as written.
  *Advances:* AC-3, AC-5, AC-6, AC-7. *Component:* fixture verification procedure. *Deps:* T-2.

- **T-4** — Author the skill method document: strict-YAML frontmatter (name `repo-setup`, rich
  description ending with Triggers + standalone scope qualifier), the repo body-section set in
  order, the audit-first checklist (present/missing/drifted report before any create/modify), the
  no-blind-overwrite rule, owner-decision discipline (LICENSE/security/CoC/templates/CODEOWNERS/
  remote values: flag or ask, never invent; remote settings propose-only), the single pipeline
  opt-in ask with its yes-path artifacts, the `repo-setup:seed` token declaration + awaiting-fill
  list, and links to the three reference docs. Files: `skills/repo-setup/SKILL.md` (create).
  Test-first: explicit verification — frontmatter parses as strict YAML; section skeleton matches
  the convention; audit step precedes every create/modify step; no NC-1..NC-6 violation in the
  text.
  *Advances:* AC-1, AC-2, AC-7, AC-8, AC-9, AC-12. *Component:* repo-setup skill. *Deps:* T-1, T-2,
  T-3.

<!-- source: mid-build amendment (T-5's named file set too narrow for AC-10's own contract — the
seed-marker exception must also qualify writing-repo-docs's other unqualified no-placeholder
statements and the reference file its placeholder scan delegates to; T-5 superseded by T-8) ·
ingested 2026-07-08 -->

- **T-5** *(superseded by T-8 — file set too narrow; kept for trace)* — Wire the writing-*
  contract: writing-repo-docs gains the seed-marker recognition
  statement (a `repo-setup:seed`-marked stub is a fill-target — fill or report, never a placeholder
  violation) and the reworded templates bullet (refine existing; offer creation only when
  repo-setup never ran); writing-readmes gains the marker recognition statement. Files:
  `skills/writing-repo-docs/SKILL.md` (edit), `skills/writing-readmes/SKILL.md` (edit). Test-first:
  explicit verification — both skills cite the token exactly as declared in T-4; the templates
  bullet states the precedence; no other behavior of either skill changed.
  *Advances:* none. *Component:* none. *Deps:* none. (Superseded — see T-8; original trace
  carried forward there.)

- **T-8** — Wire the writing-* contract, coherently: everything T-5 specified (writing-repo-docs:
  seed-marker recognition at the placeholder scan + the reworded templates bullet;
  writing-readmes: the marker recognition statement) PLUS the coherence closure AC-10 itself
  demands — qualify writing-repo-docs's remaining unqualified no-placeholder statements (the
  Phase 3 no-placeholders line, the Red flags placeholder bullet, the Done-when "0 placeholders"
  line) with the seed-marker exception (compact clause or one canonical cross-reference each),
  extend the same exception to `skills/writing-repo-docs/reference/fact-check-and-verify.md`
  (its placeholder-scan section + done criteria), and refresh the Phase 2 skeleton's `.github/`
  line to the new template-ownership precedence. Files: `skills/writing-repo-docs/SKILL.md`
  (edit), `skills/writing-readmes/SKILL.md` (edit),
  `skills/writing-repo-docs/reference/fact-check-and-verify.md` (edit). Test-first: explicit
  verification — grep finds NO remaining unqualified no-placeholder statement in either edited
  writing-repo-docs file (each now carries or references the seed-marker exception); token
  spelled exactly `repo-setup:seed` everywhere; writing-readmes unchanged beyond the one
  statement; no other behavior changed.
  *Advances:* AC-10, AC-11.
  *Component:* writing-repo-docs skill (changed), writing-readmes skill (changed). *Deps:* T-4.

- **T-6** — Execute the fixture verification and capture evidence: run
  `skills/repo-setup/reference/verification.md` end to end; capture each command + output as the
  green-bar evidence block in the build ledger (harness-captured, not self-asserted). Files: none
  in the product tree (evidence lands in `docs/specs/repo-setup/build-report.md`; fixture in a temp
  dir, deleted after). Test-first: the procedure's assertions ARE the test — any mismatch fails the
  task.
  *Advances:* AC-3, AC-5, AC-6, AC-7. *Component:* fixture verification procedure. *Deps:* T-3,
  T-4.

- **T-7** — Inventory-surfaces sweep: add repo-setup (standalone framing — the fourth standalone
  skill beside the three documentation skills) to every enumeration: README.md (standalone-skills
  mention at line ~22, the skill table, the layout tree, the line ~176 mention), docs/README.md
  (the skills table row, linking `../skills/repo-setup/SKILL.md`), llms.txt (the standalone-skills
  line), and the four manifest descriptions where they enumerate skills
  (.claude-plugin/plugin.json, .claude-plugin/marketplace.json, .cursor-plugin/plugin.json,
  .cursor-plugin/marketplace.json — the "Plus three documentation skills…" sentence gains
  repo-setup; both plugin.json files stay lockstep). Files: `README.md`, `docs/README.md`,
  `llms.txt`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
  `.cursor-plugin/plugin.json`, `.cursor-plugin/marketplace.json` (all edits). Test-first: explicit
  verification — grep `repo-setup` hits every named surface; JSON files still parse (`node -e
  "JSON.parse(...)"`); no version field changed (release is the maintainer's word).
  *Advances:* AC-13. *Component:* inventory surfaces (changed). *Deps:* T-4.

### Task-to-criterion coverage map

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-4 |
| AC-2 | T-4 |
| AC-3 | T-2, T-3, T-6 |
| AC-4 | T-2 |
| AC-5 | T-3, T-6 |
| AC-6 | T-3, T-6 |
| AC-7 | T-2, T-3, T-4, T-6 |
| AC-8 | T-4 |
| AC-9 | T-4 |
| AC-10 | T-8 (supersedes T-5) |
| AC-11 | T-8 (supersedes T-5) |
| AC-12 | T-4 |
| AC-13 | T-7 |
| AC-14 | T-1 |

### Notes

- Green bar after every task: `node --check checker/sdlc-check.mjs` + `node --test
  checker/*.test.mjs` (untouched by design — NC-5 — but run to prove it).
- T-6 needs a working headless `claude` CLI + API access; if unavailable, the task fails closed
  (no self-asserted evidence) — surface to the maintainer rather than skipping.
- No version bump and no CHANGELOG entry in this pool: releases and their numbering are the
  maintainer's word (0.13.0 fold-back precedent); ship opens the PR without them.
- Commit convention: `feat(T-N): …` per task, FF-merge discipline, no `git add -A`.
