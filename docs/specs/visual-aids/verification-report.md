# Verification report — visual-aids

AC → proof map (ship, 2026-07-15). Branch `feat/visual-aids`, base `main` @ `ba70219`.

Test-backed proofs cite identifiers that appear verbatim in `build-report.md`'s captured green-bar
evidence. Reviewer-checked proofs record the answered pass/fail question from ship's own
Spec-Conformance read of the shipped text (not a subagent's report); the post-PR review gate
corroborates them independently.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | reviewer-checked | Does exactly one document carry the discipline's normative content, with every other mention pointing to it? Yes — `skills/getting-started/reference/visual-aids.md` states all eight rules; the three pointers (getting-started:127, architecture-design:67, idea:36) name it and link it. The anchor's parenthetical labels the doc's sections ("the visual test, the two kinds of visual aid, and the consent protocol") without restating any rule. A restated rationale in the anchor was caught at review and cut. |
| AC-2 | reviewer-checked | Does each of the two homes direct the agent at a named step, mandating rather than linking? Yes — architecture-design at "Propose the component decomposition" and idea at "Diverge", both worded "read … now and apply it here". Both name the step by name, never by number, so renumbering cannot rot the hook. Force parity verified mechanically: both files contain "now and apply it here". A read-only hook in idea was caught at review as weaker-in-force and fixed. |
| AC-3 | test-backed | AC-3 full guarded oracle: count >= 3 |
| AC-4 | reviewer-checked | Is the visual test stated as deciding per question, with the topic-alone guard? Yes — visual-aids.md:16 "Apply it **per question, not per session**", and :19-21 states the guard with a worked contrast ("Which of these two shapes do you want?" vs "What should we call this component?") and the rule "Test the answer's shape, not the topic's." |
| AC-5 | reviewer-checked | Does the discipline deny visual momentum after an accepted offer? Yes — visual-aids.md:23-27 "A tool, not a mode": "Producing a visual does not route later questions through visuals. There is no drawing mode to enter or leave. The question after a diagram is re-tested from scratch… Momentum is not evidence." |
| AC-6 | reviewer-checked | Is each kind's persistence pinned to exactly one answer? Yes — visual-aids.md:31-42: a spec diagram is "Committed, diffable, reviewed with the prose it describes"; a scratch visual is "Throwaway. Never committed." Followed by "The kind decides persistence… Nothing else decides." Never-committed is structural, not remembered: the scratch visual is written to the OS temporary directory (:87-89), outside any repo. |
| AC-7 | reviewer-checked | Can a reader pick the kind from the stated rule without an unanswered judgment call? Yes — visual-aids.md:46-48: "If the picture is worth keeping, it is a spec diagram. That is the whole rule, and it leaves no per-run judgment: there is no open 'should I save this one?' decision at run time. A scratch visual is what is left over." |
| AC-8 | reviewer-checked | Is consent required for exactly the scratch visual, and not for a spec diagram? Yes — visual-aids.md:50-55: "A spec diagram costs the user nothing and never leaves the terminal. Asking permission to write one is pure ceremony. Draw it." versus "A scratch visual spends tokens and sends the user somewhere else to look, so it is offered first." |
| AC-9 | reviewer-checked | Is the offer bound to the first passing question rather than to stage entry? Yes — visual-aids.md:57-59: "Make it at the first question that genuinely reads better drawn, as a message of its own. Never an upfront ask at stage entry", with the reason (at entry you cannot know whether any question needs one, and it primes the user to expect a mode). |
| AC-10 | reviewer-checked | Is a decline scoped to the run, with no re-ask path? Yes — visual-aids.md:60-61: "A decline is durable. Honour it for the remainder of the run and never re-ask. A user who said no once should not have to keep saying it." |
| AC-11 | reviewer-checked | Is the fallback both announced and specified, with silence excluded? Yes — visual-aids.md:63-69 covers both failure modes (the user cannot view: terminal-only or remote, no browser; the agent cannot write: no writable temporary directory), mandates "**say so**", specifies the fallback (a spec diagram if a text diagram can carry the picture, otherwise prose), and excludes silence: "Never a silent skip… degrade loud, never quiet." |

## AC-3 — the test-backed row, in full

The proof identifier above appears verbatim in `build-report.md`'s T-4 evidence block. The oracle is
an inline command run at ship, never a committed script: a committed link-checker would itself be an
executable component and violate NC-5.

It is a genuine red → green, and only because the gate caught it. Gate finding **M-1** showed the
*unguarded* form passed **vacuously**: with zero pointers the resolution loop never executes and exits
0, so this proof would have passed before any work was done and could never have failed. The count
guard (`>= 3`: the anchor plus one per home) fixed it.

```
# BEFORE the pointers existed (pre-build tree)
FAIL: expected >=3 pointers (anchor + 2 homes), found 0
EXIT: 1

# AFTER T-2, T-3, T-4
  OK   skills/idea/SKILL.md -> ../getting-started/reference/visual-aids.md
  OK   skills/getting-started/SKILL.md -> reference/visual-aids.md
  OK   skills/architecture-design/SKILL.md -> ../getting-started/reference/visual-aids.md
EXIT: 0
```

## Negative criteria (not required rows; recorded for the reviewer)

All five hold. NC-4 and NC-5 are mechanically confirmed rather than asserted:

- **NC-1** — no interactive companion: no background process, click-back selection, or live reload
  anywhere in the shipped text. The scratch visual carries **no JavaScript** at all.
- **NC-2** — no visual-aid instruction outside the two homes. The only pointers in the corpus are the
  entry-skill anchor plus the two home hooks (the guarded oracle counts exactly 3). `acceptance-criteria`,
  `techstack`, `plan`, `gate`, `build`, and `ship` gained none. The anchor is deliberately placed
  **outside** the `## Shared operating rules (every stage obeys these)` list (lines 46-92; the anchor
  is at 127), because an entry there would assert the opposite of this non-goal.
- **NC-3** — no product-UI content. Theme-adaptability and ARIA guidance drifted in via the
  conductor's brief and were caught at review as over-build and cut (deviation D-1); what remains is
  structural ("a simple flex or grid row of panels… an inline `<svg>`"), not look-and-feel.
- **NC-4** — no checker or grammar change: `git diff --stat main -- checker/ bin/ package.json` is
  **empty**, and the suite count is **unchanged at 157/157**.
- **NC-5** — no runtime component: same empty diff. Nothing executable, no dependency, no build step,
  no background process. The feature is instruction prose only, which is why AC-3's oracle is an
  inline command rather than a committed script.

## Verification form

Every green-bar reading in this build and at ship followed the repo's discipline: the command's exit
code read **directly and unpiped**, and the suite verdict taken from `node --test`'s machine reporter
(`# pass` / `# fail`), never a scraped human summary.

Re-verified fresh at the ship boundary (2026-07-15):

```
$ node --check checker/sdlc-check.mjs
EXIT: 0

$ node --test checker/*.test.mjs
# tests 157
# pass 157
# fail 0
# cancelled 0
EXIT: 0

$ git diff --stat main -- checker/ bin/ package.json
(empty)
```

## Checker corroboration (pre-PR)

See the PR body's Verification section for the run result.
