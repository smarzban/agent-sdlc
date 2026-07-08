# Structure by repo type

The default skeleton, then how to adapt it per project type. Pick the closest
match and trim/extend. Section *names* should follow the repo's own vocabulary;
these are the shapes, not literal required filenames. Always include a top-level
`README.md` index that routes each audience to its starting point, and a
`quickstart.md`.

Scope reminder: this skill produces the **essentials** — use, install/operate,
contribute. Deep internals (design rationale, data models, per-subsystem pages,
the internal module reference) are `writing-technical-docs`; the essentials tree
carries at most a light `architecture.md` overview that links there. One nuance:
a library/framework's **public-API `reference/` stays here** (see Library) —
consumers are programmers, so the public API is usage.

## Default skeleton

```
docs/
  README.md          what it is + "who starts where" + full index
  quickstart.md      fastest path to a first working result
  install/           setup + configuration reference + (if applicable) deploy/ops
  usage/             how to USE each feature — comprehensive, one file per feature/task
  development.md     running it locally: clone -> deps -> run -> test -> common tasks
  architecture.md    (optional) LIGHT one-page overview -> links to technical docs

repo root:
  CONTRIBUTING.md    contributor front door (conventions from git log + CI, not a template)
  SECURITY.md        vuln-reporting channel (public repos; confirm channel with owner)
  CHANGELOG.md       only if a release process exists
  .github/           issue/PR templates — offer; owner decision
```

(Put the tree directly under `docs/`. If the repo already uses `docs/` for
something else, nest under a clearly-named subfolder instead.)

The audiences map:
- **use** → `usage/` (or `users/`)
- **install / operate** → `install/`
- **contribute** → `development.md` + `CONTRIBUTING.md`

A given repo may collapse or drop subtrees. Decide from Phase 1.

## Library / SDK

Consumers are programmers calling an API; there is nothing to "deploy".
The public API surface *is* usage — so a `reference/` for the exported API
belongs here, in the essentials (verify signatures against the code).

```
README.md          what it is, install one-liner, a 6-line example
quickstart.md      install + import + the canonical first call
usage/             task-oriented how-to per capability; common recipes; gotchas
reference/         the PUBLIC API surface (modules/classes/functions, params, returns, raises)
concepts/          the mental model — key abstractions and how they fit
development.md     clone -> deps -> build -> test (feeds CONTRIBUTING.md)
```

- Drop `install/` as a subtree; a single install/import page is enough.
- Versioning/compat notes matter more here than for apps.
- Internals, extension architecture, and the why live in the technical docs.

## CLI tool

```
README.md          what it does + install
quickstart.md      install + the one command that shows value
usage/
  commands.md      per-command reference (args, flags, exit codes, stdin/stdout)
  recipes.md       real workflows chaining commands
install/           install methods + config files / env
development.md     clone -> deps -> run from source -> test
```

- Verify command names, args, flags, and defaults against the CLI definition
  (the argument-parser/command declarations), not the README's command list.

## Web service / HTTP API

```
README.md          what it serves + who calls it
quickstart.md      run it locally + one example request
install/
  README.md        choose an install/deploy path
  configuration.md full env/config reference (verify names + defaults vs source)
  auth.md          auth modes / credentials (if any)
  deployment.md    Docker/compose/k8s, reverse proxy/TLS, scaling
  production.md    hardening checklist
usage/             the API: endpoints/resources, auth headers, examples, errors
operations/        backups, logging/observability, upgrades/migrations
development.md     run it locally for development + test
architecture.md    (optional, light) the components + main flows -> technical docs
```

- The endpoint inventory must match the actual route definitions.
- Pull the env/config table from the settings source + an example env file;
  verify every default.

## Full application (UI + service, e.g. a product)

The full split, under `docs/`.

```
docs/
README.md          what it is + who-starts-where + index
quickstart.md      shortest path to a running instance
install/           multi-path install, config reference, auth, production, upgrading
users/             how-to per feature, written for people (not programmers)
development.md     contributor path: run the stack locally, seed data, test
architecture.md    (optional, light) system map -> technical docs
```

- `users/` = end-user how-to (sign in, the core workflow, each feature, settings,
  admin/owner tasks, integrations, troubleshooting/FAQ).
- The per-subsystem pages, invariants, and security model belong to the
  technical docs — `architecture.md` here only maps the territory and links.

## Framework

```
README.md          what it is + philosophy
quickstart.md      scaffold + first app
guides/            task-oriented (routing, data, auth, testing, extending/plugins, deploy…)
concepts/          the core abstractions and lifecycle
reference/         the public API surface
development.md     contribute to the framework itself
```

## Monorepo / multi-package

- A **top-level** `docs/README.md` that maps the packages and how they relate.
- Then a `docs/<package>/` subtree per package, each following the matching
  type above. Don't try to document everything in one flat tree.
- One CONTRIBUTING.md at the root; per-package `development.md` only when the
  dev flows genuinely differ.

## Feature-enumeration source (for the usage coverage ledger)

The Phase-1 coverage ledger enumerates the user-facing feature set, then Phase 5
diffs it against the `usage/` pages. Enumerate from the repo type's source of
truth — never from an old doc or from memory:

- **Library / SDK** → the exported public API surface (the module/package
  exports, `index` re-exports, `__all__`, the manifest's exported entries).
- **CLI** → the command/flag registrations in the argument-parser declarations
  (or `--help`), not the README's command list.
- **Web service / HTTP API** → the route table (the actual route/handler
  definitions).
- **Full application** → the user-facing feature set (the navigation / feature
  modules; each `users/` topic maps to one).
- **Framework** → the public API surface + the guide-worthy capability set
  (routing, data, auth, testing, extension…).
- **Plugin / extension** (a skills or commands bundle; no separate skeleton
  above — follow the closest type) → the plugin manifest, i.e. the `skills/` +
  `commands/` set it registers.
- **Monorepo** → per package, each by its own type above.

Grep the enumerated set against the `usage/` filenames + headings; a feature
with no page is a gap (fill it) or an explicit exclusion (record the reason).

## Choosing the audience split

- **Only maintainers** read it (internal tool, no external consumers) → a short
  quickstart + `development.md`; most of the value is in the technical docs —
  recommend `writing-technical-docs` instead.
- **Programmers consume it** (library/framework) → `reference/` + `usage/` +
  `concepts/`.
- **Operators deploy it** (service/app) → a real `install/` + `operations/`.
- **End users click it** (app) → a real `users/` in plain language.

When unsure which audiences apply, ask the user — it's the one decision that most
changes the output.
