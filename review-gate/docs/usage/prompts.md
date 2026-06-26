# Prompt catalog

The CLI **serves its own prompts** — `review-gate prompt <name>` prints a prompt and (for reviewer/
audit prompts) appends the matching output contract, so a skill never needs a filesystem path to the
plugin. Prompts live in `prompts/*.md`.

## How a prompt is assembled

`review-gate prompt <name>` resolves the contract from the name (`src/prompts.ts`):

- An **`audit-*`** prompt is paired with **`audit-output-contract`**.
- **`backends`** is a *reference* doc — served raw, with **no** contract appended.
- Everything else is paired with **`output-contract`**.
- An output-contract name (`output-contract`, `audit-output-contract`) is **refused** as a standalone
  prompt — it only ever appears appended to a real prompt.

## Reviewer prompts (per-PR gate) → `output-contract`

| Prompt | Role / fire-when |
|---|---|
| `holistic` | the core pass — correctness, security, privacy, concurrency, performance, error handling, architecture & fit, tests. Run across all models. |
| `lens-tests` | tests are thin/weak, or behavior changed with little/no test change |
| `lens-spec` | a spec / acceptance criteria exists — append it to the prompt (returns `[]` without one) |
| `lens-security` | a sensitive surface — auth, input handling, crypto, deserialization, subprocess, untrusted parsing |
| `lens-privacy` | the change stores, logs, or transmits personal/sensitive data |
| `lens-contracts` | a public HTTP API or an async event/message schema changed |
| `lens-migrations` | a DB schema migration / DDL is in the change |
| `lens-subtle-correctness` | concurrency/async, caching, or date/time/timezone logic is touched |
| `lens-simplify` | the change adds notable abstraction/indirection/complexity — "is this the *simplest correct* form?" (mostly advisory) |

Lenses are **conditional** backfills on 1–2 diverse models, fired only when a dimension is thin or
high-stakes; most PRs fire 0–2. See [review-gate.md](review-gate.md).

## Audit passes (whole-repo) → `audit-output-contract`

`audit-code-health`, `audit-over-engineering`, `audit-docs`, `audit-tests`, `audit-observability`,
`audit-operability`, `audit-ux`. A menu — run those relevant to the project, each across 2–3 diverse
models. See [repo-audit.md](repo-audit.md).

## Contracts

- **`output-contract`** — the per-PR finding shape: a JSON array of findings, each with
  `title/severity/file/line/area/rationale/suggestion/confidence`, where `severity` gates the merge.
- **`audit-output-contract`** — the audit finding shape: the same fields, but `severity` is impact/
  priority for the backlog (advisory), and `suggestion` starts with `[effort: quick|medium|large]`.

Both are appended automatically; neither is served standalone.

## Reference docs (served raw)

- **`backends`** — the canonical model roster (which backends/models, how each runs, how many to run).
  Shared by both skills so the lineage table never drifts. Fetched with `review-gate prompt backends`.

The `Finding` shape the contracts describe is the data model in
[../technical/architecture.md](../technical/architecture.md).
