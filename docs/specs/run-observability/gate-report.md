# Gate report: run-observability

Read-only consistency and coverage gate over `docs/specs/run-observability/run-observability.md`.
Full-chain entry (idea through plan in one session), so no provenance markers and no mid-chain-entry
coverage note.

## Chain coverage

| Criterion | Component | Product | Task(s) | Status |
| --- | --- | --- | --- | --- |
| AC-1 | recorder | Node >= 22 ESM (declared stack) | T-2 | traced |
| AC-2 | recorder | Node >= 22 ESM, git via the existing facts reader | T-2 | traced |
| AC-3 | recorder | Node >= 22 ESM | T-3 | traced |
| AC-4 | run store | line-delimited JSON | T-1 | traced |
| AC-5 | run store | line-delimited JSON | T-1 | traced |
| AC-6 | recorder | Node >= 22 ESM | T-2 | traced |
| AC-7 | recorder | Node >= 22 ESM | T-3 | traced |
| AC-8 | recorder | Node >= 22 ESM | T-3 | traced |
| AC-9 | reporter | Node >= 22 ESM | T-4 | traced |
| AC-10 | reporter | Node >= 22 ESM | T-5 | traced |
| AC-11 | reporter | Node >= 22 ESM | T-4 | traced |
| AC-12 | harvester | the checker's existing artifact parsers | T-6 | traced |
| AC-13 | feedback channel document | Markdown prose | T-7 | traced |
| AC-14 | feedback channel document | Markdown prose | T-7 | traced |
| AC-15 | feedback channel document | node:test | T-8 | traced |
| AC-16 | gate, build and ship skill texts | Markdown prose | T-9 | traced |
| AC-17 | recorder, reporter, the three skill texts | Node >= 22 ESM, Markdown prose | T-9 | traced |
| AC-18 | recorder, reporter | Node >= 22 ESM | T-2, T-4 | traced |

Coverage is clean in both directions after the findings below. Every criterion is advanced by at
least one task, every task advances at least one criterion, and every component named by a task
exists in the Design. The checker corroborates: exit 0, 0 findings, 0 notes.

## Findings

### F1 (Medium, resolved): a negative criterion with nothing enforcing it

*Location:* NC-1 versus the criteria set. *Owner:* acceptance-criteria.

NC-1 promises that nothing is transmitted anywhere. Nothing in the chain held the build to it: no
criterion, no task, no test. A promise of that shape is the one most likely to be believed without
being checked, and it is exactly the promise a user is trusting when they let a tool record how long
their work took.

The repo already has the pattern that fixes it. The enforcement-spine chain pins the checker's own
imports to standard-library modules by test. Added AC-18: the recorder's and the reporter's imports
are confined to a declared allowlist containing nothing network-capable, advanced by T-2 and T-4.

That converts NC-1 from a statement of intent into a property a test fails on.

### F2 (Medium, resolved): a compound criterion, half code and half prose

*Location:* AC-6 as originally written. *Owner:* acceptance-criteria.

AC-6 asserted both a code behaviour (non-zero exit, no partial write) and a documented contract (the
stage announces and proceeds), under one test-backed verification type. The prose half cannot be
unit-tested, so the criterion would have been reported as met by a test that only exercised the code
half, and the documented half could have gone missing silently.

Narrowed AC-6 to the code behaviour, and pointed it at AC-16, which already carries the documented
half as a reviewer-checked criterion. Same class as the compound-hook finding on the previous chain,
which suggests the pattern is worth watching for at this stage generally.

### F3 (Low, resolved): a criterion whose components disagreed with its task's

*Location:* AC-17 in the criterion-to-component map versus T-9's component field. *Owner:* plan.

AC-17 constrains the recorder, the reporter, and the documented wiring, but the map listed only the
first two while the task advancing it named only the three skill texts. Neither side was wrong on its
own and together they described different scopes. Corrected the map to list all five, since AC-17 is
a cross-cutting inspection over the whole surface rather than a property of one component.

## Constitution and convention checks

- **Rules-ratchet:** no new checker rule and no grammar change. The recorder and reporter are new
  programs beside the checker, and NC-7 keeps them from consulting it or it them.
- **Fail-closed direction:** on doubt the recorder writes nothing and says so. A missing record is
  honest; a fabricated one poisons every aggregate built on it afterwards.
- **Privacy is structural, not procedural.** AC-3 removes the possibility of a free-text field rather
  than instructing anyone to be careful, which is the same move as writing a scratch artifact to a
  temporary directory instead of remembering not to commit it.
- **Portability:** AC-17 holds the whole surface to assuming no language, build tool, test runner, or
  layout. This is the criterion most likely to be quietly violated, because the repo it is developed
  in is a Node repo.
- **No em-dashes** in the new spec text. Checked.
- **Unresolved placeholders:** none.

## Ordering and sizing check

Nine tasks, each one concern, each with a small expected diff. That is a deliberate response to the
sizing evidence gathered this week: elsewhere, the tasks that ran an hour or more were the ones
bundling several concerns, and their review rounds inherited the same size. T-1 and T-7 have no
dependencies and can start together; T-4 and T-6 unblock as soon as T-1 lands.

## Risks noted, not findings

- **The instrument measures what it can reach, not what costs the most.** A clock is trustworthy at a
  boundary, and everything between boundaries is model inference. This will show that a task took 45
  minutes over a 2,200-line diff and two rounds; it will not show why the implementer needed 239
  turns. Token counts would, where a harness exposes them, which is why they are optional rather than
  absent. The chain should not later be read as claiming more resolution than it has.
- **An unused instrument is a dead one.** Nothing consults the store in this release, by choice
  (NC-3). The risk is that recording becomes ceremony nobody reads. The mitigation is that the next
  milestone is instrumented from its first task, so a baseline exists before anyone argues from
  memory again.

## Verdict

**Ready to build.** Three findings raised and resolved in-flight (two Medium, one Low). No finding
remains open, the chain exits 0 under the checker, and coverage is complete in both directions.
