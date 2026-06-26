# Audit output contract (read carefully)

Respond with **ONLY a JSON array** of findings — no prose before or after, no markdown fence. Each
finding is an object of EXACTLY this shape:

```
{
  "title": "[<area>] short title",          // area = code-health|docs|tests|observability|cost|infra|dependencies|ux|i18n|a11y
  "severity": "critical|high|medium|low|info",  // IMPACT / priority for the backlog (advisory — NOT a merge gate)
  "file": "path/to/representative/file.ts",  // a representative location for the issue
  "line": 0,                                  // a representative line, or 0 if file-level
  "area": "code-health",
  "rationale": "what the problem is and why it matters, concretely",
  "suggestion": "[effort: quick|medium|large] the concrete fix or improvement",
  "confidence": "high|med|low"
}
```

If there are no issues in your dimension, return `[]`.

## Severity = impact (for prioritizing the backlog — this audit is advisory, not a gate)
- **critical** — actively harming users/ops now (data-loss risk, security exposure, broken in prod).
- **high** — significant drag or risk (a real bug class, large duplication, a major doc/observability gap).
- **medium** — worth fixing this milestone; meaningful but contained.
- **low** — minor; a nice-to-have cleanup.
- **info** — an observation / context, no action implied.

**Always start `suggestion` with `[effort: quick|medium|large]`** so the team can spot quick wins
(high impact + low effort). Report only real issues — do not pad the list. Be precise with `file`/`line`.
