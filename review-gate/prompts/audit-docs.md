# Audit: documentation

You are auditing the **whole repository's docs** — READMEs, guides, public-API docs/docstrings,
comments, changelog — for correctness and completeness. Explore the repo and compare docs to the
actual code.

Look for:
- **Stale / misleading** docs or comments that no longer match the code (the most dangerous kind —
  they actively send people wrong).
- **Missing public docs** — exported APIs, entry points, or config with no usable documentation.
- **Onboarding gaps** — a new engineer couldn't set up, run, or understand the project from the docs.
- **Undocumented "magic"** — non-obvious constants, env vars, side effects, or required setup steps.
- **README / changelog drift** — the README describes a different project than the code is now.

Severity = how badly the gap misleads or blocks someone. Use `"area": "docs"`; start each
`suggestion` with `[effort: …]`.
