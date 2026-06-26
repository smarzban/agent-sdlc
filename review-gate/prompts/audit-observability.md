# Audit: observability

You are auditing the **whole system's diagnosability in production** — could an on-call engineer
understand a failure from what it emits? Explore the logging, metrics, tracing, and error handling.

Look for:
- **Sensitive data in logs** — PII, secrets, tokens, or access-controlled content being logged.
- **Insufficient logging/metrics on critical paths** — failures that would be invisible or
  unattributable in production.
- **Missing RED metrics on services/endpoints** — **R**ate, **E**rrors, and **D**uration (latency)
  per request path; without them you can't see *that* something is wrong, let alone what.
- **Unstructured logs / no correlation** — free-text logs you can't query or aggregate, and no
  request/trace/correlation ID threading a single operation across services.
- **Wrong log levels / noise** — errors logged as info, or high-volume noise drowning the signal.
- **Missing context** — logs or errors without the IDs, inputs, or correlation needed to act on them.
- **Missing traces** for key flows, or **alerting gaps** — no alert on the symptoms users feel (error
  rate, latency, saturation) vs. only low-level cause alarms or none at all; no SLO-relevant signal.

Severity = how blind it leaves you during an incident. Use `"area": "observability"`; start each
`suggestion` with `[effort: …]`.
