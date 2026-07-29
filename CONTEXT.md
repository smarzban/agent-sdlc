# CONTEXT.md: glossary

Canonical vocabulary for this repo's spec chain. Glossary only, no implementation detail.

- **enforcement spine**: the deterministic layer (`sdlc-check` + terminal AC verification) that
  verifies agent-sdlc's mechanical promises with trusted code instead of agent self-assertion.
- **definition site**: a line whose first non-whitespace content, after an optional list marker, is
  a bold-lead id; the place a spec declares that an id exists. Indentation and list markers are
  presentation and never decide whether a line is one.
- **block owner**: the single id (`AC-N`, `C-N`, `T-N`) a parsed block of spec text belongs to;
  every trace field and verification-type declaration inside the block is attributed to it.
- **id-anchored block**: a block whose boundary is set by the identity it declares: it opens at a
  definition site and closes at the next definition site or the next subheading, whichever comes
  first, so ownership never depends on how the text is presented (bulleted, paragraph, indented, or
  otherwise). The subheading half is load-bearing: identity alone does not bound the last id in a
  subsection, which then absorbs the text that follows it.
- **corroboration rule**: *(proposed and withdrawn; retained because the term names the idea)* a
  checker rule over two independent mechanisms describing the same fact, requiring them to agree
  rather than letting either satisfy a check alone. Withdrawn on evidence: its only firings were
  artifacts of a parser limitation, and it could not see the total-trace-loss it was proposed to
  catch.
- **sdlc-check**: the dependency-free checker script committed inside the agent-sdlc plugin;
  parses the consolidated spec and verifies trace, coverage, ledger-vs-git, green-bar evidence,
  and provenance markers. Reports; never edits.
- **AC → proof map**: the ship-produced table mapping each acceptance criterion to the named
  passing test(s) or the answered reviewer check that proves it; published in the PR body.
- **green-bar evidence**: captured output of the declared green-bar command proving it ran and
  passed, as opposed to a ledger assertion that it did; captured as a fenced command + output
  block in the build ledger.
- **verification report**: the ship-written report file beside the spec
  (`docs/specs/<feature>/verification-report.md`) holding the AC → proof map; validated by
  `sdlc-check`, copied into the PR body.
- **public agent file**: the committed `AGENTS.md` at a repo's root: harness-neutral agent
  instructions whose content must be repo-relevant and stranger-readable; carries the routing
  guideline and the pointer to the local overlay.
- **local overlay**: the gitignored `AGENTS.local.md` beside the public agent file: private
  per-working-copy instructions (personal, machine-specific, cross-project), loaded mechanically
  by Claude Code via the import chain and by other harnesses via the prose pointer in the public
  agent file.
- **pointer file**: a frozen one-line shim that routes a harness to the public agent file or
  local overlay (e.g. `CLAUDE.md` = `@AGENTS.md`); never accumulates content and says so in-file.
- **seed marker**: the canonical greppable token (`repo-setup:seed`) repo-setup leaves in
  skeleton files it creates, embedded in each file type's native comment syntax; distinguishes
  "seeded, awaiting fill" from a forgotten TODO and is the contract by which the writing-* skills
  find and fill setup's stubs.
- **visual aid**: a picture the front-half thinking stages produce instead of prose when a
  question is better seen than read; either a spec diagram or a scratch visual. A tool, not a
  mode: producing one never commits the stage to producing more.
- **the visual test**: the per-question heuristic deciding whether to draw at all: *would the
  user understand this better by seeing it than reading it?* A question merely *about* a visual
  topic is not automatically a visual question.
- **spec diagram**: the visual aid expressed in the spec's own text, inline in the spec:
  committed, diffable, and evidence for free because it rots visibly beside the prose it
  describes. The keep-it form ("if the picture is worth keeping, it is a spec diagram").
- **scratch visual**: the visual aid rendered as a standalone page the user opens, for
  comparisons a spec diagram cannot express: throwaway, never committed, and offered for consent
  before first use because it spends tokens and sends the user out of the terminal.
<!-- EXPERIMENT: run-observability. The four glossary entries below (run record, stage boundary,
     harvested signal, feedback item) are this experiment's throwaway vocabulary, not permanent
     terms. Delete all four when the experiment is removed. -->
- **run record**: the structured, append-only account of what a pipeline run cost and what that cost
  bought, one entry per stage boundary and per task. Written by committed code, stored outside the
  repository, and never transmitted anywhere. Distinct from the spec chain, which records what a run
  PRODUCED: the run record is the only place its cost is visible at all.
- **stage boundary**: the point a pipeline stage starts or finishes, and the only place a run record
  is written. Boundaries are where a clock can be trusted: everything between them is model inference
  the pipeline cannot observe directly.
- **harvested signal**: a fact the pipeline already writes into its own artifacts (a deviation, a
  fired tripwire, a review round) collected into the run record automatically rather than re-typed. A
  signal that must be restated by hand is a signal that will be dropped.
- **feedback item**: an evidence-bound report about the PIPELINE ITSELF, not about the work it was
  used on: a command that failed, a documented step that had to be worked around, a doc that
  contradicts the tool. Rare by design, cites the command or the quoted line or it is not written at
  all, and silence is the expected outcome of a run.
<!-- end EXPERIMENT: run-observability -->
- **handoff doc**: the repo-root "where we left off" document the next agent reads to resume, holding
  live state rather than standing rules. Ignored by default (per working copy, so it can be written
  frankly), and distinct from the spec chain: the chain hands a FEATURE forward, the handoff doc hands
  the WORKING COPY forward.
- **live state**: what is true about the work right now and will be wrong next week: an in-flight
  branch, a PR number, the next action, an undecided question. The complement of a standing rule,
  which is true next month and belongs in the repo's agent instructions. This one distinction decides
  every placement question the handoff doc raises.
- **prune pass**: the maintenance pass that keeps a handoff doc trustworthy: closed threads collapse
  to a pointer or go, duplicated sections merge, and the doc is shown before it is overwritten.
  Triggered mechanically (size, structure, or an entry naming something already shipped), never left
  to the moment's judgement, because "prune aggressively" is the instruction every bloated doc was
  already under.
- **eviction**: moving a durable lesson OUT of the handoff doc into the standing rules, rather than
  deleting it. The default disposition when a prune pass finds something true next month, because the
  handoff doc is often the only copy.
- **checker silence**: the checker's failure to report a defect that is present. The complement of
  what a green suite proves: the suite tests what the checker reports, so silence is the part of its
  behaviour that no passing test constrains.
- **seeded defect**: a defect deliberately planted in a minimal spec fixture so the checker's
  detection of it is asserted rather than assumed. The seed set is drawn from defects that actually
  occurred, not from imagined ones.
- **expected miss**: a seeded defect the checker is known NOT to detect, recorded with the reason it
  was left unfixed, and asserted in both directions: it fails if detection is lost from a defect we
  do catch, and equally if an expected miss starts being caught, so the ledger cannot drift out of
  agreement with the checker in either direction.
