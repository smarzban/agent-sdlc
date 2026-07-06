# sdlc-check — the enforcement-spine checker

A deterministic checker for the pipeline's mechanically-decidable promises. `gate`, `build`, and
`ship` invoke it at their checkpoints, but it is equally a standalone tool: point it at any
sectioned spec and it verifies the chain. Single zero-dependency ESM file
([`checker/sdlc-check.mjs`](../../checker/sdlc-check.mjs)), bare Node ≥ 22, no build step.

## Invocation

```bash
# installed as a plugin — bin/ is on the Bash PATH, works from any directory
sdlc-check docs/specs/<feature>/<feature>.md

# from a checkout of this repo
node checker/sdlc-check.mjs docs/specs/<feature>/<feature>.md
```

The spec path is the one required argument. The ledger (`build-report.md`) and verification report
(`verification-report.md`) are found as siblings of the spec file and checked **when present** —
rules auto-scope to the artifacts that exist. To make absence itself a failure:

```bash
sdlc-check docs/specs/<feature>/<feature>.md --require ledger
sdlc-check docs/specs/<feature>/<feature>.md --require verification-report
```

(`ship`'s standard pre-PR invocation requires both — `--require ledger --require
verification-report` — dropping `--require ledger` only on the no-ledger ingested-branch path.)

## Output and exit code

Every report is stamped with the checker's version (so a stale cached copy is visible at a
glance):

```
sdlc-check 0.11.0: all checks passed — 0 findings, 0 notes.
```

- **Exit 0** — zero findings. Notes (advisory) don't affect the exit code.
- **Exit 1** — one or more findings, a spec parse failure, a missing spec path, or a bad argument.
  Fail-closed: no error path exits 0, and a systemic git failure while ledger rules should run is a
  finding, never a silent pass.

## The rules

| Rule | Verifies |
| --- | --- |
| `trace-integrity` | Every trace reference resolves — no task advancing a nonexistent criterion or component. |
| `coverage-forward` | Every acceptance criterion is carried by a task (reviewer-checked criteria included). |
| `coverage-backward` | Every task advances a real criterion or carries an explicit `untraced` marker (surfaced as a note) — no silent orphan work. |
| `provenance-marker` | Materialized-input provenance markers are well-formed (source + absolute date). |
| `green-bar-evidence` | Each done ledger task carries a non-empty captured green-bar evidence block — evidence is captured text, never a checkbox. |
| `ledger-vs-git` | Each done task's recorded commit SHA exists, is reachable from `HEAD`, and its subject carries the `feat(T-N):` scope. |
| `proof-map-completeness` | The verification report maps every defined AC to a proof row. |
| `proof-evidence-linkage` | A test-backed proof row names a test that actually appears in the captured evidence. |

Plus two shell-level findings: `artifact-parse` (an artifact that exists but can't be parsed) and
`required-artifact` (a `--require`d artifact is absent).

## What it does and doesn't verify

It verifies **consistency, not truth**: the spec, ledger, report, and git history agree with each
other. Evidence is plain text checked by name-appearance
([ADR-0001](../specs/adr/ADR-0001-plain-text-evidence-contracts.md)); fabricated-but-consistent
artifacts are out of scope — that's what the review gate and a human are for.

One practical consequence of `ledger-vs-git`: merge a shipped feature **fast-forward,
SHA-preserving**. A squash or rebase merge rewrites the recorded task commits, and the shipped
spec stops self-verifying.
