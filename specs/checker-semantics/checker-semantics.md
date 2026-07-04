# checker-semantics — structured external components + AC-4 recorded-commit verification

## Brief

<!-- source: Linear SMA-419, SMA-420 · ingested 2026-07-04 -->

Two `sdlc-check` **contract/semantics** changes filed as follow-ups from agent-sdlc v0.7.0. Unlike the
correctness fixes (PR #2 / feat/checker-correctness, this branch's base), these change what the
checker *recognizes* and *how a rule decides*, so they carry spec-format and criterion amendments —
each design decision is flagged below and in the PR body for maintainer ratification.

### SMA-419 — structured recognition of "outside the checker" components (drop the string allowlist)

The v0.7.0 H1 dangling-component fix needed a narrow string allowlist
(`isNonDanglingComponentValue` → `/\bskill texts?\b/`) so that legitimate components declared in the
Design's "Outside the checker (changed components)" **prose** — the `gate`/`build`/`ship` skill texts,
which are not in the numbered `### Components` list `extractComponents` parses — don't false-positive
as dangling. The allowlist is fail-safe but bakes an agent-sdlc spec convention into the checker as a
string. **Fix:** give the spec a *structured* way to declare "outside the checker" components so
`extractComponents` recognizes them as real components, then drop the string allowlist.

### SMA-420 — AC-4 verifies the ledger's recorded commit (amendment + option-(b))

v0.7.0's ledger↔git rule (AC-4) matched a done task by re-deriving matches from a git-history walk,
bounded to a `merge-base..HEAD` rev-range (the M-968 fix) to dodge the cross-feature `T-N` collision.
Re-deriving from history is inherently fragile and branch-position-dependent. **Fix (option-(b)):**
the build ledger already records each task's commit SHA (`t.commit`); verify **that exact recorded
commit's** subject references the task, instead of walking history. Immune to `T-N` reuse and
independent of branch position. This changes AC-4's verification model, so it **requires an AC-4
amendment** (a front-half spec change).

Scope is exactly these two issues. Backward-compat with the already-merged enforcement-spine spec is a
first-class concern: that spec is migrated to the new structured format (SMA-419) and its AC-4 text is
amended (SMA-420), so it stays checker-clean.

## Acceptance Criteria

<!-- source: Linear SMA-419, SMA-420 · ingested 2026-07-04 -->

- **AC-1** — The spec grammar provides a **structured** declaration of "outside the checker"
  components: a recognized Design subheading (matched case-insensitively on "outside the checker")
  whose numbered `N. **Name** — …` entries `extractComponents` parses as real components, resolvable
  by name exactly like the numbered `### Components` list. *(Testable: a spec with such a subheading →
  a Component-field or map-row citing one of its names resolves, no dangling finding.)*
- **AC-2** — External components get ids in a namespace **distinct from** the numbered `C-N` ids, so
  an external list restarting at `1.` never collides with an inside `C-1`. *(Testable: a spec with
  both lists → the external components carry non-`C-N` ids and both resolve independently.)*
- **AC-3** — The `/\bskill texts?\b/` string allowlist is **removed** from
  `isNonDanglingComponentValue` (the `none` null-marker branch stays); after removal, a component
  cited only by the old prose convention (no structured declaration) is flagged dangling. *(Testable:
  a Component field citing "gate skill text" with no structured declaration → a dangling finding;
  a Component field of `none` → still non-dangling.)*
- **AC-4** — The already-merged **enforcement-spine spec is migrated** to the structured format (its
  "Outside the checker" prose becomes the structured subheading; its AC→Component map cells cite the
  declared names) so `sdlc-check` reports **no dangling-component finding** on it. *(Testable/checked:
  a real-repo run over `specs/enforcement-spine/` yields zero `trace-integrity` dangling-component
  findings.)*
- **AC-5** — The ledger↔git rule verifies each done task's **ledger-recorded** commit: the recorded
  SHA must exist in the repo and its subject's scope position must reference **exactly** that task
  (the `distinctTaskTokens` relation). A done task whose recorded commit is missing, unresolvable, or
  whose subject does not reference exactly that task → a finding naming the task. *(Testable: fixture
  ledgers + a temp repo — recorded SHA with a matching `feat(T-N):` subject passes; a wrong/multi-task
  subject or a non-existent SHA fails.)*
- **AC-6** — A done task with **no recorded commit SHA** in the ledger is a finding (the ledger is the
  authoritative link; there is no history-walk fallback). *(Testable: a ledger row marked done with an
  empty commit cell → a finding naming the task.)*
- **AC-7** — The now-obsolete history-walk machinery (`readRepoFacts`, `computeRevRange`,
  `resolveDefaultBranch` and the rev-range scoping that existed only to bound the AC-4 history walk)
  is **removed**; the shared `distinctTaskTokens` relation is retained and applied to the recorded
  commit's subject. *(Reviewer-checkable: the dead code is gone, no rule still walks history for AC-4;
  the suite has no orphaned references.)*
- **AC-8** — The enforcement-spine spec's **AC-4 text is amended** to the recorded-commit model
  (dropping the "git history contains exactly one commit" wording), with the relation pinned. *(Testable/checked:
  the amended AC-4 text is present; `sdlc-check` on `specs/enforcement-spine/` passes its ledger↔git
  rule via the recorded SHAs.)*
- **AC-9** — No verdict change on well-formed input for the parts not touched: the full existing
  checker suite (minus the deliberately-removed history-walk tests, plus the new tests) stays green,
  and `sdlc-check` exits 0 on **this feature's own spec**. *(Testable: suite passes; spec run exits 0.
  Reviewer-checkable: no unrelated rule's happy-path verdict moved.)*

## Design

<!-- source: derived from the Acceptance Criteria + sdlc-check source (in-place semantics change) · ingested 2026-07-04 -->

One existing component is modified in place; a second (the enforcement-spine reference spec) is
migrated to the new grammar. No new product or dependency (least-code; NC-1/NC-3 hold).

### Components

1. **sdlc-check** — the enforcement-spine checker (`agent-sdlc/checker/sdlc-check.mjs`). Four function
   areas change: `extractComponents` (recognize a structured "outside the checker" list, assign
   `C-ext-N` ids — AC-1/AC-2); `isNonDanglingComponentValue` (drop the skill-text branch, keep `none`
   — AC-3); the ledger↔git rule (`checkLedgerVsGit` rewritten to verify the recorded `t.commit` via a
   new read-only per-SHA subject reader, and the history-walk trio `readRepoFacts`/`computeRevRange`/
   `resolveDefaultBranch` removed — AC-5/AC-6/AC-7); `distinctTaskTokens` retained as the shared
   "references exactly that task" relation. Tests in `agent-sdlc/checker/*.test.mjs` updated (git-walk
   tests removed, recorded-commit tests added).
2. **enforcement-spine spec** — `specs/enforcement-spine/enforcement-spine.md`, the already-merged
   reference artifact this feature migrates: its "Outside the checker" prose becomes the new
   structured subheading, its AC→Component map cells cite the declared component names, and its AC-4
   text is amended to the recorded-commit model. No behavioural code lives here; it is the reference
   the grammar/criterion change must keep checker-clean.

Note: the new structured "outside the checker" format SMA-419 introduces (a subheading matched on
"outside the checker", carrying a numbered bold-lead list) is what the migrated enforcement-spine spec
above will use; this spec declares its own two components in the ordinary numbered list to stay
parseable by the current checker during the gate.

### Design decisions (flagged for maintainer ratification)

- **D1 — external-component id namespace `C-ext-N`.** External components get ids `C-ext-1`, `C-ext-2`,
  … (their ordinal within the external list) rather than continuing the numbered `C-N` sequence, so an
  external list that restarts at `1.` cannot collide with an inside `C-1`. They are added to the
  model's `ids`/`components`/name-index so name-resolution and trace-integrity treat them as real.
- **D2 — heading recognition.** The external list is recognized by a `###` subheading matching
  `/outside the checker/i` (tolerant of a trailing parenthetical, e.g. "(changed components)"). This
  replaces one baked *value* string (`skill texts`) with one structural *heading* convention — a
  declaration the author writes deliberately, not a value the checker pattern-matches.
- **D3 — no history-walk fallback for AC-4.** A done task with no recorded commit SHA is a finding, not
  a fall-back to history matching. The ledger is the authoritative link; keeping a history fallback
  would re-introduce the fragility option-(b) exists to remove.
- **D4 — remove the rev-range machinery.** `readRepoFacts`/`computeRevRange`/`resolveDefaultBranch`
  existed only to bound the AC-4 history walk; with the walk gone they are dead and are removed
  (least-code). The new per-SHA subject reader is read-only (`git show -s --format=%s <sha>`; NC-1).
- **D5 — branch-independence is a bonus, not a goal.** Because option-(b) looks up specific recorded
  SHAs, `sdlc-check` on `specs/enforcement-spine/` now passes ledger↔git from any branch whose history
  contains those commits — resolving the "enforcement-spine exits 1 on a feature branch" artifact PR
  #2 documented (that note becomes obsolete once this lands).

## Tech Stack

<!-- source: inherited from the enforcement-spine feature (no new products) · ingested 2026-07-04 -->

Inherited unchanged: **Node ≥22 (ESM)**, standard-library only; tests in **`node:test`** +
`node:assert/strict`. The new subject reader uses the same `node:child_process` `execFile` (argv, no
shell) already used for git, read-only. No new dependency.

## Plan

<!-- source: derived from the Acceptance Criteria + sdlc-check source · ingested 2026-07-04 -->

Four atomic tasks, test-first against the **sdlc-check** component (T-2/T-4 migrate the
**enforcement-spine spec** external component, verified by a real-repo checker run).

- **T-1 — Structured external-component recognition + drop the allowlist (SMA-419).** Teach
  `extractComponents` to recognize a `###` subheading matching `/outside the checker/i` and parse its
  numbered `N. **Name** — …` entries as external components with `C-ext-N` ids (added to
  ids/components/name-index); remove the `/\bskill texts?\b/` branch from `isNonDanglingComponentValue`
  (keep `none`). *Failing tests first:* an "outside the checker" list's component resolves by name and
  carries a `C-ext-N` id (AC-1/AC-2); a bare "gate skill text" citation with no declaration is now
  dangling, and `none` is still non-dangling (AC-3).
  *Advances:* AC-1, AC-2, AC-3, AC-9. *Component:* sdlc-check. *Files:*
  `agent-sdlc/checker/sdlc-check.mjs`, `agent-sdlc/checker/parser.test.mjs`,
  `agent-sdlc/checker/rules.test.mjs`.
- **T-2 — Migrate the enforcement-spine spec to the structured format (SMA-419).** Convert its
  "Outside the checker (changed components):" prose to a `### Outside the checker (changed components)`
  subheading declaring the `gate`/`build`/`ship` skill-text components; rewrite the AC-15–17 map cells
  to cite the three declared names so each resolves. *Green bar:* `sdlc-check` on
  `specs/enforcement-spine/` reports zero dangling-component findings (AC-4).
  *Advances:* AC-4, AC-9. *Component:* enforcement-spine spec. *Files:*
  `specs/enforcement-spine/enforcement-spine.md`.
- **T-3 — AC-4 recorded-commit verification + remove the history walk (SMA-420).** Add a read-only
  per-SHA subject reader; rewrite `checkLedgerVsGit` to verify each done task's recorded `t.commit`
  (SHA exists + its subject scope-position references exactly that task via `distinctTaskTokens`; a
  missing/empty recorded SHA is a finding); remove `readRepoFacts`/`computeRevRange`/
  `resolveDefaultBranch` and their now-dead tests. *Failing tests first:* a recorded SHA with a
  matching `feat(T-N):` subject passes; a wrong/multi-task subject, a non-existent SHA, and an empty
  commit cell each fail naming the task (AC-5/AC-6/AC-7).
  *Advances:* AC-5, AC-6, AC-7, AC-9. *Component:* sdlc-check. *Files:*
  `agent-sdlc/checker/sdlc-check.mjs`, `agent-sdlc/checker/git.test.mjs`,
  `agent-sdlc/checker/rules.test.mjs`.
- **T-4 — Amend AC-4 text in the enforcement-spine spec (SMA-420).** Reword its AC-4 to the
  recorded-commit model (drop "git history contains exactly one commit"; pin the relation: the task's
  ledger-recorded commit exists and its subject's scope position references exactly that task ID).
  *Green bar:* `sdlc-check` on `specs/enforcement-spine/` passes its ledger↔git rule via the recorded
  SHAs (AC-8).
  *Advances:* AC-8, AC-9. *Component:* enforcement-spine spec. *Files:*
  `specs/enforcement-spine/enforcement-spine.md`.

AC-9 is a cross-cutting regression guard advanced by all four tasks (each keeps the suite green and
the checker exiting 0 on this feature's own spec).
