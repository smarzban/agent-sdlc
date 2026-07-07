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
`docs/specs/<feature>/<feature>.md`, or an external plan (a Linear issue set, a doc) materialized into
`## Plan` with a provenance marker first (see [reference/ingesting-plans.md](reference/ingesting-plans.md)).
If no verdict exists for that plan, **run `/agent-sdlc:gate` inline** and proceed only on a clean
verdict — never build on an unblessed chain, whatever the plan's source. Input is the `## Plan`
section (plus the sections it references) and the gate report. Output is product code on a feature branch, one atomic
commit per task, and `docs/specs/<feature>/build-report.md` (the ledger). The terminal action is a green
branch handed to `/agent-sdlc:ship`. Do NOT open the PR — that is ship's job.
</HARD-GATE>

## The loop (the conductor's whole job)

1. **Precondition** resolve the plan (input-resolution rule); if it came from an external source,
   **ingest it first** — **read [reference/ingesting-plans.md](reference/ingesting-plans.md) now,
   before materializing anything** (the provenance-marker grammar and the minimal green-bar
   materialization live only there): materialize `## Plan` +
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
     - **unrunnable command** — the declared command is malformed / bad-form: the failure is about
       the command's *form*, not the code. This is a **green-bar DECLARATION defect** — STOP, show the command's
       **actual output**, and route the fix back to **`techstack`** (the green-bar owner), not a
       misleading "the repo is red" halt. Record it in `build-report.md`.
     - **genuinely-red repo** — the command runs fine but reports real failures on existing code: the
       normal red-baseline stop (the repo isn't green) — STOP and fix the code, as today.
   A nonzero baseline exit *always* STOPS; the unrunnable-vs-red label is only a routing hint and
   never changes the stop decision.
   **Pin the agent-type roster here, once.** Resolve the implementer/reviewer/fixer agent types the
   loop will dispatch before the per-task loop begins. If a declared type is unavailable, **announce
   the substitution ONCE up front and record it in `build-report.md`** (e.g. `implementer →
   general-purpose stand-in: <reason>`) — never rediscover the degradation per dispatch. Per-dispatch
   rediscovery hides which agent actually did the work.
3. **Ledger** open `build-report.md`. If it already exists, resume from it plus `git log` — never
   re-run a task already marked done. Re-doing completed work is the most expensive failure here.
   **When resuming an existing ledger, invoke the checker first** (the resume invocation point) —
   this corroborates the work already recorded, so it runs ONLY when a `build-report.md` already
   exists; a fresh build has no ledger yet (this step CREATES it), so skip the checker here and let
   the build-complete run (step 5) be the first invocation. Command (when resuming):
   `sdlc-check docs/specs/<feature>/<feature>.md --require ledger` (never
   `--require verification-report` at build — that artifact is ship's). Runtime present → run,
   interpret the exit code: 0 = corroborated, proceed; nonzero, or the checker crashing, is itself a
   failed check (fail-closed) — **stop-and-ask**, do not resume task work; any human override must be
   recorded in `build-report.md` (who/what, why continuing despite the failed check). Runtime absent
   → write an **announced degraded fallback** line into `build-report.md` now — never a silent skip.
4. **For each task `T-N`, in dependency order** (before the first dispatch, **read
   [reference/subagent-loop.md](reference/subagent-loop.md) now** — the brief contents, the
   fix-cycle bound, the file hand-off mechanics, and the death sequence live ONLY there; a loop
   run from this body alone improvises all four):
   a. Dispatch the **implementer** subagent with a file brief for `T-N` only.
   b. Dispatch the **reviewer** subagent on the resulting diff.
   c. If the reviewer finds Critical/Important issues, dispatch a **fixer** and re-review (bounded).
   d. Verify the **green bar on the staged snapshot** — after the reviewer passes, the **conductor
      itself** stages the task's changes and runs the full declared set (compile, test, lint,
      format-check) once against exactly what will be committed: `git stash --keep-index
      --include-untracked` → bar → `git stash pop` (or commit first and run the bar on a clean
      checkout of HEAD — the robust form when a pop could conflict). One run is both the green
      verification and the in-isolation check: an under-staged commit fails here, not on checkout.
      Capture the run file-first (`cmd > out.txt 2>&1; rc=$?` — *Reading the green bar* below),
      then extract the evidence FROM the file: the command line(s), the per-test listing for the
      tests this task adds/exercises (`node --test`'s `ok N - <name>` lines), and the summary tail.
      Never stream a large suite's full output through your own context, and *never* transcribe
      the subagent's reported count — the names are what ship's `proof-evidence-linkage` rule
      matches against. **A task that adds no tests** (a prose/doc task) has no task-specific
      per-test names — its suite summary (`# pass N`, still the conductor's own run) is then the
      correct bounded form; the ONLY case where a summary alone suffices.
   e. Commit: one atomic commit for the task, reflecting the reviewed code — step 4d just proved
      the staged snapshot green.
   f. Update `build-report.md`: `T-N` done, the commit SHA, the `AC-N` it advanced, and the
      captured green-bar evidence as a fenced block beside the task — **the conductor's own
      step-4d run, never a restatement of what the subagent said** — from the first task onward,
      never deferred. This is the write side the checker's `green-bar-evidence` and
      `proof-evidence-linkage` rules read (a test-backed proof-map row's cited test identifier
      must literally appear in this text — ADR-0001). **Note the verification form** beside the
      evidence — the exact command, its directly-read exit code, and the machine-reporter counts
      (per *Reading the green bar*).
   g. If Linear sync is enabled in `.agent-sdlc/config.json`, transition `T-N`'s issue via the
      `linear-sync` skill.

   If an implementer reports a **plan/reality mismatch** (a named file/path is wrong, a symbol was
   renamed, the task must split, an assumed dependency differs), **read
   [reference/plan-amendments.md](reference/plan-amendments.md) now** (the delta-routing mechanics
   live only there) and follow the amendment loop —
   STOP the task, route the delta through the `plan` method, materialize it into `## Plan` with a
   provenance marker, run `/agent-sdlc:gate` inline on the delta, record it in `build-report.md`. Do
   **not** silently adapt and do **not** free-author the plan. Mechanical drift is amendable in-loop; a
   scope or acceptance-criteria change **stops-and-asks** the human (see the escalation boundary).

   If a dispatched subagent **dies mid-task** (session/token limit, API error, crash), follow the
   **subagent-death policy** — capture partial work → retry once with a fresh subagent → only then
   conductor-takeover, with the deviation recorded in `build-report.md`
   ([reference/subagent-loop.md](reference/subagent-loop.md)). A dead subagent is not a licence to
   silently finish the task yourself.
5. **Hand off** when every task is done and green: **invoke the checker again** (the build-complete
   invocation point) — same command as step 3 (`--require ledger`, never
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
one, because it ships. Every green-bar run in this loop — the baseline (step 2), each per-task staged-snapshot
verification (step 4d), and ship's re-verify — obeys three rules:

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
  heavy Empanel gate once, at ship. Both are real gates; neither replaces the other.
- **Evidence is the conductor's own captured run.** Each task's green-bar evidence is the
  conductor's post-review run recorded verbatim — the command plus its per-test listing (bounded)
  — never a subagent's reported count, never a summary that names no test, and never a verdict
  read through a pipe or scraped from a human summary. The full discipline is *Reading the green
  bar* above. A task marked done with no evidence block is not done.
- **Corroborate at resume and at hand-off.** The checker is a second, mechanical witness to the
  ledger/trace/commits so far — run it before continuing after a break and again before ship. A
  nonzero exit or a crash is a failed check, not noise.
- **Degrade loud, never quiet.** No `node` at either invocation point — the loop still runs, but say
  so in `build-report.md`. A silent skip reads as a clean pass it isn't.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I'll just edit this file directly, it's faster." | The conductor delegates. Direct edits skip the review gate and bloat its context. Dispatch. |
| "Write the code, add the test after." | The plan named the failing test — write it first. Tests-after answers "what does it do", not "what should it do". |
| "Give the subagent the whole plan for context." | One brief = one task. The whole plan is noise that derails an autonomous run. |
| "Skip the per-task review, the ship gate catches it." | A whole-PR gate cannot localize a per-task drift cheaply. Review early; fix while it is small. |
| "This task won't go green, I'll wire the next one and come back." | Errors compound. Stop the line: a blocked task is recorded and raised, not deferred. |
| "Trust my memory of what's done after the compaction." | Re-running a done task is the costliest failure. Read the ledger and `git log`. |
| "The plan came from Linear/a doc, it's already reviewed — skip the gate." | A source is not a verdict. Run the gate inline, then build. |
| "`sdlc-check` failed but the work looks fine, proceed anyway." | A failed checker run is a failed check — stop-and-ask; any override is recorded in the ledger. Runtime absent is an announced degraded fallback, never a silent skip. |

## Red flags (stop and fix)

- The conductor edited product code itself instead of dispatching a subagent.
- A commit with a red or unrun green bar, more than one task in a single commit, or a commit green
  against the working tree but not in isolation (a needed file left unstaged).
- An implementer that wrote code before a failing test, or whose brief carried the whole plan.
- A reviewer prompt told what *not* to flag (pre-judging disqualifies the review).
- A task marked done with no commit SHA, no captured evidence block, or an evidence block that is a
  transcribed subagent summary / bare count instead of the conductor's own per-test run.
- A green bar read through a pipe, scraped from a human summary, or a reporter discrepancy waved
  off as flake instead of investigated via the machine reporter.
- Building past a blocked task instead of stopping to ask.
- An ingested/external plan built without an inline gate verdict, or fabricated trace links instead
  of an honest `untraced` mark.
- A `## Deviations` entry with no amendment disposition — its plan text was never materialized.
- Proceeding at resume or build-complete while `sdlc-check` failed with no recorded override, or the
  checker silently skipped when the runtime was absent.
- A baseline halt misrouted: greenfield absence is vacuous green; an unrunnable declared command is
  a techstack declaration defect, not "red code".
- A roster substitution discovered per-dispatch, or a dead subagent silently conductor-completed
  with no retry and no ledger record.

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
- `docs/specs/<feature>/build-report.md`
  (root `specs/` in a repo that already uses it — the back-compat rule in getting-started) —
  the resumable ledger: per task `T-N` its status (done /
  in-progress / blocked), commit SHA, the `AC-N` advanced, any blocker note, a captured green-bar
  evidence block (fenced command + output tail, from the first task onward), and any
  deferred-shortcut ceilings (`SHORTCUT(T-N)`) the task left in the code, plus the checker's
  resume/build-complete corroboration result (pass, stop-and-ask with any recorded override, or an
  announced degraded fallback), and a `## Deviations` section indexing every in-loop
  departure from the plan's letter — each entry: the task, the divergence, and its **amendment
  disposition** (the materialized `## Plan` delta + provenance marker, or the death/takeover
  note). An entry with no disposition is silent adaptation, written down. It also carries the build-start **agent-type roster** and any
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
  lines), not just summary counts — ship's `proof-evidence-linkage` rule matches a proof-map test identifier as a substring
  of this text.
- **Ledger-vs-git (recorded-commit model):** for each done task the recorded SHA must **exist, be
  reachable from HEAD, and its subject's scope position reference exactly that task** — so commit as
  `feat(T-N): …` (the task in the `type(scope):` parens). A commit whose scope names another task, or
  names several (`feat(T-3, T-4): …`), fails. A task mentioned only in commit *prose* (after the
  colon) is ignored — only the scope position counts.

## Conventions

- Reads the `## Plan` and `## Tech Stack` sections of `docs/specs/<feature>/<feature>.md` (the latter for
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
- Invokes `sdlc-check docs/specs/<feature>/<feature>.md --require ledger` (resolve per getting-started's checker-resolution rule; degrade only when no form resolves) at resume and at build-complete, mirroring gate's and ship's checker contract:
  present and clean → corroborated; present and failing (or crashing) → stop-and-ask, override
  recorded in `build-report.md`; absent → an announced degraded fallback, never a silent skip. Never
  `--require verification-report` at build — that artifact is ship's.
- Downstream consumer: `/agent-sdlc:ship` takes the green branch to a reviewed PR.
