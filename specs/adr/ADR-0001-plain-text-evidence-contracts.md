# ADR-0001 — Plain-text evidence contracts checked by name-appearance

**Status:** accepted · 2026-07-02 · feature: `enforcement-spine`

## Context

The enforcement spine's terminal AC verification (AC-14) must mechanically link each test-backed
proof-map row to proof that its named test actually ran and passed. The obvious alternatives are
(a) parsing test-runner output formats, (b) requiring a machine-readable runner report artifact,
or (c) treating captured plain text as the evidence and checking that the named test identifier
appears in it.

## Decision

(c): green-bar evidence is a fenced plain-text block in the build ledger (command line + output
tail), and the linkage check is **name-appearance** — a test-backed proof-map row passes when its
named test identifier appears in the captured evidence text.

## Consequences

- **Runner-agnostic and zero-dep.** agent-sdlc never declares which test runner a project uses;
  parsing runner formats (a) or mandating report artifacts (b) would couple the checker to a
  format treadmill and break the bare-runtime constraint (AC-12). Name-appearance works on any
  runner whose output names its tests — which is the norm — and stays a pure text check (NC-4).
- **Spoofable by consistent fabrication — accepted.** An agent could paste a test name into a
  fabricated evidence block. The spine's trust model already accepts this: it verifies
  consistency, not truth, and raises the cost of drift (the fabrication must span ledger,
  evidence, commits, and proof map coherently). Truth remains the review panel's job.
- **The format becomes a cross-stage contract.** `build` writes the evidence block, `ship` writes
  the proof map, the checker links them — three writers/readers make this hard to reverse, which
  is why it is recorded here.
- A runner whose output does not name tests forces either a verbose-output flag at green-bar
  declaration time (techstack stage's concern) or a reviewer-checked downgrade for the affected
  criteria — surfaced, never silent.
