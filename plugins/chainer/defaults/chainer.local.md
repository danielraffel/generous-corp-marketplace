---
chains:
  plan-and-implement:
    enabled: true
    description: "Plan with feature-dev, implement with ralph-loop"
    inputs:
      prompt: { required: true, description: "What to build" }
      feature_name: { required: true, description: "Feature name for spec file" }
    steps:
      - name: plan
        type: skill
        skill: feature-dev:feature-dev
        args: "{{prompt}}"
        output:
          spec_file: "audit/{{feature_name}}.md"
      - name: implement
        type: script
        script: |
          SCRIPT_PATH="$(find ~/.claude/plugins -name 'setup-ralph-loop.sh' -path '*ralph-loop*' 2>/dev/null | head -1)"
          bash "$SCRIPT_PATH" "Implement features from {{spec_file}}" --max-iterations 50 --completion-promise DONE

  plan-only:
    enabled: true
    description: "Just plan with feature-dev"
    inputs:
      prompt: { required: true, description: "What to build" }
      feature_name: { required: true, description: "Feature name for spec file" }
    steps:
      - name: plan
        type: skill
        skill: feature-dev:feature-dev
        args: "{{prompt}}"

  implement-only:
    enabled: true
    description: "Implement from existing spec"
    inputs:
      spec_file: { required: true, description: "Path to spec file" }
    steps:
      - name: implement
        type: script
        script: |
          SCRIPT_PATH="$(find ~/.claude/plugins -name 'setup-ralph-loop.sh' -path '*ralph-loop*' 2>/dev/null | head -1)"
          bash "$SCRIPT_PATH" "Implement features from {{spec_file}}" --max-iterations 50 --completion-promise DONE

  worktree-plan-implement:
    enabled: true
    description: "Create worktree, plan, implement - full workflow"
    inputs:
      feature_name: { required: true, description: "Feature name for worktree and spec" }
      prompt: { required: true, description: "What to build" }
      base_branch: { required: false, description: "Branch to branch from (default: main)" }
    steps:
      - name: create-worktree
        type: skill
        skill: worktree-manager:start
        args: "{{feature_name}}{{#base_branch}} --base-branch={{base_branch}}{{/base_branch}}"
      - name: plan
        type: skill
        skill: feature-dev:feature-dev
        args: "{{prompt}}"
      - name: implement
        type: script
        script: |
          SCRIPT_PATH="$(find ~/.claude/plugins -name 'setup-ralph-loop.sh' -path '*ralph-loop*' 2>/dev/null | head -1)"
          bash "$SCRIPT_PATH" "Implement features from audit/{{feature_name}}.md" --max-iterations 50 --completion-promise DONE

defaults:
  spec_directory: audit
  max_iterations: 50
  auto_spawn_strategy: ask  # Options: ask, always, never

  # Smart Question Handler - Makes any plugin's questions interactive
  question_handling:
    enabled: true
    detect_text_questions: true    # Parse unstructured text questions into interactive UI
    enhance_structured: true       # Enhance plugins already using AskUserQuestion
    save_answers: true            # Remember choices in .claude/chainer-answers.json
    suggest_defaults: true        # Suggest answers based on project type and history
    batch_mode: false             # Collect all questions first, ask once (vs streaming)
---

# Chainer Configuration

This file contains your custom chain definitions. Copy it to `~/.claude/chainer.local.md` (global) or `.claude/chainer.local.md` (project-specific) to use.

## Usage

```bash
# Run a chain
/chainer:run plan-and-implement --prompt="Build OAuth flow" --feature_name="oauth"

# List available chains
/chainer:list

# Check running chains
/chainer:status
```

## Creating Custom Chains

Add new chains to the YAML frontmatter above. Each chain has:
- `enabled`: true/false
- `description`: What the chain does
- `inputs`: Required/optional parameters
- `steps`: Sequential actions to execute

### Step Types

- **skill**: Invoke a Claude Code skill/plugin
- **script**: Run bash commands
- **mcp**: Call an MCP server tool (future)
- **prompt**: Ask user mid-chain (future)
- **wait**: Wait for file/condition (future)

### Variable Substitution

Use `{{variable_name}}` to reference inputs or outputs from previous steps.

## Examples

See `community-chains/` directory for shareable chain examples.
