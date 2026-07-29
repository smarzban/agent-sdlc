# Build report: run-observability

Branch `feat/run-observability`. All four tasks done, reviewed, and green.

## Agent-type roster (pinned at build start)

`implementer`, `reviewer` and `fixer` agent types are registered in this working copy and were used
for their matching roles.

## Isolation

Single shared checkout on `feat/run-observability`, branched from `main` at `61e86bb` (the 0.17.0
release commit). Tasks ran sequentially, since T-2 consumes T-1's event shapes, T-3 wires both, and
T-4 sweeps all three. Every green bar below is the conductor's own run.

## Baseline

`node --test checker/*.test.mjs` -> **191/191, exit 0** at branch point, read directly and unpiped.
All eight existing chains exited 0.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `60ed133` | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6 | 1 Critical, 4 Important, 7 Minor, all closed; carries an amendment |
| T-2 | done | `dd17bae` | AC-7, AC-8, AC-9, AC-10, AC-11 | 1 Critical, 6 Important, 8 Minor, all closed; carries an amendment |
| T-3 | done | `bb9c737` | AC-12, AC-13 | 0 Critical, 8 Important, 8 Minor, all closed |
| T-4 | done | `d7d32a4` | AC-14 | 0 Critical, 2 Important, 5 Minor, all closed |

## Green-bar evidence

### T-1 (@ `60ed133`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 216
# pass 216
# fail 0

ok 17 - AC-1: a caller-supplied --timestamp is rejected, not silently ignored
ok 20 - AC-2: a run-end requires an explicit outcome, and rejects an unrecognized one
ok 21 - AC-2: a run with a start and no end is representable, and distinguishable from a finished run
ok 22 - AC-3: round-start and round-end are separate events, so a round duration is derivable
ok 24 - AC-4: a caller-supplied --head-commit is rejected
ok 31 - AC-5: the default store root lives under the home directory, never inside a repository
ok 33 - AC-5: a malformed (newline-terminated) earlier line never prevents a later append or crashes the reader
ok 35 - AC-6: a missing --run exits nonzero with a diagnostic and writes nothing
```

### T-2 (@ `dd17bae`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 255
# pass 255
# fail 0

ok 45 - AC-8: the table header marks every column measured or claimed
ok 47 - AC-10: the caveat line is always printed, even with zero runs
ok 50 - AC-7/AC-9/AC-11: per-task elapsed, round durations, changed lines/files, findings by severity; incomplete run counted and shown
ok 51 - AC-9: a run with no run-end is incomplete, still counted and shown alongside a complete run
ok 58 - C1/AC-11: identical head commits render as an explicit "unsupported, likely a wiring problem" reason, never a zero
ok 60 - AC-11: a commit that no longer resolves in the repository renders as unsupported, never a fabricated number
```

### T-3 (@ `bb9c737`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 255
# pass 255
# fail 0
```

Prose task. Verification was explicit and declared before writing, and the fix round added an
end-to-end walk: one imaginary two-task build with a review round each, every recorder invocation
written down in order, confirming the events pair, the run identity matches across all three stages,
and the summary renders real numbers with no unknowns forced by missing identity, kind, invocation,
or round numbering.

### T-4 (@ `d7d32a4`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 259
# pass 259
# fail 0

ok 11 - the marker search returns exactly the expected files, outside the spec-chain record
ok 12 - every expected file is readable and genuinely carries the marker
```

The marker test was proven able to fail in both directions (a missing marker and a stray marker,
including a stray planted in another feature's spec chain), and the removal procedure was executed in
a scratch copy and diffed against `main`.

## Amendments

- **T-1: the recorder no longer reads diff statistics.** The implementer and the reviewer
  independently recommended moving that derivation to the summary, where derivation already happens,
  after it pushed the recorder from a formatter into a reader of its own output. AC-4 and AC-7 were
  updated to match, and the recorder shrank from 316 lines to 256.
- **T-2: the size columns were renamed and given a wiring-fault rendering.** They now say what they
  measure, changes between the recorded boundaries, and AC-12 gained the hard requirement that
  `task-end` is recorded after the task's commit, which is what makes the column meaningful at all.

## Deviations

- **D-1: two consultations before the build reshaped the whole chain.** An adversarial review and an
  independent second opinion returned 7 Critical, 12 Important, 6 Minor against the larger design,
  and the decisive finding was not a component defect: the instrument as specified would have shipped
  and produced a confidently wrong conclusion in the same shape as the two that motivated it.
  **Disposition:** scope cut to a marked throwaway experiment, nine tasks to four, and the four
  findings that attack the conclusions rather than the code became criteria. Recorded in
  `gate-report.md` with the mapping from finding to criterion.
- **D-2: every task's Critical or lead finding was the same species.** T-1: a torn last line silently
  destroyed the next event while exiting 0. T-2: the size column would have read zero for every task
  in every run. T-3: no shared run identity, no invocation path, and no `run-end`, so every boundary
  would have announced and proceeded into an empty store. In each case the instrument would have
  reported a confident number, or nothing, rather than admitting it could not see. **Disposition:**
  all fixed; recorded because the pattern is the strongest argument for reviewing an instrument
  against "can it mislead" rather than "does it work".
- **D-3: T-1 carried six criteria, accepted at the gate with its reason.** Its review came back with a
  Critical and four Important, which is at the heavy end, though the fix round closed them without a
  second round. The gate said the acceptance would be visible if it was wrong; the evidence is
  ambiguous rather than damning.

## Banked follow-ups (out of scope, recorded so they are not rediscovered)

- **The wiring has never executed.** Same caveat as the previous chain: the recorder and its wiring
  were written during a run that could not use them. The first instrumented run is the first test,
  and the summary's wiring-fault rendering is what will say so if the ordering is wrong in practice.
- **Instrumentation inflates the number under study.** Every recorder call is a tool call inside the
  run being timed. An uninstrumented control run is worth timing rather than assuming the overhead is
  negligible.

## Checker corroboration

All nine chains under `docs/specs/` exit 0. Suite 259/259, exit 0, read directly.
