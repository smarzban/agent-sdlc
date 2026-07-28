# Verification report: handoff-skill

Every criterion, and the proof that it holds. Twelve of fourteen are reviewer-checked: this feature
adds no executable code, so the reviews are the bar and the suite is a regression guard.

Green bar at the reviewed head: `node --test checker/*.test.mjs` -> **191/191, exit 0** (read
directly, unpiped). All eight chains under `docs/specs/` exit 0, and this chain passes
`--require ledger`.

The two test-backed rows cite named manual checks, captured verbatim in the build ledger's T-1
evidence block. `handoff-frontmatter-and-scope` covers strict-YAML parseability, `name` matching the
directory, and the standalone scope qualifier. `handoff-portability-search` is the search for vendor
configuration directories, personal remotes, machine-local absolute paths, and spec-tree citations,
which matters here because the source material hardcodes both a vendor directory and a private
remote; the reviewer re-ran it independently.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | reviewer-checked | Is the litmus stated once and referred to elsewhere? PASS, T-1 (`fe4b3ca`): stated once in the method section; the reviewer quoted each other placement site and confirmed reference rather than restatement, after three paraphrase sites (M-2, M-3, M-5) were tightened in the fix round. |
| AC-2 | reviewer-checked | Do exactly three modes each state their selection condition, deterministically? PASS, T-1 (`fe4b3ca`): scaffold, update, prune. The reviewer found one ambiguous state (a session ending against a fired trigger, I-3); the conductor ruled that update always runs the trigger check and prunes inline when it has fired, so no state selects two modes, and an undeterminable mode is stated as ask-do-not-guess. |
| AC-3 | reviewer-checked | Is the prune trigger mechanical and evaluable at a glance? PASS, T-1 (`fe4b3ca`), tightened again in the PR #26 review round's Critical. A single integer (more than 100 lines, now stated as a calibrated backstop against the 83-line motivating incident, with the content leg named as the primary catcher), structure (current-state block not first after the stamp line), and content (an entry describing anything already merged, shipped, closed or decided, with the current-state block itself explicitly exempt). The overrun exception is now mechanically checkable, not merely time-bounded: the note must carry the header's stamp value at write time and is honored only while that stamp still matches the current header; any later update prunes regardless, and rewriting the same leg's note under a fresh stamp is forbidden. |
| AC-4 | reviewer-checked | Does a prune show the trimmed result before overwriting, with the reason? PASS, T-1 (`fe4b3ca`): stated for both the standalone prune and the inline prune inside an update, with the reason given (pruning is lossy). |
| AC-5 | reviewer-checked | Is eviction the default for standing-rule content, with deletion reserved for closed threads? PASS, T-1 (`fe4b3ca`): eviction moves the content to the repo's agent-instruction files, the reason is stated (the doc is often the only copy), and deletion is scoped to threads already merged, shipped, closed or decided. |
| AC-6 | reviewer-checked | Does scaffold add the ignore entry, say it did, and state the tradeoff in one line? PASS, T-1 (`fe4b3ca`): three wrapped lines in the first draft (M-6), reduced to one in the fix round. |
| AC-7 | reviewer-checked | Does the template carry the contracted sections? PASS, T-1 (`fe4b3ca`): stamped header (date, author, branch, head, clean or dirty), current state, next up, open threads, gotchas. |
| AC-8 | test-backed | manual check: handoff-frontmatter-and-scope |
| AC-9 | test-backed | manual check: handoff-portability-search |
| AC-10 | reviewer-checked | Does `repo-setup` seed the template and ignore entry under the existing marker, discoverable by the existing scan? PASS, T-2 (`d7b70a0`): seeded under the same marker, found by the documented scan, with one routing line referring to the litmus. The round's Critical was that the skill's own end-to-end procedure still described the old seed set, self-contradictory in both directions (a false RED from its extract-every-block step, a false GREEN from its literal heredocs); the whole procedure was made consistent, counts and warnings included. |
| AC-11 | reviewer-checked | Does build trigger an update at build entry, only when the doc exists, announced, never creating it, never blocking? PASS, T-3 (`e1e6714`), judged independently of AC-13. Placement confirmed after the ready-to-build verdict and before the first dispatch, resolved against the working copy the run belongs to via `git rev-parse --git-common-dir` (the PR #26 review's M-4: names the mechanic instead of leaving it to "resolve it somehow"). The same round's Important (I-3): a fired prune trigger with no user present used to have no defined path between blocking and violating show-before-overwrite; now the hook writes the entry, defers the prune, and announces one is owed, matching the `handoff` skill's hook-driven case. |
| AC-12 | reviewer-checked | Does the entry-point skill say to read the doc first when present, and what it is for? PASS, T-4 (`cc47ee1`): one routing line in `getting-started`, in the shape its other routing lines use, referring to the handoff skill rather than restating the modes or the trigger. |
| AC-13 | reviewer-checked | Does ship trigger an update at its park step, under the same three conditions, never blocking? PASS, T-3 (`e1e6714`), judged independently of AC-11. Both hooks also carry the conductor's ruling that a hook never asks: an undeterminable mode means skip with an announced reason, since both sit where the user is starting or finishing a long run. PR #26 review round: the hook now runs on every ship completion regardless of the park condition (M-5), the parent-working-copy mechanic is named (M-4), and a fired prune trigger with no user present defers rather than blocks (I-3), same as AC-11. The precondition note also states that a hook-left uncommitted `HANDOFF.md` does not fail ship's clean-tree precondition on a later re-entry (M-6). |
| AC-14 | reviewer-checked | Does the docs surface carry a usage page covering all three modes, linked from the index? PASS, T-4 (`cc47ee1`): `docs/usage/handoff.md`, linked from the docs index, every added link resolving. The round's top finding was an accuracy drift, show-before-overwrite attributed to prune alone, implying an update could overwrite silently; corrected to match the skill. |

## Negative criteria

| Criterion | Held |
| --- | --- |
| NC-1 | No checker rule, no grammar change, `checker/` untouched. |
| NC-2 | No backup, sync or restore mechanism, and no executable file of any kind. |
| NC-3 | Ship's park step is not renamed. |
| NC-4 | No per-task handoff updates during a build. |
| NC-5 | No configuration flag: the doc's existence is the opt-in. |
| NC-6 | No hook creates the doc. Verified per hook by the T-3 review. |
| NC-7 | No stage's artifact changed. Both edited stages' "Done when" and artifact sections compared before and after, untouched. |

## Shortcuts and ceilings

None. No `SHORTCUT(T-N)` was taken.

## What a reader should not over-read

The hooks are documented but unexercised: they were written during the run that would have used
them, so the next build and the next ship are their first live test. And twelve criteria rest on
review rather than on a suite, which is honest for a feature made of prose but is a weaker guarantee
than a green bar. The gate said so before the build started, and it was right: the two largest
findings in the whole run (T-1's hedged trigger and T-2's self-contradicting procedure) were both
things no test could have caught.
