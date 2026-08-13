---
name: light
description: "Compressed Agent SDLC authoring for a small self-contained change: one short pass writes Brief, a handful of AC, and a short Plan, then hands to gate and a light build. Use instead of the full idea-through-techstack chain when the change is small. Triggers: 'light tier', 'small fix', 'this is a small change', 'skip the full chain', a bug fix or targeted edit of tens of lines. Use AFTER you know the change is small. Use BEFORE gate and build. Scope: Agent SDLC runs only. Default entry for small work; upgrade to the full chain only on a narrow trigger."
---

# Light: small change, short authoring

Write the smallest spec the gate and build can verify, then stop. Do not run idea, architecture,
or techstack unless a trigger below fires.

<HARD-GATE>
Applies when the change is small and self-contained: tens of lines, a few files, no new runtime
dependency, no new public API, no new trust or process boundary. Any of those failing, or the user
asking for the full chain, stops this skill: hand off to `idea` (or the missing full-chain stage).
Do not invent Design or Tech Stack to look complete. Output is Brief + Acceptance Criteria + Plan
in `docs/specs/<feature>/<feature>.md`. Terminal action: user approves the spec, then
`/agent-sdlc:gate`.
</HARD-GATE>

## Checklist

1. **Confirm it is still light.** New runtime dependency, new public API, or a trust/process
   boundary -> upgrade: tell the user and start the full chain. When unsure, stay light and
   upgrade if a trigger appears.
2. **Write `## Brief`.** One paragraph: problem and scope. No design, no stack.
3. **Write `## Acceptance Criteria`.** A handful of `AC-N`, same grammar and verification types
   as the full chain (test-backed / reviewer-checked). Compressed in count, not in rigor.
4. **Write `## Plan`.** A short set of `T-N` with `*Advances:*`, `*Component:*` (an existing
   component, or `none`), `*Deps:*`, files, and the failing test. Prefer one independently
   reviewable slice over many microtasks.
5. **Do not write `## Design` or `## Tech Stack`** unless a trigger fired mid-pass. Their absence
   is by design. The plan traces to an existing component.
6. **Get approval**, then hand to `/agent-sdlc:gate`. After a clean gate, `/agent-sdlc:build`
   runs the **light build** path (no per-task reviewer). Do not start those yourself unless the
   user asked to continue.

## Principles

- **Light is the default.** Full is the exception.
- **Upgrade on a trigger, not on unease.** "This might be a feature" is not a trigger.
- **Same grammar, fewer sections.** The checker still has to parse `AC-N` and `T-N`.
- **Recommend, don't just ask.** Lead with "this is light" and why.

## Rationalizations

| Excuse | Rebuttal |
| --- | --- |
| "When unsure I should run the full chain." | Unsure stays light. Upgrade when a trigger fires. |
| "I'll add Design so the gate looks happier." | Absence of Design is valid. Do not gold-plate the spec. |
| "It's a new file, so it's a new component." | A new file in an existing area is not a new public API. |

## Red flags

- Architecture or techstack started for a tens-of-lines edit.
- Light used after adding a runtime dependency or a public API.
- Plan split into microtasks that cannot be reviewed on their own.

## Done when

- Brief, AC, and Plan are written and approved.
- No Design/Tech Stack unless a trigger fired.
- The hand-off to gate is stated.

## The artifact (output)

`docs/specs/<feature>/<feature>.md` with `## Brief`, `## Acceptance Criteria`, `## Plan` only
(plus Design/Tech Stack only if a trigger fired). Same file the full chain uses.

## Conventions

- Same spec path and `AC-N`/`T-N` grammar as the full chain.
- Downstream: `/agent-sdlc:gate`, then light `/agent-sdlc:build`, then `/agent-sdlc:ship`.
- Load-bearing detail: [reference/light-tier.md](../getting-started/reference/light-tier.md).
