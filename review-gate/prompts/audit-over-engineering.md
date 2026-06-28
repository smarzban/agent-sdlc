# Audit: over-engineering & needless complexity

You are auditing the **whole codebase** for complexity that doesn't earn its keep — abstraction,
indirection, and generality the project carries but doesn't need, **and code it hand-rolled (or pulled
a dependency for) where a lighter option already existed** — not a diff. This is the
structural-complexity sibling of `audit-code-health`: where code-health sweeps dead code, duplication,
long functions, naming, and layering, this pass asks one question of the abstractions and dependencies
that remain — **"is this earning its complexity?"** Explore the repo: read the central modules, the
abstraction layers, the interfaces that have a single implementation, and the dependency manifest.

**Chesterton's Fence — understand before flagging.** An abstraction may exist for extensibility,
testability, or a constraint the layout doesn't show. Check callers and git history before calling it
needless — then name the simpler form concretely.

Look for:
- **Speculative generality / YAGNI** — abstractions, config knobs, extension points, or interfaces
  with a single implementation and no live second use; built for a future that hasn't arrived.
- **Indirection that adds no meaning** — wrappers, factories, managers, or strategy/handler layers
  that forward a call without adding behavior; an A→B→C chain where A could call C directly.
- **Premature generalization** — a generic, parameterized, or pluggable solution where the codebase
  has exactly one concrete case.
- **Pattern over-application** — design patterns, dependency-injection ceremony, or framework
  machinery where a plain function or a direct call would be clearer.
- **Over-configurable surfaces** — options, flags, and hooks no caller exercises; configuration for
  things that never vary.
- **Redundant layering** — more architectural layers than the domain needs; an abstraction wrapping
  another abstraction.

The **least-code path** — prefer reuse → stdlib → native → a small dep → a few lines, in that order;
flag where the code climbed past the lightest option that fit:
- **Reinvented standard library / platform** — a hand-rolled utility that duplicates what the language
  stdlib, runtime, or framework already provides (date math, deep-clone, debounce, path joining, UUID,
  argument parsing). Name the built-in that replaces it.
- **A dependency that doesn't earn its weight** — a third-party package pulled in for what the stdlib /
  a native API / a few lines would do (the left-pad shape), an outsized library used for one small
  function, or two deps doing the same job. This asks whether the dep should exist **at all** — distinct
  from `audit-operability`'s dependency *rot* (outdated / vulnerable / unmaintained). A dep can still
  earn its weight via cross-platform portability, a security-hardened or spec-correct implementation the
  stdlib lacks, performance, or maintenance offload — confirm none of those apply before flagging. Tag
  such findings `"area": "dependencies"` (so they co-locate with operability's dep findings in the backlog).
- **Not reusing what's already here** — a second, divergent implementation of something the repo
  already solves one way (a helper, a client, a pattern), adding drift instead of reusing it (the
  *divergent-reinvention* angle — vs `audit-code-health`'s verbatim copy-paste duplication).

Prioritize by leverage: over-abstraction in central, frequently-touched code (every change pays the
indirection tax) outranks an isolated unused wrapper. Use `"area": "code-health"`. Severity = impact;
start each `suggestion` with `[effort: …]`.
