# Generous Corp Marketplace

Official marketplace for **Claude Code plugins** and **Agent Skills** (`SKILL.md`) you can use with **OpenAI Codex** and **Claude Code**.

## Contents

- [Plugins Available](#plugins-available)
- [Skills Available](#skills-available)
  - [Codex Skills](#codex-skills)
  - [Claude Code Skills](#claude-code-skills)
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
- **[juce-dev](plugins/juce-dev)** - Create and develop JUCE audio plugins with guided project setup, Visage GPU UI integration, and Xcode workflows

## Skills Available

### Codex Skills

- **[claude](skills/codex/claude)** - Route a task to Anthropic Claude from Codex and return the response.
- **[juce-visage](skills/codex/juce-visage)** - Guide for integrating the Visage GPU-accelerated UI framework with JUCE audio plugins on macOS and iOS/iPadOS.

### Claude Code Skills

- **[juce-visage](skills/claude/juce-visage)** - Claude Code version of the JUCE+Visage integration skill (also bundled with the `juce-dev` plugin).

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

JUCE Dev:
```
/plugin install juce-dev@generous-corp-marketplace
```

Then restart Claude Code.

---

### OpenAI Codex: Install Skills

Codex scans for skills in repo or user locations under .agents/skills. Recommended options:
 - Per-repo (share with a team): <repo>/.agents/skills/<skill-name>/
 - User-wide: ~/.agents/skills/<skill-name>/

Example: install this repo's Codex skills user-wide via symlink:
```
git clone https://github.com/danielraffel/generous-corp-marketplace
cd generous-corp-marketplace

mkdir -p ~/.agents/skills
ln -s "$(pwd)/skills/codex/claude" ~/.agents/skills/claude
ln -s "$(pwd)/skills/codex/juce-visage" ~/.agents/skills/juce-visage
```

Usage in Codex:
 - Run `/skills` (or type `$claude` / `$juce-visage`) to select or invoke a skill.

---

### Claude Code: Install Skills

Claude Code loads skills from:
 - Personal: ~/.claude/skills/<skill-name>/SKILL.md
 - Project: .claude/skills/<skill-name>/SKILL.md

Example: symlink the Claude Code `juce-visage` skill into your personal Claude skills folder:
```
git clone https://github.com/danielraffel/generous-corp-marketplace
cd generous-corp-marketplace

mkdir -p ~/.claude/skills
ln -s "$(pwd)/skills/claude/juce-visage" ~/.claude/skills/juce-visage
```

Usage in Claude Code:
 - Use it when working on JUCE+Visage integration, or install `juce-dev` to get the same skill bundled automatically.

---

## Links

- [Worktree Manager Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/worktree-manager/)
- [Chainer Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/chainer/)
- [Orchestrate Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/orchestrate/)
- [Prompt Repeater Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/prompt-repeater/)
- [Design Partner Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/design-partner/)
- [JUCE Dev Homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/juce-dev/)
- [Generous Corp](https://www.generouscorp.com/projects.html)

## License

MIT License
