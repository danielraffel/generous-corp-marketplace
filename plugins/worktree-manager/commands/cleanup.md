---
description: Safely merge worktree to main and remove it
argument-hint: "<worktree-path> [--merge] [--force]"
allowed-tools:
  - "mcp__worktree__worktree_cleanup"
---

# Worktree Cleanup Command

Merge worktree changes to main branch and safely remove the worktree.

## Usage

```bash
/worktree-manager:cleanup <worktree-path> [options]
```

## Options

- `--merge` - Auto-merge to target branch before removing
- `--target=<branch>` - Branch to merge into (default: main)
- `--force` - Force removal even with uncommitted changes (DANGER: loses changes)
- `--keep-branch` - Don't delete feature branch after merge

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Extract worktree path (required)
   - Check for `--merge` flag → `auto_merge: true`
   - Extract `--target=<branch>` → `target_branch: "<branch>"`
   - Check for `--force` flag → `force: true`
   - Check for `--keep-branch` → `delete_branch: false`

2. **Safety check**:
   - If `--force` is used, **warn user** that uncommitted changes will be lost
   - Ask for confirmation before proceeding

3. **Call MCP tool**:
   - Use `mcp__worktree__worktree_cleanup`
   - Pass all extracted parameters

4. **Display results**:
   - Show what was done:
     - ✅ Merged (if auto_merge was true)
     - ✅ Worktree removed
     - ✅ Branch deleted (if applicable)
   - Display next steps from result

5. **Error handling**:
   - If uncommitted changes and no `--force`:
     - Show the error
     - List the uncommitted files
     - Suggest either:
       - Commit/stash changes first
       - Use `--force` to discard (with warning)
   - If merge conflicts:
     - Explain the conflict
     - Provide manual resolution steps

6. **Format example**:
   ```
   Cleaning up worktree: ~/worktrees/feature-name

   ✅ Merged feature/feature-name into main
   ✅ Worktree removed
   ✅ Branch feature/feature-name deleted

   Next steps:
     Push to remote: git push origin main
   ```

## Examples

**Remove without merge**:
```
User: /worktree-manager:cleanup ~/worktrees/old-feature
Claude: [Removes worktree, keeps branch]
```

**Merge and remove**:
```
User: /worktree-manager:cleanup ~/worktrees/completed-feature --merge
Claude: [Merges to main, removes worktree, deletes branch]
```

**Force remove (dangerous)**:
```
User: /worktree-manager:cleanup ~/worktrees/experiment --force
Claude: ⚠️ WARNING: This will discard uncommitted changes. Continue? (yes/no)
User: yes
Claude: [Forces removal, changes lost]
```

**Custom target branch**:
```
User: /worktree-manager:cleanup ~/worktrees/feature --merge --target=develop
Claude: [Merges into develop instead of main]
```

## Safety Notes

- **Default behavior**: Refuses to remove if uncommitted changes exist
- **--force**: Bypasses safety check (use with caution)
- **--merge**: Automatically merges before removing (convenient but less control)
- **Best practice**: Commit or stash changes before cleanup
