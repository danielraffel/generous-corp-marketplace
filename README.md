# Generous Corp Marketplace

Official marketplace for **Claude Code plugins** and **Agent Skills** (`SKILL.md`) you can use with **OpenAI Codex** and **Claude Code**.

## Contents

- [Plugins Available](#plugins-available)
- [Skills Available](#skills-available)
- [Installation](#installation)
  - [Claude Code: Add the Marketplace + Install Plugins](#claude-code-add-the-marketplace--install-plugins)
  - [OpenAI Codex: Install Skills](#openai-codex-install-skills)
  - [Claude Code: Install Skills](#claude-code-install-skills)
- [Links](#links)
- [License](#license)

## Plugins Available

- **[worktree-manager](plugins/worktree-manager)** - Effortless git worktrees for parallel development with automatic environment setup
- **[chainer](plugins/chainer)** - Universal plugin orchestration for Claude Code
- **[orchestrate](plugins/orchestrate)** - Transform any task description into a structured agent team orchestration prompt
- **[prompt-repeater](plugins/prompt-repeater)** - Apply Google Research's prompt repetition technique to improve LLM performance on non-reasoning tasks
- **[design-partner](plugins/design-partner)** - AI-powered design thinking partner that helps explore ideas, generate visuals, and create prototypes

## Skills Available

- **[claude](skills/claude)** - A skill designed for use in a CLI like Codex to route a task to Anthropic Claude (for "consult Claude" workflows) and returns the result.

## Installation

### Claude Code: Add the Marketplace + Install Plugins

In Claude Code, run:

```bash
/plugin marketplace add danielraffel/generous-corp-marketplace
```

Then install plugins:

Worktree Manager:
```
/plugin install worktree-manager@generous-corp-marketplace
```

Chainer:
```
/plugin install chainer@generous-corp-marketplace
```

Prompt Repeater:
```
/plugin install prompt-repeater@generous-corp-marketplace
```

Orchestrate:
```
/plugin install orchestrate@generous-corp-marketplace
```

Design Partner:
```
/plugin install design-partner@generous-corp-marketplace
```

Then restart Claude Code.

---

### OpenAI Codex: Install Skills

Codex scans for skills in repo or user locations under .agents/skills. Recommended options:
 - Per-repo (share with a team): <repo>/.agents/skills/<skill-name>/
 - User-wide: ~/.agents/skills/<skill-name>/

Example: install this repo’s claude skill user-wide via symlink:
```
git clone https://github.com/danielraffel/generous-corp-marketplace
cd generous-corp-marketplace

mkdir -p ~/.agents/skills
ln -s "$(pwd)/skills/claude" ~/.agents/skills/claude
```

Usage in Codex:
 - Run /skills (or type $claude) to select a skill, or invoke it directly when relevant.

---

### Claude Code: Install Skills

Claude Code loads skills from:
 - Personal: ~/.claude/skills/<skill-name>/SKILL.md
 - Project: .claude/skills/<skill-name>/SKILL.md

Example: symlink the same claude skill into your personal Claude skills folder:
```
git clone https://github.com/danielraffel/generous-corp-marketplace
cd generous-corp-marketplace

mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/claude" ~/.claude/skills/claude
```

Usage in Claude Code:
 - Invoke directly with /claude ... (or let it trigger based on its description).

---

## Links

- [Worktree Manager Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/worktree-manager/)
- [Chainer Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/chainer/)
- [Orchestrate Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/orchestrate/)
- [Prompt Repeater Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/prompt-repeater/)
- [Design Partner Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/design-partner/)
- [Generous Corp](https://www.generouscorp.com/projects.html)

## License

MIT License
