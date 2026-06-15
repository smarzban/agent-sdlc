# skills

A personal collection of reusable [Claude Code](https://claude.com/claude-code)
skills — versioned here so they can be shared and used with any agent on any repo.

A *skill* is a directory containing a `SKILL.md` (with `name` + `description`
frontmatter) and optional supporting files. Claude Code discovers skills placed
in `~/.claude/skills/` and surfaces them by their `description`.

## Skills

| Skill | What it does |
|---|---|
| [`writing-repo-docs`](writing-repo-docs/SKILL.md) | Write/overhaul documentation for any codebase — an adaptive, source-grounded doc guide (landing index + quickstart + install + usage + technical), shaped to the repo's type, with every claim verified against the actual code. |

## Installing a skill (make it live)

Claude Code loads skills from `~/.claude/skills/`. Symlink a skill from this repo
into that directory so it stays a single source of truth and updates with `git pull`:

```bash
git clone git@github.com:smarzban/skills.git ~/src/skills      # once
ln -s ~/src/skills/writing-repo-docs ~/.claude/skills/writing-repo-docs
```

(Or copy the directory in if you'd rather not symlink.) After it's in place,
either describe the task in plain language — the skill's `description` triggers it
— or invoke it explicitly as `/writing-repo-docs`.

## Adding a skill

Create `<skill-name>/SKILL.md` with frontmatter:

```markdown
---
name: <skill-name>
description: Use when … — a precise trigger so the right tasks pick it up.
---

# <Skill Name>

…the method…
```

Keep `SKILL.md` focused; put long templates/checklists in a `reference/` subdir
that the skill points to on demand. Commit, push, and symlink it into
`~/.claude/skills/`.
