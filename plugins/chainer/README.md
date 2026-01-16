# ⛓️ Chainer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A Claude Code plugin that lets you describe what you want to build, then suggests and runs the right plugins—end to end.

> **⚠️ Early Development**: Chainer is in active development. Expect rough edges, breaking changes, and incomplete features. Some documented features are designed but not yet implemented.

## What is Chainer?

Chainer lets you combine multiple Claude Code plugins into automated workflows called "chains". Just describe your goal in natural language—Chainer figures out which plugins to run and in what order.

## Features

- **Natural Language**: Just describe what you want to build
- **Chain Plugins**: Combine any Claude Code plugins in sequence
- **Smart Questions**: Interactive clarifying questions from any plugin
- **Config-Driven**: Define chains in YAML - no code required
- **Built-in Chains**: Get started immediately with pre-configured workflows
- **Dependency Detection**: Automatically checks for missing plugins before execution
- **Plugin Discovery**: Discover plugins and chains through natural language suggestions

## Quick Start

### Installation

#### 1. Add the Marketplace

In Claude Code, run:

```bash
/plugin marketplace add danielraffel/worktree-manager
```

#### 2. Install the Plugin

```bash
/plugin install chainer@generous-corp-marketplace
```

Or use the interactive installer:
1. Type `/plugin`
2. Navigate to "generous-corp-marketplace"
3. Select "chainer"
4. Click "Install for you (user scope)"

#### 3. Restart Claude Code

Quit and reopen Claude Code to load the plugin.

#### 4. Verify Installation

```bash
/plugin list
# Should show chainer

/chainer:list
# Test a command
```

### Basic Usage

```bash
# Discover plugins and chains with natural language
/chainer:suggest "plan and implement a login feature"

# List available chains
/chainer:list

# Check plugin dependencies for a chain
/chainer:check-deps plan-and-implement

# Run a chain
/chainer:run plan-and-implement \
  --prompt="Build OAuth authentication" \
  --feature_name="oauth"

# Check running chains
/chainer:status
```

## Built-in Chains

### `plan-and-implement`
Complete feature development workflow:
1. Plan with `feature-dev:feature-dev`
2. Implement with `ralph-loop` loop

```bash
/chainer:run plan-and-implement \
  --prompt="Build user dashboard" \
  --feature_name="dashboard"
```

### `plan-only`
Just planning, no implementation:

```bash
/chainer:run plan-only \
  --prompt="Design payment system" \
  --feature_name="payments"
```

### `implement-only`
Implement from an existing spec:

```bash
/chainer:run implement-only \
  --spec_file="audit/oauth.md"
```

### `worktree-plan-implement`
Full workflow with worktree creation (requires worktree-manager):
1. Create isolated worktree
2. Plan with `feature-dev`
3. Implement with `ralph-loop`

```bash
/chainer:run worktree-plan-implement \
  --feature_name="oauth" \
  --prompt="Build OAuth2 authentication"
```

## Plugin Discovery & Dependency Management

### Smart Suggestions

Not sure which plugin to use? Ask Chainer in natural language:

```bash
/chainer:suggest "review my code for security issues"
```

**Output:**
```
Suggestions for: "review my code for security issues"

Matched plugins:
  • security-guidance - Security best practices and guidance
    Install: /plugin install security-guidance@claude-plugins-official
    Matched keywords: "security"

  • code-review - Code review and quality analysis
    Install: /plugin install code-review@claude-plugins-official
    Matched keywords: "review"
```

Chainer matches your description against 85+ keywords across all official plugins and recommends:
- Relevant chains (if multiple plugins match)
- Individual plugins with installation commands
- Runnable examples you can copy-paste

### Dependency Detection

Chainer automatically checks for missing plugins **before** running a chain:

```bash
/chainer:run plan-and-implement --prompt "test"
```

**If plugins are missing:**
```
❌ Cannot run 'plan-and-implement' - missing required plugin(s)

Missing plugins:
  • ralph-loop - Autonomous implementation loops
    Install: /plugin install ralph-loop@claude-plugins-official
    Docs: https://awesomeclaude.ai/ralph-loop

Dependency status for 'plan-and-implement':
  ✅ feature-dev
  ❌ ralph-loop

To skip this check: /chainer:run plan-and-implement --skip-deps-check ...
```

**Check dependencies manually:**
```bash
# Check specific chain
/chainer:check-deps plan-and-implement

# Check all built-in chains
/chainer:check-deps
```

This prevents frustrating errors mid-execution and shows exactly how to fix missing dependencies.

## Creating Custom Chains

### Configuration File

Create or edit `~/.claude/chainer.local.md`:

```yaml
---
chains:
  my-workflow:
    enabled: true
    description: "Custom development workflow"
    inputs:
      task: { required: true, description: "What to build" }
    steps:
      - name: plan
        type: skill
        skill: feature-dev:feature-dev
        args: "{{task}}"
      - name: test
        type: script
        script: npm test
      - name: build
        type: script
        script: npm run build

defaults:
  spec_directory: audit
  max_iterations: 50
---

# Your notes here
```

### Step Types

| Type | Description | Example |
|------|-------------|---------|
| `skill` | Invoke Claude Code skill | `feature-dev:feature-dev` |
| `script` | Run bash commands | `npm test && npm run build` |
| `mcp` | Call MCP server tool | Coming in v0.2 |
| `prompt` | Ask user mid-chain | Coming in v0.2 |
| `wait` | Wait for file/condition | Coming in v0.2 |

### Variable Substitution

Use `{{variable}}` syntax to reference:

- **Inputs**: `{{prompt}}`, `{{feature_name}}`
- **Step outputs**: `{{spec_file}}` (from previous steps)
- **Special vars**: `{{cwd}}`, `{{home}}`, `{{env.API_KEY}}`

## Visual Settings Editor

Open `settings.html` in your browser for a visual interface:

- Drag-and-drop step reordering
- Enable/disable chains with checkboxes
- Add/remove inputs and steps
- Import/export chains
- Download configuration file

```bash
open ~/.claude/plugins/chainer/settings.html
```

## Integration with Other Plugins

### With Worktree Manager

Create a worktree and run a chain:

```bash
# Two commands
/worktree-manager:start oauth
/chainer:run plan-and-implement --cwd="~/worktrees/oauth" --prompt="OAuth"

# Or use the combined chain (coming in Phase 3)
/chainer:run worktree-plan-implement --feature_name="oauth" --prompt="OAuth"
```

### With Feature Dev

Chainer uses `feature-dev` for planning by default:

```bash
/chainer:run plan-only --prompt="Design API" --feature_name="api"
```

### With Ralph Wiggum

Chainer uses `ralph-loop` for implementation loops:

```bash
/chainer:run implement-only --spec_file="audit/api.md"
```

## Advanced Usage

### Working Directory

Run a chain in a specific directory:

```bash
/chainer:run plan-and-implement \
  --cwd="~/worktrees/oauth" \
  --prompt="OAuth" \
  --feature_name="oauth"
```

### Environment Variables

Reference environment variables in chains:

```yaml
steps:
  - name: deploy
    type: script
    script: |
      export API_KEY={{env.API_KEY}}
      ./deploy.sh
```

## Configuration Locations

Chainer looks for configuration in this order:

1. `.claude/chainer.local.md` (project-specific)
2. `~/.claude/chainer.local.md` (global)
3. Plugin defaults

## Community Chains

Share and discover chains in `community-chains/`:

```
community-chains/
├── development/
│   ├── plan-and-implement.yaml
│   ├── tdd-feature.yaml
│   └── design-and-build.yaml
├── content/
│   ├── research-to-deck.yaml
│   └── video-to-doc.yaml
└── marketing/
    └── landing-page.yaml
```

Import from URL:
```bash
# In settings.html
Import → From URL → https://raw.githubusercontent.com/user/repo/main/chain.yaml
```

## Examples

### Full Feature Development

```bash
/chainer:run plan-and-implement \
  --prompt="Add user authentication with OAuth" \
  --feature_name="auth"
```

This will:
1. Plan the feature with `feature-dev`
2. Save spec to `audit/auth.md`
3. Implement with `ralph-loop` loop
4. Iterate until complete

### Quick Implementation

Already have a spec? Skip planning:

```bash
/chainer:run implement-only --spec_file="audit/auth.md"
```

### Planning Only

Just want to plan without implementing?

```bash
/chainer:run plan-only \
  --prompt="Design payment system" \
  --feature_name="payments"
```

## Troubleshooting

### Chain not found

```
❌ Chain 'my-chain' not found
```

**Fix**: Check chain name with `/chainer:list` or enable it in config

### Missing plugin

Chainer now detects this automatically before execution:

```
❌ Cannot run 'plan-only' - missing required plugin(s)

Missing plugins:
  • feature-dev - Feature planning with architecture focus
    Install: /plugin install feature-dev@claude-plugins-official
```

**Fix**: Run the exact `/plugin install` command shown

To see all dependencies: `/chainer:check-deps plan-only`

### Missing required input

```
❌ Missing required input: prompt
```

**Fix**: Provide all required inputs: `--prompt="value"`

## Development

Chainer is part of a two-plugin system:

- **Worktree Manager**: Pure git worktree operations
- **Chainer**: Universal plugin orchestration

See [FEATURE-PLAN-CHAINER-SPLIT.md](https://github.com/danielraffel/worktree-manager/blob/main/FEATURE-PLAN-CHAINER-SPLIT.md) for architecture details.

## Roadmap

- **v0.1** ✅: Config-driven chains, visual editor, built-in workflows
- **v0.2** (Current) ✅: Dependency detection, plugin suggestions, tmux integration, status tracking
- **v0.3** (Planned): Inline pipe syntax, import/export, community chains
- **v1.0** (Future): Production ready, comprehensive docs, marketplace integration

## Contributing

Contributions welcome! See `community-chains/` for examples of shareable chains.

## License

MIT License - see LICENSE file for details

## Credits

Built by [Daniel Raffel](https://github.com/danielraffel) for the Claude Code community.

## Links

- [Website](https://danielraffel.github.io/Chainer)
- [GitHub](https://github.com/danielraffel/Chainer)
- [Worktree Manager](https://github.com/danielraffel/worktree-manager)
- [Feature Plan](https://github.com/danielraffel/worktree-manager/blob/main/FEATURE-PLAN-CHAINER-SPLIT.md)
