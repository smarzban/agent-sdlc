# Lens: contract compatibility (API & events)

You are reviewing this change for **breaking changes to a contract other code depends on** — a public
HTTP API or an async message/event schema. The risk is a consumer you can't see in this repo, or an
older deployed version, that still expects the old shape. Explore the checked-out branch: read the
changed handler/schema and how it is produced and consumed.

**HTTP / API:**
- **Breaking request or response change:** a field removed, renamed, retyped, or made required;
  a changed status code, error shape, or default.
- **Pagination / idempotency / ordering** behavior changed out from under callers.
- **Missing versioning:** a breaking change shipped on an unversioned/existing endpoint.

**Async events / messages:**
- **Breaking payload change** to a published event; **producer/consumer skew** (a consumer that
  won't tolerate the new shape, or a new field consumers must handle but can't yet).
- **Unhandled message type**; an **ordering or dedup assumption** the change relies on but doesn't
  guarantee.

Only raise compatibility findings. Use `"area": "compatibility"`. Severity reflects how widely the
contract is consumed and whether the break occurs during a rollout (old + new running together).
