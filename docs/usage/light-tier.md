# The light tier

The full chain is right for a feature and heavy for a 30-line fix. The **light tier** compresses
the authoring for small, self-contained work: brief + acceptance criteria + plan folded into one
short pass in the same sectioned spec file. It compresses **how much you author, never what gets
verified** — same gate (light shape: missing Design/Tech Stack is not a gap), same test-first
build, same [`sdlc-check`](sdlc-check.md) (named existing components are `C-exist-N`). The full
contract is [`skills/getting-started/reference/light-tier.md`](../../skills/getting-started/reference/light-tier.md).

## When it applies

Small **and** self-contained — all four must hold:

- **Size** — a bug fix, a small addition; on the order of tens of lines across one or a few files.
- **No new runtime dependency.**
- **No new public API.**
- **No new trust or process boundary.**

Any one failing → the full chain. **When unsure, stay light.** Invoke `/agent-sdlc:light`.
Build then skips the per-task reviewer; `pr-review` runs Review panel.

## The compressed pass

One authoring pass writes three sections into the normal `docs/specs/<feature>/<feature>.md`
(root `specs/` in a repo that already uses it — the back-compat rule):

- `## Brief` — one paragraph: problem + scope.
- `## Acceptance Criteria` — a handful of `AC-N`, same grammar and same verification types as the
  full tier. Compressed in count, not rigor.
- `## Plan` — a short set of `T-N` with the same trace fields, each naming its files and its
  failing test.

`## Design` and `## Tech Stack` are written only when an **escalation trigger** fires — a new
runtime dependency, a new public API, or a new trust or process boundary. Absent triggers, their
absence is by-design, and the checker accepts the spec as-is.

## Mid-flight upgrade

If a trigger fires mid-build or the change turns out bigger than judged, the missing sections are
authored through the normal materialize path (see [start anywhere](start-anywhere.md)) into the
same spec file. The upgrade is always available when a trigger fires; when unsure, stay light.

Then run `gate` → `build` as usual.
