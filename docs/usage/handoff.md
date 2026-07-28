# Handoff

`HANDOFF.md` is the working copy's live "where we left off" doc: what is in flight, what was
deliberately left undone, which of two plausible readings of the repo is current right now. Git
history records what changed, never what was being attempted, and that gap is the whole reason
this doc exists. It is distinct from the repo's standing agent-instruction files (e.g. `AGENTS.md` /
`AGENTS.local.md`): standing rules stay true next month, `HANDOFF.md` is allowed to be wrong next
week. The full contract is [`skills/handoff/SKILL.md`](../../skills/handoff/SKILL.md).

Invoke with `/agent-sdlc:handoff`, or just ask ("set up a handoff doc", "update the handoff",
"prune the handoff").

## The three modes

Exactly one runs at a time, picked by a mechanical condition, never guessed:

- **Scaffold**: creates `HANDOFF.md` at the repo root. Only when it does not already exist, and
  only when creating one was asked for or is clearly needed to resume work: never on absence
  alone, unasked.
- **Update**: the default for writing today's entry: what just happened, the true current repo
  state, and what to pick up next. Runs a prune check first and, if it fires, disposes of stale
  content in the same pass rather than deferring it.
- **Prune**: trims the doc on its own, separate from writing a current entry. Standing rules are
  evicted into the repo's agent-instruction files rather than deleted; only threads that are
  already merged, shipped, closed, or decided get dropped.

A prune, standalone or inline inside an update, always shows the trimmed result before overwriting
the file: this is the one lossy operation in the skill, and it never runs silently. A size,
structure, or content trigger decides when a prune is due; see the skill for the exact conditions.

## Ignored by default

Scaffolding adds `HANDOFF.md` to the repo's ignore file unless it is already ignored. Tradeoff:
ignored keeps it private and safe for half-formed notes and local paths, but it never travels with
the repo unless the team opts in to commit it instead.

## When to use it

Any repo, any agent, whenever a session is ending mid-work and the next agent (or you, tomorrow)
needs to resume without re-deriving context from the git log alone. Ask for it directly, or let it
come up naturally at the end of a working session.

Two pipeline stages also update it automatically when it already exists: `build`, before
dispatching the first task, and `ship`, at its park step. Neither stage ever creates it; presence
is the only opt-in.
