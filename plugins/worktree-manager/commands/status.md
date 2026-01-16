---
description: Get detailed status of a specific worktree
argument-hint: "<worktree-path>"
allowed-tools:
  - "mcp__worktree__worktree_status"
---

# Worktree Status Command

Get comprehensive status information for a specific worktree.

## Usage

```bash
/worktree-manager:status <worktree-path>
```

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Extract worktree path from first argument
   - Expand ~ to user home if needed

2. **Call MCP tool**:
   - Use `mcp__worktree__worktree_status`
   - Pass `{ worktree_path: "<path>" }`

3. **Display results**:
   - Show worktree type using Git's official terminology:
     - "Main worktree" for the original checkout
     - "Linked worktree" for additional worktrees
   - Show worktree path and branch
   - Display status metrics:
     - Uncommitted changes count
     - Untracked files count
     - Commits ahead of remote
     - Commits behind remote
   - Add warnings if:
     - Has uncommitted changes
     - Is behind remote
   - Show ✅ if clean

4. **Format example**:
   ```
   Linked worktree: /Users/username/worktrees/admin-messaging
   - Branch: feature/admin-messaging
   - Commit: abc1234

   Status:
     Uncommitted changes: 3
     Untracked files: 1
     Commits ahead of remote: 2
     Commits behind remote: 0

   ⚠️  Worktree has uncommitted changes
   ```

5. **Error handling**:
   - If worktree doesn't exist, inform user
   - Suggest using `/worktree-manager:list` to see available worktrees

## Examples

**Check status**:
```
User: /worktree-manager:status ~/worktrees/feature-name
Claude: [Shows detailed status of that worktree]
```

**Non-existent worktree**:
```
User: /worktree-manager:status ~/nonexistent
Claude: Worktree not found. Use /worktree-manager:list to see available worktrees.
```
