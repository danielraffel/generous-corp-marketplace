---
description: Create git worktree with auto-setup
argument-hint: "<feature-name> [options]"
allowed-tools:
  - "mcp__worktree__worktree_start"
  - "mcp__worktree__worktree_detect_ecosystems"
  - "mcp__worktree__worktree_run_setup"
  - "AskUserQuestion"
  - "Read"
---

# Worktree Start Command

Create a new git worktree for parallel feature development with automatic environment setup.

## Usage

```bash
/worktree-manager:create <feature-name> [options]
```

## What It Does

1. Creates a new git worktree from the current branch
2. Creates a new feature branch (feature/<name>)
3. Detects project type (web, iOS, full-stack)
4. Runs automatic setup (npm install, swift build, etc.)
5. Suggests next steps

## Examples

### Basic Usage
```
/worktree-manager:create oauth-flow
```

Creates worktree at `~/worktrees/oauth-flow` with branch `feature/oauth-flow`.

### Custom Base Branch
```
/worktree-manager:create hotfix --base-branch=develop
```

Branches from `develop` instead of `main`.

### Custom Location
```
/worktree-manager:create experiment --worktree-path=/tmp/test-worktree
```

Creates worktree at custom path.

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--base-branch` | Branch to branch from | `main` |
| `--worktree-path` | Custom worktree location | `~/worktrees/<feature-name>` |

## Automated Workflows

For automated planning and implementation, use **Chainer** plugin:

```bash
# Install Chainer
/plugin install chainer@generous-corp-marketplace

# Full workflow (plan + implement)
/chainer:run plan-and-implement \
  --prompt="Build OAuth authentication" \
  --feature_name="oauth"

# Or create worktree first, then chain
/worktree-manager:create oauth
/chainer:run plan-and-implement \
  --cwd="~/worktrees/oauth" \
  --prompt="Build OAuth" \
  --feature_name="oauth"
```

## Implementation

### Step 1: Create the worktree

Read the feature name from the user's input and call the MCP tool to create the worktree:

```javascript
const result = await mcp__worktree__worktree_start({
  feature_name: "oauth-flow",  // from user input
  base_branch: "main",          // optional, from --base-branch flag
  worktree_path: undefined      // optional, from --worktree-path flag
});
```

### Step 2: Handle ecosystem detection and setup

Check the `auto_run_setup` config value from the result:

**If `auto_run_setup: 'auto'`**: The worktree tool already ran setup automatically. Skip to displaying results.

**If `auto_run_setup: false`**: Setup was skipped entirely. Display results with manual setup instructions.

**If `auto_run_setup: 'prompt'` (DEFAULT)**: Proceed with interactive ecosystem selection:

1. **Detect ecosystems**:
```javascript
const detected = await mcp__worktree__worktree_detect_ecosystems({
  worktree_path: result.worktree_path
});
```

2. **Handle based on ecosystem count**:

**If 0 ecosystems detected**: Skip setup, proceed to display results.

**If 1 ecosystem detected**: Ask simple yes/no question:
```javascript
const answer = await AskUserQuestion({
  questions: [{
    question: `Run ${detected.ecosystems[0].command}?`,
    header: "Setup",
    options: [
      { label: "Yes", description: `Run ${detected.ecosystems[0].description}` },
      { label: "Skip", description: "I'll set up manually" }
    ],
    multiSelect: false
  }]
});

if (answer.Setup === "Yes") {
  await mcp__worktree__worktree_run_setup({
    worktree_path: result.worktree_path,
    ecosystem_names: [detected.ecosystems[0].name]
  });
}
```

**If 2+ ecosystems detected**: Show multi-select options:
```javascript
const answer = await AskUserQuestion({
  questions: [{
    question: "Which project types should I set up?",
    header: "Ecosystems",
    options: detected.ecosystems.map(e => ({
      label: `${e.name} (${e.package_manager})`,
      description: e.command
    })),
    multiSelect: true
  }]
});

// Extract selected ecosystem names from answer
const selected = Object.entries(answer.Ecosystems || {})
  .filter(([_, isSelected]) => isSelected)
  .map(([label, _]) => {
    // Extract ecosystem name from label (e.g., "Node.js (npm)" -> "Node.js")
    return label.split(' (')[0];
  });

if (selected.length > 0) {
  const setupResult = await mcp__worktree__worktree_run_setup({
    worktree_path: result.worktree_path,
    ecosystem_names: selected
  });

  // Display setup results
  for (const msg of setupResult.messages) {
    console.log(msg);
  }
}
```

### Step 3: Display results

Show the worktree creation success message with next steps:

```
✅ Worktree created successfully!
📁 Path: ~/worktrees/oauth-flow
🌿 Branch: feature/oauth-flow

🔗 Chainer detected! For automated development:

  # Full workflow (plan + implement)
  /chainer:run plan-and-implement \
    --cwd="~/worktrees/oauth-flow" \
    --prompt="Your feature idea" \
    --feature_name="oauth-flow"

  # Or just planning
  /chainer:run plan-only --cwd="~/worktrees/oauth-flow" --prompt="Your idea"

  # Or manual development
  cd ~/worktrees/oauth-flow && claude
```

## Error Handling

Handle these common errors:

- Not in a git repository
- Worktree path already exists
- Branch already exists
- Setup commands failed

Show clear error messages and suggested fixes.

## Configuration

Users can configure defaults in `~/.claude/worktree-manager.local.md`:

```yaml
---
worktree_base_path: ~/my-worktrees
branch_prefix: feat/
create_learnings_file: true
---
```

See `/worktree-manager:list` to view configuration.
