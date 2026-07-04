# Verification report — checker-correctness

Terminal AC → proof map (ship stage). Each defined `AC-N` is settled against a named proof:
test-backed rows name a test (or a distinctive, comma-free fragment of its name) whose captured
green-bar evidence in `build-report.md` proves it (name-appearance, ADR-0001 — substring match);
reviewer-checked rows record the answered question.

> Proof-cell convention: `sdlc-check`'s AC-14 linkage splits a proof cell on commas (a cell "may name
> one or several" tests), so a test whose own name contains a comma (e.g. `(hash, subject)`) is cited
> here by a distinctive **comma-free fragment** of its name — which still appears verbatim in the
> captured evidence, satisfying the name-appearance contract.

| Criterion | Type | Proof |
| --- | --- | --- |
| AC-1 | test-backed | a component-map row citing a name that matches no defined component yields a trace-integrity finding naming it |
| AC-2 | test-backed | a component-map row citing a name that DOES match a defined component yields no trace-integrity finding |
| AC-3 | test-backed | a ragged ledger data row (fewer cells than the header) fails cleanly |
| AC-4 | test-backed | a middle empty-subject commit does not shift later pairs |
| AC-5 | test-backed | a dangling component name that merely contains a real component name as a substring does NOT resolve |
| AC-6 | reviewer-checked | Did every task keep the full suite green and leave `sdlc-check` exit 0 on the current spec, with no rule's happy-path verdict moved? PASS — all four tasks' staged-isolation runs were 141-green and spec-exit 0; the build-complete checker (`--require ledger`) exited 0; each per-task reviewer confirmed no regression (AC-6 preserved). |
