# Extending & contributing

## Add a reviewer lens or an audit pass

A prompt is just a file — **dropping `prompts/<name>.md` is the whole change**, no code edit:

- `src/prompts.ts` derives the output contract from the name: an **`audit-*`** name gets
  `audit-output-contract`; **`backends`** (the reference set) gets none; everything else gets
  `output-contract`. There is no allowlist — `review-gate prompt <name>` reads `prompts/<name>.md` at
  runtime.
- The `area` field on a finding is a **free advisory string** (never used for the verdict), so a new
  lens can introduce a new area label (e.g. `maintainability`) with no code change.

Then wire it into the orchestration so it actually fires:

- **A gate lens** → add a row to the lens table in `skills/review-gate/SKILL.md` (with its
  fire-when trigger).
- **An audit pass** → add a row to the passes table in `skills/repo-audit/SKILL.md`.

The contracts and the catalog are documented in [../usage/prompts.md](../usage/prompts.md).

## The test discipline (TDD)

The project is test-driven (`vitest`), with **injectable I/O so the suite needs no network or real
git/model**: `runReview` takes a `ModelCall`, `runScan` takes `DiffCall`/`NamesCall`/`ToolRunner`,
and `assemblePrompt` takes a `read` function. Write the failing test first.

For a **new prompt**, the genuinely-failing test is the end-to-end one in `tests/cli.test.ts`: it runs
the **committed `dist/` binary** and asserts the prompt is served with its contract — it fails (the
CLI errors) until the prompt file exists.

```bash
npm test            # vitest run — full suite, no network
npm run typecheck   # tsc --noEmit (src + tests)
npm run build       # tsc → dist/
npm run build:check # build, then `git diff --exit-code -- dist/` — fails if dist drifts from src
```

## `build:check` — the committed-`dist/` invariant

The installed plugin runs `dist/`, not `src/`. `npm run build:check` builds and then asserts the
committed `dist/` is identical to a fresh build, so a `src/` change that wasn't recompiled-and-committed
fails the check. **Rebuild and commit `dist/` whenever you change `src/`** — and note that prompt/skill
markdown changes do *not* touch `dist/` (the CLI reads `prompts/` from disk at runtime), so they don't
require a rebuild. See [plugin-and-releases.md](plugin-and-releases.md).
