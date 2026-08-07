# build-loop-efficiency

## Brief

### Problem / intent

Agent SDLC pays repeated cold-start and context-reconstruction costs after a task's initial review,
and its planning rule can mistake the smallest green edit for the right task boundary. The result is
avoidable model work: fresh fix agents reload task context, full re-reviews revisit already-settled
surfaces, and microtasks each pay the complete implement, review, verify, commit, and ledger cost.
Local experiment records contain 59 completed task boundaries across three real datasets: 29 tasks
needed multiple review passes, all review passes occupied 28.0% of measured task-boundary wall time,
and repeated passes alone occupied 9.9%. Those timings include waiting and incomplete records, so
they justify a focused efficiency change, not weaker verification.

The intent is to reduce elapsed time and model cost while preserving the initial independent review,
test-first implementation, conductor-owned staged-snapshot green bar, one atomic commit per ratified
task, durable evidence ledger, and checker corroboration.

### Scope and non-goals

In scope:

- Keep the original task implementer available through bounded remediation and continue that agent
  for the first two remediation rounds when the harness supports continuation.
- Make every review after the initial full task review finding-scoped: close the prior blocking
  findings and inspect the remediation diff for regressions rather than re-reading the settled task
  diff in full.
- Use a fresh fixer and fresh reviewer for one final remediation round when the continued agents do
  not converge, then block the task if Critical or Important findings remain.
- Change planning's task-size bar from the smallest green edit to the smallest independently
  reviewable vertical slice that stays green, is useful on its own, and can be reverted on its own.

Out of scope:

- No weaker initial review, blocker threshold, green-bar command, staged-snapshot isolation, commit
  boundary, ledger evidence, checker rule, or ship gate.
- No parallel task execution, permanent observability product, deterministic task runner, model
  routing system, plan-reality preflight, or source-research cache.
- No batching of ratified `T-N` tasks during build. Task combination belongs to planning, before the
  gate blesses the plan.
- No claim that the experiment isolates model inference from waiting or proves task size from every
  recorded run.

### Chosen approach

Preserve the existing per-task control points and remove repeated context work inside them. Agent
continuation keeps task knowledge warm, finding-scoped re-review narrows later judgment to what
changed, and a stronger planning boundary reduces fixed per-task overhead before build begins. This
is preferred over an orchestration executable because the current problem is first an instruction
contract and the larger tool would expand scope. It is preferred over skipping review or reducing
the green bar because the measurements do not support weakening either guarantee.

### Resolved key decisions

- The initial reviewer always receives and judges the complete task-scoped diff.
- A remediation round starts only after an initial Critical or Important finding. Minor findings do
  not change the existing blocker policy.
- Remediation rounds one and two continue the original implementer and reviewer sessions where the
  harness supports continuation. If continuation is unavailable or a session has died, the existing
  fresh-agent fallback receives the same file-based handoff and the fallback is announced.
- A finding-scoped re-review receives the original task contract, the previous blocking findings,
  the remediation diff, and focused test evidence. It checks closure of each prior finding plus any
  regression introduced on the remediation surface. It does not repeat the initial whole-task
  review.
- Remediation round three uses a fresh fixer and a fresh reviewer to break anchoring. It remains
  finding-scoped. Remaining Critical or Important findings block the task.
- A plan task is one independently reviewable vertical slice, not one file, layer, setup action, or
  documentation action. Supporting tests, configuration, and documentation stay with the behaviour
  that needs them. Unrelated behaviours retain separate tasks.
- Measurement is evidence for this change, not a product requirement. The existing observability
  experiment remains temporary under its original removal contract.

### Glossary terms touched

- remediation round
- finding-scoped re-review
- independently reviewable vertical slice
- microtask

### ADRs

None. The bounds and task-sizing language are reversible instruction-policy choices.

## Acceptance Criteria

### Initial review and remediation

**AC-1**: Given a task implementation awaiting its first review, the reviewer judges the complete
task-scoped change before any remediation begins.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test rejects a build
protocol that scopes the initial review to findings or a partial change.)*

**AC-2**: Given a blocking initial review and continuation support, remediation rounds one and two
run in the original implementer session.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires exact
continued-session language for both early rounds.)*

**AC-3**: Given a remediation fix and continuation support, remediation rounds one and two return to
the original reviewer session.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires exact
continued-reviewer language for both early rounds.)*

**AC-4**: Given a finding-scoped re-review, every prior Critical or Important finding receives an
explicit `ADDRESSED` or `NOT ADDRESSED` disposition.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires the
per-finding disposition contract.)*

**AC-5**: Given a finding-scoped re-review, new blocking findings can arise only from the remediation
diff.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires a
remediation-diff regression check plus non-blocking treatment for observations outside that diff.)*

**AC-6**: Given two unsuccessful remediation rounds, round three uses a fresh fixer-reviewer pair.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires fresh-agent
escalation at exactly the third remediation round.)*

**AC-7**: Given remaining Critical or Important findings after remediation round three, the task is
blocked without a fourth remediation dispatch.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires the
three-round circuit breaker and blocked terminal state.)*

**AC-8**: Given unavailable continuation or a dead continued session, the conductor announces a
fresh-agent fallback that receives the durable file handoff.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires an
announced fallback tied to the existing file artifacts.)*

### Task sizing

**AC-9**: Given a proposed plan task, it satisfies the glossary definition of an independently
reviewable vertical slice before the plan is handed to the gate.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires useful,
green, independently acceptable, and independently reversible task boundaries.)*

**AC-10**: Given adjacent proposed tasks that match the glossary definition of microtasks, planning
combines them before assigning final `T-N` identities.
*(Verification type: **test-backed**, unit. Oracle: an instruction-contract test requires an adjacent
pair sanity check while preserving separate boundaries for independent behaviours.)*

### Negative criteria

- **NC-1**: No reduction in initial task-review coverage, blocker severity, test-first discipline,
  staged-snapshot green-bar verification, atomic commit policy, ledger evidence, checker
  corroboration, or ship review.
- **NC-2**: No permanent observability product or new run-record schema.
- **NC-3**: No harness-specific model name, capability-routing system, or requirement that agent
  continuation exist.
- **NC-4**: No batching of gate-ratified `T-N` tasks during build.
- **NC-5**: No parallel task implementation.

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

### Deferred

None.

### Glossary terms touched

- continued agent session
- remediation diff
- remediation round
- finding-scoped re-review
- independently reviewable vertical slice
- microtask

## Design

The feature changes two existing instruction policies. It does not add a runtime service, persistent
store, or new trusted enforcement component.

### Components

1. **Build remediation protocol**: owns bounded convergence after the initial task review. Kind:
   orchestration instruction policy.
2. **Task-sizing policy**: owns the independently reviewable vertical-slice bar before stable task
   identities are assigned. Kind: planning instruction policy.

### Contracts

**Build remediation protocol.** Input: initial reviewer findings, current remediation round,
continuation capability, exact task files, and durable task artifacts. Output: an immutable reviewer
snapshot, task-scoped remediation diff, continued-agent dispatch, announced fresh-agent fallback,
fresh final-round dispatch, or blocked task. Error semantics: an unavailable or dead session
degrades visibly to the existing file-based fresh dispatch; a missing snapshot, empty claimed fix,
or snapshot command failure stops re-review dispatch; open blockers after round three stop the task.
The snapshot procedure never changes the working tree, real index, HEAD, or branch.

**Task-sizing policy.** Input: dependency-ordered candidate tasks with criteria, components, exact
files, and failing tests. Output: stable `T-N` tasks at useful independent review boundaries. Error
semantics: a candidate that cannot stay green is split; adjacent microtasks are combined; unrelated
behaviours remain separate.

### Data flow and key state

The initial task brief flows to one implementer, whose task-scoped change becomes an immutable review
snapshot and complete initial review diff. Blocking findings flow back to the continued implementer.
The post-fix task state becomes the next snapshot; the difference between consecutive snapshots
flows to the continued reviewer with the prior findings. After each review, the newest snapshot
becomes the base for the next remediation diff. Briefs, findings, reports, snapshot ids, and diffs
remain feature-scoped scratch files; the working tree remains the product state and
`build-report.md` remains the durable completion ledger.

Planning flows in the opposite direction: candidate implementation steps are grouped into useful
vertical slices before final `T-N` assignment, then the existing gate and build stages consume those
ratified boundaries unchanged.

### Trust and failure boundaries

Subagent reports remain untrusted claims. The conductor creates review snapshots and remediation
diffs without reading their contents, while its staged-snapshot green-bar run remains the authority
for execution. Harness continuation is optional and untrusted as a capability claim: failure uses a
loud fresh-agent fallback. Snapshot creation touches only temporary index state and version-control
object data; it never changes the real index or branch. A reviewer can disposition only supplied
prior findings and regressions visible in the remediation diff; observations outside that diff are
non-blocking and cannot extend the remediation loop.

### Criterion-to-component map

| Criterion | Component |
| --- | --- |
| AC-1 | Build remediation protocol |
| AC-2 | Build remediation protocol |
| AC-3 | Build remediation protocol |
| AC-4 | Build remediation protocol |
| AC-5 | Build remediation protocol |
| AC-6 | Build remediation protocol |
| AC-7 | Build remediation protocol |
| AC-8 | Build remediation protocol |
| AC-9 | Task-sizing policy |
| AC-10 | Task-sizing policy |

### ADRs created

None.

### Glossary terms touched

- continued agent session
- remediation diff
- independently reviewable vertical slice

## Tech Stack

### Existing-stack decision

**No new products: reuses the declared stack.** The feature changes Markdown instruction contracts
and uses the repository's existing zero-dependency Node test harness plus its existing Git CLI. No
dependency or manifest changes are permitted. The project-level stack remains Node 22 or newer plus
`node:test`, declared in `docs/specs/overview.md` and checked there on 2026-07-02. The snapshot
procedure uses Git 2.50.1 (Apple Git-155), checked 2026-08-07 against the official
[`git-read-tree`](https://git-scm.com/docs/git-read-tree),
[`git-write-tree`](https://git-scm.com/docs/git-write-tree), and
[`git-diff`](https://git-scm.com/docs/git-diff) documentation.

Green bar:

```bash
node --check checker/sdlc-check.mjs
node --test checker/*.test.mjs
```

### Component-to-product map

| Component kind | Product | Version | Checked |
| --- | --- | --- | --- |
| Build remediation protocol | Existing Agent SDLC Markdown skill tree plus Git CLI | 0.18.0; Git 2.50.1 (Apple Git-155) | 2026-08-07 |
| Task-sizing policy | Existing Agent SDLC Markdown skill tree | 0.18.0 | 2026-08-07 |
| Instruction-contract tests | Existing Node test runner | Node 22 or newer | 2026-08-07 |

### Load-bearing claims

- **Alternate-index review snapshots:** the Git CLI can load `HEAD` into an alternate index, stage
  only task paths there, write immutable tree objects, and diff two such trees without changing
  `HEAD` or the real index. **verified-by-probe**:
  `docs/specs/build-loop-efficiency/probe-output.txt` (5-minute probe, Git 2.50.1, PASS).

### Unverified / flagged

None.

### Glossary terms touched

None.

## Plan

### Tasks

**T-1: Continue task agents through finding-scoped remediation**

Create `checker/build-remediation-contract.test.mjs`. Modify `skills/build/SKILL.md`,
`skills/build/reference/subagent-loop.md`, and `docs/usage/pipeline.md`.

Write these failing tests first:

- `build remediation contract keeps the initial review complete`
- `build remediation contract resumes the original agents for two finding-scoped rounds`
- `build remediation contract uses a fresh final round and then blocks`
- `build remediation contract creates remediation-only snapshot diffs without touching the real index`

Then replace the generic fresh-fixer loop with the three-round continuation protocol. Define the
initial full-review snapshot, the temporary-index tree snapshot procedure, per-finding dispositions,
out-of-scope non-blocking observations, continuation fallback, final fresh pair, and circuit breaker.
Update the public pipeline description in the same vertical slice. Preserve every conductor-owned
verification and commit boundary.

*Advances:* AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8. *Component:* Build remediation protocol. *Deps:* none.

**T-2: Size plans at independently reviewable vertical slices**

Create `checker/plan-task-size-contract.test.mjs`. Modify `skills/plan/SKILL.md`,
`skills/build/reference/simplicity.md`, and `docs/usage/pipeline.md`.

Write these failing tests first:

- `plan task bar requires independently reviewable vertical slices`
- `plan task bar combines microtasks but preserves independent behavior boundaries`

Then replace smallest-green-edit wording with the independently reviewable vertical-slice bar. Add
the adjacent-pair sanity check before final `T-N` assignment, fold support work into its carrying
behaviour, preserve compile fallout and green commits, and reject both file-by-file splitting and
unrelated batching. Update the public pipeline description in the same vertical slice.

*Advances:* AC-9, AC-10. *Component:* Task-sizing policy. *Deps:* T-1.

### Task-to-criterion coverage map

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-1 |
| AC-2 | T-1 |
| AC-3 | T-1 |
| AC-4 | T-1 |
| AC-5 | T-1 |
| AC-6 | T-1 |
| AC-7 | T-1 |
| AC-8 | T-1 |
| AC-9 | T-2 |
| AC-10 | T-2 |

### Notes

- Assign task identities only after the microtask sanity check; build never combines ratified tasks.
- The experiment measurements are decision evidence, not a build task.
