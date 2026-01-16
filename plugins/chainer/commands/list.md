---
description: Show available chains
---

# Chainer: List Available Chains

Display all enabled chains from the configuration.

**User Communication:** Be concise. Don't show "Reading file..." or "Parsing...". Just show the results. If config missing, say "Using defaults" in one line.

## Step 1: Load Configuration

Read the chainer configuration from (in order of priority):
1. `.claude/chainer.local.md` (project-specific)
2. `~/.claude/chainer.local.md` (global)
3. Fallback to plugin defaults at `${CLAUDE_PLUGIN_ROOT}/../defaults/chainer.local.md`

Use the Read tool to load and parse the YAML frontmatter.

## Step 2: Filter Enabled Chains

Filter to show only chains where `enabled: true`.

## Step 3: Display Chains

Format the output as a clear list:

```
Available Chains:

┌─────────────────────────────────────────────────────────────┐
│ plan-and-implement                                          │
│ Plan with feature-dev, implement with ralph-loop          │
│                                                             │
│ Usage:                                                      │
│   /chainer:run plan-and-implement \                         │
│     --prompt="Your idea" \                                  │
│     --feature_name="feature-name"                           │
│                                                             │
│ Required inputs:                                            │
│   • prompt: What to build                                   │
│   • feature_name: Feature name for spec file                │
│                                                             │
│ Steps: 2                                                    │
│   1. plan (skill: feature-dev:feature-dev)                  │
│   2. implement (script)                                     │
├─────────────────────────────────────────────────────────────┤
│ plan-only                                                   │
│ Just plan with feature-dev                                  │
│                                                             │
│ Usage:                                                      │
│   /chainer:run plan-only \                                  │
│     --prompt="Your idea" \                                  │
│     --feature_name="feature-name"                           │
│                                                             │
│ Required inputs:                                            │
│   • prompt: What to build                                   │
│   • feature_name: Feature name for spec file                │
│                                                             │
│ Steps: 1                                                    │
│   1. plan (skill: feature-dev:feature-dev)                  │
├─────────────────────────────────────────────────────────────┤
│ implement-only                                              │
│ Implement from existing spec                                │
│                                                             │
│ Usage:                                                      │
│   /chainer:run implement-only \                             │
│     --spec_file="audit/feature.md"                          │
│                                                             │
│ Required inputs:                                            │
│   • spec_file: Path to spec file                            │
│                                                             │
│ Steps: 1                                                    │
│   1. implement (script)                                     │
└─────────────────────────────────────────────────────────────┘

Configuration: .claude/chainer.local.md

💡 Tip: Use /chainer:run <chain-name> to execute a chain
```

## Implementation Notes

You are implementing this command. You should:

1. **Read the configuration file** using the Read tool
2. **Parse YAML frontmatter** to extract chain definitions
3. **Filter for enabled chains only**
4. **Format output** to show:
   - Chain name
   - Description
   - Usage example
   - Required/optional inputs with descriptions
   - Step count and types
5. **Show configuration source** (which file was loaded)

Remember:
- Check project-specific config first, then global
- Only show enabled chains
- Format clearly with boxes/dividers for readability
- Include helpful usage examples
