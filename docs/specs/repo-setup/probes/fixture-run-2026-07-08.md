# Fixture verification run — build T-6 (2026-07-08)

Conductor's own execution of `skills/repo-setup/reference/verification.md` (at `a48a25b`),
captured verbatim. Decides AC-3, AC-5, AC-6, AC-7 (green-bar evidence mirrored in
`../build-report.md`).

## Steps 1–2 — fixture + materialization

```
$ FIXTURE="$(mktemp -d)"; cd "$FIXTURE"; git init -q
$ # ...11 files materialized verbatim from templates.md (ZEBRA42/FALCON77 substitutions per step 2 note)...
step2-count: 11
```

## Step 3 — agent-instruction file set (AC-3)

```
present: AGENTS.md
present: CLAUDE.md
present: AGENTS.local.md
present: .gitignore
AGENTS.local.md
AGENTS.md
CLAUDE.md
```

No `MISSING:` line; no `AGENTS.override.md`, no `CLAUDE.local.md`. **Pass.**

## Step 4 — CLAUDE.md exact content (AC-3)

```
diff-exit:0
```

**Pass.**

## Step 5 — AGENTS.local.md gitignored (AC-3)

```
$ git check-ignore AGENTS.local.md
AGENTS.local.md
exit:0
```

**Pass.**

## Step 6 — seed-token grep vs. declared awaiting-fill list (AC-7)

First run FALSE-FAILED as originally written: this harness shims `grep` to
`ugrep --ignore-files`, which honors `.gitignore` and silently dropped `AGENTS.local.md` from the
results (`diff-exit:1`, `1d0 < AGENTS.local.md`). Procedure corrected in `fix(T-3)` `a48a25b`
(`command grep` + the why); re-run:

```
$ command grep -rl 'repo-setup:seed' --exclude-dir=.git . | sed 's|^\./||' | sort > "$ACTUAL"
$ diff "$EXPECTED" "$ACTUAL"
diff-exit:0
```

10 files, exactly the declared list, `CLAUDE.md` absent from both. **Pass.**

## Step 7 — token-recall probe, overlay present (AC-5)

```
$ claude -p 'Without using any tools (answer only from instructions already loaded into your
context): list every token your project instructions mention (just the token words). If none are
loaded, say NONE.' --disallowedTools "Bash,Read,Glob,Grep,WebFetch,WebSearch,Task,Write,Edit"

Two tokens are mentioned in the loaded project instructions:

- **ZEBRA42** — the public token, from AGENTS.md
- **FALCON77** — the private token, from AGENTS.local.md
exit:0
```

Both tokens surfaced through the chain. **Pass.**

## Step 8 — token-recall probe, overlay absent (AC-6)

```
$ mv AGENTS.local.md AGENTS.local.md.removed
$ claude -p '…same prompt, same flags…'

ZEBRA42

That's the only token mentioned in the loaded project instructions — AGENTS.md calls it "the
public token." The file also references an @AGENTS.local.md include, but no content from that
file is loaded in my context (the git status shows AGENTS.local.md.removed, suggesting it's not
present), so no other tokens appear.
exit:0
```

Public token only; no FALCON77; no instruction-file error or warning. **Pass.**

## Step 9 — teardown

```
teardown-exit:0 (fixture gone: yes)
```

## Reading

All six load-bearing assertions pass (steps 3–8). AC-3, AC-5, AC-6, AC-7 proven by this run.
