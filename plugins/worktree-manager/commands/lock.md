---
description: Lock worktree to prevent accidental removal
argument-hint: "<worktree-path> [--reason=\"text\"]"
allowed-tools:
  - "mcp__worktree__worktree_lock"
---

# Worktree Lock Command

Lock a worktree to prevent it from being removed accidentally.

## Usage

```bash
/worktree-manager:lock <worktree-path> [--reason="explanation"]
```

## Instructions for Claude

When user invokes this command:

1. **Parse arguments**:
   - Extract worktree path (required)
   - Extract optional `--reason="text"` → `reason: "text"`

2. **Call MCP tool**:
   - Use `mcp__worktree__worktree_lock`
   - Pass `worktree_path` and optional `reason`

3. **Display results**:
   - Show lock confirmation:
     - ✅ Worktree locked: <path>
     - Reason: <reason> (if provided)
   - Explain that worktree cannot be removed until unlocked
   - Mention /worktree-manager:unlock to unlock

4. **Error handling**:
   - Worktree doesn't exist → suggest checking path
   - Already locked → inform user it's already locked
   - Permission errors → explain issue

## Examples

**Lock without reason**:
```
User: /worktree-manager:lock ~/worktrees/important-feature
Claude: ✅ Worktree locked: ~/worktrees/important-feature
        Cannot be removed until unlocked with /worktree-manager:unlock
```

**Lock with reason**:
```
User: /worktree-manager:lock ~/worktrees/feature-x --reason="In active development"
Claude: ✅ Worktree locked: ~/worktrees/feature-x
        Reason: In active development
```

## Use Cases

- Protect worktrees with uncommitted experiments
- Prevent cleanup during long-running tasks
- Mark worktrees as "do not touch"
- Team collaboration safety
