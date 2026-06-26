# Architecture

## The core idea

review-gate splits the work in two:

- **The agent orchestrates the *reviewing*** — flexible judgment: which models to run, which lenses to
  fire, reading the code behind each finding, adjudicating contested ones.
- **A deterministic spine owns the *verdict* and the *trust boundary*** — `consolidate` + `decide` are
  pure code. The verdict is computed from structured findings, and the one place model judgment enters
  (an adjudication) is tightly constrained.

This is what lets the reviewers be **untrusted**: a prompt-injected diff or a steered model can shape
*findings*, but it cannot flip the gate, bury a finding, or wave away a fact — the spine doesn't let
it. See [trust-boundary.md](trust-boundary.md).

## Data flow

```
                 (untrusted, read-only)        (trusted, exact)
  model reviewers  ─┐                          ┌─  deterministic scanners
   (runner.ts)      │                          │      (scan.ts)
                    ▼                          ▼
              ReviewerOutput[]  ────────────────────►  consolidate.ts
                                                            │  FindingCluster[]
                                                            ▼
                                        agent adjudicates contested/gating clusters
                                          (reads the code; Adjudication[])
                                                            │
                                                            ▼
                                                        decide.ts
                                              Decision { verdict, blocking,
                                                dismissed, report, prComment }
```

Both the model reviewers and the scanners emit the **same `Finding` shape**, so the scanners' output
joins the same pool and flows through the unchanged spine — the only difference is a finding's
`source` (`"model"` vs `"tool"`), which the spine treats very differently (see
[trust-boundary.md](trust-boundary.md)).

## The data model (`src/types.ts`)

- **`Finding`** — one issue: `title`, `severity` (`critical|high|medium|low|info`), `file`, `line`,
  `area?` (advisory label, never used for the verdict), `rationale`, `suggestion`, `confidence?`, and
  `source?` (`"model"` default, or `"tool"`).
- **`ReviewerOutput`** — one reviewer's full output: `{ reviewer, model, findings }`. A scanner run is
  a `ReviewerOutput` with `reviewer: "tools"`, `model: "deterministic"`.
- **`FindingCluster`** — findings from different models at the same location, merged:
  `{ key, representative, members, agreement: {count, total}, severity, contested }`.
- **`Adjudication`** — the agent's call on a cluster: `{ key, decision: "confirmed"|"dismissed",
  justification? }`. The only model judgment that enters the verdict.
- **`Decision`** — `{ verdict: "pass"|"block", blocking, dismissed, report, prComment }`.
- **Severity**: `SEVERITY_RANK` orders them; **`GATING`** = `{critical, high, medium}` — these block,
  `low`/`info` are advisory.

## Modules

| File | Responsibility |
|---|---|
| `src/cli.ts` | the `review-gate` command — dispatches the five verbs ([../usage/cli.md](../usage/cli.md)). |
| `src/runner.ts` | runs one model reviewer (backends, output salvage, cost/hang guards). |
| `src/scan.ts` | the deterministic scan tier (git-hygiene + gitleaks/osv adapters). |
| `src/consolidate.ts` | clusters findings by location, computes cross-model agreement. |
| `src/decide.ts` | the verdict, the dismissal rules, the PR comment. |
| `src/proc.ts` | `spawnBounded` — the single hardened bounded-subprocess core (shared by runner + scan). |
| `src/prompts.ts` | resolves a prompt name to its file + output contract. |
| `src/types.ts` | the data model above. |

`runner.ts` and `scan.ts` both share `spawnBounded` from the neutral `proc.ts` so the
hang/cost hardening is uniform — see [reviewers-and-scanners.md](reviewers-and-scanners.md).
