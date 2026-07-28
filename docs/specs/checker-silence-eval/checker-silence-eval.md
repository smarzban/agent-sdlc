# checker-silence-eval

## Brief

### Problem / intent

`sdlc-check` has been wrong three times while its own suite was green, and each time the suite was
not merely unhelpful, it was actively reassuring: every one of those runs printed `all checks
passed`. The block splitter mis-attributed a whole section's trace fields to one id; the
`enforcement-spine` AC-14 criterion drew its verification type from the heading of the section that
followed it, and stayed mis-classified for weeks; a coverage-map cell's prose parenthetical
fabricated a link claiming a superseded task advanced a criterion. All three were found by measuring
the real corpus by hand. None was found by the suite.

The suite tests what the checker *reports*. Nothing tests what it stays *silent* about, so the
checker's silence is unfalsifiable, and a rule that quietly stops firing degrades into decoration
without a single test turning red.

This feature builds the apparatus that scores silence, and fixes the one known live defect that
apparatus is built to catch.

### Scope

- A **seeded-defect eval**: for each defect, a minimal spec fixture carrying that defect, plus the
  assertion that `sdlc-check` reports it. A seed the checker misses fails the suite.
- An **expected-miss ledger**: a defect we have consciously chosen not to fix is recorded as an
  expected miss with its reason, and is asserted in BOTH directions. It fails if the checker starts
  detecting it, so the ledger cannot silently rot into a lie either way.
- The **initial seed set**: the three historical defects above, plus fence-blindness (a bold-lead id
  inside a fenced code block opens a block) as the first expected miss.
- **The coverage-map link fix**: a `Task-to-criterion coverage map` cell links only the ids written
  as list entries. Parenthesized spans are stripped first, the cell is then split on commas, and each
  segment contributes its LEADING id only. It lands as a seeded case that goes red, then green.
- **A note when a cell contains an id that produced no link**, so an author who wrote
  `(supersedes T-5)` is told it reads as prose. A note, never a finding: it cannot block.

### Non-goals

- **Extending the grammar so a weaker relation is statable.** `(write side: T-11)` and
  `(supersedes T-5)` are accurate statements of a relation weaker than "advances", and the fix
  demotes both to prose rather than letting a spec say what it means. This is the option the
  withdrawn corroboration rule never considered, and it is the recorded follow-up to this work. It
  needs the eval to exist first, so it can be judged on measurements instead of argument.
- **Fixing fence-blindness.** Seeded as an expected miss, deliberately. Fence-tracking is a new rule
  and no in-tree chain triggers it.
- **A detection-rate score or a standalone corpus runner.** The eval is a citizen of the existing
  `node:test` suite, gating in CI, exit code read directly. A number nobody gates on rots; if we
  later want the number, a reporter over the same data is additive.
- **Committed fixture spec files, or mutation of the real in-tree chains.** See "Resolved key
  decisions".
- **Re-proposing the corroboration rule.** Falsified on its own data at the `explicit-ownership`
  gate. Read that spec's "Withdrawn scope" first.

### Chosen approach

**Seeded defects as `node:test` cases, with a two-directional expected-miss ledger, and the
coverage-map fix as the first seed to flip red -> green.**

Alternatives considered:

- *A standalone scored corpus, advisory.* Closer to the original "score the silence" phrasing, and a
  better research instrument. Rejected as the primary form: nothing gates on an advisory number, so
  it rots exactly like the silence it measures. Additive later.
- *Mutation testing over the real chains.* Highest fidelity, and closest to "seed the defects that
  actually occurred". Rejected: a mutation silently becomes a no-op when the chain's text drifts,
  which is a false green in the one tool built to catch false greens. The realism it buys is already
  bought by the element-wise real-chain assertions in `integration.test.mjs`.

### Resolved key decisions

- **One chain, not two.** The eval and the coverage-map fix ship together. Split, the eval would land
  seeded only with defects that are already fixed, so every case is green on arrival and the
  apparatus never demonstrates it can fail.
- **A seed is a minimal inline fixture string**, matching the existing convention (the
  enforcement-spine plan's "no committed fixture files"). Every defect in scope is a local shape
  reproducible in a few lines.
- **An expected miss is asserted in both directions**: not detected today, and loudly failing on the
  day it becomes detected.
- **Parentheses are stripped before the comma split.** Verified against the corpus rather than
  assumed: `enforcement-spine` carries `T-7 (write side: T-11, T-12)`, so a naive comma split leaves
  the segment `T-12)`, which leads with an id and would still link.
- **Map-derived links WILL disappear, and coverage must be proven unchanged.** `AC-14 -> T-11` and
  `AC-14 -> T-12` are map-derived and go away; T-11 and T-12 carry their own `*Advances:* AC-14`
  fields, so no criterion becomes unreached and no task becomes uncovered. The claim is element-wise
  and falsifiable across all six chains, and the build proves it rather than asserting it.
- **An id that produced no link yields a note, not a finding.** Silently dropping an id the author
  wrote is the failure class this feature exists to remove.

### Glossary terms touched

New: **seeded defect**, **expected miss**, **checker silence**. Existing and reused unchanged:
**definition site**, **block owner**, **id-anchored block**, **corroboration rule** (withdrawn,
retained as a name).

### ADRs

One offered: the coverage-map link rule. It meets the three-part test (hard to reverse, since it is
published grammar users write against; surprising without context, since "ids in parentheses do not
link" reads as arbitrary; a real tradeoff, since fidelity to the author's words is given up to stop
fabricated links). To be written at the design stage, not here.

### Discovered at the acceptance-criteria stage: the fix breaks a shipped chain

`repo-setup` T-5 is superseded by T-8 and its own field reads `*Advances:* none.`, so both of its AC
links come from the cells `T-8 (supersedes T-5)`. Strip the parenthetical and T-5 has no link at
all, backward coverage reports a finding, and that chain stops exiting 0.

The deleted link was **fabricated**: T-5 advances nothing, and the chain was passing on a false
statement. Resolved by erratum on `repo-setup.md` (an `AC: untraced` marker stating the supersession
that is already written in the task's own title), which is the inverse of the errata that sank the
corroboration rule: that one would have deleted accurate annotations, this one replaces a fabricated
link with the truth. Cheap now that the tree holds exemplar chains rather than immutable snapshots
(`01d6f91`).

The alternative, teaching the checker that `(supersedes T-N)` exempts a task from backward coverage,
is grammar extension: the same follow-up this feature defers, and it stays deferred.

## Acceptance Criteria

One term is load-bearing enough to restate inline: a **coverage cell** is the second cell of a row in
a `Task-to-criterion coverage map`, the table whose second column header matches `Advanced by`.

### Coverage-cell links (test-backed)

- **AC-1**: Given a coverage cell `T-8 (supersedes T-5)`, the parsed links from that row are exactly
  `T-8`. An id appearing only inside a parenthesized span contributes no link. *(Verification type:
  **test-backed**, unit.)*
- **AC-2**: Given a coverage cell whose parenthesized span contains a comma,
  `T-7 (write side: T-11, T-12)`, the parsed links are exactly `T-7`. Falsifiable against the naive
  implementation: splitting on commas before stripping parentheses leaves the segment `T-12)`, which
  leads with an id and would link. *(Verification type: **test-backed**, unit.)*
- **AC-3**: Given a plain comma-separated coverage cell `T-2, T-3, T-6`, the parsed links are exactly
  those three ids, in a cell of any length. Regression direction: the fix removes fabricated links
  and never removes authored ones. *(Verification type: **test-backed**, unit.)*
- **AC-4**: Given a coverage cell containing an id token that produced no link, the checker emits a
  **note** naming the row and that id, and the run's exit code is unchanged by it. A note, never a
  finding. *(Verification type: **test-backed**, unit.)*
- **AC-5**: Given a `Criterion-to-component map` whose cells cite components by NAME, every name that
  resolved to a component id before this change still resolves to it. The leading-id rule governs the
  coverage map only and does not reach name resolution. *(Verification type: **test-backed**, unit.)*

### The eval (test-backed)

- **AC-6**: Each seeded defect that the checker is expected to detect is asserted to produce a
  finding naming it, so a checker that stops detecting it fails the suite. The initial detected set is
  the three defects that actually occurred: block-splitter mis-attribution, a verification type drawn
  from the following subheading, and the coverage-cell scrape. *(Verification type: **test-backed**,
  unit.)*
- **AC-7**: Each seeded defect recorded as an **expected miss** is asserted in both directions: it is
  not detected today, and the assertion fails on the day it starts being detected. Falsifiable
  in-flight: the coverage-cell scrape enters the ledger as an expected miss and its own fix must move
  it to the detected set, which is the ledger's second direction firing under real conditions rather
  than in a hypothetical. *(Verification type: **test-backed**, unit.)*
- **AC-8**: Every seed in the corpus is in exactly one of the two states, detected or expected-miss
  with a stated reason. A seed in neither state, or in both, fails the suite: the ledger cannot carry
  a defect whose disposition nobody stated. *(Verification type: **test-backed**, unit.)*

### The real corpus (test-backed)

- **AC-9**: Given the six chains in `docs/specs/`, after this feature every chain exits 0 under the
  CLI, and element-wise no criterion loses its last carrying task and no task loses its last
  criterion. Falsifiable, with the expected deltas named up front and measured before the change:
  exactly four map-derived links disappear, `T-12 -> AC-13` and `T-12 -> AC-14` (`enforcement-spine`,
  36 links -> 34) and `T-5 -> AC-10` and `T-5 -> AC-11` (`repo-setup`, 23 -> 21). No other chain
  changes at all. No criterion loses its last carrier (AC-13 keeps T-3 and T-7, AC-14 keeps T-7 and
  T-11), and the only task losing its last criterion is the superseded T-5, which AC-11's erratum
  covers. Nothing is ADDED: the rule only ever removes links. *(Verification type: **test-backed**,
  integration.)*

### Documentation and erratum (reviewer-checked)

- **AC-10**: The coverage-cell link rule is stated in the skill bodies that publish the grammar, so a
  user's agent writing a coverage map is told that a parenthetical annotates and does not link.
  *(Verification type: **reviewer-checked**, Spec Conformance.)*
- **AC-11**: `repo-setup`'s T-5 carries an `AC: untraced` marker whose reason states the
  supersession, and no other statement in that chain changes. The erratum removes a fabricated link,
  it does not rewrite the record. *(Verification type: **reviewer-checked**, Spec Conformance.)*

### Negative criteria

- **NC-1**: No grammar for stating a weaker relation explicitly. `(write side: …)` and
  `(supersedes …)` become prose. This is the recorded follow-up and re-proposing it here is a scope
  change.
- **NC-2**: No fence-blindness fix. It is seeded as an expected miss on purpose.
- **NC-3**: No standalone corpus runner, no detection-rate score, no new CLI flag. The eval is a
  citizen of the existing `node:test` suite.
- **NC-4**: No committed fixture spec files. Seeds are minimal inline fixture strings.
- **NC-5**: No mutation of the real in-tree chains to generate seeds.
- **NC-6**: No text change to any chain under `docs/specs/` other than AC-11's one-line erratum and
  this feature's own chain.
- **NC-7**: No change to how a trace FIELD's value is captured. `*Advances:* AC-10 (and grounds AC-1)`
  still scrapes; the coverage cell is the only capture path this feature touches.

### Verification map

| Criterion | Oracle kind / review axis |
| --- | --- |
| AC-1 | unit |
| AC-2 | unit |
| AC-3 | unit |
| AC-4 | unit |
| AC-5 | unit |
| AC-6 | unit |
| AC-7 | unit |
| AC-8 | unit |
| AC-9 | integration |
| AC-10 | Spec Conformance |
| AC-11 | Spec Conformance |

### Glossary terms touched

`checker silence`, `seeded defect`, and `expected miss` added to `CONTEXT.md` at the idea stage.
`coverage cell` is defined inline above and is added at this stage.

## Design

No new component kind, no new dependency, no new runtime. The enforcement spine stays trusted
committed code and the skills stay untrusted instructions; this feature adds one pure function inside
the spine, one note on an existing rule path, and a new test file.

### Components

1. **coverage-cell link extractor**: Turns one coverage cell's text into the set of ids it links,
   plus the set of id tokens it mentions without linking. The single definition of what a coverage
   cell links. Kind: a pure string-to-sets function inside the enforcement spine.
2. **seed corpus**: The seeded defects and their dispositions, each a minimal inline spec fixture with
   its expected checker behaviour. Kind: test-side data, colocated with the assertions that read it.

### Outside the checker (changed components)

1. **plan skill text**: publishes the coverage-map grammar a user's agent writes against.
2. **acceptance-criteria skill text**: restates the forward-coverage link sources.
3. **repo-setup spec chain**: the erratum, a one-line untraced marker on T-5.

### Contracts

**coverage-cell link extractor.** In: the raw cell text. Out: `{ links, mentionedNotLinked }`, both
sets of id strings. Method, in this order: strip parenthesized spans, split the remainder on commas,
take each segment's LEADING id token, and report any id token present in the raw cell but absent from
`links` as mentioned-not-linked. Order is the contract, not an implementation detail: comma-splitting
first leaves `T-12)` leading a segment. Errors: never throws on untrusted text; an unbalanced or
unterminated parenthesis strips to end-of-cell, which yields fewer links and never a fabricated one.

**seed corpus.** In: nothing. Out: an ordered list of seeds, each carrying its fixture text, its
disposition (`detected` with the expected finding rule, or `expected-miss` with a stated reason), and
a short description of the real incident it reproduces. A seed with no disposition, or with both, is
an error the suite reports rather than skips.

### Data flow and key state

The extractor sits inside `extractTableTraces`, on the coverage-map arm only. Component maps continue
to resolve names over the whole cell: name resolution is a different mechanism from id linking, and
the leading-id rule does not reach it. Mentioned-not-linked ids travel out as notes through the
existing note channel, so exit-code derivation is untouched.

### Trust and failure boundaries

Spec text is untrusted input; the never-throw contract holds. The failure direction is chosen: on
ragged input the extractor yields FEWER links, so the visible consequence is a coverage finding
(loud) rather than a fabricated link (silent). The eval is the boundary's own check: it holds the
checker to detecting what it claims to detect, and holds the expected-miss ledger to matching
reality in both directions.

### Criterion to component map

| Criterion | Component |
| --- | --- |
| AC-1 | coverage-cell link extractor |
| AC-2 | coverage-cell link extractor |
| AC-3 | coverage-cell link extractor |
| AC-4 | coverage-cell link extractor |
| AC-5 | coverage-cell link extractor |
| AC-6 | seed corpus |
| AC-7 | seed corpus |
| AC-8 | seed corpus |
| AC-9 | coverage-cell link extractor, seed corpus |
| AC-10 | plan skill text, acceptance-criteria skill text |
| AC-11 | repo-setup spec chain |

### ADRs created

`ADR-0002`: the coverage-cell link rule (leading id per segment, parentheses annotate and do not
link). Written at build time as T-5's artifact, recording the fabricated-link evidence, the rejected
grammar-extension alternative, and the erratum it forced.

### Glossary terms touched

`coverage cell` added at the acceptance-criteria stage. No term changes meaning.

## Tech Stack

Fast path: this feature introduces no product choice. Every component is realized by what the repo
already declares and pins.

### Load-bearing claims

- **Runtime: Node >= 22, ESM, zero runtime dependencies.** Unchanged, and already the checker's
  declared stack (`checker/sdlc-check.mjs`, `AGENTS.md`).
- **Test runner: `node:test` with `node --test checker/*.test.mjs`, exit code read directly.**
  Unchanged. The eval is a new file matching that glob, so it is picked up with no manifest edit and
  no CI change.
- **No regex-engine feature beyond what the file already uses.** Parenthesis stripping and comma
  splitting are plain string work over a single cell.

### Unverified / flagged

None. No new product, so nothing needs version-pinning or a probe beyond the suite itself.

### Glossary terms touched

None.

## Plan

Ordering is chosen so every commit is green AND the eval proves it can fail: the eval lands first
with the coverage-cell scrape recorded as an expected miss, the erratum lands before the fix so no
chain is ever red, and the fix then forces the expected-miss entry to move.

### Tasks

- **T-1 - The seeded-defect eval and its ledger.** New `checker/eval.test.mjs`: the seed corpus (three
  historical defects plus fence-blindness and the coverage-cell scrape), the detected assertions, the
  two-directional expected-miss assertions, and the completeness assertion over dispositions. Files:
  `checker/eval.test.mjs` (new). Test-first: the disposition-completeness test, written against an
  empty corpus so it fails, then the corpus fills it.
  *Advances:* AC-6, AC-7, AC-8. *Component:* seed corpus. *Deps:* none.
- **T-2 - Erratum: repo-setup T-5 is untraced, not a carrier.** Add an `AC: untraced (superseded by
  T-8)` marker to T-5's block, changing nothing else in the chain. Lands BEFORE the fix so that chain
  is green at every commit. Files: `docs/specs/repo-setup/repo-setup.md` (edit). Test-first:
  verification is the chain's own exit code, asserted before and after. *Advances:* AC-11.
  *Component:* repo-setup spec chain. *Deps:* none.
- **T-3 - The coverage-cell link extractor.** Add the extractor and wire it into `extractTableTraces`'
  coverage-map arm; emit the mentioned-not-linked note; move the coverage-cell seed from expected-miss
  to detected. Files: `checker/sdlc-check.mjs` (edit), `checker/parser.test.mjs` (edit),
  `checker/eval.test.mjs` (edit). Test-first: AC-2's comma-inside-parentheses case, which fails
  against the naive implementation. *Advances:* AC-1, AC-2, AC-3, AC-4, AC-5. *Component:*
  coverage-cell link extractor. *Deps:* T-1, T-2.
- **T-4 - Real-corpus assertions.** Extend the integration suite: all six chains exit 0, and the
  forward and backward coverage sets are compared element-wise against the pre-change values with the
  four expected deletions named. Files: `checker/integration.test.mjs` (edit). Test-first: the
  element-wise comparison, pinned to values measured before the change.
  *Advances:* AC-9. *Component:* coverage-cell link extractor. *Deps:* T-3.
- **T-5 - Publish the grammar, and the ADR.** State the coverage-cell link rule in the two skill
  bodies that publish the grammar, and write `ADR-0002`. Files: `skills/plan/SKILL.md` (edit),
  `skills/acceptance-criteria/SKILL.md` (edit), `docs/specs/adr/ADR-0002-coverage-cell-links.md`
  (new). Test-first: explicit verification, both skill bodies state the rule and the ADR records the
  evidence, the rejected alternative, and the erratum.
  *Advances:* AC-10. *Component:* plan skill text, acceptance-criteria skill text. *Deps:* T-3.

### Task-to-criterion coverage map

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-3 |
| AC-2 | T-3 |
| AC-3 | T-3 |
| AC-4 | T-3 |
| AC-5 | T-3 |
| AC-6 | T-1 |
| AC-7 | T-1 |
| AC-8 | T-1 |
| AC-9 | T-4 |
| AC-10 | T-5 |
| AC-11 | T-2 |

### Notes

- Seeds are inline fixture strings; no fixture files are committed (NC-4).
- The coverage cells this feature's own plan writes are plain comma-separated lists, so this chain
  does not exercise its own edge case. That is deliberate: the edge cases live in the seeds.
- Blast radius: one function and one call site in the checker, one new test file, two skill bodies,
  one erratum line, one ADR.
