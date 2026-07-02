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
