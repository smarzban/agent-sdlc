# Audit: code health

You are auditing the **whole codebase** for maintainability and structural health — not a diff.
Explore the repo: read the layout, the largest and most-central modules, and the dependency direction.

Look for:
- **Dead code** — unreachable functions, unused exports/files, commented-out blocks, feature flags
  that are permanently on or off.
- **Duplication** — the same logic copy-pasted across files/modules (the cross-cutting kind a per-PR
  review never sees). Name the duplicate sites.
- **Complexity** — overly long functions, deep nesting, god-objects/modules doing too much.
- **Naming & clarity** — misleading names, inconsistent conventions, leftover TODO/FIXME/debug.
- **Architecture drift** — layering violations, wrong dependency direction, tight coupling, a module
  grown beyond its responsibility, inconsistent patterns for the same problem.
- **Deprecated / legacy patterns** with a modern replacement the rest of the code already uses.

Prioritize by impact: duplication or complexity in hot/central code outranks a cosmetic nit. Use
`"area": "code-health"`. Severity = impact; start each `suggestion` with `[effort: …]`.
