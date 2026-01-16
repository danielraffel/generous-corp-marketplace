---
description: Move worktree to new filesystem location
argument-hint: "<current-path> <new-path>"
allowed-tools:
  - "mcp__worktree__worktree_move"
---

# Worktree Move Command

Move an existing worktree to a new filesystem location. Git references are updated automatically.

## Usage

```bash
/worktree-manager:move <current-path> <new-path>
```

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Extract current worktree path (required)
   - Extract new worktree path (required)

2. **Validation**:
   - Check that both paths are provided
   - Verify current path exists
   - Warn if new path already exists

3. **Call MCP tool**:
   - Use `mcp__worktree__worktree_move`
   - Pass `current_path` and `new_path`

4. **Display results**:
   - Show the move operation:
     - From: <current-path>
     - To: <new-path>
     - ✅ Worktree moved successfully
   - Explain that git references were updated automatically

5. **Error handling**:
   - Current path doesn't exist → suggest checking path or using /worktree-manager:list
   - Destination already exists → suggest different path or remove existing
   - Permission errors → explain and suggest sudo if appropriate

## Examples

**Basic move**:
```
User: /worktree-manager:move ~/worktrees/feature-a ~/projects/feature-a
Claude: Moving worktree from ~/worktrees/feature-a to ~/projects/feature-a
        ✅ Worktree moved successfully
```

**Move and rename**:
```
User: /worktree-manager:move ~/worktrees/old-name ~/worktrees/new-name
Claude: [Moves and renames worktree directory]
```

## Notes

- Git automatically updates all internal references
- The worktree remains functional after moving
- No need to re-run setup commands after moving
