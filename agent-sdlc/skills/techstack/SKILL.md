---
name: techstack
description: "Turn the design's logical shape into concrete product and library choices, one per component kind, each grounded in CURRENT official docs and pinned to a version. Use AFTER design and BEFORE plan. Triggers: 'techstack', 'what should we build this with', 'pick the stack', 'which library/framework/database', or any time you have a settled design and need the products that realize it. Names the PRODUCT for each kind the design named; never silently changes the shape."
---

# Techstack: choose the products that realize the shape

Turn the design's logical shape into concrete choices: the product, library, framework, or service
that realizes each component kind. Ground every choice in current official documentation, not
memory, and pin a version. Human-owned, agent-proposed: lead with a recommended choice and the
alternatives with tradeoffs, the user decides.

<HARD-GATE>
Input is the `## Design` and `## Acceptance Criteria` sections of `specs/<feature>/<feature>.md`
(and the `## Architecture` section of `specs/overview.md` at project level), plus `constitution.md`.
Resolve these per the input-resolution rule
([input-resolution](../getting-started/reference/input-resolution.md)): materialize any non-canonical
source into the named sections (with a provenance marker) before choosing.
Output is the `## Tech Stack` section of `specs/<feature>/<feature>.md` (the `## Tech Stack` section
of `specs/overview.md` at project level). Choose concrete products per component; do NOT change the design
shape (if a product would force a shape change, STOP and loop back to design), and do NOT write a
plan, break down tasks, or write code. Ground every choice in CURRENT official docs via search,
record the version and the date checked, and flag anything you could not verify. The terminal
action is an approved techstack handed to the plan stage.
</HARD-GATE>

## The choice bar (when a stack choice is build-ready)

A choice is done only when:

1. **Every design kind has a product.** Each component kind the design named (relational store,
   message queue, SPA) has a concrete product chosen.
2. **Grounded in current docs.** The choice is verified against the product's current official
   documentation, with the version and the date checked recorded, and a link. Training memory is
   not grounding; versions and APIs move.
3. **Meets the criteria it must.** Any non-functional criterion that depends on the choice (a
   throughput, latency, or security threshold) is satisfiable by it.
4. **Inside the constitution.** No choice violates a MUST constraint (license, hosting, language,
   compliance).
5. **No needless dependency.** At feature level especially, the choice reuses the existing stack
   where it can; a new dependency that duplicates an existing capability is rejected or justified.
6. **Unverified is flagged.** Anything you could not confirm against current docs is marked, not
   quietly assumed.
7. **Load-bearing claims are probed.** Every load-bearing library claim is either
   **verified-by-probe** (a runnable probe confirmed it, output kept + referenced) or explicitly
   **asserted** — an asserted load-bearing claim is a gate finding.
8. **Green bar declared** (project level). The exact runnable commands that constitute a passing
   build — compile/build, test, lint, format-check, typecheck (whichever the stack has) — are
   recorded, so the gate, build, and review share one definition of "green".

## Checklist (do in order)

1. **Load inputs** read the `## Design` and `## Acceptance Criteria` sections of
   `specs/<feature>/<feature>.md`, root `CONTEXT.md`, and `constitution.md`. At feature level, read
   the existing stack (manifests, lockfiles, the `## Tech Stack` already recorded in `overview.md`).
   Confirm the design is settled; if not, loop back.
2. **Set level** project (choosing the whole stack, including cross-cutting choices like language,
   build, and test framework) or feature (respecting the existing stack, choosing only what is new
   or changed).
3. **For each component kind, propose a product** lead with a recommended choice and the
   alternatives with tradeoffs, per the recommend-and-alternatives rule.
4. **Verify against current docs** search the product's current official documentation, confirm it
   still does what you expect, and record the version and the date checked and a link. Do this for
   each choice; do not rely on memory.
5. **Probe every load-bearing claim** for each load-bearing library claim (one a component's
   correctness leans on — "supports X", "handles our version", "has API Y"), run a **runnable
   probe**: install -> minimal script -> run against the real API -> keep the output -> reference it
   from the spec. Research and doc-reading are not a probe. **Read
   [reference/probing.md](reference/probing.md) now** — it is the load-bearing probe +
   throwaway-spike contract (the runnable probe, the time-boxed throwaway spike, and the three
   boundary constraints). Tag each load-bearing claim `verified-by-probe` (output kept + referenced)
   or `asserted`.
6. **Check against criteria and constitution** confirm any criterion that leans on the choice is
   satisfiable, and that no MUST constraint is broken.
7. **Prefer the existing stack** (feature level) reuse what is already there; justify any addition
   and reject duplication.
8. **Build the component-to-product map** one row per component: kind -> product, version,
   date checked.
9. **Flag the unverified** list anything you could not confirm.
10. **Settle and write** present the choices, get approval, write the artifact.
11. **Hand off** tell the user it is ready for the plan stage. If Linear sync is enabled in
    `.agent-sdlc/config.json`, also perform this stage's action via the `linear-sync` skill.

## Principles

- **The shape is fixed.** If a product would force a change to the design, loop back to design;
  do not bend the shape to fit a tool.
- **Live docs over memory.** Every choice is grounded in current official documentation, with a
  version and a date. This is the stage where stale knowledge does the most damage.
- **Recommend, don't just ask.** Lead with a choice and the alternatives; the user decides.
- **YAGNI for dependencies.** Every library is a liability you carry forever. Add one only when a
  criterion needs it.
- **Fit the existing stack first** (feature level). The cheapest dependency is the one already
  there.
- **Probe load-bearing claims, don't just read about them.** The doc-read says a library *should*
  work; the runnable probe shows it *does*. Any claim a component's correctness leans on earns its
  `verified-by-probe` tag by a probe that ran, not by research.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I know this library well, no need to check the docs." | Versions and APIs change. Verify against current docs and record the version. |
| "Latest version is always best." | Pick the version the criteria need and that is stable, and record it. Newest is not a goal. |
| "Add a small library for this one thing." | YAGNI. Reuse an existing capability or justify the new dependency against the criteria. |
| "The shape can flex to fit this product." | Backwards. The design is the contract. Loop to design if a product does not fit it. |
| "I'll record the version later." | Later is never. The version and date are the grounding; without them the choice is a guess. |
| "I researched it thoroughly and a human confirmed it — that's grounding enough." | For a load-bearing claim, no. "pi-ai has no forced tool choice" passed independent research AND human review, then the running API disproved it (a per-call `toolChoice` exists). The run wins; probe it. |
| "I'll tag it verified-by-probe, I'm confident it works." | `verified-by-probe` means a probe was RUN and its output kept + referenced. Confidence with no kept output is `asserted`, not verified. |

## Red flags (stop and fix)

- A choice with no current-doc citation, version, or date checked.
- A product that quietly changes the design shape.
- A new dependency that duplicates something already in the stack.
- A non-functional criterion with no product decision behind it.
- "Latest" or an unpinned version standing in for a real choice.
- A build or test framework chosen but no runnable green-bar commands recorded — build then inherits
  no shared definition of "green".
- A load-bearing library claim tagged neither `verified-by-probe` nor `asserted`; or tagged
  `verified-by-probe` with no kept output referenced.

## Done when

- Every component kind from the design has a concrete product.
- Each choice is grounded in current official docs, with version, date checked, and link.
- Every criterion that depends on a choice is satisfiable by it.
- Nothing violates `constitution.md`.
- The component-to-product map is complete; unverified items are flagged.
- Every load-bearing library claim is tagged `verified-by-probe` (output kept + referenced) or `asserted`.
- The green bar — the runnable compile/test/lint/format-check commands — is recorded at project level.
- The user has approved the techstack.

## The artifact (output)

The `## Tech Stack` section of `specs/<feature>/<feature>.md` (or of `specs/overview.md` at project
level), containing only:
- **Choices** per component: the design kind -> chosen product, version, the date checked and a
  doc link, and why over the alternatives. Each load-bearing claim on a choice is tagged
  `verified-by-probe` -> `<path/log/transcript>` (the kept probe output the reader can open) or
  `asserted` — the tag rides inline on the claim so a reader sees, per claim, whether a runnable
  probe backs it and where the output lives.
- **Cross-cutting choices** (project level): language, build tooling, test framework, named as
  products with versions.
- **Green bar** (project level): the exact commands that define a passing build — compile/build,
  test, lint, format-check, typecheck (whichever the stack has) — each runnable as written, so the
  gate, build, and review share one definition of "green".
- **Component-to-product map** kind -> product, one row each.
- **Unverified / flagged** anything not confirmed against current docs.
- **Glossary terms touched** mirrored into `CONTEXT.md`.

No plan, no tasks, no code. Those are later stages.

## Two levels: project vs feature

Same skill, two scopes, decided in step 2.

**Project** (choosing the whole stack): pick products for every component kind plus the
cross-cutting choices (language, build, test framework) and the green bar (the runnable commands
that define a passing build), and record them in `overview.md`'s `## Tech Stack` so feature-level
choices inherit them.

**Feature** (existing project): respect the existing stack. Choose only what is new or changed,
reuse existing capabilities, and justify any addition.

## Conventions

- Lives as the `## Tech Stack` section of `specs/<feature>/<feature>.md` (project-level
  cross-cutting choices in `specs/overview.md`). Kept out of the repo's product `docs/`.
- Reads the `## Design` and `## Acceptance Criteria` sections of the same file; references the
  design's component kinds and the `AC-N` IDs of any criterion that drives a choice.
- Stops at product selection. How those products are wired up, task by task, is the plan stage.
- Grounding is non-negotiable: choices are verified against current official docs via search, with
  versions and dates recorded.
- Downstream consumers: the plan stage (built against these products), the verify gate (checks each
  component has a product where one is needed), and the review panel.
