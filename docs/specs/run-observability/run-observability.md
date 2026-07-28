# run-observability

## Brief

### Problem / intent

agent-sdlc records what a run *produced* (gate reports, build ledgers, verification reports) and
nothing about what it *cost*. So every question about the pipeline's own performance is answered by
narration, and narration has now been wrong twice in a row under observation.

Asked why tasks were slow, an experienced agent attributed the majority of elapsed time to the green
bar. Measured, the bar was 6.4 seconds warm against a 100-minute task, and 93% of the time was model
inference. Asked again with better data, the same reasoning produced a second wrong remedy: cut
review on the cheapest tasks in the run, which would have saved about 2.5% of the clock by removing
scrutiny from the only tasks cheap enough to review twice. Neither error was caught by the agents
involved. Both were caught by a table of numbers.

That is the gap. The pipeline's cost, and the quality it buys with that cost, are unobservable to the
people improving it, so improvements are argued rather than demonstrated. The same blindness applies
to usability: a stage that is routinely worked around leaves no trace outside the repo it happened
in.

This feature makes a run observable, in both directions: what it cost, and what that cost bought.

### Scope

- **A run record**: structured, append-only, one line per stage boundary and per task, written to a
  location outside the repository.
- **The recorder is committed code**, not narration. It stamps its own clock and reads git facts
  itself; the agent supplies only fields a clock and git cannot see, and those are corroborable
  against artifacts already on disk.
- **Cost and quality in the same record**, deliberately: elapsed per stage and per task, review
  rounds, findings by severity per round, diff lines and files, commits after first green, tripwires
  fired, deviations recorded.
- **Harness enrichment where available** (tokens, tool-use counts), marked explicitly absent where it
  is not, never silently omitted.
- **Harvested signals**: what the pipeline already writes (deviations, tripwires, rounds) is
  collected automatically, never re-typed.
- **A prose feedback channel**, rare and evidence-bound, for tool defects that have no structured
  home. Silence is the expected outcome.
- **A read-only reporter** that summarises one run and aggregates across runs and repos.

### Non-goals

- **A shipping gate on the numbers.** The destination, and deliberately not this release. A gate
  needs a baseline that does not exist yet, and agent wall time is noisy enough that gating on one or
  two runs would flag variance as regression. The eval harness this borrows from carries that exact
  caveat about small samples. Build the instrument, instrument a real milestone, then decide a
  threshold from data.
- **Any transmission of anything, anywhere.** No upload, no phone-home, no issue opened, no PR
  comment, nothing in a commit. The data stays on the machine that produced it and its owner decides
  if it is ever shared.
- **File contents, prompts, diffs, titles, or identifiers of the work.** Counts and durations only.
  A privacy rule simple enough to hold is worth more than a rich record nobody trusts.
- **Requiring token counts.** They are the truest cost signal available but are not portable across
  harnesses, so a schema that requires them fails the any-repo constraint.
- **Changing what any stage produces.** This adds recording; it alters no artifact.
- **A second enforcement mechanism.** The checker verifies the chain. This measures the run. They do
  not overlap and the recorder never blocks.

### Chosen approach

**A committed recorder writing a machine-stamped envelope plus corroborable agent fields, stored
outside the repository, read by an advisory reporter, with a rare evidence-bound prose channel
beside it.**

Alternatives considered:

- *Agent-written records.* Zero new code and perfectly portable, rejected on the evidence above: the
  numbers we would reason from would be self-reported by the same process whose self-reports we are
  trying to check. The repo already separates instruction from enforcement for exactly this reason.
- *Records inside the repo, untracked.* Simplest to correlate with a spec chain, rejected on
  experience: an untracked file in the repo root is what got swept into a task reviewer's diff and
  became a shipped bug fix. Untracked also means an ordinary clean discards the history being
  collected.
- *Cost-only telemetry.* Cheaper and dangerous. An instrument that shows time but not the quality it
  buys makes every cut look free, and would have made "skip the review" look like a win twice today.
- *Feedback as pure by-product, or as a pure deliberate act.* Rejected in both pure forms: the
  structured half is already written and should never be re-typed, and the prose half has no
  structured home to be harvested from.

### Resolved key decisions

- **Hybrid recording.** The recorder owns timestamps, elapsed, branch, commit, diff lines and files.
  The agent supplies rounds, findings by severity, tripwires and deviations, which are corroborable
  against the findings files and ledgers already on disk, exactly as the ledger-versus-git rule
  already works.
- **Stored outside the repository, keyed by repo.** Structurally cannot be committed, swept into a
  diff, or leaked into a pull request, survives a clean, and puts every repo's runs in one place,
  which is the only place a cross-run conclusion can be drawn.
- **Cost and quality in one record.** Findings by severity per round and commits after first green
  are the two columns that make a claim of no quality loss checkable rather than asserted.
- **Advisory reporter now, gate later**, with the reason recorded so the deferral is not mistaken for
  an oversight.
- **Two channels, two volume properties, two files.** Harvested signals write every run; prose
  feedback writes almost never. They must not contaminate each other, because a channel that fills
  with filler stops being read, which costs the reports that mattered.
- **The prose channel carries one trigger nothing else can supply:** report when you skipped,
  weakened, or worked around a documented step of the pipeline. That is what a maintainer cannot
  otherwise see, and what an agent is least inclined to volunteer.
- **The channel removes itself before 1.0.0**, enforced by a test rather than by memory.

### Glossary terms touched

New: **run record**, **stage boundary**, **harvested signal**, **feedback item**. The
cost-versus-quality pairing is the load-bearing idea and belongs in the glossary with them.

### ADRs

One offered, to be written at the design stage: **the recording trust model and its storage
location**. It meets the three-part test. Hard to reverse, since a schema and a storage path become a
contract the moment anyone has data in the old shape. Surprising without context, since "the agent
may not report its own timings" reads as distrust of a component we otherwise trust to write code.
And a real tradeoff, since the machine-stamped half costs a tool call per boundary, which slightly
increases the very thing being measured.

## Acceptance Criteria

Two terms are load-bearing enough to restate inline. A **machine field** is one the recorder reads
itself, from a clock or from git. A **reported field** is one only the agent can know. The whole
trust model is that a reader can always tell which is which.

### The recorder: machine fields (test-backed)

- **AC-1**: The recorder writes a start event and an end event, each stamped from its own clock.
  Elapsed is derived by the reader from the pair and is never accepted as an input, so an agent can
  fail to record a boundary but cannot state a duration. *(Verification type: **test-backed**, unit.)*
- **AC-2**: Branch, head commit, and changed lines and files are read by the recorder from git, and a
  caller-supplied value for any of them is rejected rather than trusted. *(Verification type:
  **test-backed**, unit.)*
- **AC-3**: A run record carries no free text. Every field is a number, a timestamp, an enumerated
  value, or an identifier matching a declared shape, and anything else is rejected. Privacy is
  structural rather than remembered: there is no field a file path, a prompt, or a snippet of source
  could be written into. *(Verification type: **test-backed**, unit.)*
- **AC-4**: Records are append-only, one event per line, each carrying a schema version. A malformed
  or truncated earlier line never prevents a later append and never crashes the reader.
  *(Verification type: **test-backed**, unit.)*
- **AC-5**: The store lives outside the repository and is keyed by the repository's remote when it
  has one, falling back to a hash of its absolute path. Two checkouts sharing a directory name never
  write to the same key. Falsifiable: the naive basename key that a sibling tool uses collides on
  exactly this case. *(Verification type: **test-backed**, unit.)*
- **AC-6**: On any failure the recorder exits non-zero with a diagnostic on stderr and writes nothing
  partial, so a failed record is always distinguishable from a stage that never ran. The documented
  half, that a stage announces the failure and proceeds, is AC-16's. *(Verification type:
  **test-backed**, unit.)*

### The recorder: reported fields (test-backed)

- **AC-7**: Agent-supplied fields (review rounds, findings by severity, tripwires fired, deviations
  recorded) are namespaced separately from machine fields in every record, so no reader can mistake a
  claim for an observation. *(Verification type: **test-backed**, unit.)*
- **AC-8**: Harness enrichment (token counts, tool-use counts) is optional, and its absence is
  recorded as explicitly absent rather than as zero. A reader can always distinguish "the harness
  does not expose this" from "this was zero". *(Verification type: **test-backed**, unit.)*

### The reporter (test-backed)

- **AC-9**: The reporter summarises one run: elapsed per stage and per task, review rounds, findings
  by severity, changed lines and files, commits after first green, and the share of elapsed time that
  fell after the first green bar. *(Verification type: **test-backed**, unit.)*
- **AC-10**: The reporter aggregates across runs and across repositories in one view, since a
  cross-run pattern is the only kind that justifies a pipeline change. *(Verification type:
  **test-backed**, unit.)*
- **AC-11**: The reporter never fabricates a number it cannot derive. An unpaired boundary, an absent
  enrichment, or a missing record is reported as such, never rendered as zero or silently omitted.
  *(Verification type: **test-backed**, unit.)*

### Harvest (test-backed)

- **AC-12**: Signals the pipeline already writes into its own artifacts (recorded deviations, review
  rounds) are collected from those artifacts rather than re-typed by the agent, and a signal that
  cannot be parsed is reported rather than dropped. *(Verification type: **test-backed**, unit.)*

### The feedback channel (reviewer-checked)

- **AC-13**: The channel is stated once, in one document, and the stages that end a run refer to it
  rather than restating it. *(Verification type: **reviewer-checked**, Spec Conformance.)*
- **AC-14**: The channel states: what qualifies, including the trigger that a documented step was
  skipped, weakened, or worked around; the evidence rule (cite the command, the error, or the quoted
  line, or do not report); what must never be written (praise, feature wishes, speculation, recaps);
  the local-only destination outside the repository; a redaction rule; a fixed short item format; and
  that writing nothing is the expected outcome of a run. *(Verification type: **reviewer-checked**,
  Spec Conformance.)*
- **AC-15**: The channel is marked for removal before a 1.0.0 release, and the removal is enforced by
  a test that fails while the marker survives at a 1.x version, not by anyone remembering.
  *(Verification type: **test-backed**, unit.)*

### Portability and wiring (reviewer-checked)

- **AC-16**: The stages that bound a run record their boundaries, and the recorder is resolved by the
  same rule the checker already uses, degrading loudly and proceeding when it cannot be resolved.
  *(Verification type: **reviewer-checked**, Spec Conformance.)*
- **AC-17**: Nothing in the recorder, the reporter, or the documented wiring assumes a language,
  build tool, test runner, or directory layout of the repository being worked on. Falsifiable by
  inspection: no invocation of a stack-specific command, and no path convention outside the store
  and the spec tree. *(Verification type: **reviewer-checked**, Spec Conformance.)*
- **AC-18**: The recorder's and the reporter's imports are confined to a declared allowlist of
  standard-library modules, none of them network-capable. This is what makes the no-transmission
  promise checkable rather than a statement of intent, and it mirrors the existing rule that pins the
  checker's own imports. *(Verification type: **test-backed**, unit.)*

### Negative criteria

- **NC-1**: Nothing is transmitted anywhere: no upload, no network call, no issue, no pull-request
  comment, nothing added to a commit.
- **NC-2**: No file contents, prompts, diffs, titles, or work identifiers are recorded. Counts,
  durations, and enumerated values only.
- **NC-3**: No shipping gate on the numbers in this release. Deferred with its reason.
- **NC-4**: The recorder never blocks, never fails a stage, and never writes inside the repository
  being worked on.
- **NC-5**: No change to what any stage produces. This adds recording; it alters no artifact.
- **NC-6**: No runtime dependency, and no requirement that a harness expose token counts.
- **NC-7**: No second enforcement mechanism. The checker verifies the chain; this measures the run;
  neither consults the other.

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
| AC-12 | unit |
| AC-13 | Spec Conformance |
| AC-14 | Spec Conformance |
| AC-15 | unit |
| AC-16 | Spec Conformance |
| AC-17 | Spec Conformance |
| AC-18 | unit |

### Glossary terms touched

`run record`, `stage boundary`, `harvested signal` and `feedback item` were added at the idea stage.
`machine field` and `reported field` are defined inline above and are added at this stage.

## Design

The instruction and enforcement split holds and gains a third role. Skills instruct, the checker
verifies the chain, and the recorder observes the run. The recorder is trusted code for the same
reason the checker is: what it reports must not be what the agent says happened.

### Components

1. **recorder**: Appends one event per stage boundary. Owns the clock and the git reads, validates
   every field against the schema, and refuses anything free-form. Kind: a zero-dependency
   command-line program.
2. **run store**: The on-disk shape and location of the records, and the repository keying rule.
   Kind: an append-only line-delimited file tree outside the repository.
3. **reporter**: Derives durations from boundary pairs and renders a single run or an aggregate.
   Kind: a pure read-only command-line program over the store.
4. **harvester**: Extracts signals the pipeline already wrote into its own artifacts. Kind: a pure
   parsing function reusing the checker's existing artifact parsers.
5. **feedback channel document**: States what qualifies, the evidence rule, the destination, and the
   format, once. Kind: an instruction document.

### Outside the checker (changed components)

1. **gate skill text**: records its boundary.
2. **build skill text**: records task boundaries and the harvested per-task signals.
3. **ship skill text**: records the closing boundary.

### Contracts

**recorder.** In: an event kind, a run identity, and reported fields as typed arguments. Out: one
appended line, or a non-zero exit with a diagnostic and nothing written. It reads the clock, the
branch, the head, and the diff statistics itself, and rejects any attempt to supply them. It never
writes inside the repository under work, never emits partial lines, and never exits zero on a failed
write: a silent success on a failed record is worse than a loud failure, because the absence is
indistinguishable from a stage that never ran.

**run store.** Keyed by the repository's remote when one exists, otherwise by a hash of its absolute
path, never by its directory name. Each line carries a schema version, because a schema becomes a
contract the moment anyone holds data in the old shape.

**reporter.** In: the store, optionally filtered. Out: a rendered summary. Pure and read-only. It
derives every duration from a boundary pair and reports an unpaired boundary as unpaired. Never
mutates the store, never repairs a malformed line, never infers a missing value.

**harvester.** In: a build report. Out: the deviations and rounds it declares. A signal it cannot
parse is reported, never dropped, because a harvester that silently drops is a channel that quietly
empties.

### Data flow and key state

Boundaries flow one way: stage to recorder to store. The reporter reads and renders. Nothing reads
the store to make a decision, in this release by choice, which is what keeps the recorder harmless:
no stage can be blocked, slowed, or altered by what a previous run recorded.

### Trust and failure boundaries

The recorder is trusted for what it observes and neutral about what it is told, which is why the two
kinds of field are namespaced apart rather than merged into one flat record. The failure direction is
chosen deliberately: on any doubt the recorder writes nothing and says so, because a missing record
is honest while a fabricated one silently poisons every aggregate built on it afterwards.

The privacy boundary is structural, not procedural. There is no free-text field, so there is no field
for a secret to be written into, and no reviewer has to remember to check.

### Criterion to component map

| Criterion | Component |
| --- | --- |
| AC-1 | recorder |
| AC-2 | recorder |
| AC-3 | recorder |
| AC-4 | run store |
| AC-5 | run store |
| AC-6 | recorder |
| AC-7 | recorder |
| AC-8 | recorder |
| AC-9 | reporter |
| AC-10 | reporter |
| AC-11 | reporter |
| AC-12 | harvester |
| AC-13 | feedback channel document |
| AC-14 | feedback channel document |
| AC-15 | feedback channel document |
| AC-16 | gate skill text, build skill text, ship skill text |
| AC-17 | recorder, reporter, gate skill text, build skill text, ship skill text |
| AC-18 | recorder, reporter |

### ADRs created

`ADR-0003`: the recording trust model and the store's location. Records why timings are machine-read
rather than reported, why the store sits outside the repository and is keyed by remote rather than by
directory name, and the accepted cost of a tool call per boundary.

### Glossary terms touched

`machine field` and `reported field` added at the acceptance-criteria stage.

## Tech Stack

Fast path: no new product. Every component is realized by what the repo already declares, pins, and
ships.

### Load-bearing claims

- **Runtime: Node >= 22, ESM, zero runtime dependencies.** Unchanged, and already the checker's
  declared stack. The recorder and reporter are siblings of the existing checker binary and inherit
  its resolution rule.
- **Storage format: line-delimited JSON, written with an append.** No dependency, crash-safe in the
  only way that matters here (a torn last line never invalidates earlier ones), and readable by every
  tool a maintainer already has.
- **Git facts via the existing repository-facts reader.** The checker already shells out to git under
  a fixed argument vector with no shell interpolation; the recorder reuses that path rather than
  inventing a second one.
- **Test runner: the existing node:test suite**, picked up by the existing glob, so no CI change.

### Unverified / flagged

- **Token and tool-use counts are harness-specific and unpinned.** They are optional by design, and
  the schema records their absence rather than assuming a shape. No claim is made that any harness
  supplies them.

### Glossary terms touched

None.

## Plan

Ordered so the store's shape is settled before anything writes to it, and so each task is one
concern with a small expected diff. The feedback channel is independent of the recorder and can run
in parallel with it.

### Tasks

- **T-1 - The store: schema, keying, and append.** Define the event schema (versioned), the repository
  keying rule (remote, else path hash, never basename), and the append behaviour including tolerance
  of a malformed earlier line. Files: `checker/run-store.mjs` (new), `checker/run-store.test.mjs`
  (new). Test-first: the basename-collision case, which is the failure a sibling tool actually has.
  *Advances:* AC-4, AC-5. *Component:* run store. *Deps:* none.
- **T-2 - The recorder: machine fields.** The command-line program, its clock, its git reads, and its
  refusal of caller-supplied machine values. Files: `checker/sdlc-record.mjs` (new),
  `checker/record.test.mjs` (new), `bin/sdlc-record` (new). Test-first: a caller supplying a branch or
  an elapsed value is rejected.
  *Advances:* AC-1, AC-2, AC-6, AC-18. *Component:* recorder. *Deps:* T-1.
- **T-3 - The recorder: reported fields and the no-free-text rule.** Typed reported fields, namespaced
  apart from machine fields, with validation that rejects anything not numeric, enumerated, or a
  declared identifier, plus explicit-absence for harness enrichment. Files: `checker/sdlc-record.mjs`
  (edit), `checker/record.test.mjs` (edit). Test-first: a free-text value is rejected, and an absent
  enrichment reads as absent rather than zero.
  *Advances:* AC-3, AC-7, AC-8. *Component:* recorder. *Deps:* T-2.
- **T-4 - The reporter: one run.** Derive durations from boundary pairs, render per-stage and per-task
  lines, the post-first-green share, and report an unpaired boundary as unpaired. Files:
  `checker/sdlc-report.mjs` (new), `checker/report.test.mjs` (new), `bin/sdlc-report` (new).
  Test-first: an unpaired boundary is reported, never rendered as zero.
  *Advances:* AC-9, AC-11, AC-18. *Component:* reporter. *Deps:* T-1.
- **T-5 - The reporter: aggregate across runs and repos.** Files: `checker/sdlc-report.mjs` (edit),
  `checker/report.test.mjs` (edit). Test-first: two repositories with the same directory name
  aggregate separately.
  *Advances:* AC-10. *Component:* reporter. *Deps:* T-4.
- **T-6 - The harvester.** Extract recorded deviations and review rounds from a build report, reusing
  the checker's existing parsers, reporting rather than dropping an unparseable signal. Files:
  `checker/harvest.mjs` (new), `checker/harvest.test.mjs` (new). Test-first: an unparseable signal is
  reported.
  *Advances:* AC-12. *Component:* harvester. *Deps:* T-1.
- **T-7 - The feedback channel document.** What qualifies (including the skipped-or-worked-around
  trigger), the evidence rule, the never-write list, the destination, redaction, the item format, and
  that silence is the expected outcome. Plus the pre-1.0 removal marker. Files:
  `skills/getting-started/reference/pipeline-feedback.md` (new). Test-first: explicit verification,
  every required element present and stated once.
  *Advances:* AC-13, AC-14. *Component:* feedback channel document. *Deps:* none.
- **T-8 - The removal ratchet.** A test that fails while the removal marker survives at a 1.x version,
  with the guarded phrase repeated in the marker so deleting only the section still trips it. Files:
  `checker/feedback-ratchet.test.mjs` (new). Test-first: the test fails against a simulated 1.0.0
  manifest while the marker exists.
  *Advances:* AC-15. *Component:* feedback channel document. *Deps:* T-7.
- **T-9 - Stage wiring and the ADR.** Record boundaries from the three stages that bound a run, refer
  to the feedback document from their closing checklists, resolve the recorder by the existing rule
  and degrade loudly, and write `ADR-0003`. Files: `skills/gate/SKILL.md` (edit),
  `skills/build/SKILL.md` (edit), `skills/ship/SKILL.md` (edit),
  `docs/specs/adr/ADR-0003-run-recording-trust-model.md` (new). Test-first: explicit verification,
  each stage states where it records and what it does when the recorder is absent.
  *Advances:* AC-16, AC-17. *Component:* gate skill text, build skill text, ship skill text. *Deps:* T-3, T-7.

### Task-to-criterion coverage map

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-2 |
| AC-2 | T-2 |
| AC-3 | T-3 |
| AC-4 | T-1 |
| AC-5 | T-1 |
| AC-6 | T-2 |
| AC-7 | T-3 |
| AC-8 | T-3 |
| AC-9 | T-4 |
| AC-10 | T-5 |
| AC-11 | T-4 |
| AC-12 | T-6 |
| AC-13 | T-7 |
| AC-14 | T-7 |
| AC-15 | T-8 |
| AC-16 | T-9 |
| AC-17 | T-9 |
| AC-18 | T-2, T-4 |

### Notes

- Nine tasks, each one concern, each with a small expected diff. This is deliberate and follows the
  sizing lesson measured elsewhere: the tasks that ran long were the ones bundling several concerns.
- T-1 and T-7 have no dependencies and can start together. T-4 and T-6 unblock as soon as T-1 lands.
- Blast radius: five new files under the checker directory, two new launchers, one new reference
  document, one ADR, and one paragraph each in three stage bodies. Nothing existing changes shape.
