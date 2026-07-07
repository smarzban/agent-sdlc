# A five-minute example run

One fictional feature — `rate-limit-login` — from idea to PR, abridged. Every artifact below is
in the exact grammar the checker parses; the real thing just has more of each. A full real run
lives in [`specs/enforcement-spine/`](specs/enforcement-spine/).

## 1. The spec (`docs/specs/rate-limit-login/rate-limit-login.md`)

The front half (`idea` → `acceptance-criteria` → `architecture-design` → `techstack` → `plan`)
writes one sectioned file:

<!-- example-spec-start -->
```markdown
## Brief

Login currently accepts unlimited attempts. Add per-account rate limiting: after 5 failed
attempts within 15 minutes, reject further attempts for 15 minutes. Non-goals: IP-based
limiting, CAPTCHA.

## Acceptance Criteria

- **AC-1** After 5 failed login attempts for one account within 15 minutes, the 6th attempt is
  rejected with a 429 before credentials are checked.
  *(Verification type: **test-backed** — integration.)*
- **AC-2** A successful login resets that account's failure count to zero.
  *(Verification type: **test-backed** — unit.)*

## Design

### Components

1. **AttemptStore** — keeps per-account failure timestamps in the existing session store; prunes
   entries older than 15 minutes.
2. **LoginGuard** — consulted before credential checking; rejects with 429 when the store reports
   5+ recent failures.

| Criterion | Component |
| --- | --- |
| AC-1 | LoginGuard, AttemptStore |
| AC-2 | AttemptStore |

## Tech Stack

No new products — reuses the declared stack (green bar: `npm test`, `npm run lint`).

## Plan

- **T-1** AttemptStore: record/prune/reset failure timestamps. Files: `src/auth/attempt-store.js`,
  `tests/attempt-store.test.js`. Failing test first: `resets the count on successful login`.
  *Advances:* AC-2. *Component:* AttemptStore. *Deps:* none.
- **T-2** LoginGuard: reject the 6th attempt with 429. Files: `src/auth/login-guard.js`,
  `tests/login-guard.test.js`. Failing test first: `rejects the sixth attempt within the window`.
  *Advances:* AC-1. *Deps:* T-1. *Component:* LoginGuard.

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-2 |
| AC-2 | T-1 |
```
<!-- example-spec-end -->

## 2. The gate (read-only)

`gate` walks AC → component → product → task and runs the checker as a second witness. Verdict in
`gate-report.md`: **ready to build** (AC-1 and AC-2 both reach a component and a task; the in-stack
fast-path covers component → product).

## 3. The build (one subagent per task, one green commit each)

`build` dispatches a fresh implementer per task, reviews the diff, runs the green bar itself, and
commits. The ledger (`build-report.md`) records each task with the conductor's own captured run:

```markdown
## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `a1b2c3d` | AC-2 | |
| T-2 | done | `e4f5a6b` | AC-1 | |

### T-1 (@ `a1b2c3d`)

    $ npm test
    ok 1 - resets the count on successful login
    ok 2 - prunes entries older than 15 minutes
    # pass 2
    # fail 0
```

## 4. Ship (proof map, checker, PR, review)

`ship` re-runs the suite, writes `verification-report.md`, and the checker corroborates it pre-PR
(every cited test name must appear in the captured evidence above):

```markdown
| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | test-backed | rejects the sixth attempt within the window |
| AC-2 | test-backed | resets the count on successful login |
```

Then it pushes, opens the PR with the proof map in the body, and hands the PR to the review gate.
The finish line is a **reviewed PR** — merging is a human's call.

## Try it

Install the plugin ([quickstart](quickstart.md)) and say *"I want to add a feature: …"* — the
pipeline picks it up at `idea`. For a small fix, the [light tier](usage/light-tier.md) folds the
front half into one short pass with the same gate and checker.
