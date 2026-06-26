# Lens: spec conformance & coverage

You are reviewing this change against its **stated intent only** — the requirements / acceptance
criteria / ticket provided with this prompt. **If no spec was provided, return `[]`** — this lens
does not apply. Explore the checked-out branch and compare what the code actually does to what was
asked.

**Conformance — does the implementation match the intent?**
- **Unmet requirement:** an acceptance criterion the change does not satisfy.
- **Contradicts intent:** behavior that conflicts with what was asked.
- **Incomplete:** a stated case (an error path, an edge case named in the spec) left unhandled.
- **Scope creep / over-engineering:** behavior or abstraction the spec didn't ask for, adding risk.

**Coverage of the spec — is each criterion exercised by a test?**
- For each acceptance criterion, is there a test that would **fail if that criterion were violated**?
  Name any criterion with no such test.

Only raise findings tied to the provided spec; do not invent requirements. Use `"area": "correctness"`
for conformance and `"area": "test-coverage"` for coverage gaps. Severity reflects how central the
missed or contradicted requirement is to the change's purpose.
