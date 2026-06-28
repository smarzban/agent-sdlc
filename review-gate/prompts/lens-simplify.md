# Lens: simplicity & over-engineering

You are reviewing this change for **needless complexity it introduces** — code that is correct but
harder to read, verify, or maintain than the problem requires. Hold the review standard: *flag
complexity that makes the change harder to understand or more likely to break — do **not** flag code
merely because it isn't how you would have written it.* Explore the checked-out branch; read the
changed code and any abstraction it adds against how the rest of the codebase already solves the same
problem.

**Chesterton's Fence — understand before you flag.** An abstraction may exist for extensibility,
testability, a platform constraint, or a reason the diff doesn't show. Read the call-sites and
conventions first; if you can't say *why* a simpler form is safe, don't flag it.

**Over-abstraction & indirection (the core of this lens):**
- **Speculative generality / YAGNI** — an abstraction, config knob, or extension hook with exactly one
  caller and no second use in sight ("might be useful later").
- **An abstraction that doesn't earn its keep** — a wrapper, factory, manager, or strategy layer that
  forwards a call without adding meaning; inlining it would read clearer.
- **Premature generalization** — a generic / parameterized solution where the codebase has one
  concrete case (don't generalize before the third use).
- **A second way to do a solved thing** — re-inventing a pattern the codebase already has one way,
  adding divergence instead of reusing it.
- **Reinventing the stdlib, or a dependency for a one-liner** — this change hand-rolls something the
  language/runtime already provides, or adds a third-party dependency for what a native API or a few
  lines would do. The least-code path is reuse → stdlib → native → a small dep; flag a climb past the
  lightest option that fit. (A needless new dependency can be real maintenance + supply-chain cost — rate
  it by impact per the calibration below; a dep with a legitimate reason — portability, a stdlib gap,
  security, performance — isn't a finding.)

**Local complexity:**
- Deep nesting (3+ levels) a guard clause / early return would flatten; a function doing several
  unrelated things.
- A dense expression (nested ternaries, chained reduces with inline logic) a named intermediate would
  make obvious.
- A boolean-flag parameter (`doThing(true, false)`) that should be separate functions or an options
  object.
- Duplicated logic **this change introduces** that should be one named helper.

**Do NOT flag:** pure formatting/style the linter owns; abstraction that genuinely serves
extensibility or testability; pre-existing complexity the change doesn't touch (this reviews *this
change*, not the whole file); "fewer lines" for its own sake — comprehension speed is the goal, not
line count. And never propose a "simplification" that drops error handling or changes behavior —
that isn't simpler, it's a different (and likely broken) program.

Use `"area": "maintainability"`. **Severity = real impact, and most simplification findings are
`low`/`info` (advisory).** Reserve `medium`+ for complexity that concretely risks a bug, makes the
change hard to verify for correctness, or imposes real maintenance cost in central/hot code — never
for preference. If the change adds no needless complexity, return `[]`.
