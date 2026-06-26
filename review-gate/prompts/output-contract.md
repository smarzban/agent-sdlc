# Output contract (read carefully)

Respond with **ONLY a JSON array** of findings — no prose before or after, no markdown fence.
Each finding is an object of EXACTLY this shape:

```
{
  "title": "[<area>] short title",          // area = security|privacy|correctness|concurrency|performance|error-handling|test-coverage|maintainability
  "severity": "critical|high|medium|low|info",
  "file": "path/as/in/the/diff.ts",
  "line": 83,                                 // a representative line number in that file
  "area": "security",                         // the concern this finding belongs to
  "rationale": "why this is a real problem, concretely",
  "suggestion": "the concrete fix",
  "confidence": "high|med|low"
}
```

**If you find nothing, your entire reply must be exactly `[]`.** Do not describe the absence of
issues in prose — the JSON array (empty or not) is the ONLY thing you output.

## Severity (pick by real impact)
- **critical** — broken/exploitable in production now; a ship-blocker.
- **high** — serious: exploitable with minor preconditions, data exposure, or clearly incorrect behavior.
- **medium** — a real problem with limited impact or needing unusual conditions.
- **low** — minor; worth noting, not blocking.
- **info** — an observation, no action needed.

Keep `rationale` to one or two sentences. Do not invent issues to fill the list. Be precise with `file` and `line`.
