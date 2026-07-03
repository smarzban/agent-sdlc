# Build report — enforcement-spine

**STATUS: BUILD COMPLETE — branch green, ready for `/agent-sdlc:ship`.** All 12 tasks (T-1..T-12)
implemented test-first, reviewed, and committed atomically; the green bar (`node --check` +
`node --test`, 124/124) is green between every task and each commit was verified in isolation
(staged-snapshot). One overseer-confirmed corrective (`d3c4275`, T-6 scope-position matching from a
dogfood false-positive). Build-complete corroboration: `node agent-sdlc/checker/sdlc-check.mjs
specs/enforcement-spine/enforcement-spine.md --require ledger` → **all checks passed, 0 findings,
exit 0** (the checker passes on its own repo). Per operator instruction: NOT pushed, ship NOT run.

Ledger for the build of `specs/enforcement-spine/enforcement-spine.md` `## Plan` (gate verdict:
READY TO BUILD — clean, re-run 2, 2026-07-02). Branch: `feat/enforcement-spine`. Baseline green
bar: **vacuously green** (`agent-sdlc/checker/` absent pre-T-1, per plan Notes); binding from T-1.
Node v22.23.1 (floor ≥ 22 satisfied). Linear sync: disabled (no `.agent-sdlc/config.json`) — skipped.

Green bar (declared in `## Tech Stack`):

```
node --check agent-sdlc/checker/sdlc-check.mjs
node --test agent-sdlc/checker/
```

Green-bar evidence blocks are captured per task from T-1 onward (plan Notes; format per
`## Design` / ADR-0001: fenced command + output tail).

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `823bc91` | AC-8, AC-10 | 1 fix round: portable main guard (`import.meta.main` is ≥ 22.18-only → fail-open on floor). Re-review clean. |
| T-2 | done | `0f5381e` | AC-10 (grounds AC-1/2/3) | 1 fix round: parser grammar (slash-form citation expansion + `\b` boundary killing NC→C leak; name-resolution scoped to component/map-row). Re-review clean, over-capture probes clean. Model shape: `{ok, sections, ids, components, traces}` / `{ok:false, error:{file,problem}}`. |
| T-3 | done | `2715ba2` | grounds AC-3/5/6/13/14 | No fix round (review PASS, 3 Minors only). Adds `parseSpec.provenance`/`.untraced`, `parseLedger` (`tasks`/`evidence` with raw `text` = AC-14 search target), `parseVerificationReport` (`rows{criterion,type,proof}`). Malformed provenance = model fact, not parse failure. See Minor notes below. |
| T-4 | done | `cecc4d4` | AC-1, AC-2, AC-3 | 1 fix round: **Critical** coverage-rule asymmetry (see design note above) resolved via shared `buildTaskAcLinks` relation consumed by both rules; overseer-confirmed (a) + refinement. Re-review RESOLVED (refactor strictly tighter — subset relation, no false negative). Finding shape `{type:'finding'|'note', rule, message, ids}`; rules `trace-integrity`/`coverage-forward`/`coverage-backward`. Real spec → 0 findings. |
| T-5 | done | `b55dcf8` | AC-5, AC-6 | 2 fix rounds: (1) 5 review Minors — closed the whitespace-only evidence **fail-open** (`text.trim()===''`) + 2 guard tests; (2) **isolation check caught** the real-ledger test hard-depending on the untracked `build-report.md` (ENOENT in a clean checkout) → all 3 real-artifact tests now `existsSync`+`t.skip()` guarded (auto-scoping). Rules `provenance-marker` (AC-6, names bad field) + `green-bar-evidence` (AC-5: a `done` task needs a non-empty evidence block). Real spec+ledger → 0 findings when present. |
| T-6 | done | `4ddd29e` (+corrective `d3c4275`) | AC-4 | 1 fix round: **Important** doc-vs-behavior (comments claimed whole-message matching; code is `%s` subject-only) — resolved comment-only (subject-only is CORRECT for AC-4: whole-message would false-positive on prose cross-refs; `feat(T-N):` scope is authoritative) + revert-proven guard test (fails under `%B`) + NC-4 citation minor. Security clean (execFile argv/no-shell, `-C` no option-injection, read-only git, no network, NUL framing). `readRepoFacts` (typed failure on non-repo/git-absent), `checkLedgerVsGit` (exactly-one-commit-per-done-task, exhaustive). |
| T-7 | done | `f1f34ac` | AC-13, AC-14 | 1 test-hardening round (review PASS, 4 Minors, code correct): added AC-13 exhaustiveness lock (revert-proven vs `break`), whitespace-proof assertion, unrecognized-type pin. `proof-map-completeness` (AC-13, defined-AC universe, NCs out-of-scope per grammar+spec naming) + `proof-evidence-linkage` (AC-14, ADR-0001 substring name-appearance over union of evidence text; reviewer-checked rows exempt). Minors #1/#4 → ceilings below. |
| T-8 | done | `9ec50be` | AC-8, AC-9 | 1 fix round: review PASS + 3 Minors, took the fail-open (Minor #1) — reporter is the exit-owning component, so an unexpected-`type` item silently dropped+exit-0 was hardened to **fail-closed** (`filter(r => r.type !== 'note')` — anything not-a-note counts toward exit, surfaced under Findings) + honest no-throw `ids` guard + strengthened count test (write-first proven). `formatReport(results)` → `{text, exitCode}`, pure; findings/notes distinct sections. |
| T-9 | done | `7ce3313` | AC-7, AC-11, AC-12, NC-1, NC-2 | No fix round (review PASS, in-scope, no rule logic touched). Wires parser→facts→rules→reporter; `--require ledger\|verification-report`; auto-scoping; fail-closed on spec-parse / present-but-unparseable artifact (`artifact-parse`) / facts-failure (`repo-facts`) / any throw. AC-11/NC-2 via write-tree oracle; AC-12/NC-1 via import-scan + clean-env run. Corrected 1 stale T-1 placeholder test. **Dogfood surfaced a T-6 rule-precision issue** (see checkpoint / design note) — routed separately, NOT a T-9 defect. 2 latent test-rigor Minors (import-scan misses side-effect/dynamic imports; no-network is absence-evidence) → ceilings. |
| T-10 | done | `fb3cec1` | AC-15, AC-16, AC-17 | Prose edit to `gate/SKILL.md` (no test harness — verified by conformance re-read). Added check 6 (mechanical corroboration — run `sdlc-check` after the chain walk), checklist step, principles/rationalizations/red-flags, verdict gated on it. Review PASS all three ACs, no findings: fail-closed (crash = failed), no `--require` at gate (auto-scope), mirrors ship↔review-gate. Bar 124/124. |
| T-11 | done | `ff262a1` | AC-15, AC-16, AC-17 (+ AC-5/14 write side) | Prose edit to `build/SKILL.md` + `subagent-loop.md`. Landed all 4: evidence-block format (captured text, from task 1, feeds AC-5/AC-14), checker at resume + build-complete (`--require ledger`, NOT verification-report), stop-and-ask + degraded fallback, vacuous-green baseline generalized (fixes the gate-MEDIUM class). Review PASS all 5, no findings. 1 Minor (pre-existing `→` vs `->` glyph divergence, out of scope). Bar 124/124. |
| T-12 | done | `fa8e247` | AC-16, AC-18 (+ AC-13/14 wiring) | Prose edit to `ship/SKILL.md` + `finishing.md`. New step 3 "Verify criteria": build AC→proof map, write `verification-report.md`, run checker pre-PR (`--require ledger --require verification-report`), stop-and-ask + PR-body override, degraded fallback; step 5 publishes the map in the PR body. Distinct from post-PR review-gate panel. Review PASS all 3 ACs, no findings. Bar 124/124. |

## Shortcut ceilings

- **SHORTCUT(T-1) — symlink invocation no-ops (deferred Minor).** `node <symlink-to-script>`
  compares unequal in the argv[1]-vs-`import.meta.url` main guard (ESM realpath-resolves the
  module; argv[1] stays the symlink), so the CLI silently exits 0. No declared contract covers
  symlinked invocation and the stage skills invoke the real plugin path; ceiling = close with
  `realpathSync(process.argv[1])` if the invocation surface ever widens.
- **T-3 Minors (deferred, no verdict impact — reviewer-confirmed cosmetic).** (a) untraced-marker
  reason truncates on nested parens (`(a (b) c)` → `a (b`); real reasons are flat prose. (b)
  Unreachable null-owner branch in `extractUntracedMarkers` (top-bullet grammar always carries an
  ID) — slight over-build; an untraced marker on a non-`**` bullet is silently skipped. (c) Date
  capture is greedy-to-EOL, so a field appended after the date would read malformed — canonical
  marker is date-last, so no false positive on real input. Close opportunistically if T-5/T-4 touch
  these grammars.
- **SHORTCUT(T-5) — calendar-invalid but well-shaped dates pass provenance validation.**
  `ABSOLUTE_DATE_RE` is shape-only (`^\d{4}-\d{2}-\d{2}$`), so `2026-13-40` is not flagged
  `malformed`. AC-6's "absolute date" is arguably shape-satisfied; if calendar validity is wanted it
  belongs in the T-3 parser's `malformed` derivation, not the T-5 rule. Deferred (reviewer Minor #4,
  out of T-5 scope). Close in the parser if calendar validity is ever required.
- **SHORTCUT(T-7) — comma in a test identifier neuters AC-14 linkage for that row.**
  `extractTestIdentifiers` splits the proof cell on `,`; a `node:test` title containing a comma
  (legal) splits into fragments (e.g. `b`, `c`) that substring-match almost any evidence text,
  widening the false-negative surface for that row (fails loud on the first-fragment mismatch, so
  not silent-dangerous). Tied to the proof-cell FORMAT (ship/T-12 authors it) + ADR-0001, not the
  T-7 rule — deliberately NOT locked by a test. Close by pinning a comma-free identifier convention
  in the proof-map format, or a structured (non-comma) separator, if ship ever emits comma titles.
- **SHORTCUT(T-7) — duplicate proof-map rows for one criterion are masked.** `rowByCriterion` keeps
  the last row for a repeated criterion; a conflicting duplicate is silently ignored (not an AC-13
  requirement). Observation only (reviewer Minor #4); add a duplicate-row finding if the proof-map
  format ever needs it.

## Design notes (decisions taken during build)

- **T-4 — task↔criterion coverage is one shared relation (inline `*Advances:*` refs ∪
  coverage-map rows).** Review found a Critical asymmetry: forward coverage (AC-2) honored the
  Plan's *Task-to-criterion coverage map* as an authoritative link, but backward coverage (AC-3)
  discharged a task only via its own `*Advances:*` field. Tasks T-8/T-9/T-12 of this spec express
  their AC linkage *only* through the coverage map (no `*Advances:*` field), so the checker
  false-positived on its own clean, gated spec — a stop-and-ask gate blocking its own build.
  **Fork:** (a) fix the rule to treat a coverage-map row as a real AC reference (symmetric); or
  (b) rule correct-as-specified, add `*Advances:*` fields to the spec. **Ruling (overseer wR:p1,
  confirmed): (a)** — AC-2's own text ("reached by no task *in the trace*") makes the coverage map
  the plan's documented trace expression, so a map row IS a real AC reference under AC-3; (b) is
  out because a `## Plan` edit is outside build's lane AND would make the checker stricter than the
  pipeline's own convention (false-positiving on real specs). **Required refinement:** implement a
  single shared task-criterion link relation consumed by BOTH rules, not a backward-only patch, so
  the class can't recur when a third rule joins. Weakens nothing: AC-1's dangling-ref rule already
  guards bogus map rows, and fabricated-but-consistent traces are out of scope per ADR-0001.

- **T-6 corrective — scope-position task matching in ledger-vs-git (`d3c4275`).** Dogfooding the
  finished checker on its OWN repo (during T-9) surfaced a false positive: the AC-4 rule matched
  `\bT-N\b` anywhere in a commit subject, so area-scoped `docs(enforcement-spine):` commits that
  mention a task in prose (`ae48a9a`, `1e9c4d1`) were counted alongside the real `feat(T-1):`,
  flagging T-1 as "3 commits reference it". **Fix (overseer wR:p1 confirmed):** narrow
  `distinctTaskTokens` to extract `T-N` only from the conventional-commit SCOPE position
  (`type(scope):` parens) — every implementing commit carries its task there (`feat(T-N):`), while
  docs/area commits use an area scope. Landed as `fix(enforcement-spine):` (area scope) so the
  corrective doesn't self-trigger; re-review RESOLVED (header regex handles `!`/no-space/unscoped
  forms; fail-safe preserved; AC-4 guarantees intact); real-repo run now exits 0.
- **PATTERN (overseer, logged to the audit backlog).** The T-4 asymmetry and this T-6 corrective are
  the SAME root cause: an acceptance criterion's **relational term** under-specified with two
  defensible readings — T-4: AC-3 "carries a reference"; T-6: AC-4 "referencing" — where the
  mechanical rule forced the ambiguity into the open. Not a one-off; a class worth a spec-authoring
  guard (pin the relation precisely at criteria time). Overseer is tracking it as a pattern.

## Green-bar evidence

(appended per task below; command form note — the `## Tech Stack` wording
`node --test agent-sdlc/checker/` exits 1 on Node 22.23.1 (a bare directory arg is not
glob-expanded by the runner); the equivalent working form
`node --test "agent-sdlc/checker/*.test.mjs"` is what runs — discrepancy raised to the
front half as a checkpoint.)

### T-1 (@ `823bc91`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
ok 4 - existing spec path with no checks yet: exits 0 (happy-path leg not yet implemented)
# Subtest: importing the module does not execute the CLI (main-guard regression)
ok 5 - importing the module does not execute the CLI (main-guard regression)
1..5
# tests 5
# suites 0
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot re-run: --check exit 0, tests exit 0)
```
_(T-1 note superseded by ae48a9a: green bar now runs the glob form throughout.)_

### T-2 (@ `0f5381e`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
1..24
# tests 24
# suites 0
# pass 24
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot re-run: --check exit 0, tests exit 0)
```

### T-3 (@ `2715ba2`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 43
# pass 43
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot re-run: --check exit 0, tests exit 0)
```

### T-4 (@ `cecc4d4`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 59
# pass 59
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot re-run: --check exit 0, tests exit 0)
```

### T-5 (@ `b55dcf8`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 72
# pass 72
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot isolation re-run: --check exit 0; tests 71 pass + 1 skip [real-ledger test
auto-skips when build-report.md is stashed away] → exit 0)
```

### T-6 (@ `4ddd29e`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 84
# pass 84
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot isolation re-run: --check exit 0; tests 83 pass + 1 skip → exit 0)
```

### T-7 (@ `f1f34ac`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 99
# pass 99
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot isolation re-run: --check exit 0; tests 98 pass + 1 skip → exit 0)
```

### T-8 (@ `9ec50be`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 109
# pass 109
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot isolation re-run: --check exit 0; tests 108 pass + 1 skip → exit 0)
```

### T-9 (@ `7ce3313`)

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 120
# pass 120
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0; staged-snapshot isolation re-run: --check exit 0; tests 119 pass + 1 skip → exit 0)
```

### T-10 (@ `fb3cec1`)

Prose task (edit `gate/SKILL.md`) — no code change; green bar is the checker's own suite confirming
nothing regressed. (Also ran the documented command live against the real spec → exit 0.)
_This block was initially omitted; the checker's own AC-5 rule (the T-5 real-ledger self-consistency
test) caught `T-10 is marked done but has no captured green-bar evidence block` on the next bar run —
a clean dogfood of the spine on its own ledger. Process tweak: mark done + add the evidence block
together so the next bar run stays green._

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 124
# pass 124
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0)
```

### T-11 (@ `ff262a1`)

Prose task (edit `build/SKILL.md` + `subagent-loop.md`) — no code change; green bar is the checker's
own suite confirming nothing regressed.

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 124
# pass 124
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0)
```

### T-12 (@ `fa8e247`)

Prose task (edit `ship/SKILL.md` + `finishing.md`) — no code change; green bar is the checker's own
suite confirming nothing regressed.

```
$ node --check agent-sdlc/checker/sdlc-check.mjs
(exit 0)
$ node --test "agent-sdlc/checker/*.test.mjs"
# tests 124
# pass 124
# fail 0
# cancelled 0
# skipped 0
# todo 0
(exit 0)
```

**Build-complete comprehensive green-bar evidence (per-test listing).** The full `node --test`
per-test `ok N - <name>` output at build-complete, captured at the contract's granularity so the
verification report's test-backed proof rows link by name-appearance (ADR-0001 / AC-14). Re-captured
per dogfood catch #6 — the per-task blocks above recorded summary counts only, which could not
satisfy AC-14 linkage. This block is the union source AC-14 searches.

```
$ node --test "agent-sdlc/checker/*.test.mjs"
ok 1 - node --check sdlc-check.mjs passes (valid syntax)
ok 2 - no spec path: exits nonzero and names the problem
ok 3 - nonexistent spec path: exits nonzero and names the problem
ok 4 - an existing but non-spec path (no "\#\#" sections) exits nonzero, never a pass (AC-10, wired at T-9)
ok 5 - importing the module does not execute the CLI (main-guard regression)
ok 6 - readRepoFacts on a non-repo directory yields a typed failure, not a pass
ok 7 - readRepoFacts on a real repo returns the commit list (id, message)
ok 8 - a done task with no commit referencing it fails naming the task
ok 9 - a commit referencing two task IDs fails the done task(s) it names
ok 10 - exactly one commit per done task passes (no finding)
ok 11 - a non-repo directory yields a typed failure that the rule/tests assert on (not a pass)
ok 12 - T-1 does not cross-match a commit that only references T-12
ok 13 - T-12 itself is correctly matched by its own commit (not swallowed by T-1 logic)
ok 14 - checkLedgerVsGit is exhaustive: multiple offending done tasks all reported
ok 15 - a done task with more than one commit referencing only it fails (ambiguous, not exactly one)
ok 16 - a task ID mentioned only in a commit BODY (not its subject) is not a reference
ok 17 - a docs(area) commit whose SUBJECT PROSE mentions a task ID does not count as referencing it
ok 18 - revert-probe: the docs-prose case fails whole-subject matching, passes scope-position matching
ok 19 - a multi-task SCOPE still references BOTH tasks (feat(T-3, T-4): …)
ok 20 - an unscoped or area-scoped commit references no task (chore: bump / fix(area): …)
ok 21 - a task not marked done is never checked, even with zero matching commits
ok 22 - AC-7 happy path: a fully valid fixture (spec + ledger + report + matching git history) exits 0
ok 23 - AC-7 mid-chain-entry variant: well-formed provenance + untraced marker exits 0 with a coverage NOTE
ok 24 - --require verification-report with the file absent exits nonzero, naming the missing artifact
ok 25 - --require ledger with the file absent exits nonzero, naming the missing artifact
ok 26 - an unrecognized --require token is a usage error: exits nonzero, never silently ignored
ok 27 - auto-scoping: the same spec with no ledger and no report present still exits 0, no spurious findings
ok 28 - AC-11/NC-2: a full run leaves the fixture tree byte-identical (no file created/modified/deleted)
ok 29 - AC-12/NC-1(a): every import in sdlc-check.mjs is node:-prefixed stdlib only
ok 30 - AC-12/NC-1(b): the CLI completes under a minimal env (PATH only — enough to find node+git)
ok 31 - fail-closed: an unparseable spec (no "\#\#" sections) exits nonzero, never a pass (AC-10 end-to-end)
ok 32 - fail-closed: a ledger present but the run directory is not a git repo exits nonzero (facts-failure, not a silent pass)
ok 33 - missing spec content (undefined) fails cleanly, naming the file and the problem
ok 34 - null spec content fails cleanly
ok 35 - non-string spec content fails cleanly (never throws)
ok 36 - empty string spec content fails cleanly
ok 37 - whitespace-only spec content fails cleanly
ok 38 - unparseable content (no "\#\#" sections at all) fails cleanly, never an empty-model pass
ok 39 - defaults the file name in the error when none is given
ok 40 - parses "\#\#" sections in order, ignoring "\#\#\#" subheadings as separate sections
ok 41 - parses AC and T IDs wherever they are defined
ok 42 - parses component list entries under a Components subheading into synthetic C-N IDs
ok 43 - does not mistake an unrelated numbered/bold list for component definitions
ok 44 - captures a task's Advances/Component/Deps citations as trace references
ok 45 - resolves a Component citation by name to its synthetic C-N id
ok 46 - captures a coverage-map table row as a trace reference (citing site + cited IDs)
ok 47 - expands a slash-abbreviated citation run, carrying the prefix across the whole run
ok 48 - expands a multi-digit slash-abbreviated citation run
ok 49 - an out-of-scope NC-N citation does not leak its embedded C-N
ok 50 - name-resolution does not inject a false C-ref from an Advances/Deps field
ok 51 - a table whose second column is not component/advancement is not read as a trace map
ok 52 - parses a well-formed provenance marker into source + date, on its section
ok 53 - a provenance marker missing the source identifier parses as present-but-malformed, not a parse failure
ok 54 - a provenance marker missing an absolute date parses as present-but-malformed
ok 55 - a provenance marker with a non-absolute date (e.g. "recently") is malformed
ok 56 - a hand-authored section (no leading HTML comment) carries no provenance marker
ok 57 - parses an explicit untraced marker with its reason, attributed to the owning task
ok 58 - an untraced marker with no parenthetical reason still parses (empty reason, not dropped)
ok 59 - a task with a real AC reference carries no untraced marker
ok 60 - missing ledger content fails cleanly, naming the file and the problem
ok 61 - unparseable ledger content (no task table, no evidence headings) fails cleanly
ok 62 - parses the task ledger table into status/commit/AC-advanced rows
ok 63 - parses a fenced green-bar evidence block under a "\#\#\# T-N (@ SHA)" heading
ok 64 - a ledger heading with no fenced block at all is a present-claim with empty evidence (a bare claim), not dropped
ok 65 - parses real-shaped multi-task ledger evidence (grounded in the actual build-report.md shape)
ok 66 - missing verification-report content fails cleanly
ok 67 - unparseable verification-report content (no proof-map table) fails cleanly
ok 68 - parses a test-backed proof-map row with its named test identifier
ok 69 - parses a reviewer-checked proof-map row with its answered pass/fail question
ok 70 - a proof-map row with an empty proof cell still parses (empty proof, for T-13's rule to flag)
ok 71 - three distinct findings: all three appear in the text, exit code nonzero (AC-9 + AC-8)
ok 72 - empty results list: exit code 0 and a clean pass line (AC-8 pass side)
ok 73 - only notes, no findings: exit code 0 (notes never fail) and notes rendered distinctly
ok 74 - mixed findings and notes: nonzero exit, both rendered in visually distinct sections
ok 75 - exhaustiveness: many findings are all present, never truncated
ok 76 - exit code is exactly 0 or nonzero — a finding present derives nonzero, never 0
ok 77 - summary line reports counts (asserts the literal section headers, not incidental digits)
ok 78 - unexpected type: rendered (not silently dropped) AND forces a nonzero exit (fail-closed, review Minor \#1)
ok 79 - well-typed items are unaffected by the fail-closed change: a real note still yields exit 0
ok 80 - missing ids: formatReport does not throw and still renders (honest no-error-path, review Minor \#2)
ok 81 - a dangling trace reference yields a finding naming the missing ID
ok 82 - trace integrity returns ALL dangling refs, not just the first
ok 83 - a dangling ref inside a coverage-map row is also flagged (rule is generic over trace kinds)
ok 84 - a fully-resolved trace set yields no trace-integrity findings
ok 85 - an AC reached by no task yields a finding naming it
ok 86 - a coverage-map row (Advanced by tasks) counts as reaching an AC, same as an Advances field
ok 87 - a Criterion-to-component map row does NOT count as task coverage (component refs, not task refs)
ok 88 - every AC reached: no forward-coverage findings
ok 89 - a task with an explicit untraced marker yields a coverage note, not a finding
ok 90 - a task with neither an AC reference nor an untraced marker yields a finding naming it
ok 91 - citing only a DANGLING AC does not satisfy backward coverage (still a finding, not silently OK)
ok 92 - a task with a real AC reference: no backward-coverage finding or note
ok 93 - a task reached ONLY via a Task-to-criterion coverage-map row passes backward coverage (no finding, no note)
ok 94 - a map-only-linked task still needs the AC side to be a real, defined AC (dangling AC in the map does not discharge it)
ok 95 - a fully clean model yields no findings from any of the three rules (only a marker-driven note, if any)
ok 96 - the real enforcement-spine spec yields zero findings from all three rules (this feature would not block its own build)
ok 97 - a provenance marker missing its source yields a finding naming the section
ok 98 - a provenance marker missing its date yields a finding naming the section
ok 99 - a well-formed provenance marker yields no finding
ok 100 - a provenance marker with source and date present but date not absolute yields a finding naming the date as non-absolute
ok 101 - a section with no provenance marker at all yields no finding (hand-authored, no marker attempt)
ok 102 - a done task with no evidence entry at all yields a finding naming it
ok 103 - a done task with an evidence heading but no fenced block yields a finding naming it
ok 104 - a done task with a non-empty evidence block yields no finding
ok 105 - a pending task with no evidence yields no finding (no claim yet)
ok 106 - a done task with a whitespace-only fenced evidence block yields a finding naming it (fail-open guard)
ok 107 - a done task with an empty fenced evidence block (blocks:[""]) yields a finding naming it
ok 108 - the real enforcement-spine spec yields zero provenance-marker findings (no markers present)
ok 109 - the real enforcement-spine ledger yields zero green-bar-evidence findings (T-1..T-4 done, each with captured evidence)
ok 110 - a defined AC with no row at all in the proof map yields a finding naming it
ok 111 - a proof-map row with an EMPTY proof cell yields a finding naming the criterion
ok 112 - a reviewer-checked row with a recorded answer counts as present for AC-13 (no completeness finding)
ok 113 - every defined AC covered by a non-empty row: no proof-map-completeness findings
ok 114 - NC coverage decision: an NC criterion mentioned only in spec prose is OUT of proof-map-completeness scope (parseSpec never defines an NC id, so none is expected)
ok 115 - a test-backed row whose named test is ABSENT from the captured evidence yields a finding naming the row
ok 116 - a test-backed row whose named test IS present (name-appearance) in the captured evidence yields no finding
ok 117 - a reviewer-checked row with a recorded answer is NOT subject to name-appearance linkage (no AC-14 finding even though nothing resembling it appears in evidence)
ok 118 - name-appearance is searched across the UNION of all evidence entries, not just one task heading
ok 119 - a proof cell naming SEVERAL test identifiers (comma-separated) requires each to appear; only the missing one is named
ok 120 - an empty proof cell on a test-backed row yields no AC-14 finding (AC-13 already covers the empty-proof case)
ok 121 - a verification report missing rows for TWO distinct defined ACs: the findings name BOTH criteria (exhaustiveness lock)
ok 122 - a whitespace-only proof cell (parser-trimmed to empty) on a test-backed row yields a proof-map-completeness finding naming the criterion
ok 123 - a row with a blank/unrecognized type cell is NOT subject to AC-14 linkage, but AC-13 still counts it present given a non-empty proof (current behavior, pinned)
ok 124 - a complete, fully-linked proof map covering every defined AC yields no findings from either rule
# tests 124
# pass 124
# fail 0
(exit 0)
```
