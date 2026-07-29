# Run-observability experiment

> EXPERIMENT: run-observability. Everything on this page describes throwaway instrumentation.
> This page is deleted along with it; see "How to remove it completely" below.

Deliberately temporary instrumentation for a handful of real `agent-sdlc` runs. It answers one
question, is read a few times, and is then deleted along with this page. Full design and
acceptance criteria: [`docs/specs/run-observability/run-observability.md`](../specs/run-observability/run-observability.md).

## The one question

Where does the pipeline's own clock time actually go: task size, or review rounds? Those are
different problems with opposite remedies, and one worked example cannot separate them. This
experiment measures enough real runs to tell them apart.

## How to run it

Recording is wired into the `gate`, `build`, and `ship` skills already: each stage calls the
recorder at its own boundaries (run start/end, task start/end, review-round start/end) and never
blocks the pipeline if the recorder is unavailable. There is nothing to turn on.

To read the result of one or more runs:

```bash
# from a checkout of this repo
node checker/experiment-report.mjs <run-id> [<run-id> ...] [--repo <path>]

# or, once installed, the on-PATH launcher (resolved the same way as sdlc-check)
bin/sdlc-report <run-id> [<run-id> ...] [--repo <path>]
```

`<run-id>` is the feature's spec directory name (e.g. `run-observability`), the same identity every
stage already derives on its own. `--repo` points the summary's `git diff --shortstat` calls at the
repository the run happened in, when the summary is not run from inside it.

The recorder appends to `~/.agent-sdlc-experiments/run-observability/<run-id>.jsonl`, outside any
repository.

The table this prints, per task, has these columns:

| Column | Measured or claimed |
| --- | --- |
| Elapsed | **Measured.** Derived from a pair of recorded timestamps (task-start, task-end). |
| Rounds | **Measured.** Each round's duration comes from its own start/end pair; a gap in the round numbering is shown as a missing round, never silently dropped. |
| Between boundaries (lines/files) | **Measured**, from `git diff --shortstat` between the two head commits recorded at task-start and task-end. Named for what it measures: the diff between those two commits, not necessarily only the task's own change. |
| Findings by severity | **Claimed.** The reviewer's own count, passed to the recorder by the build stage. |

Every column carries its `[measured]` or `[claimed]` tag in the rendered table itself, not only in
this page. A run that never recorded an end is shown as incomplete, never silently dropped from the
view.

## The honest limits

- **Elapsed wall time includes waiting.** Rate-limit backoff, a stall, a lunch break: none of it is
  distinguished from model inference. The summary prints this caveat every time it renders.
- **The size column depends on the wiring being followed.** `task-end` must be recorded after the
  task's own commit lands. If two recorded head commits come out identical, that is a sign the
  ordering was skipped for that task, and the summary says so in place of a fabricated zero: it is
  a wiring fault, not a claim that nothing changed.
- **The quality column is self-reported.** Findings by severity are the agent's word,
  not something a clock or git measured, and are labelled `[claimed]` for exactly that reason. There
  is no free-text field anywhere in the recorded schema: reported fields are numeric or enumerated
  only, so nothing exists for a secret, source, or prompt fragment to land in.

## How to remove it completely

Every file this experiment touched carries the literal marker `EXPERIMENT: run-observability`.
Removal is a search, not an investigation:

```bash
git grep -n "EXPERIMENT: run-observability"
```

This returns the following files (enforced by `checker/experiment-marker.test.mjs`, which fails if
one goes missing or a stray one shows up elsewhere):

| File | What to do |
| --- | --- |
| `bin/sdlc-record` | Delete the file. |
| `bin/sdlc-report` | Delete the file. |
| `checker/experiment-record.mjs` | Delete the file. |
| `checker/experiment-record.test.mjs` | Delete the file. |
| `checker/experiment-report.mjs` | Delete the file. |
| `checker/experiment-report.test.mjs` | Delete the file. |
| `checker/experiment-marker.test.mjs` | Delete the file. |
| `skills/getting-started/reference/experiment-feedback.md` | Delete the file. |
| `skills/build/SKILL.md` | Keep the file; remove only the two marked experiment-recording paragraphs (the task-start pointer before step 4a, and the recording block after 4g). |
| `skills/gate/SKILL.md` | Keep the file; remove only the marked experiment-recording paragraph. |
| `skills/ship/SKILL.md` | Keep the file; remove only the marked experiment-recording paragraph. |
| `CONTEXT.md` | Keep the file; remove only the four glossary entries between the `<!-- EXPERIMENT -->` comment markers. |
| `docs/README.md` | Keep the file; remove only the marked table row linking this page. |
| `docs/usage/experiment-run-observability.md` | Delete this page. |

The search also returns any file under `docs/specs/run-observability/`, and it is the one
deliberate exception: the spec chain under `docs/specs/run-observability/` is the experiment's
permanent record of what was asked, built, and found, the same as every other shipped feature's
spec chain. It stays. The marker there identifies the experiment; it is not an instruction to
delete the record of it.

Also delete the local data the recorder wrote, outside this repository, and the directory it made
for itself:

```bash
rm -rf ~/.agent-sdlc-experiments/run-observability
rmdir ~/.agent-sdlc-experiments 2>/dev/null
```

Nothing else references this experiment: no schema, no config flag, no CI change, no dependency.
