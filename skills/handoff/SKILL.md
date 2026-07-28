---
name: handoff
description: "Scaffold, update, or prune a repo's HANDOFF.md: the live 'where we left off' doc the next agent (any agent, any day) reads to resume, distinct from the standing rules in the repo's agent-instruction files. Selects one of exactly three modes mechanically: scaffold when no handoff doc exists, update to write the current entry, prune when a mechanical size/structure/content trigger has fired. Triggers: 'set up a handoff doc', 'write a handoff', 'update the handoff', 'prune the handoff', 'where did we leave off', or any time a session is ending mid-work and the next agent needs to resume without asking. Scope: standalone, for any repo, independent of any pipeline."
---

# Handoff: keep the working-copy state doc honest

A repo's git history records what changed, never what was being attempted. `HANDOFF.md` is the
doc that carries the working copy forward: what is in flight, what was deliberately left undone,
which of two plausible readings of the repo is current. Its known failure mode is becoming an
append-only log of merged PRs and shipped features, at which point it costs a read and returns
stale context. Everything here exists to make that failure mechanical to catch, not a matter of
remembering to be disciplined.

<HARD-GATE>
Exactly three modes exist: scaffold, update, prune. Scaffold only when no `HANDOFF.md` exists at
the repo root AND creating one was asked for or is clearly needed to resume work: never scaffold
on absence alone, unasked. Update is the default for writing today's entry, and it always runs the
prune trigger check first: when the trigger has fired, update disposes of every entry per the
litmus (evict standing rules, collapse or drop closed threads) and shows the trimmed result before
overwriting, in the same pass, rather than deferring the prune or telling the user to run it
separately. Prune stays separately invocable, for when the user asks for a prune pass on its own
without writing a current entry. If the mode still cannot be determined this way, say so and ask
rather than picking: scaffold and prune differ in whether anything is destroyed, and guessing
wrong on that axis is the one mistake this skill cannot recover from. A prune pass, standalone or
inline inside an update, never overwrites `HANDOFF.md` before showing the user the trimmed result.
Content identified as a standing rule is evicted (moved to the repo's agent-instruction files, per
the litmus), never deleted outright; deletion is reserved for threads that are already merged,
shipped, closed, or decided. No mode creates or writes anything outside `HANDOFF.md`, its one
ignore-file entry, and (on eviction) the repo's agent-instruction files.
</HARD-GATE>

## The litmus (state once; every placement call below refers back to it)

**Will this be wrong next week, or still true next month?**

- Wrong next week (an in-flight branch, today's repo state, a half-formed suspicion, a "next up")
  -> it is **live state**: it belongs in `HANDOFF.md`.
- True next month (a convention, a tool gotcha, "how we work here", a durable lesson) -> it is a
  **standing rule**: it belongs in the repo's agent-instruction files, not here.

Nowhere else in this skill restates that test; every mode, the prune trigger, and eviction all
just point back to it.

## The three modes

Pick exactly one, by this condition, before doing anything else:

| Mode | Condition |
| --- | --- |
| **Scaffold** | No `HANDOFF.md` exists at the repo root, AND creating one was asked for or is clearly needed to resume work. Never on absence alone, by surprise. |
| **Update** | `HANDOFF.md` exists and the current entry needs writing (a session is starting, in progress, or ending). Always runs the prune trigger check first; disposes of entries inline and shows the trimmed result if the trigger has fired, before writing. |
| **Prune** | The user asks for a prune pass on its own, separate from writing today's entry. |

If none of these clearly holds, say so explicitly and ask which is intended rather than choosing.

### Scaffold

1. Create `HANDOFF.md` at the repo root from the template below.
2. Fill the stamped header line and a short current-state entry from what is actually true right
   now (branch, head, clean/dirty, what is in flight): never a placeholder.
3. Add `HANDOFF.md` to the repo's ignore file if it is not already ignored, and **tell the user
   you did this**, with the tradeoff in one line:

   > Ignored by default: private and safe for half-formed notes and local paths, but it never
   > travels with the repo unless the team opts in to commit it instead.

4. If the repo has no place for standing rules yet, say so: this skill never creates that file,
   it only names where standing-rule content from a future prune would go (per the litmus).

### Update

1. Check the prune trigger first (mechanical, below). If it has fired, dispose of every entry per
   the litmus (evict standing rules, collapse or drop closed threads) and show the trimmed result
   to the user before continuing, exactly as prune's show-before-overwrite step does.
2. Rewrite the current-state section fresh: do not append below the old entry. State what just
   happened and the true current repo state (branch, head, clean/dirty, what shipped).
3. Rewrite next-up to the true next action.
4. Move any thread that closed this session out of open threads: collapse it to a one-line
   pointer, or drop it if nothing about it is worth keeping.
5. Refresh the stamped header line.
6. Write the file: the trimmed result from step 1 if the trigger fired, otherwise the edited file
   as-is. Either way, this is still one mode: update.

### Prune

Condition to enter this mode on its own: the user asks for a prune pass, separate from writing
today's entry. (An update that hits a fired trigger runs the same disposition inline; see Update
step 1, above.)

1. Dispose of each entry per the litmus: eviction rules below cover standing rules; a thread that
   is already merged, shipped, closed, or decided is collapsed to a one-line pointer or dropped.
2. Evict before you delete. Default disposition for anything that is a standing rule: it MOVES to
   the repo's agent-instruction files, because `HANDOFF.md` is often the only copy of that
   context and deleting it destroys information the litmus says belongs elsewhere, not information
   that has expired. Deletion is reserved for threads that are already merged, shipped, closed, or
   decided, with nothing worth keeping.
3. **Show the trimmed result to the user before overwriting the file**, and say why: pruning is
   lossy, so the user confirms what is relocated versus cut rather than discovering it after the
   fact.
4. Only after that confirmation, write the trimmed file (and the eviction target, if anything
   moved).

## The prune trigger (mechanical, evaluable at a glance)

Fires the moment ANY of the following is true. It is not a judgement call:

- **Size**: the doc is more than 100 lines long (about a screen: the reason for the number, not
  the rule itself).
- **Structure**: the current-state section is not the first thing after the header line.
- **Content**: any entry describes something already merged, shipped, closed, or decided,
  regardless of the words used to describe it.

A deliberate overrun is allowed only when the doc states, under the header, which leg it is
excusing (size, structure, or content) and why. That exception is itself live state, not a
permanent waiver: it does not survive two consecutive updates. The first update after it is
written may honor it; the second update prunes regardless of what the note says.

## Principles

- **The litmus decides placement, once.** Every other rule in this skill is a consequence of it,
  not a second opinion.
- **The trigger is mechanical, not a vibe.** "It still feels useful" is not one of the three
  conditions; if size, structure, or content has tripped, prune runs regardless of how useful the
  content feels.
- **Eviction is the default, deletion is the exception.** Losing a standing rule because it lived
  in the one doc nobody re-reads is a worse failure than a slightly-early prune.
- **Show before you cut.** A lossy operation asks first; it does not apologize after, whether the
  prune runs standalone or inline inside an update.
- **Never create by surprise.** Only scaffold creates the file, per its condition above; update
  and prune both require it to already exist.
- **Ignored is the default, not the only option.** State the tradeoff once and let the team
  override it; do not silently assume everyone wants the same answer.

## Rationalizations (excuses to skip the bar, and the rebuttal)

| Excuse | Rebuttal |
| --- | --- |
| "I'll prune it next time." | The trigger already fired. "Next time" is how every append-only log got that way. |
| "This merged PR is still useful context." | If it is a standing rule, evict it to the agent-instruction files where it survives. If it is not, the PR and the git log already have the full story; a pointer line is enough. |
| "The user can just read the git log." | Git records what changed, never what was being attempted or deliberately left undone. That gap is the entire reason this doc exists. |
| "It's only a few extra lines over the trigger." | The trigger fires at the line: more than 100 lines, no fuzz. A stated, deliberate overrun is the only sanctioned exception, and it expires after the first update that follows the one that stated it. |
| "I didn't have time to update it." | An update pass is short by design: rewrite current-state, next-up, and closed threads. Skipping it is what hands the next agent nothing. |
| "I'll just delete the stale-looking stuff, it's faster." | Delete is for threads that are already merged, shipped, closed, or decided. Anything that reads like a standing rule gets evicted, not deleted, because this may be its only copy. |
| "The doc already exists, I'll scaffold a fresh one to clean it up." | That is a prune, not a scaffold, and it skips the show-before-overwrite step scaffold doesn't have. Pick the mode the condition actually selects. |

## Red flags (stop and fix)

- An entry that is a standing rule, sitting in `HANDOFF.md` past the next prune pass instead of
  being evicted.
- A prune or an overwrite of `HANDOFF.md` with no trimmed-result confirmation shown first,
  whether the prune ran standalone or inline inside an update.
- The current-state section is not the first thing after the header, and no prune has run.
- An entry that is already merged, shipped, closed, or decided, left in place with no stated
  overrun reason, or with a stated reason that has already outlived one update.
- `HANDOFF.md` created without adding (or checking) the ignore-file entry, or created silently by
  a mode other than scaffold.
- The mode was guessed rather than determined by the condition table, especially scaffold-vs-prune.
- An update that left the prune trigger fired without disposing of entries inline.
- Placement reasoning restated inline instead of pointing back to the litmus.

## Done when

- Exactly one mode ran, selected by its stated condition (or the ambiguity was surfaced and asked
  about instead of guessed). An update that pruned inline because the trigger fired still counts
  as one mode: update.
- On scaffold: the file exists from the template, the current-state entry is real (not a
  placeholder), the ignore-file entry is added or confirmed, and the user was told both, including
  the one-line tradeoff.
- On update: the prune trigger was checked first and, if fired, entries were disposed of per the
  litmus and the trimmed result was shown before the write; current-state and next-up are
  rewritten fresh, closed threads are collapsed or dropped, and the stamp is refreshed.
- On prune (standalone): every entry was checked against the litmus, standing rules were evicted
  rather than deleted, the trimmed result was shown and confirmed before the overwrite, and any
  deliberate overrun left in place states its reason and has not outlived one update.

## The artifact (output)

`HANDOFF.md` at the repo root, from this template (the sections are the doc's contract; keep them
in this order and this short):

```markdown
# HANDOFF: live working state

Where we left off, for the next agent (any agent, any day). Standing rules live in the repo's
agent-instruction files, not here (see the litmus). Keep this short and current: prune on the
trigger, don't append forever.

_<date> · by: <agent> · <branch> @ `<short-sha>` (<clean/dirty>)_

## Current state
<One short paragraph: what just happened, what state the repo is in, anything in flight now.>

## Next up
- <What the next agent should pick up first.>

## Open threads
- <In-flight branches / PRs / undecided questions, one line each plus a pointer. Collapsed or
  dropped once closed, per the litmus and the prune trigger.>

## Gotchas
- <Narrative git history alone doesn't capture. Pruned aggressively, evicted when durable.>
```

On scaffold, also: an ignore-file entry for `HANDOFF.md`, and a stated line to the user that it
was added plus the one-line ignored-versus-committed tradeoff.

On prune (standalone or inline inside an update), also: the trimmed result shown for confirmation
before it overwrites the file, and, where anything was evicted, the addition to the repo's
agent-instruction files carrying that content.

## Conventions

- One file, one repo root, one contract: `HANDOFF.md`, matching the template above. No second
  copy, no per-branch variant.
- Ignored by default per working copy; a team that wants it shared commits it deliberately and
  drops the ignore-file entry, having read the one-line tradeoff first.
- Never executes anything: this is a prose discipline, not tooling. No backup, sync, or restore
  step is part of it; if a repo wants durability beyond the working copy, that is a separate,
  explicit decision outside this skill's scope.
- Vendor-neutral throughout: readable and writable by any agent or any human, never assuming a
  specific tool's config layout or a specific person's remote.
