# Build report: checker-silence-eval

Branch `feat/checker-eval-and-coverage-map-links`. All five tasks done, reviewed, and green.

## Agent-type roster (pinned at build start)

`implementer`, `reviewer` and `fixer` agent types are registered in this working copy and were used
for their matching roles, announced once here rather than rediscovered per dispatch.

## Isolation

The build ran on branch `feat/checker-eval-and-coverage-map-links` in the maintainer's working copy,
branched on top of the open `chore/merge-gate-rename-and-diff-scope` branch so that landing that one
never forces a rebase here (a rebase would rewrite the SHAs this ledger records, and the
recorded-commit rule needs every task SHA reachable).

Two pairs of tasks ran concurrently (T-1 with T-2, then T-4 with T-5). Each pair touched disjoint
files, and each subagent was told which files were not its own. Every green bar below is the
conductor's own run, not a subagent's claim.

## Baseline

`node --test checker/*.test.mjs` -> **177/177, exit 0** (read directly, unpiped). All six chains
under `docs/specs/` exited 0. Green, not vacuous.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `1ba4695` | AC-6, AC-7, AC-8 | 1 Critical (a seed that could not fail), 2 Important, 4 Minor, all closed |
| T-2 | done | `7836091` | AC-11 | erratum, one line; 0 findings |
| T-3 | done | `1fe3cbc` | AC-1, AC-2, AC-3, AC-4, AC-5 | 0 Critical, 1 Important, 6 Minor, all closed; carries an authorised plan amendment |
| T-4 | done | `5e63526` | AC-9 | 0 Critical, 2 Important, 6 Minor, all closed |
| T-5 | done | `c624db0` | AC-10 | 0 Critical, 2 Important, 5 Minor, all closed |

## Green-bar evidence

### T-1 (@ `1ba4695`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 182
# pass 182
# fail 0

ok 6 - AC-8: every seed states exactly one disposition, detected or expected-miss with a non-empty reason
ok 7 - block-ownership-coverage (detected)
ok 8 - coverage-cell-scrape (detected)
ok 9 - verification-type-absorption (detected)
ok 10 - fence-blindness (expected-miss)
```

Teeth proven by probe against defect-reintroduced COPIES of the checker (the real one never edited):
S1 fails against the pre-fix splitter (`683cea1^`), S3 fails against a copy with the `SUBHEADING_RE`
stop removed from `splitOwnedBlocks`.

### T-2 (@ `7836091`)

```
$ node checker/sdlc-check.mjs docs/specs/repo-setup/repo-setup.md
sdlc-check 0.15.0: all checks passed — 0 findings, 0 notes.
EXIT (read directly): 0

$ node -e "…parseSpec(repo-setup)…" -> untraced marker: { from: "T-5", reason: "superseded by T-8, …" }

$ node --test checker/parser.test.mjs checker/integration.test.mjs
# tests 81 / # pass 81 / # fail 0, EXIT 0
```

Marker attribution proven rather than assumed: the marker resolves to `T-5`, not to a neighbour.

### T-3 (@ `1fe3cbc`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 190
# pass 190
# fail 0

ok 72 - a comma inside a parenthesized span does not fabricate a link (AC-2, order is the contract)
ok 73 - an id cited only inside a parenthesized span contributes no link (AC-1)
ok 74 - a plain comma-separated coverage cell links every id, regardless of cell length (AC-3)
ok 75 - a coverage-cell id token that produced no link surfaces as a note naming the row and that id, never a finding (AC-4)
ok 76 - AC-4: a spec whose only issue is a stray coverage-cell id exits 0 (the note never blocks)
ok 79 - a Criterion-to-component map cell keeps scanning the whole cell for a component name; the leading-id rule does not reach it (AC-5)
```

All seven chains exit 0. The measured corpus delta is exactly the four links AC-9 names, and nothing
was added.

### T-4 (@ `5e63526`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 192
# pass 192
# fail 0

ok 49 - the real chains' trace fields and forward-coverage links are preserved element-wise, minus T-3's four named deletions
ok 50 - every chain under docs/specs/ still exits 0 under the real CLI
ok 51 - AC-9: no criterion loses its last carrying task, and no task loses its last criterion (every real chain)
```

The subset assertion's teeth were proven red against a disposable checker copy that adds a bogus
link, then the copy was discarded.

### T-5 (@ `c624db0`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 191
# pass 191
# fail 0
```

Prose task. Verification was explicit and declared before writing: both skill bodies state the rule,
frontmatter still parses as strict YAML, the ADR records each required element, and every published
claim was checked against `checker/sdlc-check.mjs` rather than against the brief.

## Amendments

- **T-3 absorbed T-4's pin update (authorised by the conductor).** T-3's change deliberately deletes
  four map-derived links, which reddened `integration.test.mjs`'s pinned pre-change assertion. Leaving
  that for T-4 would have meant committing T-3 red, so T-3 subtracts the four named links from the
  pinned data instead. The pre-change golden values are preserved and were never regenerated from the
  new implementation, which is the only thing that makes them evidence. T-4 kept the NEW
  criterion-level assertions.

## Deviations

- **D-1: a task brief prescribed a toothless test, and the review caught it.** T-1's brief told the
  implementer to express the verification-type-absorption seed through the ship-side proof/evidence
  rule. That rule never touches `parseSpec`, so the seed passed with the defect reintroduced. The
  reviewer proved it by probe and named a finding-shaped alternative needing no new API. **Disposition:**
  brief corrected in the fix round, seed rebuilt on the alternative, teeth now proven by probe. The
  brief was the defect, not the implementer's reading of it.
- **D-2: the spec committed the feature's own defect class, twice.** At the gate, AC-9 named four
  links the fix would delete and two were wrong (T-11 keeps its own advances-field, so the union hid
  the loss; T-12 is the one whose links were map-derived only). Separately, AC-9's prose contained a
  literal `*Advances:*` token, which the checker scraped as a real trace field. **Disposition:** both
  fixed at the gate and recorded in `gate-report.md` as F1 and F2. Recorded here because it is the
  argument for this feature: the errors were caught by measuring, never by reading.
- **D-3: AC-9 said six chains when there are now seven.** This feature's own chain made it seven.
  Caught in T-4's review. **Disposition:** one-word correction, committed with T-4.

## Banked follow-ups (out of scope, recorded so they are not rediscovered)

- **A grammar for stating weaker relations explicitly** (`grounds`, `write side`, `supersedes`).
  ADR-0002 records that this was rejected for scope, not on merit. It is the better long-term answer
  and now has an eval to be judged against.
- **A dangling id inside a parenthetical is now a note rather than a blocking finding.** Defensible
  under the new grammar (a parenthetical is prose, so nothing should resolve) and it stays visible,
  but it is quieter than before and is recorded rather than rediscovered.
- **Fence-blindness** stays unfixed and is now seeded as an expected miss, so the day it is fixed the
  ledger fails loudly and forces the record to be updated.
- **A trace FIELD's value is still scraped from prose.** The sibling of the defect fixed here, and the
  one this spec tripped over at its own gate.

## Checker corroboration

`node checker/sdlc-check.mjs docs/specs/checker-silence-eval/checker-silence-eval.md` exits 0. All
seven chains exit 0. Suite 191/191, exit 0, read directly.
