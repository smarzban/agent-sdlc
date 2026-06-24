# TDD — red-green-refactor (implementer + fixer discipline)

The build's core discipline. Every task names a failing test to write first; this is how the
implementer turns that into working code, and how the fixer guards a defect.

## The cycle

1. **Red.** Write the failing test the plan named. Run it. **Watch it fail for the right reason** —
   a test that passes before any code, or fails with an import error, proves nothing. See the red.
2. **Green.** Write the minimal code to pass it. Not the elegant version, not the general version —
   the least code that makes the test green.
3. **Refactor.** With the test green as a safety net, clean up: names, duplication, structure. Run
   the test again. Stay green.
4. Repeat for the next behaviour the task needs.

**No production code without a failing test first.** If you have pre-written code, delete it and
re-derive it from the test. Tests-first answers "what should this do?"; tests-after answers "what
does this do?" — they are different gates, and only the first one designs.

## Bugs: reproduce first

A fix begins with a test that reproduces the failure and fails for that reason. Then fix it; the test
goes green and stays in the suite as a guard. A fix with no reproducing test is a guess.

## Shape of the tests

- **Pyramid:** ~80% unit, ~15% integration, ~5% end-to-end. Push coverage down to the fastest level
  that can prove the behaviour.
- **DAMP over DRY in tests.** A test should read top-to-bottom as a description of the behaviour.
  Prefer a little duplication and a clear story over a clever helper that hides what is asserted.
- **One behaviour per test.** A test that asserts five things tells you little when it goes red.

## Violations to catch in yourself

- Writing the implementation, then a test that happens to pass.
- "I'll add tests at the end."
- Reluctance to delete pre-written code and derive it from the test.
- A green test you never saw fail.

Each of these violates the spirit even when the letter looks satisfied. The discipline is the
sequence, not the eventual presence of a test.
