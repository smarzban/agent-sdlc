# Verification report: checker-silence-eval

Every criterion, and the proof that it holds. Test names are the exact titles the suite prints;
reviewer-checked rows carry the question that was answered, the verdict, and the evidence.

One test per row, named verbatim. AC-7's second direction (an expected miss that starts being
detected) is evidenced by the coverage-cell seed itself: it entered the ledger at T-1 as an expected
miss and T-3's fix forced it to move, which is the ledger firing under real conditions rather than in
a hypothetical. The build ledger records that move.

Green bar at the reviewed head: `node --test checker/*.test.mjs` -> **191/191, exit 0** (read
directly, unpiped). All seven chains under `docs/specs/` exit 0 under the CLI.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | test-backed | an id cited only inside a parenthesized span contributes no link (AC-1) |
| AC-2 | test-backed | a comma inside a parenthesized span does not fabricate a link (AC-2, order is the contract) |
| AC-3 | test-backed | a plain comma-separated coverage cell links every id, regardless of cell length (AC-3) |
| AC-4 | test-backed | a coverage-cell id token that produced no link surfaces as a note naming the row and that id, never a finding (AC-4) |
| AC-5 | test-backed | a Criterion-to-component map cell keeps scanning the whole cell for a component name; the leading-id rule does not reach it (AC-5) |
| AC-6 | test-backed | block-ownership-coverage (detected), coverage-cell-scrape (detected), verification-type-absorption (detected) |
| AC-7 | test-backed | fence-blindness (expected-miss), coverage-cell-scrape (detected) |
| AC-8 | test-backed | AC-8: every seed states exactly one disposition, detected or expected-miss with a non-empty reason |
| AC-9 | test-backed | AC-9: no criterion loses its last carrying task, and no task loses its last criterion (every real chain) |
| AC-10 | reviewer-checked | Do the skill bodies that publish the grammar now state what a coverage cell links, and does each published claim match the implementation? PASS, T-5 (`c624db0`): `skills/plan/SKILL.md` states the list-entry rule, the annotating parenthetical, the tolerated leading decoration, the prose-join case, and the note; `skills/acceptance-criteria/SKILL.md` carries the one clause it needs as a citer of link sources. The reviewer verified all five claims against `checker/sdlc-check.mjs` by reading the functions and by focused probe, and narrowed one over-claim about tolerated Markdown decoration to what the code actually does. The now-misleading "literal `T-N` tokens" wording was corrected. Skill text stays self-contained: no dogfood spec id and no `docs/specs/` path appears in it. |
| AC-11 | reviewer-checked | Does `repo-setup` T-5 carry an untraced marker stating the supersession, with nothing else in that chain changed? PASS, T-2 (`7836091`): the diff is one marker appended to T-5's block, `AC: untraced (superseded by T-8, the contract T-5 named was completed there, so T-5 advances nothing)`. Attribution proven rather than assumed: the parsed marker's `from` is `T-5`. That chain exits 0 both before and after. No coverage cell, no task text, and no other task was touched. |

## Negative criteria

| Criterion | Held |
| --- | --- |
| NC-1 | No weaker-relation grammar. `(write side: …)` and `(supersedes …)` are prose. ADR-0002 records the rejection as scope, not merit. |
| NC-2 | Fence-blindness unfixed, and seeded as an expected miss. |
| NC-3 | No standalone runner, no score, no new CLI flag. The eval is a `node:test` file picked up by the existing glob. |
| NC-4 | No committed fixture files. Every seed is an inline string. |
| NC-5 | No mutation of real chains to generate seeds. |
| NC-6 | The only chain text changed outside this feature's own is AC-11's one-line erratum. |
| NC-7 | Trace FIELD capture untouched. This spec tripped over that very behaviour at its own gate, and it stays a recorded follow-up. |

## Shortcuts and ceilings

None. No `SHORTCUT(T-N)` was taken.

## What a reader should not over-read

The eval scores four seeds, not the checker's whole surface. It makes silence falsifiable where a
defect actually occurred; it does not claim the checker is now correct everywhere. The corpus is
designed to grow, and the expected-miss ledger is the mechanism that keeps a known blind spot written
down instead of forgotten.
