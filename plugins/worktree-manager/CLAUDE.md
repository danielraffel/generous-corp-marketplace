# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Worktree Manager is a two-layer system for parallel feature development using git worktrees:
- **Plugin layer** (root directory): User-facing slash commands for Claude Code
- **MCP server layer** (`mcp-server/`): TypeScript backend with git operations (99% test coverage)

**Distribution**: Available via Claude Code marketplace at `generous-corp-marketplace`

## Build & Development Commands

```bash
# Build MCP server (required before use)
cd mcp-server && npm install && npm run build

# Run tests
cd mcp-server && npm test

# Watch mode during development
cd mcp-server && npm run watch

# Coverage report
cd mcp-server && npm run test:coverage

# Lint
cd mcp-server && npm run lint
```

## Architecture

```
worktree-manager/                # Repository root (IS the plugin)
├── .claude-plugin/
│   ├── plugin.json              # Plugin manifest - defines MCP server
│   └── marketplace.json         # Marketplace definition
├── commands/                    # Slash command markdown files (11 total)
│   ├── start.md                 # Create worktree
│   ├── list.md, status.md       # Query worktrees
│   ├── cleanup.md               # Remove worktree
│   ├── move.md, lock.md         # Worktree lifecycle
│   ├── unlock.md, repair.md     # Worktree management
│   ├── prune.md                 # Cleanup orphaned worktrees
│   └── rename-branch.md         # Branch operations
│       delete-branch.md
├── ai/                          # Development documentation
│   ├── IMPLEMENTATION_PLAN.md   # Feature tracking
│   ├── MANUAL_TESTING_CHECKLIST.md
│   ├── TESTING_GUIDE.md
│   └── EDGE_CASES.md
└── mcp-server/                  # TypeScript MCP server (backend)
    ├── src/
    │   ├── index.ts             # MCP server entry, tool definitions
    │   ├── tools/               # 11 MCP tools (worktree-*.ts)
    │   │   ├── worktree-start.ts, worktree-list.ts
    │   │   ├── worktree-status.ts, worktree-cleanup.ts
    │   │   ├── worktree-move.ts, worktree-lock.ts
    │   │   ├── worktree-unlock.ts, worktree-repair.ts
    │   │   ├── worktree-prune.ts
    │   │   ├── worktree-rename-branch.ts
    │   │   └── worktree-delete-branch.ts
    │   ├── utils/               # Core utilities
    │   │   ├── git-helpers.ts   # Git operations (move, lock, rename, delete, etc.)
    │   │   ├── project-detector.ts  # Auto-detect project type
    │   │   ├── setup-runner.ts      # Run setup commands
    │   │   ├── config-reader.ts     # Read config files
    │   │   ├── file-copier.ts       # Pattern-based file copying
    │   │   └── command-builder.ts   # Build git commands
    │   └── types.ts             # TypeScript interfaces
    ├── tests/                   # 99% coverage (71 tests)
    │   └── unit/
    └── dist/                    # Pre-built (committed to repo for easy installation)
```

## Key Concepts

**MCP Tools**: 11 tools exposed via Model Context Protocol:
- Core: `worktree_start`, `worktree_list`, `worktree_status`, `worktree_cleanup`
- Lifecycle: `worktree_move`, `worktree_lock`, `worktree_unlock`, `worktree_repair`, `worktree_prune`
- Branch: `worktree_rename_branch`, `worktree_delete_branch`

**Worktree Lifecycle Management**:
- **Move**: Relocate worktrees while maintaining git references
- **Lock**: Prevent accidental deletion with optional reason
- **Unlock**: Re-enable deletion
- **Repair**: Fix broken administrative files
- **Prune**: Clean up orphaned references

**Branch Management**:
- **Rename**: Update branch names with automatic ref updates
- **Delete**: Remove branches with safety checks (prevents unmerged deletion unless --force)
- **Create from existing**: Checkout existing branches in new worktrees

**Universal Auto-detection**: Automatically detects 18+ ecosystems with smart package manager detection (Node.js with npm/yarn/pnpm/bun, Python with uv/Poetry/pipenv/pip, Ruby, Go, Rust, Java, PHP, Elixir, .NET, Scala, Flutter, Dart, iOS). Priority-based detection ensures only one primary setup runs per ecosystem family.

**File Copying**: Automatically copies development environment files (.env, .vscode) using configurable glob patterns with include/exclude support

**Plugin Integration**: Works standalone or pairs with Chainer plugin for workflow automation

## Configuration

Users configure via `~/.claude/worktree-manager.local.md` (global) or `.claude/worktree-manager.local.md` (project).

**Key Configuration Options** (YAML frontmatter):
- `worktree_base_path`: Where worktrees are created (default: `~/worktrees`)
- `branch_prefix`: Prefix for new branches (default: `feature/`)
- `copy_files_enabled`: Auto-copy environment files (default: `true`)
- `copy_file_patterns`: Files to copy (default: `['.env', '.vscode/**', '*.local']`)
- `exclude_file_patterns`: Files to exclude (default: `['node_modules', 'dist', '.git']`)
- `auto_init_submodules`: Initialize git submodules (default: `true`)
- `create_learnings_file`: Create LEARNINGS.md in worktree (default: `false`)

See README.md for complete configuration reference.

## Adding Features

1. Implement TypeScript tool in `mcp-server/src/tools/`
2. Add tests in `mcp-server/tests/`
3. Export from `mcp-server/src/index.ts`
4. Create command markdown in `commands/`
5. Run `npm run build` in mcp-server
6. **Important**: Commit the built `mcp-server/dist/` files so users don't need to build

## Installation (for Users)

Users install via Claude Code marketplace:
```bash
/plugin marketplace add danielraffel/generous-corp-marketplace
/plugin install worktree-manager@generous-corp-marketplace
# Restart Claude Code
```

No build step required - `dist/` folder is pre-built and committed to repository.
