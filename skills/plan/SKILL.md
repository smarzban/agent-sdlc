---
name: plan
description: "Turn settled criteria, design, and techstack into an implementation plan an agent can execute autonomously: dependency-ordered tasks at independently reviewable vertical slice boundaries, each naming exact files, the failing test to write first, and the criterion and component it advances. Use AFTER techstack and BEFORE build. Triggers: 'plan', 'break this down', 'task breakdown', 'write the implementation plan', or any time the design and techstack are settled and you need executable tasks. Scope: only within an Agent SDLC run (a spec chain exists), not on the bare word alone. This is the agent-owned stage; the plan must be followable with no extra context."
---

# Plan: break the shape into tasks an agent can execute alone

Turn the settled criteria, design, and techstack into a plan an agent can execute without you in
the loop. Each task is one independently reviewable vertical slice: it leaves the repository green,
produces useful behaviour or a complete artifact, and can be accepted and reverted independently.
It names the exact files and carries the failing test to write first. The plan is complete enough
for an agent with no project context to follow. This is the one stage the agent owns end to end.

<HARD-GATE>
Input is the `## Acceptance Criteria`, `## Design`, and `## Tech Stack` sections of
`docs/specs/<feature>/<feature>.md`, plus `constitution.md`. Resolve these per the input-resolution rule
([input-resolution](../getting-started/reference/input-resolution.md)): a non-canonical source is
materialized into the named sections (with a provenance marker) before planning. Output is the `## Plan` section of the same
file. Produce the plan and task breakdown only;
do NOT write the product code (the build stage executes the tasks). Each task specifies the test
to write first, but the red-green-refactor loop runs in build, not here. If the inputs are
inconsistent or a criterion has no clear path to a task, STOP and loop back to the owning stage (or
run the gate). The terminal action is a plan handed to build, through the
gate.
</HARD-GATE>

## The task bar (when a task is build-ready)

A task is done being written only when:

1. **Independently reviewable vertical slice.** It leaves the repository green, produces useful
   behaviour or a complete artifact, and can be accepted and reverted independently. Include the
   *compile fallout* of the change in the same task: a new enum variant against an exhaustive match,
   a new required interface/trait method, or a new non-optional field or parameter carries its match
   sites, implementors, or call sites. Fold supporting tests, configuration, setup, and documentation
   needed only by that behaviour into its carrying behaviour task. Do not split by file, layer, or
   implementation step alone, and do not batch unrelated behaviours. Do not use a line, time, or
   criterion-count threshold to size tasks. If a candidate cannot remain green, split it only at an
   independently reviewable vertical slice boundary.
2. **Exact files.** It names the precise files to create or change. No "update the relevant
   module".
3. **Test-first.** It states the failing test to write first (the red of red-green), or the
   explicit verification for the rare untestable task.
4. **Traceable.** It references the `AC-N` it advances and the component (from design) it touches.
   A task that advances no criterion is gold-plating.
5. **Ordered.** It depends only on earlier tasks, never later ones.
6. **Self-contained.** An agent with no extra context could execute it from the task alone.

## Checklist (do in order)

1. **Load inputs** read the `## Acceptance Criteria`, `## Design`, and `## Tech Stack` sections of
   `docs/specs/<feature>/<feature>.md`, root `CONTEXT.md`, and `constitution.md`. If they contradict each
   other, loop back to the owning stage or run the gate first.
2. **Derive candidate vertical slices from the design** walk the components and their contracts;
   for each, group the behaviour and its carrying support work, test-first.
3. **Order candidate vertical slices by dependency.** A task may depend only on candidates before
   it. A contract or schema is an earlier foundation task only when it independently leaves the
   repository green, produces useful behaviour or a complete artifact, and can be accepted and
   reverted independently. Otherwise it stays in the behaviour slice that needs it.
4. **Run the adjacent-pair sanity check to a fixed point.** Inspect every adjacent candidate pair in
   dependency order. Combine the pair when both advance the same behaviour, share the primary
   verification, and neither leaves a useful independently reviewable state. Preserve separate tasks
   when either can be accepted or reverted independently, has a distinct failure or review boundary,
   or represents unrelated behaviour. After each combination, repeat the check until a complete pass
   makes no combination. Only then assign final `T-N` identities.
5. **Specify each task** exact files, the failing test to write first, the `AC-N` advanced, the
   component touched, and its dependencies.
6. **Check coverage both ways** every `AC-N` is advanced by at least one task (no gap), and every
   task traces to a criterion (no gold-plating).
7. **Constitution Check** confirm no task implies a violation of a MUST principle.
8. **Write the `## Plan` section** the ordered task list plus the task-to-criterion coverage map.
9. **Hand off** the plan goes to the gate, then build. A human "go" is optional;
   the gate is the real checkpoint. If Linear sync is enabled in `.agent-sdlc/config.json`, also
   perform this stage's action via the `linear-sync` skill.

## Principles

- **Write for an enthusiastic junior with no context.** Poor taste, no judgement, an aversion to
  testing: the plan must leave nothing to their discretion.
- **Test-first, always.** Every task names its failing test before any code. Tasks written without
  a test get the test added or get cut.
- **Independently reviewable and green between tasks.** Every task is a useful vertical slice that
  can be accepted and reverted independently, and the repo compiles and passes after it. Include the
  compile fallout of each change (match arms, interface impls, call sites) in that same task, not a
  later one.
- **Traceability is the spine.** Task -> criterion -> component. The gate walks it;
  keep it intact.
- **YAGNI and DRY.** Build only what a criterion needs; do not repeat what a prior task built.
- **Loop, don't guess.** Inconsistent inputs mean an earlier stage is unsettled. Go back.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I'll figure out the test during build." | The plan must be executable without thinking. Name the failing test now. |
| "This task is big but cohesive." | Keep it together only when it is one useful behaviour with one primary verification, and split at independently reviewable boundaries. |
| "Skip the AC reference, it's obvious." | The gate walks task -> criterion. An unreferenced task is invisible to it. |
| "Add this nice-to-have while we're in here." | Not in any criterion means not a task. That is the definition of gold-plating. |
| "Exact file paths are overkill." | The agent has no project context. Vague paths are where autonomous runs derail. |

## Red flags (stop and fix)

- A task with no exact file path.
- A task with no test or verification named.
- A task split from its adjacent behaviour only by file, layer, setup, or implementation step.
- A task that leaves no useful independently reviewable state, or batches unrelated behaviours.
- A task that traces to no criterion, or a criterion advanced by no task.
- Tasks out of dependency order, or a task depending on a later one.
- A task that compiles or passes only after a *later* task lands — a test needing a not-yet-built
  consumer, or an exhaustive match broken by a half-added variant. Fold the consequence into this
  task, or declare the missing piece as an earlier dependency.
- A task too large to finish green as one useful independently reviewable vertical slice.

## Done when

- Every task is an independently reviewable vertical slice, with exact files, a test-first step, an
  `AC-N`, and a component.
- Tasks are dependency-ordered.
- Every criterion is covered by at least one task; no task is uncovered by a criterion.
- The Constitution Check passes.
- the `## Plan` section is written, with the coverage map.

## The artifact (output)

The `## Plan` section of `docs/specs/<feature>/<feature>.md`, containing only:
- **Tasks** ordered, each with: ID (`T-1`, `T-2`, ...) assigned only after the fixed-point
  adjacent-pair sanity check, title, exact files, the failing test to write first, the `AC-N`
  advanced, the component touched, and dependencies.
- **Task-to-criterion coverage map** `AC-N` -> the tasks that advance it, so coverage is visible.
- **Notes** any sequencing or setup caveats the build agent needs.

No product code. Build executes the tasks via red-green-refactor.

## Checker grammar (what `sdlc-check` parses — emit exactly this)

The gate walks the trace links by parsing the `## Plan` literally. Emit these exact shapes or the
links parse as zero (the retro that motivated this: a plan written to this skill's *prose* shape drew
33 format findings / 0 links):

- **Trace fields are asterisk-emphasized and period-terminated:**
  `*Advances:* <ids>. *Component:* <name>. *Deps:* <ids>.` Every field ends with a literal `.` — a
  field with **no terminating period is dropped**, and a missing period **swallows the following
  field** into the previous value. (Period-terminated **capture** tolerates wrapping — the value may
  span lines, since the period, not the line break, is what closes it — as do `AC-N`/`T-N` id
  citations. But a multi-word `*Component:*` **name must stay on one line**: it is resolved by an
  anchored whole-name match with a literal space, which a line break won't satisfy, so a wrapped
  multi-word component name silently reads as **dangling**.) `*Advances:*`/`*Deps:*` cite `AC-N`/`T-N`
  ids; `*Component:*` cites a component name, or `none`.
- **Task-to-criterion coverage map:** a table whose **2nd-column header matches
  `/advanced by|component/i`** (a literal `Task(s)` header parses as **zero** links). The 1st-column
  cell must be a bare id (`AC-N`, `C-N`, or `T-N`). The header wording picks the cell grammar, and the
  two shapes differ: a **`Component`-headed** map cites components by name and is scanned whole-cell
  (any id or component name anywhere in the cell counts). An **`Advanced by`-headed** map is the
  coverage map, and only there does the leading-id rule below apply. A header matching both words
  (e.g. `Advanced by component`) takes the **`Component`** grammar: that check runs first.
  A coverage-map cell links the ids it LISTS: comma-separated, each entry LEADING with the id. A
  leading run of backtick, asterisk, or `[` is tolerated (`` `T-1` ``, `**T-1**`, `[T-1](#t-1)` all
  link); other decoration is not, so underscore emphasis (`_T-1_`) drops the id with no link and no
  note (an underscore is a word character, so the id token itself never matches). A parenthetical
  ANNOTATES, it does not link (`T-8 (supersedes T-5)` links `T-8` only); an unmatched `(` strips
  everything after it to the end of the cell, so close every paren you open. A prose join does not
  link either (`T-1 and T-2` links `T-1` only, write a comma instead). An id mentioned but not
  linked (inside a parenthetical, or at a non-leading position) yields a NOTE, not a finding, so it
  stays visible rather than silent. Prose like "all tasks" traces nothing.
- **IDs are defined at a bold-lead** — `**AC-N**`, `**T-N**` — distinct from a plain-text citation. A
  slash-run citation (`AC-1/2/3`) expands to each id.
- **Every AC needs a carrying task — reviewer-checked included.** Forward coverage holds **every**
  defined `AC-N` to being advanced by ≥1 task (a task's `*Advances:*` field ∪ a Task-to-criterion
  coverage-map row); an AC's verification type does not exempt it. A **reviewer-checked** AC is not
  auto-traced — its **carrying task is the one that produces the artifact the reviewer checks**, so
  name that AC in that task's `*Advances:*` (or a coverage-map row). Do not leave a reviewer-checked
  AC uncarried expecting the reviewer to stand in for a task.

## Conventions

- Lives as the `## Plan` section of `docs/specs/<feature>/<feature>.md`
  (root `specs/` in a repo that already uses it — the back-compat rule in getting-started) — process
  record, apart from the repo's product documentation pages.
- Reads the `## Acceptance Criteria`, `## Design`, and `## Tech Stack` sections of the same file;
  references `AC-N` IDs and design component names.
- Task IDs (`T-N`) are stable handles the gate and build reference. Assign them only after the
  fixed-point adjacent-pair sanity check.
- `## Plan` may carry a **provenance-marked mid-build amendment** — when reality diverges from the plan,
  build materializes the delta back into this section (through the plan method, gated inline) with a
  `<!-- source: mid-build amendment (<why>) · ingested YYYY-MM-DD -->` marker (canonical provenance
  grammar; see `../build/reference/plan-amendments.md`). A provenance marker mid-`## Plan` is therefore
  expected, not a defect. This mid-section stamp is **documentary / human-facing provenance only** — the
  checker's provenance-marker rule validates a section's first body line, not a mid-section marker, so it
  is not machine-validated; trace integrity is enforced by the trace + coverage rules and the inline
  gate, never by the stamp. A superseded task is marked (not deleted) and new/split tasks get fresh
  `T-N` ids so the trace stays walkable.
- This is feature-scoped; at project level it is the plan for the first feature after the
  project-level idea and architecture.
- Downstream consumers: the gate (walks criterion -> component -> product -> task),
  the build stage (executes each task test-first), and Review panel.
