---
description: Delete a git branch (local and optionally remote)
argument-hint: "<branch-name> [--force] [--delete-remote] [--remote=<name>]"
allowed-tools:
  - "mcp__worktree__worktree_delete_branch"
---

# Worktree Delete Branch Command

Delete a git branch with safety checks for uncommitted work.

## Usage

```bash
/worktree-manager:delete-branch <branch-name> [options]
```

## Options

- `--force` - Force delete even if branch not fully merged
- `--delete-remote` - Also delete the branch from remote repository
- `--remote=<name>` - Specify remote name (default: origin)

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Extract branch name (required)
   - Check for `--force` flag → `force: true`
   - Check for `--delete-remote` flag → `delete_remote: true`
   - Extract `--remote=<name>` → `remote_name: "<name>"`

2. **Safety warnings**:
   - If `--force` is used, warn user about potential data loss
   - If `--delete-remote` is used, mention this is permanent

3. **Call MCP tool**:
   - Use `mcp__worktree__worktree_delete_branch`
   - Pass `branch_name` and all options

4. **Display results**:
   - Show deletion status:
     - ✅ Local branch deleted: <branch-name>
     - ✅ Remote branch deleted from <remote> (if applicable)
   - Show any warnings if remote deletion failed

5. **Error handling**:
   - Branch doesn't exist → suggest using /worktree-manager:list
   - Not fully merged → suggest --force or merge first
   - Currently checked out → need to switch branches first
   - Remote deletion failed → show warning but report local success

## Examples

**Delete local branch**:
```
User: /worktree-manager:delete-branch feature/old-feature
Claude: ✅ Local branch deleted: feature/old-feature
```

**Delete with remote**:
```
User: /worktree-manager:delete-branch feature/done --delete-remote
Claude: ✅ Local branch deleted: feature/done
        ✅ Remote branch deleted from origin
```

**Force delete unmerged**:
```
User: /worktree-manager:delete-branch feature/experiment --force
Claude: ⚠️  Force mode - bypassing merge checks
        ✅ Local branch deleted: feature/experiment
```

**Custom remote**:
```
User: /worktree-manager:delete-branch feature/test --delete-remote --remote=upstream
Claude: ✅ Local branch deleted: feature/test
        ✅ Remote branch deleted from upstream
```

## Safety Features

- **Default behavior**: Refuses to delete branches not fully merged
- **--force**: Bypasses safety check (use with caution)
- **Current branch check**: Cannot delete the branch you're currently on
- **Remote warning**: Clearly indicates when remote deletion is attempted

## Use Cases

- Clean up merged feature branches
- Remove experimental branches
- Delete branches after PR merge
- Clean up both local and remote in one command
