---
description: List all active git worktrees with optional status information
argument-hint: "[--status]"
allowed-tools:
  - "mcp__worktree__worktree_list"
---

# Worktree List Command

Display all active git worktrees with optional detailed status.

## Usage

```bash
/worktree-manager:list [--status]
```

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Check for `--status` flag
   - Set `include_status: true` if flag present

2. **Call MCP tool**:
   - Use `mcp__worktree__worktree_list`
   - Pass `{ include_status: <true/false> }`

3. **Display results**:
   - Format as a numbered list
   - For each worktree show:
     - Label using Git's official terminology:
       - "Main worktree" for the original checkout (when `is_main: true`)
       - "Linked worktree" for additional worktrees (when `is_main: false`)
     - Path
     - Branch name (shown separately to avoid confusion with worktree type)
     - If `--status` was requested:
       - Uncommitted changes count
       - Untracked files count
       - Commits ahead/behind remote

4. **Format example**:
   ```
   Active Worktrees:

   1. Main worktree: /Users/username/project
      - Branch: split-apart
      - Commit: abc1234

   2. Linked worktree: /Users/username/worktrees/admin-messaging
      - Branch: feature/admin-messaging
      - Commit: def5678
      - Status: 3 uncommitted, 1 untracked, 2 ahead, 0 behind

   3. Linked worktree: /Users/username/worktrees/bug-fix
      - Branch: feature/bug-fix
      - Commit: 789abcd
      - Status: Clean ✅
   ```

5. **If no worktrees**:
   - Inform user no worktrees found besides main
   - Suggest using `/worktree-manager:create` to create one

## Examples

**Simple list**:
```
User: /worktree-manager:list
Claude: [Shows all worktrees with paths and branches]
```

**With status**:
```
User: /worktree-manager:list --status
Claude: [Shows worktrees with detailed git status]
```
