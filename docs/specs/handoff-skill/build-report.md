# Build report: handoff-skill

Branch `feat/handoff-skill`. All four tasks done, reviewed, and green.

## Agent-type roster (pinned at build start)

`implementer`, `reviewer` and `fixer` agent types are registered in this working copy and were used
for their matching roles.

## Isolation

The build ran on branch `feat/handoff-skill` in the maintainer's working copy, branched from `main`
at `472d6c1` (the 0.16.0 release commit). T-2, T-3 and T-4 ran concurrently after T-1 landed; each
touches a disjoint file set and each subagent was told which files were not its own. Every green bar
below is the conductor's own run.

## Baseline

`node --test checker/*.test.mjs` -> **191/191, exit 0** (read directly, unpiped). All seven existing
chains exited 0. This feature adds nothing executable, so the suite is a regression guard here rather
than the quality bar: twelve of fourteen criteria are reviewer-checked, and the reviews ARE the bar.

## Task ledger

| Task | Status | Commit | AC advanced | Notes |
| --- | --- | --- | --- | --- |
| T-1 | done | `fe4b3ca` | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9 | 1 Critical, 4 Important, 9 Minor, all closed |
| T-2 | done | `d7b70a0` | AC-10 | 1 Critical, 3 Important, 4 Minor, all closed |
| T-3 | done | `e1e6714` | AC-11, AC-13 | 0 Critical, 2 Important, 4 Minor, all closed |
| T-4 | done | `cc47ee1` | AC-12, AC-14 | 0 Critical, 3 Important, 5 Minor, all closed |

## Green-bar evidence

### T-1 (@ `fe4b3ca`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 191
# pass 191
# fail 0
```

Declared verification, run and reported. The two mechanical checks are named so the proof map can
cite them:

```
manual check: handoff-frontmatter-and-scope
  -> frontmatter parses as strict YAML; name == directory (handoff); standalone scope qualifier present. PASS
manual check: handoff-portability-search
  -> search for vendor config dirs / personal remotes / machine-local absolute paths / spec-tree citations. 0 hits. PASS
```

The remaining declared checks were prose-shaped and are recorded in the task report: the litmus
appears once and is referred to elsewhere; each mode states its selection condition; the prune
trigger names size, structure and content.

### T-2 (@ `d7b70a0`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 191
# pass 191
# fail 0

$ for f in <all eight chains>; do node checker/sdlc-check.mjs docs/specs/$f/$f.md; done
all exit 0
```

Declared verification: the marker scan `repo-setup` documents finds the new template, the ignore
entry is seeded, the routing line refers to the litmus rather than restating it (searched: the litmus
text appears in the handoff skill only), and the skill's own counts, token tallies and end-to-end
fixture agree with the new seed set.

### T-3 (@ `e1e6714`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 191
# pass 191
# fail 0
```

Declared verification: each hook states its precondition, its announcement and the never-create rule;
neither introduces a blocking prompt; neither changes its stage's declared artifact (both "Done
when" and artifact sections compared before and after, untouched); both skills' frontmatter still
parses as strict YAML; and the modes, litmus and trigger are not restated in either skill.

### T-4 (@ `cc47ee1`)

```
$ node --test checker/*.test.mjs
SUITE EXIT (read directly): 0
# tests 191
# pass 191
# fail 0
```

Declared verification: the routing line says what the doc is for and that it is read first when
present; the usage page covers all three modes and the ignored-by-default default; the docs index
links it; every relative link added resolves; and `getting-started`'s frontmatter still parses as
strict YAML.

## Deviations

- **D-1: the feature's own failure mode appeared inside the fix, and the review caught it.** T-1's
  prune trigger shipped its size leg as "about a screen (order of 60-100 lines)": two hedges around a
  40-line band, which an agent that does not want to prune can always read as inside the normal range.
  That is the advisory instruction this feature exists to replace, with a number glued on, and the
  skill's own rebuttal spoke of "the line" while no line existed. **Disposition:** the conductor ruled
  a single integer (100 lines), with "about a screen" demoted to a parenthetical rationale.
- **D-2: a seeded template broke the seeding skill's own proof.** T-2 added a template but left
  `repo-setup`'s end-to-end verification procedure describing the old set, which made it
  self-contradictory in both directions: following its extract-every-block step produced a false RED
  (the new template counted as an extra), while following its literal heredocs produced a false GREEN
  (passing while proving nothing about the new template). **Disposition:** the whole procedure was
  made consistent, counts and warnings included. Recorded because a verification procedure that lies
  is worse than none: it is trusted.
- **D-3: a hook that could never fire.** T-3's build hook did not account for the build running in an
  isolated workspace, where a default-ignored handoff doc does not exist, so it would silently never
  fire or leave a stray doc in a temporary tree. **Disposition:** the hook resolves against the
  working copy the run belongs to and skips loudly when it cannot.
- **D-4: a count outside the task's file set.** The standalone-skill count ("four") lived in the
  README and in three plugin manifest descriptions, none of which were in any task's declared files.
  T-4's reviewer caught it. **Disposition:** descriptions updated in lockstep, versions deliberately
  untouched, since 0.16.0 shipped without this skill.

## Banked follow-ups (out of scope, recorded so they are not rediscovered)

- **The hooks are documented but unexercised.** Nothing in this repo's own pipeline run exercised
  them, because they were written during the run that would have used them. The next build and the
  next ship are their first live test.
- **`package.json`'s description carries no standalone-skill clause**, so it needed no count update.
  If one is ever added, it joins the lockstep set.

## Checker corroboration

All eight chains under `docs/specs/` exit 0. Suite 191/191, exit 0, read directly. This feature adds
no checker rule and no grammar (NC-1), so the checker's role here is regression only.
