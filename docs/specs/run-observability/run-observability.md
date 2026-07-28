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
