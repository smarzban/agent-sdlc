# Visual aids: draw it when seeing beats reading (shared discipline)

The front-half thinking stages can only talk. Some of what they settle is inherently visual: the
shape of components and the data flowing between them, where the trust and failure boundaries fall,
the difference between two candidate structures. Prose makes the user rebuild that picture in their
head, and a picture rebuilt wrong becomes a design defect that survives into the plan, where it is
expensive. This discipline is the sanctioned way to say "this is easier to see than to read" and
draw it. Each stage references this file rather than restating it.

## The visual test

One question decides whether to draw at all:

> **Would the user understand this better by seeing it than reading it?**

Apply it **per question, not per session**. The unit is the single question you are about to ask or
answer, judged on its own. A run may draw five times, once, or never.

**The guard:** a question merely *about* a visual topic does not qualify on that basis alone. "Which
of these two shapes do you want?" reads better drawn. "What should we call this component?" does not,
even though the component appears in a diagram. Test the answer's shape, not the topic's.

## A tool, not a mode

Producing a visual does not route later questions through visuals. There is no drawing mode to enter
or leave. The question after a diagram is re-tested from scratch, and usually the answer is prose.
Momentum is not evidence.

## Two kinds of visual aid

**Spec diagram**: a diagram expressed in the spec's own text, living inline in the spec.

- Committed, diffable, reviewed with the prose it describes, so it rots visibly beside it.
- It is evidence for free: no separate artifact to produce, store, or link.

**Scratch visual**: a standalone rendered page the user opens.

- For comparisons a text diagram cannot express (two candidate shapes side by side).
- Throwaway. Never committed.

**The kind decides persistence.** A spec diagram lives as long as the spec. A scratch visual dies
with the run. Nothing else decides.

## Choosing the kind

**If the picture is worth keeping, it is a spec diagram.** That is the whole rule, and it leaves no
per-run judgment: there is no open "should I save this one?" decision at run time. A scratch visual
is what is left over, a throwaway comparison the spec has no reason to carry.

## Consent gates the scratch visual only

A spec diagram costs the user nothing and never leaves the terminal. Asking permission to write one
is pure ceremony. Draw it.

A scratch visual spends tokens and sends the user somewhere else to look, so it is offered first.

- **The offer is just-in-time.** Make it at the first question that genuinely reads better drawn, as
  a message of its own. Never an upfront ask at stage entry: at entry you do not yet know whether any
  question will need one, so the ask is noise, and it primes the user to expect a mode.
- **A decline is durable.** Honour it for the remainder of the run and never re-ask. A user who said
  no once should not have to keep saying it.

## Degrade loudly, never silently

Where the user cannot view a scratch visual (a terminal-only or remote session, no browser) or the
agent cannot write one (no writable temporary directory), **say so** and fall back: a spec diagram if
a text diagram can carry the picture, otherwise prose. Never a silent skip. This is the same
announced degraded fallback used throughout the pipeline: degrade loud, never quiet. A user who is
never told cannot ask for the fallback they would have wanted.

## The spec diagram format

- **A fenced `mermaid` block**, written inline in the spec, beside the prose it describes.
- **Confine yourself to long-stable core diagram types** (flowchart, sequence). The renderer belongs
  to whatever *reads* the spec (a forge, an editor), not to us, and its version cannot be pinned. A
  newly-added diagram type may therefore render as an error for the very reader the diagram was drawn
  for.

## The scratch visual format

- **ONE self-contained file:** inline CSS and inline SVG. **No JavaScript, no external requests, no
  CDN.** Reaching for a diagram-rendering library in the browser breaks self-containment, adds a
  dependency this pipeline does not carry, and breaks offline use, all at once. Inline SVG is
  sufficient to compare two shapes side by side.
- **Shape:** a simple flex or grid row of panels, one panel per candidate, each with a short heading
  and an inline `<svg>`.
- **Written to the operating system's temporary directory**, never inside the repo. That is what
  makes "never committed" structural rather than something the agent has to remember, and it needs no
  gitignore entry in the user's repo.
