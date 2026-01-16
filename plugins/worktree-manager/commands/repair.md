---
description: Repair broken worktree administrative files
argument-hint: "<worktree-path>"
allowed-tools:
  - "mcp__worktree__worktree_repair"
---

# Worktree Repair Command

Repair broken or corrupted worktree administrative files.

## Usage

```bash
/worktree-manager:repair <worktree-path>
```

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Extract worktree path (required)

2. **Call MCP tool**:
   - Use `mcp__worktree__worktree_repair`
   - Pass `worktree_path`

3. **Display results**:
   - Show repair status:
     - ✅ Worktree repaired: <path>
   - Explain that administrative files have been updated
   - Suggest verifying with /worktree-manager:status

4. **Error handling**:
   - Worktree doesn't exist → suggest using /worktree-manager:list
   - Not broken → inform user worktree is already functional
   - Permission errors → explain and suggest solutions

## Examples

**Repair worktree**:
```
User: /worktree-manager:repair ~/worktrees/broken-feature
Claude: ✅ Worktree repaired: ~/worktrees/broken-feature
        Administrative files have been updated
        Verify with: /worktree-manager:status ~/worktrees/broken-feature
```

## When to Use

Use this command when:
- Worktree was manually moved and git references broke
- Parent repository was moved
- `.git` file is corrupted or has wrong paths
- Git commands fail with "not a git repository" in a known worktree
- After manually copying/moving the parent repository

## What It Does

Repairs the connection between:
- Worktree `.git` file → Parent repository
- Parent repository → Worktree location
- Updates all internal path references
