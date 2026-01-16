---
description: Unlock worktree to allow removal
argument-hint: "<worktree-path>"
allowed-tools:
  - "mcp__worktree__worktree_unlock"
---

# Worktree Unlock Command

Unlock a locked worktree to allow it to be removed.

## Usage

```bash
/worktree-manager:unlock <worktree-path>
```

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Extract worktree path (required)

2. **Call MCP tool**:
   - Use `mcp__worktree__worktree_unlock`
   - Pass `worktree_path`

3. **Display results**:
   - Show unlock confirmation:
     - ✅ Worktree unlocked: <path>
   - Explain that worktree can now be removed with /worktree-manager:cleanup

4. **Error handling**:
   - Worktree doesn't exist → suggest checking path
   - Not locked → inform user it wasn't locked
   - Permission errors → explain issue

## Examples

**Basic unlock**:
```
User: /worktree-manager:unlock ~/worktrees/feature-x
Claude: ✅ Worktree unlocked: ~/worktrees/feature-x
        Can now be removed with /worktree-manager:cleanup
```

## Workflow

Typical workflow:
1. Lock worktree: `/worktree-manager:lock ~/worktrees/feature`
2. (Work happens, worktree is protected)
3. Unlock worktree: `/worktree-manager:unlock ~/worktrees/feature`
4. Remove worktree: `/worktree-manager:cleanup ~/worktrees/feature`
