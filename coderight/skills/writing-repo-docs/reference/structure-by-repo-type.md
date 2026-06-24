# Structure by repo type

The default skeleton, then how to adapt it per project type. Pick the closest
match and trim/extend. Section *names* should follow the repo's own vocabulary;
these are the shapes, not literal required filenames. Always include a top-level
`README.md` index that routes each audience to its starting point, and a
`quickstart.md`.

## Default skeleton

```
docs/
  README.md          what it is + "who starts where" + full index
  quickstart.md      fastest path to a first working result
  install/           setup + configuration reference + (if applicable) deploy/ops
  usage/             how to USE each feature — for consumers of the thing
  technical/         how it WORKS and WHY — architecture + per-subsystem
```

(Put the tree directly under `docs/`. If the repo already uses `docs/` for
something else, nest under a clearly-named subfolder instead.)

The three audiences map to the three subtrees:
- **use** → `usage/` (or `users/`)
- **install / operate** → `install/`
- **build / maintain** → `technical/`

A given repo may collapse or drop subtrees. Decide from Phase 1.

## Library / SDK

Consumers are programmers calling an API; there is nothing to "deploy".

```
README.md          what it is, install one-liner, a 6-line example
quickstart.md      install + import + the canonical first call
usage/             task-oriented how-to per capability; common recipes; gotchas
reference/         the API surface (modules/classes/functions, params, returns, raises)
concepts/          the mental model — key abstractions and how they fit
technical/         internals + architecture + extension points + contributing
```

- Drop `install/` as a subtree; a single install/import page is enough.
- `reference/` (API) is the heart. Generate it from the actual exported surface;
  verify signatures against the code.
- Versioning/compat notes matter more here than for apps.

## CLI tool

```
README.md          what it does + install
quickstart.md      install + the one command that shows value
usage/
  commands.md      per-command reference (args, flags, exit codes, stdin/stdout)
  recipes.md       real workflows chaining commands
install/           install methods + config files / env
technical/         architecture + how to add a command
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
  production.md     hardening checklist
usage/             the API: endpoints/resources, auth headers, examples, errors
technical/         architecture, data flow, storage, the request lifecycle, internals
operations/        backups, logging/observability, upgrades/migrations
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
technical/         architecture + one page per subsystem, with the WHY + the invariants
```

- `users/` = end-user how-to (sign in, the core workflow, each feature, settings,
  admin/owner tasks, integrations, troubleshooting/FAQ).
- `technical/` = a `README.md` module map + architecture + one focused page per
  subsystem (data layer, API layer, auth/RBAC, the core engine, integrations,
  config, CLI, security model, development discipline).
- Surface the load-bearing invariants and security model explicitly — they're the
  things a maintainer most needs and most easily breaks.

## Framework

```
README.md          what it is + philosophy
quickstart.md      scaffold + first app
guides/            task-oriented (routing, data, auth, testing, deploy…)
concepts/          the core abstractions and lifecycle
reference/         the API surface
technical/         internals + how to extend / write plugins
```

## Monorepo / multi-package

- A **top-level** `docs/README.md` that maps the packages and how they relate.
- Then a `docs/<package>/` subtree per package, each following the matching
  type above. Don't try to document everything in one flat tree.

## Choosing the audience split

- **Only maintainers** read it (internal tool, no external consumers) → mostly
  `technical/`, a short quickstart, skip `users/`.
- **Programmers consume it** (library/framework) → `reference/` + `usage/` +
  `concepts/`; `technical/` is internals/contributing.
- **Operators deploy it** (service/app) → a real `install/` + `operations/`.
- **End users click it** (app) → a real `users/` in plain language.

When unsure which audiences apply, ask the user — it's the one decision that most
changes the output.
