# Build report — spec-location-under-docs

Resumable ledger for the `docs/specs/` spec-location move + 0.12.0 bump. Conductor-driven, one
atomic commit per task, green bar between each. All five tasks done; branch ready to ship.

## Agent-type roster (pinned at build start)

The dedicated `implementer` / `reviewer` / `fixer` subagent types are not registered in this
environment → **general-purpose stand-in** where dispatch is used (announced once, here).

**Delegation record (transparent adaptation):** every task is a repo-surface migration edit — a git
rename, path-string sweeps in Markdown/tests, and a manifest bump; none is new product code (the
build TDD/implementer-dispatch discipline is scoped to code). The conductor executed the tasks
directly against a pre-computed exact reference inventory (every `specs/` occurrence enumerated by
file+line before any edit), recording this here as a deliberate conductor-takeover: a cross-cutting
textual sweep needs one consistent hand, and each assertion-guarded scripted edit fails loudly on a
count mismatch. Independent review happens at ship (three reviewer subagents:
correctness-of-sweep · docs/link accuracy · back-compat/user-impact), covering every task's diff.

## Baseline green bar (step 2)

Run once before any task, on `main`-equivalent (`bcffc29` spec commit). Exit codes read **directly**
(no pipe):

- `node --test checker/*.test.mjs` → exit 0, `# tests 153 / # pass 153 / # fail 0 / # skipped 0`. GREEN.
- Per-spec checker loop over all 10 shipped feature specs → every exit 0. GREEN.
- Strict-YAML frontmatter guard over 13 SKILL.mds → 0 bad. GREEN.
- `node checker/sdlc-check.mjs docs/specs/spec-location-under-docs/spec-location-under-docs.md` →
  exit 0. GREEN.

Baseline GREEN. No unrunnable/genuinely-red classification needed.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `857e176` | AC-3, AC-4 | `git mv specs docs/specs` (42 × R100) + 3 self-referential test anchors re-based (`'..','docs','specs',…`) + integration fixture path + 12 parser label strings; test-first shape observed: re-anchored paths first → `# skipped 3`, then the mv → `# skipped 0` |
| T-2 | done | `9995b15` | AC-1 | getting-started File layout → `docs/specs/` tree (+ `verification-report.md` line) + the authoritative back-compat rule (keep / never split / never auto-migrate) + routing/lifecycle paths + input-resolution.md + light-tier.md |
| T-3 | done | `5d6aefe` | AC-2 | nine stage SKILL.mds + subagent-loop.md + ingesting-plans.md + finishing.md swept (75 refs, lookbehind-guarded regex) + back-compat reference at each artifact-location statement + "product `docs/`" clauses reworded (specs now live under docs/) |
| T-4 | done | `2bf34dc` | AC-2, AC-5 | README/CONTRIBUTING/CONTEXT/llms.txt/docs tree swept; relative links re-based (`../specs` → `specs` from `docs/`, `../../specs` → `../specs` from `docs/usage/`); living overview.md layout mentions + feature list updated |
| T-5 | done | `b912caf` | AC-6 | version 0.11.0 → 0.12.0 in both manifests, lockstep; description unchanged (no layout claims in it) |

## Green-bar evidence (conductor's own runs; verification form noted)

### T-1 (@ `857e176`)

Verification form: `node --test checker/*.test.mjs` with the exit code read directly (no pipe),
machine-reporter counts; plus the 11-spec checker loop, each exit read directly. The re-anchored
tests' per-test `ok` lines (the AC-14 name-appearance anchors for AC-3):

```
# tests 153
# pass 153
# fail 0
# skipped 0
ok 125 - the real enforcement-spine spec yields zero findings from all three rules (this feature would not block its own build)
ok 137 - the real enforcement-spine spec yields zero provenance-marker findings (no markers present)
ok 138 - the real enforcement-spine ledger yields zero green-bar-evidence findings (T-1..T-4 done, each with captured evidence)
$ for each of the 11 docs/specs/*/<feature>.md: node checker/sdlc-check.mjs <spec> → exit 0 (all 11)
$ git show 857e176 --diff-filter=R --name-status | grep -c '^R100' → 42 (every moved file a pure rename)
```

Test-first shape: with the anchors re-based but the tree not yet moved, the suite reported
`# pass 150 / # skipped 3` (the exact regression the bar forbids); the `git mv` turned all three
back into `ok` lines.

### T-2 (@ `9995b15`)

Prose task (adds no tests → suite summary is the correct bounded form; the real oracle is the
ship-time conformance review). Verification form: strict-YAML guard + suite + spec checker + a
sweep grep over `skills/getting-started/`, each exit read directly.

```
$ node <strict-YAML frontmatter guard over skills/*/SKILL.md>
strict-yaml bad=0   (exit 0)
$ node --test checker/*.test.mjs
# pass 153 / # fail 0 / # skipped 0   (exit 0)
$ node checker/sdlc-check.mjs docs/specs/spec-location-under-docs/spec-location-under-docs.md
sdlc-check 0.11.0: all checks passed — 0 findings, 0 notes.   (exit 0)
$ grep -rn 'specs/' skills/getting-started/ | grep -v 'docs/specs' → only the nested tree line + the back-compat statement itself
```

### T-3 (@ `5d6aefe`)

Prose task (adds no tests). Verification form: sweep grep over all of `skills/` + strict-YAML guard
+ suite + spec checker, exits read directly.

```
$ grep -rn 'specs/' skills/ | grep -v 'docs/specs' → 10 lines, all sanctioned (back-compat references + the nested tree line)
$ node <strict-YAML frontmatter guard> → strict-yaml bad=0   (exit 0)
$ node --test checker/*.test.mjs
# pass 153 / # fail 0 / # skipped 0   (exit 0)
$ node checker/sdlc-check.mjs docs/specs/spec-location-under-docs/spec-location-under-docs.md
sdlc-check 0.11.0: all checks passed — 0 findings, 0 notes.   (exit 0)
```

### T-4 (@ `2bf34dc`)

Prose task (adds no tests). Verification form: sweep grep over docs/root surfaces + a relative-link
existence check (markdown links resolved against each file's directory) + suite + spec checker,
exits read directly.

```
$ grep -rn 'specs/' README.md CONTRIBUTING.md CONTEXT.md llms.txt docs/ | grep -v docs/specs
  → 4 lines, all sanctioned (2 back-compat statements, the nested tree line, one ../specs link that
    resolves inside docs/specs/)
$ node <relative-link existence check over README + community files + docs/**>
checked=99 dangling=1 — the 1 is a pre-existing verbatim quotation inside the immutable
docs/specs/evidence-gated-techstack/verification-report.md (dangling on main too; confirmed via
`git show main:specs/evidence-gated-techstack/verification-report.md`); zero dangling in README/docs pages
$ node --test checker/*.test.mjs
# pass 153 / # fail 0 / # skipped 0   (exit 0)
$ node checker/sdlc-check.mjs docs/specs/spec-location-under-docs/spec-location-under-docs.md
sdlc-check 0.11.0: all checks passed — 0 findings, 0 notes.   (exit 0)
```

### T-5 (@ `b912caf`)

Manifest bump (adds no tests). Verification form: both manifests `JSON.parse`d reading `0.12.0`,
suite + full 11-spec checker loop, exits read directly.

```
$ python3 json.load: .claude-plugin/plugin.json → 0.12.0; .cursor-plugin/plugin.json → 0.12.0
$ node --test checker/*.test.mjs
# pass 153 / # fail 0 / # skipped 0   (exit 0)
$ for each of the 11 docs/specs/*/<feature>.md: node checker/sdlc-check.mjs <spec> → exit 0 (all 11)
```

## Checker corroboration

- Resume: n/a (fresh build — ledger created this run; no prior ledger to corroborate).
- Build-complete: `node checker/sdlc-check.mjs
  docs/specs/spec-location-under-docs/spec-location-under-docs.md --require ledger` → recorded at
  build-complete below. Repo checker run directly, never the on-PATH launcher.
