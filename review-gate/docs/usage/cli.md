# CLI reference: `review-gate`

The spine is a single command with five verbs. It's on your `PATH` once the plugin is installed
(`bin/review-gate`), so it runs from any directory. Every verb is deterministic plumbing **except**
`run`, which spawns an untrusted model. Output is JSON on stdout.

The skills call these for you; this is the reference for driving the spine directly or wiring CI.

## `review-gate prompt <name>`

Prints the named reviewer/audit prompt **plus its output contract** to stdout, so a caller can build a
prompt file with no path to the plugin. `<name>` is format-validated (lowercase letters, digits,
hyphens) — a stray `../` or absolute path is rejected, so the verb can't be turned into an
arbitrary-file reader.

```bash
review-gate prompt holistic > /tmp/rg-holistic.txt
```

See [prompts.md](prompts.md) for the catalog and how a prompt is paired with its contract.

## `review-gate run <reviewer> <backend> <model> <repoDir> <promptFile>`

Runs **one** reviewer (one model) in `repoDir` — the model explores the checked-out branch itself.
`<backend>` is `ollama` | `claude` | `codex`. Prints
`{reviewer, backend, model, output, warning}` where `output` is a `ReviewerOutput` (or `null` on
failure, with `warning` set — a dead/flaky model never throws the gate down).

```bash
review-gate run holistic claude claude-opus-4-8 /tmp/wt /tmp/rg-holistic.txt
```

This is the only verb that calls a model (untrusted, read-only). The exact backend commands and the
run guards are in [../technical/reviewers-and-scanners.md](../technical/reviewers-and-scanners.md).

## `review-gate scan <repoDir> <baseRef>`

The **deterministic tier** — `git diff <baseRef>...HEAD` plus the scanners (git-hygiene always, gitleaks
and osv-scanner when present). No LLM, $0. Prints `{output, warning}` where `output` is a
`ReviewerOutput` with `reviewer: "tools"`, `model: "deterministic"` that joins the same pool as the
model reviewers. Trusted and exact. See
[../technical/reviewers-and-scanners.md](../technical/reviewers-and-scanners.md).

```bash
review-gate scan /tmp/wt origin/main
```

## `review-gate consolidate <outputs.json>`

Takes a JSON array of `ReviewerOutput` and clusters findings by location across models, with a
cross-model agreement count and a `contested` flag. Prints `FindingCluster[]`. The clustering and the
cluster-key contract are in
[../technical/consolidate-and-decide.md](../technical/consolidate-and-decide.md).

## `review-gate decide <clusters.json> <adjudications.json> <meta.json> [previous.json]`

Computes the verdict. Takes the clusters, an array of adjudications
(`[{key, decision, justification?}]` — may be `[]`), and the run metadata
(`{reviewers: [{reviewer, model}]}`: the reviewer/lens passes and models that ran). Prints a `Decision`:
`{verdict, blocking, dismissed, report, prComment}` — all deterministic. **All three arguments are
required** (a falsy/`null` meta is rejected, so the gate comment always names the reviewers). `meta.json`
may carry `round` (1-based); pass the prior round's `blocking` array as the optional `previous.json` to
add the **Progress since Round N−1** section (resolved / still-blocking / new-regressed). The 4th arg
is optional and backward-compatible. The orchestrator's approval is **not** produced here — it's a
separate, free-form review comment the skill posts. The verdict, dismissal rules, and the comment's
sections are in
[../technical/consolidate-and-decide.md](../technical/consolidate-and-decide.md).
