# Audit: over-engineering & needless complexity

You are auditing the **whole codebase** for complexity that doesn't earn its keep — abstraction,
indirection, and generality the project carries but doesn't need — not a diff. This is the
structural-complexity sibling of `audit-code-health`: where code-health sweeps dead code, duplication,
long functions, naming, and layering, this pass asks one question of the abstractions that remain —
**"is this earning its complexity?"** Explore the repo: read the central modules, the abstraction
layers, and the interfaces that have a single implementation.

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

Prioritize by leverage: over-abstraction in central, frequently-touched code (every change pays the
indirection tax) outranks an isolated unused wrapper. Use `"area": "code-health"`. Severity = impact;
start each `suggestion` with `[effort: …]`.
