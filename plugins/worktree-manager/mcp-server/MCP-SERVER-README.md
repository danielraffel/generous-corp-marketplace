# Worktree Manager - MCP Server

**MCP Server providing git worktree management tools for Claude Code**

This is the **backend layer** of the Worktree Manager system. It provides MCP tools that handle the actual git operations, project detection, and workflow automation.

## Architecture

```
Claude Code
    ↓
Claude Code Plugin (worktree-manager-plugin/)
    ↓
MCP Server (this directory)
    ↓
Git Operations (TypeScript + tested code)
```

**This directory**: MCP server with robust TypeScript implementation
**Plugin directory**: User-facing commands and workflows (separate, see ../worktree-manager-plugin/)

## What This Provides

### MCP Tools

4 tools exposed via Model Context Protocol:

1. **worktree_start** - Create worktree with auto-setup and optional plugin integration
2. **worktree_list** - List all worktrees with optional status
3. **worktree_status** - Get detailed status of specific worktree
4. **worktree_cleanup** - Safely merge and remove worktrees

### Features

- ✅ **4 workflows**: simple, plan-only, implement-only, plan-and-implement
- ✅ **Auto-setup**: Detects web/iOS projects, runs npm install
- ✅ **Template automation**: Auto-fills ralph's 50-line prompts
- ✅ **Feature-dev integration**: Chains planning → implementation
- ✅ **Background execution**: Long-running tasks don't block work
- ✅ **Type-safe**: TypeScript with 99%+ test coverage
- ✅ **Well-tested**: 45 passing tests, robust error handling

## Installation

### As MCP Server (for direct use)

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Add to Claude Code
claude mcp add --transport stdio worktree \
  -- node /path/to/worktree-manager/mcp-server/dist/index.js
```

### With Plugin Wrapper (recommended)

See `../worktree-manager-plugin/` for the user-facing plugin that uses this MCP server.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch

# Run tests
npm test

# Coverage
npm run test:coverage
```

## Testing

Comprehensive test suite with 45 tests:

- **99.38%** statement coverage
- **88.57%** branch coverage
- **100%** function coverage

```bash
npm test
```

## Project Structure

```
claude-plugin/                    # MCP Server (this directory)
├── src/
│   ├── index.ts                  # MCP server entry point
│   ├── tools/
│   │   ├── worktree-start.ts     # Main workflow tool
│   │   ├── worktree-list.ts      # List worktrees
│   │   ├── worktree-status.ts    # Check status
│   │   └── worktree-cleanup.ts   # Merge and remove
│   ├── templates/
│   │   └── ralph-default.ts      # Ralph template
│   ├── utils/
│   │   ├── git-helpers.ts        # Git operations
│   │   ├── project-detector.ts   # Detect web/iOS
│   │   ├── setup-runner.ts       # Run npm install
│   │   ├── template-filler.ts    # Fill ralph templates
│   │   └── command-builder.ts    # Build Claude commands
│   └── types.ts                  # TypeScript types
├── tests/                        # Comprehensive test suite
├── dist/                         # Compiled JavaScript
├── package.json                  # MCP server config
└── MCP-SERVER-README.md          # This file
```

## Tool Schemas

### worktree_start

Create git worktree with automation.

**Parameters**:
- `feature_name` (required): Feature name
- `base_branch`: Branch to branch from (default: main)
- `workflow`: simple | plan-only | implement-only | plan-and-implement
- `plan_config`: Configuration for feature-dev
- `ralph_config`: Configuration for ralph-wiggum

**Returns**: `WorktreeStartResult` with success status, paths, and next steps

### worktree_list

List all worktrees with optional status.

**Parameters**:
- `include_status`: Include detailed status (default: false)

**Returns**: `WorktreeListResult` with array of worktrees

### worktree_status

Get status of specific worktree.

**Parameters**:
- `worktree_path` (required): Path to worktree

**Returns**: `WorktreeStatusResult` with branch, changes, tracking info

### worktree_cleanup

Merge and remove worktree.

**Parameters**:
- `worktree_path` (required): Path to worktree
- `auto_merge`: Merge before removing (default: false)
- `target_branch`: Branch to merge into (default: main)
- `force`: Force removal with uncommitted changes (default: false)
- `delete_branch`: Delete feature branch after merge (default: true)

**Returns**: `WorktreeCleanupResult` with merge status and next steps

## License

MIT
