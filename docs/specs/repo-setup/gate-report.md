# Gate report — repo-setup

Gate over `docs/specs/repo-setup/repo-setup.md` (Brief, Acceptance Criteria, Design, Tech Stack,
Plan — all authored in-pipeline, no materialized sections, no untraced links; full chain, no
mid-chain entry). `constitution.md` absent at the repo root — no constitution to check against
(loud note, not a silent pass). Autonomous run 2026-07-08.

## Round 1 — 2026-07-08

### Chain coverage table

| AC | Component(s) | Product | Task(s) |
| --- | --- | --- | --- |
| AC-1 | repo-setup skill | fast-path (no new products) | T-4 |
| AC-2 | repo-setup skill | fast-path | T-4 |
| AC-3 | seed templates, fixture verification procedure | fast-path | T-2, T-3, T-6 |
| AC-4 | seed templates | fast-path | T-2 |
| AC-5 | seed templates, harness-loading reference, fixture verification procedure | fast-path | T-3, T-6 |
| AC-6 | seed templates, harness-loading reference, fixture verification procedure | fast-path | T-3, T-6 |
| AC-7 | repo-setup skill, seed templates, fixture verification procedure | fast-path | T-2, T-3, T-4, T-6 |
| AC-8 | repo-setup skill | fast-path | T-4 |
| AC-9 | repo-setup skill | fast-path | T-4 |
| AC-10 | writing-repo-docs skill (changed), writing-readmes skill (changed) | fast-path | T-5 |
| AC-11 | writing-repo-docs skill (changed) | fast-path | T-5 |
| AC-12 | repo-setup skill | fast-path | T-4 |
| AC-13 | inventory surfaces (changed) | fast-path | T-7 |
| AC-14 | harness-loading reference | fast-path | T-1 |

Both directions clean at the walk level: every AC reaches ≥1 task; every task and component is
justified by a criterion; the `## Tech Stack` in-stack fast-path declaration satisfies the
component → product link for all seven components (recognized, per the gate's fast-path rule).
NC-1..NC-6 are prose to the checker, as intended.

### Findings

1. **[Critical] Plan tasks are not in checker grammar — every inline trace field silently
   unparsed.** Location: `## Plan` → `### Tasks`; tasks authored as bare `**T-N** —` paragraphs,
   but the checker attributes `*Advances:*/*Component:*/*Deps:*` only inside top-level bullet
   blocks (`- **T-N** …`, `TOP_BULLET_RE` in `checker/sdlc-check.mjs`). Backward coverage rode the
   coverage map alone; T-3 — absent from the map — exposed it (`coverage-backward`, checker exit
   1). Owning stage: **plan**. Next action: reformat the seven tasks as `- **T-N** —` bullets and
   add T-3 to the AC-3/5/6/7 coverage-map rows.
2. **[High] Load-bearing claim left `asserted`: "Claude Code does not auto-discover AGENTS.md".**
   Location: `## Tech Stack` claims list. The committed CLAUDE.md pointer file — a seeded artifact
   — exists solely because of this claim, making it load-bearing, and it is cheaply probeable with
   the same headless-fixture method already used. Owning stage: **techstack**. Next action: probe
   (AGENTS.md-only fixture, token-recall) and retag.
3. **[Low] Three `asserted` external-tool claims stand (Cursor no-private; Codex override
   shadowing; OpenCode silent skip).** Location: `## Tech Stack`. Each backs prose documentation
   only (a limitation note, a don't, an optional-hardening note); none is consumed by a seeded
   artifact's correctness; the tools are not installed here to probe. Deliberate, justified in the
   section — surfaced, not blocking. Owning stage: techstack (no action; revisit if any ever
   backs seeded behavior).
4. **[Low] Design AC-10 row cites "writing-readmes skill (changed)" but no task's `*Component:*`
   field names it** (T-5 carries it in prose only). Harmless to the walk (T-5 resolves via
   writing-repo-docs), but the citation should be in the parsed field. Owning stage: **plan**.
   Next action: include both component names in T-5's `*Component:*` field (fold into finding 1's
   reformat).

### Checker corroboration

`bin/sdlc-check docs/specs/repo-setup/repo-setup.md` → **exit 1** (1 finding:
`coverage-backward` T-3). **Failed check — blocks the verdict** (root cause = finding 1).

### Verdict (round 1)

**NOT ready to build.** Blocking: finding 1 (Critical), finding 2 (High). Route: plan reformat +
techstack probe, then re-gate.

## Round 2 — 2026-07-08, after routed fixes

- **Finding 1 fixed (plan):** the seven tasks reformatted as `- **T-N** —` bullet blocks with
  indented continuations; T-3 added to the AC-3/5/6/7 coverage-map rows.
- **Finding 2 fixed (techstack):** the auto-discovery claim probed (run A,
  `probes/import-chain-2026-07-08.md`) and retagged `verified-by-probe`. The probe pass also
  exposed a **tool-read confound** in the original chain probes (agentic `-p` lets the model Read
  fixture files, proving nothing about auto-loading); all three probes re-run tools-disabled —
  every original conclusion held (no auto-discovery; recursive chain; silent skip).
- **Finding 4 fixed (plan):** T-5's `*Component:*` field now cites both changed skills.
- **Finding 3 stands (Low, non-blocking):** the three prose-only external-tool claims remain
  `asserted`, justified in `## Tech Stack`.

### Checker corroboration (round 2)

`bin/sdlc-check docs/specs/repo-setup/repo-setup.md` → **exit 0** (0 findings, 0 notes).
Corroborated.

### Verdict

**READY TO BUILD.** No Critical or High findings open; checker clean; chain fully walked; green
bar declared (feature fast-path); load-bearing claims all `verified-by-probe` with kept outputs,
remaining `asserted` claims prose-only and justified.
