# Verification report: run-observability

Every criterion, and the proof that it holds. Twelve of fourteen are test-backed, because this is an
instrument and an instrument that cannot be tested is an opinion.

Green bar at the reviewed head: `node --test checker/*.test.mjs` -> **259/259, exit 0** (read
directly, unpiped). All nine chains under `docs/specs/` exit 0, and this chain passes
`--require ledger`.

One test per row, named verbatim from the suite's own output.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | test-backed | AC-1: a caller-supplied --timestamp is rejected, not silently ignored |
| AC-2 | test-backed | AC-2: a run with a start and no end is representable, and distinguishable from a finished run |
| AC-3 | test-backed | AC-3: round-start and round-end are separate events, so a round duration is derivable |
| AC-4 | test-backed | AC-4: a caller-supplied --head-commit is rejected |
| AC-5 | test-backed | AC-5: the default store root lives under the home directory, never inside a repository |
| AC-6 | test-backed | AC-6: a missing --run exits nonzero with a diagnostic and writes nothing |
| AC-7 | test-backed | AC-7/AC-9/AC-11: per-task elapsed, round durations, changed lines/files, findings by severity; incomplete run counted and shown |
| AC-8 | test-backed | AC-8: the table header marks every column measured or claimed |
| AC-9 | test-backed | AC-9: a run with no run-end is incomplete, still counted and shown alongside a complete run |
| AC-10 | test-backed | AC-10: the caveat line is always printed, even with zero runs |
| AC-11 | test-backed | AC-11: a commit that no longer resolves in the repository renders as unsupported, never a fabricated number |
| AC-12 | reviewer-checked | Do the three stages record their boundaries, in the right order, announcing and proceeding when the recorder is absent? PASS, T-3 (`bb9c737`): gate opens the run, build brackets tasks and rounds, ship closes with an outcome. The reviewer verified the ordering sentence against build's actual step numbering, including the commit-first variant, the resume path and the subagent-death path. The fix round then walked one two-task build end to end, invocation by invocation, confirming events pair and the run identity matches across stages. Run identity is derived by every stage from the feature's spec directory name, so there is no state to lose between stages. |
| AC-13 | reviewer-checked | Does the feedback note state what qualifies, the evidence rule, the never-write list, the local destination, the item format, and that silence is expected? PASS, T-3 (`bb9c737`): stated once in one reference document and referred to from the stages. It carries the trigger nothing else can supply, that a documented step was skipped, weakened, or worked around. |
| AC-14 | test-backed | the marker search returns exactly the expected files, outside the spec-chain record |

## Negative criteria

| Criterion | Held |
| --- | --- |
| NC-1 | No schema version, no migration path, no cross-repository aggregation, no keying strategy. |
| NC-2 | No harvester, and no change to what any stage produces. |
| NC-3 | Nothing transmitted: no network module, no upload, no posting. No secrets, source, or prompts recorded. |
| NC-4 | Nothing consults the recorded data to make a decision. |
| NC-5 | No runtime dependency. |
| NC-6 | The recorder never blocks a stage: it exits non-zero and the stage announces and proceeds. |

## Shortcuts and ceilings

None. No `SHORTCUT(T-N)` was taken.

## What a reader should not over-read

**This has never run.** The recorder and its wiring were written during a run that could not use
them, so the first instrumented run is also their first test. The summary's wiring-fault rendering
exists precisely because the ordering requirement cannot be verified until then.

**The numbers it will produce are bounded in three ways, all of them stated in the instrument's own
output.** Wall clock between boundaries includes rate-limit backoff and idleness and does not isolate
inference. The size column measures changes between recorded boundaries, which absorbs anything else
committed in that window. Findings and notes are the agent's word, marked claimed in every rendering.

**And the instrument changes what it measures**, since every recorder call is a tool call inside the
run being timed. An uninstrumented control run is worth timing rather than assuming the overhead away.

The deliverable of this experiment is the answer, not the code. When the answer exists, the code goes,
by the procedure in `docs/usage/experiment-run-observability.md`.
