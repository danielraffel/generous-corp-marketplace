# Worktree Manager Marketplace

This repository serves as both a Claude Code plugin and a plugin marketplace.

## Installation

### Step 1: Add the Marketplace

```bash
/plugin marketplace add danielraffel/generous-corp-marketplace
```

### Step 2: Install the Plugin

In Claude Code, type:

```bash
/plugin
```

Then:
1. Navigate to "generous-corp-marketplace"
2. Select "worktree-manager"
3. Click "Install for you (user scope)"

Or install directly via command:

```bash
/plugin install worktree-manager@generous-corp-marketplace
```

## Prerequisites

Before installing, ensure you have:

1. **Git** worktree support (Git 2.5+)
2. **Claude Code** installed
3. **Node.js** (v16 or later) - for project setup automation only

## Verification

Verify installation:

```bash
/plugin list
```

You should see `worktree-manager` in the list.

Test the plugin:

```bash
/worktree-manager:create test-feature
```

## Available Commands

- `/worktree-manager:create <feature-name>` - Create new worktree with auto-setup
- `/worktree-manager:list` - List all worktrees
- `/worktree-manager:status` - Check worktree status
- `/worktree-manager:cleanup <path>` - Remove worktree safely

## Documentation

- **Homepage**: https://www.generouscorp.com/worktree-manager/
- **GitHub**: https://github.com/danielraffel/worktree-manager
- **Issues**: https://github.com/danielraffel/worktree-manager/issues

## License

MIT License - see [LICENSE](LICENSE) for details
