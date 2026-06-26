# Using the review-gate (per-PR merge gate)

The **review-gate** skill makes an agent the *signing authority* for a PR while a deterministic spine
owns the verdict. You trigger it by asking Claude to review / sign off on a PR; the canonical,
step-by-step procedure lives in the skill itself (`skills/review-gate/SKILL.md`) — this page is the
operator's overview of what happens and what the verdict means.

## What it does

1. **Checks out the PR branch** in an isolated worktree the reviewers explore (it reads the real
   repo, not a pasted diff).
2. **Builds each reviewer prompt** from `review-gate prompt <name>` (the reviewer instructions + the
   output contract) plus a one-line "review THIS PR" scope.
3. **Runs the panel:**
   - **Deterministic scan first** (`review-gate scan` — $0, no LLM): exact tool detections (conflict
     markers, focused tests, committed secrets/artifacts). A blocking scan finding can fast-fail the
     gate before paying for models.
   - **Holistic review across all configured models** (the core pass).
   - **Conditional lenses** — targeted backfills (security, tests, subtle-correctness, simplify, …)
     fired only when a dimension is thin or high-stakes. The skill requires the lens decision to be
     written out. See [prompts.md](prompts.md).
4. **Consolidates** the findings into clusters with cross-model agreement
   (`review-gate consolidate`).
5. **Adjudicates** — the agent reads the code behind every gating cluster and may dismiss one *only*
   with a code-checked written justification.
6. **Decides** (`review-gate decide`) → a deterministic `{verdict, blocking, dismissed, prComment}`.
   The gate comment also carries the **reviewer/model roster** (provenance only — it can't change the
   verdict). The gate runs as a **multi-round loop**: each round posts two fresh round-numbered comments
   (gate findings + orchestrator review); round N>1 is a cheap **delta re-review**; from round 2 on the
   gate comment includes a **Progress since last round** section (resolved / still-blocking /
   new-regressed — set-difference against a real re-review, never an orchestrator assertion).
7. **Acts** (trusted: the agent, not a reviewer) — on **every run** posts **two fresh comments**: the
   gate findings comment, and a separate **orchestrator review** (what the PR implements, what it
   doesn't cover, and an explicit Approve / Request-changes that agrees with the verdict). The
   orchestrator's final-round comment is an **approval + cumulative summary**, and the orchestrator
   **auto-merges (`gh pr merge`) only when `verdict == pass`** on the current HEAD.
8. **Cleans up** the worktree.

## What the verdict means

- **Severity gates the merge:** `critical` / `high` / `medium` **block**; `low` / `info` are advisory.
- **Verdict is `block` if anything is blocking, else `pass`** — computed by code, not the agent.
- **A model gating finding can be dismissed only with a non-empty justification** (no silent
  dismissal); an unjustified dismissal still blocks.
- **A tool (scanner) gating finding can't be dismissed at all** — it's a fact, not an opinion. To
  clear it, fix the code or tune the scanner; an attempted override is surfaced loudly and stays
  blocking.

The *why* behind this split is the [trust boundary](../technical/trust-boundary.md); the exact
clustering and verdict mechanics are in
[consolidate-and-decide.md](../technical/consolidate-and-decide.md).

## Reviewers are untrusted

Each reviewer is a model running in an agent harness with **read-only** tools, told "review this PR."
Only the agent and the spine (trusted) persist state, post the comment, and set the merge status. A
prompt-injected diff or a steered reviewer cannot flip the gate or bury a finding — see
[../technical/trust-boundary.md](../technical/trust-boundary.md).
