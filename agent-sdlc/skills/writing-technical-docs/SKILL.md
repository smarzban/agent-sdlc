---
name: writing-technical-docs
description: "Use when asked to write full technical/internal documentation for a codebase — the architecture with its design rationale, data models/schemas, per-subsystem internals, invariants and the security model, and a complete module/API reference where every exported symbol is documented. Coverage is contractual — inventory the surface first, then close the ledger; no silent sampling. Complements writing-repo-docs (user/operator/contributor essentials — including a library's public-API reference); run it after the essentials exist, or standalone when only maintainer docs are needed. Triggers: \"technical documentation\", \"architecture docs\", \"document the internals\", \"complete API/module reference\", \"document every module/function\", \"data model docs\"."
---

# Writing Technical Docs

Maintainer-grade documentation: how it **works**, **why** it is built that way, and a **complete** reference of the surface. Two things make it worth reading: the rationale + invariants (which the code cannot say), and the coverage contract (which forbids the "representative examples" cop-out). This is the deep half of the documentation pair — user/operator/contributor essentials are `writing-repo-docs`.

**Announce at start:** "I'm using the writing-technical-docs skill to write the technical documentation."

## Core principles

1. **Every concrete claim is grounded in the source.** Signatures, defaults, schemas, behavior — read the defining line before you write it. Same hard rule as the essentials skill; the verification pass is not optional.
2. **Coverage is a contract.** Phase 1 produces an inventory — modules, exported symbols, data models, entry points. Done means every row is documented or explicitly excluded with a reason. Never sample and imply completeness.
3. **The why is the durable part.** Design rationale, trade-offs, invariants, rejected alternatives (mine the ADRs) — an engineer can read the code for the what. A page that paraphrases code line-by-line is waste.
4. **Generated vs hand-written reference is a decision, not a default.** Large surface + ecosystem generator (typedoc, sphinx/autodoc, rustdoc, godoc…) → generate the symbol reference and hand-write the concept pages. Small surface → hand-write both. Never hand-transcribe what a generator does better; never let generator output stand in for the why.
5. **Invariants and the security model get their own pages.** They are what a maintainer most needs and most easily breaks — surface them explicitly, don't scatter them.

## Checklist (turn each into a tracked task)

1. **Inventory the surface** — build the coverage ledger before writing anything.
2. **Decide the reference strategy** — generated, hand-written, or hybrid.
3. **Write the spine** — architecture, data model, security model, one page per subsystem.
4. **Write the reference** — close the ledger, module by module.
5. **Verify** — link check + adversarial fact-check + coverage check.
6. **Index + report** — landing page, ledger stats, exclusions, caveats.

## Phase 1 — Inventory the surface

Read the code first; write the ledger before any doc page. Capture (format in `reference/depth-and-coverage.md`):

- **Module map** — every module/package with its responsibility, from the filesystem and the build config, not from an old doc.
- **Exported/public symbols per module** — from the export statements / `__all__` / manifest, not from memory.
- **Data models** — every schema, table, persisted or wire-format shape (schema files, migrations, model classes).
- **Entry points** — CLI commands, HTTP routes, jobs/daemons, extension hooks.
- **Cross-cutting concerns** — the invariants the system depends on, trust boundaries, concurrency/lifecycle rules. These become the invariants + security-model pages.
- **Exclusions, declared up front** — vendored code, generated code, deprecated-and-marked surfaces. Excluded means *listed with a reason*, never silently skipped.

## Phase 2 — Decide the reference strategy

Pick per principle 4 and record the choice in the landing page (so the next maintainer knows why). If a generator is used: document how to run it, and scope the hand-written pages to concepts, invariants, and per-subsystem narratives — the parts no generator produces. Adding the generator to the build/manifests is an owner-approved change, not a docs-task default.

## Phase 3 — Write the spine

Small files, one concern each, cross-linked:

- **`architecture.md`** — the system map, the main components, the main data/control flows, and the *why*: the constraints and trade-offs that shaped it, alternatives considered (mine ADRs/design notes where they exist — link rather than restate).
- **`data-model.md`** — every entity: fields with semantics (not just types), lifecycle, ownership, relations. Verified against the schema/migrations, not the ORM docstrings.
- **One page per subsystem** — responsibility, public surface, how it works (at the level of mechanisms, not line-by-line), **the invariants a maintainer must not break**, error paths, extension points.
- **`security-model.md`** — when any trust boundary exists: what is trusted vs untrusted, where enforcement lives, what fails open vs closed.

## Phase 4 — Write the reference (close the ledger)

For each module page: purpose, then every exported symbol — signature (verified against the definition), parameters/returns/raises with semantics, behavior notes, gotchas. Private internals are in scope **when they carry an invariant** the maintainer must know; say so explicitly. Update the ledger row as each module lands.

## Phase 5 — Verify (do not skip)

Read `reference/fact-check-and-verify.md`. In full:

- **Link check** — every internal relative link resolves.
- **Adversarial fact-check** — a fresh pass (subagent if available) hunting statements contradicted by the code: wrong signatures, renamed symbols, stale defaults, wrong behavior. Fix every confirmed error.
- **Coverage check** — diff the ledger against the docs: every inventoried module/symbol/model documented or listed as excluded. A script comparing the export list to the reference pages beats eyeballing.
- **Placeholder scan** — no TBD/TODO/empty sections.

## Phase 6 — Index + report

- The technical landing page routes by need: "how does X work" → subsystem pages; "what does this function do" → reference; "why is it like this" → architecture/ADRs.
- Report: the file tree, **ledger stats** (N modules, M symbols documented, exclusions with reasons), the reference-strategy decision, and every code/doc contradiction found (offer code fixes separately — doc work must not silently change behavior).

## Rationalizations (excuse → rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I documented the important modules" | The ledger defines done. Undocumented + unlisted = not done — sampling *implies* coverage that doesn't exist. |
| "The code is self-explanatory" | The code says what. It cannot say why, what must not break, or what was rejected — that's the whole product here. |
| "I'll trust the docstrings/comments" | Comments drift. Verify against the defining line; a wrong signature in a reference poisons trust in the rest. |
| "A generator can produce all of this" | It produces the symbol tables. It cannot write architecture, invariants, or rationale — those stay hand-written. |
| "The suite is green so the docs must match" | Tests check behavior, not prose. Only the fact-check pass checks prose. |

## Red flags (stop and fix)

- Writing a signature, default, schema field, or behavior claim **without opening the definition**.
- "Representative examples" where the ledger says complete coverage.
- A page that paraphrases the code line-by-line instead of explaining mechanism + why.
- Invariants mentioned in passing inside a narrative instead of stated on the subsystem page.
- Generator output shipped as the whole deliverable — no architecture, no why.
- An exclusion that exists only in your head (not listed in the ledger with a reason).
- Documenting a dead/deprecated path as live because an old doc did.

## Done when

- The coverage ledger is closed: every inventoried module, exported symbol, data model, and entry point documented or explicitly excluded with a reason.
- Architecture, data-model, per-subsystem, and (where a trust boundary exists) security-model pages exist, each carrying the why + invariants.
- 0 broken links, 0 placeholders; the adversarial fact-check ran and every confirmed error is fixed.
- The landing page routes by need and records the reference-strategy decision; the report includes ledger stats and any drift found.

## Conventions

- Lives beside the essentials tree — default `docs/technical/` (adopt the repo's existing layout if it has one).
- The essentials' light `architecture.md` (from `writing-repo-docs`) links here; don't duplicate its overview — deepen it.
- Same rule for a library/framework's **public-API `reference/`** from the essentials: it satisfies the ledger's public-symbol rows — point rows at it (deepening in place where internals detail is warranted) and let the coverage check grep both trees. The technical reference adds internal modules, load-bearing internals, and anything the essentials reference omitted; never a drift-prone twin of it.
- Small files, one concern each; relative cross-links; the repo's own terminology throughout.
