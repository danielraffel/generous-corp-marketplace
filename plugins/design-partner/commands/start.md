---
description: "Start a new design session with context capture and idea generation"
argument-hint: "[project-name]"
allowed-tools: ["AskUserQuestion", "Read", "Write", "Agent"]
---

# Design Partner Start Command

**For Claude:** Initialize a new design session by capturing context and generating initial ideas.

## Process

1. **Capture Context** - Use AskUserQuestion with 3 questions to understand the design challenge:
   - Who are the users?
   - What job needs to be done?
   - What constraints exist?

2. **Create Design Brief** - Synthesize answers into structured brief

3. **Save State** - Write to `.claude/dp.local.md`

4. **Generate Ideas** - Invoke the idea-generator agent

## Implementation

```javascript
// Use AskUserQuestion to gather context
const questions = [
  {
    question: "Who are the primary users or audience?",
    header: "Target Users",
    placeholder: "e.g., College students, small business owners, healthcare workers..."
  },
  {
    question: "What job needs to be done? What problem are you solving?",
    header: "Job to Be Done",
    placeholder: "e.g., Stay focused while studying, Track fitness progress, Manage client appointments..."
  },
  {
    question: "What constraints should we consider?",
    header: "Constraints",
    placeholder: "e.g., Mobile-first, Works offline, Limited budget, Must integrate with existing systems..."
  }
];
```

## State Schema

Create `.claude/dp.local.md` with:

```yaml
---
session_id: "dp-[timestamp]"
project_name: "[from args or generated]"
created_at: "[ISO timestamp]"
last_updated: "[ISO timestamp]"

design_brief:
  users: "[answer 1]"
  job_to_be_done: "[answer 2]"
  constraints: "[answer 3 as array]"

ideas: []
selected_idea: null

image_generation:
  enabled: false
  default_provider: "openai"
  fallback_order: ["openai", "gemini"]
  default_size: "1024x1024"
  default_quality: "standard"
  daily_budget_usd: 5.00
  warn_threshold_usd: 0.50
  current_daily_spend: 0.00
  last_reset_date: "[today's date]"
  providers:
    openai:
      configured: false
      enabled: false
      last_used: null
      total_images: 0
      total_cost_usd: 0.00
    gemini:
      configured: false
      enabled: false
      last_used: null
      total_images: 0
      total_cost_usd: 0.00

generated_images: []
decisions: []
---

# Design Brief

**Users:** [users]

**Job to Be Done:** [job]

**Constraints:**
- [constraint 1]
- [constraint 2]
- [constraint 3]
```

## Output

After saving state:

```
Design session initialized!

Design Brief:
- Users: [users]
- Job: [job]
- Constraints: [list]

Launching idea generator...
```

Then invoke: `Agent: idea-generator`

## Example Usage

```
User: /dp:start fitness-app

[Shows 3 context questions]

User: [Answers questions]

Claude: Design session initialized!
        Launching idea generator...
        [Switches to idea-generator agent]
```
