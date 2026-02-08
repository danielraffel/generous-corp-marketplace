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

Evaluate GraphQL vs REST vs gRPC for our new internal microservices API layer. We have 12 services that need to communicate, a mix of synchronous request/response and event-driven patterns. The team is experienced with REST but has no GraphQL or gRPC experience. We need a recommendation by end of week with clear tradeoffs and a migration path from our current REST-only setup.

## Team Setup

Create an Agent Team to accomplish the goal above. You are the team lead. Your job is to coordinate, NOT to implement. Use delegate mode (Shift+Tab) if available.

Spawn the following teammates using Sonnet for each:

1. **Researcher** - Deep-dives into each API paradigm (REST, GraphQL, gRPC). Reads documentation, explores real-world case studies, and gathers concrete evidence on performance, developer experience, tooling, and ecosystem maturity for microservice communication.
2. **Critic** - Stress-tests each option against the specific constraints: 12 services, mixed sync/async patterns, team inexperience with GraphQL/gRPC, and migration complexity. Finds weaknesses, edge cases, and hidden costs for each approach.
3. **Synthesizer** - Compares findings from the Researcher and Critic. Produces a structured comparison matrix, a clear recommendation with rationale, and a migration roadmap from current REST-only setup.
4. **Devil's Advocate** - Argues against the emerging consensus. If the team leans toward one option, the Devil's Advocate makes the strongest possible case for alternatives. Ensures the recommendation survives scrutiny.

## Task List

Create a shared task list with these tasks. Assign ownership to specific teammates. Mark dependencies where needed. Each teammate should own distinct files to avoid conflicts.

| # | Task | Owner | Depends On | Deliverable |
|---|------|-------|------------|-------------|
| 1 | Research REST for microservices: strengths, weaknesses, tooling, performance characteristics, and fit for 12-service architecture | Researcher | - | REST analysis doc with evidence and sources |
| 2 | Research GraphQL for microservices: federation, schema stitching, performance, learning curve, and fit for mixed sync/async | Researcher | - | GraphQL analysis doc with evidence and sources |
| 3 | Research gRPC for microservices: protobuf schemas, streaming, performance, tooling maturity, and fit for internal service communication | Researcher | - | gRPC analysis doc with evidence and sources |
| 4 | Stress-test REST option: identify scaling pain points, N+1 problems, versioning challenges, and migration effort (already on REST) | Critic | #1 | REST critique with specific failure scenarios |
| 5 | Stress-test GraphQL option: identify complexity overhead, learning curve risk, federation challenges, and performance gotchas | Critic | #2 | GraphQL critique with specific failure scenarios |
| 6 | Stress-test gRPC option: identify browser compatibility issues, debugging difficulty, tooling gaps, and team adoption risk | Critic | #3 | gRPC critique with specific failure scenarios |
| 7 | Build comparison matrix across dimensions: performance, DX, learning curve, tooling, migration effort, team fit, long-term maintainability | Synthesizer | #4, #5, #6 | Structured comparison matrix |
| 8 | Draft recommendation with rationale, migration roadmap, and timeline estimate | Synthesizer | #7 | Final recommendation document |
| 9 | Challenge the emerging recommendation: make the strongest case for the non-recommended options | Devil's Advocate | #8 | Counter-arguments document |
| 10 | Revise recommendation to address Devil's Advocate concerns; finalize with acknowledged tradeoffs | Synthesizer | #9 | Final revised recommendation |

## Communication

- Each teammate should send the lead a brief status message after completing their first task.
- Use `message` for targeted updates to specific teammates. Use `broadcast` sparingly (only for announcements that affect everyone).
- The Researcher should message the Critic as each analysis doc is ready (don't wait for all three).
- The Critic should message the Researcher when stress-testing reveals gaps in the research that need deeper investigation.
- The Devil's Advocate should message the Synthesizer with counter-arguments as they develop, not just at the end.
- Teammates should challenge each other's assumptions when they find contradictory evidence. Message the relevant teammate directly.
- If a teammate gets stuck for more than 2 tasks without progress, they should message the lead for help.

## Quality Gates

Tests + lint + docs where relevant.

- Each analysis must include a "what I checked" log: files read, documentation consulted, case studies reviewed, and experiments run
- Findings must include specific evidence, not just opinions. Cite sources, benchmarks, or concrete examples.
- The comparison matrix must cover at least these dimensions: performance, developer experience, learning curve, tooling, migration effort, team fit
- The final recommendation must include explicit tradeoffs and risks for the chosen approach
- The Devil's Advocate must present at least 3 substantive counter-arguments
- All documents should be well-structured markdown suitable for sharing with the engineering team

## Lead Instructions

As team lead, you MUST:
1. Create the team and task list, then WAIT for teammates to complete their work. Do NOT implement tasks yourself.
2. Monitor teammate progress. If a teammate appears stuck, nudge them or reassign their work.
3. Encourage cross-team communication: if the Researcher finds something that challenges the Critic's assumptions, make sure they discuss it.
4. When all tasks are complete, synthesize findings into a clear summary:
   - Present the structured comparison matrix
   - State the recommendation with confidence level
   - Include dissenting views from the Devil's Advocate
   - Provide the migration roadmap with concrete next steps
5. After synthesis, proceed to shutdown and cleanup.

## Shutdown & Cleanup

After all work is complete and you have synthesized the results:
1. Ask each teammate to shut down gracefully (one at a time, wait for confirmation)
2. Once ALL teammates have shut down, run cleanup to remove shared team resources
3. IMPORTANT: Only the lead (you) should run cleanup. Never have teammates run cleanup.
4. Present the final summary to the user including: recommendation, comparison matrix, tradeoffs, dissenting views, and migration roadmap.
