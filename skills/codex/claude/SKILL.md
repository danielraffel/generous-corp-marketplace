---
name: claude
description: Ask Claude through a durable noninteractive bridge with explicit Subrouter or direct authentication, file and image handoff, structured output, and resumable sessions; package prompts only when explicitly requested.
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

# Durable bridge commands (resolve <skill-dir> from this loaded skill)
printf '%s' "<prompt>" | <skill-dir>/scripts/claude-bridge --route auto -- -p --output-format json
<skill-dir>/scripts/claude-bridge --route auto --prompt-file /absolute/task.md --attach /absolute/image.png -- -p --output-format json
printf '%s' "<follow_up>" | <skill-dir>/scripts/claude-bridge --route <recorded-route> --expect-scope <recorded-scope> -- -p --output-format json --resume <session_id>
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

## Bridge Routing

Always invoke [scripts/claude-bridge](scripts/claude-bridge); never run raw `claude -p` and never invoke bare `sr claude`.

Choose one route before launch:
- `--route auto` by default. It uses `sr claude proxy` only when that exact pooled launcher is installed; otherwise it uses a sanitized direct Claude login.
- `--route subrouter` when the user requests Subrouter, pooled subscriptions, account failover, or Fable. This fails closed if `sr claude proxy` is unavailable. Bare `sr claude` is an account picker and is not a bridge launcher.
- `--route direct` when the user explicitly wants to bypass Subrouter. The bridge removes every known Anthropic/cloud routing override, isolates user/project/local settings sources, and applies an authoritative final settings overlay before invoking the normal Claude login. Managed organization policy remains authoritative. For a human interactive launch, the equivalent Subrouter command is `sr claude-direct` once a build with the same authoritative overlay is installed.

Do not retry a request through a different route after launch. A route change can duplicate work, consume quota twice, or change billing/authentication semantics. Report the selected route and failure instead. A pre-request configuration failure may be retried on the same route after correcting that configuration.

For a new session, capture the bridge's `route=... scope=...` diagnostic alongside `session_id`. A Subrouter scope is an opaque fingerprint of the exact selected tenant, Tailscale node, or named server identity; it does not expose the underlying credential. For `continue`/`resume`, use that explicit route plus `--expect-scope <scope>`; every resume spelling requires the recorded scope, and `auto` intentionally refuses `--resume`, `-r`, `--continue`, and `-c`. Subrouter validates the scope inside the same process and against the same server snapshot used to launch. If it changed, restore the recorded selection or start an explicitly acknowledged new session. Never silently resume through a different account pool.

## Prompt and File Transport

Keep substantive prompt contents out of process arguments whenever practical.

- Pipe ordinary multiline prompts over stdin. Claude Code caps piped stdin at 10 MB.
- For a large prompt, an already-existing prompt artifact, or sensitive shell-hostile text, use `--prompt-file /absolute/path`. The bridge passes only the path and tells Claude to read the file in bounded chunks.
- Use repeatable `--attach /absolute/path` for source files, logs, images, and PDFs. The bridge grants each containing directory once with `--add-dir` and passes an absolute-path manifest. It does not base64-dump binary content into the prompt.
- Claude's `Read` tool handles PNG/JPEG/GIF/WebP as visual content and PDFs as documents. Tell Claude what to inspect or compare; for fine detail in large images, ask it to crop/read the relevant region.
- Prefer exact file paths over pasted excerpts when Claude needs full evidence. Include only genuinely relevant artifacts and state each artifact's purpose.
- Paths are local to the machine running the Claude CLI. A remote Subrouter server does not change that: `sr claude proxy` still runs Claude locally, so local paths work. If deliberately launching Claude over SSH, stage or identify the files on that remote machine first; never hand it paths that exist only on the caller.
- Preserve the working directory when repository instructions and relative context matter. Use absolute attachment paths so spaces and punctuation are unambiguous.
- Direct mode disables user/project/local setting sources to prevent persisted auth routing from leaking into the launch. When repository instructions or an MCP configuration are required, attach the exact instruction files and pass any required MCP configuration explicitly rather than assuming Claude loaded them.

For a file-backed request, put the complete task and constraints in the prompt file and list supporting artifacts with `--attach`. Do not both pipe the same content and attach it.

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

Bridge mode runs the bundled transport. The calling agent validates Claude's JSON result and returns Claude output plus minimal execution metadata.

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

### Background / Sidecar Mode

Use bridge mode as a tracked sidecar when the answer matters and the work may take time.

Practical rules:
- Prefer one tracked Claude session over repeated short probes.
- Keep the session alive for debugging, code review, and second opinions.
- Treat a slow but healthy run as active work, not failure.
- When the run completes, react immediately and continue from that result instead of restarting.

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
2. Resume the same Claude session with its recorded explicit route and scope after user reply.
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

### Context Symmetry

When the current Codex request is already grounded in RepoPrompt, context-builder, or selected-file context, preserve that same repo-grounded material when asking Claude.

Do not ask Claude for a vague second opinion on the problem in isolation. Ask it to reason against the same source material you are using locally, so the comparison stays anchored to the same files, excerpts, and assumptions.

If Claude-side RepoPrompt or equivalent tooling is available, ask Claude to use it too. If it is not available, say so explicitly and fall back to file-grounded context only. Do not imply symmetry that you cannot actually provide.
If RepoPrompt was not part of the current request, do not force it into the Claude ask.

When RepoPrompt symmetry is required:
- say it explicitly in the Claude prompt, not implicitly
- name the exact files or roots Claude should inspect
- ask Claude to state whether it actually used RepoPrompt or equivalent MCP repo tools
- if Claude answers the task correctly but reports `used_repoprompt=false`, retry once with a stricter tool-grounding prompt before accepting the result
- only accept `used_repoprompt=false` without retry when Claude reports the repo tools are unavailable or denied

## Error Handling

Common bridge-mode failures and handling:
- **CLI unavailable/auth issue**: report failure. Do not silently switch to package mode unless user asked for conversion/package output.
- **Route unavailable**: distinguish `subrouter`, `direct`, and `auto`. Do not replace an unavailable explicit route with another route.
- **Credential-precedence warning**: do not merely unset `ANTHROPIC_API_KEY`. Re-run through the bridge on the same intended route so all conflicting auth, base URL, config-dir, and cloud-provider selectors are isolated.
- **DNS/ENOTFOUND**: report the chosen route and host when available. Do not infer that Subrouter failed when the chosen route was direct, and do not blindly cross-route retry.
- **Surrounding MCP warnings**: Codex MCP startup failures (for example a missing local Figma server, RepoPrompt timeout, expired Linear OAuth, or a missing unrelated token) are not Claude API transport failures. Evaluate the Claude process JSON and exit status separately.
- **Schema validation failure**: retry once with clearer output instruction; if still failing, return raw `result` and flag schema miss.
- **Permission/tool denial**: narrow ask, disable tools, or request user-approved alternative.
- **Conflicting constraints**: preserve user constraints, surface conflict explicitly, propose minimal resolution options.

## Build Procedure

1. Parse intent, deliverables, constraints, success criteria.
2. Select mode (`package`, `bridge`, or `meta`) deterministically.
3. Gather minimal relevant context and inputs.
4. If the local task is repo-grounded, carry the same RepoPrompt/context-builder/selected-file material into Claude.
5. If RepoPrompt symmetry matters, make the prompt explicitly require RepoPrompt tool use and ask Claude to confirm whether it actually used those tools.
6. Detect critical ambiguity and embed up to 2 questions only if needed.
7. For package mode: emit deterministic package.
8. For bridge mode: choose the route, record route scope, choose stdin versus prompt-file transport, attach exact artifacts, run the bundled bridge, parse the output contract, and continue the same route/session if needed.
9. If RepoPrompt symmetry was required and Claude reports it did not use repo tools, retry once with a stricter tool-grounding prompt unless the tools were unavailable.
10. Validate formatting, scope, assumptions, and constraint fidelity before returning.

## Quality Rules

- Preserve user intent; do not broaden scope.
- Keep wording concrete and concise.
- Keep bullets atomic and testable.
- Reflect hard constraints exactly (stack, banned tools, deadlines, file boundaries, schema requirements).
- Avoid unsupported tool claims.
- Keep `SYSTEM:` compact (typically 4 to 8 bullets).
- Keep `CHECKLIST:` within 6 to 12 bullets.
- Keep bridge responses parseable and session-aware.
- Keep prompt bodies and secrets out of argv; use stdin or prompt files and pass binary artifacts by path.
- Never invoke bare `sr claude`; pooled bridge calls use the exact `sr claude proxy` subcommand.
- Do not add extra headings in package output.
- When RepoPrompt symmetry is requested, do not treat a repo-grounded answer as sufficient unless Claude also confirms it used the repo tools, or explicitly reports why it could not.

## Practical Examples

- `$claude any thoughts on this script?`
- `$claude run Give me a second opinion on this migration approach`
- `$claude json Analyze these test failures and return structured risks + next actions`
- `$claude run --meta any thoughts on this script?`
- `$claude subrouter ask Fable to adversarially review this design and inspect /absolute/design.png`
- `$claude direct ask Claude through my normal login, bypassing Subrouter`
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
- Route choice and file transport are explicit, fail-closed, and do not duplicate a launched request.
- Repo-grounded sidecar asks preserve context symmetry instead of generating abstract second opinions.

## Feedback & Issues

- [Report a bug](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=claude-skill-bug.yml)
- [Request a feature](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=claude-skill-feature.yml)
