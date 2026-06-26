# Reviewers & scanners

The two ways findings enter the pool: untrusted **model reviewers** (`runner.ts`) and the trusted
**deterministic scan tier** (`scan.ts`). Both spawn subprocesses through one hardened core
(`proc.ts`).

## Model reviewers (`src/runner.ts`)

Three backends give four distinct model lineages without changing the orchestration. Each runs the
model in an agent harness pointed at the checked-out branch (it explores the repo itself).

| Backend | Command (`buildCommand`) |
|---|---|
| `ollama` | `<launcher> launch claude --model <m> -- -p <prompt> --output-format json --allowedTools <ro> --max-turns <n>` |
| `claude` | `claude --model <m> -p <prompt> --output-format json --allowedTools <ro> --max-turns <n>` |
| `codex` | `codex exec -C <repoDir> -m <m> -c model_reasoning_effort="high" -c sandbox_mode="read-only" <prompt>` |

The read-only tool surface (`DEFAULT_ALLOWED_TOOLS`) is `Read, Grep, Glob`, and `Bash(git diff:*)`,
`Bash(git show:*)`, `Bash(git log:*)`, `Bash(git status:*)`, `Bash(git ls-files:*)` — inspect, never
mutate. The `--` after `ollama launch claude` separates the launcher's flags from claude's.

### Output collection & salvage

`ollama`/`claude` return a JSON envelope — `parseClaudeResult` reads the final assistant text from
`.result` (and treats `is_error` as a failed run). `codex` prints a trace — `parseCodexFinal` takes
the last block after a line that is exactly `codex`, up to the `tokens used` footer.

`parseFindings` then recovers the findings array, tolerant of reasoning-heavy models that narrate
around it:

1. **Whole-message parse is authoritative** — a genuinely empty `[]` is a real "no findings" clean
   vote; an array whose elements all fail validation is *garbage*, not a clean vote, and falls through.
2. **Union of valid findings across ALL ```json fences** — never just one. Picking a single fence is
   gameable both ways (an example/empty fence could mask the answer; a trailing decoy could mask a
   real critical), so a real finding in *any* fence survives, and a forged one only over-surfaces
   (the agent adjudicates it against the code → fails safe).
3. **First-`[`…last-`]` slice** as a last resort (only if it validates to ≥1 finding).
4. Otherwise **null** — a surfaced non-vote, never a forged clean pass.

`validateRows` drops malformed rows (must be an object with a known severity + string `title`/`file`)
and **always forces `source: "model"`** (a model can't forge a non-dismissible `tool` fact).
`isAffirmativelyEmpty` recognizes an unambiguous whole-message "no issues" prose reply (an *exact*
whitelist, not a fuzzy regex) as a clean `[]` — so a clean reviewer isn't miscounted as a failed one,
while anything carrying extra substance stays a surfaced non-vote.

`runReview` returns `{ output: null, warning }` on any failure, so a dead or flaky model never throws
the whole gate down — it just thins the panel (surfaced).

### Cost & hang guards

Each `run` is a full agent loop (many model requests), so it's bounded:

- **`REVIEW_GATE_MAX_TURNS`** (default 25) caps the Claude-harness loop so a non-converging model
  can't spin a runaway request loop.
- **`REVIEW_GATE_TIMEOUT_MS`** (default 10 min) is a hard wall-clock deadline; on a hit the run is
  killed (process-group) and force-settled even if a grandchild orphaned the pipe.
- **`REVIEW_GATE_MAX_OUTPUT_BYTES`** (default 64 MiB, `byteCap: "abort"`) — an over-cap reply is a hard
  failure, not silently truncated and parsed.

These came from a real incident (PR #4 dogfood: ~245 requests over a 38-minute hang on GPU-time
billing).

## Deterministic scan tier (`src/scan.ts`)

`runScan` diffs `baseRef...HEAD` (pinning both ends to SHAs so the patch and file list describe the
same tree), parses the changeset, and runs the scanners — emitting one `ReviewerOutput`
(`reviewer: "tools"`, `model: "deterministic"`).

| Scanner | Detects | Tool |
|---|---|---|
| `git-hygiene` (always; pure) | merge-conflict markers (`critical`), `debugger` in JS/TS (`medium`), committed `node_modules` / `.env` (`high`), focused tests (`.only`/`fit`/`fdescribe`, `low` advisory) | none |
| `secrets` | committed secrets, scoped to changed files (`critical`); flags changes to gitleaks policy files (`high`) | `gitleaks` |
| `deps` | known-vulnerable dependencies in changed manifests (`high`); flags changes to osv policy files (`high`) | `osv-scanner` |

`DEFAULT_SCANNERS` is just `git-hygiene` (pure, safe for tests/libraries); the CLI uses `ALL_SCANNERS`
(adds `secrets` + `deps`). An adapter whose tool is **absent** skips with a warning; one that is
**present but fails** (timeout/cap/unparseable/bad exit) **fails closed** with a blocking finding.
`runScan` itself fails closed on an unsafe `baseRef` or any error. The trust rationale is in
[trust-boundary.md](trust-boundary.md).

## The bounded-subprocess core (`src/proc.ts`)

Both the runner and the scan tier spawn through one `spawnBounded`, so the hardening is uniform:

- **Force-settle** — never wait on `'close'`; resolve/kill on the deadline so an orphaned grandchild
  holding the pipe can't keep the host alive (the PR #4/#5 fix).
- **Process-group kill** — `detached` runs (the runner's agent sub-processes) are killed by group;
  git/scanner runs stay non-detached (reaped by Ctrl-C).
- **stdio teardown + unref**, a **byte cap** (`"abort"` → hard fail, `"truncate"` → keep partial +
  flag so the caller fails closed), **settle-once**, and an external **abort** routed through the same
  SIGTERM→SIGKILL escalation as the deadline.

`envNum` (also here) parses an env override but ignores a non-positive/NaN value, so a bad override
can't disable a cap.
