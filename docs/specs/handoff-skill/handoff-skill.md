# handoff-skill

## Brief

### Problem / intent

The pipeline hands a *feature* forward well: the spec chain, the gate report, the build ledger, the
verification report. It hands the *working copy* forward not at all. A session ends and the next
agent, which may be a different agent on a different day, learns nothing about what was in flight,
what was deliberately left undone, or which of two plausible readings of the repo is the current one.
That state is not in git history, because git records what changed and not what was being attempted.

The obvious fix, a "where we left off" doc, has a well-known failure mode: it becomes an append-only
log of merged PRs and shipped features, at which point it is worse than nothing, because it costs a
read and returns stale context. This repo's own such doc had accreted exactly that, under a rule that
already told it to prune aggressively.

So the feature is not "add a doc". It is a skill that keeps one honest: a governing rule for what
belongs in it, a mechanical trigger for when pruning stops being optional, and two pipeline moments
where the doc gets written without anyone having to remember.

### Scope

- **A standalone `handoff` skill**, fifth sibling of the three `writing-*` skills and `repo-setup`,
  usable on any repo independently of the pipeline. Three modes: **scaffold** (no doc yet),
  **update** (write the current entry), **prune** (the doc has bloated).
- **The governing litmus**, stated once: wrong next week -> the handoff doc; true next month -> the
  repo's standing rules (its agent instructions). One line decides every placement question.
- **A ceiling that makes pruning mandatory rather than advisory.** Stated as a trigger, not a hard
  limit: a deliberate, stated overrun is allowed.
- **Eviction, not deletion.** A durable lesson found in the doc moves to the standing rules. The doc
  is often the only copy of a piece of context, so relocation is the default and deletion is for
  genuinely-closed threads.
- **`repo-setup` seeds it**: the template plus the ignore entry, under the existing seed marker.
- **Two pipeline hooks, and only two**: at **build entry** (after the gate returns ready-to-build,
  before the first task is dispatched) and at **ship's park step**. Both act only when the doc already
  exists.

### Non-goals

- **A `sdlc-check` rule.** The doc is prose and its freshness is not mechanically checkable without a
  false-precision proxy like a timestamp comparison. The checker's credibility rests on it asserting
  only what it can prove.
- **Backup or sync plumbing.** The private-mirror script this idea came from hardcodes one vendor's
  config directory and one person's remote, so it fails the stranger litmus. It stays personal
  tooling. If it is ever shipped it needs a configurable remote with no default, a wider secret
  pattern, and a project key that is not the directory basename.
- **Renaming ship's `park` step.** Considered at the idea stage and deliberately deferred: "hand over"
  is clearer to a stranger, but it collides with this feature's own vocabulary (a hand-over step
  beside a handoff doc reads as though the step's job is to write the doc). Recorded so it is not
  re-litigated without answering that.
- **Per-task handoff updates during the build.** That reproduces the append-only log this feature
  exists to prevent, and the build ledger already records per-task state.
- **A committed-by-default variant, or asking at scaffold time.** One default, stated tradeoff.
- **Creating the doc by surprise.** No hook ever scaffolds; presence of the file is the opt-in.

### Chosen approach

**A standalone skill that owns the discipline, seeded by `repo-setup`, triggered at exactly two
pipeline moments, with a ceiling that forces the prune pass.**

The shape mirrors `visual-aids`, which shipped a discipline in one place and hooked it from the two
stages that need it, rather than restating it per stage. The difference is that this one also has an
existence step (scaffold) and a maintenance step (prune), because unlike a drawing decision, the
artifact persists and therefore rots.

Alternatives considered:

- *Litmus and judgement alone*, as the personal skill it came from does. Rejected on this repo's own
  evidence: that instruction was already in force while the doc bloated. A trigger that can be
  evaluated at a glance is what makes the prune pass happen at the moment it is least wanted.
- *Structural forcing*, capping each section to N entries with oldest-out eviction. Rejected: it is
  self-maintaining but arbitrary, and it evicts a live thread for being the fifth.
- *A config flag*, as `linear-sync` has. Rejected: the file's existence is already an unambiguous
  signal, and an off-by-default flag mostly means the feature never runs.

### Resolved key decisions

- **The doc is ignored by default, per working copy.** It rides the public/private instruction split
  the repo already has, and being private is what lets it hold half-formed suspicions, local paths,
  and "I think this is wrong but have not proven it", which is most of its value. The skill states the
  tradeoff in one line so a team can choose otherwise.
- **Pruning is triggered, not advised.** The trigger fires on size (about a screen), on structure (the
  current-state block is not first), or on content (any entry naming a merged PR or a shipped
  feature).
- **A prune shows its result before overwriting.** Pruning is lossy and the user confirms what is
  relocated versus cut.
- **Hooks act only on an existing doc**, and say so when they do. A hook that scaffolds would create a
  file the user never asked for, at the least convenient moment.
- **Two hooks, deliberately.** Build entry is the start of the longest unattended stretch; ship's park
  is the hand-over. A build that dies mid-run cannot be hooked at all, which the build-entry entry
  partly covers by naming the task roster up front.

### Glossary terms touched

New: **handoff doc**, **live state**, **prune pass**, **eviction**. The distinction between live
state and standing rules is the load-bearing one and belongs in `CONTEXT.md` at this stage.

### ADRs

None offered yet. The ignored-by-default decision is the only candidate, and it is reversible by one
line in an ignore file, so it fails the hard-to-reverse leg of the three-part test. The
acceptance-criteria stage may surface one; if it does not, this stays empty.

## Acceptance Criteria

Two terms are load-bearing enough to restate inline. **Live state** is what will be wrong next week;
a **standing rule** is what will still be true next month. The whole discipline is the boundary
between them.

The skill is a standalone sibling of the `writing-*` set and `repo-setup`, so "the skill" below means
its `SKILL.md` plus any reference file it links.

### The skill and its discipline (reviewer-checked)

- **AC-1**: The skill states the live-state versus standing-rule litmus **once**, as a single
  decision a reader can apply without further reading, and every placement instruction elsewhere in
  the skill refers to it rather than restating it. *(Verification type: **reviewer-checked**, Spec
  Conformance.)*
- **AC-2**: The skill defines exactly three modes, each with the condition that selects it: scaffold
  when no handoff doc exists, update to write the current entry, prune when the doc has bloated. A
  reader can tell which mode applies without asking the user. *(Verification type:
  **reviewer-checked**, Spec Conformance.)*
- **AC-3**: The prune trigger is **mechanical and evaluable at a glance**, not a judgement call: it
  fires on size, on structure (the current-state block is not the first thing after the header), or
  on content (an entry naming a merged pull request or an already-shipped feature outside the
  current-state block itself, which the litmus exempts). A deliberate overrun is permitted only
  when the doc states which leg it excuses, why, and the header stamp it was written under; it is
  honored only while that stamp still matches the header, so its lifetime is itself mechanically
  checkable from the file, with no renewal by restating it under a fresh stamp. *(Verification
  type: **reviewer-checked**, Spec Conformance.)*
- **AC-4**: A prune pass shows the trimmed result to the user before overwriting, and the skill says
  why: pruning is lossy. *(Verification type: **reviewer-checked**, Spec Conformance.)*
- **AC-5**: Eviction is the stated default for content that is a standing rule: it moves to the
  repo's agent instructions rather than being deleted, and the skill gives the reason (the handoff
  doc is often the only copy). Deletion is reserved for genuinely-closed threads. *(Verification
  type: **reviewer-checked**, Spec Conformance.)*
- **AC-6**: The scaffold mode adds the ignore entry, tells the user it did, and states the
  ignored-versus-committed tradeoff in one line so a team can choose otherwise. *(Verification type:
  **reviewer-checked**, Spec Conformance.)*
- **AC-7**: The skill carries a template whose sections are the doc's contract: current state, next
  up, open threads, gotchas, plus a stamped header line. *(Verification type: **reviewer-checked**,
  Spec Conformance.)*

### Portability (test-backed)

- **AC-8**: The skill's frontmatter parses as strict YAML, its `name` matches its directory, and its
  description carries the standalone scope qualifier the other standalone skills use, so it triggers
  on its own subject and not inside an unrelated pipeline run. *(Verification type: **test-backed**,
  manual.)*
- **AC-9**: No text in the skill names a specific agent vendor's configuration directory, a personal
  remote, or a machine-local absolute path, and none of it cites this repo's own spec ids or spec-tree
  paths. Falsifiable by search: the skill is the one place where the personal tooling this idea came
  from would leak, since that tooling hardcodes both a vendor directory and one private remote.
  *(Verification type: **test-backed**, manual.)*

### Wiring (reviewer-checked)

- **AC-10**: `repo-setup` seeds the handoff doc and its ignore entry, marked with the same seed
  marker its other templates use, so the existing marker scan discovers it with no separate
  registration. *(Verification type: **reviewer-checked**, Spec Conformance.)*
- **AC-11**: The build stage triggers an update at build entry, after a ready-to-build verdict and
  before the first task is dispatched. It acts only when the doc already exists, announces that it
  did, and never creates it. It never blocks for confirmation: when the prune trigger fires and no
  owed-prune marker exists yet, it writes the entry, defers the prune, and announces that one is
  owed rather than pruning inline or asking. The deferral is capped at one update: if the marker
  is already there from a prior run, the hook writes nothing and announces that the prune has been
  owed since the stamped update instead of restating the marker. *(Verification type:
  **reviewer-checked**, Spec Conformance.)*
- **AC-12**: The pipeline's entry-point skill tells an agent to read the handoff doc first when one is
  present, and says what it is for, so a resuming agent finds it without knowing it exists.
  *(Verification type: **reviewer-checked**, Spec Conformance.)*
- **AC-13**: The ship stage triggers an update at its park step, under the same three conditions:
  only when the doc exists, announced, never creating it, and never blocking for confirmation (the
  same capped, fired-trigger deferral as AC-11, including the second-encounter skip-and-announce
  behavior). Stated separately from AC-11 because the two hooks sit at different moments and
  either can be satisfied while the other is not. *(Verification type: **reviewer-checked**, Spec
  Conformance.)*
- **AC-14**: The repo's docs surface carries a usage page for the skill, covering all three modes and
  linked from the docs index, so the usage coverage ledger closes. *(Verification type:
  **reviewer-checked**, Spec Conformance.)*

### Negative criteria

- **NC-1**: No checker rule, no new checker grammar, and no change to `sdlc-check`. Doc freshness is
  not mechanically checkable without a false-precision proxy.
- **NC-2**: No backup, sync, or restore mechanism, and no executable script of any kind.
- **NC-3**: No rename of ship's park step. Deferred at the idea stage with its reason recorded.
- **NC-4**: No per-task handoff updates during a build.
- **NC-5**: No configuration flag gating the hooks. The doc's existence is the opt-in.
- **NC-6**: No hook creates the doc.
- **NC-7**: No change to what any existing stage produces. The hooks add a step; they alter no
  artifact.

### Verification map

| Criterion | Oracle kind / review axis |
| --- | --- |
| AC-1 | Spec Conformance |
| AC-2 | Spec Conformance |
| AC-3 | Spec Conformance |
| AC-4 | Spec Conformance |
| AC-5 | Spec Conformance |
| AC-6 | Spec Conformance |
| AC-7 | Spec Conformance |
| AC-8 | manual |
| AC-9 | manual |
| AC-10 | Spec Conformance |
| AC-11 | Spec Conformance |
| AC-12 | Spec Conformance |
| AC-13 | Spec Conformance |
| AC-14 | Spec Conformance |

### Glossary terms touched

`handoff doc`, `live state`, `prune pass` and `eviction` were added to `CONTEXT.md` at the idea
stage. No term changes meaning here.

## Design

The pipeline's existing shape holds: skills are instructions, the checker is trusted code, and this
feature adds nothing to the trusted half. It follows the `visual-aids` pattern, one document owning a
discipline and the stages that need it referring to it, with two additions that discipline did not
need: an artifact that persists, and therefore a maintenance mode.

### Components

1. **handoff skill**: Owns the discipline (the litmus, the three modes, the prune trigger, eviction)
   and the template. The single place any of it is stated. Kind: a standalone instruction document.

### Outside the checker (changed components)

1. **repo-setup skill text**: gains the handoff template and ignore entry as a seeded artifact.
2. **build skill text**: gains the build-entry trigger.
3. **ship skill text**: gains the park-step trigger.
4. **getting-started skill text**: gains the read-it-first routing line.
5. **repo docs surface**: gains a usage page, since the repo's docs carry one per user-facing skill.

### Contracts

**handoff skill.** In: the repo's current state (its history, its status, the working copy) plus
whichever mode the invocation selects. Out: a created, rewritten, or pruned handoff doc at the repo
root, and in scaffold mode an ignore entry. Never: an executable script, a network call, or a write
outside the repo root and its ignore file. Failure: if the mode cannot be determined, it says so and
asks, rather than guessing between scaffold and prune, since the two differ in whether they destroy
anything.

**The hooks.** In: the presence of the doc. Out: an update, plus a stated line that it happened.
Never: creation of the doc, and never a prompt that blocks the stage, since both hooks sit at moments
the user is trying to start or finish a long run.

### Data flow and key state

The doc is the only state, and it lives in the working copy rather than in the spec tree, which is the
point: the spec chain hands a feature forward, the handoff doc hands the working copy forward. The
skill reads repository facts (branch, head, clean or dirty, what just landed) to write the current
state block, and reads the doc itself to decide whether the prune trigger has fired.

### Trust and failure boundaries

The doc is ignored by default, so it is the one place a private path or a half-formed suspicion may
be written. That makes the portability boundary load-bearing in the opposite direction from usual:
the *skill* must never carry vendor-specific or machine-local content, precisely because the
artifact it produces will. The failure direction on pruning is chosen: show before overwriting, evict
rather than delete, so the lossy operation is the one that asks.

### Criterion to component map

| Criterion | Component |
| --- | --- |
| AC-1 | handoff skill |
| AC-2 | handoff skill |
| AC-3 | handoff skill |
| AC-4 | handoff skill |
| AC-5 | handoff skill |
| AC-6 | handoff skill |
| AC-7 | handoff skill |
| AC-8 | handoff skill |
| AC-9 | handoff skill |
| AC-10 | repo-setup skill text |
| AC-11 | build skill text |
| AC-12 | getting-started skill text |
| AC-13 | ship skill text |
| AC-14 | repo docs surface |

### ADRs created

None. The idea stage's assessment held through design: the ignored-by-default decision is reversible
by one line, and no other decision here is both surprising and hard to reverse.

### Glossary terms touched

None new at this stage.

## Tech Stack

Fast path: no product choice. Every component is Markdown prose in the existing skills tree, read by
the four harnesses that already auto-discover it.

### Load-bearing claims

- **Skills are plain Markdown to the open `SKILL.md` standard**, and every target harness
  auto-discovers any `skills/` subdirectory containing one, so a new skill needs no manifest edit.
  Unchanged, and already how the repo ships.
- **The seed marker is the existing convention**, so a seeded template needs no separate registration
  and is found by the scan that already runs.
- **No runtime, no dependency, no build step.** Nothing here executes.

### Unverified / flagged

None. No new product, so nothing to pin or probe.

### Glossary terms touched

None.

## Plan

Ordered so the discipline exists before anything points at it: the skill first, then the three
wirings, then the docs surface. Every task is prose, so each names its own explicit verification.

### Tasks

- **T-1 - The handoff skill.** Write `skills/handoff/SKILL.md`: the litmus stated once, the three
  modes with their selection conditions, the mechanical prune trigger, show-before-overwrite,
  eviction as the default disposition, the ignore-by-default rule with its one-line tradeoff, and the
  template. Files: `skills/handoff/SKILL.md` (new). Test-first: explicit verification declared before
  writing (frontmatter parses as strict YAML; name matches the directory; the litmus appears once and
  is referred to elsewhere; the prune trigger names size, structure and content; a search for vendor
  directories, personal remotes, absolute paths and spec-tree citations returns nothing).
  *Advances:* AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9. *Component:* handoff skill. *Deps:* none.
- **T-2 - Seed it from repo-setup.** Add the handoff doc template and its ignore entry to
  `repo-setup`'s seeded artifacts, marked with the existing seed marker, and state the routing rule
  (live state to the handoff doc, standing rules to the instruction files) in one line. Files:
  `skills/repo-setup/SKILL.md` (edit), plus its seed-template reference file. Test-first: explicit
  verification (the marker scan finds the new template; the ignore entry is seeded; the routing line
  cites the litmus rather than restating it).
  *Advances:* AC-10. *Component:* repo-setup skill text. *Deps:* T-1.
- **T-3 - The two hooks.** Add the build-entry trigger (after a ready-to-build verdict, before the
  first dispatch) and the ship park-step trigger. Each acts only when the doc exists, announces that
  it did, and never creates it. Files: `skills/build/SKILL.md` (edit), `skills/ship/SKILL.md` (edit).
  Test-first: explicit verification (each hook states its precondition, its announcement, and the
  never-create rule; neither adds a blocking prompt; no existing artifact changes).
  *Advances:* AC-11, AC-13. *Component:* build skill text, ship skill text. *Deps:* T-1.
- **T-4 - Route to it, and document it.** Add the read-it-first line to `getting-started`, and write
  the usage page the repo's docs carry per user-facing skill. Files:
  `skills/getting-started/SKILL.md` (edit), `docs/usage/handoff.md` (new), plus the usage index entry.
  Test-first: explicit verification (the routing line says what the doc is for and that it is read
  first when present; the usage page covers all three modes; the docs index links it; no dangling
  links).
  *Advances:* AC-12, AC-14. *Component:* getting-started skill text, repo docs surface. *Deps:* T-1.

### Task-to-criterion coverage map

| Criterion | Advanced by |
| --- | --- |
| AC-1 | T-1 |
| AC-2 | T-1 |
| AC-3 | T-1 |
| AC-4 | T-1 |
| AC-5 | T-1 |
| AC-6 | T-1 |
| AC-7 | T-1 |
| AC-8 | T-1 |
| AC-9 | T-1 |
| AC-10 | T-2 |
| AC-11 | T-3 |
| AC-12 | T-4 |
| AC-13 | T-3 |
| AC-14 | T-4 |

### Notes

- T-1 is deliberately large: the criteria it advances are all one document's internal coherence, and
  splitting them across tasks would mean reviewing a discipline in pieces that only make sense whole.
- T-2, T-3 and T-4 are independent of each other and depend only on T-1, so they can run in parallel
  after it.
- Blast radius: one new skill, one new usage page, and one paragraph each in four existing skill
  bodies. Nothing executable, and nothing in the checker.
