# Build report — checker-semantics

Resumable ledger for the `checker-semantics` build (SMA-419 + SMA-420). Conductor-driven,
subagent-per-task, test-first. One atomic commit per task; green bar verified (and in isolation)
before each commit.

## Green bar

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob form — dir form misbehaves on Node
  22.23.1).
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/checker-semantics/checker-semantics.md`
- **Checker (enforcement-spine, for T-2/T-4):** `node agent-sdlc/checker/sdlc-check.mjs specs/enforcement-spine/enforcement-spine.md`
- No lint/format tooling (zero-dep checker). **Baseline:** 142 pass / 0 fail; self-checker exit 0.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `35db2ff` | AC-1, AC-2, AC-3, AC-9 | structured external-component recognition + drop allowlist (SMA-419); reviewer APPROVE; 1 test gated to skip until T-2 migrates enforcement-spine |
| T-2 | done | `2dd0cf7` | AC-4, AC-9 | migrate enforcement-spine spec to structured format (SMA-419); dangling 7→0; reviewer APPROVE; un-skipped the gated ES regression test (also reflowed a pre-existing T-12 component line-wrap) |
| T-3 | done | `80f278c` | AC-5, AC-6, AC-7, AC-9 | AC-4 recorded-commit verification + remove history walk (SMA-420); reviewer APPROVE (adversarial fail-open trace clean); +2 minor cleanups (stale doc comment, SHA-256 regex bound); self-spec + enforcement-spine both exit 0 |
| T-4 | done | `1875edd` | AC-8, AC-9 | amend AC-4 text in enforcement-spine spec (SMA-420); reviewer APPROVE (text maps faithfully to the T-3 rule; relation pinned); enforcement-spine exit 0 |

## Checker corroboration

- Resume: n/a (fresh build).
- Build-complete: **PASS** — `sdlc-check specs/checker-semantics/checker-semantics.md --require ledger`
  → exit 0. All four done tasks verified under the feature's OWN new rules: structured components
  resolve, and each recorded commit (`35db2ff`/`2dd0cf7`/`80f278c`/`1875edd`) is looked up via
  option-(b) and its `feat(T-N):` subject scopes exactly its task.

### T-4 (@ `1875edd`)

```
$ node agent-sdlc/checker/sdlc-check.mjs specs/enforcement-spine/enforcement-spine.md   -> exit 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/checker-semantics/checker-semantics.md    -> exit 0
$ node --test agent-sdlc/checker/*.test.mjs   -> # pass 138 · # fail 0
```
AC-4 amended to the recorded-commit model; enforcement-spine now passes end-to-end under the new rules.

## Hand-off

All four tasks done, green end to end, checker-corroborated under the new rules. Branch
`feat/checker-semantics` (off `feat/checker-correctness`, PR #2) is ready. Next: `/agent-sdlc:ship`.

## Review-gate — Round 1 (BLOCK → fixed)

Panel (no-ollama per maintainer steer): holistic ×2 (opus-4-8 + gpt-5.5) + 3 lenses (spec/security/
subtle) + scan. Coverage 5/5 voted, 0 missing. Verdict **BLOCK** on 2 mediums; 1 low advisory. All
addressed (area-scoped commits, so the recorded-commit rule is unaffected):

- **MEDIUM (opus) — reachability fail-open.** `git show -s <sha>` resolved a stale/dangling pre-amend
  SHA (unreachable from HEAD) → a done task passed against a commit not in the shipped history (the old
  `git log` walk only saw reachable commits). Fixed (`e8accad`): `checkLedgerVsGit` now requires
  `git merge-base --is-ancestor <sha> HEAD`; a found-but-unreachable SHA is a finding. False-pass
  confirmed pre-fix. +2 tests.
- **MEDIUM (lens-security) — unbounded git subprocesses.** One `git show` per done SHA, no cap/timeout.
  Fixed (`e8accad`): per-command 10s timeout (fail-closed on kill) + `MAX_LEDGER_COMMITS=1000` cap
  (fail-closed, skips the loop over-cap). +3 tests. (Low real-risk — trusted committed ledger — but
  cheap defense-in-depth.)
- **LOW (codex) — stale history-walk text in the enforcement-spine reference spec.** Fixed (`ae00c1d`):
  a supersession note scoping the Design/Data-Flow/Tech-Stack/T-6 history-walk descriptions as the
  0.7.0 as-shipped record. **Maintainer decision flagged:** full rewrite vs. the note approach taken.

Suite 138→143. Both spec-checkers still exit 0. Round 2 = single-model verification (non-ollama).

## Design refinement (build-time)

- **D6 (SMA-420, discovered in build) — recorded-commit is the FIRST SHA-shaped token in the ledger
  commit cell.** A real cell can carry annotation (the enforcement-spine T-6 cell is
  `` `4ddd29e` (+corrective `d3c4275`) ``); option-(b) extracts the first `/[0-9a-f]{7,40}/` token as
  the authoritative commit (verified: all 12 enforcement-spine first-SHAs are `feat(T-N):`). Folded
  into T-3. Flagged in the PR body for ratification.

## Green-bar evidence

### T-1 (@ `35db2ff`)

```
$ node --test agent-sdlc/checker/*.test.mjs
ok 55 - a structured "Outside the checker" subheading defines real components with C-ext-N ids that resolve by name (SMA-419, AC-1)
ok 56 - inside "### Components" and outside "### Outside the checker" lists both start at 1. but get distinct namespaces (C-1 vs C-ext-1), both resolve (SMA-419, AC-2)
ok 57 - an unrelated "###" subheading after "### Outside the checker" stops absorbing its list items (mode reset, SMA-419)
ok 104 - a component-map row citing a structured external component (declared "outside the checker") or `none` yields no trace-integrity finding (SMA-419, AC-3)
ok 105 - with the allowlist gone, a *Component:* field citing "gate skill text" and NO structured declaration is a dangling trace-integrity finding; `none` stays non-dangling (SMA-419, AC-3)
# tests 146 · # pass 145 · # fail 0 · # skipped 1
$ node agent-sdlc/checker/sdlc-check.mjs specs/checker-semantics/checker-semantics.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Isolation: 145 pass / 1 skip / 0 fail, self-spec-exit 0. (The 1 skip is the real-enforcement-spine
regression, gated until T-2 migrates that spec.)

### T-2 (@ `2dd0cf7`)

```
$ node agent-sdlc/checker/sdlc-check.mjs specs/enforcement-spine/enforcement-spine.md 2>&1 | grep -c dangling
0                       # dangling-component findings 7 -> 0 (structured declaration resolves them)
$ node --test agent-sdlc/checker/*.test.mjs
# tests 146 · # pass 146 · # fail 0 · # skipped 0   # the T-1-gated ES regression test now runs green
```
Isolation: 146 pass / 0 skip / 0 fail. Note: the self-spec (checker-semantics.md) transiently shows a
`ledger-vs-git` "T-1 … 2 commits reference it" finding — the PR1/PR2 cross-feature `feat(T-1):`
collision under the OLD rev-range rule (this branch shares PR1's lineage). This is exactly what T-3's
option-(b) (per-SHA lookup) fixes; not a T-2 regression. Binding green bar for T-2 = the suite + zero
ES dangling, both met.

### T-3 (@ `80f278c`)

```
$ node --test agent-sdlc/checker/*.test.mjs
ok 9  - a done task whose recorded commit subject scopes exactly it passes (no finding)
ok 10 - a done task whose recorded commit references a DIFFERENT task fails naming it
ok 12 - a done task whose recorded commit is a multi-task feat(T-3, T-4) subject fails
ok 13 - a done task whose recorded SHA does not exist in the repo fails naming it
ok 14 - a done task with an EMPTY commit cell fails with "no recorded commit"
ok 17 - T-1 does not cross-match a recorded commit whose subject scopes T-12   # option-(b) T-N immunity
# tests 138 · # pass 138 · # fail 0 · # skipped 0   (git.test.mjs rewritten; dead history-walk tests removed)
$ node agent-sdlc/checker/sdlc-check.mjs specs/checker-semantics/checker-semantics.md   -> exit 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/enforcement-spine/enforcement-spine.md   -> exit 0  (D5 confirmed: option-(b) is branch-independent — resolves PR#2's documented artifact)
```
Isolation: 138 pass / 0 fail, self-spec-exit 0. Dead symbols (readRepoFacts/computeRevRange/
resolveDefaultBranch/GIT_LOG_FORMAT) grep-confirmed gone.
