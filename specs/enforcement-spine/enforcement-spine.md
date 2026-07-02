# enforcement-spine

## Brief

### Problem / intent

Every guarantee agent-sdlc makes — the trace is complete, the ledger is true, the green bar was
run, every acceptance criterion is met — is asserted by the same agent that did the work. Checker
and checked are one mind, and both degrade together under context pressure, compaction, or a weaker
model. Two consequences observed in real pipeline runs:

1. **Mechanical promises go unverified.** Nothing outside the agent confirms that every ledger
   "done" has a matching one-task commit, that the `AC-N → C-N → product → T-N` trace has no
   dangling links, or that the green bar actually produced passing output.
2. **"Every AC is met" is never terminally checked.** `gate` checks each AC has a *planned* task;
   `build` checks each task's *own* test; `ship` re-runs the suite. No stage settles each AC
   against a named proof, so the pipeline's central contract is inferred transitively — and
   defects at integration boundaries (where no single task's test runs) pass every stage.

Intent: give agent-sdlc a deterministic **enforcement spine** — a small piece of trusted code that
verifies the pipeline's mechanical promises, plus a terminal AC verification step at ship — the
same trust model review-gate uses (untrusted reviewers, trusted spine owning the verdict).

### Scope & non-goals

**In scope:**

- **`sdlc-check`** — a dependency-free, single-file Node script committed inside the agent-sdlc
  plugin (no install-time build, runs with bare `node`). It parses the consolidated spec and:
  walks the full trace and fails on dangling/unmapped IDs; verifies coverage completeness in both
  directions (every AC reached by ≥ 1 task, every task traced to an AC); verifies every ledger
  "done" has a matching one-task commit in `git log`; requires green-bar output evidence rather
  than a ledger assertion; validates provenance markers on materialized sections.
- **Terminal AC verification at ship** — ship builds an explicit **AC → proof map** (each AC names
  the passing test(s) or the answered reviewer check that proves it), puts the map in the PR body,
  and stops on any AC without proof. `sdlc-check` validates the map's mechanical rows.
- Wiring: `gate`, `build`, and `ship` invoke `sdlc-check` when Node is available and announce a
  **loud degraded fallback** when it is not (the existing ship ↔ review-gate contract).

**Non-goals:**

- No LLM judgment calls — `sdlc-check` checks only what is mechanically decidable; semantic
  quality stays with `gate` and review.
- No auto-fixing; the checker reports, it never edits.
- No npm distribution; the script ships inside the plugin.
- The broader `test` skill (integration/E2E strategy) remains future work; ship owns the AC →
  proof map interim, shaped so `test` can take it over without changing the map format.
- Other hardening tracks (plan amendment, light tier, spikes, eval set) are separate features.

### Chosen approach

In-plugin committed script, invoked-if-present. Alternatives considered: housing the checker in
review-gate/Empanel (wrong home — that product owns *review*, this is pipeline mechanics, and it
would couple agent-sdlc to a second install); a standalone npm package (distribution overhead the
marketplace model doesn't need). The committed-artifact model is proven in this repo — review-gate
ships its compiled `dist/` the same way.

### Resolved key decisions

1. **Location:** `agent-sdlc/checker/sdlc-check.mjs` — single file, zero dependencies, committed.
2. **One feature, two deliverables:** the checker and terminal AC verification share artifact
   formats (the AC → proof map is a spec artifact the checker validates), so they ship together;
   they remain separable as plan tasks.
3. **Failure semantics:** a failed check is **stop-and-ask, never silent** — ship never proceeds
   past a failed check without an explicit human override recorded in the PR body.
4. **Portability:** environments without Node get a loud degraded fallback, never a silent skip.

### Glossary terms touched

`sdlc-check`, `enforcement spine`, `AC → proof map`, `green-bar evidence` — captured in
`CONTEXT.md`.

### ADRs

None — the one candidate (in-plugin committed script) follows the established review-gate `dist/`
precedent, so it fails the "surprising without context" test.

## Acceptance Criteria

### Checker mechanics (test-backed)

- **AC-1** — Given a spec whose trace contains a reference to a nonexistent ID (a task citing an
  AC or component that does not exist), the check fails and its report names each dangling ID.
  *test-backed: unit.*
- **AC-2** — Given a spec in which at least one acceptance criterion is reached by no task in the
  trace, the check fails and names each unreached criterion. *test-backed: unit.*
- **AC-3** — Given a plan in which a task carries neither a real AC reference nor an explicit
  `untraced` marker, the check fails and names the task; a task with an explicit `untraced` marker
  is surfaced as a coverage note, not a failure. *test-backed: unit.*
- **AC-4** — Given a ledger that marks a task done, the check fails unless git history contains
  exactly one commit referencing exactly that task ID; a done task with no matching commit, or a
  commit referencing multiple task IDs, fails naming the task. (Content-atomicity — the commit
  touches only that task's files — stays with build's review discipline; deciding file ownership
  mechanically would require judgment.) *test-backed: integration (fixture repo).*
- **AC-5** — Given a ledger that claims the green bar passed without captured command output
  evidence, the check fails naming the claim. *test-backed: unit.*
- **AC-6** — Given a provenance marker that is present but malformed (missing the source
  identifier or an absolute date), the check fails naming the section. (Detecting a materialized
  section that was never stamped is not mechanically decidable — a hand-authored section carries
  no marker by contract; enforcing stamping stays with the stage skills.) *test-backed: unit.*
- **AC-7** — Given a fully traced, evidence-backed spec — including a valid mid-chain-entry spec
  with well-formed provenance and `untraced` markers — the check passes with exit 0 and renders
  any untraced links as coverage notes. *test-backed: integration.*
- **AC-8** — The check exits 0 when every check passes and nonzero when any check fails.
  *test-backed: unit.*
- **AC-9** — Given a spec seeded with N distinct violations, the report names all N, not only the
  first. *test-backed: unit.*
- **AC-10** — Given a missing or unparseable spec input, the check fails cleanly with a message
  naming the problem — never an unhandled crash and never a pass. *test-backed: unit.*
- **AC-11** — A check run leaves the repository content byte-identical (tree hash unchanged
  before/after). *test-backed: integration.*
- **AC-12** — The check runs to completion when invoked with a bare `node` runtime in a clean
  environment: no install step, no non-stdlib imports, no network access. *test-backed:
  integration.*

### Terminal AC verification (test-backed)

- **AC-13** — Given an AC → proof map in which any criterion lacks a proof entry (a named test for
  a test-backed criterion, or a recorded answer for a reviewer-checked one), the check fails
  naming the criterion. *test-backed: unit.*
- **AC-14** — Given a test-backed proof-map row naming a test that does not appear in the captured
  green-bar evidence, the check fails naming the row. (This is what settles "every AC met" against
  reality rather than assertion; the evidence format is a design-stage decision.) *test-backed:
  unit.*

### Skill wiring (reviewer-checked)

Justification for all four: the deliverable under test is skill prose (Markdown instructions), which
no cheap test harness can execute; conformance is judged by reading the skill text against the
criterion. Axis: **Spec Conformance**.

- **AC-15** — Do the `gate`, `build`, and `ship` skill texts each mandate invoking the checker at a
  defined point when the runtime is available? Pass = all three name the invocation point;
  fail = any stage omits it.
- **AC-16** — Does a failed check stop the stage and ask, with any proceed-past-failure requiring
  an explicit human override recorded in the PR body? Pass = stop-and-ask plus recorded override
  are both mandated; fail = any path proceeds silently or the override is unrecorded.
- **AC-17** — When the runtime is absent, do the skill texts mandate an announced degraded
  fallback? Pass = the fallback is loud (stated in the stage's output); fail = a silent skip is
  possible.
- **AC-18** — Does `ship` publish the AC → proof map in the PR body? Pass = the map appears in the
  PR body whenever ship completes; fail = the map stays only in the spec tree.

### Negative criteria (out of bounds)

- **NC-1** — A check run performs no network access and no model/LLM call. *test-backed:
  integration (folded into the AC-12 clean-environment run).*
- **NC-2** — The checker has no write or fix mode: no invocation modifies any file. *test-backed:
  integration (the AC-11 oracle).*
- **NC-3** — The feature adds no install-time build step and no dependency to the plugin.
  *reviewer-checked: Spec Conformance — pass = the plugin installs and the checker runs with no
  new build/dependency; justification: "no new install step" is a property of the plugin's
  packaging, checked by inspection.*
- **NC-4** — The checker asserts nothing that requires judgment: every check is a mechanically
  decidable fact. *reviewer-checked: Spec Conformance — pass = each shipped check has a
  deterministic oracle; justification: "requires judgment" is itself a judgment over the check
  set, made once at review.*

### Verification map

| Criterion | Oracle kind / review axis |
| --- | --- |
| AC-1 | unit |
| AC-2 | unit |
| AC-3 | unit |
| AC-4 | integration |
| AC-5 | unit |
| AC-6 | unit |
| AC-7 | integration |
| AC-8 | unit |
| AC-9 | unit |
| AC-10 | unit |
| AC-11 | integration |
| AC-12 | integration |
| AC-13 | unit |
| AC-14 | unit |
| AC-15 | Spec Conformance |
| AC-16 | Spec Conformance |
| AC-17 | Spec Conformance |
| AC-18 | Spec Conformance |
| NC-1 | integration |
| NC-2 | integration |
| NC-3 | Spec Conformance |
| NC-4 | Spec Conformance |

### Deferred

- **Performance threshold** — none set, deliberately: the check is a single pass over one spec
  file plus one `git log`; a latency criterion would be quantification theater.
- **Integration-boundary test coverage beyond the proof map** — the broader strategy (E2E, cross-task
  boundaries) belongs to the planned `test` skill; the proof-map format here is shaped so that skill
  can take ownership without changing it.

### Glossary terms touched

None new — the four existing terms (`enforcement spine`, `sdlc-check`, `AC → proof map`,
`green-bar evidence`) already cover this contract; AC-14 relies on `green-bar evidence` exactly as
`CONTEXT.md` defines it.

## Design

Feature-level design, fitting the architecture in `specs/overview.md` `## Architecture`. The
checker joins agent-sdlc as its first executable component, following the marketplace's
committed-artifact pattern (review-gate ships its runnable `dist/` the same way).

### Components

**Inside the checker (kind: a stateless command-line check tool):**

1. **CLI shell** — single responsibility: process lifecycle. Argument handling, wiring the other
   components, mapping the run to an exit code. Owns the cross-cutting properties: exit contract
   (0 pass / nonzero fail), the no-write discipline (output is stdout/stderr only — the checker
   never writes a file; the invoking stage decides what to record), and the bare-runtime
   constraint (stdlib only, no network, no install step).
   *Contract:* in — invocation arguments (spec path, artifact requirements); out — exit code +
   the reporter's rendered text; errors — any internal failure exits nonzero with a message
   (fail-closed: no error path exits 0).
2. **Spec parser** — single responsibility: turn artifact text into a structured model. Reads the
   consolidated spec, the build ledger, and the verification report into: sections, `AC/C/T` IDs,
   trace references, provenance and `untraced` markers, green-bar evidence blocks, proof-map rows.
   *Contract:* in — artifact file contents; out — the model, or a typed parse failure naming the
   file and problem; errors — missing/unparseable input is a parse failure, never a crash and
   never an empty-model pass.
3. **Repo facts reader** — single responsibility: gather version-control facts. The only component
   that touches git: reads commit history (read-only) so the ledger check can match done-tasks to
   commits.
   *Contract:* in — repo path + the task IDs of interest; out — the commit list (id, message);
   errors — git absent or not-a-repo is a typed failure, not a pass.
4. **Check suite** — single responsibility: judge the model. Pure rules (no I/O) over the parsed
   model + repo facts, one rule per mechanical promise: trace integrity, bidirectional coverage
   (an explicit `untraced` marker yields a coverage note, not a failure), ledger-vs-git
   (exactly one commit referencing exactly one task ID), green-bar evidence presence, marker
   well-formedness, proof-map completeness, evidence linkage. Rules **auto-scope to the artifacts
   present** (no ledger → ledger rules do not run); an invoking stage can *require* an artifact,
   making its absence itself a failure.
   *Contract:* in — model + repo facts + required-artifact set; out — a list of findings and
   coverage notes; errors — none (pure; anything doubtful is a finding).
5. **Reporter** — single responsibility: render the verdict. Emits every finding (exhaustive —
   all N violations, never only the first) plus coverage notes, and derives the exit code.
   *Contract:* in — findings + notes; out — human-readable report text + exit code; errors — none.

**Outside the checker (changed components):** the `gate`, `build`, and `ship` skill texts gain the
invocation contract below; `build` additionally captures green-bar evidence blocks in its ledger;
`ship` additionally writes the verification report and publishes the proof map in the PR body.

### Data contracts

- **Green-bar evidence block** — `build` captures each green-bar run in the ledger as a fenced
  block: the command line plus its output tail. Evidence is captured text, never a checkbox.
- **Verification report** — `ship` writes the AC → proof map to
  `specs/<feature>/verification-report.md` (a sibling of `gate-report.md`/`build-report.md`:
  process state beside the spec, per the artifact model), then copies it into the PR body. One row
  per criterion: test-backed rows name their test identifier(s); reviewer-checked rows record the
  answered pass/fail question. **Linkage rule:** each test-backed row's named test identifier must
  appear in the captured green-bar evidence text (name-appearance — see ADR-0001).

### Invocation contract (skill wiring)

- **Points:** `gate` runs the checker after its own chain walk (mechanical corroboration);
  `build` runs it at resume and at build-complete; `ship` runs it pre-PR with the verification
  report required.
- **Semantics:** runtime present → run, interpret exit code; nonzero (or any checker crash —
  fail-closed) = a failed check = **stop-and-ask**, with any human override recorded in the PR
  body. Runtime absent → an **announced degraded fallback**, never a silent skip. Mirrors the
  existing ship ↔ review-gate contract.

### Data flow and key state

Spec + ledger + verification report + git history → parser / facts reader → model → check suite →
findings + notes → reporter → report text + exit code → invoking stage (stop-and-ask / proceed /
record). The checker holds **no state**: nothing persisted, nothing cached, no file written; each
run is a pure function of the artifact set + git history.

### Trust and failure boundaries

- **Untrusted:** the spec, ledger, evidence blocks, verification report, and git history — all
  authored by the agent being checked. **Trusted:** the checker.
- The checker verifies **consistency, not truth**: a fabricating agent must now fabricate an
  entire mutually-consistent artifact set (named tests appearing in captured output, commits
  matching ledger rows) rather than assert "done". This is deliberately weaker than review-gate's
  independent-reviewer model — the spine raises the cost of drift; the review panel remains the
  judgment layer.
- **Failure modes:** parse failure → named failure (never a pass); git unavailable → typed
  failure; checker crash → the invoking stage treats it as a failed check (fail-closed). There is
  no error path that reads as success.

### Criterion-to-component map

| Criterion | Component(s) |
| --- | --- |
| AC-1 | check suite (+ spec parser) |
| AC-2 | check suite |
| AC-3 | check suite |
| AC-4 | repo facts reader + check suite |
| AC-5 | check suite (+ green-bar evidence contract) |
| AC-6 | spec parser + check suite |
| AC-7 | check suite (auto-scoping) — integration across all |
| AC-8 | CLI shell + reporter |
| AC-9 | reporter |
| AC-10 | spec parser + reporter |
| AC-11 | CLI shell (no-write by construction) |
| AC-12 | CLI shell |
| AC-13 | check suite (+ verification-report contract) |
| AC-14 | check suite (+ ADR-0001 linkage rule) |
| AC-15 | gate/build/ship skill texts (invocation contract) |
| AC-16 | gate/build/ship skill texts (invocation contract) |
| AC-17 | gate/build/ship skill texts (invocation contract) |
| AC-18 | ship skill text (+ verification-report contract) |
| NC-1 | CLI shell |
| NC-2 | CLI shell |
| NC-3 | plugin packaging (manifests unchanged) |
| NC-4 | check suite (pure rules) |

### ADRs created

- [ADR-0001 — plain-text evidence contracts checked by name-appearance](../adr/ADR-0001-plain-text-evidence-contracts.md)

### Glossary terms touched

`verification report` added to `CONTEXT.md`; `green-bar evidence` sharpened (fenced
command + output block in the ledger).
