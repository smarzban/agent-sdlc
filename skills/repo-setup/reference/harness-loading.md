# Harness loading — verified facts the seed templates rely on

The seed templates (public `AGENTS.md` + gitignored `AGENTS.local.md` + a one-line `CLAUDE.md`
pointer) only work if each harness actually loads instructions the way assumed. This document is
the accuracy source AC-14's statements are checked against — one fact set per harness, each tagged
`verified-by-probe` or `asserted` per the techstack probing discipline.

## Claude Code

- **`CLAUDE.md → @AGENTS.md → @AGENTS.local.md` expands recursively** — `verified-by-probe` → run C
  in the [kept probe](../../../docs/specs/repo-setup/probes/import-chain-2026-07-08.md). Content
  from all three files reaches the session.
- **A missing `AGENTS.local.md` import is skipped silently** — `verified-by-probe` → run B in the
  same probe. No error, no warning. This is **UNDOCUMENTED behavior** — the docs are silent on
  missing imports. Treat it as the one behavior a harness update could regress.
  - Regression fallback: a gitignored one-line `CLAUDE.local.md` containing `@AGENTS.local.md`.
    Seed it only if the graceful-skip behavior is ever observed to regress; not seeded by default.
- **Claude Code does not auto-discover `AGENTS.md`** — `verified-by-probe` → run A in the same
  probe. An `AGENTS.md` with no `CLAUDE.md` beside it loads nothing. This is why the one-line
  `CLAUDE.md` pointer exists at all — without it, Claude Code never sees `AGENTS.md` or
  `AGENTS.local.md`.
- Docs: https://code.claude.com/docs/en/memory.md (imports) and
  https://code.claude.com/docs/en/memory.md#agents-md (auto-discovery); both checked 2026-07-08.

## Cursor

- **Reads `AGENTS.md`** — `asserted`; docs: https://cursor.com/docs/rules (checked 2026-07-08).
- **No per-repo private (uncommitted) rules mechanism.** There is no Cursor equivalent of
  `AGENTS.local.md` that loads automatically and stays out of git. Personal/private rules for
  Cursor go to Cursor's **global User Rules** (account-level, outside the repo) — not to a file
  seeded in the repo tree. This is a documented limitation, not a workaround to build around.

## Codex

- **Reads `AGENTS.md`** — `asserted`; source: `codex-rs/core/src/agents_md.rs` (openai/codex
  `main`, checked 2026-07-08).
- **`AGENTS.override.md` SHADOWS the directory's `AGENTS.md` — it replaces, not appends.** If both
  files exist in the same directory, Codex uses the override file's content instead of the
  regular file's, not in addition to it. Never seed or recommend `AGENTS.override.md`: seeding it
  would silently blank out the repo's `AGENTS.md` for Codex users instead of layering on top of it.

## OpenCode

- **Reads `AGENTS.md` natively** — `asserted`; docs: https://opencode.ai/docs/rules/ (checked
  2026-07-08).
- **Deterministic overlay loading is available as OPTIONAL hardening, never seeded.** OpenCode
  supports an explicit `opencode.json` `"instructions"` array, e.g.
  `"instructions": ["AGENTS.local.md"]`, to force-load additional files. Missing files listed there
  are silently skipped — `asserted`; source: `packages/opencode/src/session/instruction.ts`
  (checked 2026-07-08). Documented as an optional-hardening note only — `AGENTS.local.md` is never
  added to `opencode.json` by the seed templates themselves.
