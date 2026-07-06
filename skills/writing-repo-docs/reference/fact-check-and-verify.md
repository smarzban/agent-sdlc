# Fact-check & verify

The verification pass is what separates trustworthy docs from confident-but-wrong
docs. Run it before declaring the work done. Fix everything it surfaces.

## 1. Ground claims as you write (Phases 3–4)

Before any of these appears in a doc, confirm it against the source:

| Claim type | Check against |
|---|---|
| Constant / threshold / default | the definition in code (not a comment, not the README) |
| Function / method / class / module name | the actual symbol; confirm it still exists and is spelled right |
| Env var name + default | the settings/config source **and** an example env file |
| CLI command / subcommand / flag / arg | the command-parser definitions, not the README's list |
| HTTP endpoint / route / method | the route registrations |
| File path / module location | the filesystem |
| Behavior ("it does X when Y") | read the relevant code path; don't assume |
| Data shape / schema / table | the schema/model definition |

Rule of thumb: if you're about to type a specific value or name, you should have
just looked at the line of code that defines it.

## 2. Link check (Phase 5)

Every internal relative link must resolve. A quick parser over the doc tree:

```python
import re, pathlib
root = pathlib.Path("docs")                  # the doc root
link_re = re.compile(r'\[[^\]]+\]\(([^)]+)\)')
bad = []
for md in root.rglob("*.md"):
    for m in link_re.finditer(md.read_text()):
        t = m.group(1)
        if t.startswith(("http://", "https://", "#", "mailto:")):
            continue
        p = t.split("#", 1)[0]
        if p and not (md.parent / p).resolve().exists():
            bad.append(f"{md} -> {t}")
print("broken links:", len(bad)); [print(b) for b in bad]
```

Resolve every reported link (fix the path or the target). Optionally also flag
links to in-page anchors that don't exist.

## 3. Fact-check pass — fresh eyes (Phase 5)

Re-read the docs against the source as if you didn't write them. The
author's eye skips the wrong constant it just typed; a second pass catches it.

**If a subagent / second agent is available, dispatch an adversarial fact-check.**
Give it the doc files and the source tree and the instruction: *"Find any
statement that is factually wrong or contradicted by the code — wrong constant
values, wrong function/module names, wrong env var names/defaults, wrong behavior,
wrong file paths, wrong endpoint/command lists. Report only factual errors, not
style. Cite the source file you checked against."* Then fix every confirmed error.

This is the highest-leverage step: in practice a fresh fact-check pass finds real
errors (a tuple documented as a set, a session lifetime that was never actually
configured, a default the code doesn't use) that otherwise ship as authoritative.

## 3b. Command check (Phase 5)

The quickstart, install, and `development.md` command sequences are traced against
the CI workflow and the package scripts (those are the ground truth, not an old
README). Where the environment allows, execute the sandbox-safe dev/test commands
to confirm they work; deploy/ops sequences (Docker/k8s, reverse proxy, anything
system-modifying) are trace-only — never executed during a docs task.

## 4. Placeholder scan (Phase 5)

Grep the output for red flags and eliminate them: `TBD`, `TODO`, `FIXME`,
`XXX`, "coming soon", "add details", empty sections, lorem-ipsum.

## 5. Handle drift you discover — don't paper over it

The verification pass often reveals that the **code and the existing docs/comments
disagree** (a README says 7 days, the code does 14; a comment claims a re-export
that was removed). When that happens:

- Make the **new docs state the truth** (what the code actually does).
- **Surface the discrepancy to the user** explicitly, with the file/line.
- If the fix is a behavioral code change, **offer it as a separate change** rather
  than silently bundling it — the doc work shouldn't quietly alter behavior.
- A stale *comment* contradicting reality is worth a tiny correction; flag it.

## Done criteria

- Every concrete claim traced to source.
- Command sequences traced against CI/scripts (and sandbox-safe dev/test ones run where possible).
- 0 broken internal links.
- Fact-check pass run (ideally a second-agent adversarial pass); all confirmed
  errors fixed.
- 0 placeholders.
- Any code/doc drift discovered is reported to the user (and offered as a
  separate fix if behavioral).
