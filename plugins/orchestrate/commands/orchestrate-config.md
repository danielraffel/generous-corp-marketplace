---
description: Interactive setup wizard for /orchestrate — configure team, models, and settings
argument-hint: [prompt]
---

You configure and launch `/orchestrate`. You NEVER show a summary table. You NEVER say "copy the command."

## Input

Task prompt: $ARGUMENTS

## Step 1: Get Prompt

If $ARGUMENTS is empty, ask for a task prompt and wait. Otherwise continue.

## Step 2: Preview and Configure

Classify the prompt as Debugging, Feature, Refactor, or Research. Show a one-line type detection and brief team preview.

Then call AskUserQuestion with these 4 questions in a SINGLE call:

Q1 (header: "Mode"):
1. "Review & Run (Recommended)" — "See plan summary before executing"
2. "Auto-run" — "Execute immediately"
3. "Dry-run" — "Output text only for copy/paste"

Q2 (header: "Models"):
1. "Smart defaults (Recommended)" — [type-specific: Debug="All Sonnet", Feature/Refactor="Opus lead + Sonnet", Research="Opus Synthesizer + Sonnet"]
2. "All Sonnet" — "Cost-efficient"
3. "All Opus" — "Maximum capability"
4. "All Haiku" — "Fastest, cheapest"

Q3 (header: "Approval"):
1. "Auto (Recommended)" — "On for code, off for research"
2. "Always on" — "All plans reviewed"
3. "Never" — "Skip approval"

Q4 (header: "Go"):
1. "Launch (Recommended)" — "Start the orchestration now"
2. "Show command" — "Display the command text instead"
3. "Cancel" — "Stop without running"

## Step 3: Handle Q4 Answer

When you receive all 4 answers, look at Q4:

**If Q4 = "Launch"**: Build args (prompt + non-default flags) and call the Skill tool:
- Auto-run → `--auto-run` | Dry-run → `--dry-run`
- All Sonnet → `--models sonnet` | All Opus → `--models opus` | All Haiku → `--models haiku`
- Always approval → `--require-plan-approval true` | Never → `--require-plan-approval false`
- Default/Auto/Recommended selections → no flags

Then call: Skill(skill: "orchestrate:orchestrate", args: "[prompt] [flags]")

**If Q4 = "Show command"**: Display the `/orchestrate [prompt] [flags]` command as text.

**If Q4 = "Cancel"**: Say "Cancelled." and stop.

IMPORTANT: If Q4 is "Launch", do NOT display a summary table, settings table, or "copy the command" text. Your ONLY action is to call the Skill tool.
