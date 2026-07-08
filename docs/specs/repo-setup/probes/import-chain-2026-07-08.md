# Probe: Claude Code instruction loading (2026-07-08)

Kept probe output backing the `verified-by-probe` claims in the repo-setup `## Tech Stack`.
Run live on the maintainer's machine against the installed Claude Code CLI, 2026-07-08.

## Method note — the tool-read confound, found and eliminated

A first pass ran plain `claude -p` prompts; those are agentic, so the model can `Read` fixture
files as a tool action — which proves nothing about *auto-loading*. (It did exactly that in the
AGENTS.md-only fixture: surfaced the token by reading the file, momentarily "contradicting" the
docs.) All results below are from the corrected method: tools disabled
(`--disallowedTools "Bash,Read,Glob,Grep,WebFetch,WebSearch,Task,Write,Edit"`) plus a
no-tools instruction in the prompt, so instructions already loaded into context are the only
channel.

## Fixtures

`CLAUDE.md` (chain fixtures): `@AGENTS.md`
`AGENTS.md` (chain fixtures): `Public rules. The public token is ZEBRA42.` + `@AGENTS.local.md`
`AGENTS.local.md` (present-case only): `Private rules. The private token is FALCON77.`
`AGENTS.md` (autodiscovery fixture — NO CLAUDE.md beside it): `Public rules. The public token is OSPREY19.`

Prompt (all runs): *"Without using any tools (answer only from instructions already loaded into
your context): list every token your project instructions mention (just the token words). If none
are loaded, say NONE."* Model: `claude-haiku-4-5`.

## Run A — AGENTS.md alone (auto-discovery claim)

```
NONE

No project instructions (CLAUDE.md or similar) have been loaded into my context.
exit:0
```

→ **Claude Code does not auto-discover AGENTS.md**; the seeded CLAUDE.md pointer is load-bearing
and justified.

## Run B — chain with AGENTS.local.md missing (graceful absence)

```
ZEBRA42
exit:0
```

→ Public content loads through `CLAUDE.md → @AGENTS.md`; the dangling `@AGENTS.local.md` import
is skipped silently — no error, no warning. (A confounded-method earlier run agrees and adds the
model's explicit no-error narration.)

## Run C — chain with AGENTS.local.md present

```
ZEBRA42, FALCON77
exit:0
```

→ `CLAUDE.md → @AGENTS.md → @AGENTS.local.md` expands recursively; private overlay content
reaches the session.

## Reading

- Auto-discovery: absent (Run A) — matches current docs.
- Recursive import + graceful skip: present (Runs B, C) — the skip is **undocumented**; the
  design records the fallback (a gitignored one-line `CLAUDE.local.md` shim) should it regress.
- The build-stage fixture verification re-runs B and C with this tools-disabled method and
  captures fresh evidence in the build ledger (AC-5, AC-6).
