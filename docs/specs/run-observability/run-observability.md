# run-observability

> **EXPERIMENT: run-observability.** Everything this chain ships is deliberately temporary. It exists
> to answer one question on a handful of real runs and is then deleted. Every file it touches carries
> the marker `EXPERIMENT: run-observability`, so removal is a grep and not an archaeology exercise.

## Brief

### Problem / intent

agent-sdlc records what a run produced and nothing about what it cost, so every question about the
pipeline's own performance is answered from memory. Memory has now been wrong twice under
observation.

Asked why tasks were slow, an experienced agent blamed the green bar. Measured, the bar was 6.4
seconds warm against a 100-minute task, and 93% of that task was model inference. Given better data,
the same reasoning produced a second wrong remedy: cut review from the cheapest tasks in the run,
saving about 2.5% of the clock by removing scrutiny from the only tasks cheap enough to review twice.
Neither error was caught by the agents involved. Both were caught by a table of numbers.

The open question is narrow and worth a few days: **on a real milestone, where does the time actually
go, and what does it buy?** Specifically, whether elapsed time is driven by task size or by review
rounds, which are different problems with opposite remedies and which one worked example cannot
separate.

### Scope

- A **recorder**: one small script appending one line per event to a local file.
- A **summary**: one small script printing a table a human reads.
- **Wiring** at the stage boundaries that bound a run and around each review round.
- A **feedback file**: rare, evidence-bound notes on defects in the pipeline itself, for the same
  handful of runs.
- **A removal marker** in every file touched.

### Non-goals

This is throwaway instrumentation for a few runs on our own machines, not a product. Explicitly not
built, and each for the same reason:

- **No schema version, no migration story.** Nothing will ever hold data in an old shape.
- **No repository keying strategy, no cross-repository aggregation.** Three projects, named by hand.
- **No harvester.** The signals it would collect do not exist in machine-readable form, and creating
  them means changing what the build stage writes, which is a real change and not a throwaway one.
- **No import allowlist, no privacy hardening, no redaction machinery.** Our repos, our machines,
  deleted afterwards. The one rule that stays is: no secrets, no source, no prompts.
- **No gate.** Nothing consults the data to make a decision, then or later.
- **No changes to what any stage produces.**

### Chosen approach

**The smallest thing that can answer the question, plus the four properties that stop it answering it
wrongly.** Two consultations before any code found seven critical defects in a larger design, and
almost all of them were attacking a durable product. What survived scoping down are the four that
attack the *conclusions*, and those are kept in full:

1. **Record why a run ended** (finished, failed, abandoned), and show incomplete runs in the summary.
   Without this the runs that went worst are the least likely to record an end, so the aggregate is
   biased toward runs that went well, and the bias is invisible.
2. **Label every column measured or claimed.** Timings and diff sizes are read from a clock and from
   git. Review rounds and findings are the agent's word. A self-reported zero rendered beside a
   measured minute reads as a fact, which is precisely the failure this experiment exists to correct.
3. **Timestamp each review round, not just count them.** This is the one measurement that separates
   "task size drives cost" from "review rounds drive cost". Both fit the single worked example we
   have, and they have opposite remedies.
4. **State what the number cannot see.** Wall clock at a boundary includes rate-limit backoff, a
   stall, or a lunch break, and nothing distinguishes those from inference. The summary says so on
   its face, every time it renders.

Alternatives considered and rejected: a durable telemetry product (correct target, wrong order, and
it invites the schema and privacy work this question does not need); and doing nothing and reasoning
from the existing anecdote, rejected because the anecdote has already produced two wrong answers.

### Resolved key decisions

- **Throwaway, marked, and greppable.** One marker string in every file touched.
- **Local files, outside the repository under work**, so nothing is ever committed or swept into a
  diff by accident.
- **Machine-read where a clock or git can see it, agent-reported otherwise, and labelled in the
  output rather than only in the file.** A namespace in a JSON line does not survive into the table a
  human actually reads.
- **The feedback file rides along** as part of the same experiment, with the one trigger nothing else
  can supply: report when a documented step was skipped, weakened, or worked around.
- **The honest goal** is not to make the pipeline faster. It is to find out where the time goes on
  three real projects, then delete the instrument and keep the answer.

### Glossary terms touched

None permanent. The experiment's vocabulary (run record, stage boundary, feedback item) lives in this
chain and leaves with it.

### ADRs

None. Every decision here is reversible by deleting the files.

## Acceptance Criteria

The bar is "can this answer the question without misleading us", not "is this a good system".

### The recorder (test-backed)

- **AC-1**: The recorder appends one event per invocation with its own timestamp, and never accepts a
  caller-supplied time or duration. Elapsed is derived when the summary is read, from a pair of
  events. *(Verification type: **test-backed**, unit.)*
- **AC-2**: A run's end event carries an explicit outcome: finished, failed, or abandoned. A run with
  a start and no end is representable and is never silently equivalent to one that finished.
  *(Verification type: **test-backed**, unit.)*
- **AC-3**: Review rounds are recorded as their own start and end events, so a round's duration is
  derivable and not merely its count. *(Verification type: **test-backed**, unit.)*
- **AC-4**: Machine-read fields (timestamp, head commit) and agent-reported fields (findings by
  severity) are stored in separate namespaces, and the recorder rejects a
  caller-supplied value for any machine field. There is no free-text field anywhere in the schema:
  reported fields are numeric or enumerated only, so nothing exists for a secret, source, or prompt
  fragment to land in (NC-3). Changed lines and files are not read by the recorder:
  the summary derives them at read time from a pair of recorded head commits. *(Verification type: **test-backed**,
  unit.)*
- **AC-5**: Writes are appends to a file outside the repository under work, and a malformed earlier
  line never prevents a later append or crashes the reader. *(Verification type: **test-backed**,
  unit.)*
- **AC-6**: A recorder failure exits non-zero with a diagnostic and writes nothing partial. It never
  blocks the stage that called it: the stage announces and proceeds. *(Verification type:
  **test-backed**, unit.)*

### The summary (test-backed)

- **AC-7**: The summary renders, per task: elapsed, review-round count (never undercounted by a gap
  in the round numbering) and each round's duration, lines and files changed **between the recorded
  task-start and task-end boundaries** (derived by the summary itself from a pair of recorded head
  commits, not read from the recorder's events, and named for what it measures rather than implying
  it isolates the task's own diff), and findings by severity. *(Verification type: **test-backed**,
  unit.)*
- **AC-8**: Every rendered column is marked measured or claimed, in the rendering itself and not only
  in the underlying file. *(Verification type: **test-backed**, unit.)*
- **AC-9**: Runs that did not finish are counted and shown, never dropped. A summary over runs where
  any run is incomplete says so prominently, so no aggregate is read as complete when it is not.
  *(Verification type: **test-backed**, unit.)*
- **AC-10**: The summary states, every time it renders, that elapsed wall time includes waiting and
  idleness and does not isolate model inference. *(Verification type: **test-backed**, unit.)*
- **AC-11**: The summary derives nothing it cannot support: an unpaired event, an absent field, or a
  missing round is shown as such and never rendered as zero. *(Verification type: **test-backed**,
  unit.)*

### Wiring and removal (reviewer-checked)

- **AC-12**: The stages that bound a run record their boundaries and their review rounds, and each
  states what it does when the recorder is unavailable: announce and proceed. `task-end` is recorded
  **after** the task's own commit lands, never before: AC-7's between-boundaries column is only
  meaningful under that ordering, and identical head commits are the summary's signal that this
  ordering was not followed for a given task. *(Verification type: **reviewer-checked**, Spec
  Conformance.)*
- **AC-13**: The feedback file is described once: what qualifies (including that a documented step
  was skipped, weakened, or worked around), the evidence rule (cite the command, the error, or the
  quoted line, or do not write it), the local destination, and that writing nothing is the expected
  outcome. *(Verification type: **reviewer-checked**, Spec Conformance.)*
- **AC-14**: Every file this chain touches carries the marker `EXPERIMENT: run-observability`, and
  one document states how to remove the experiment completely. Falsifiable: a search for the marker
  returns every touched file and nothing else. *(Verification type: **test-backed**, unit.)*

### Negative criteria

- **NC-1**: No schema version, no migration path, no cross-repository aggregation, no keying strategy.
- **NC-2**: No harvester, and no change to what any stage produces.
- **NC-3**: Nothing is transmitted anywhere, and no secrets, source, or prompts are recorded.
- **NC-4**: Nothing consults the recorded data to make a decision.
- **NC-5**: No runtime dependency.
- **NC-6**: The recorder never blocks a stage.

### Verification map

| Criterion | Oracle kind / review axis |
| --- | --- |
| AC-1 | unit |
| AC-2 | unit |
| AC-3 | unit |
| AC-4 | unit |
| AC-5 | unit |
| AC-6 | unit |
| AC-7 | unit |
| AC-8 | unit |
| AC-9 | unit |
| AC-10 | unit |
| AC-11 | unit |
| AC-12 | Spec Conformance |
| AC-13 | Spec Conformance |
| AC-14 | unit |

### Glossary terms touched

None.

## Design

Two small programs and three short paragraphs of instruction. Nothing is added to the trusted half of
the repo: the checker verifies the chain, this observes a run, and neither consults the other.

### Components

1. **recorder**: appends one event per invocation. Owns the clock and its own head-commit read, keeps
   reported fields separate from machine fields. Kind: a zero-dependency command-line script.
2. **summary**: reads the file, derives changed lines and files from pairs of recorded head commits
   via git, and prints a table, marking each column measured or claimed and naming what the numbers
   cannot see. Kind: a read-only command-line script (reads the file and reads git; writes nothing).
3. **feedback note**: the short instruction describing when to write a note about the pipeline
   itself. Kind: instruction text.

### Outside the checker (changed components)

1. **gate skill text**: records its boundary.
2. **build skill text**: records task boundaries and review-round boundaries.
3. **ship skill text**: records the closing boundary and the run outcome.

### Contracts

**recorder.** In: an event kind, a run and task identity, and reported fields. Out: one appended
line, or a non-zero exit with a diagnostic and nothing written. Rejects caller-supplied machine
values. Writes only outside the repository under work.

**summary.** In: the file. Out: a rendered table plus a completeness line and a caveat line.
Read-only (it may run `git diff --shortstat` between two recorded head commits, but writes nothing
and consults no other source), and derives nothing it cannot support: an unresolvable commit pair
renders as unknown, never as a fabricated zero.

### Data flow and key state

One direction only: stage to recorder to file, then file to summary to a human. Nothing reads the
file to make a decision.

### Trust and failure boundaries

Machine-read and agent-reported are separated in the file and, more importantly, in the rendering:
the table is what a person reasons from, and an unlabelled claimed column beside a measured one is
how an opinion acquires the authority of a measurement. On doubt the recorder writes nothing and says
so, because a missing record is honest and a fabricated one poisons every reading afterwards.

### Criterion to component map

| Criterion | Component |
| --- | --- |
| AC-1 | recorder |
| AC-2 | recorder |
| AC-3 | recorder |
| AC-4 | recorder |
| AC-5 | recorder |
| AC-6 | recorder |
| AC-7 | summary |
| AC-8 | summary |
| AC-9 | summary |
| AC-10 | summary |
| AC-11 | summary |
| AC-12 | gate skill text, build skill text, ship skill text |
| AC-13 | feedback note |
| AC-14 | recorder, summary, feedback note |

### ADRs created

None.

### Glossary terms touched

None.

## Tech Stack

Fast path. No new product, no dependency, no runtime.

### Load-bearing claims

- **Node >= 22, ESM, zero dependencies**, matching the checker, so both scripts run wherever the
  checker already does.
- **Line-delimited JSON appended to a file**, because a torn last line never invalidates earlier ones
  and every maintainer can read it without a tool.
- **Git facts through the same fixed-argument-vector approach the checker already uses**, no shell
  interpolation.
- **The existing node:test suite**, picked up by the existing glob, so no CI change.

### Unverified / flagged

None.

### Glossary terms touched

None.

## Plan

Four tasks. The recorder is useless without the summary, so they land together before anything is
wired.

### Tasks

- **T-1 - The recorder.** Events with their own timestamps, run and round boundaries, explicit run
  outcome, machine and reported fields kept apart, appends outside the repo, non-blocking failure.
  Files: `checker/experiment-record.mjs` (new), `checker/experiment-record.test.mjs` (new).
  Test-first: a caller-supplied timestamp is rejected, and a run with no end is representable.
  *Advances:* AC-1, AC-2, AC-3, AC-4, AC-5, AC-6. *Component:* recorder. *Deps:* none.
- **T-2 - The summary.** Per-task table with round durations, every column marked measured or claimed,
  incomplete runs counted and shown, the wall-clock caveat rendered every time, nothing derived that
  cannot be supported. Derives changed lines and files itself, from `git diff --shortstat` between
  each pair of recorded head commits (moved here from the recorder; see AC-4's amendment). Files:
  `checker/experiment-report.mjs` (new), `checker/experiment-report.test.mjs` (new). Test-first: an
  unpaired event renders as unpaired, never as zero.
  *Advances:* AC-7, AC-8, AC-9, AC-10, AC-11. *Component:* summary. *Deps:* T-1.
- **T-3 - Wiring and the feedback note.** Boundary and round recording in the three stages that bound
  a run, each stating the announce-and-proceed behaviour when the recorder is absent, plus the
  feedback note stated once. Files: `skills/gate/SKILL.md` (edit), `skills/build/SKILL.md` (edit),
  `skills/ship/SKILL.md` (edit), `skills/getting-started/reference/experiment-feedback.md` (new).
  Test-first: explicit verification, each stage states where it records and what it does when the
  recorder is missing.
  *Advances:* AC-12, AC-13. *Component:* gate skill text, build skill text, ship skill text. *Deps:* T-1.
- **T-4 - The removal marker.** Every touched file carries the marker, and one document states how to
  remove the experiment completely. Files: `docs/usage/experiment-run-observability.md` (new), plus
  the marker added wherever it is missing, and `checker/experiment-marker.test.mjs` (new).
  Test-first: the marker search returns every touched file and nothing else.
  *Advances:* AC-14. *Component:* recorder, summary, feedback note. *Deps:* T-2, T-3.

### Task-to-criterion coverage map

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-1 |
| AC-2 | T-1 |
| AC-3 | T-1 |
| AC-4 | T-1 |
| AC-5 | T-1 |
| AC-6 | T-1 |
| AC-7 | T-2 |
| AC-8 | T-2 |
| AC-9 | T-2 |
| AC-10 | T-2 |
| AC-11 | T-2 |
| AC-12 | T-3 |
| AC-13 | T-3 |
| AC-14 | T-4 |

### Notes

- T-1 carries six criteria because they are one program's behaviour, and the expected diff is small.
- The experiment is deleted after the data is gathered. The answer is the deliverable, not the code.
