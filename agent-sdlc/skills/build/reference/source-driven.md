# Source-driven — official docs over training data (implementer discipline)

Framework- and library-specific decisions must be backed by the official docs for the version in
use, not by recollection. Training data goes stale; APIs change; a confidently-remembered signature
is the classic autonomous-run derailment.

## The cycle

1. **Detect the version.** Read the dependency manifest (`package.json`, `pyproject.toml`, `go.mod`,
   `Cargo.toml`, lockfile) to learn the *exact* version of each framework or library the task touches.
2. **Fetch the docs.** Pull the official documentation for that version and that feature — via the
   `context7` MCP (`resolve-library-id` then `query-docs`) where available, or the official docs
   site. Read the specific page, not the whole site.
3. **Implement to the docs.** Follow the documented pattern for the version in hand.
4. **Cite.** For any non-obvious or version-sensitive decision, note the source (and quote the
   relevant line) so the reviewer can check it.

## Rules

- **Never use a framework API from memory** when the version is knowable and the docs are reachable.
  Verify, then write.
- **Official sources only** as the primary reference — the project's own docs, the library's docs.
  Not a blog, not a forum answer, not a model's recollection.
- **Surface conflicts.** If the official docs contradict a pattern already in the codebase, do not
  silently pick one — flag it to the conductor/reviewer with both references and let the decision be
  explicit.
- **Stay scoped.** Fetch the page for the feature you are implementing. Pulling entire doc sites
  wastes context and buries the relevant passage.

## Why it pairs with techstack

The `techstack` stage already recorded which products and versions the feature uses and verified
their current APIs at decision time. Source-driven build is the same instinct carried into
implementation: the stack is fixed, so verify each API against *that* version's docs as you write it.
