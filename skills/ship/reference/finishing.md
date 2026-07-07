# Finishing — push, PR, and gate invocation

Mechanics for ship: the verification report + AC → proof map, synthesizing the PR from the spec, the
gate invocation contract, the portable fallback, and the worktree rule.

## Verification report + proof map (pre-PR)

Before pushing or opening the PR, ship writes `docs/specs/<feature>/verification-report.md` — a sibling of
`gate-report.md`/`build-report.md` (process state kept beside the spec, per the artifact model) — and
runs the checker against it. This is the terminal mechanical settle of "every AC met" against
captured reality, distinct from the post-PR gate panel.

- **Row grammar:** a "Criterion | Type | Proof" table, one row per `AC-N` the spec defines (the
  checker's `proof-map-completeness` rule scopes to defined ACs only — `NC-N` rows are not required):

  ```markdown
  | Criterion | Type | Proof |
  | --- | --- | --- |
  | AC-1 | test-backed | tests/foo.test.mjs > rejects a dangling ID |
  | AC-2 | reviewer-checked | Is the proof map published in the PR body? Yes — see the Verification section of the PR body. |
  ```

- **test-backed rows** name the test identifier(s) that prove the criterion (comma-separated if more
  than one). Each named identifier **must appear verbatim** in the ledger's captured green-bar
  evidence text (ADR-0001's name-appearance linkage) — the checker's `proof-evidence-linkage` rule fails, naming the row
  otherwise. Pull identifiers from `build-report.md`'s evidence blocks; never name a test that was not
  actually captured running green.
- **reviewer-checked rows** record the ANSWERED pass/fail question — the answer itself is the proof.
  The checker's `proof-map-completeness` rule only requires the `Proof` cell be non-empty; it does not, and cannot, judge
  whether the answer is correct (not mechanically decidable). Ship supplies these answers
  pre-PR from its own Spec-Conformance read of the skill/spec text, and may note where the post-PR
  review corroborates them.
- **Every defined `AC-N` needs a row.** A missing row, or a row with an empty `Proof` cell, is a
  `proof-map-completeness` finding naming the criterion.

**Run the checker pre-PR, report required:**

```bash
sdlc-check docs/specs/<feature>/<feature>.md --require ledger \
  --require verification-report
```

Sequence this **before** `gh pr create` — it is the mechanical spine gate; the post-PR
`/empanel:gate` panel (below) is the separate judgment gate. Runtime present → run,
interpret the exit code: 0 = corroborated, proceed to push/PR. Nonzero, or the checker crashing, is
itself a failed check (fail-closed) → **stop-and-ask**: do not open the PR, or if one is already open
do not treat it as shipped. Any human override to proceed past a failed check must be **recorded in
the PR body**, not merely stated — see the PR body section below. Runtime absent → write an
**announced degraded fallback** line — never a silent skip.

`sdlc-check` is the plugin's bundled launcher (agent-sdlc adds its `bin/` to PATH on install) — call it by name, never a cwd-relative `node checker/sdlc-check.mjs …` path, which does not
exist in a user's own repo and would fail-closed the whole pipeline.

**No-ledger path** (a branch built outside the pipeline — the HARD-GATE's alternate precondition):
there is no `build-report.md`, so **drop `--require ledger`** (`sdlc-check … --require
verification-report` only). Without captured green-bar evidence the name-appearance linkage (`proof-evidence-linkage`)
cannot corroborate the proof map's test-backed rows — state that explicitly in the verification report
and PR body, and rely on the direct suite verification plus the gate panel (the HARD-GATE's
sole-gate contract for this path).

**Commit the verification report before pushing.** After the checker passes, `git add
docs/specs/<feature>/verification-report.md && git commit` it — a sibling of the already-committed
`gate-report.md`/`build-report.md`, so it rides the PR branch. Skipping this leaves the report absent
from the pushed branch and the worktree dirty.

## PR body — synthesized from the spec

Build the PR title and body from `docs/specs/<feature>/<feature>.md` (and the `SHORTCUT` ceilings from
`build-report.md`), never from memory:

- **Title:** the feature name (concise), e.g. `feat: <feature>`.
- **Body:**
  - **Summary** — the `## Brief` in a sentence or two.
  - **Acceptance criteria** — the `AC-N` list (the contract this PR claims to meet).
  - **Coverage** — the task→criterion map from the `## Plan`: which `T-N` advanced which `AC-N`.
  - **Verification** — the full AC → proof map copied verbatim from
    `docs/specs/<feature>/verification-report.md` (it must appear here, not only in the spec
    tree, so it is visible whenever ship completes) plus the checker corroboration result (pass, or
    stop-and-ask with the recorded human override, or an announced degraded fallback); if a checker
    failure was overridden, state the override and its justification explicitly in this section
    (the override lives in the PR body, not just in conversation).
  - **Known compromises** — any `SHORTCUT(T-N)` ceilings recorded in `build-report.md` (the
    deferred-but-bounded simplifications the build accepted); omit the section if there are none.
  - **Provenance** — when the plan was ingested from a non-canonical source (a Linear issue set, a
    doc), name the source and carry the gate's mid-chain-entry / `untraced` note, so the reviewer sees
    what was not vetted upstream; omit when the chain ran in full from `idea`.
  - **Spec** — a link or path to `docs/specs/<feature>/<feature>.md`.
- Base branch: the project's default (e.g. `main`) unless configured otherwise.

```bash
gh pr create --base <base> --head <branch> --title "<title>" --body-file <generated-body.md>
```

Write the body to a file and pass `--body-file` — it keeps newlines and markdown intact.

## Gate invocation contract (the Empanel gate)

The gate is a **post-PR merge gate**. It checks out the PR branch in its own worktree, diffs
against the base, runs its reviewers, and returns a deterministic verdict:

- Invoke: `/empanel:gate` against the open PR.
- **Supply the spec explicitly.** The gate's reviewers explore the checked-out worktree; a spec
  that is gitignored or uncommitted is *absent* there, and the conformance (`lens-spec`) pass then
  has nothing to check and silently returns empty. Pass the feature's `## Acceptance Criteria` (and
  the design / ADRs) into the invocation so the contract review is real, not blind — never assume the
  worktree contains the spec.
- **Verdict vocabulary:** `pass` (no blocking findings) or `block` (blocking findings must be
  resolved or justified).
- **Severity:** `critical` · `high` · `medium` gate (block); `low` · `info` are advisory.
- It posts the verdict as a PR comment.

**Branch on the verdict, not on memory:** treat only an explicit `pass` as ready. On `block`, surface
the blocking findings to the user and ask before any fix-and-re-push. ship never merges — even on a
clean pass, the merge is a human's or the gate's own step.

The gate depends on Node plus the `@empanel/cli` npm package (the skills invoke it via
`npx @empanel/cli@0`, so a network-reachable npm registry or a global install suffices) and at
least one connected model provider. It runs where those are present.

## Portable fallback (the gate absent)

If the gate skill is not installed or its prerequisites are missing, do not skip the review —
dispatch a **whole-PR reviewer subagent**:

- Brief: the PR diff (base..head), the feature's `## Acceptance Criteria`, and the global
  constraints.
- It reviews across correctness, the criteria, security, and quality; returns findings by severity.
- Map its result to the same pass/block decision and report which reviewer ran. Say plainly that the
  portable path was used.

## Parking / handing off for review (the PR must show the reviewed head)

When the merge is someone else's call — an overseer's review, a maintainer's sign-off — ship *parks*
the PR for them instead of finishing. Parking is only honest if the **open PR shows the exact code
that was reviewed**: gate comments and a proof map describe a head; the reviewer must be looking at
that same head, not a stale one. So before declaring the PR parked / handed off:

- **Push first, then park.** The branch is pushed and the PR head equals the local reviewed head —
  `git rev-parse HEAD` must equal the PR's `headRefOid`
  (`gh pr view --json headRefOid -q .headRefOid`). A remote head that trails the reviewed head shows
  stale code while the gate comments describe the new one — the reviewer reads prose against a diff
  that no longer exists.
- **State the reviewed SHA in the handoff.** Name the reviewed head SHA in the parking message, so the
  recipient can confirm at a glance that the PR shows it (`headRefOid == <sha>`).
- **Re-push before every re-park.** Every post-open fix round (a blocking verdict fixed, a review
  comment addressed) ends by pushing and re-parking — the PR head is re-synced to the new reviewed
  head each time, never left behind after the first push. A gate re-run on a locally-fixed head that
  was not re-pushed parks a PR whose diff the reviewer can't see.

This is the same push-before-review discipline the normal flow already follows (the push in step 4,
before `gh pr create`); the gap it closes is the *re-park after post-open fix commits*, where it is
easy to gate a new head locally and hand it off without re-pushing.

## Worktree rule

On the PR path the workspace is **preserved** — the PR is open and may need fixes. Do not run
`git worktree remove`. Only an explicitly-created worktree that is being merged or discarded gets
cleaned up, and that is not ship's job (a later `deploy`/merge step or a human owns it).
