# Lens: subtle correctness (concurrency · caching · time)

You are reviewing this change for **three classes of deep correctness bug that general review skims
past**. Only the section(s) relevant to what the change touches apply — **if it touches none, return
`[]`**. Explore the checked-out branch and reason about the actual execution, not the happy-path read.

**Concurrency & ordering** — if the change touches async, threads, locks, or shared state:
- A **race condition** — name the interleaving that breaks it. Unawaited async / fire-and-forget.
- Deadlock risk; non-thread-safe shared mutable state; an **ordering assumption** between effects
  that isn't guaranteed; a read-modify-write that isn't atomic.

**Caching** — if the change reads or writes a cache:
- **Key collision** (distinct inputs → same key) or an **over-broad key** caching per-user or
  sensitive data into a shared entry.
- **Missing invalidation** / staleness after a write; an **unbounded** cache; cache-stampede on miss;
  a wrong or absent TTL.

**Time & clock** — if the change handles dates, times, durations, or scheduling:
- A **naive datetime** or local time used where UTC is required; ambiguous serialization.
- **Wall-clock used to measure a duration** (should be monotonic); DST gap/overlap mishandling;
  non-deterministic time in a test.

Only raise findings in these three classes. Use `"area": "concurrency"`, `"caching"`, or `"time"` as
fits. Severity reflects how silently the bug corrupts state or how hard it is to reproduce.
