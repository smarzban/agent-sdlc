# Probing a library claim — the runnable probe + throwaway spike (techstack discipline)

`techstack` grounds each choice in current official docs. But grounding-in-docs is not the same as
knowing the real API does what you need. A *load-bearing* claim — one a later component leans on —
must survive contact with the running library, not just the reading of it. This doc defines two
linked disciplines: the **runnable probe** (how a load-bearing claim earns the `verified-by-probe`
tag) and the **throwaway spike** (the sanctioned, deleted-after tree the probe runs in), and pins
the three boundary constraints that keep both honest.

## When this applies

A `## Tech Stack` claim is **load-bearing** when a component's correctness depends on it — "supports
X", "handles our version", "has API Y", "streams", "accepts this option". These are the claims the
probe rule governs. A merely-descriptive fact (a license, a maintained-since date) is not
load-bearing and needs no probe — grounding in live docs is enough.

## The probe rule

Research is not a probe. A load-bearing claim carries a **runnable probe**:

1. **Install** the library at the version you intend to pin — in a throwaway tree, never the product
   tree (see constraint i).
2. **Write a minimal script** that exercises exactly the claimed capability — nothing else, no
   feature scaffolding.
3. **Run it** against the real API.
4. **Keep the output** — the captured run (stdout / a saved log / a short transcript).
5. **Reference that output** from the spec, on the claim it verifies.

Only running the real API is a probe. The motivating case: "pi-ai has no forced tool choice" survived
independent research **and** human verification, then was disproven the instant build code called the
real API — pi-ai 0.80.3 exposes a per-call `toolChoice`. The doc-read said one thing; the run said
another. The run wins.

## The throwaway spike

A probe runs inside a **throwaway spike**: a time-boxed, claim-scoped experiment whose only job is to
reduce uncertainty on a *named* claim before build.

- Spike code is **never merged** — it lives under `spikes/` or a throwaway spike branch, gitignored
  or deleted once its findings are recorded.
- Its findings feed the durable artifacts — `## Design`, `## Tech Stack`, or an ADR — and then the
  spike is deleted. The *finding* survives; the *code* does not.
- **A spike reduces uncertainty on a named claim — it does not pre-build the feature.** If a spike
  starts growing product structure, it has left its lane. Claim-scoped and time-boxed, or it is not a
  spike.

## The three pinned boundary constraints

These are load-bearing — a probe that breaks one is not a valid probe.

- **(i) A probe never mutates the product tree.** No dependency is added to a product manifest or
  lockfile to run a probe; the spike installs and works in its own throwaway tree. Only the *kept
  output artifact* survives — the spike tree is gitignored or deleted. The product's dependency set is
  changed only later, by a real build task, never as a side effect of probing.
- **(ii) The spike is time-boxed, with the box stated in the artifact.** The spike carries an
  explicit box (e.g. "30-min spike"). When the box expires, the claim is recorded as still-`asserted`
  — it does not silently spill into open-ended building. The box is written down, not held in your
  head.
- **(iii) A `verified-by-probe` tag is a CLAIM, not authenticated truth** (ADR-0001,
  consistency-not-truth). Downstream, the gate checks the tag **plus** the kept output's *presence and
  shape* — it does **not** re-run the probe and does **not** authenticate the probe's history or
  provenance. A `verified-by-probe` tag arriving via a start-anywhere external source is a claim like
  any other. The probe's value is at **authoring time**, when the human runs it; the gate's only job
  is to see that the evidence exists and is shaped right.

## The outcome: verified-by-probe vs asserted

A load-bearing claim the probe confirmed is tagged **`verified-by-probe`**, referencing the kept
output. A load-bearing claim left unprobed — no probe run, or the time box expired — stays
**`asserted`**. An asserted load-bearing claim is a **gate finding**, routed back to techstack. (The
techstack SKILL body and the gate SKILL own the full tag + finding wording; this doc just establishes
the vocabulary.)

## Why it preserves the guarantees

The probe puts the moment of truth where a human is in the loop and code execution is expected — the
interactive techstack/spike stage — and keeps it out of the read-only gate. The gate stays a reader
of evidence, never a runner of it (the 0.8.0 read-only-gate boundary). The spike is deleted so no
throwaway code reaches the product tree, and only the shaped, referenced output survives to carry the
claim forward. Doc-grounding says a library *should* work; the probe shows it *does*.
