# visual-aids

## Brief
<!-- source: linear SMA-586 · ingested 2026-07-14 -->

*Shaped 2026-07-14 (idea stage). Settled intent and scope only; criteria, design, and plan are
later sections.*

### Problem / intent

The front-half thinking stages (`idea`, `architecture-design`) can only talk. Some of what they
settle is inherently visual: component and data-flow shape, trust and failure boundaries, the
difference between two candidate structures. Prose makes the user rebuild that picture in their
head, and a picture rebuilt wrong is a design defect that survives into the plan, where it is
expensive.

The agent has no sanctioned way to say *"this is easier to see than to read"* and draw it. The gap
is narrow and specific: communicating a settled or candidate **shape** while the thinking stages
are still thinking. It is not about producing product UI, and not about the build half.

### Scope & non-goals

**In scope**

- One shared discipline deciding, per question, whether to draw at all: **the visual test**.
- Two kinds of **visual aid**:
  - a **spec diagram**: a diagram expressed in the spec's own text, living inline in the spec; and
  - a **scratch visual**: a standalone rendered page the user opens, for comparisons a text
    diagram cannot express.
- A just-in-time consent offer, before the first scratch visual only.
- Homes: `architecture-design` (primary, its content is the most visual) and `idea` (secondary,
  for framing options and scope).

**Non-goals**

- **An interactive companion.** No background process, no click-back selection, no live reload.
  Deferred; reasons under Chosen approach.
- **`techstack`.** Its comparisons are tabular, which the visual test routes to the terminal.
- **The build half.** `build` and `ship` produce no visual aids.
- **Product UI, mockup polish, look and feel.** The front half is deliberately tech-agnostic, so
  pixel-level design is out of character here and out of scope.
- **Any checker or grammar change.** A visual aid is an aid, not a spine artifact; the
  `AC-N -> C-N -> product -> T-N` chain is untouched.

### Chosen approach

A **two-kind visual aid** governed by one heuristic, with the kind deciding persistence.

Alternatives considered:

1. **In-spec diagrams only.** Simplest and fully portable, but cannot show two candidate shapes
   side by side, which is precisely where seeing beats reading. Too narrow.
2. **In-spec diagrams plus a standalone rendered page (chosen).** Covers both "draw the shape" and
   "compare the shapes". Needs only a file write and something to view it with, so it carries no
   runtime, no background process, and works wherever the pipeline works.
3. **The above plus an interactive companion** (click-to-select, live reload). Adds a real
   capability: the user clicks a choice and the agent reads it back. Rejected *for now*, not on
   principle. Its unique benefit is choosing among visual mockups, which a tech-agnostic front
   half barely does; it needs a background process kept alive per harness, so it would work fully
   on only some targets and degrade to option 2 on the rest; and the terminal already accepts
   "B" as an answer. Cheap to add later behind the same fallback discipline if real runs show it
   is missed.

### Resolved key decisions

- **The visual test decides whether to draw, per question, not per session.** *Would the user
  understand this better by seeing it than reading it?* A question merely *about* a visual topic is
  not automatically a visual question.
- **The kind decides persistence.** A spec diagram is text in the spec: committed, diffable,
  reviewable, and it rots visibly beside the prose it describes, so it is evidence for free. A
  scratch visual is a throwaway comparison aid and is never committed. Rule of thumb: **if the
  picture is worth keeping, it is a spec diagram.** This dissolves the per-run "should I save
  this?" judgment call rather than answering it.
- **Consent gates the scratch visual only.** A spec diagram costs the user nothing and never
  leaves the terminal, so asking permission to write one is pure ceremony. The offer exists
  because a scratch visual spends tokens and sends the user somewhere else to look.
- **The offer is just-in-time, not upfront:** made the first time a question genuinely reads
  better drawn, as a message of its own. A decline is honoured for the rest of the run.
- **A visual aid is a tool, not a mode.** Accepting the offer does not route every later question
  through a visual.
- **Degrade loudly, never silently.** Where the user cannot view a scratch visual, say so and fall
  back to a spec diagram or prose, consistent with the repo's existing invoke-if-present contracts.
- **State the discipline once.** Both stages share it rather than each carrying a copy, following
  the existing precedent for cross-stage discipline.
- **Inherited leaning, for `techstack` to ratify.** The source pre-settles the two kinds as a
  lightweight text diagram notation and a self-contained page. Naming those products is
  `techstack`'s call, not this stage's; recorded here so the leaning is not lost.

### Glossary terms touched

New: **visual aid**, **the visual test**, **spec diagram**, **scratch visual**. Captured in
`CONTEXT.md`.

### ADRs

None. Every decision above fails the three-part test (hard to reverse AND surprising without
context AND a real tradeoff). Deferring the interactive companion is explicitly cheap to revisit,
and the persistence and consent rules are prose rules, changed by editing them.

## Acceptance Criteria

*Written 2026-07-15 on the approved Brief; autonomous run (maintainer's word: approve and continue),
recommended phrasings adopted. The Brief's scope is settled and is not re-litigated here.*

*Clarify-sweep sharpening: the Brief's discipline is one artifact with three rules (the visual test,
the two kinds and their persistence, the consent gate). The criteria below hold the shipped prose to
each rule separately, because each fails independently.*

**Terms pinned inline** (the criteria turn on these; nothing mechanical consumes them, but a reviewer
and the author must read them the same way):

- **the discipline** = the single normative statement of the visual test, the two kinds and their
  persistence, and the consent gate.
- **stated once** = the discipline's normative content appears in exactly one document in the skills
  corpus. Another document may *name* the discipline and point to it; it may not restate its rules.
- **directs** = the stage's SKILL body instructs the agent to apply the discipline at a named step of
  that stage's own checklist, in the mandating form the contracts-in-body rule requires — not a bare
  link (an agent may legitimately never open a doc that is only linked).
- **the two homes** = the `idea` and `architecture-design` stages. Every other pipeline stage
  (`acceptance-criteria`, `techstack`, `plan`, `gate`, `build`, `ship`) is out of the homes.

### Criteria

**AC-1** — Single-source discipline: the discipline is stated once in the skills corpus, and every
other mention of it points to that statement instead of restating its rules.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does exactly one
document carry the discipline's normative content, with every other mention pointing to it?
Justification: restatement is a judgment on prose meaning, not string identity — a grep catches a
copied sentence but not a paraphrase.)*

**AC-2** — Both homes apply it: each of the two homes directs the agent to the discipline at a named
step of its own checklist.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does each of the two
stage bodies direct, as pinned above, rather than merely link? Justification: the difference between
mandating and linking is a reading of instruction force, not a string match.)*

**AC-3** — The pointer resolves: every reference to the discipline document from the skills corpus
resolves to an existing file at the cited path.
*(Verification type: **test-backed** — manual (mechanized link resolution over the corpus, run as a
command at ship). Note: the oracle is a command, not a suite test — a test file under `checker/`
would violate NC-4.)*

**AC-4** — The visual test governs per question: the discipline states the heuristic as re-applied at
each question, with a question merely *about* a visual topic explicitly not qualifying on that basis
alone.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is the test stated as
deciding per question, with the topic-alone guard present? Justification: a per-question-versus-
per-session reading is a semantic judgment over instruction prose.)*

**AC-5** — A tool, not a mode: the discipline states that producing one visual aid does not route
later questions through visuals.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: does the discipline
deny visual momentum after an accepted offer? Justification: same — instruction-prose semantics, no
runtime.)*

**AC-6** — The kind decides persistence: the discipline states that a spec diagram lives inline in
the spec and is committed, and that a scratch visual is never committed.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is each kind's
persistence pinned to exactly one answer? Justification: prose-content judgment.)*

**AC-7** — Kind choice leaves no per-run judgment: the discipline resolves which kind applies by a
stated rule, so no "should I save this one?" decision remains open at run time.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: can a reader pick the
kind from the stated rule without a judgment call the discipline leaves unanswered? Justification:
"leaves a decision open" is a judgment about the rule's completeness, not a string check.)*

**AC-8** — Consent gates the scratch visual only: the discipline requires consent before the first
scratch visual and requires none for a spec diagram.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is consent required
for exactly the scratch visual, and not for a spec diagram? Justification: an exclusivity claim over
instruction prose.)*

**AC-9** — The offer is just-in-time: the discipline states the offer is made at the first question
that passes the visual test, as a message of its own, and never as an upfront ask at stage start.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is the offer bound to
the first passing question rather than to stage entry? Justification: conversational-flow constraint
in an instruction document.)*

**AC-10** — A decline is durable: the discipline states that a declined offer is honoured for the
remainder of the run and not re-asked.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is a decline scoped to
the run, with no re-ask path? Justification: same.)*

**AC-11** — Degrade loudly: the discipline states that where the user cannot view a scratch visual,
the agent says so and falls back to a spec diagram or prose — never silently skips.
*(Verification type: **reviewer-checked** — axis: Spec Conformance. Pass/fail: is the fallback both
announced and specified, with silence excluded? Justification: consistency-of-prose judgment against
the repo's existing invoke-if-present contracts.)*

### Negative criteria (out of bounds — over-engineering is a violation)

**NC-1** — No interactive companion: no background process, no click-back selection, no live reload.
**NC-2** — No visual-aid instruction outside the two homes: `acceptance-criteria`, `techstack`,
`plan`, `gate`, `build`, and `ship` gain none.
**NC-3** — No product-UI content: no mockup polish, no look-and-feel guidance, no pixel-level design.
**NC-4** — No checker or grammar change: `checker/` is unmodified, its suite count is unchanged, and
the `AC-N -> C-N -> product -> T-N` chain is untouched.
**NC-5** — No runtime component: nothing executable, no dependency, no build step, no background
process. The feature ships as instruction prose only.

### Verification map

| Criterion | Oracle kind / review axis |
| --- | --- |
| AC-1 | reviewer-checked — Spec Conformance |
| AC-2 | reviewer-checked — Spec Conformance |
| AC-3 | test-backed — manual (mechanized link resolution) |
| AC-4 | reviewer-checked — Spec Conformance |
| AC-5 | reviewer-checked — Spec Conformance |
| AC-6 | reviewer-checked — Spec Conformance |
| AC-7 | reviewer-checked — Spec Conformance |
| AC-8 | reviewer-checked — Spec Conformance |
| AC-9 | reviewer-checked — Spec Conformance |
| AC-10 | reviewer-checked — Spec Conformance |
| AC-11 | reviewer-checked — Spec Conformance |

*Reviewer-checked density note: 10 of 11 — accepted deliberately, on the same grounds as the
`repo-setup` chain. This feature's entire product is instruction prose governing agent behaviour;
there is no runtime to drive and no materialized artifact to probe, so every criterion carries its
own justification. The one claim that can be driven mechanically (the pointer resolving) is
test-backed. A behavioural probe of the heuristic itself was considered and rejected: whether a given
question "reads better drawn" is a judgment, so such a probe would assert a non-deterministic
outcome and flake.*

### Deferred

None. The interactive companion is a scope non-goal (NC-1), not a deferred criterion — the Brief
records it as cheap to revisit if real runs show it is missed.

### Glossary terms touched

None new. The four terms this feature turns on (**visual aid**, **the visual test**, **spec
diagram**, **scratch visual**) were pinned in `CONTEXT.md` at the idea stage. **the discipline**,
**stated once**, **directs**, and **the two homes** are pinned inline above: they are scaffolding for
reading these criteria, not repo-wide vocabulary, so they do not earn a `CONTEXT.md` entry.

## Design

*Written 2026-07-15. Feature level, against the repo architecture in `docs/specs/overview.md`
(instruction documents at `skills/`, long material in `reference/` subdirs, no runtime — NC-5 keeps
it that way and NC-4 keeps the enforcement spine untouched). Autonomous run; recommended shape
adopted.*

The shape follows the repo's established cross-stage-discipline pattern, verified in-tree rather than
assumed: a shared `reference/` document under the pipeline's entry skill holds the rules, an anchor
in that skill's body scopes the document and mandates reading it, and each consuming stage carries a
one-line hook. The `light-tier` routing is the exact precedent — it is shared but **not** universal,
and it is anchored by a scoped section (`If light tier: read … now`), not by the every-stage rules
list.

**Scope catch driving the shape:** the entry skill's shared-rules list is titled *"every stage obeys
these"*. This discipline has exactly two homes, so an entry there would assert the opposite of NC-2.
The anchor therefore sits outside that list.

### Components

1. **visual-aid discipline** — new reference document under the entry skill's `reference/` directory.
   Single responsibility: state the discipline's normative rules **once** — the visual test, the two
   kinds and their persistence, the kind-choice rule, the consent protocol, and the degrade rule. It
   is the only document in the corpus that states them; every other component names it and points
   here. *Contract in:* a question the stage is about to put to the user, plus the run's consent
   state. *Contract out:* one outcome — prose (terminal, no aid), a spec diagram (text-expressed,
   written inline into the spec), or a scratch visual (consent-gated, written to a scratch location);
   for a scratch visual, the consent protocol runs first. *Errors:* the user cannot view a scratch
   visual -> announced fallback to a spec diagram or prose, never a silent skip.
2. **getting-started anchor** — changed: a scoped anchor in the entry skill's body. Single
   responsibility: name the discipline, state that it applies to exactly the two homes, and mandate
   reading the discipline document rather than merely linking it. *Contract in:* none (document).
   *Contract out:* the discipline's canonical name, its two-home scope, and a resolving pointer to
   the discipline document. *Constraint:* placed **outside** the every-stage shared-rules list, per
   the scope catch above.
3. **architecture-design hook** — changed: a hook in the primary home's body at its
   **component-decomposition proposal step**, where candidate shapes are compared and the recommended
   shape is communicated. Single responsibility: direct this stage's agent to apply the discipline at
   that step. *Contract in:* the stage's own checklist step. *Contract out:* a mandate to read and
   apply the discipline document. *Errors:* none at run time; the failure mode is inertness (below).
4. **idea hook** — changed: the same hook in the secondary home's body at its **divergence step**,
   where approaches and scope are framed. Single responsibility: direct this stage's agent to apply
   the discipline at that step. Contracts as component 3. Secondary by emphasis, identical in force.

*Steps are named, never numbered, in components 3 and 4: the hook must survive the host checklist
being renumbered.*

*Components 2, 3 and 4 are additive — no existing line covers "when to draw", so there is nothing to
displace or merge. The rules-ratchet rule makes appending the exception, so this is the justification
the shipping PR must carry. The budget is deliberately asymmetric: the rules live once in component
1, leaving each host body a hook rather than a copy.*

### Data flow and key state

Run-time (of a stage, in a user's repo): a question forms -> the visual test is applied **to that
question** -> one of three outcomes:

- **prose** — the terminal, default outcome; no aid, nothing written;
- **spec diagram** — a text-expressed diagram written inline into the spec, so it is committed,
  diffable, and reviewed with the prose it describes;
- **scratch visual** — a self-contained rendered page written to a scratch location and opened by the
  user; consent-gated, then discarded.

**The only state this feature introduces is the run's consent state for scratch visuals:** one of
*unasked* / *granted* / *declined*. It is conversational, lives for the run only, and is **never
persisted** — no file, no config, no gitignore entry (NC-5). *Declined* is terminal for the run
(AC-10); *granted* authorizes but never obliges (AC-5). A spec diagram is not state: it is spec
content, and it needs no consent to reach.

**Never-committed is structural, not remembered.** The scratch visual is written **outside the
committed tree**, so AC-6 holds by construction in any repo rather than depending on the agent
remembering not to commit it, or on the user's `.gitignore` carrying an entry this feature cannot
add to someone else's repo. (Considered and rejected: an ignored directory inside the working tree —
it needs a `.gitignore` edit the pipeline cannot guarantee in a user's repo, and it puts a
throwaway file where a careless `git add -A` can reach it. The exact scratch location is a product
detail, deferred to the tech-stack stage.)

### Trust and failure boundaries

- **Untrusted input:** none new. The feature reads no external input and executes nothing; its only
  input is the user's answers, on the same footing as any stage question.
- **Viewing failure (the designed-for case):** the user may be unable to open a scratch visual —
  a remote or headless session, no viewer, or simply declining to leave the terminal. Announced
  fallback to a spec diagram or prose (AC-11), consistent with the repo's existing
  invoke-if-present contracts, which degrade loudly and never silently.
- **Inertness (the real failure mode of this feature):** a hook that only *links* the discipline
  leaves an agent free never to open it, shipping a no-op. This is why components 3 and 4 mandate
  rather than link (AC-2), and why the pointer resolving is the one mechanically driven claim
  (AC-3). A dead pointer and a bare link fail identically from the user's side: no visual, no
  error.
- **Scope leak:** the discipline reaching stages that are not its homes (NC-2). Held by component 2
  stating the two-home scope at the anchor, and by the anchor's placement outside the every-stage
  rules list.
- **Consent failure:** asking upfront rather than at the first passing question (AC-9), or re-asking
  after a decline (AC-10). Held by component 1, which owns the protocol.

### Criterion → Component map

| Criterion | Component(s) |
| --- | --- |
| AC-1 | visual-aid discipline, getting-started anchor |
| AC-2 | architecture-design hook, idea hook |
| AC-3 | getting-started anchor, architecture-design hook, idea hook |
| AC-4 | visual-aid discipline |
| AC-5 | visual-aid discipline |
| AC-6 | visual-aid discipline |
| AC-7 | visual-aid discipline |
| AC-8 | visual-aid discipline |
| AC-9 | visual-aid discipline |
| AC-10 | visual-aid discipline |
| AC-11 | visual-aid discipline |

*Concentration note: AC-4..AC-11 all land on component 1 by design — they are the discipline's own
rules, and "stated once" (AC-1) is precisely the requirement that they share one home. Splitting them
across documents would satisfy the map's shape while violating the criterion it exists to serve.*

### ADRs created

None. The two candidates were tested and both fail the three-part test:

- *Anchoring the discipline outside the every-stage rules list* — surprising without context and a
  real tradeoff (discoverability vs. asserting a false scope), but trivially reversible by moving a
  block of prose. Recorded as the scope catch above.
- *Writing scratch visuals outside the committed tree* — a real tradeoff (discoverability vs.
  never-committed holding by construction), but reversible by editing one sentence. Recorded under
  data flow and key state.

Consistent with the Brief's finding that this feature's decisions are prose rules, changed by
editing them.

### Glossary terms touched

None new. The four terms remain as pinned at the idea stage; this stage adds shape, not vocabulary.

## Tech Stack

*Written 2026-07-15. Feature level, against the repo's declared stack (Markdown skills, no runtime;
zero-dependency bare-`node` ESM only where executable code exists — NC-5 means this feature adds
none). Autonomous run; recommended choices adopted. All doc grounding checked 2026-07-15.*

**The in-stack fast-path is deliberately declined.** This feature adds no dependency and touches no
manifest or lockfile, which is exactly the fast-path's precondition — but the Brief withheld two
product choices *specifically* for this stage to ratify, and collapsing to "No new products — reuses
the declared stack" would silently drop the ratification it was told to make. The choices below are
recorded per component instead. Zero new dependencies is a *finding* here, not a reason to skip.

Only component 1 has product choices. Components 2, 3, and 4 are prose hooks in existing documents:
no product, no stack, nothing to pin.

### Choices

**1. Spec diagram notation -> Mermaid** (current stable 11.16.0, checked 2026-07-15,
<https://mermaid.js.org/intro/>; rendering support per <https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams>).

A text notation inside a fenced block. It adds **no dependency**: authoring a diagram means typing
text into the spec, so the repo's zero-runtime posture is untouched.

- *Claim: a `mermaid` fence in a committed markdown file renders as a diagram on GitHub* —
  **`verified-by-probe`** -> [`probes/probe-run-2026-07-15.md`](probes/probe-run-2026-07-15.md)
  (probes 1-2). Worth reading: the obvious probe **refutes** the naive claim. GitHub's Markdown REST
  API returns only `<div class="highlight highlight-source-mermaid">` with **no SVG** — the markdown
  pipeline does not render diagrams. A real served blob page then showed the actual mechanism: one
  `data-type="mermaid"` render-enrichment container per fence (10 fences -> 10 containers), sourced
  from `viewscreen.githubusercontent.com/markdown/mermaid`. Rendering is client-side enrichment.
  Doc-reading alone would have gotten the *answer* right and the *mechanism* wrong.
- *Why over the alternatives:* **ASCII/Unicode box art** renders literally everywhere including a
  bare terminal, but has no standard, is painful to keep accurate under edits, and diffs badly — and
  the terminal gap it would close is the gap the scratch visual already covers. **PlantUML** and
  **Graphviz/DOT** both need a renderer installed (a jar, a server, or a binary) and neither is
  rendered natively by GitHub, so each would trade a zero-dependency notation for a real one and
  still fail to render where specs are reviewed.

**Carried constraint — the renderer version is the host's, not ours.** We pin no Mermaid version and
*cannot*: GitHub runs its own, and other readers (editors, forges) run theirs. GitHub's own docs
decline to state a version and tell you to query it with the `info` command. The discipline document
must therefore constrain authors to **long-stable core diagram types** (flowchart, sequence) and
away from the newly-added ones the release notes advertise (Kanban, Radar, Architecture, and the
other recent additions) — a diagram that needs a recent renderer is a diagram that may render as an
error for the reader it was drawn for. This constraint is load-bearing for the discipline's content
and is an input to the plan.

**2. Scratch visual format -> a single self-contained HTML file** (HTML5 + inline CSS + inline SVG;
no JavaScript, no external requests). No version to pin: this is the platform, not a library.

- *Claim: two candidate shapes can be compared side by side in one self-contained page with no
  dependency* — **`verified-by-probe`** ->
  [`probes/probe-run-2026-07-15.md`](probes/probe-run-2026-07-15.md) (probe 3), with the probe page
  kept beside it as [`probes/scratch-visual-shape-2026-07-15.html`](probes/scratch-visual-shape-2026-07-15.html).
  1805 bytes, zero external references, parses well-formed. This claim is load-bearing precisely
  because the lazy implementation — pulling a diagram library from a CDN to render Mermaid in the
  browser — would break self-containment **and** NC-5 **and** offline use in one move. The probe
  shows the library is unnecessary: inline SVG does the job.
- *Why over the alternatives:* a **bare `.svg` file** renders but gives no place for the framing
  prose a comparison needs; **markdown** cannot lay two shapes out side by side, which is the one
  thing the scratch visual exists for; **PDF** needs a generator dependency. Mermaid is deliberately
  **not** reused here — it would require its renderer in the browser, which is the CDN dependency
  just rejected.

**3. Scratch location -> the operating system's temporary directory** (`/tmp` on Unix-likes, `%TEMP%`
on Windows). The design fixed the kind ("outside the committed tree"); this is the product.

Chosen because it is outside every repo working tree, so AC-6's "never committed" holds **by
construction** rather than by the agent remembering, and without needing a `.gitignore` entry this
feature cannot add to someone else's repo. *No claim is made that it is always writable* — a
sandboxed or restricted harness may refuse, which is not a gap but the designed path: AC-11 degrades
loudly to a spec diagram or prose. Deliberately **not** tagged `verified-by-probe`: writability is a
property of a user's environment, not of a product, so a probe here would prove only that *this*
machine has a writable `/tmp`.

### Harness portability

The four target harnesses (Claude Code, Cursor, OpenAI Codex, pi) render **neither** choice, and
neither choice asks them to — which is what makes both portable. A spec diagram is text an agent
writes into a file; it is rendered later by whatever reads the spec (GitHub at review time, or an
editor). A scratch visual is a file the user opens in a browser. Nothing is asked of the harness
beyond writing a file, so there is no harness on which the default degrades.

### Green bar (inherited, feature level)

No new commands. The repo's declared bar, which must stay green and — per NC-4 — unchanged in count:

- `node --check checker/sdlc-check.mjs`
- `node --test checker/*.test.mjs`

Plus AC-3's oracle, which is **an inline command run at ship, never a committed script** — a
committed link-checker would itself be an executable component and violate NC-5:

```sh
n=$(grep -rnoE '\]\([^)]*visual-aids\.md\)' skills/ --include='*.md' | wc -l)
[ "$n" -ge 3 ] || { echo "FAIL: expected >=3 pointers (anchor + 2 homes), found $n"; exit 1; }
grep -rnoE '\]\([^)]*visual-aids\.md\)' skills/ --include='*.md' | while IFS= read -r hit; do
  f="${hit%%:*}"; link=$(printf '%s' "$hit" | sed -E 's/.*\]\(([^)]*)\).*/\1/')
  [ -f "$(dirname "$f")/$link" ] && echo "  OK   $f -> $link" || { echo "  DEAD $f -> $link"; exit 1; }
done
```

**The count assertion is load-bearing, not decoration** (gate finding M-1). Without it the command
passes *vacuously*: with zero pointers the loop body never runs and it exits 0. The gate ran the
unguarded form against the pre-build tree and it exited 0 with `pointers found: 0` — a proof that
passes before any work is done, and that cannot tell "every pointer resolves" from "there are no
pointers". That is exactly the **inertness** failure the design names as this feature's real failure
mode, so the one mechanical oracle must be able to catch it. Three pointers are expected: the anchor
plus one per home.

Dry-run 2026-07-15 against the existing `input-resolution.md` pointer (the same shape, a doc that
already exists): 13 pointers, all `OK` — the command shape works before the discipline document
exists to check.

**Where the guard goes green:** the three pointers only exist once all three pointer-adding tasks have
landed, so this full guarded command is **red until the last of them and green after** — a genuine
red -> green, and AC-3's ship proof. It is deliberately *not* each task's own check: asserting `>= 3`
after the first pointer lands would fail a task that did its job correctly and break the
green-between-tasks rule. Each pointer-adding task instead asserts **its own expected `OK` line** by
name, which closes the same vacuity hole per task without demanding a count the task cannot yet reach.

### Component → product map

| Component | Product | Version | Date checked |
| --- | --- | --- | --- |
| visual-aid discipline | Mermaid (spec diagram notation) | 11.16.0 upstream; renderer version is the host's, unpinnable | 2026-07-15 |
| visual-aid discipline | self-contained HTML file (scratch visual format) | HTML5 + inline SVG; no library | 2026-07-15 |
| visual-aid discipline | OS temporary directory (scratch location) | platform | 2026-07-15 |
| getting-started anchor | none — prose hook in an existing document | — | — |
| architecture-design hook | none — prose hook in an existing document | — | — |
| idea hook | none — prose hook in an existing document | — | — |

**Dependencies added: zero.** No manifest, lockfile, or `package.json` is touched. Both choices are
formats rather than installed software, which is why the feature can name products and still satisfy
NC-5.

### Unverified / flagged

- **GitHub's Mermaid renderer version is unknown and unpinnable.** GitHub's docs decline to state it.
  Mitigated, not resolved, by the long-stable-core-types constraint above. Flagged because a future
  Mermaid feature used in a diagram could render as an error for a reader on an older host.
- **Non-GitHub rendering surfaces are not probed.** Probes 1-2 confirm GitHub, the surface where this
  repo's specs are actually reviewed. Editor and other-forge rendering is doc-grounded only (Mermaid
  publishes an integrations list); it was not probed, because the criteria do not lean on it.
- **Scratch-location writability is unprobed by design** (see choice 3): environment, not product.

### Glossary terms touched

None new.

## Plan

*Written 2026-07-15. Autonomous run on the settled criteria, design, and tech stack.*

**Blast radius, measured at plan time:** one new file plus three existing skill bodies. The changed
surface is instruction prose with **no consumers to break** — no code imports it, no test asserts on
it, and the checker does not parse `skills/`. Compile fallout is therefore zero, and each task
finishes green on its own. This is why the tasks map one-to-one onto components: the usual reason to
split (non-local consequences) does not exist here.

**Test-first, for a product with no runtime.** Every task below takes the task bar's stated exception
— *"the explicit verification for the rare untestable task"*. There is no failing test to write
first, because NC-5 ships nothing executable and NC-4 forbids adding a test to `checker/`. Each task
therefore names its explicit verification, run and read before the task is called done. Two of those
verifications are mechanical and are stated as exact commands.

**Standing verification for every task** (run after each; NC-4 and NC-5 are checkable, not
aspirational):

```sh
node --check checker/sdlc-check.mjs
node --test checker/*.test.mjs          # 157/157, exit code read directly, never piped
git diff --stat main -- checker/ bin/ package.json   # MUST be empty: NC-4 + NC-5
```

**Grammar note (learned the hard way, in this section).** Tasks below are **top-level bullets**, and
no task body uses a column-0 `- **bold**` sub-bullet. This is not style. The checker opens a trace
block at `/^-\s+\*\*/` and attributes every trace in that block to the first bold-lead id inside it,
so a `- **bold**` bullet *inside* a task silently steals ownership of the trace fields that follow —
and forward coverage still passes, because the coverage map carries the links independently. The
first draft of this plan did exactly that: all four tasks' fields collapsed onto `T-2` while the
checker reported all checks passed. Sub-bullets inside a task are indented, which is what keeps them
from opening a block.

### Tasks

- **T-1 — Write the visual-aid discipline document.** Create
  `skills/getting-started/reference/visual-aids.md`, stating the discipline's rules **once**: the
  visual test as a per-question heuristic (with the topic-alone guard), tool-not-a-mode, each kind's
  persistence, the kind-choice rule, consent for the scratch visual only, the just-in-time offer, the
  durable decline, and the loud degrade. It must also carry the tech stack's load-bearing content:
  the spec diagram is a fenced `mermaid` block inline in the spec; authors are confined to
  long-stable core diagram types (flowchart, sequence), because the renderer belongs to whatever
  reads the spec and cannot be pinned, so a newly-added type may render as an error for the very
  reader it was drawn for; the scratch visual is one self-contained file (inline CSS, inline SVG, no
  JavaScript, no external requests, no CDN — a browser-side diagram library would break
  self-containment, NC-5, and offline use at once), written to the operating system's temporary
  directory rather than inside the repo, which is what makes "never committed" structural rather than
  remembered.
  *Verification (explicit, untestable task):* the file exists at exactly that path; it is read against
  each rule listed above; the self-containment scan
  `grep -nE "docs/specs/|\bAC-[0-9]|\bNC-[0-9]|\bT-[0-9]|\bC-[0-9]" skills/getting-started/reference/visual-aids.md`
  returns nothing (the generic pipeline grammar is the contract, this chain's ids are not); the
  privacy leak scan over `skills/` returns nothing, run against the private overlay's term list
  (the terms are deliberately not reproduced here — writing them into a public file is itself the
  leak the scan exists to prevent); plus the standing verification.
  *Advances:* AC-1, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11. *Component:* visual-aid discipline. *Deps:* none.
- **T-2 — Anchor the discipline in the entry skill, scoped to its two homes.** Change
  `skills/getting-started/SKILL.md`: name the discipline, state that it applies to exactly the two
  homes, and mandate reading the document rather than linking it. The
  `## Routing: light tier vs full chain` section is the in-tree precedent for both the scoping and
  the mandating form ("read … now").
  *Verification (explicit, untestable task):* the load-bearing check is **placement** — the anchor is
  outside the `## Shared operating rules (every stage obeys these)` list, since an entry there would
  assert the discipline applies to every stage, the opposite of NC-2; the anchor mandates rather than
  links; it does not restate the rules; the pointer check runs the tech stack's link-check resolution
  loop (never a committed script, which would be an executable component) and must print the specific
  line `OK   skills/getting-started/SKILL.md -> …` — assert **that expected line**, not merely exit 0,
  since the loop exits 0 vacuously when it finds nothing; `wc -l` stays under the ~300-line soft
  ceiling (187 before); plus the standing verification.
  *Advances:* AC-1, AC-3. *Component:* getting-started anchor. *Deps:* T-1.
- **T-3 — Hook the discipline into the primary home.** Change
  `skills/architecture-design/SKILL.md`, placing the hook at the **component-decomposition proposal
  step**, named by name and never by number so renumbering cannot rot it.
  *Verification (explicit, untestable task):* the hook mandates applying the discipline at that step
  rather than merely linking it (a link an agent may legitimately never open ships a no-op); it does
  not restate the rules; the link-check resolution loop must print the specific line
  `OK   skills/architecture-design/SKILL.md -> …` — assert that expected line, not merely exit 0;
  `wc -l` stays under the ~300-line soft ceiling (198 before, the tightest of the three, so check it);
  plus the standing verification.
  *Advances:* AC-2, AC-3. *Component:* architecture-design hook. *Deps:* T-1.
- **T-4 — Hook the discipline into the secondary home.** Change `skills/idea/SKILL.md`, placing the
  hook at the **divergence step**, named by name and never by number.
  *Verification (explicit, untestable task):* the hook mandates applying the discipline at that step,
  in the same form as T-3 — secondary by emphasis, identical in force; it does not restate the rules;
  the link-check resolution loop must print the specific line `OK   skills/idea/SKILL.md -> …` —
  assert that expected line, not merely exit 0. **T-4 is also where AC-3's full ship oracle first
  becomes provable:** this is the task that brings the corpus to the three expected pointers, so run
  the complete guarded command (count `>= 3` **plus** resolution) here and confirm it passes — it is
  red before this task and green after, which is the red -> green the earlier tasks cannot have.
  `wc -l` stays under the ~300-line soft ceiling (138 before); plus the standing verification.
  *Advances:* AC-2, AC-3. *Component:* idea hook. *Deps:* T-1.

### Task-to-criterion coverage map

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-1, T-2 |
| AC-2 | T-3, T-4 |
| AC-3 | T-2, T-3, T-4 |
| AC-4 | T-1 |
| AC-5 | T-1 |
| AC-6 | T-1 |
| AC-7 | T-1 |
| AC-8 | T-1 |
| AC-9 | T-1 |
| AC-10 | T-1 |
| AC-11 | T-1 |

*AC-1 is carried by T-1 (which creates the single statement) and T-2 (which establishes the
name-and-point form the other mentions follow). T-3 and T-4 cannot advance it further, but they can
break it, so "does not restate the rules" is an explicit verification on each rather than a trace
claim. (Written without the literal field token, which the checker would otherwise scrape from this
prose into a spurious empty trace — the same lesson as the grammar note above.)*

### Notes for the build agent

- **Order:** T-1 first and alone — T-2, T-3, and T-4 each point at the document it creates, so their
  pointer check cannot pass before it exists. After T-1, the three are independent of each other.
- **Commit convention:** `feat(T-N): …`, scope position, one commit per task (the recorded-commit
  rule matches on the scope position).
- **The rules-ratchet justification must reach the PR body.** T-2, T-3, and T-4 all *append* rather
  than displace or merge, which the ratchet rule makes the exception needing justification. The
  justification: no existing line in any of the three bodies covers *when to draw*, so there is
  nothing to displace or merge. Budget is held instead by stating the rules once in T-1 and giving
  each host a hook rather than a copy.
- **Deliberately not tasks** (each would trace to no criterion, which is the definition of
  gold-plating here): no user-facing docs page for the capability, no `CHANGELOG` entry (a release
  step, not a build task), no `CONTEXT.md` or `overview.md` edit (both landed at the idea stage). A
  user-facing usage doc is a reasonable follow-up, but no criterion asks for one and this feature
  will not smuggle it in.
- **Known checker quirk, do not fix (NC-4):** the reviewer-checked carrying-task hint under-fires on
  this spec because verification-type detection only reads bulleted criteria, and these are bold-lead
  paragraphs. It sharpens a message and never changes a verdict; forward coverage is still enforced
  for all eleven criteria. Filed as field feedback, out of scope here.
