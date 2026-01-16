---
description: Rename branch in a worktree
argument-hint: "<worktree-path> <old-name> <new-name>"
allowed-tools:
  - "mcp__worktree__worktree_rename_branch"
---

# Worktree Rename Branch Command

Rename a git branch within a specific worktree.

## Usage

```bash
/worktree-manager:rename-branch <worktree-path> <old-name> <new-name>
```

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Extract worktree path (required)
   - Extract old branch name (required)
   - Extract new branch name (required)

2. **Validation**:
   - Verify all three arguments are provided
   - Check that old and new names are different

3. **Call MCP tool**:
   - Use `mcp__worktree__worktree_rename_branch`
   - Pass `worktree_path`, `old_name`, `new_name`

4. **Display results**:
   - Show the rename operation:
     - Renaming branch in: <worktree-path>
     - From: <old-name>
     - To: <new-name>
     - ✅ Branch renamed successfully

5. **Error handling**:
   - Old branch doesn't exist → suggest checking branch name with git branch
   - New branch already exists → suggest different name or delete existing
   - Not on the branch → may need to switch to it first

## Examples

**Basic rename**:
```
User: /worktree-manager:rename-branch ~/worktrees/feature-x old-name new-name
Claude: ✅ Branch renamed from 'old-name' to 'new-name'
        Git references have been updated automatically
```

**Rename current branch**:
```
User: /worktree-manager:rename-branch ~/worktrees/my-feature feature/old feature/new
Claude: [Renames the branch in the specified worktree]
```

## Notes

- Renaming updates all git references automatically
- The worktree continues to work normally after rename
- This only renames the local branch, not remote branches
- To update remote, use: git push origin :old-name new-name
