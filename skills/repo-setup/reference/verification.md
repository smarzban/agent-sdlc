# Fixture verification procedure

Manual e2e proof for the four behavioral ACs the design assigns to this component: AC-3 (agent-
instruction file set + gitignore), AC-5 (overlay loads through the chain), AC-6 (graceful absence),
AC-7 (seed-marker grep vs. the declared awaiting-fill list). Every other AC is reviewer-checked
prose and is out of scope here (see `docs/specs/repo-setup/repo-setup.md` `## Verification map`).

Content materialized below is copied verbatim from
[templates.md](templates.md) — this procedure never invents seed content, only fixture-local
placeholder substitutions where noted. The two headless probes reuse the tools-disabled method of
[docs/specs/repo-setup/probes/import-chain-2026-07-08.md](../../../docs/specs/repo-setup/probes/import-chain-2026-07-08.md)
verbatim, including its exact `--disallowedTools` list and prompt; a plain `claude -p` probe is
invalid (tool-read confound, documented there) and must not be substituted.

Any assertion mismatch below means the AC(s) it backs are **unproven** — fail closed, do not
self-assert a pass. Probe steps additionally require a working `claude` CLI with API access; if
that is unavailable the AC-5/AC-6 evidence is simply absent, not assumed green.

## Step 1 — Create the fixture

**Purpose:** an isolated, disposable git repo — no assertion below may run against the real repo.

```bash
FIXTURE="$(mktemp -d)"
cd "$FIXTURE"
git init -q
```

**Expected observation:** exits 0; a `.git` directory exists under `$FIXTURE`. No AC (setup only).

## Step 2 — Materialize the seeded files

**Purpose:** extract every fenced block in `templates.md` verbatim into the fixture, at the paths
each file conventionally occupies in a repo root (`.github/` subpaths for the CI/issue/PR/CODEOWNERS
templates).

Placeholder-substitution note (per templates.md's "adapt only clearly-marked `<placeholders>`"
rule): every assertion below is insensitive to placeholder content **except** the two token-recall
probes (Steps 7–8), which need a distinctive value to prove recall. So exactly two placeholders are
substituted — the `<placeholder: one paragraph...>` line under AGENTS.md's `## Project overview`,
and the `<placeholder: personal directives...>` line in AGENTS.local.md — with the same tokens the
referenced probe already uses (`ZEBRA42` public, `FALCON77` private), for direct comparability with
its recorded runs. Every other placeholder (`<project name>`, `<stack-derived ...>`, toolchain
placeholders, etc.) is left untouched; untouched placeholders do not affect any assertion here.

```bash
mkdir -p "$FIXTURE/.github/workflows" "$FIXTURE/.github/ISSUE_TEMPLATE"

cat > "$FIXTURE/AGENTS.md" <<'EOF'
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
This is the repo-setup verification fixture. The public token is ZEBRA42.

## Build / test / verify

<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
- Build: <placeholder>
- Test: <placeholder>
- Canonical verify (the one documented green-bar command): <placeholder>

## Conventions

<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
<placeholder: commit style, branch flow, code-style pointers>
EOF

cat > "$FIXTURE/CLAUDE.md" <<'EOF'
<!-- Frozen pointer: content belongs in AGENTS.md or AGENTS.local.md, never here. -->
@AGENTS.md
EOF

cat > "$FIXTURE/AGENTS.local.md" <<'EOF'
<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
# AGENTS.local.md

Personal, machine-specific, and cross-project instructions for this working copy only — never
committed, never seen by anyone else's clone. If an instruction would make sense to a stranger who
cloned this repo, it belongs in AGENTS.md instead, not here.

This is the repo-setup verification fixture. The private token is FALCON77.
EOF

cat > "$FIXTURE/.gitignore" <<'EOF'
# AGENTS.local.md is the private, per-working-copy overlay — never committed.
AGENTS.local.md

# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
# <stack-derived ignores: build output, dependency directories, local env files>
EOF

cat > "$FIXTURE/.gitattributes" <<'EOF'
* text=auto eol=lf

# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
# <stack-derived rules: binary paths, linguist-vendored/generated, diff drivers>
EOF

cat > "$FIXTURE/.editorconfig" <<'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
# <stack-derived per-language overrides: indent_style, indent_size>
EOF

cat > "$FIXTURE/.github/workflows/ci.yml" <<'EOF'
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
EOF

cat > "$FIXTURE/.github/ISSUE_TEMPLATE/bug_report.md" <<'EOF'
---
name: Bug report
about: Report a problem
---

<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
<placeholder: owner-decided issue template body>
EOF

cat > "$FIXTURE/.github/PULL_REQUEST_TEMPLATE.md" <<'EOF'
<!-- repo-setup:seed — skeleton awaiting real content; fill, then remove this line -->
## Summary

<placeholder: owner-decided PR template body>

## Test plan

<placeholder>
EOF

cat > "$FIXTURE/.github/CODEOWNERS" <<'EOF'
# repo-setup:seed — skeleton awaiting real content; fill, then remove this line
# Owner decision — assign paths to reviewers, e.g.:
# *       @owner
EOF

cat > "$FIXTURE/README.md" <<'EOF'
<!-- repo-setup:seed — skeleton awaiting real content; fill via the writing-readmes skill -->
# <project name>
EOF
```

**Expected observation:** all 11 files created, `find "$FIXTURE" -not -path '*/.git/*' -type f | wc -l`
reports 11. No AC (setup only).

## Step 3 — Assert the agent-instruction file set

**Purpose:** AC-3's file-set clause — exactly `AGENTS.md`, `CLAUDE.md`, `AGENTS.local.md`, and
`.gitignore` count as agent-instruction files here (the .gitignore because it is what makes
`AGENTS.local.md` privacy mechanical); no other agent-instruction-named file may exist.

```bash
cd "$FIXTURE"
for f in AGENTS.md CLAUDE.md AGENTS.local.md .gitignore; do
  test -f "$f" && echo "present: $f" || echo "MISSING: $f"
done
ls -a | grep -E '^(AGENTS|CLAUDE)' | sort
```

**Expected observation:** all four `present:` lines print (no `MISSING:` line); the trailing `ls`
lists exactly `AGENTS.local.md`, `AGENTS.md`, `CLAUDE.md` — no `AGENTS.override.md`, no
`CLAUDE.local.md`, no other `AGENTS*`/`CLAUDE*` name. **Decides AC-3.**

## Step 4 — Assert CLAUDE.md's exact content

**Purpose:** AC-3's clause that CLAUDE.md's entire content is the one-line AGENTS.md import (plus
its frozen-pointer comment) — nothing else.

```bash
cd "$FIXTURE"
diff <(printf '%s\n' \
  '<!-- Frozen pointer: content belongs in AGENTS.md or AGENTS.local.md, never here. -->' \
  '@AGENTS.md') CLAUDE.md
echo "diff-exit:$?"
```

**Expected observation:** no diff output; `diff-exit:0`. **Decides AC-3.**

## Step 5 — Assert AGENTS.local.md is gitignored

**Purpose:** AC-3's `.gitignore` clause, asserted with the exact command the AC names.

```bash
cd "$FIXTURE"
git check-ignore AGENTS.local.md
echo "exit:$?"
```

**Expected observation:** prints `AGENTS.local.md`; `exit:0`. **Decides AC-3.**

## Step 6 — Seed-token grep vs. the declared awaiting-fill list

**Purpose:** AC-7 — a grep for the canonical token must list exactly the files templates.md
declares awaiting-fill (every block except CLAUDE.md, the one complete-at-seed template), no more
and no fewer.

```bash
cd "$FIXTURE"
ACTUAL="$(mktemp)"
EXPECTED="$(mktemp)"

grep -rl 'repo-setup:seed' --exclude-dir=.git . | sed 's|^\./||' | sort > "$ACTUAL"

cat > "$EXPECTED" <<'EOF'
.editorconfig
.gitattributes
.github/CODEOWNERS
.github/ISSUE_TEMPLATE/bug_report.md
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/ci.yml
.gitignore
AGENTS.local.md
AGENTS.md
README.md
EOF
sort -o "$EXPECTED" "$EXPECTED"

diff "$EXPECTED" "$ACTUAL"
echo "diff-exit:$?"
```

**Expected observation:** no diff output; `diff-exit:0`. `CLAUDE.md` must NOT appear in either
list (it is complete-at-seed, per templates.md — no token). **Decides AC-7.**

## Step 7 — Token-recall probe, AGENTS.local.md present

**Purpose:** prove the overlay loads through the chain — a headless session started inside the
fixture must recall both the public token (from AGENTS.md) and the private token (from
AGENTS.local.md), tools disabled so instruction loading is the only channel (the confound the
referenced probe eliminated).

```bash
cd "$FIXTURE"
PROBE_PRESENT="$(mktemp)"

claude -p 'Without using any tools (answer only from instructions already loaded into your context): list every token your project instructions mention (just the token words). If none are loaded, say NONE.' \
  --disallowedTools "Bash,Read,Glob,Grep,WebFetch,WebSearch,Task,Write,Edit" \
  > "$PROBE_PRESENT" 2>&1
CODE=$?
echo "exit:$CODE" >> "$PROBE_PRESENT"
cat "$PROBE_PRESENT"
```

**Expected observation:** output mentions both `ZEBRA42` and `FALCON77`; `exit:0`. **Decides AC-5.**

## Step 8 — Token-recall probe, AGENTS.local.md absent

**Purpose:** prove graceful absence — with the private file removed, the same probe must recall
only the public token, with no instruction-file error or warning, still via the same tools-disabled
method.

```bash
cd "$FIXTURE"
mv AGENTS.local.md AGENTS.local.md.removed
PROBE_ABSENT="$(mktemp)"

claude -p 'Without using any tools (answer only from instructions already loaded into your context): list every token your project instructions mention (just the token words). If none are loaded, say NONE.' \
  --disallowedTools "Bash,Read,Glob,Grep,WebFetch,WebSearch,Task,Write,Edit" \
  > "$PROBE_ABSENT" 2>&1
CODE=$?
echo "exit:$CODE" >> "$PROBE_ABSENT"
cat "$PROBE_ABSENT"
```

**Expected observation:** output mentions `ZEBRA42` only (no `FALCON77`); no text describing a
missing-file error, import failure, or warning; `exit:0`. **Decides AC-6.**

## Step 9 — Teardown

**Purpose:** leave no trace — the fixture is disposable by design.

```bash
rm -rf "$FIXTURE" "$PROBE_PRESENT" "$PROBE_ABSENT" "$ACTUAL" "$EXPECTED"
```

**Expected observation:** exits 0; `$FIXTURE` no longer exists. No AC (teardown only).

## Reading the results

Steps 3–8 are the only load-bearing assertions; each names the single AC it decides. Any mismatch —
a missing/extra file in Step 3, a content diff in Step 4, a non-zero or wrong-output check-ignore in
Step 5, a list diff in Step 6, a missing token or non-zero exit in Step 7, or a present private
token / visible error in Step 8 — means the AC(s) that step backs are **unproven**: fail closed, do
not mark the task or the build ledger green on a partial pass. If `claude` is unavailable or
unauthenticated, Steps 7–8 cannot run at all; record that absence explicitly rather than skipping
silently (the design's fail-closed failure boundary for a missing harness at fixture time).
