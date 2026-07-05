# Depth & coverage — the ledger and the page templates

Coverage is the contract that separates "full technical documentation" from a tour.
The ledger is built in Phase 1, updated as pages land, and closed in Phase 5.

## The coverage ledger

One table (keep it in your working notes, or commit it as `docs/technical/coverage.md`
if the user wants the audit trail). One row per inventoried item:

```
| Item                        | Kind       | Doc                         | Status     |
|-----------------------------|------------|-----------------------------|------------|
| src/auth/                   | subsystem  | technical/auth.md           | done       |
| src/auth/tokens.ts          | module     | technical/reference/auth.md | done       |
| verifyToken()               | symbol     | technical/reference/auth.md | done       |
| User, Session (schema)      | data model | technical/data-model.md     | done       |
| POST /api/login             | entry pt   | technical/auth.md           | done       |
| src/vendor/…                | excluded   | —                           | vendored   |
| legacy/exporter.ts          | excluded   | —                           | deprecated (marked, removal tracked) |
```

Rules:
- **Sources of truth for the inventory:** the filesystem + build config (modules), export
  statements / `__all__` / the package manifest (symbols), schema files + migrations (data
  models), router/CLI-parser registrations (entry points). Never an old doc, never memory.
- **Symbol granularity:** every *exported* symbol gets a reference entry. Group rows by
  module in the ledger (one row per module is fine once its reference page is complete),
  but the coverage check (below) still compares at symbol level.
- **Private internals** enter the ledger when they carry an invariant a maintainer must
  know (a lock ordering, a cache coherence rule, a sentinel value). Mark them `internal —
  load-bearing`.
- **Exclusions are declared, never implied.** Legitimate reasons: vendored, generated,
  deprecated-and-marked, an explicitly agreed scope cut from the user. Each carries the
  reason in the row. An item missing from both the docs *and* the exclusion list means
  the work is not done.

## Coverage check (Phase 5)

Diff the actual surface against the reference pages mechanically where possible —
e.g. extract the export list and grep the reference tree for each name:

```bash
# sketch (adapt per language): every exported name must appear in the reference tree
for sym in $(extract-exports src/); do
  grep -rq "$sym" docs/technical/reference/ || echo "UNDOCUMENTED: $sym"
done
```

Anything the script flags is either documented, added to the exclusion list with a
reason, or the ledger stays open. Do the same by hand for data models (schema entities
vs `data-model.md`) and entry points (routes/commands vs their pages).

## Page templates

Shapes, not straitjackets — use the repo's own vocabulary, drop rows that don't apply.

### Subsystem page (`technical/<subsystem>.md`)

```markdown
# <Subsystem>

**Responsibility.** One paragraph: what this owns, what it explicitly does not.

**Public surface.** The entry points other code uses (link each to its reference entry).

**How it works.** The mechanism at design level — the moving parts and the main flows.
Not line-by-line; a maintainer reads this to know where to look, then reads code.

**Invariants.** The rules a change must not break, stated as rules:
- <invariant> — why it holds, what enforces it, what breaks if violated.

**Error paths.** What fails, how it surfaces, what is retried/fatal/fail-closed.

**Extension points.** Where and how this is meant to be extended (if it is).
```

### Reference entry (per module, in `technical/reference/<module>.md`)

```markdown
## <module path>

Purpose: one sentence.

### `<signature — verified against the definition>`
What it does (semantics, not a restatement of the name). Parameters/returns/raises
with meaning. Behavior notes: side effects, defaults, edge cases, gotchas.
```

### Data-model entry (in `technical/data-model.md`)

```markdown
## <Entity>

What it represents. Ownership (who creates/mutates/deletes). Lifecycle.

| Field | Type | Semantics (not just the type — what it means, units, valid states) |

Relations: <entity> ←→ <entity>, and the integrity rules between them.
Verified against: <schema file / migration>.
```

## Depth guide — what "explained" means per artifact

- **Architecture:** a newcomer engineer can predict where a given change belongs, and
  knows the two or three constraints that shaped the design.
- **Subsystem:** a maintainer can modify it without violating an invariant they were
  never told about.
- **Reference:** a caller never needs to open the source to learn a parameter's meaning,
  a default, or an error condition.
- **Data model:** a migration author knows every consumer of the field they're touching.

If a page doesn't move its reader to that bar, it's summary, not documentation — deepen
it or fold it elsewhere.
