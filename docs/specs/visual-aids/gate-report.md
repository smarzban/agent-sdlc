# Gate report — visual-aids

Read-only chain walk over `docs/specs/visual-aids/visual-aids.md`, run 2026-07-15 before build, on
branch `feat/visual-aids` @ `3ad163b` (base `main` @ `ba70219`). Nothing has been built yet; this is
the gate's proper position.

Nothing outside this file was modified.

> **Re-run 2026-07-15 (round 2): M-1 and L-1 are CLOSED; verdict unchanged at READY TO BUILD.**
> The Medium was routed to `plan`, fixed there (not by the gate), and this gate re-ran to confirm.
> The oracle now carries a `>= 3` count guard and each pointer-adding task asserts its own expected
> `OK` line by name. Re-verified against the pre-build tree: the guarded oracle now exits **1**
> (`FAIL: expected >=3 pointers (anchor + 2 homes), found 0`) where the unguarded form exited 0 — the
> proof is red before the work and green after, so it can no longer pass vacuously. Round 2 also
> caught a sequencing error in the first attempt at the fix: the `>= 3` guard was initially written
> into T-2's own verification, which would have failed T-2 and T-3 for doing their jobs correctly
> (only three pointers exist after the third lands) and broken the green-between-tasks rule. The
> guard now sits where it belongs — AC-3's ship proof, provable at T-4 — and the per-task checks
> assert their own named `OK` line instead. Checker re-corroborated (exit 0); trace attribution
> re-verified (four distinct owners); leak scan clean. Findings below are retained as the round-1
> record.

## Chain coverage table

Assembled mechanically from the artifacts (design's Criterion -> Component map, tech stack's
Component -> product map, plan's trace fields and coverage map), not by impression.

| Criterion | Component | Product | Task(s) | Gap |
| --- | --- | --- | --- | --- |
| AC-1 | C-1 visual-aid discipline, C-2 getting-started anchor | Mermaid notation / none (prose hook) | T-1, T-2 | — |
| AC-2 | C-3 architecture-design hook, C-4 idea hook | none (prose hooks) | T-3, T-4 | — |
| AC-3 | C-2, C-3, C-4 | none (prose hooks) | T-2, T-3, T-4 | — |
| AC-4 | C-1 | Mermaid notation | T-1 | — |
| AC-5 | C-1 | Mermaid notation | T-1 | — |
| AC-6 | C-1 | self-contained HTML file, OS temp directory | T-1 | — |
| AC-7 | C-1 | Mermaid notation | T-1 | — |
| AC-8 | C-1 | self-contained HTML file | T-1 | — |
| AC-9 | C-1 | none (protocol, prose) | T-1 | — |
| AC-10 | C-1 | none (protocol, prose) | T-1 | — |
| AC-11 | C-1 | self-contained HTML file | T-1 | — |

**Both directions clean.**

- *Forward:* all eleven criteria reach at least one task. No gap.
- *Backward:* all four components are justified by a criterion (C-1 by AC-1 + AC-4..AC-11; C-2 by
  AC-1/AC-3; C-3 and C-4 by AC-2/AC-3). All four tasks trace to a criterion. No orphan, no
  gold-plating.
- *Component -> product:* C-1 carries three products; C-2/C-3/C-4 are declared `none — prose hook in
  an existing document`. A prose hook needs no product, and the declaration is explicit, so this is
  not a gap. The in-stack fast-path was available (zero new dependencies) and **deliberately
  declined** in favour of a per-component map, because the Brief withheld two product choices
  specifically for the tech-stack stage to ratify. The gate reads that as sound: the more explicit
  form, not the weaker one.
- *No fabricated links:* every id cited by a trace resolves to a defined id.

**Corroboration between the two independent coverage mechanisms.** The per-task `*Advances:*` fields
and the Task-to-criterion coverage map were compared row by row and **agree exactly**. This is worth
stating rather than assuming: these two mechanisms parse independently, and the checker's forward
coverage is satisfied by *either*, so a spec can pass with them disagreeing. They do not disagree
here.

## Findings by severity

### Critical — none
### High — none

### Medium

**M-1 — AC-3's oracle is vacuously satisfiable: it passes with zero pointers present.**

*Location:* `## Tech Stack` -> Green bar (the inline link-check command), consumed by `## Plan` T-2,
T-3, T-4 verifications; criterion text at `## Acceptance Criteria` AC-3.

*Issue.* AC-3 reads "every reference to the discipline document ... resolves to an existing file".
The recorded oracle greps for pointers and checks each resolves. With **no** pointers, the loop body
never executes and the command exits 0. The gate ran it against the current tree — nothing built, zero
pointers — and it **exited 0**:

```
pointers found: 0
EXIT: 0   <-- oracle for "the pointer resolves", with ZERO pointers present
```

So the feature's **only test-backed criterion** has a proof that already passes before any work is
done, and cannot distinguish "every pointer resolves" from "there are no pointers". That is precisely
the **inertness** failure the design names as this feature's real failure mode ("a dead pointer and a
bare link fail identically from the user's side: no visual, no error"). The oracle does not catch it.

*Why not High:* it does not block build. The plan's tasks do add the pointers, and AC-2
(reviewer-checked) independently covers hook existence, so the union of AC-2 + AC-3 is complete. The
defect is in the strength of the mechanical proof, not in the plan's executability.

*Why not Low:* AC-3's proof is copied into ship's `verification-report.md` as the AC -> proof map
entry. A proof that cannot fail is fabricated evidence, and this repo's evidence rules exist
precisely to prevent that. **Must be closed before ship records it as proof.**

*Owning stage:* **plan** (the verification text), with a one-line assist from **techstack** (the green
bar records the same command).

*Suggested next action:* assert a minimum pointer count before checking resolution — three are
expected (the anchor plus one per home). That makes the oracle **red before T-2 and green after**,
converting it into a genuine red -> green and closing L-1 below at the same time. Sketch:

```sh
n=$(grep -rnoE '\]\([^)]*visual-aids\.md\)' skills/ --include='*.md' | wc -l)
[ "$n" -ge 3 ] || { echo "FAIL: expected >=3 pointers, found $n"; exit 1; }
```

### Low

**L-1 — All four tasks take the "rare untestable task" exception; the exception is not rare here.**

*Location:* `## Plan`, T-1..T-4.

*Issue.* The task bar allows "the explicit verification for the **rare** untestable task" as an
alternative to a failing test. All four tasks take it — 4/4 is not "rare" on its face.

*Assessment: legitimate, not evasion.* NC-5 ships nothing executable and NC-4 forbids adding a test
under `checker/`, so there is genuinely no runtime to drive; a "failing test" for a Markdown document
would be theatre. Each task names a concrete verification, two of them mechanical commands. The gate
checked whether any task was dodging a testable claim and found none.

*Caveat that keeps this open at Low:* M-1 shows at least one verification (AC-3's) **could** be a
real red -> green and currently is not. Fixing M-1 as suggested also fixes this for T-2/T-3/T-4.

*Owning stage:* **plan.** *Next action:* fold into the M-1 fix; no separate work.

**L-2 — Reviewer-checked density is 10 of 11.**

*Location:* `## Acceptance Criteria`, verification map.

*Issue.* The acceptance-criteria skill lists "more than a few criteria tagged reviewer-checked" as a
red flag.

*Assessment: justified, no action.* The gate independently examined each of the ten and asked whether
it could be driven mechanically. Each is a claim about the **meaning** of instruction prose ("does the
discipline state X"), where a string match proves a sentence is present but not that the rule is
stated — the exact reasoning the shipped `repo-setup` chain recorded when it accepted 10 of 14. Every
one carries its own justification, and the density note names the rejected alternative (a behavioural
probe of the heuristic) and why it was rejected (a judgment cannot be asserted deterministically; the
probe would flake). This is the honest shape for an instruction-prose feature, not a dodge.

*Owning stage:* none. Recorded for the reviewer.

## Provenance / entry-point note

Not a mid-chain entry — the chain was entered at the top (`idea`) and every stage below it is
hand-authored, so **no upstream link is unvetted** and `untraced` is empty.

One section is **materialized from an external source** and is recorded here rather than passed off
as hand-authored:

| Section | Source | Ingested | Marker |
| --- | --- | --- | --- |
| `## Brief` | `linear SMA-586` | 2026-07-14 | well-formed, parsed |

The external source is a private tracker item; the gate reads the marker's presence and shape, not
the source's contents. The Brief's own record notes that concrete formats arrived in the source as an
"inherited leaning" and were deliberately withheld from the Brief for `techstack` to ratify — the
gate verified that this held (see below).

## Stage-boundary check (product-free discipline)

Verified mechanically, because it is this feature's most easily-violated discipline: the `## Brief`,
`## Acceptance Criteria`, and `## Design` sections were scanned for product names (`mermaid`, `html`,
`svg`, `graphviz`, `plantuml`, `CDN`, `/tmp`, `%TEMP%`). **Zero occurrences.** Product names appear
only from `## Tech Stack` onward (24 occurrences). The tech-agnostic boundary held end to end, including
against a source that pre-named the products.

## Verification integrity

- Every test-backed criterion (AC-3 only) names a kind-of-oracle and reaches a task. **But see M-1:**
  the oracle is vacuously satisfiable.
- Every reviewer-checked criterion names a review axis (Spec Conformance throughout) and an explicit
  pass/fail question, and each has a carrying task — including the reviewer-checked ones, which are
  not auto-traced.
- **Green bar declared and concrete**, no placeholders: `node --check checker/sdlc-check.mjs`,
  `node --test checker/*.test.mjs`, plus AC-3's inline command. The gate checked concreteness only and
  did **not** execute the declared bar (runnability is diagnosed at the build baseline); the AC-3
  oracle was run solely to substantiate M-1, which is a read of the spec's own recorded command
  against the current tree, not an execution of the build's green bar.
- **Load-bearing claims: no `asserted` or untagged claim remains.** Two claims are tagged
  `verified-by-probe`; both referenced artifacts are present and well-shaped:

  | Claim | Tag | Kept output | Shape |
  | --- | --- | --- | --- |
  | A `mermaid` fence renders as a diagram on GitHub | `verified-by-probe` | `probes/probe-run-2026-07-15.md` | present, 4232 bytes / 91 lines |
  | Two shapes compare side by side with no dependency | `verified-by-probe` | `probes/scratch-visual-shape-2026-07-15.html` | present, 1805 bytes / 28 lines |

  Per the gate's boundary (consistency-not-truth, ADR-0001) the presence and shape of the referenced
  output is **all** that was checked: the gate did not re-run either probe, did not authenticate their
  history, and treats the tags as claims. Noted for the reader: the probe record states that its own
  first probe **refuted** the naive form of the GitHub claim, and a third claim (scratch-location
  writability) is deliberately left unprobed and untagged with the reason recorded — that is an
  environment property, not a product claim, so it is correctly not a load-bearing tag and not a
  finding.

## Constitution check

**N/A, stated rather than silently skipped.** No `constitution.md` exists at the repo root, so there
is no MUST principle to violate. `CONTEXT.md` terminology was checked instead: all four glossary terms
this feature turns on (**visual aid**, **the visual test**, **spec diagram**, **scratch visual**) are
defined in `CONTEXT.md` and used consistently across the spec (8 / 11 / 22 / 27 uses). No artifact
contradicts another.

## Hygiene

No unresolved TBD, TODO, FIXME, XXX, placeholder, or "decide later" marker anywhere in the spec.

## Checker corroboration (check 6)

**Corroborated — pass.** Resolved per the checker-resolution rule: bare `sdlc-check` is on PATH (first
hit wins), so that form was used.

```
sdlc-check docs/specs/visual-aids/visual-aids.md
sdlc-check 0.15.0: all checks passed — 0 findings, 0 notes.
EXIT: 0
```

No degraded fallback needed; `node` is present. No override taken or required.

**Corroboration caveat the gate records rather than hides.** A green checker run on this spec is
weaker evidence than it appears, and the walk did not lean on it. Forward coverage is satisfied by the
coverage map *independently* of the per-task trace fields, so a spec can pass while its per-task trace
is silently mis-attributed. This spec's earlier draft did exactly that — every task's fields collapsed
onto `T-2` while the checker reported all checks passed. The gate therefore verified trace attribution
directly (four distinct owners, T-1..T-4, each owning its own fields) instead of accepting exit 0 as
proof. The underlying checker behaviour is out of scope here (NC-4 forbids touching `checker/`) and is
filed as field feedback.

## Verdict

**READY TO BUILD.**

No Critical and no High findings; the checker corroborated and did not fail, so no override is
involved. The chain walks end to end in both directions, the stage boundaries held, and both
load-bearing claims are probe-backed with kept output.

Two findings are open and neither blocks build:

- **M-1 (Medium)** — AC-3's oracle passes vacuously. Route to **plan**. Does not block build, but
  **must be closed before ship**, or the verification report will carry a proof that cannot fail.
- **L-1 (Low)** — the untestable-task exception taken 4/4. Route to **plan**; closed by the M-1 fix.
- **L-2 (Low)** — reviewer-checked density 10/11. Justified; no action.

Recommended sequence: fix M-1 at the plan stage and re-run this gate (cheap — one command in two
places), then build. Building first is not wrong, since M-1 bites at ship rather than at build, but
the fix is a two-line change and closing it now keeps ship's evidence honest.
