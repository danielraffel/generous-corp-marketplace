# Prompt Repeater Plugin

A Claude Code plugin that implements Google Research's prompt repetition optimization technique to improve LLM performance on non-reasoning tasks.

## Overview

Based on the paper ["Prompt Repetition Improves Non-Reasoning LLMs"](https://arxiv.org/abs/2512.14982) by Leviathan et al., this plugin provides commands to apply prompt repetition - a simple yet effective technique that improves model accuracy by allowing each prompt token to attend to every other prompt token.

## Key Benefits

- **Proven effectiveness**: 47 wins, 0 losses across benchmarks (Gemini, GPT, Claude, DeepSeek)
- **No latency penalty**: Only affects parallelizable prefill stage
- **No output changes**: Response format remains identical
- **Safe to use**: Neutral to slightly positive even with reasoning tasks

## Features

- **Three repetition variants**: Simple, verbose, and triple repetition
- **Research-backed skill**: Teaches Claude when and how to apply prompt repetition
- **User control**: Manual commands for full control
- **Optional automation**: Opt-in auto-repeat via settings (experimental)

## Installation

### Local Development

```bash
cc --plugin-dir "/Users/danielraffel/Code/Repeat After Me"
```

### Project-Specific

Copy the plugin to your project's `.claude-plugin/` directory:

```bash
cp -r "/Users/danielraffel/Code/Repeat After Me" .claude-plugin/prompt-repeater
```

## Usage

### Automatic Mode (Recommended)

The easiest way to use this plugin is to enable automatic repetition:

1. **Create settings file:**
   ```bash
   cp .claude/prompt-repeater.local.md.example .claude/prompt-repeater.local.md
   ```

2. **Enable auto-apply:**
   Edit `.claude/prompt-repeater.local.md` and change:
   ```yaml
   auto_apply: false
   ```
   to:
   ```yaml
   auto_apply: true
   ```

3. **Restart Claude Code**

Now every prompt you enter will automatically be repeated using the configured mode!

**To turn it off:** Set `auto_apply: false` and restart Claude Code.

### Commands (Manual Mode)

#### `/repeat-last`
Repeats your last prompt using simple repetition (`<QUERY><QUERY>`).

```
User: What is the 25th item in this list?
User: /repeat-last
```

#### `/repeat-verbose`
Repeats with verbose framing (`<QUERY> Let me repeat that: <QUERY>`).

```
User: Find the name between two items in this list
User: /repeat-verbose
```

#### `/repeat-3x`
Uses triple repetition for maximum effect on certain tasks.

```
User: Which option is correct?
User: /repeat-3x
```

### Skill

The plugin includes a skill that educates Claude about prompt repetition, including:
- When to recommend repetition (non-reasoning tasks)
- How the technique works (attention mechanism)
- Task classification (reasoning vs non-reasoning)

### Settings

Control automatic repetition by creating `.claude/prompt-repeater.local.md`:

```yaml
---
# Turn automatic repetition on/off
auto_apply: true              # true = auto-repeat, false = manual commands only

# Which repetition mode to use
default_mode: simple          # Options: simple, verbose, triple

# Show notification when repetition applied
notify: true                  # true = show message, false = silent
---
```

**Copy the example file to get started:**
```bash
cp .claude/prompt-repeater.local.md.example .claude/prompt-repeater.local.md
```

Then edit the file and set `auto_apply: true` to enable automatic mode.

## When to Use

### ✅ Best for Non-Reasoning Tasks

- **Multiple choice questions** (especially options-first format)
- **List navigation** (find Nth item, find item between X and Y)
- **Simple queries** (fact retrieval, basic transformations)
- **Short prompts** (under ~500 characters)

### ⚠️ Less Effective for Reasoning Tasks

- Multi-step planning
- Complex debugging
- Deep analysis
- Tasks using "think step by step"

> **Note**: Prompt repetition is neutral to slightly positive even with reasoning, so it's generally safe to use.

## Research Background

From the Google Research paper (December 2024):

> "When not using reasoning, repeating the input prompt improves performance for popular models (Gemini, GPT, Claude, and Deepseek) without increasing the number of generated tokens or latency."

The technique works because LLMs are causal language models where past tokens cannot attend to future tokens. Repetition enables each prompt token to attend to every other prompt token, improving performance.

## Examples

### Example 1: List Navigation (NameIndex Task)

**Without repetition**: 21.33% accuracy
**With repetition**: 97.33% accuracy (Gemini 2.0 Flash-Lite)

```
User: Here's a list of 50 names. What's the 25th name?
User: /repeat-last
```

### Example 2: Multiple Choice (ARC Benchmark)

**Options-first format** shows largest gains with repetition:

```
User: A. oxygen and nitrogen in air
      B. sodium and chlorine in salt
      C. hydrogen and oxygen in water
      D. nitrogen and hydrogen in ammonia

      Which of the following is a mixture rather than a compound?
User: /repeat-last
```

## Configuration

### Auto-Repeat Mode

Enable automatic prompt repetition by setting `auto_apply: true` in `.claude/prompt-repeater.local.md`.

**How it works:**
1. You type your prompt normally
2. Hook automatically repeats it before Claude processes it
3. You get improved results without any extra steps

**To toggle:**
- **Turn ON**: Set `auto_apply: true`, restart Claude Code
- **Turn OFF**: Set `auto_apply: false`, restart Claude Code

**Tip**: Start with `auto_apply: false` and use manual commands to understand when repetition helps. Then enable auto-mode for convenience.

## Development

### Plugin Structure

```
prompt-repeater/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── repeat-last.md
│   ├── repeat-verbose.md
│   └── repeat-3x.md
├── skills/
│   └── prompt-repetition-optimization/
│       ├── SKILL.md
│       ├── references/
│       │   └── google-research-paper.md
│       └── examples/
│           └── task-types.md
├── hooks/
│   └── hooks.json
└── README.md
```

## Contributing

This plugin is based on published research. Future improvements could include:

- Fine-tuning repetition count based on prompt length
- Smart detection of non-reasoning vs reasoning tasks
- Partial prompt repetition for long prompts
- Integration with other optimization techniques

## License

MIT

## References

Leviathan, Y., Kalman, M., & Matias, Y. (2024). Prompt Repetition Improves Non-Reasoning LLMs. arXiv:2512.14982. https://arxiv.org/abs/2512.14982

## Support

For issues or questions, please open an issue on the GitHub repository.
