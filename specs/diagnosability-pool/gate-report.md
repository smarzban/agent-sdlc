# Gate report — diagnosability-pool

**Verdict: READY TO BUILD.** No Critical or High findings; the mechanical checker corroborated (exit 0).

Light-tier spec (Brief + AC + Plan + a no-new-products `## Tech Stack` fast-path; no `## Design` — no
new component). Mid-chain entry: the plan is materialized from Linear (SMA-480, SMA-482, SMA-483), but
**fully traced** — no `untraced` links.

## Chain coverage

| AC-N | Verification | Component | Product | Task(s) |
| --- | --- | --- | --- | --- |
| AC-1 | test-backed | none (edit of existing checker) | — | T-1 |
| AC-2 | test-backed | none | — | T-1 |
| AC-3 | test-backed | none | — | T-1 |
| AC-4 | reviewer-checked (Spec Conformance) | none (build skill text) | — | T-2 |
| AC-5 | reviewer-checked (Spec Conformance) | none (ship skill text) | — | T-3 |
| AC-6 | reviewer-checked (Regression) | none (manifests) | — | T-4 |

Negative criteria: **NC-1** (version stamp display-only) rides AC-3's oracle; **NC-2** (no checker
rule/grammar change; prose-only skill edits) reviewed at ship. Neither expects its own task/row.

**Both directions clean:** every AC-N reaches ≥1 task; every task (T-1..T-4) advances a defined AC.
No orphan task, no gold-plating, no fabricated `AC-N` reference. `*Component:* none` throughout is the
sanctioned light-tier null marker (no `## Design`, every task a pure edit of an existing surface).

## Checks 1–5

1. **Coverage (both directions)** — PASS (table above; forward + backward complete).
2. **Consistency** — PASS. Terminology (`sdlc-check`, green bar, ledger, `review-gate`, PR head,
   `headRefOid`) matches CONTEXT.md and the existing skills; no artifact contradicts another.
3. **Constitution** — N/A. No `constitution.md` at repo root → no MUST principles to violate.
4. **Verification integrity** — PASS. Test-backed AC-1/2/3 each name their oracle (reporter +
   integration tests) and carry T-1; reviewer-checked AC-4/5/6 each name a review axis (Spec
   Conformance ×2, Regression) and carry a task (SMA-465 rule honoured). The task-to-criterion
   coverage map is complete. The **green bar** is declared and concrete (`## Tech Stack` fast-path:
   `node --test agent-sdlc/checker/*.test.mjs` + repo-checker exit 0 + strict-YAML frontmatter guard +
   manifest parse) — no placeholders.
5. **Hygiene** — PASS. No TBD / placeholder / decide-later markers.

## Mid-chain entry / coverage note

- **Entry stage:** plan (materialized from an external source). Every materialized section
  (`## Brief`, `## Acceptance Criteria`, `## Tech Stack`, `## Plan`) carries a well-formed provenance
  marker citing **Linear SMA-480, SMA-482, SMA-483** (ingested 2026-07-06).
- **Unvetted upstream:** the idea/AC/design stages were not run through the full chain for this small
  pool; the criteria + plan were authored directly from the three Linear issues. No `untraced` links —
  every task traces to a real, defined `AC-N`. Surfaced here, not silently passed.

## Checker corroboration (check 6)

- **Command (repo checker, run directly — never the on-PATH launcher):**
  `node agent-sdlc/checker/sdlc-check.mjs specs/diagnosability-pool/diagnosability-pool.md`
- **Result: PASS — exit 0**, "all checks passed — 0 findings, 0 notes." Exit code read directly (no
  pipe). Corroborates the manual walk.
- Note: the `/agent-sdlc:gate` **skill body** loaded from the 0.7.0 installed-plugin cache — exactly
  the stale-cache skew SMA-480 fixes — so the **repo** checker was invoked directly, per the pool's
  own contract.

## Findings by severity

None. (No Critical / High / Medium / Low.)

## Verdict

**READY TO BUILD.** Proceed to `/agent-sdlc:build`.
