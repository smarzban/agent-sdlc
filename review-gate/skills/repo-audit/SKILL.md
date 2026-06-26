---
name: repo-audit
description: Use when auditing a whole codebase's health periodically — at a milestone, release, or
  after several PRs; when asked to assess overall tech debt, code health, doc or test-suite quality,
  observability, cost, or dependency rot across the entire repo (not a single PR/diff). Advisory
  backlog, not a merge gate.
---
# Repo Audit — orchestrator

A **periodic, whole-repo health audit** — run at a milestone / release / every few PRs. It is the
*advisory* sibling of the per-PR `review-gate`: where the gate blocks a diff, this surveys the whole
codebase and hands the team a **prioritized backlog**. It does **not** block anything and has no
verdict — so there is no trust boundary to enforce (nothing it says can stop a merge), and no
adjudication/dismissal machinery: the team simply decides what to act on.

**What's different from review-gate**
- **Whole repo, not a diff.** Reviewers explore the entire codebase, not "this PR."
- **Advisory, not gating.** Output is a prioritized list to triage, not block/pass.
- **Cross-cutting dimensions a per-PR review can't see** — duplication across modules, dead code, doc
  drift, observability gaps, cloud cost, dependency rot. These only make sense whole-repo + periodic.
- **Severity = impact/priority** for the backlog, not a merge blocker.

**Reuses review-gate's machinery** — the same `review-gate` CLI (on your `PATH` once this plugin is
installed): the `run` verb (a model explores the repo with a prompt), `consolidate` (cluster findings
by location across models), and `prompt` (which serves the `audit-*` prompts too), plus the same
`Finding` JSON shape. It does **not** use `decide` (no verdict).

## When NOT to use
- **On a single PR or diff** — that's `review-gate`. This surveys the whole repo; pointed at one
  change it gives worse per-line scrutiny than the gate *and* throws away the cross-cutting view that
  is its only reason to exist.
- **As a merge gate / required check** — it has no verdict and nothing it emits blocks anything. Do
  not wire it to CI to pass/fail a build (that is `review-gate`'s job).
- **Every PR / continuously** — it's *periodic* (milestone, release, every few PRs). Run constantly
  and the backlog becomes noise no one triages.
- **On a tiny or brand-new repo** — little accumulated drift means little for a whole-repo sweep to
  find; the value compounds with the codebase's age and size.

## Audit passes — a menu; run those relevant to the project
| pass | covers | run when |
|---|---|---|
| `audit-code-health` | dead code, duplication, complexity (long functions, deep nesting), naming, layering/architecture drift, deprecated patterns | always |
| `audit-over-engineering` | over-abstraction, speculative generality (YAGNI), needless indirection, premature generalization, pattern over-application — "is this abstraction earning its keep?" (the structural-complexity sibling of code-health) | abstraction-heavy / framework-y code |
| `audit-docs` | stale/misleading docs & comments, missing public-API docs, README/changelog drift, onboarding gaps | always |
| `audit-tests` | suite quality — tautological/over-mocked/assertion-free tests, gaps in critical paths, flake | always |
| `audit-observability` | logging/metrics/traces adequacy, sensitive data in logs, error context | services / back-ends |
| `audit-operability` | cloud cost, IaC posture (exposure, IAM), dependency rot & supply-chain trust | has infra / deps |
| `audit-ux` | user-facing copy, empty/error states, i18n/locale, accessibility | has a UI |

Run each chosen pass across **2–3 diverse models** — fetch the lineage (which backends/models, how
each runs) from the **canonical roster**: `review-gate prompt backends`. Pick across *different*
lineages, not 2–3 of the same; more diversity → better recall on cross-cutting issues, and cost
tolerance is higher than per-PR since this runs rarely. Holistic-first still holds — these passes are
deliberately broad within a dimension, not 30 narrow specialists.

## Procedure
1. **Pick the passes** relevant to the project (table). Always include code-health, docs, tests.
2. **Build each prompt** = `review-gate prompt <pass> > /tmp/ra-<pass>.txt` (emits the audit pass +
   its output contract), then append: *"Audit THIS repository — the whole codebase, not a diff.
   Explore it (read the structure, the key modules, tests, configs) — but ignore a prior `AUDIT.md`,
   it's this audit's own output, not source — then audit. Output ONLY the JSON array."*
3. **Run** each pass × 2–3 models:
   `review-gate run <pass> <backend> <model> <repoDir> /tmp/ra-<pass>.txt`. Read-only repo
   explorations; run as background subprocesses, but **cap concurrency at ~3–4** (or go pass-by-pass).
   Launching all passes × models at once contends on GPU-billed / high-effort backends and throws
   transient `exited 1` failures — a sequential retry recovers them, but staggering avoids the churn.
   Collect each `output` (skip `null`s) into `/tmp/ra-outputs.json`. **Surface every `warning`**, and
   **retry a failed run once, sequentially**, before treating it as lost coverage.
4. **Consolidate:** `review-gate consolidate /tmp/ra-outputs.json > /tmp/ra-clusters.json` —
   clusters by location, with cross-model agreement.
5. **Prioritize & report (no verdict).** Sort by severity (impact) then agreement; group by `area`.
   Produce a **prioritized backlog**: each item = the issue, where, how many models flagged it, the
   fix + a rough effort. Call out **quick wins** (high impact, low effort) and **cross-cutting themes**
   (the same problem across many files) — the highest-leverage output of a whole-repo audit.
6. **Write the backlog to `AUDIT.md`** at the repo root — that file IS the deliverable (overwrite any
   prior one; it's a point-in-time snapshot). **Stamp the real commit + branch of the AUDITED repo**
   — scope the commands to it: `git -C <repoDir> rev-parse --short HEAD` and
   `git -C <repoDir> branch --show-current` (the latter is blank on a detached HEAD — fall back to the
   short SHA). Capture them yourself; don't copy a hash from `HANDOFF.md`/docs (they drift). Lead with
   the quick wins and cross-cutting themes, then
   the full prioritized table. Optionally also post it where the team triages (a milestone issue, a
   dashboard). Hand off, don't enforce — nothing here blocks a merge.

## Notes
- A deterministic tool tier helps here too — dead-code/duplication detectors (`jscpd`, `ts-prune`),
  `npm/osv` audit, license scan — same pattern as review-gate's `scan`. Layer it in where available.
- **Periodic, not per-PR.** Per-PR is `review-gate`'s job; run this at milestones so the backlog
  reflects *accumulated* drift, which is exactly what whole-repo health surfaces.

## Common rationalizations
| Rationalization | Reality |
|---|---|
| "I'll point it at this PR for a deeper review" | That's `review-gate`. This pass trades per-line scrutiny for cross-cutting reach — on a single diff it does both worse. |
| "AUDIT.md is written, so we're done" | AUDIT.md is *advisory input*, not the work. Nothing improves until the team triages and acts on it; writing it is the start, not the finish. |
| "Run every pass to be thorough" | Passes are a menu — `audit-observability` on a pure library or `audit-ux` on a headless service just adds noise. Thoroughness is depth on the *relevant* passes, not all of them. |
| "More models = better, run all four like the gate" | 2–3 *diverse* lineages is the target; recall here comes from diversity, not count, and this is advisory. Four of one kind isn't more coverage. |
| "A model failed — drop it and move on" | Retry once, sequentially first (transient `exited 1` under load is common). Only then treat it as lost coverage — and say so in the report. |

## Red flags
- Wiring this to CI as a pass/fail check, or otherwise treating its output as a gate — it has **no verdict**.
- Running it on a single PR / diff instead of the whole repo.
- Treating a written `AUDIT.md` as "done" rather than as a backlog to triage and act on.
- A backlog that's a flat dump of findings with no **quick-wins** and **cross-cutting-themes** lead — that synthesis is the highest-leverage output; without it, it isn't an audit.
- Copying the commit/branch stamp from `HANDOFF.md` or docs instead of capturing it with `git -C <repoDir>` (they drift).
- Inflating severities to make the backlog look urgent — severity = real impact, for prioritization only.
