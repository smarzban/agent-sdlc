# ADR-0002 — Coverage-cell links: strip parens, split commas, take the leading id

**Status:** accepted · 2026-07-28 · feature: `checker-silence-eval`

## Context

A Task-to-criterion coverage-map cell (the "Advanced by" column) can carry more than a bare
comma-list of ids: authors annotate a relation inline, e.g. `T-8 (supersedes T-5)` or
`T-7 (write side: T-11, T-12)`. Before this change the extractor scraped every `T-N`/`AC-N` token
anywhere in the raw cell text, parenthetical or not, so an annotation was indistinguishable from a
real link.

The real corpus had already exploited this gap: `repo-setup`'s coverage map carried
`| AC-10 | T-8 (supersedes T-5) |` (and the same for `AC-11`). `T-5` was superseded by `T-8` before
build and carries no `*Advances:*` for either criterion, yet the old scrape read the parenthetical
and fabricated a `T-5 -> AC-10` / `T-5 -> AC-11` link. The checker passed that chain, on a false
statement, for months.

## Decision

A coverage cell links the ids it LISTS, not every id it mentions: strip parenthesized spans first
(depth-counted, an unbalanced `(` strips to the end of the cell rather than throwing), split what
remains on commas, then take each segment's leading id token, and only that, as a link.

**The order is the contract.** Splitting on commas before stripping parens leaves `T-12)` leading
its own segment in `T-7 (write side: T-11, T-12)`, and `T-12)` still starts with a valid id token,
so it would fabricate a link exactly where the annotation, not the list, put it. Strip-then-split
closes that hole; split-then-strip does not.

An id cited anywhere in the cell that produced no link surfaces as a NOTE naming the row and the
id, never a finding, so the author sees it without the exit code moving.

## Consequences

- **Four fabricated links disappear corpus-wide**, all four map-row-only: `enforcement-spine`'s
  `T-12->AC-13` and `T-12->AC-14` (from `T-3, T-7 (write side: T-12)` and
  `T-7 (write side: T-11, T-12)`), and `repo-setup`'s `T-5->AC-10` and `T-5->AC-11`.
- **Cost accepted:** `(write side: T-11, T-12)` and `(supersedes T-5)` are accurate statements of a
  real relation, and this decision demotes both to prose, same as the fabricated ones. The grammar
  cannot tell a true annotation from a false one apart.
- **Erratum it forced:** `repo-setup`'s `T-5` task entry needed an explicit `AC: untraced` marker,
  since its only links were the ones just removed. Contrast the errata that sank the withdrawn
  corroboration rule, which would have deleted accurate annotations; this one only removed a link
  that was never true.
- **Rejected alternative, on scope not merit:** a keyword grammar inside the parenthetical
  (`grounds:`, `write side:`, `supersedes:`) that the checker links at a lower confidence tier. The
  better long-term answer, rejected here only for being a second grammar to design and pin, out of
  proportion to this task; recorded as the follow-up, not a dismissed idea.
