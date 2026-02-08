---
name: claude
description: Ask Claude directly via bridge mode by default (`claude -p`), with optional deterministic prompt-package generation when explicitly requested.
---

# Claude Prompt + Bridge

Claude supports two workflows:
- **Bridge mode**: Call Claude CLI non-interactively and return Claude's response to the user.
- **Package mode**: Generate a deterministic Claude-ready prompt package.

## When to Use Claude

Use this skill when:
- The user explicitly invokes `/claude` or `$claude`.
- The user asks to convert/rewrite/port a request for Claude.
- The user asks Codex to ask Claude and return Claude's answer.
- The user asks for a Claude second opinion or structured Claude output.

Do NOT use this skill for:
- General conversation with no Claude conversion/bridge intent.
- Tasks better handled directly in Codex with no value from Claude.

Exception:
- If `$claude` or `/claude` appears explicitly, route through this skill.

## Quick Reference

```bash
# Bridge mode (default)
$claude <request>
/claude <request>
$claude run <request>
$claude ask <request>
$claude json <request>
$claude continue <session_id> <follow_up>

# Package mode (explicit)
$claude package <request>
$claude prompt <request>
$claude convert <request>

# Claude CLI commands used by bridge mode
claude -p --output-format json "<prompt>"
claude -p --output-format json --json-schema '<schema>' "<prompt>"
claude -p --output-format json --resume <session_id> "<follow_up>"
```

## Mode Selection

Select mode deterministically:
- **Bridge mode** when the user invokes `$claude`/`/claude` without a packaging subcommand.
- **Bridge mode** when request includes execution subcommands: `run`, `ask`, `bridge`, `exec`, `json`, `continue`, `resume`.
- **Package mode** when request explicitly asks for prompt conversion/porting, or uses: `package`, `prompt`, `convert`.
- **Meta mode** for skill maintenance commands: `help`, `review-skill`, `debug-skill`, `literal`.

Routing precedence for explicit `$claude`/`/claude`:
1. Meta subcommands
2. Continue/resume subcommands
3. Package subcommands or explicit conversion intent
4. Bridge mode (default)

Meta mode escape hatch:
- `$claude help` -> explain skill usage only.
- `$claude review-skill` -> evaluate/improve this skill (no forced prompt package output).
- `$claude literal <text>` -> treat `<text>` as literal content, not a command.

## Core Concepts

### Package Mode Contract

Output is deterministic and copy/paste-ready with sections in this order:
1. `SYSTEM:`
2. `USER:`
3. `INPUTS:`
4. `CHECKLIST:`
5. `EDGE CASES:` (optional)

Never add text before `SYSTEM:` or after final section.

### Bridge Mode Contract

Bridge mode runs Claude CLI and returns Claude output plus minimal execution metadata.

Required parse order for CLI JSON output:
1. `structured_output` (when `--json-schema` is used)
2. `result`
3. Error state (`is_error == true` or non-zero exit)

Always capture these fields when available:
- `session_id`
- `is_error`
- `stop_reason`
- `total_cost_usd`

Default bridge response formatting:
- Return Claude's substantive answer only.
- Omit execution metadata unless one of these applies:
  - User explicitly asks for metadata/cost/session details.
  - The command is `continue`/`resume` and session continuity is needed.
  - An error occurred and diagnostics are needed.

When metadata is included, keep it minimal by default:
- `session_id` and `is_error`
- Add `stop_reason` and `total_cost_usd` only on request or error analysis.

### Structured Response Schema

When bridge mode needs machine-readable output, use this JSON schema:

```json
{
  "type": "object",
  "properties": {
    "answer": { "type": "string" },
    "assumptions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "risks": {
      "type": "array",
      "items": { "type": "string" }
    },
    "next_actions": {
      "type": "array",
      "items": { "type": "string" }
    },
    "needs_input": { "type": "boolean" },
    "questions": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "required": [
    "answer",
    "assumptions",
    "risks",
    "next_actions",
    "needs_input",
    "questions"
  ],
  "additionalProperties": false
}
```

### Clarification and Follow-up Loop

Default behavior:
- Ask zero clarifying questions unless critical ambiguity exists.
- Ask at most 2 questions.
- Still provide best-effort output with explicit assumptions.

In bridge mode:
1. If Claude returns `needs_input: true` or non-empty `questions`, ask the user those questions.
2. Resume same Claude session with `--resume <session_id>` after user reply.
3. Continue until `needs_input: false` and no blocking questions remain.

## Package Format Rules

`SYSTEM:`
- Short, stable instruction set.
- Include role, priorities, hard constraints.

`USER:`
- Restate task, deliverables, constraints, success criteria.
- Include relevant provided context.
- Include clarifying questions only when critical ambiguity exists.

`INPUTS:`
- List artifacts (files/snippets/links) and intended use.
- If none, write exactly: `- None.`

`CHECKLIST:`
- 6 to 12 bullets.
- Must include: Correctness, Completeness, Constraints adherence, Formatting compliance, Scope control, Assumption transparency.
- Include Edge-case handling bullet only if `EDGE CASES:` exists.

`EDGE CASES:`
- Include only for high-risk/failure-prone conditions.
- Omit entirely if not needed.

## Context and Token Policy

For large inputs, avoid dumping full artifacts into a single prompt.

Use this order:
1. Include user goal and hard constraints verbatim.
2. Include only directly relevant excerpts from files/logs.
3. If context is large, chunk and summarize first, then ask Claude on the summaries.
4. Record assumptions about omitted context in output.

## Error Handling

Common bridge-mode failures and handling:
- **CLI unavailable/auth issue**: report failure. Do not silently switch to package mode unless user asked for conversion/package output.
- **Schema validation failure**: retry once with clearer output instruction; if still failing, return raw `result` and flag schema miss.
- **Permission/tool denial**: narrow ask, disable tools, or request user-approved alternative.
- **Conflicting constraints**: preserve user constraints, surface conflict explicitly, propose minimal resolution options.

## Build Procedure

1. Parse intent, deliverables, constraints, success criteria.
2. Select mode (`package`, `bridge`, or `meta`) deterministically.
3. Gather minimal relevant context and inputs.
4. Detect critical ambiguity and embed up to 2 questions only if needed.
5. For package mode: emit deterministic package.
6. For bridge mode: run Claude CLI, parse output contract, and continue follow-up loop if needed.
7. Validate formatting, scope, assumptions, and constraint fidelity before returning.

## Quality Rules

- Preserve user intent; do not broaden scope.
- Keep wording concrete and concise.
- Keep bullets atomic and testable.
- Reflect hard constraints exactly (stack, banned tools, deadlines, file boundaries, schema requirements).
- Avoid unsupported tool claims.
- Keep `SYSTEM:` compact (typically 4 to 8 bullets).
- Keep `CHECKLIST:` within 6 to 12 bullets.
- Keep bridge responses parseable and session-aware.
- Do not add extra headings in package output.

## Practical Examples

- `$claude any thoughts on this script?`
- `$claude run Give me a second opinion on this migration approach`
- `$claude json Analyze these test failures and return structured risks + next actions`
- `$claude run --meta any thoughts on this script?`
- `$claude continue 31feb98d-6f2a-451e-977b-0df8945a62b5 user chose React + TypeScript`
- `$claude package convert this bug ticket into a Claude prompt package for root-cause + fix plan`
- `$claude review-skill evaluate gaps in this skill file and propose improvements`

## Final Check

- Mode selection is explicit and justified.
- Package output headings are exact and in required order.
- `INPUTS:` contains `- None.` when no artifacts are present.
- `CHECKLIST:` has 6 to 12 bullets with required quality gates.
- `EDGE CASES:` appears only when warranted.
- Bridge output is concise by default; metadata is included only when needed or requested.
- Follow-up loop behavior is defined for open questions.
