# Build report — checker-correctness

Resumable ledger for the `checker-correctness` build (SMA-418 + SMA-421). Conductor-driven,
subagent-per-task, test-first. One atomic commit per task; green bar verified (and verified in
isolation) before each commit.

## Green bar

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob form — the directory form misbehaves
  on Node 22.23.1).
- **Checker (self, spec-level):** `node agent-sdlc/checker/sdlc-check.mjs specs/checker-correctness/checker-correctness.md`
- No lint/format tooling is configured for this zero-dependency checker (matches the enforcement-spine
  build); the two commands above are the whole bar.
- **Baseline (pre-build):** `node --test agent-sdlc/checker/*.test.mjs` → **130 pass, 0 fail**; spec
  checker → exit 0. Green.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `4847729` | AC-1, AC-2, AC-6 | table-path dangling-component symmetry (SMA-418); reviewer APPROVE, isolation-verified |
| T-2 | done | `e930b2e` | AC-3, AC-6 | ragged-row typed parse failure (SMA-421 nit 1); reviewer APPROVE, isolation-verified |
| T-3 | done | `e36a2ac` | AC-4, AC-6 | positional NUL pairing in readRepoFacts (SMA-421 nit 2); reviewer APPROVE + added oldest-empty-subject boundary pin; isolation-verified |
| T-4 | done | `0a8c60d` | AC-5, AC-6 | anchored component-name resolution (SMA-421 nit 3); reviewer APPROVE + documented `\b` non-word-terminal boundary; isolation-verified |

## Checker corroboration

- Resume: n/a (fresh build — this run created the ledger; no resume checker per AC-15).
- Build-complete: **PASS** — `node agent-sdlc/checker/sdlc-check.mjs specs/checker-correctness/checker-correctness.md --require ledger` → exit 0, 0 findings. Corroborates trace integrity, bidirectional coverage, provenance, green-bar evidence for all four done tasks, and ledger-vs-git (each T-N has exactly one `fix(T-N):` commit in the `merge-base..HEAD` rev-range).

## Hand-off

All four tasks done, green end to end, checker-corroborated. Branch `feat/checker-correctness` is
ready. Next: `/agent-sdlc:ship`.

## Green-bar evidence

### T-1 (@ `4847729`)

```
$ node --test agent-sdlc/checker/*.test.mjs
ok 91 - a component-map row citing a name that matches no defined component yields a trace-integrity finding naming it
ok 92 - a component-map row citing a name that DOES match a defined component yields no trace-integrity finding
ok 93 - a component-map row citing a recognized non-dangling value (skill text / none) yields no trace-integrity finding
ok 94 - a coverage ("Advanced by") map row citing a dangling task is NOT reported as a dangling component (task-ID values, not components)
# tests 134
# pass 134
# fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/checker-correctness/checker-correctness.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Staged-snapshot isolation check: 134 pass / 0 fail, spec-exit 0.

### T-2 (@ `e930b2e`)

```
$ node --test agent-sdlc/checker/*.test.mjs
ok 70 - a ragged ledger data row (fewer cells than the header) fails cleanly, never a thrown TypeError
ok 71 - a well-formed ledger row with an empty-but-present trailing cell is NOT ragged and still parses
ok 76 - a ragged verification-report data row (fewer cells than the header) fails cleanly, never a thrown TypeError
# tests 137
# pass 137
# fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/checker-correctness/checker-correctness.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Staged-snapshot isolation check: 137 pass / 0 fail, spec-exit 0. Reviewer note (non-blocking):
fail-closed on a short row is stricter than GFM's trailing-cell padding — exactly what AC-3 mandates.

### T-3 (@ `e36a2ac`)

```
$ node --test agent-sdlc/checker/*.test.mjs
ok 8 - readRepoFacts positionally pairs (hash, subject): a middle empty-subject commit does not shift later pairs
ok 9 - readRepoFacts positionally pairs (hash, subject): the OLDEST commit having an empty subject exercises the trailing-terminator boundary
# tests 139
# pass 139
# fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/checker-correctness/checker-correctness.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Staged-snapshot isolation check: 139 pass / 0 fail, spec-exit 0. Reviewer flagged the oldest-empty-
subject case as the `pop()` boundary → pinned with a second test before commit.

### T-4 (@ `0a8c60d`)

```
$ node --test agent-sdlc/checker/*.test.mjs
ok 52 - a dangling component name that merely contains a real component name as a substring does NOT resolve (anchored, AC-5)
ok 53 - the exact component name still resolves as its own word, even inside surrounding prose (AC-5)
# tests 141
# pass 141
# fail 0
$ node agent-sdlc/checker/sdlc-check.mjs specs/checker-correctness/checker-correctness.md
sdlc-check: all checks passed — 0 findings, 0 notes.   (exit 0)
```
Staged-snapshot isolation check: 141 pass / 0 fail, spec-exit 0. Reviewer Minor (advisory) → a `\b`
non-word-terminal boundary note added as a code comment (fail-closed; no current name affected).
