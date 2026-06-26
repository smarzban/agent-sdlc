# The trust boundary

This is the defining design property of review-gate: **the reviewers are untrusted, and the verdict is
still trustworthy.** Everything below exists to make that true.

## Untrusted reviewers, trusted spine

Each reviewer is a model running in an agent harness with **read-only** tools (Read/Grep/Glob + git
read), told "review this PR." It can read the repo but change nothing. The only actors that *do*
anything — persist state, post the comment, set the merge status — are the orchestrating agent and the
deterministic spine, both trusted.

So an attacker who controls the diff (or who steers a reviewer via prompt injection in the code under
review) can influence what *findings* are produced, but the **verdict is computed by `decide.ts` from
structured findings** — not by any model. They cannot make the gate say "pass."

## No silent dismissal

The one place model judgment enters the verdict is an **adjudication** of a cluster, and it's
constrained:

- A **model** gating finding (`critical`/`high`/`medium`) can be dismissed **only with a non-empty
  `justification`**. An unjustified dismissal is **not honored** — the finding still blocks (`decide.ts`).
- The orchestrator's discipline (in the skill) goes further: the justification must state what was
  **checked in the code**, not merely why the finding sounds unlikely.

The gate fails *safe*: when in doubt, it blocks.

## Tool findings are facts — not dismissible

A finding with `source: "tool"` comes from a deterministic scanner — an exact match, not an opinion.

- `decide.ts` **never lets an adjudication clear a tool gating finding.** It stays blocking regardless.
- An attempted dismissal is surfaced loudly and separately in the PR comment as
  **"⚠️ Deterministic findings — override NOT honored"** — auditable, still blocking.
- To clear one, you **fix the code** or **tune the scanner's config/allowlist** so it stops firing.
- A model can't forge a fact: `validateRows` in `runner.ts` **always forces `source: "model"`** on
  model output, so a model-supplied `"source": "tool"` is ignored.

## Fail closed, never silently open

A deterministic backstop that can't run must not become a silent pass — otherwise an attacker disables
it (oversized diff, hostile ref) and secrets slip through. So:

- `runScan` **refuses an option-shaped `baseRef`** (one starting with `-`) and emits a blocking tool
  finding on any scan failure.
- A scanner that is **present but fails to complete** (timeout, output-cap, unparseable output, bad
  exit) emits a blocking, non-dismissible "failing closed" finding.
- Git plumbing is pinned (`color.ui=false`, `--end-of-options`, byte/▸time caps) so a hostile git
  config or ref can't yield an empty-but-clean-looking scan.

## Scanner config is part of the trusted tier

Because the scanners defend the very repo they scan:

- Pin a **trusted** config outside the checkout (`REVIEW_GATE_GITLEAKS_CONFIG` /
  `REVIEW_GATE_OSV_CONFIG`) so a repo-supplied policy can't loosen the rules; gitleaks also ignores
  in-source allow comments and uses an empty ignore path by default.
- A **change to an in-repo scanner policy file** (`.gitleaks.toml`, `.gitleaksignore`,
  `osv-scanner.toml`) is itself flagged as a gating finding — changing scanner policy is a privileged
  change.

See [configuration.md](../install/configuration.md) and
[reviewers-and-scanners.md](reviewers-and-scanners.md).

## Clustering is *not* the trust boundary

Cross-model clustering ([consolidate-and-decide.md](consolidate-and-decide.md)) is a **display and
agreement aid**, deliberately permissive (a single shared title token merges). An attacker-steered
reviewer could in principle co-locate a finding to merge with a real one — and that's fine, because
the gate's safety never rests on clustering being adversarially perfect. What actually blocks is the
**tool tier** (non-dismissible facts), the **multi-model panel**, and the **agent reading the code**
behind every gating cluster before dismissing it.

## The comment can't be forged

Model-supplied titles/rationale and attacker-influenced paths are interpolated into the gate findings
comment, so `decide.ts` **sanitizes** them — collapsing whitespace (so they can't open a new line) and
escaping the markdown metacharacters `` ` `` `<` `>` `[` `]` `\` `#` `*` `_` `|` `~`. So untrusted text
can't forge a header, fake a **bold "✅ PASS"** verdict line, build a table, or inject HTML/links —
**even when it is rendered at the start of its own line** (a finding's rationale/suggestion). The
verdict itself is computed in code regardless, so a spoofed comment still can't change the gate. (The
orchestrator's *own* review comment is a separate, trusted, free-form post — no untrusted interpolation,
so it isn't routed through this sanitizer.)
