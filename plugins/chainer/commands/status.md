---
description: Show running and completed chains
---

# Chainer: Chain Status

Display currently running chains and recently completed chains.

**User Communication:** Be concise. Show status directly without "Let me check..." narration.

## Step 1: Read State File

Check for the chainer state file at `.claude/chainer-state.json`.

If the file doesn't exist, display:
```
No chains have been run yet.

Use /chainer:list to see available chains
Use /chainer:run <chain-name> to execute a chain
```

## Step 2: Parse State

The state file format:
```json
{
  "running_chains": [
    {
      "chain": "plan-and-implement",
      "started": "2025-01-05T10:30:00Z",
      "cwd": "~/worktrees/oauth",
      "current_step": 2,
      "total_steps": 2,
      "step_name": "implement",
      "pid": 12345
    }
  ],
  "completed_chains": [
    {
      "chain": "plan-only",
      "started": "2025-01-05T09:00:00Z",
      "completed": "2025-01-05T09:15:00Z",
      "cwd": "~/worktrees/billing",
      "success": true
    }
  ]
}
```

## Step 3: Check Process Status

For each running chain:
1. Check if the process (PID) is still alive using `ps -p <pid>`
2. If not alive, move it to completed_chains with success=false
3. Update the state file

## Step 4: Display Status

Format output like this:

```
┌─────────────────────────────────────────┐
│ Chainer Status                          │
├─────────────────────────────────────────┤
│ Running Chains (1)                      │
│                                         │
│ 🔄 plan-and-implement (oauth)           │
│    Step 2/2: implement                  │
│    Directory: ~/worktrees/oauth         │
│    Running: 10 min                      │
│    PID: 12345                           │
├─────────────────────────────────────────┤
│ Recently Completed (3)                  │
│                                         │
│ ✅ plan-only (billing)                  │
│    Completed 5 min ago                  │
│    Duration: 15 min                     │
│    Directory: ~/worktrees/billing       │
│                                         │
│ ✅ implement-only (payments)            │
│    Completed 1 hour ago                 │
│    Duration: 45 min                     │
│    Directory: ~/worktrees/payments      │
│                                         │
│ ❌ plan-and-implement (subscriptions)   │
│    Failed 2 hours ago                   │
│    Duration: 30 min                     │
│    Directory: ~/worktrees/subscriptions │
└─────────────────────────────────────────┘

💡 Tip: Recently completed shows last 10 chains
```

## Step 5: Cleanup Old Entries

Keep only the last 10 completed chains in the state file to prevent unbounded growth.

## Implementation Notes

You are implementing this command. You should:

1. **Read state file** `.claude/chainer-state.json` using Read tool
2. **Validate running processes** using `ps -p <pid>` via Bash tool
3. **Calculate durations** from timestamps
4. **Format relative times** (e.g., "5 min ago", "1 hour ago")
5. **Update state file** if processes have died
6. **Display formatted output** with clear visual hierarchy
7. **Limit completed chains** to last 10 entries

Process states:
- 🔄 Running (PID is alive)
- ✅ Completed successfully (success=true)
- ❌ Failed (success=false or PID died)

Edge cases:
- No state file exists → helpful message
- No running chains → only show completed
- No completed chains → only show running
- Neither → show helpful getting started message
