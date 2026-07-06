# evidence-gated-techstack — probe-gated library claims + throwaway spike + in-stack Tech Stack fast-path

## Brief

<!-- source: Linear SMA-399, SMA-464 · ingested 2026-07-05 -->

The 0.10.0 pool's evidence half. "No code until build" forces the design/techstack stages to fake a
certainty they cannot have: research alone demonstrably does not settle library claims (the "pi-ai has
no forced tool choice" claim survived independent research + human verification, then was disproven the
instant build code called the real API — pi-ai 0.80.3 exposes per-call `toolChoice`). This feature adds
a sanctioned way to *reduce uncertainty on a named claim* before build, and makes an unprobed
load-bearing claim visible to the gate.

- **SMA-399 (High) — evidence-gated techstack + spike hatch.** A time-boxed **throwaway spike**
  discipline (spike code is never merged; findings feed `## Design`/`## Tech Stack`/ADRs) and a **probe
  rule**: any load-bearing claim about a library ("supports X", "handles our version", "has API Y") must
  carry a runnable probe — install it, write a minimal script, run it, keep the output, reference it from
  the spec. `## Tech Stack` claims are tagged **verified-by-probe** or **asserted**; an asserted
  load-bearing claim is a gate finding. Guard: spikes reduce uncertainty on named claims, they do not
  pre-build — time-boxed, claim-scoped, deleted after.
- **SMA-464 (Low) — in-stack Tech Stack fast-path.** For a small in-stack feature (zero new products),
  the full Tech Stack section collapses to every-row-"existing" boilerplate carrying ~one bit ("nothing
  new"). Add an explicit fast-path form — "**No new products — reuses the declared stack** (green bar:
  <commands>)" — that satisfies the component→product link for all components at once (a declared claim
  the gate still walks, not an omission).

The boundary that governs the whole feature: the probe **executes at techstack/spike time** — an
interactive, human-in-the-loop stage — never in the gate. The gate and `sdlc-check` stay **read-only**
(the 0.8.0 pivot): the gate *reads* the tag + the kept output, it never re-runs a probe or authenticates
history.

## Acceptance Criteria

<!-- source: Linear SMA-399, SMA-464 · ingested 2026-07-05 -->

All criteria are **reviewer-checked** — this feature is skill/reference prose with no product runtime; the
"green bar" is the checker suite staying green + `sdlc-check` clean on this spec, conformance-verified per
row (mirrors the contract-visibility prose PR). Per the reviewer-checked carrying-task rule, each AC below
still names a carrying task in the plan (the task that produces the prose the reviewer checks).

- **AC-1** — The techstack SKILL body carries a **probe rule**: any load-bearing library claim ("supports
  X", "handles our version", "has API Y") must carry a runnable probe — install → minimal script → run →
  keep the output → reference it from the spec — stated as a checklist step and a principle.
  *(Reviewer-checked — axis: Spec Conformance. Q: does the techstack SKILL body mandate a runnable probe
  for load-bearing library claims, as a step + principle? Justification: prose presence, not automatable.)*
- **AC-2** — A spike-discipline reference doc (`techstack/reference/probing.md`) **exists** and is
  **mandated-at-step** by the techstack SKILL body (read-at-step at the probe step, not merely linked),
  defining the **time-boxed throwaway spike**: spike code is never merged, findings feed
  `## Design`/`## Tech Stack`/ADRs. *(Reviewer-checked — axis: Spec Conformance. Q: does probing.md exist,
  define the throwaway spike, and does the SKILL body mandate reading it at the probe step? Justification:
  cross-file prose structure, not automatable.)*
- **AC-3** — `probing.md` pins three boundary constraints: **(i)** a probe **never mutates the product
  tree** — no dependency added to a product manifest/lockfile; the spike tree is gitignored or deleted and
  only the kept output artifact survives; **(ii)** the spike is **time-boxed** with an explicit box stated
  in the artifact; **(iii)** a `verified-by-probe` tag is a **CLAIM** (consistency-not-truth per ADR-0001)
  — the gate checks tag + output presence/shape, it does not re-run the probe or authenticate its history.
  *(Reviewer-checked — axis: Spec Conformance. Q: do all three constraints (no-product-mutation,
  time-box, claim-not-truth) appear in probing.md? Justification: prose presence, not automatable.)*
- **AC-4** — The `## Tech Stack` **artifact contract** in the techstack SKILL tags each load-bearing
  library claim **`verified-by-probe`** (carrying a reference to the kept probe output) or **`asserted`**.
  *(Reviewer-checked — axis: Spec Conformance. Q: does the techstack artifact section define the two tags
  + the probe-output reference for load-bearing claims? Justification: prose presence, not automatable.)*
- **AC-5** — The **gate** flags an **asserted** (or untagged) load-bearing library claim as a finding
  routed to techstack — added to gate check 4 (verification integrity) + a red flag — and states
  explicitly that the gate reads the **tag + kept-output presence/shape only** and never executes a probe
  (read-only preserved). *(Reviewer-checked — axis: Spec Conformance. Q: does gate check 4 + a red flag
  carry the asserted-load-bearing-claim finding AND the read-only-tag-reading statement? Justification:
  prose presence, not automatable.)*
- **AC-6** — The techstack SKILL defines a sanctioned **in-stack fast-path**: a single declared "**No new
  products — reuses the declared stack** (green bar: <commands>)" form that satisfies the
  component→product link for **all** components at once (a declared claim the gate still walks, not an
  omission), and the **gate walk** recognizes it — framed as **gate-recognized, not a new `sdlc-check`
  rule** (the checker does not walk component→product). *(Reviewer-checked — axis: Spec Conformance. Q: is
  the fast-path form defined in techstack, recognized in the gate walk, and framed as gate-recognized
  rather than a checker rule? Justification: prose presence, not automatable.)*
- **AC-7** — Regression + read-only guard: the checker suite stays green (`node --test
  agent-sdlc/checker/*.test.mjs`) and `sdlc-check` exits 0 on this feature's own spec, and **no
  `sdlc-check.mjs` change** ships in this feature (enforcement is the gate walk, not a checker rule).
  *(Reviewer-checked — axis: Regression. Q: does the suite pass, does `sdlc-check` exit 0 on this spec,
  and is `agent-sdlc/checker/` untouched in the diff? Justification: the green bar is a run-and-read whole
  the reviewer confirms; no per-test name to link.)*

### Negative criteria (out of bounds)

- **NC-1** — This feature adds **no rule to `sdlc-check.mjs`** and no checker grammar that mechanizes
  "load-bearing" — that judgment stays a gate-walk call. (Reviewed at ship.)
- **NC-2** — The probe/spike discipline does **not** introduce execution into the gate or `sdlc-check`;
  those stages stay read-only. (Reviewed at ship.)

## Design

<!-- source: derived from the Acceptance Criteria (skill + reference prose only) · ingested 2026-07-05 -->

No product code; agent-sdlc pipeline-skill prose + one new reference doc change. Changed things are
declared with the structured "outside the checker" form (they are skill/reference texts, not numbered
`### Components`).

### Outside the checker (changed components)

1. **techstack skill text** — `agent-sdlc/skills/techstack/SKILL.md` plus its new reference doc
   `agent-sdlc/skills/techstack/reference/probing.md`: gain the probe rule + mandate-at-step read (AC-1),
   the spike-discipline doc + its three pinned boundary constraints (AC-2, AC-3), the
   verified-by-probe/asserted artifact tags (AC-4), and the in-stack fast-path form (AC-6).
2. **gate skill text** — `agent-sdlc/skills/gate/SKILL.md`: gains the asserted-load-bearing-claim finding
   in check 4 + a red flag + the read-only-tag-reading statement (AC-5), and fast-path recognition in the
   gate walk (AC-6).

### Design decisions (flagged for maintainer ratification)

- **D1 — enforcement is gate-walk, not `sdlc-check`.** "Load-bearing" is a judgment call; mechanizing it
  in the checker would be over-engineering and would drag execution toward a read-only stage. SMA-399's
  own wording ("gate learns to check the tags") is honored as a gate-*walk* check. NC-1 makes this a
  checkable boundary.
- **D2 — probe executes at techstack/spike time only.** The probe runs in an interactive, human-in-the-loop
  stage inside a throwaway spike tree; the gate/`sdlc-check` only read the kept tag + output. This respects
  the 0.8.0 read-only-gate pivot (NC-2). Ratified by the overseer at the PR-A plan checkpoint.
- **D3 — SMA-464 is gate-recognized, not checker-recognized.** `sdlc-check.mjs` does not walk
  component→product (verified against source); the fast-path form is recognized by the gate walk. The
  issue's "checker-recognized" wording is corrected here.

## Tech Stack

<!-- source: inherited — No new products — reuses the declared stack (green bar below) · ingested 2026-07-05 -->

**No new products — reuses the declared stack** (dogfooding SMA-464's fast-path form): the deliverable is
agent-sdlc skill + reference prose, no runtime and no dependency. Green bar for this feature:

- **Tests:** `node --test agent-sdlc/checker/*.test.mjs` (glob) — stays green (no checker source change).
- **Checker (self):** `node agent-sdlc/checker/sdlc-check.mjs specs/evidence-gated-techstack/evidence-gated-techstack.md` → exit 0.
- **Diff guard (AC-7/NC-1):** `agent-sdlc/checker/` unchanged in this feature's diff.

There are no load-bearing library claims in this feature (no library is used), so no `verified-by-probe`
probe is required here — the probe rule this feature *authors* has no in-feature claim to gate.

## Plan

<!-- source: derived from the Acceptance Criteria + the techstack/gate SKILL.md files · ingested 2026-07-05 -->

Four atomic tasks, prose/reference edits. Per-task "green bar" = the checker suite stays green +
`sdlc-check` on this spec exits 0; correctness of the prose is conformance-reviewed (no test harness for
skill prose). AC-7 (regression + read-only guard) is advanced by every task — each keeps the suite green,
the spec checker green, and `agent-sdlc/checker/` untouched.

- **T-1 — Write the spike + probe discipline reference (`probing.md`).** Create
  `agent-sdlc/skills/techstack/reference/probing.md`: the time-boxed throwaway-spike discipline (spike
  code never merged; findings feed Design/Tech Stack/ADRs) and the probe rule (install → minimal script →
  run → keep output → reference), with the three pinned boundary constraints — (i) never mutates the
  product tree, (ii) explicit time-box in the artifact, (iii) verified-by-probe is a claim (ADR-0001), the
  gate reads tag+output only. *Verification (prose):* re-read against AC-2, AC-3.
  *Advances:* AC-2, AC-3, AC-7. *Component:* techstack skill text. *Deps:* none.
- **T-2 — Techstack SKILL body: probe rule + tags + mandate-at-step read (SMA-399).** Add to
  `agent-sdlc/skills/techstack/SKILL.md`: the probe rule as a checklist step + a principle; the
  mandate-at-step read of `probing.md` at that step; the `verified-by-probe`/`asserted` tags in the
  `## Tech Stack` artifact contract (with the kept-probe-output reference); matching rationalization rows +
  a red flag + a done-when line. *Verification (prose):* re-read against AC-1, AC-4.
  *Advances:* AC-1, AC-4, AC-7. *Component:* techstack skill text. *Deps:* T-1.
- **T-3 — Gate SKILL: flag asserted load-bearing claims, read-only (SMA-399).** Add to
  `agent-sdlc/skills/gate/SKILL.md`: check 4 flags an asserted/untagged load-bearing library claim as a
  finding routed to techstack; a red flag; and the explicit statement that the gate reads the tag +
  kept-output presence/shape only and never executes a probe (read-only preserved). *Verification (prose):*
  re-read against AC-5, NC-2. *Advances:* AC-5, AC-7. *Component:* gate skill text. *Deps:* none.
- **T-4 — In-stack Tech Stack fast-path form (SMA-464).** Add the sanctioned "**No new products — reuses
  the declared stack** (green bar: <commands>)" form to `agent-sdlc/skills/techstack/SKILL.md`'s artifact
  contract (satisfies component→product for all components at once, a declared claim), and add its
  recognition to the `agent-sdlc/skills/gate/SKILL.md` walk — framed as gate-recognized, not a new
  `sdlc-check` rule. *Verification (prose):* re-read against AC-6, D3. *Advances:* AC-6, AC-7.
  *Component:* techstack skill text, gate skill text. *Deps:* T-2, T-3.

### Task-to-criterion coverage map

| AC | Advanced by |
| --- | --- |
| AC-1 | T-2 |
| AC-2 | T-1 |
| AC-3 | T-1 |
| AC-4 | T-2 |
| AC-5 | T-3 |
| AC-6 | T-4 |
| AC-7 | T-1, T-2, T-3, T-4 |

### Notes

- T-1 before T-2 (the SKILL body mandates reading `probing.md`, so the doc must exist first). T-4 after
  T-2 + T-3 (it extends both the techstack artifact contract and the gate walk those tasks establish).
- All ACs are reviewer-checked, so **every AC names a carrying task above** — the reviewer-checked
  carrying-task rule this pool pins (SMA-465) applies here: the carrying task is the one that produces the
  prose the reviewer inspects.
