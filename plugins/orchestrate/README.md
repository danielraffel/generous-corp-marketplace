# Orchestrate

A Claude Code plugin that orchestrates agent teams directly from any task description.

## What it does

`/orchestrate:start` takes a free-text prompt and turns it into a coordinated agent team — generating the plan, letting you review it, and executing it directly in your current session. No copy/paste needed.

By default, Orchestrate enhances your prompt into a clear goal statement, shows a compact plan summary (team roles, task count, settings), and presents interactive buttons to approve, edit, or inspect the plan before executing. You can also use `--auto-run` to skip review, or `--dry-run` to get the raw prompt text for manual use.

## Installation

### From marketplace

```bash
claude plugin install orchestrate
```

### Local development

```bash
claude --plugin-dir /path/to/orchestrate
```

## Usage

```
/orchestrate:start <your prompt>
```

### Interactive setup

Not sure which flags to use? The config wizard walks you through it:

```
/orchestrate:config <your prompt>
```

It detects your task type, shows the team that will be created with model assignments, and asks a few questions (mode, models, approval, and a "Launch" button). When you hit Launch, it hands off directly to `/orchestrate:start` — no copy/paste needed.

### Execution modes

**Review & Run (default)** — generates plan, shows summary, waits for approval, then executes:
```
/orchestrate:start Fix the login 500 errors after last deploy
```
Enhances your prompt, shows plan summary, and presents interactive buttons: Go, Edit prompt, Use original, or Show full plan.

**Auto-run** — generates plan, briefly announces, immediately executes:
```
/orchestrate:start Fix the login 500 errors after last deploy --auto-run
```

**Dry-run** — outputs raw prompt text only (legacy copy/paste behavior):
```
/orchestrate:start Fix the login 500 errors after last deploy --dry-run
```

### Examples

**Debugging:**
```
/orchestrate:start The login endpoint returns 500 errors intermittently after the last deploy. About 30% of login attempts fail.
```
Creates a team with Hypothesis-A Tester, Hypothesis-B Tester, Repro Builder, Log/Telemetry Digger, and Fix Proposer.

**New feature:**
```
/orchestrate:start Implement a real-time notification system with WebSocket backend, notification bell UI, and persistent storage
```
Creates a team with Architect, Backend Engineer, Frontend Engineer, Tests/QA, and Reviewer/Perf.

**Research:**
```
/orchestrate:start Evaluate GraphQL vs REST vs gRPC for our internal microservices API layer
```
Creates a team with Researcher, Critic, Synthesizer, and Devil's Advocate.

**Refactor:**
```
/orchestrate:start Refactor the authentication module to use JWT instead of session cookies
```
Creates a team with Architect/Code Owner, Implementation-A, Implementation-B, Tests/Regression, and Devil's Advocate.

**Design/UI:**
```
/orchestrate:start Design a settings page with dark mode toggle, account preferences, and notification controls
```
Creates a team with Design Lead, Frontend Engineer, Accessibility/Responsiveness Reviewer, and UX Critic.

## Flags

All flags are optional with strong defaults. Most users won't need them.

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--auto-run` | *(boolean)* | off | Skip review and execute immediately after generating the plan. |
| `--dry-run` | *(boolean)* | off | Output the raw orchestration prompt as text only (legacy copy/paste mode). |
| `--team-size` | `auto`, `2`-`6` | `auto` | Number of teammates. Auto picks 2-5 based on task complexity. |
| `--models` | `auto`, `sonnet`, `haiku`, `opus`, custom | `auto` | Model for teammates. Auto assigns Opus to key reasoning roles, Sonnet to rest. |
| `--require-plan-approval` | `auto`, `true`, `false` | `auto` | Require lead to approve plans before code changes. System-enforced via `mode: "plan"`. Auto enables for code work. |
| `--teammate-mode` | `auto`, `in-process`, `tmux` | `auto` | Display mode. Auto lets Claude Code decide (tmux if available). |
| `--quality-gates` | string | `"tests + lint + docs where relevant"` | Quality standards teammates must meet. |
| `--output-style` | `concise`, `standard`, `verbose` | `standard` | Controls task count and description detail. |

### Smart model defaults

When `--models` is `auto` (the default), Orchestrate assigns the best model per role:

| Prompt Type | Opus Role | Sonnet Roles |
|-------------|-----------|--------------|
| Feature | Architect | Backend, Frontend, Tests/QA, Reviewer |
| Refactor | Architect/Code Owner | Implementation-A/B, Tests, Devil's Advocate |
| Research | Synthesizer | Researcher, Critic, Devil's Advocate |
| Design/UI | Design Lead | Frontend Engineer, A11y Reviewer, UX Critic |
| Debugging | *(none)* | All roles (tracing/analysis work) |

Use `--models sonnet` to override with all-Sonnet (most cost-efficient) or `--models opus` for all-Opus (max capability). Or use `/orchestrate:config` to choose interactively.

### Flag examples

```
/orchestrate:config Fix the checkout bug                           # interactive setup wizard
/orchestrate:start Fix the checkout bug --auto-run                 # skip review, execute immediately
/orchestrate:start Fix the checkout bug --dry-run --models sonnet  # all-Sonnet, text output only
/orchestrate:start Build user dashboard --require-plan-approval true --output-style verbose
/orchestrate:start Evaluate caching strategies --team-size 4 --quality-gates "research log + benchmarks"
/orchestrate:start Refactor auth module --teammate-mode tmux --models opus
```

## How it works

1. **Checks prerequisites** — verifies Agent Teams is enabled, shows setup instructions if not
2. **Parses flags** from your input (everything else is the original prompt)
2. **Detects prompt type**: debugging, feature, refactor, or research
3. **Selects roles** appropriate to the prompt type
4. **Generates an orchestration plan** with 8 sections:
   - Goal (enhanced version of your prompt, or original in auto-run/dry-run modes)
   - Team Setup (roles, model, mode, plan approval)
   - Task List (deliverables, ownership, dependencies)
   - Communication (message vs broadcast, challenge patterns)
   - Quality Gates (type-appropriate standards)
   - Lead Instructions (wait, monitor, synthesize)
   - Shutdown & Cleanup (graceful shutdown, lead-only cleanup)
   - Enablement instructions (dry-run only, for copy/paste use)
5. **Executes based on mode**:
   - **Default**: Enhances your prompt, shows summary with interactive review buttons (Go / Edit / Use original / Show full plan), then creates the team on approval
   - **`--auto-run`**: Briefly announces, then creates the team and coordinates immediately
   - **`--dry-run`**: Outputs the raw prompt text (with enablement block) for manual use

## Known limitations

- **No session resumption** — `/resume` doesn't restore in-process teammates. If a session ends, start a new orchestration.
- **One team per session** — clean up the current team before starting a new one.
- **Shutdown can be slow** — teammates finish their current work before shutting down gracefully.
- **Teammates inherit lead's permissions** — you can't set per-teammate permission levels at spawn time.
- **Delegate mode is user-only** — the lead prompt says "use delegate mode (Shift+Tab)" but there's no API to set it programmatically. The lead must toggle it manually.

## Recommended hooks

Orchestrate is pure prompt engineering and doesn't ship hooks (plugin-level hooks fire globally on ALL agent teams, not just Orchestrate's). However, you can add project-specific hooks to your own `.claude/settings.json` to enforce quality gates automatically.

### Node.js — run tests on task completion

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "npm test 2>&1 | tail -20"
          }
        ]
      }
    ]
  }
}
```

### Python — run pytest on task completion

```json
{
  "hooks": {
    "TaskCompleted": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "python -m pytest --tb=short 2>&1 | tail -20"
          }
        ]
      }
    ]
  }
}
```

### Generic — check for merge conflicts when a teammate goes idle

```json
{
  "hooks": {
    "TeammateIdle": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "git diff --check 2>&1 || echo 'CONFLICT MARKERS DETECTED'"
          }
        ]
      }
    ]
  }
}
```

These go in YOUR settings (`.claude/settings.json` or `~/.claude/settings.json`), not in the plugin. See the [Hooks documentation](https://code.claude.com/docs/en/hooks) for details.

## Prerequisites: Enable Agent Teams

Agent teams are experimental and disabled by default. You **must** enable them before using the generated prompts. Add the following to your `.claude/settings.json` (project-level) or `~/.claude/settings.json` (user-level):

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or set the environment variable before starting Claude Code:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Orchestrate checks this automatically before running — if Agent Teams isn't enabled, it'll tell you exactly what to add and link to the docs.

For full details on agent teams (display modes, plan approval, delegate mode, messaging, limitations), see the [Agent Teams documentation](https://code.claude.com/docs/en/agent-teams).

## Tests

Run snapshot tests:

```bash
bash tests/test-orchestrate.sh
```

Tests validate that snapshot orchestration prompts contain all required sections, correct roles for each prompt type, and proper agent team patterns.

## Project structure

```
orchestrate/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── commands/
│   ├── start.md              # The /orchestrate:start command
│   └── config.md             # Interactive setup wizard (/orchestrate:config)
├── tests/
│   ├── test-orchestrate.sh   # Snapshot test runner
│   └── snapshots/
│       ├── debugging.md      # Expected output for debugging prompts
│       ├── feature.md        # Expected output for feature prompts
│       └── research.md       # Expected output for research prompts
└── README.md
```
