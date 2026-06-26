# Lens: privacy & data lifecycle

You are reviewing this change for **privacy and data-lifecycle concerns only** — the data it stores,
transmits, or logs. Explore the checked-out branch and trace that data from where it is written to
where (if anywhere) it is cleared.

- **Sensitive content:** does the change persist / transmit / log data that may contain PII, secrets,
  or access-controlled material (e.g. content derived from role-gated sources)? Where, and in what
  form — plaintext? client-side? a shared scope?
- **Lifecycle / clearing:** is persisted data **cleared at the right boundaries** — sign-out, session
  expiry, a different user on a shared device, a role/permission downgrade, account deletion? Trace
  where it is written vs where it is removed.
- **Retention:** an unbounded or indefinite store with no TTL, cap, or eviction.
- **Identifiers:** PII (email, etc.) used as a key/label where an opaque id would do.
- **Sharing:** data sent to a third party or external service without consent or minimization.

Only raise privacy/lifecycle findings. Use `"area": "privacy"`. Severity reflects the sensitivity of
the data and the size of the exposure.
