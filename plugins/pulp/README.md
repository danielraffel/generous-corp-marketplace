# Pulp — Claude Code Plugin

Claude Code plugin for the [Pulp](https://github.com/danielraffel/pulp) audio framework.

Provides slash commands, skills, and hooks for the full audio plugin development lifecycle: build, test, design, validate, sign, and ship.

## Installation

This plugin is designed to be used inside a Pulp project. The full plugin (commands, skills, hooks) lives in the Pulp repository itself.

```bash
# 1. Add the marketplace
/plugin marketplace add danielraffel/generous-corp-marketplace

# 2. Install the plugin
/plugin install pulp@generous-corp-marketplace

# 3. Restart Claude Code to load the plugin
```

> **Note:** The Pulp repository is currently private. Until it is public, install from a local clone instead:
> ```bash
> claude plugin add /path/to/pulp
> ```

## What You Get

### Slash Commands

| Command | Description |
|---------|-------------|
| `/build` | Build the project |
| `/test [pattern]` | Run tests, optionally filtered |
| `/create <name>` | Scaffold a new plugin project |
| `/status` | Show project status |
| `/validate` | Run plugin format validators |
| `/design [style]` | AI-driven design session |
| `/ship` | Sign, package, and distribute |
| `/import-design` | Import from Figma, Stitch, v0, Pencil |

### Skills

| Skill | Purpose |
|-------|---------|
| `ci` | PR creation, local/cloud CI, merge on green |
| `engine` | Query, recommend, switch JS engine backend |
| `import-design` | Import designs with visual validation |
| `webview-ui` | Build WebView UIs with native bridge |

### Hooks

- **docs-reminder** — Alerts when source changes may need doc updates
- **cli-plugin-sync** — Alerts when CLI/MCP changes may need plugin updates

## More Info

See the full [plugin guide](https://github.com/danielraffel/pulp/blob/main/docs/guides/claude-code-plugin.md) in the Pulp repository.
