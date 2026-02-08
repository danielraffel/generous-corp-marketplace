IMPORTANT: This prompt requires Agent Teams. If agent teams are not enabled, first enable them by running this command or adding to your settings.json:

  In settings.json (~/.claude/settings.json or .claude/settings.json):
  {
    "env": {
      "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
    }
  }

  Or set the environment variable before starting Claude Code:
  export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

Once agent teams are enabled, proceed with the instructions below.

## Goal

The login endpoint returns 500 errors intermittently after the last deploy. About 30% of login attempts fail. The error logs show a database connection timeout but the database metrics look normal. This started after we merged PR #847 which updated the session management code.

## Team Setup

Create an Agent Team to accomplish the goal above. You are the team lead. Your job is to coordinate, NOT to implement. Use delegate mode (Shift+Tab) if available.

Spawn the following teammates using Sonnet for each:

1. **Hypothesis-A Tester** - Investigates the session management changes from PR #847 as the primary root cause. Reads the diff, traces the code path, and tests whether the new session logic causes connection pool exhaustion.
2. **Hypothesis-B Tester** - Investigates an alternative theory: the database connection timeout may be caused by connection pool misconfiguration or a leaked connection issue unrelated to PR #847. Checks pool settings, connection lifecycle, and retry logic.
3. **Repro Builder** - Creates a minimal reproduction script that reliably triggers the 500 error. Writes a failing test or load test that hits the login endpoint and measures the failure rate.
4. **Log/Telemetry Digger** - Searches error logs, database connection pool metrics, git history for PR #847, and deployment logs. Builds a timeline of when errors started and what correlates with failures.
5. **Fix Proposer / Reviewer** - Once the team converges on a root cause, proposes a minimal fix. Reviews the fix for correctness, ensures it doesn't introduce regressions, and validates it against the repro script.

## Task List

Create a shared task list with these tasks. Assign ownership to specific teammates. Mark dependencies where needed. Each teammate should own distinct files to avoid conflicts.

| # | Task | Owner | Depends On | Deliverable |
|---|------|-------|------------|-------------|
| 1 | Read PR #847 diff and trace session management code path for connection pool interactions | Hypothesis-A Tester | - | Analysis of how session changes affect DB connections |
| 2 | Add temporary debug logging to session creation/teardown to capture connection pool state | Hypothesis-A Tester | #1 | Debug instrumentation (temporary, in separate debug branch) |
| 3 | Audit connection pool configuration (pool size, timeout, max connections, idle settings) | Hypothesis-B Tester | - | Connection pool configuration report |
| 4 | Search for connection leaks in the non-session code paths (middleware, background jobs) | Hypothesis-B Tester | #3 | List of potential leak sites with evidence |
| 5 | Write a load test script that simulates concurrent login attempts to reproduce the 30% failure rate | Repro Builder | - | Executable repro script with instructions |
| 6 | Write a focused unit test that isolates the session management + DB connection interaction | Repro Builder | #1 | Failing test that demonstrates the bug |
| 7 | Search error logs for the exact error messages, stack traces, and timestamps of 500 errors | Log/Telemetry Digger | - | Error timeline with patterns |
| 8 | Correlate deploy timestamp, error onset, and connection pool metrics from monitoring | Log/Telemetry Digger | #7 | Timeline report with correlation analysis |
| 9 | Propose a fix based on converged findings from hypotheses A and B | Fix Proposer / Reviewer | #2, #4, #6 | Proposed fix with rationale |
| 10 | Review the proposed fix and validate it passes the repro script and existing tests | Fix Proposer / Reviewer | #5, #9 | Review approval with test results |

## Communication

- Each teammate should send the lead a brief status message after completing their first task.
- Use `message` for targeted updates to specific teammates. Use `broadcast` sparingly (only for announcements that affect everyone).
- Hypothesis-A and Hypothesis-B testers should message each other when they find evidence that supports or contradicts the other's theory. Challenge each other's assumptions.
- The Repro Builder should message both hypothesis testers once a reliable repro is available so they can use it to validate their theories.
- If a teammate gets stuck for more than 2 tasks without progress, they should message the lead for help.

## Quality Gates

Tests + lint + docs where relevant.

- All code changes must pass existing tests (run test suite before marking task complete)
- No file should be edited by more than one teammate
- The repro script must reliably reproduce the issue (>20% failure rate in test)
- The proposed fix must eliminate the failures in the repro script
- Debug instrumentation must be clearly marked as temporary
- Lint/format checks must pass

## Lead Instructions

As team lead, you MUST:
1. Create the team and task list, then WAIT for teammates to complete their work. Do NOT implement tasks yourself.
2. Monitor teammate progress. If a teammate appears stuck, nudge them or reassign their work.
3. When the hypothesis testers converge (or fail to converge), broadcast a summary of findings to help the Fix Proposer.
4. When all tasks are complete, synthesize findings into a clear summary:
   - Root cause identified (with evidence from both hypothesis testers)
   - Files changed by the fix
   - Test results (repro script + existing test suite)
   - Any remaining TODOs or monitoring recommendations
5. After synthesis, proceed to shutdown and cleanup.

## Shutdown & Cleanup

After all work is complete and you have synthesized the results:
1. Ask each teammate to shut down gracefully (one at a time, wait for confirmation)
2. Once ALL teammates have shut down, run cleanup to remove shared team resources
3. IMPORTANT: Only the lead (you) should run cleanup. Never have teammates run cleanup.
4. Present the final summary to the user including: root cause, fix applied, test results, and monitoring recommendations.
