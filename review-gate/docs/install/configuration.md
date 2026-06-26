# Configuration

Everything is configured by environment variables. All are optional — the defaults are production
values. Names and defaults below are read directly from the source (`src/runner.ts`, `src/scan.ts`,
`src/consolidate.ts`).

## Backend binaries

| Variable | Default | Purpose |
|---|---|---|
| `REVIEW_GATE_LAUNCHER` | `ollama` | Launcher for the `ollama` backend (`<launcher> launch claude …`). |
| `REVIEW_GATE_CLAUDE` | `claude` | Binary for the `claude` backend. |
| `REVIEW_GATE_CODEX` | `codex` | Binary for the `codex` backend. |

## Reviewer run limits (cost & hang guards)

| Variable | Default | Purpose |
|---|---|---|
| `REVIEW_GATE_MAX_TURNS` | `25` | Hard cap on the Claude-harness agent loop (`ollama`/`claude` backends) so a non-converging model can't spin a runaway request loop. |
| `REVIEW_GATE_TIMEOUT_MS` | `600000` (10 min) | Hard wall-clock deadline per reviewer run; on a hit the run is force-settled and killed (process-group), surfaced as a failed reviewer. |
| `REVIEW_GATE_MAX_OUTPUT_BYTES` | `67108864` (64 MiB) | Output byte cap per reviewer run (`byteCap: abort` → over-cap is a hard failure, not silently truncated). |

These guard against the failure mode that motivated them: on Ollama Cloud's GPU-time billing, a
non-converging run once burned ~245 requests over a 38-minute hang. See
[../technical/reviewers-and-scanners.md](../technical/reviewers-and-scanners.md).

## Clustering

| Variable | Default | Purpose |
|---|---|---|
| `REVIEW_GATE_LINE_WINDOW` | `15` | Findings from different models on the same file within this many lines may cluster as the "same" issue. See [../technical/consolidate-and-decide.md](../technical/consolidate-and-decide.md). |

## Deterministic scan (git + external scanners)

| Variable | Default | Purpose |
|---|---|---|
| `REVIEW_GATE_GIT_TIMEOUT_MS` | `60000` (60 s) | Timeout for the `git` subprocess **and** the external scanner subprocesses (gitleaks/osv). |
| `REVIEW_GATE_GIT_MAX_BYTES` | `67108864` (64 MiB) | Output byte cap for `git` (`abort`) **and** the scanner subprocesses (`truncate` → adapter fails closed). |
| `REVIEW_GATE_GITLEAKS_CONFIG` | *(unset)* | Path to a **trusted** gitleaks config, passed as `--config`. Pin it outside the checkout so a repo-supplied `.gitleaks.toml` can't weaken scanning. |
| `REVIEW_GATE_GITLEAKS_IGNORE_PATH` | `/dev/null` | gitleaks `--gitleaks-ignore-path`. The default empty file means a committed `.gitleaksignore` can't suppress detections. |
| `REVIEW_GATE_OSV_CONFIG` | *(unset)* | Path to a **trusted** osv-scanner config, passed as `--config`. |

### Scanner-config trust

The scanners are part of the **trusted** tier, so they defend against the very repo they scan:

- **Pin a trusted config** with `REVIEW_GATE_GITLEAKS_CONFIG` / `REVIEW_GATE_OSV_CONFIG` so an
  attacker-supplied in-repo policy can't loosen the rules; gitleaks also runs with
  `--ignore-gitleaks-allow` (ignores in-source allow comments) and the `/dev/null` ignore path above.
- **A change to an in-repo scanner policy file is itself a gating finding** — modifying
  `.gitleaks.toml` / `.gitleaksignore` / `osv-scanner.toml` is treated as a privileged change.
- A scanner that is configured but **fails to complete fails closed** (emits a blocking, non-dismissible
  finding), never a silent pass.

Details: [../technical/reviewers-and-scanners.md](../technical/reviewers-and-scanners.md) and
[../technical/trust-boundary.md](../technical/trust-boundary.md).

## CI wiring (dormant)

An example required-check workflow lives at `ci/github-action.yml`. It is **dormant by design**:
GitHub automation is held until the gate has been run manually on real PRs, then in shadow mode, then
enforced. The verdict the spine emits (`block`/`pass`) is what a required check would gate on.
