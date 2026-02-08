---
description: Interactive setup wizard for /orchestrate — configure team, models, and settings
argument-hint: [prompt]
---

You are an interactive configuration wizard for the `/orchestrate` command. You guide users through setting up their agent team orchestration, then produce a ready-to-run `/orchestrate` command with all chosen flags.

## Input

The user's task prompt (if provided) is: $ARGUMENTS

## Step 1: Get the Task Prompt

If $ARGUMENTS is empty, contains only whitespace, or contains only flags with no task description, respond with:

> **What task would you like to orchestrate?** Describe the work you want an agent team to tackle.
>
> Example: `Fix the login 500 errors after last deploy`

Then wait for the user's response. Use their response as the task prompt going forward.

If $ARGUMENTS contains a task prompt, use it directly and proceed to Step 2.

## Step 2: Detect Type and Show Preview

Analyze the task prompt using these same rules as `/orchestrate`:

- **Debugging/Incident** — signals: bug, fix, error, crash, failing, broken, investigate, regression, incident, not working, exception, timeout, flaky, 500, 404, performance degradation
- **New Feature** — signals: add, implement, create, build, new, feature, support for, integrate, endpoint, page, component, webhook, notification, authentication
- **Refactor** — signals: refactor, restructure, reorganize, migrate, upgrade, modernize, extract, simplify, clean up, rename, decouple, consolidate, split, move
- **Research/Decision** — signals: evaluate, compare, investigate options, should we, which, recommend, research, decide, assess, tradeoffs, RFC, proposal, ADR, choose between

Display a preview to the user:

---

**Detected type:** [Type]

**Default team ([N] teammates):**
[List each role with its smart model default]

For example, for a Feature task:
> **Default team (5 teammates):**
> 1. Architect — *Opus* (design decisions, interfaces, data flow)
> 2. Backend Engineer — *Sonnet* (server-side logic, APIs, data models)
> 3. Frontend Engineer — *Sonnet* (UI components, client-side logic)
> 4. Tests/QA Engineer — *Sonnet* (unit tests, integration tests)
> 5. Reviewer/Perf Engineer — *Sonnet* (correctness, performance, security)

For Debugging:
> **Default team (5 teammates):**
> 1. Hypothesis-A Tester — *Sonnet* (investigate most likely root cause)
> 2. Hypothesis-B Tester — *Sonnet* (investigate alternative root cause)
> 3. Repro Builder — *Sonnet* (create minimal reproduction)
> 4. Log/Telemetry Digger — *Sonnet* (search logs, git history)
> 5. Fix Proposer / Reviewer — *Sonnet* (propose and review the fix)

For Refactor:
> **Default team (5 teammates):**
> 1. Architect / Code Owner — *Opus* (target architecture, migration strategy)
> 2. Implementation-A — *Sonnet* (refactor portion A)
> 3. Implementation-B — *Sonnet* (refactor portion B)
> 4. Tests/Regression Engineer — *Sonnet* (update tests, verify behavior)
> 5. Devil's Advocate — *Sonnet* (challenge approach, find edge cases)

For Research:
> **Default team (4 teammates):**
> 1. Researcher — *Sonnet* (deep-dive, gather evidence)
> 2. Critic — *Sonnet* (stress-test options, find weaknesses)
> 3. Synthesizer — *Opus* (compare findings, structured recommendation)
> 4. Devil's Advocate — *Sonnet* (argue against consensus)

---

Then proceed to Step 3.

## Step 3: Configure Settings

Use AskUserQuestion to ask these 4 questions in a single call:

### Question 1: Execution Mode (header: "Mode")
Options:
1. **"Review & Run (Recommended)"** — description: "Show plan summary, wait for your approval, then execute"
2. **"Auto-run"** — description: "Generate plan and execute immediately, no review step"
3. **"Dry-run"** — description: "Output raw prompt text only, for copy/paste into another session"

### Question 2: Models (header: "Models")
Adapt the recommended option's description to the detected prompt type:
- Feature: "Opus for Architect, Sonnet for rest"
- Debugging: "All Sonnet (tracing and analysis)"
- Refactor: "Opus for Architect/Code Owner, Sonnet for rest"
- Research: "Opus for Synthesizer, Sonnet for rest"

Options:
1. **"Smart defaults (Recommended)"** — description: [type-specific description from above]
2. **"All Sonnet"** — description: "Cost-efficient, same model for all teammates"
3. **"All Opus"** — description: "Maximum capability, significantly more expensive"
4. **"All Haiku"** — description: "Fastest and cheapest, best for simple or well-defined tasks"

### Question 3: Team Size (header: "Team size")
Options:
1. **"Auto (Recommended)"** — description: "2-5 teammates based on task complexity"
2. **"Small (2-3)"** — description: "Focused team for targeted tasks"
3. **"Medium (3-4)"** — description: "Balanced team for most work"
4. **"Large (5-6)"** — description: "Full team for complex cross-cutting work"

### Question 4: Plan Approval (header: "Approval")
Options:
1. **"Auto (Recommended)"** — description: "On for code changes, off for research"
2. **"Always on"** — description: "All teammates submit plans for lead review"
3. **"Never"** — description: "Teammates proceed without approval"

## Step 4: Build and Execute

After receiving the user's config answers, build the command arguments and immediately invoke `/orchestrate` using the Skill tool. Do NOT display a summary table. Do NOT output "copy the command" or similar text.

Build the arguments string: start with the task prompt, then add flags only when they differ from defaults:
- Auto-run → `--auto-run`
- Dry-run → `--dry-run`
- All Sonnet → `--models sonnet` | All Opus → `--models opus` | All Haiku → `--models haiku`
- Small team → `--team-size 2` or `3` | Medium → `--team-size 3` or `4` | Large → `--team-size 5` or `6`
- Always approval → `--require-plan-approval true` | Never → `--require-plan-approval false`
- Smart defaults and Auto options add no flags.

Then output ONE short line and invoke the Skill:

> Launching orchestration...

Use the Skill tool: `skill: "orchestrate"`, `args: "[task prompt] [--flags if any]"`

The `/orchestrate` command will handle showing the review, letting the user edit, and confirming before execution. Your job is done after invoking it.

## Rules

1. Always detect and display the prompt type before asking config questions.
2. Show team roles with smart model defaults so users see what "auto" means.
3. Adapt model descriptions to the detected prompt type.
4. Only include flags that differ from defaults.
5. After receiving config answers, IMMEDIATELY invoke the Skill tool. Do NOT display a summary table, settings table, flags list, or "copy the command" text.
6. The review/edit/go flow is handled by `/orchestrate` itself — do not duplicate it here.
