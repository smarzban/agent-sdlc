---
name: architecture-design
description: "Turn settled acceptance criteria into a logical architecture shape an agent can build against: components and responsibilities, the contracts between them, data flow and key state, trust and failure boundaries, and ADRs for hard-to-reverse decisions, with every criterion traced to the component responsible for it. Use AFTER acceptance-criteria and BEFORE techstack. Triggers: 'design', 'architecture', 'how should this be structured', 'shape the system', or any time you have settled acceptance criteria and need the intended shape. Names the KIND of thing, never the concrete product (no Postgres, no React) - that is the techstack stage."
---

# Design: shape the system, not the stack

Turn settled acceptance criteria into the logical shape the build is held to: what the components
are, what each is responsible for, how they talk, how data flows, where the boundaries are, and
why the irreversible calls were made. This is the first HOW stage, but it names the *kind* of
thing only. Choosing concrete products and libraries is the next stage. Human-owned,
agent-proposed: lead with a recommended shape and the alternatives, the user decides.

<HARD-GATE>
Input is the `## Brief` and `## Acceptance Criteria` sections of `specs/<feature>/<feature>.md`.
Output is the `## Design` section of the same file (and, at project level, the `## Architecture`
section of `specs/overview.md`). Name the KIND of
thing (relational store, message queue, single-page app), NEVER the concrete product (Postgres,
SQS, React) - that is the techstack stage. Do NOT choose a stack, write a plan, break down tasks,
or write code. If the criteria are unsettled or a criterion has no home in any sensible shape,
STOP and loop back to acceptance-criteria. The terminal action is an approved design handed to the
techstack stage.
</HARD-GATE>

## The shape bar (when a design is build-ready)

A design is done only when all of these hold:

1. **Every criterion traces to a component.** Each `AC-N` maps to the component(s) responsible for
   satisfying it. A criterion with no home means a component is missing or the criterion belongs
   elsewhere. This traceability is the design analogue of the verification map: it is what makes
   the shape checkable.
2. **Every component has one responsibility.** One reason to change. A component you describe with
   "and", or a "manager / util / misc" catch-all, is not done being decomposed.
3. **Contracts are explicit.** Each boundary between components states its inputs, outputs, and
   error semantics. Hyrum's Law: every observable behavior becomes something others depend on, so
   state the contract rather than leaving it implicit.
4. **Data flow and key state are defined.** What data moves where, and what state lives where, at
   the logical level (the kind of store, not the product).
5. **Trust and failure boundaries are named.** Where untrusted input crosses in, and what happens
   when each part fails.
6. **Hard-to-reverse decisions are ADRs.** Recorded with the WHY (see ADR test below).
7. **No concrete product named.** The moment a library or product appears, you have drifted into
   the techstack stage.

## The design / techstack line

Design names the **kind**; techstack names the **product**. Relational store vs Postgres.
Message queue vs SQS. Single-page app vs React. Event-driven vs Kafka. If the choice is "which
shape", it is here; if it is "which product implements the shape", it is the next stage. When in
doubt, state the kind and defer the product.

## Checklist (do in order)

1. **Load inputs** read the `## Brief` and `## Acceptance Criteria` sections of
   `specs/<feature>/<feature>.md`, root `CONTEXT.md`, and `constitution.md`. Confirm the criteria
   are settled; if not, loop back. At feature level, also read the existing architecture: the code,
   the `## Architecture` section of `specs/overview.md`, and existing ADRs in `specs/adr/`.
2. **Set level** project (clean repo, no `## Architecture` in `overview.md`, shaping the whole system) or feature
   (existing project, fitting one piece in). This routes what you produce (see Two levels).
3. **Propose the component decomposition** lead with a recommended set of components and their
   single responsibilities, plus the alternatives and tradeoffs, per the recommend-and-alternatives
   rule. At feature level, identify which existing components change and what new ones are needed,
   reusing existing patterns.
4. **Define the contracts** for each boundary, state inputs, outputs, and error semantics.
   Validate untrusted input at the boundary, not deep inside.
5. **Define data flow and key state** logically (the kind of store and the shape of the data), not
   the product.
6. **Name trust and failure boundaries** where untrusted input enters, and the failure mode of
   each component.
7. **Record ADRs** for each decision that is hard-to-reverse AND surprising-without-context AND a
   real tradeoff, in `specs/adr/`. At feature level, any deviation from an existing pattern is
   exactly such a decision.
8. **Build the criterion-to-component map** one row per `AC-N` -> responsible component(s). Every
   criterion appears; no orphans, no components unjustified by a criterion.
9. **Constitution Check** confirm the shape violates no MUST principle in `constitution.md`. Flag
   any conflict and resolve it (or loop) before proceeding.
10. **Present in chunks and settle** show the shape in pieces small enough to actually review, get
    approval, write the artifact(s).
11. **Hand off** tell the user it is ready for the techstack stage. Do not choose the stack
    yourself.

## Principles

- **Shape, not stack.** Name the kind, defer the product. This is the whole discipline of the
  stage.
- **Contract-first.** Settle the boundaries between components before their internals.
- **Recommend, don't just ask.** Lead with a recommended shape and the alternatives; the user
  decides.
- **YAGNI for architecture.** The simplest shape that satisfies the criteria. An abstraction with
  one caller is a cost, not flexibility; add seams when a real second case arrives.
- **Traceability is the proof.** If a criterion does not map to a component, the design is not
  done.
- **Fit before invent** (feature level). Reuse existing patterns; a deviation needs an ADR.
- **Code over questions.** Read the existing architecture instead of asking about it.
- **Loop, don't force.** A criterion that will not sit in any sane shape usually means the criteria
  are wrong. Go back.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I'll just pick Postgres now, it's obvious." | That is the techstack stage. Name the kind (relational store); defer the product. |
| "This component does a few related things." | Related is not single-responsibility. Multiple reasons to change means multiple components. |
| "The contract is obvious from the name." | Hyrum's Law: observable behavior becomes a depended-on contract. State inputs, outputs, errors. |
| "Add an abstraction layer now for future flexibility." | YAGNI. Build the shape the criteria need; add seams when a second real case exists. |
| "This criterion doesn't really map to a component." | Then a component is missing or the criterion is misplaced. No orphans. |
| "We've always structured it this way, no ADR needed." | A deviation, or a load-bearing default, is exactly when the WHY must be recorded. |

## Red flags (stop and fix)

- A concrete product or library name anywhere in the design.
- A component with more than one responsibility, or a catch-all (manager / util / misc).
- A criterion with no component, or a component justified by no criterion.
- Contracts described only in prose, with no inputs / outputs / errors.
- A hard-to-reverse decision made silently, with no ADR.
- The shape is more elaborate than the criteria require.

## Done when

- Every acceptance criterion traces to a responsible component.
- Every component has one responsibility and explicit contracts with its neighbors.
- Data flow and key state are defined; trust and failure boundaries are named.
- Hard-to-reverse decisions are recorded as ADRs.
- No concrete product or library is named.
- Nothing contradicts `constitution.md`.
- The user has approved the design.

## The artifact (output)

The `## Design` section of `specs/<feature>/<feature>.md`, containing only:
- **Components** each with: name, single responsibility, the kind of thing it is (logical), and
  its contracts (inputs, outputs, error semantics) with neighbors.
- **Data flow and key state** logical, product-free.
- **Trust and failure boundaries.**
- **Criterion-to-component map** `AC-N` -> component(s), one row each.
- **ADRs created** links into `specs/adr/`.
- **Glossary terms touched** mirrored into `CONTEXT.md`.

No concrete stack, no plan, no tasks. Those are later stages.

## Two levels: project vs feature

Same skill, two scopes, decided in step 2.

**Project** (clean repo, shaping the whole system): write the `## Architecture` section of
`specs/overview.md`, the north-star shape the whole repo shares (top-level components, their
contracts, cross-cutting concerns like auth and error handling and observability as logical
shapes). The first feature's `## Design` then references it.

**Feature** (existing project, fitting one piece in): write the `## Design` section of
`specs/<feature>/<feature>.md` only. Fit
the existing architecture, name which existing components change and which are new, and log any
deviation from existing patterns as an ADR.

## Conventions

- Lives as the `## Design` section of `specs/<feature>/<feature>.md`; the project-wide shape lives
  in the `## Architecture` section of `specs/overview.md`. Kept out of the repo's product `docs/`.
- Reads the `## Brief` and `## Acceptance Criteria` sections of the same file; references `AC-N` IDs
  in the criterion-to-component map.
- Stops at logical shape. Concrete products and libraries are the techstack stage.
- ADRs in `specs/adr/`, created via the three-part test (hard-to-reverse AND surprising AND a real
  tradeoff).
- Downstream consumers: the techstack stage (picks a product per component), the plan stage (built
  against this shape), the verify gate (checks the criterion -> component -> task chain), and the
  review panel (Architecture and Spec Conformance axes).
