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

Implement a real-time notification system for our web app. Users should receive in-app notifications when someone comments on their post, likes their content, or mentions them. We need a WebSocket backend, a notification bell component in the header, a notification dropdown with mark-as-read, and persistent storage so notifications survive page refreshes. The backend is Express/Node with PostgreSQL, the frontend is React with TypeScript.

## Team Setup

Create an Agent Team to accomplish the goal above. You are the team lead. Your job is to coordinate, NOT to implement. Use delegate mode (Shift+Tab) if available.

Spawn the following teammates using Sonnet for each:

1. **Architect** - Designs the notification system architecture: data model, WebSocket protocol, event flow from trigger to display. Produces a brief design doc before implementation begins.
2. **Backend Engineer** - Implements the server-side notification logic: PostgreSQL schema, notification service, WebSocket server, and REST endpoints for fetching/marking notifications.
3. **Frontend Engineer** - Implements the React notification components: bell icon with unread count, dropdown panel, individual notification items, mark-as-read interactions, and WebSocket client connection.
4. **Tests/QA Engineer** - Writes unit tests for the notification service, integration tests for WebSocket connections, and component tests for the React notification UI.
5. **Reviewer/Perf Engineer** - Reviews all implementations for correctness, security (auth on WebSocket), performance (connection pooling, query optimization), and code quality.

Require plan approval for all teammates before they make code changes. Only approve plans that meet the quality gates below.

## Task List

Create a shared task list with these tasks. Assign ownership to specific teammates. Mark dependencies where needed. Each teammate should own distinct files to avoid conflicts.

| # | Task | Owner | Depends On | Deliverable |
|---|------|-------|------------|-------------|
| 1 | Design notification data model, WebSocket protocol, and event flow. Document in a brief design doc. | Architect | - | Design doc with schema, protocol, and sequence diagrams |
| 2 | Define the notification service API contract (methods, parameters, return types) | Architect | #1 | TypeScript interface definitions for notification service |
| 3 | Create PostgreSQL migration for notifications table (id, user_id, type, content, read, created_at, reference_id, reference_type) | Backend Engineer | #1 | Migration file in db/migrations/ |
| 4 | Implement notification service (create, fetch, mark-read, mark-all-read, delete) | Backend Engineer | #2, #3 | src/services/notification-service.ts |
| 5 | Implement WebSocket server with authentication, room management per user, and notification broadcasting | Backend Engineer | #4 | src/websocket/notification-ws.ts |
| 6 | Add REST endpoints: GET /notifications, PATCH /notifications/:id/read, POST /notifications/mark-all-read | Backend Engineer | #4 | src/routes/notifications.ts |
| 7 | Implement notification bell component with unread count badge | Frontend Engineer | #2 | src/components/NotificationBell.tsx |
| 8 | Implement notification dropdown panel with list, mark-as-read, and empty state | Frontend Engineer | #2, #7 | src/components/NotificationDropdown.tsx |
| 9 | Implement WebSocket client hook for real-time notification updates | Frontend Engineer | #5 | src/hooks/useNotifications.ts |
| 10 | Integrate notification components into app header and connect to WebSocket | Frontend Engineer | #7, #8, #9 | src/components/Header.tsx updates |
| 11 | Write unit tests for notification service (create, fetch, mark-read, edge cases) | Tests/QA Engineer | #4 | tests/services/notification-service.test.ts |
| 12 | Write integration tests for WebSocket notification flow (connect, receive, disconnect) | Tests/QA Engineer | #5 | tests/integration/notification-ws.test.ts |
| 13 | Write component tests for NotificationBell and NotificationDropdown | Tests/QA Engineer | #7, #8 | tests/components/Notification*.test.tsx |
| 14 | Review backend implementation for security (WebSocket auth), SQL injection, and connection handling | Reviewer/Perf Engineer | #5, #6 | Review comments and approved changes |
| 15 | Review frontend implementation for performance (re-renders, memoization), accessibility, and UX | Reviewer/Perf Engineer | #10 | Review comments and approved changes |

## Communication

- Each teammate should send the lead a brief status message after completing their first task.
- Use `message` for targeted updates to specific teammates. Use `broadcast` sparingly (only for announcements that affect everyone).
- The Architect should broadcast the design doc to all teammates once task #1 is complete so everyone has shared context.
- Backend and Frontend engineers should message each other when the WebSocket protocol or API contract changes.
- Teammates should challenge each other's assumptions when they find contradictory evidence. Message the relevant teammate directly.
- If a teammate gets stuck for more than 2 tasks without progress, they should message the lead for help.

## Quality Gates

Tests + lint + docs where relevant.

- All code changes must pass existing tests (run test suite before marking task complete)
- No file should be edited by more than one teammate
- New code must have corresponding test coverage (unit + integration)
- WebSocket connections must be authenticated (no unauthenticated access)
- Database queries must use parameterized queries (no SQL injection)
- React components must be accessible (proper ARIA attributes)
- Lint/format checks must pass
- If making architectural changes, document the rationale in the design doc

## Lead Instructions

As team lead, you MUST:
1. Create the team and task list, then WAIT for teammates to complete their work. Do NOT implement tasks yourself.
2. Review and approve teammate plans before they begin implementation. Reject plans that don't meet quality gates.
3. Monitor teammate progress. If a teammate appears stuck, nudge them or reassign their work.
4. When all tasks are complete, synthesize findings into a clear summary:
   - List all files created and modified
   - Tests added and their pass/fail status
   - Any remaining TODOs or follow-up work
   - Performance considerations for production
5. After synthesis, proceed to shutdown and cleanup.

## Shutdown & Cleanup

After all work is complete and you have synthesized the results:
1. Ask each teammate to shut down gracefully (one at a time, wait for confirmation)
2. Once ALL teammates have shut down, run cleanup to remove shared team resources
3. IMPORTANT: Only the lead (you) should run cleanup. Never have teammates run cleanup.
4. Present the final summary to the user including: files created, tests passing, and any follow-up recommendations.
