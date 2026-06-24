# README anatomy & per-repo-type templates

Synthesized from the [standard-readme spec](https://github.com/RichardLitt/standard-readme/blob/main/spec.md)
(which fixes section order + required/optional status) and
[makeareadme.com](https://www.makeareadme.com/). Use the ordered anatomy as the
menu; the templates below say which subset fits each repo type.

## Ordered anatomy

In this order; keep only what applies.

| # | Section | Status | Contains |
|---|---|---|---|
| 1 | **Title** | required | The project name (matches repo/package). |
| 2 | **One-line description** | required | <120 chars, no jargon, no own heading — sits under the title. |
| 3 | **Badges** | optional | CI/build, version, license, coverage — status at a glance (e.g. Shields). No tracking pixels. |
| 4 | **Visual** | optional | Screenshot / GIF / demo. High-impact for anything with a UI. Never link an image that doesn't exist. |
| 5 | **Highlights / What & why** | strongly recommended | 3–6 bullets: the selling points and the problem solved. The reader decides here. |
| 6 | **Table of contents** | once it scrolls | Links to the sections (standard-readme requires it >100 lines). |
| 7 | **Quickstart** | recommended | The shortest copy-pasteable path to a working result; expected output where useful. |
| 8 | **Install** | required for libs/tools | Fuller, multi-path setup + prerequisites. May be a link to `docs/install`. |
| 9 | **Usage / Configuration** | required for libs/tools | Runnable examples; common config; link to the full reference for big tables. |
| 10 | **Documentation** | when deeper docs exist | Explicit links into `docs/…`, routed by audience. |
| 11 | **How it works / Background** | optional | Brief design context / architecture pointer. |
| 12 | **Support / Troubleshooting** | optional | Where to get help (issues, discussions). |
| 13 | **Roadmap / Status** | optional | Planned work; or a "slowed/archived" note. |
| 14 | **Contributing** | recommended | How to help; dev setup; test/lint commands (or link to a dev doc). |
| 15 | **Acknowledgements / Credits** | optional | Attribution. |
| 16 | **License** | required, **last** | The license + a `LICENSE` file. Don't invent one — flag if missing. |

## What to inline vs. link

The README is the front door, not the manual. Inline the *common 80%*; link the
rest into `docs/`:

- **Inline:** the one-liner, highlights, quickstart, the handful of most-used
  commands/env vars, a minimal usage example.
- **Link:** the full env/config reference, every auth mode in detail, deployment,
  per-feature how-tos, architecture/internals, the CLI reference. If a section
  reads like reference material and a `docs/` page covers it, leave a 1–3 line
  summary and link.

## Per-repo-type templates

Pick the closest; trim/extend. (Sections by their anatomy number.)

**Library / SDK** — consumers are programmers; nothing to deploy.
`Title → one-liner → badges → highlights → quickstart (install + import + first call) → usage (examples) → API reference (or link) → contributing → license`. Lead with `pip/npm install` and a 6-line example. Versioning/compat matters.

**CLI tool**
`Title → one-liner → badges → (asciinema/GIF) → highlights → quickstart (install + the one command that shows value) → install → usage (key commands; link to full command reference) → contributing → license`.

**Web service / HTTP API**
`Title → one-liner → badges → highlights → quickstart (run locally + one request) → install/deploy (link to docs) → configuration (common env; link to full table) → API usage → documentation → operations (link) → contributing → license`.

**Full application (UI + service)**
`Title → one-liner → badges → screenshot → highlights → quickstart → install (link to multi-path docs) → documentation (Users / Operators / Engineers links) → configuration (common; link) → integrations (one-liner each + link) → development/contributing (link) → license`. This is the shape to aim for when an app's README has become a docs dump and a `docs/` tree already exists: slim the README to a front door and link in.

**Framework**
`Title → one-liner → badges → highlights → quickstart (scaffold + first app) → guides/concepts (links) → API reference (link) → contributing → license`.

**Monorepo / multi-package**
Top-level README maps the packages and how they relate, with a quickstart for the
whole; each package keeps its own README following the matching type above.

## A note on order and headings

standard-readme wants exact section order and titles; in practice, keep the order
(it's what readers expect) but use natural heading wording for the repo. The two
hard rules everyone agrees on: **short description directly under the title**, and
**License last**. No broken links anywhere.
