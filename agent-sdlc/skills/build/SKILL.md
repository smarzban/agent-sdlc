---
name: build
description: "Execute a gate-passed plan autonomously: one fresh subagent per task, test-first, committing green between tasks, until the branch is ready to ship. Use AFTER the gate verdict is 'ready to build' and BEFORE ship. Triggers: 'build', 'implement the plan', 'execute the tasks', 'start building', or a clean gate-report.md with a settled `## Plan`. Scope: only within an Agent SDLC run (a spec chain exists), not on the bare word alone. This is the conductor: it dispatches and gates, it does not write code itself."
---

# Build: conduct the plan into a green branch

Execute the `## Plan` task list without a human in the loop. For each task, dispatch a fresh
implementer subagent that writes the failing test first, then the minimal code; review the diff;
commit only when it is green. The skill is a conductor — it holds the task list and a resumable
ledger, and delegates every line of code to a subagent. The disciplines live in reference files the
subagents read, not here.

<HARD-GATE>
Precondition: a **gate verdict of ready to build** (no Critical or High findings) exists **for the
plan in hand**. The plan is resolved per the input-resolution rule
([input-resolution](../getting-started/reference/input-resolution.md)) — the `## Plan` section of
`specs/<feature>/<feature>.md`, or an external plan (a Linear issue set, a doc) materialized into
`## Plan` with a provenance marker first (see [reference/ingesting-plans.md](reference/ingesting-plans.md)).
If no verdict exists for that plan, **run `/agent-sdlc:gate` inline** and proceed only on a clean
verdict — never build on an unblessed chain, whatever the plan's source. Input is the `## Plan`
section (plus the sections it references) and the gate report. Output is product code on a feature branch, one atomic
commit per task, and `specs/<feature>/build-report.md` (the ledger). The terminal action is a green
branch handed to `/agent-sdlc:ship`. Do NOT open the PR — that is ship's job.
</HARD-GATE>

## The loop (the conductor's whole job)

1. **Precondition** resolve the plan (input-resolution rule); if it came from an external source,
   **ingest it first** — **read [reference/ingesting-plans.md](reference/ingesting-plans.md) now,
   before materializing anything** (it is the load-bearing ingest contract): materialize `## Plan` +
   minimal trace links + the green bar, provenance-marked, then run `/agent-sdlc:gate` inline.
   Confirm a ready-to-build verdict exists for the plan in hand. Proceed only on a clean verdict;
   else stop.
2. **Isolate** set up an isolated workspace (detect existing isolation → native worktree tool → `git
   worktree` fallback). Run the **green bar** once — the commands `## Tech Stack` declares (compile,
   test, lint, format-check): the baseline MUST be green before touching anything. **Vacuous-green
   exception (general rule):** if the green bar's target paths do not yet exist (a greenfield
   feature — nothing to compile or test yet), the baseline is **vacuously green**, not red — report
   it as such and proceed; the bar becomes binding from the first task that creates those paths
   onward. This is not a per-feature carve-out — do not re-derive it in a plan's Notes.
   **Classify each declared command's baseline result** (this is where *runnability* is diagnosed —
   the gate stayed read-only and never ran these; the isolated workspace is where side-effects belong):
   - **vacuous-green** — the command's target paths don't exist yet → skip (the rule just above).
   - **runs & passes** → green; proceed.
   - **nonzero exit** → **STOP** (as today) — but read the command's output and label *which* kind,
     because the label routes the fix:
     - **unrunnable command** — the declared command is malformed / bad-form (e.g. the enforcement-spine
       `node --test agent-sdlc/checker/` bare-directory invocation): the failure is about the command's
       *form*, not the code. This is a **green-bar DECLARATION defect** — STOP, show the command's
       **actual output**, and route the fix back to **`techstack`** (the green-bar owner), not a
       misleading "the repo is red" halt. Record it in `build-report.md`.
     - **genuinely-red repo** — the command runs fine but reports real failures on existing code: the
       normal red-baseline stop (the repo isn't green) — STOP and fix the code, as today.
   The **deterministic** part is fixed: a nonzero baseline exit *always* STOPS. The unrunnable-vs-red
   label is only a routing hint (which stage owns the fix), decided by reading the command's output; it
   never changes the stop decision, so the baseline stays deterministic.
   **Pin the agent-type roster here, once.** Resolve the implementer/reviewer/fixer agent types the
   loop will dispatch before the per-task loop begins. If a declared type is unavailable, **announce
   the substitution ONCE up front and record it in `build-report.md`** (e.g. `implementer →
   general-purpose stand-in: <reason>`) — never rediscover the degradation per dispatch. A pinned
   roster plus a single up-front announcement is deterministic; per-dispatch rediscovery is
   improvisation that hides which agent actually did the work.
3. **Ledger** open `build-report.md`. If it already exists, resume from it plus `git log` — never
   re-run a task already marked done. Re-doing completed work is the most expensive failure here.
   **When resuming an existing ledger, invoke the checker first** (resume invocation point, AC-15) —
   this corroborates the work already recorded, so it runs ONLY when a `build-report.md` already
   exists; a fresh build has no ledger yet (this step CREATES it), so skip the checker here and let
   the build-complete run (step 5) be the first invocation. Command (when resuming):
   `sdlc-check specs/<feature>/<feature>.md --require ledger` (never
   `--require verification-report` at build — that artifact is ship's, T-12). Runtime present → run,
   interpret the exit code: 0 = corroborated, proceed; nonzero, or the checker crashing, is itself a
   failed check (fail-closed) — **stop-and-ask**, do not resume task work; any human override must be
   recorded in `build-report.md` (who/what, why continuing despite the failed check). Runtime absent
   → write an **announced degraded fallback** line into `build-report.md` now — never a silent skip.
4. **For each task `T-N`, in dependency order** (before the first dispatch, **read
   [reference/subagent-loop.md](reference/subagent-loop.md) now** — it is the load-bearing dispatch
   contract: the dispatch mechanics, the three subagent briefs, the bounded fix cycle, and the
   subagent-death policy):
   a. Dispatch the **implementer** subagent with a file brief for `T-N` only.
   b. Dispatch the **reviewer** subagent on the resulting diff.
   c. If the reviewer finds Critical/Important issues, dispatch a **fixer** and re-review (bounded).
   d. Verify the **green bar** is green — the **conductor itself runs** the full declared set
      (compile, test, lint, format-check) after the reviewer passes / before the commit, and reads
      the output (verification-before-completion). Not just tests: lint or format drift caught now
      is a clean commit; caught later is a reactive scramble. **Capture that run's actual output**
      as the task's green-bar evidence — the command line(s) plus the output, piped/pasted verbatim
      — a **harness-captured fact**, *never* a transcription of the subagent's reported `Tests N
      passed` summary or count. Two holes this closes: **(i) trust-the-subagent** — a subagent can
      report a false count, so the recorded count must be the conductor's *own* observed run, not
      the subagent's word; **(ii) summary-only degradation** — transcription drifts to summaries,
      losing the per-test names AC-14 needs. So the captured block is the **per-test listing** (e.g.
      `node --test`'s `ok N - <name>` lines), not summary counts — those names are what ship's
      AC-14 linkage matches against. **Bounded for large suites:** cap the block to a tail, but
      retain in full the per-test `ok N - <name>` lines for **the tests this task adds or exercises**
      — the failing test(s) the plan named for `T-N` (test-first) — since those are exactly what a
      later proof map can cite; the rest of a large **pre-existing** suite (tests this task did not
      add) may be capped to its summary tail. **A task that adds no tests** (e.g. a prose/doc task)
      has no task-specific per-test names to retain — its suite summary (e.g. `# pass N`) is then the
      correct bounded form (still the conductor's own run, never a transcription); this is the ONLY
      case where a summary alone suffices. If a full per-task listing is impractical, the fallback is
      a build-complete comprehensive block carrying the full per-test listing — per-task capture stays
      the norm. (Vacuous-green and staged-isolation handling below are unchanged.)
   e. Commit: one atomic commit for the task, reflecting the reviewed code. Verify it compiles **in
      isolation** — run the bar against the staged snapshot (`git stash --keep-index
      --include-untracked` → bar → pop), not just the working tree: an under-staged commit can pass a
      working-tree check yet fail to build on checkout.
   f. Update `build-report.md`: `T-N` done, the commit SHA, the `AC-N` it advanced, and the captured
      green-bar evidence as a fenced block beside the task — **the conductor's own run output (step
      4d), not a restatement of what the subagent said** — from the first task onward, never
      deferred. This is the write side the checker's evidence-presence (AC-5) and
      name-appearance-linkage (AC-14) checks read: a test-backed proof-map row's cited test
      identifier must literally appear in this text (ADR-0001) — so the block must record the
      per-test names, not a summary count that names no test. **Note the verification form** beside
      the evidence — the exact command, its directly-read exit code, and the machine-reporter counts
      (per *Reading the green bar* above) — so the record shows the bar was read correctly, not merely
      that something was run.
   g. If Linear sync is enabled in `.agent-sdlc/config.json`, transition `T-N`'s issue via the
      `linear-sync` skill.

   If an implementer reports a **plan/reality mismatch** (a named file/path is wrong, a symbol was
   renamed, the task must split, an assumed dependency differs), **read
   [reference/plan-amendments.md](reference/plan-amendments.md) now** and follow the amendment loop —
   STOP the task, route the delta through the `plan` method, materialize it into `## Plan` with a
   provenance marker, run `/agent-sdlc:gate` inline on the delta, record it in `build-report.md`. Do
   **not** silently adapt and do **not** free-author the plan. Mechanical drift is amendable in-loop; a
   scope or acceptance-criteria change **stops-and-asks** the human (see the escalation boundary).

   If a dispatched subagent **dies mid-task** (session/token limit, API error, crash), follow the
   **subagent-death policy** — capture partial work → retry once with a fresh subagent → only then
   conductor-takeover, with the deviation recorded in `build-report.md`
   ([reference/subagent-loop.md](reference/subagent-loop.md)). A dead subagent is not a licence to
   silently finish the task yourself.
5. **Hand off** when every task is done and green: **invoke the checker again** (build-complete
   invocation point, AC-15) — same command as step 3 (`--require ledger`, never
   `--require verification-report`). Same interpretation: nonzero or a crash is a failed check →
   stop-and-ask, do not hand off, human override recorded in `build-report.md`; runtime absent →
   announced degraded fallback recorded in `build-report.md`. Only once corroborated (or the
   degraded fallback is recorded): report "branch ready, run `/agent-sdlc:ship`".

The dispatch mechanics, the three subagent briefs, the bounded fix cycle, and ledger recovery are in
[reference/subagent-loop.md](reference/subagent-loop.md). The disciplines the subagents follow are in
[reference/tdd.md](reference/tdd.md), [reference/source-driven.md](reference/source-driven.md),
[reference/simplicity.md](reference/simplicity.md), and [reference/debugging.md](reference/debugging.md).

## Reading the green bar (how you run it, not just when)

The bar only means something if you read it correctly — a green bar *misread* is worse than a red
one, because it ships. Every green-bar run in this loop — the baseline (step 2), each per-task
verification (step 4d), the in-isolation check (step 4e), and ship's re-verify — obeys three rules:

- **Read the exit code directly, never through a pipe.** `cmd | filter; echo $?` reports the *last*
  pipeline stage's exit (the pager's, the `grep`'s, the `head`'s), not `cmd`'s — so a command that
  failed reads as `0` and a red bar passes as green. Read the unpiped command's own status: capture
  first and read after (`cmd > out.txt 2>&1; rc=$?`, then filter `out.txt`), or set
  `set -o pipefail` / inspect `${PIPESTATUS[0]}` explicitly. This applies to the checker too —
  `sdlc-check … | head` and then `$?` is the classic false green.
- **Take the suite verdict from a machine-readable reporter, not a human summary.** Read the runner's
  structured signal — its **exit code**, `node --test`'s `# fail N` line, vitest's
  `--reporter=json` → `numFailedTests` — never a scraped human-formatted "N failed" line. When the
  human reporter and the machine reporter **disagree** (a worker/spawn-contention flake shows failures
  the machine reporter counts as zero), you **investigate via the machine reporter** — you never
  explain the discrepancy away as "probably a flake," and you never normalize "some failures are
  flake" into shipping a real red.
- **Record the verification form in the ledger.** The captured evidence notes *how* the bar was read
  — the exact command, its directly-read exit code, and the machine-reporter counts — so a later
  reader (and the checker) can tell a real green from a misread one, not just that something was run.

These are not extra steps; they are how the runs the loop already prescribes must be read. A bar read
through a pipe, or trusted from a human summary over the machine one, is the exact false green this
discipline exists to stop.

## Principles

- **Conduct, do not perform.** The conductor never writes product code (the one sanctioned exception
  is the recorded subagent-death takeover — see [reference/subagent-loop.md](reference/subagent-loop.md)).
  Every change comes from a subagent with a one-task brief. If you find yourself editing source
  directly, stop and dispatch.
- **Plan source is irrelevant to the loop.** A plan ingested from Linear or a doc runs the identical
  per-task discipline — test-first, review, green bar, isolation, ledger. The adapter changes only how
  the plan arrives; if any rigour changes because of where it came from, that is a bug.
- **One task, one green commit.** The repo compiles, passes, lints, and is formatted after every
  task — the whole green bar, not just the suite. A task that cannot finish green was mis-sized in
  planning — loop back, do not force it through.
- **Test-first is the subagent's contract.** The plan named the failing test; the implementer writes
  it and watches it fail before any code. Tests-after is a violation, not a shortcut.
- **Context hygiene.** A brief describes one task, never the session history or the whole plan. Hand
  artifacts (brief, diff, findings) through files, not by pasting them into prompts.
- **The ledger is truth after a compaction.** Trust `build-report.md` + `git log` over memory. They
  survive context loss; your recollection does not.
- **Stop at a blocker, do not improvise.** Ambiguity, a contradicted plan, or a task that will not go
  green after bounded fixes: record it blocked and ask. Do not paper over an unsettled plan.
- **Review at two scales.** Every task gets a cheap reviewer subagent here; the whole PR gets the
  heavy `review-gate` once, at ship. Both are real gates; neither replaces the other.
- **Evidence is captured text, never a checkbox — and it is the conductor's OWN run.** Each
  green-bar run is recorded verbatim — the command plus its output tail (the per-test listing,
  bounded) — beside the task, from the first task onward. The recorded output is the conductor's own
  post-review run, never a transcription of the subagent's reported count: a subagent's self-report
  is not evidence (trust-the-subagent), and a transcribed summary loses the per-test names AC-14
  needs (summary-only degradation). A task marked done with no evidence block is not done.
- **Read the bar, don't glance at it.** A misread green bar is worse than a red one — it ships. Read
  exit codes straight from the command (never through a pipe that hands you the pager's `$?`), take
  suite verdicts from a machine-readable reporter (not a scraped human summary), and investigate any
  human/machine reporter discrepancy via the machine one — never wave it off as "probably a flake."
  See *Reading the green bar* above.
- **Corroborate at resume and at hand-off.** The checker is a second, mechanical witness to the
  ledger/trace/commits so far — run it before continuing after a break and again before ship. A
  nonzero exit or a crash is a failed check, not noise.
- **Degrade loud, never quiet.** No `node` at either invocation point — the loop still runs, but say
  so in `build-report.md`. A silent skip reads as a clean pass it isn't.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I'll just edit this file directly, it's faster." | The conductor delegates. Direct edits skip the review gate and bloat its context. Dispatch. |
| "Write the code, add the test after." | Tests-after answers "what does it do"; tests-first answers "what should it do". The plan named the failing test — write it first. |
| "Give the subagent the whole plan for context." | One brief = one task. The whole plan is noise that derails an autonomous run. |
| "Skip the per-task review, review-gate catches it at ship." | A whole-PR gate cannot localize a per-task drift cheaply. Review early; fix while it is small. |
| "This task won't go green, I'll wire the next one and come back." | Errors compound. Stop the line: a blocked task is recorded and raised, not deferred. |
| "Trust my memory of what's done after the compaction." | Re-running a done task is the costliest failure. Read the ledger and `git log`. |
| "The plan came from Linear/a doc, it's already reviewed — skip the gate." | A source is not a verdict. An unvetted plan is unvetted whatever its origin — run the gate inline, then build. |
| "The checker isn't installed here, just skip resume/build-complete." | `node` absent is a degraded fallback, announced in `build-report.md` — not a silent skip. |
| "`sdlc-check` failed but the task looks fine, proceed anyway." | A failed checker run is a failed check — stop-and-ask. Proceeding needs an explicit, recorded human override. |
| "I'll add the evidence block later, once more tasks land." | Evidence is captured from the first task, never deferred — a gap left for later is a hole the checker (AC-5/AC-14) will find. |
| "The subagent already ran the tests and reported them green — I'll record its count." | A subagent's self-report is not evidence. The conductor runs the declared command itself and records that run's actual per-test output — a false or summarized count is exactly the hole this closes. |
| "`sdlc-check … \| head` printed nothing scary and `$?` was 0 — green." | `$?` after a pipe is the pager's exit, not the checker's. Read the command's own exit code — capture to a file first, or use `pipefail`/`${PIPESTATUS[0]}`. A pipe is how a red bar passes as green. |
| "The human reporter shows a couple of failures — probably a flake, ship it." | Investigate via the machine reporter (exit code, `# fail N`, `--reporter=json` `numFailedTests`), never explain a discrepancy away. Normalizing "some failures are flake" is how a real red ships. |
| "The baseline is red because the target files don't exist yet — stop." | Absence of the declared paths is vacuous green, not red — greenfield has nothing to fail. Proceed; the bar binds once the paths exist. |
| "The baseline is red, must be my code." | First check the command itself ran — a malformed green-bar command is a techstack declaration bug, not red code; route it there. |
| "The implementer agent type isn't available — I'll swap in a stand-in whenever I hit a dispatch." | Per-dispatch rediscovery is improvisation. Resolve the roster once at build start, announce the substitution up front, and record it in the ledger. |
| "The subagent died mid-task — I'll just finish it myself and move on." | Not without the policy: capture the partial work, retry once fresh, only then conductor-take-over, and record the deviation. A silent takeover erases which agent did the work. |
| "The plan's path is wrong, I'll just fix it inline." | Silent adaptation drifts the spec from the code and breaks the trace. Route the delta through the plan method + inline gate — that's the amendment loop ([reference/plan-amendments.md](reference/plan-amendments.md)), not a detour. Scope changes stop-and-ask. |

## Red flags (stop and fix)

- The conductor edited product code itself instead of dispatching a subagent.
- A commit with a red or unrun green bar (tests, lint, or format-check failing or never run), or
  more than one task in a single commit.
- A commit that is green against the working tree but not in isolation — a needed file left unstaged
  (the green bar ran; the `git add` did not).
- An implementer that wrote code before a failing test, or whose brief carried the whole plan.
- A reviewer prompt told what *not* to flag (pre-judging disqualifies the review).
- A task marked done with no commit SHA, or work re-run because the ledger was not consulted.
- Building past a blocked task instead of stopping to ask.
- An ingested/external plan built without an inline gate verdict, or with fabricated `AC-N` trace
  links instead of an honest `untraced` mark.
- A task marked done with no captured green-bar evidence block.
- A green-bar evidence block that is a transcribed subagent summary or a bare `# pass N` count
  rather than the conductor's own captured per-test run.
- A green bar whose exit code was read through a pipe (`cmd | filter; $?`) — the status was the
  pipe's last stage, not the command's — or a suite verdict scraped from a human summary instead of a
  machine-readable reporter, or a reporter discrepancy explained away as flake rather than
  investigated via the machine one, or a captured evidence block that doesn't note the verification
  form (the command, its directly-read exit code, the reporter counts).
- Proceeded to the next task at resume, or to ship at build-complete, while `sdlc-check` failed with
  no recorded override.
- The checker silently skipped when `node` was absent, instead of an announced degraded fallback.
- The baseline halted on a greenfield absence instead of recording vacuous green.
- A baseline halt blamed on "red code" when the declared command was actually unrunnable — the
  declaration was never checked.
- An agent-type substitution discovered per-dispatch instead of pinned + announced at build start.
- A dead subagent's work silently conductor-completed with no retry and no ledger record.
- A plan/reality mismatch silently adapted in code instead of amended through the plan method +
  inline gate (or a scope change amended in-loop instead of stopped-and-asked).

## Done when

- Every `T-N` is implemented test-first, reviewed, and committed atomically, the green bar green
  (tests, lint, format-check) between each, and each commit verified to compile in isolation.
- `build-report.md` records every task done with its SHA and `AC-N`; no task left in-progress. Any
  agent-type roster substitution and any subagent-death deviation (task, what died, what was
  recovered, whether isolation held) is recorded there too.
- Every done task carries a captured green-bar evidence block in `build-report.md`, present from the
  first task onward — the **conductor's own captured green-bar run** (per-test listing, bounded),
  not a transcribed subagent report.
- The checker corroborated at resume (if resuming) and at build-complete — or, for either point that
  lacked a runtime, an announced degraded fallback is recorded in its place. A failed checker run
  either blocked the loop or was overridden with the override recorded.
- The branch is green end to end.
- Linear issues are transitioned to Done where sync is enabled (or skipped cleanly where it is not).
- The hand-off to `/agent-sdlc:ship` is stated.

## The artifact (output)

- Product code on a feature branch: one atomic, reviewed, green commit per task.
- `specs/<feature>/build-report.md` — the resumable ledger: per task `T-N` its status (done /
  in-progress / blocked), commit SHA, the `AC-N` advanced, any blocker note, a captured green-bar
  evidence block (fenced command + output tail, from the first task onward), and any
  deferred-shortcut ceilings (`SHORTCUT(T-N)`) the task left in the code, plus the checker's
  resume/build-complete corroboration result (pass, stop-and-ask with any recorded override, or an
  announced degraded fallback). It also carries the build-start **agent-type roster** and any
  announced substitution, and any **subagent-death deviation** (which task, what died, what was
  recovered, whether isolation was lost, whether conductor-takeover was reached). Mirrors
  `gate-report.md`'s role — process state beside the spec, never inside it.

## Checker grammar (what `sdlc-check` parses — emit exactly this)

The resume/build-complete checker reads `build-report.md` literally. Emit these shapes or a rule
mis-fires:

- **Task ledger:** a `## Task ledger` table; columns are looked up by header **name**
  (case-insensitive) — `Task`, `Status`, `Commit`, `AC advanced`, `Notes` — not by position. A
  `done` status is what triggers the evidence and ledger-vs-git rules. The **`Commit` cell records
  the task's own commit SHA**; the first SHA-shaped token in the cell is authoritative (a trailing
  annotation like `` `4ddd29e` (+corrective `d3c4275`) `` is tolerated).
- **Green-bar evidence:** one ``### T-N (@ `SHA`)`` heading per done task, each with **at least one
  non-empty fenced code block**. A done task with no block, or an empty one, is an unbacked-claim
  finding. The block must capture the **per-test names** (e.g. `node --test`'s `ok N - <name>`
  lines), not just summary counts — ship's AC-14 matches a proof-map test identifier as a substring
  of this text.
- **Ledger-vs-git (recorded-commit model):** for each done task the recorded SHA must **exist, be
  reachable from HEAD, and its subject's scope position reference exactly that task** — so commit as
  `feat(T-N): …` (the task in the `type(scope):` parens). A commit whose scope names another task, or
  names several (`feat(T-3, T-4): …`), fails. A task mentioned only in commit *prose* (after the
  colon) is ignored — only the scope position counts.

## Conventions

- Reads the `## Plan` and `## Tech Stack` sections of `specs/<feature>/<feature>.md` (the latter for
  the green bar — the commands that define a passing build) and `gate-report.md`; references `T-N`
  and `AC-N` IDs.
- Writes only product code + `build-report.md`. Does not **author** the front-half spec sections (the
  front half owns those) — the one exception is **materializing an ingested plan** (the `## Plan`, and
  a minimal provenance-marked green bar in `## Tech Stack` when none is declared) per the ingest
  adapter, which transcribes the source, never authors criteria/design/product choices. Does not open
  the PR (ship owns that).
- Runs after a clean gate verdict; re-run is safe and resumes from the ledger. The plan may be
  materialized from an external source (Linear/doc) — build runs the gate inline when no verdict
  exists for it (see [reference/ingesting-plans.md](reference/ingesting-plans.md)).
- Invokes `sdlc-check specs/<feature>/<feature>.md --require ledger` (bare
  `node`, no install) at resume and at build-complete, mirroring gate's and ship's checker contract:
  present and clean → corroborated; present and failing (or crashing) → stop-and-ask, override
  recorded in `build-report.md`; absent → an announced degraded fallback, never a silent skip. Never
  `--require verification-report` at build — that artifact is ship's (T-12).
- Downstream consumer: `/agent-sdlc:ship` takes the green branch to a reviewed PR.
