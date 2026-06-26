# Using repo-audit (whole-repo health audit)

The **repo-audit** skill is the *advisory* sibling of the gate. Where the gate blocks a diff, this
surveys the **entire codebase** periodically and hands the team a **prioritized backlog**. It has **no
verdict and blocks nothing** — so there is no trust boundary to enforce and no adjudication machinery.
The canonical procedure is in the skill (`skills/repo-audit/SKILL.md`); this is the overview.

Trigger it by asking Claude for a whole-repo health audit (at a milestone, release, or every few PRs).

## How it differs from the gate

- **Whole repo, not a diff** — reviewers explore the entire codebase.
- **Advisory, not gating** — output is a backlog to triage, not block/pass.
- **Cross-cutting dimensions a per-PR review can't see** — duplication across modules, dead code, doc
  drift, observability gaps, dependency rot.
- **Severity = impact/priority** for the backlog, not a merge blocker.

## Audit passes (a menu — run those relevant to the project)

| Pass | Covers | Run when |
|---|---|---|
| `audit-code-health` | dead code, duplication, complexity, naming, layering/architecture drift | always |
| `audit-over-engineering` | over-abstraction, speculative generality (YAGNI), needless indirection | abstraction-heavy code |
| `audit-docs` | stale/misleading docs, missing public-API docs, README/changelog drift | always |
| `audit-tests` | tautological/over-mocked/assertion-free tests, gaps in critical paths, flake | always |
| `audit-observability` | logging/metrics/traces adequacy, sensitive data in logs, error context | services / back-ends |
| `audit-operability` | cloud cost, IaC posture, dependency rot & supply-chain trust | has infra / deps |
| `audit-ux` | user-facing copy, empty/error states, i18n/locale, accessibility | has a UI |

Run each chosen pass across **2–3 diverse models** (different lineages, not 2–3 of the same — fetch
the roster with `review-gate prompt backends`). It reuses the gate's `run`, `consolidate`, and
`prompt` verbs and the same `Finding` shape, but **not** `decide` (no verdict). See
[prompts.md](prompts.md).

## Output

A prioritized backlog written to **`AUDIT.md`** at the repo root (the deliverable; overwritten each
run as a point-in-time snapshot), led by **quick wins** (high impact, low effort) and **cross-cutting
themes** (the same problem across many files). Hand it off; nothing here enforces.
