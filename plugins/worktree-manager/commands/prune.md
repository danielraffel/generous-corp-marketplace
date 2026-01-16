---
description: Prune orphaned worktree administrative references
argument-hint: ""
allowed-tools:
  - "mcp__worktree__worktree_prune"
---

# Worktree Prune Command

Remove administrative data for worktrees that have been manually deleted.

## Usage

```bash
/worktree-manager:prune
```

## Instructions for Claude

When user invokes this command:

1. **No arguments needed**:
   - This command operates on all orphaned worktrees automatically

2. **Call MCP tool**:
   - Use `mcp__worktree__worktree_prune`
   - No parameters needed

3. **Display results**:
   - If orphans found:
     - ✅ Pruned N orphaned worktree(s)
     - List each pruned path
     - Explain what was cleaned up
   - If no orphans:
     - ✅ No orphaned worktrees found
     - All worktree references are valid

4. **Error handling**:
   - Permission errors → explain and suggest solutions
   - Git errors → suggest checking git installation

## Examples

**With orphans**:
```
User: /worktree-manager:prune
Claude: ✅ Pruned 2 orphaned worktree(s):
           - ~/worktrees/old-feature
           - ~/worktrees/experiment

        These directories were manually deleted but still had
        git references. Those references have been cleaned up.
```

**No orphans**:
```
User: /worktree-manager:prune
Claude: ✅ No orphaned worktrees found
        All worktree references are valid
```

## When to Use

Use this command when:
- You manually deleted a worktree directory (rm -rf)
- Worktrees still show in /worktree-manager:list but don't exist
- You get errors about missing worktree paths
- After bulk cleanup of old worktree directories
- Before checking worktree status to clean up stale references

## What It Does

Prune removes git's administrative references for worktrees whose directories no longer exist. This cleans up:
- `.git/worktrees/<name>` directories in the main repo
- Stale entries in git's worktree list
- Broken references that cause git warnings

## Safe Operation

This is a safe operation:
- Only removes references to non-existent directories
- Does not delete any actual worktree directories
- Does not modify any existing worktrees
- Can be run anytime without risk
