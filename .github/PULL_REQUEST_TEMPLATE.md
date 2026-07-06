<!-- Thanks! The bar is in CONTRIBUTING.md — the short version: -->

## What

<!-- One paragraph: the change and why. Link the issue if one exists. -->

## Checks

- [ ] Suite green: `node --test checker/*.test.mjs` (153+ passing; exit code read directly)
- [ ] Every shipped spec still self-verifies (`node checker/sdlc-check.mjs <spec> → exit 0`)
- [ ] Skills changes: strict-YAML frontmatter, house voice, `reference/` for long material
- [ ] Checker changes: test-first; grammar changes land with the skill text documenting them
- [ ] No secrets, no personal/internal paths (public repo)

## Pipeline dogfood

<!-- Non-trivial pipeline changes ship as a spec chain (see CONTRIBUTING.md). Link the
     spec directory here, or state why this change is small enough for the light tier /
     no chain. -->
