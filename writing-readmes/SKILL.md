---
name: writing-readmes
description: Use when writing, overhauling, or reviewing a project's README (the front-door README.md of a repo). Produces a clear, scannable, source-grounded README that leads with what/why, adapts its section set to the repo type, keeps a lean quickstart distinct from full install, and links out to deeper docs instead of inlining them. Use also when a README "isn't clear what the project is" or has grown into a docs dump.
---

# Writing READMEs

A README is the **front door**. A newcomer should know *what this is, whether it's
for them, and how to start* within the first screen. Build that — not a docs dump.

**Announce at start:** "I'm using the writing-readmes skill to (re)write this README."

## Core principles

1. **Lead with the lede.** Title + one-sentence description + a short highlights
   list come first. What it does and why it exists, before any setup.
2. **What / why / how.** A good README answers all three, in that order.
3. **Quickstart ≠ install.** A lean, copy-pasteable "see it work" path is separate
   from the fuller, multi-path install/config. Don't merge them.
4. **Link out, don't bloat.** The README points into deeper docs (`docs/…`); it
   does not contain them. If a section is becoming reference material, move the
   body to docs and leave a short summary + link. (Too short is worse than too
   long — but the fix for "too long" is *relocate*, not delete.)
5. **Adapt to the repo type.** A library leads with install + import + API; a CLI
   with the one command; a service/app with what-it-does + a visual + quickstart +
   deploy. See `reference/anatomy-and-templates.md`.
6. **Everything must be true and runnable.** Commands, examples, defaults, and
   links are verified against the actual repo. No broken links; examples that
   actually run.
7. **Scannable.** Short sections, clear headers, bullets, copy-pasteable fenced
   blocks. Write for someone who has never seen the project.

## Checklist (turn each into a tracked task)

1. **Assess** — repo type, what it does, audience, what deeper docs exist to link
   to, and the front-door assets (LICENSE? CI? a UI worth a screenshot?).
2. **Choose the section set** — adapt the anatomy to the repo type.
3. **Write** — front-door discipline: lead with what/why, lean quickstart, link to docs.
4. **Verify** — examples accurate, links resolve, no stale claims, license handled.
5. **Report** — note what moved to doc links and flag any owner decisions.

## Phase 1 — Assess

- **Project type & one-liner.** What is it in <120 chars, no jargon? (library / CLI
  / service / app / framework / monorepo — drives the section set.)
- **Audience.** Who reads this README — API consumers, operators, end users?
- **Deeper docs to link to.** Is there a `docs/` tree (or a guide) the README
  should point into rather than duplicate? If yes, the README slims down and links.
- **Front-door assets.** Is there a `LICENSE` file (don't invent one — flag if
  missing)? CI workflow (a status badge is cheap and trust-building)? A UI worth a
  screenshot (don't add a broken image — note it as a TODO for the owner if no
  asset exists)?
- **Existing README.** Read it. Salvage accurate content; relocate reference-heavy
  prose into docs links; note stale/contradicted claims to drop (verify against code).

## Phase 2 — Choose the section set

Start from the ordered anatomy and keep only what applies. Read
`reference/anatomy-and-templates.md` for the full ordered list (with
required/optional) and the per-repo-type templates.

The near-universal core: **Title + one-liner → (badges) → (visual) → highlights /
what & why → quickstart → install → usage/config → link to docs → contributing →
license.** Add a table of contents once it scrolls. Drop sections that don't apply.

## Phase 3 — Write (front-door discipline)

- **First screen sells it:** title, one-sentence description, then 3–6 bullet
  **highlights** (the selling points / the problem solved). A reader decides here.
- **Quickstart** is the shortest real path to a working result — copy-pasteable,
  minimal, with expected output where it helps. Link to full install for the rest.
- **Install** is the fuller, multi-path setup (or just a link to `docs/install` if
  that's where it lives).
- **Usage/config**: small runnable examples; for big reference tables, show the
  common few and link to the complete reference in docs.
- **Documentation** section: explicit links into the deeper docs, routed by
  audience ("Users → …, Operators → …, Engineers → …").
- Keep the body scannable; relocate anything that reads like reference docs.

## Phase 4 — Verify

- **Examples & commands** are accurate to the repo (run/trace them; verify install
  steps, env var names, defaults, command names against the source).
- **Links resolve** — every relative link (especially into `docs/`) points at a
  real file; external links are valid. No broken links (a hard rule of the
  standard-readme spec).
- **No stale claims** — nothing describing removed features or wrong defaults.
- **License** present (a License section + a `LICENSE` file). If absent, FLAG it —
  do not invent a license.
- **Length sanity** — if a section ballooned, it belongs in docs; leave a summary + link.

## Phase 5 — Report

State what the new README does, what content you **relocated to doc links** (so
nothing accurate was lost), and **flag owner decisions** you couldn't make
(missing license, a screenshot to add, a tagline to confirm).

## Red flags (stop and fix)

- The reader can't tell what the project *is* from the first screen.
- Quickstart is tangled with full provider/config detail.
- The README re-explains everything instead of linking to existing docs.
- A broken relative link, or an example/command that doesn't actually work.
- An invented license, or a `![screenshot](…)` pointing at a file that doesn't exist.
- Reference tables inlined when a `docs/` reference already exists.
