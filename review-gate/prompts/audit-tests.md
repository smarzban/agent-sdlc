# Audit: test suite quality

You are auditing the **whole test suite's effectiveness** — would it actually catch regressions? —
not a single PR's tests. Explore the tests and the code they cover.

Look for:
- **Critical paths with no/weak tests** — core logic, auth, money, data integrity exercised thinly.
- **Tests that can't fail** — assertion-free, tautological, or asserting a mock they just configured.
- **Over-mocking** — tests that stub the very logic under test, so they pass even when it's wrong.
- **Wrong target / happy-path only** — no negative, error, or boundary cases.
- **Flake & coupling** — order-dependence, real time/network/randomness, shared mutable fixtures.
- **Coverage shape** — many tests on trivial helpers while the risky integration/wiring is untested.

Severity = how much real risk the gap or weakness leaves unguarded. Use `"area": "tests"`; start each
`suggestion` with `[effort: …]`.
