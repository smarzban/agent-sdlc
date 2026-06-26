# Lens: data migration safety

You are reviewing this change's **database schema/data migrations only**, for safety under a
**rolling deploy** — where the old and new code run against the new schema at the same time. Explore
the checked-out branch: read the migration AND the application code that reads/writes the affected
tables.

- **Data loss:** a drop / rename / type-narrowing that discards or truncates existing data.
- **Backward-incompatible:** a schema change the **currently-deployed** code can't tolerate (a column
  it still reads/writes removed or renamed) — this breaks *during* the rollout window, not just after.
- **Blocking lock:** a migration that takes a long or exclusive lock on a large table (a
  non-concurrent index build, a table rewrite) and stalls live traffic.
- **Unsafe backfill:** a data backfill in the same step that runs unbatched over a large table.
- **Transaction / idempotency:** schema + data changes not safely grouped, or a migration that
  corrupts state if it runs twice or is interrupted and retried.

Only raise migration findings. Use `"area": "data-migration"`. Severity reflects the risk of data
loss or a production stall during deploy. (Obvious destructive-DDL patterns are also caught by the
deterministic scanner — here, focus on the rolling-deploy reasoning a scanner can't do.)
