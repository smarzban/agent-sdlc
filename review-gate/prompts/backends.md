# Model roster — the backends & models reviewers run on

The single source of truth for **which models to run and how each backend behaves**. Both skills read
this (`review-gate prompt backends`) instead of carrying their own copy — the gate runs the panel on a
PR, the audit runs it on the whole repo, but the lineage table is the same.

## 4 lineages via 3 backends
| backend | model | lineage |
|---|---|---|
| `ollama` | `kimi-k2.7-code:cloud` | open (Moonshot) |
| `ollama` | `glm-5.2:cloud` | open (Z.ai) — leads SWE-bench Pro; lighter Ollama tier ("high") |
| `claude` | `claude-opus-4-8` | closed (Anthropic) — append a `Think hard` line for high thinking |
| `codex`  | `gpt-5.5` | closed (OpenAI) — high reasoning effort (set by the runner) |

## How each backend runs
- `ollama` / `claude` run **Claude Code's agent loop** and return a clean JSON envelope (`result`).
- `codex` runs **`codex exec`** (the spine parses its final message). Reasoning effort is set high by
  the runner; you don't pass it.
- For the `claude` / opus reviewer, append a `Think hard about lifecycle/edge cases.` line to the
  prompt (it has no effort flag — thinking is steered by the prompt).
- **Output salvage:** reasoning-heavy models (opus, glm) often narrate around the JSON; the runner
  salvages a findings array from fenced blocks. A reply with **no array at all** stays a surfaced
  non-vote (never a forged clean pass) — so a model that pure-proses is lost coverage, not a silent OK.

## Choosing how many
- **Diversity → recall.** Independent diverse shots are what surface flaky/cross-cutting findings; one
  model alone under-recalls. Prefer breadth across lineages over depth on one.
- **Per-PR gate:** run the holistic pass on **all four** (cost is per-PR and bounded); drop/keep models
  per cost — the gate degrades gracefully if one backend is unavailable.
- **Whole-repo audit:** run each pass across **2–3 diverse** models (cost tolerance is higher since it
  runs rarely; more diversity → better recall on cross-cutting issues). Pick across lineages, not 2–3
  of the same.
- **Availability:** a backend may be absent (`command -v ollama|claude|codex`). Use what's installed
  and say which models actually ran.
