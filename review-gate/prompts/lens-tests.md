# Lens: test coverage & effectiveness

You are reviewing this change for **test quality only** — both *whether* the change is tested and
*whether the tests would actually catch a regression*. This is the dimension holistic review
systematically under-weights. Explore the checked-out branch: read the changed code AND its tests.

**Coverage gaps:**
- Which behavior this change introduces or modifies is **exercised by no test**? Be specific about
  the untested path — an effect ordering, an identity/permission transition, a cleanup action, an
  error branch, a boundary value.
- Are there **new constants / config / contract values** (a timeout, a limit, a max-age, a flag
  default) that no test asserts, so a future refactor could silently revert them?
- Do the tests cover only pure helpers while the **integration/wiring** that actually carries the
  risk is untested?

**Effectiveness — would the test fail if the code broke?**
- **Tautological or assertion-free** tests (asserts nothing, or only a mock it just configured).
- **Over-mocked** tests that stub the very logic under test, so they pass even when it's wrong.
- Tests that assert the **wrong target**, or only the happy path with no **negative/failure case**.

Only raise test findings. Use `"area": "test-coverage"`. Severity reflects how likely an untested or
falsely-passing path is to regress silently and how costly that regression would be.
