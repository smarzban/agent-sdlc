---
name: ship
description: "Turn a green, build-finished branch into an open pull request and run Review panel on it. Verify, push, open the PR from the spec, call review_panel. Use AFTER build reports the branch ready. Triggers: 'ship', 'open the PR', 'open-pr', 'raise the pull request', 'send for review', or a build-report.md with every task done. Scope: only within an Agent SDLC run. Last pipeline stage. It does not merge. The invoke name is ship; the job is open the PR."
---

# Ship: open the PR

Take the branch `build` finished and open a pull request. Verify the suite is green, push,
synthesize the PR from the spec, and run Review panel (`review_panel`) on it. The terminal
artifact is an open PR plus a presentation-only review report. ship does not merge. The owner
is the merge gate. The invoke stays `/agent-sdlc:ship` so existing runs keep working.

<HARD-GATE>
Precondition: a **green, build-finished branch with a clean working tree** — proven by
`docs/specs/<feature>/build-report.md` (every task done; build always writes the ledger, ingested plan
or not; root `specs/` in a repo that already uses it — the back-compat rule in getting-started, so
check the repo's actual spec tree before concluding "no ledger"), or, when no ledger exists because
the branch was built **outside the pipeline**, by verifying
the branch directly: the suite is green. On that no-ledger path Review panel is the *sole*
quality review (no upstream spec-gate or per-task review ran) and completeness cannot be asserted
from a ledger — lean on the spec coverage and the review, and say so. A tree dirtied only by a
team-committed, hook-updated `HANDOFF.md` left uncommitted from a prior park (step 9) is the one
sanctioned exception to "clean working tree". If a task is in-progress or blocked, STOP and
route back to `/agent-sdlc:build`. Output is a pushed branch, a written
`docs/specs/<feature>/verification-report.md`, an open PR (body carrying the published AC → proof
map), and a Review panel report. ship creates the PR and runs the review; it does NOT merge.
The owner judges the report. On findings the owner wants fixed, stop and ask before changing
an outward PR.
</HARD-GATE>

## The sequence

1. **Precondition** a green build-finished branch with a clean working tree — `build-report.md`
   all-done, or (no ledger, a branch built outside the pipeline) verify the branch directly. A task
   in-progress or blocked → stop → build.
2. **Verify** run the full suite fresh and read the output (verification-before-completion) — reading
   the bar the way `build` prescribes (build's *Reading the green bar* discipline): the exit code
   straight from the command, never through a pipe that hands you the pager's `$?`, and the suite
   verdict from a machine-readable reporter, not a scraped human summary. Red → stop; do not push a
   red branch.
3. **Verify criteria** build the AC → proof map, write `docs/specs/<feature>/verification-report.md`, then
   **invoke the checker** (the pre-PR invocation point) with the report required:
   `sdlc-check docs/specs/<feature>/<feature>.md --require ledger --require verification-report`. Runtime
   present → run, interpret the exit code: 0 = every AC settled mechanically, proceed; nonzero, or the
   checker crashing, is itself a failed check (fail-closed) — **stop-and-ask**, do not open the PR
   (or, if one is already open, do not treat it as shipped); any human override must be **recorded in
   the PR body**. Runtime absent → an **announced degraded fallback** — never a silent skip.
   **No-ledger path** (a branch built outside the pipeline — the HARD-GATE's alternate precondition):
   there is no `build-report.md`, so drop `--require ledger` (run `sdlc-check … --require
   verification-report` only) and state in the verification report + PR body that ledger-backed proof-evidence
   corroboration is unavailable — the direct suite verification (step 2) plus Review panel
   (step 7) are the quality review, as the HARD-GATE says. Then **commit the verification report** so it
   rides the PR: `git add docs/specs/<feature>/verification-report.md && git commit` (a sibling of the
   already-committed `gate-report.md`/`build-report.md`; without this the pushed branch omits it and
   the worktree is left dirty). This all runs *before* `gh pr create`, distinct from the *post-PR*
   Review panel (step 7): sdlc-check is the mechanical spine, Review panel is the presentation-only
   review. **Read [reference/finishing.md](reference/finishing.md) now, before writing
   the verification report and opening the PR** — it is the load-bearing finishing contract: the PR
   mechanics and the verification-report row grammar the checker parses.
4. **Push** push the feature branch to the remote.
5. **PR** open it with `gh pr create`. Synthesize the title and body from the spec — the `## Brief`
   summary, the `AC-N` list, the task→criterion coverage, any `SHORTCUT(T-N)` ceilings the build
   recorded in `build-report.md` (surface the known compromises so the reviewer sees them), the
   **provenance** of an ingested plan plus the gate's mid-chain-entry / `untraced` note when the chain
   was entered partway (so the reviewer sees what was not vetted upstream), the **AC → proof map**
   built in step 3 (it must land in the PR body, not stay only in the spec tree) plus any
   checker-failure override recorded there, and a link to the spec. (Mechanics + template in
   [reference/finishing.md](reference/finishing.md).)
6. **Linear** if sync is enabled in `.agent-sdlc/config.json`, attach the PR url to the feature's
   issues and post a project status update — via the `linear-sync` skill. The project stays In
   Progress (Linear projects have no In-Review state — mapping.md, ship row).
7. **Review** call `review_panel` (`action: review`) on the open PR's base and head. Pass the
   `## Acceptance Criteria` (and the design, if any) in `scopingNote` so a spec lens has something
   to check. The tool writes a presentation-only report. It does not merge and it does not
   compute a verdict. You judge: keep, skip, or ask the owner. If `review_panel` is not installed,
   fall back to a dispatched whole-PR reviewer subagent and say so.
8. **Report** give the PR URL and the Review panel keep/skip list (or the fallback findings).
   Do not treat the tool report as a merge decision. If the owner wants fixes, STOP and ask
   before rewriting an open PR. A dead seat is lost coverage, named, never a silent empty review.
9. **Park with the reviewed head visible** when the merge is someone else's call (an overseer's or
   maintainer's review — parking the PR instead of finishing): before declaring it parked, the branch
   is **pushed** and the **PR head equals the local reviewed head** — `git rev-parse HEAD` ==
   the PR's `headRefOid` (`gh pr view --json headRefOid -q .headRefOid`) — and the handoff message
   **states that SHA**. A parked PR whose remote head trails the reviewed head shows the reviewer
   stale code while the gate comments describe the new head. **Re-push before every re-park:** each
   post-open fix round ends by pushing and re-syncing the PR head, never left behind after the first
   push. (Mechanics in [reference/finishing.md](reference/finishing.md).)

   **Handoff, if present.** Runs on every ship completion, whether this step's park condition
   applies or not. Check for `HANDOFF.md` at the root of the working copy this run belongs to, not
   the isolated workspace (resolve it with `git rev-parse --git-common-dir` and take its parent
   directory, the same linked-worktree mechanic build's isolation detection already relies on),
   before finishing, and skip with a reason if that root cannot be resolved. If it exists there,
   update it now (the `handoff` skill's update mode) with the branch, the PR, and the parked or
   finished state, say that the doc was updated, and leave the change uncommitted (a team that
   commits the doc handles that commit separately, after the state above is already fixed; the
   sanctioned precondition exception above covers the resulting dirty tree on a later re-entry).
   This hook never asks: if the update mode can't be determined without a question, skip and
   announce why instead of blocking; if the prune trigger fires, the update follows the `handoff`
   skill's hook-driven case (write the entry, defer the prune, announce it owed) rather than
   blocking for confirmation. If it does not exist, do nothing here: this step never creates it,
   presence is the only opt-in.
10. **Leave the worktree** the PR is open; do not clean up the workspace on the PR path.

## Principles

- **An open PR plus a review report is the finish line.** Not a merge. The owner is the merge gate.
- **PR first, then review.** Create the PR, then call `review_panel` on that base and head.
- **Never push or PR a red branch.** Re-run the suite at ship and read the output. The branch was
  green at build; confirm it still is before going outward.
- **Stop before mutating outward.** A keep-list the owner wants fixed is a checkpoint, not a loop.
  Surface it and ask.
- **Build the PR from the spec, not from memory.** The Brief, the criteria, and the coverage map are
  the truthful description of what shipped. Synthesize the body from them.
- **Settle every AC mechanically before going outward.** The proof map plus `sdlc-check
  --require verification-report` is the terminal mechanical settle of "every AC met" against
  captured reality — a second, automated witness, sequenced before the PR exists at all, distinct
  from Review panel's post-PR report.
- **A proof map that isn't in the PR body doesn't count.** Writing `verification-report.md` alone
  satisfies neither the contract nor the reviewer who never opens the spec tree — copy the map into the PR
  body every time.
- **Degrade, never block.** No gate plugin, no Linear — ship still produces a PR. Optional
  dependencies are optional; say what was skipped and carry on.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "build said green, no need to re-verify." | Verify at the boundary. The cost of one suite run is nothing against pushing a red branch. |
| "Review the branch, then open the PR." | Open the PR first, then call `review_panel` on that range. |
| "It found things, I'll just fix and re-push." | A PR is outward. Surface the keep list and ask first. |
| "Merge it, the review looked clean." | ship does not merge. The owner is the merge gate. |
| "review_panel isn't installed, skip the review." | Degrade to the portable reviewer subagent and say so. |
| "Write the proof map after the PR is up, or skip it — build already proved things." | Sequenced pre-PR, before `gh pr create`. The report settles proof-map completeness and evidence linkage mechanically against the ledger's captured evidence; a PR opened first is a PR opened unproven. |
| "sdlc-check isn't installed here, skip verification." | `node` absent is a degraded fallback, announced — not a silent skip. |
| "The checker failed but the branch looks fine, open the PR anyway." | A failed checker run is a failed check — stop-and-ask. Proceeding needs an explicit human override, and it must be recorded in the PR body, not just said aloud. |
| "The proof map lives in `verification-report.md`, that's enough." | The contract requires it in the PR body. A map only in the spec tree is invisible to the reviewer and fails the criterion. |
| "I gated it green locally and parked it for review — good enough." | Not until it's pushed. Parking hands off a PR; the reviewer sees the *remote* head. Push, confirm `HEAD` == the PR's `headRefOid`, state the SHA — and re-push before every re-park. |

## Red flags (stop and fix)

- A branch pushed or a PR opened without re-running the suite at ship.
- A PR body written from memory instead of synthesized from the spec.
- Auto-looping fixes onto an open PR after a keep list without asking.
- ship merging the PR.
- The review step silently skipped because `review_panel` was absent (degrade instead).
- The workspace cleaned up while the PR is still open.
- A PR opened while `sdlc-check --require verification-report` failed, with no override recorded in
  the PR body.
- The AC → proof map left only in `docs/specs/<feature>/verification-report.md`, never copied into the PR
  body.
- A test-backed proof-map row naming a test absent from the ledger's captured green-bar evidence.
- The checker silently skipped when `node` was absent, instead of an announced degraded fallback.
- A PR parked / handed off for review whose remote head does not equal the local reviewed head
  (`git rev-parse HEAD` != the PR's `headRefOid`) — gate comments posted for a head the PR doesn't
  show, so the reviewer reviews stale code — or a post-open fix round re-parked without re-pushing.

## Done when

- The suite is verified green and the branch is pushed.
- `docs/specs/<feature>/verification-report.md` is written with one AC → proof-map row per criterion, and
  `sdlc-check --require ledger --require verification-report` corroborated it pre-PR — or, when
  `node` was absent, an announced degraded fallback is recorded in its place. A failed checker run
  either blocked the PR or was overridden with the override recorded in the PR body.
- A PR is open with a body synthesized from the spec (Brief, `AC-N` list, coverage, spec link), the
  published AC → proof map, plus any `SHORTCUT(T-N)` ceilings recorded in `build-report.md` and, when
  the plan was ingested, its provenance + the gate's mid-chain-entry / `untraced` note.
- Review panel (or the fallback reviewer) has produced a report. You judged keep vs skip and
  named lost coverage. The owner still decides whether to merge.
- If the PR is parked / handed off for review rather than finished: the branch is pushed, the PR head
  equals the local reviewed head (`git rev-parse HEAD` == the PR's `headRefOid`), and the handoff
  message states that SHA; every post-open fix round re-pushed before re-parking.
- Linear PR attachment + project status update done where sync is enabled (or skipped cleanly).

## The artifact (output)

- `docs/specs/<feature>/verification-report.md`
  (root `specs/` in a repo that already uses it — the back-compat rule in getting-started) —
  the AC → proof map, a sibling of `gate-report.md` / `build-report.md` (process state beside the spec).
- An open pull request with the spec-derived description (including the published proof map) and a
  Review panel report.
- No other new files in the repo; ship's remaining output is the PR and the review, not a document.

## Checker grammar (what `sdlc-check` parses — emit exactly this)

The pre-PR checker reads `verification-report.md` literally (the full row grammar + a worked example
are in [reference/finishing.md](reference/finishing.md)):

- **Proof map:** a `Criterion | Type | Proof` table, **one row per defined `AC-N`** (an `NC-N` row is
  optional — the checker doesn't require one). A missing row, or an empty `Proof` cell, is a finding.
- **A `test-backed` row's proof must substring-appear in the ledger's captured green-bar evidence**
  (name-appearance). **Proof cells split on commas**, so a test whose name itself contains a comma
  must be cited by a **comma-free fragment** that appears verbatim in the evidence — otherwise the
  split fabricates identifiers that never match.

## Conventions

- Reads `build-report.md` and the spec; references `AC-N` and the feature branch. When no ledger
  exists (a branch built outside the pipeline), verifies the branch directly instead.
- Invokes `sdlc-check docs/specs/<feature>/<feature>.md --require ledger --require
  verification-report` (resolve per getting-started's checker-resolution rule; degrade only when no form resolves) pre-PR, mirroring gate's and build's checker
  contract: present and clean → corroborated, proceed; present and failing (or crashing) →
  stop-and-ask, override recorded in the PR body; absent → an announced degraded fallback, never a
  silent skip.
- Invokes `review_panel` (pi-review-panel) for the whole-PR review, with a portable
  reviewer-subagent fallback when it is absent.
- Does not merge and does not clean the worktree on the PR path.
- Downstream consumer: the owner merges.
