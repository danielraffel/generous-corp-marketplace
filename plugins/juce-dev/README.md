# juce-dev

**Create JUCE audio plugin projects from the JUCE-Plugin-Starter template**

A Claude Code plugin that replaces the interactive `init_plugin_project.sh` script with a streamlined command-driven workflow. Uses `AskUserQuestion` for a better UX than sequential shell prompts.

## Installation

### 1. Add the Marketplace (if not already added)

```bash
claude mcp add-registry generous-corp-marketplace ~/Code/generous-corp-marketplace
```

### 2. Install the Plugin

```bash
/plugin install juce-dev@generous-corp-marketplace
```

### 3. Restart Claude Code

Close and reopen Claude Code to load the plugin.

### 4. Verify

Type `/juce-dev:create` to confirm the command is available.

## Prerequisites

- **Xcode** with command-line tools installed
- **CMake** (`brew install cmake`)
- **gh CLI** (`brew install gh`) — for GitHub repo creation
- **JUCE-Plugin-Starter** template cloned locally (or the command will clone it for you)

## Commands

### `/juce-dev:create <plugin-name> [--visage] [--no-github]`

Create a new JUCE plugin project from the starter template.

```
/juce-dev:create "My Cool Synth"
/juce-dev:create "GPU Synth" --visage
/juce-dev:create "Local Plugin" --no-github
```

**What it does:**
1. Locates the JUCE-Plugin-Starter template
2. Loads developer settings from the template's `.env`
3. Asks for project configuration via clean UI prompts
4. Copies the template, replaces all placeholders
5. Optionally sets up Visage GPU UI, DiagnosticKit
6. Initializes git and optionally creates a GitHub repo
7. Gives you a ready-to-build project

### `/juce-dev:setup-visage`

Add Visage GPU UI to an existing JUCE-Plugin-Starter project.

```
cd my-plugin-project
/juce-dev:setup-visage
```

## Integration with Other Plugins

- **juce-visage** skill: Available automatically for Visage UI development guidance
- **feature-dev**: Use `/feature-dev` after project creation to implement your first feature
- **worktree-manager**: Use `/worktree-manager:create` for parallel feature branches

## How It Works

The plugin replicates the `init_plugin_project.sh` workflow but with a better UX:

| Shell Script | juce-dev Plugin |
|---|---|
| 15+ sequential prompts | Grouped AskUserQuestion prompts |
| Terminal-only | Works in any Claude Code environment |
| Manual re-entry each time | Remembers developer settings from .env |
| No validation feedback | Shows derived values before proceeding |

All project creation steps (rsync, sed replacements, git init, gh repo create) run via Bash — no MCP server needed.

## Feedback & Issues

- [Report a bug](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-dev-bug.yml)
- [Request a feature](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-dev-feature.yml)
