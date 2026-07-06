# Light tier — the compressed authoring pass for small, self-contained changes

The full chain (`idea -> acceptance-criteria -> architecture-design -> techstack -> plan`) is right
for a feature and absurd for a 30-line change. The **light tier** is a compressed authoring pass for
small work: brief + acceptance criteria + plan folded into ONE short pass in the same sectioned spec
file, with `## Design`/`## Tech Stack` written **only** when a trigger fires. It compresses *how much
you author*, never *what the gate and build verify* — the enforcement spine is unchanged.

## When the light tier applies

A change that is **small and self-contained**:

- **Size** — a bug fix, a small addition, a targeted edit; on the order of tens of lines across one
  or a few files. If you cannot hold the whole change in your head, it is not light-tier.
- **No new dependency** — nothing added to the dependency manifest.
- **No new component** — it fits an existing component; it does not introduce a new kind of thing.
- **No cross-cutting impact** — no change to a shared contract, data shape, or invariant that ripples
  across the codebase.

Heuristic: **small + no new dependency + no new component + no cross-cutting change -> light tier.**
Any one of those failing -> full tier. When unsure, use the full tier (or upgrade mid-flight — see
below); the full chain is never wrong, only sometimes heavier than needed.

## The compressed pass

One short authoring pass writes three sections into the SAME sectioned spec file
(`docs/specs/<feature>/<feature>.md`) — just fewer and shorter sections:

- **`## Brief`** — one paragraph: the problem and the scope of the small change.
- **`## Acceptance Criteria`** — a handful of `AC-N`, SAME grammar and SAME verification types
  (test-backed / reviewer-checked) as the full tier. Compressed in count, not in rigor.
- **`## Plan`** — a short set of `T-N`, SAME grammar and SAME trace fields (`*Advances:*` an `AC-N`,
  `*Component:*` a component, `*Deps:*`), each naming its file(s) and its failing test.

`## Design` and `## Tech Stack` are written **only when a trigger fires** — a **new dependency**, a
**new component**, or a **cross-cutting change**. If none fire, there is no new product: the plan
traces `*Component:*` to an **existing** component (or `none` for a pure edit that advances a
criterion without a distinct product), and the two sections are simply absent. Their absence is
by-design for a light-tier spec, not a gap.

## Same verification, always (the load-bearing invariant)

The light tier compresses **authoring**, never **verification**. Everything downstream is byte-for-
byte the normal pipeline:

- The **`gate`** still walks the full chain (`AC-N -> C-N -> product -> T-N`) and flags any orphan,
  gap, or unresolved placeholder before build.
- **`build`** still runs test-first, one atomic green commit per task, resumable from the ledger.
- The **green bar** still holds — no task lands red.
- The **`sdlc-check`** checker runs unchanged: same sectioned file, same `AC-N`/`T-N` grammar, same
  trace fields, so every mechanical rule applies exactly as it does for a full-tier spec.

The tier changes *how many sections you author and how long they are*. It changes **nothing** about
what the gate, the build discipline, and the checker enforce.

## Escalation — the tier upgrade

The upgrade to the full tier is **always available**, and mid-flight discovery is expected. Upgrade
when, at any point:

- a **trigger fires** — a new dependency, a new component, or a cross-cutting need emerges; or
- the change turns out **bigger** than judged (more files, more surface, more coupling than the
  light-tier heuristic allows).

To upgrade: author the missing `## Design`/`## Tech Stack` (and expand `## Acceptance Criteria`/
`## Plan` as needed) **through the normal materialize path** — the sections land in the SAME spec
file, exactly as `reference/input-resolution.md` describes. There is **no ephemeral or side mode**;
an upgrade only adds sections to the one source of truth. Then continue the chain from where you are.

**When unsure, upgrade.** The full tier is never wrong; the light tier is only a shortcut you take
when you are confident the change is genuinely small and self-contained.

## Why it preserves the guarantees

Same spec file + same `AC-N`/`T-N` grammar + same gate + same build discipline + same checker = the
enforcement spine keeps working end-to-end. The light tier only shrinks the authoring ceremony (fewer
sections, folded into one pass); every quality gate the full tier gives you is still there, unweakened.
