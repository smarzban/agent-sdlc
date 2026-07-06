# The light tier

The full chain is right for a feature and heavy for a 30-line fix. The **light tier** compresses
the authoring for small, self-contained work: brief + acceptance criteria + plan folded into one
short pass in the same sectioned spec file. It compresses **how much you author, never what gets
verified** — same gate, same test-first build, same [`sdlc-check`](sdlc-check.md). The full
contract is [`skills/getting-started/reference/light-tier.md`](../../skills/getting-started/reference/light-tier.md).

## When it applies

Small **and** self-contained — all four must hold:

- **Size** — a bug fix, a small addition; on the order of tens of lines across one or a few files.
- **No new dependency** — nothing added to the dependency manifest.
- **No new component** — it fits an existing component.
- **No cross-cutting impact** — no shared contract, data shape, or invariant changes.

Any one failing → the full chain. When unsure, take the full chain — it is never wrong, only
sometimes heavier than needed.

## The compressed pass

One authoring pass writes three sections into the normal `docs/specs/<feature>/<feature>.md`
(root `specs/` in a repo that already uses it — the back-compat rule):

- `## Brief` — one paragraph: problem + scope.
- `## Acceptance Criteria` — a handful of `AC-N`, same grammar and same verification types as the
  full tier. Compressed in count, not rigor.
- `## Plan` — a short set of `T-N` with the same trace fields, each naming its files and its
  failing test.

`## Design` and `## Tech Stack` are written only when an **escalation trigger** fires — a new
dependency, a new component, or a cross-cutting change. Absent triggers, their absence is
by-design, and the checker accepts the spec as-is.

## Mid-flight upgrade

If a trigger fires mid-build or the change turns out bigger than judged, the missing sections are
authored through the normal materialize path (see [start anywhere](start-anywhere.md)) into the
same spec file. The upgrade is always available; when unsure, upgrade.

Then run `gate` → `build` as usual.
