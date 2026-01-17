---
name: Prompt Repetition Optimization
description: This skill should be used when the user asks to "improve performance", "optimize query", "use prompt repetition", "repeat my prompt", mentions "Google Research prompt paper", or discusses non-reasoning vs reasoning tasks. Provides research-backed guidance on when and how to apply prompt repetition for performance gains.
version: 0.1.0
---

# Prompt Repetition Optimization

## Overview

Prompt repetition is a simple yet effective technique discovered by Google Research that improves LLM performance on non-reasoning tasks by enabling each prompt token to attend to every other prompt token. The technique transforms `<QUERY>` into `<QUERY><QUERY>`, allowing bidirectional attention in causal language models.

**Key benefits:**
- 47 wins, 0 losses across major models (Gemini, GPT, Claude, DeepSeek)
- No latency penalty (only affects parallelizable prefill stage)
- No output format changes
- Safe even with reasoning tasks (neutral to slightly positive)

## When to Use Prompt Repetition

### Best for Non-Reasoning Tasks

Apply prompt repetition to tasks that don't require complex multi-step reasoning:

**Multiple Choice Questions:**
- Especially effective with "options-first" format (options before question)
- Example: "A, B, C, D... Which is correct?"

**List Navigation:**
- Finding Nth item in a list
- Finding item between two other items
- Example: "What's the 25th name?" or "What appears between X and Y?"

**Simple Queries:**
- Fact retrieval
- Basic transformations
- Short prompts (under ~500 characters)

**Pattern Recognition:**
- Simple classification tasks
- Basic matching operations

### Less Effective for Reasoning Tasks

Avoid emphasizing repetition for tasks requiring complex reasoning:

- Multi-step planning
- Complex debugging
- Deep analysis requiring chain-of-thought
- Tasks already using "think step by step"

**Note:** Prompt repetition is neutral to slightly positive even with reasoning enabled (5 wins, 1 loss, 22 neutral), so it's safe to use but provides minimal benefit.

## How to Apply Prompt Repetition

### Recognize Opportunities

When user submits a prompt, evaluate if it's a non-reasoning task:

**Non-reasoning indicators:**
- Short, direct questions
- Multiple choice format
- List-based queries
- Fact retrieval requests
- Simple classification

**Reasoning indicators:**
- "Plan", "design", "analyze"
- Multi-step requirements
- Complex debugging
- Already using chain-of-thought

### Recommend Appropriate Method

For non-reasoning tasks, suggest using one of the available commands:

**Simple Repetition (`/repeat-last`):**
- Default recommendation
- Format: `<QUERY><QUERY>`
- Best for most non-reasoning tasks

**Verbose Repetition (`/repeat-verbose`):**
- Format: `<QUERY> Let me repeat that: <QUERY>`
- Sometimes performs better than simple repetition
- Good for longer prompts

**Triple Repetition (`/repeat-3x`):**
- Format: `<QUERY> Let me repeat that: <QUERY> Let me repeat that one more time: <QUERY>`
- Substantially better on certain tasks (NameIndex, MiddleMatch)
- Use for complex list navigation or pattern matching

### Example Recommendations

**User asks:** "Which of these options is correct? A) ... B) ... C) ... D) ..."

**Respond:** "This is a multiple-choice question, which is a non-reasoning task that benefits from prompt repetition. Try using `/repeat-last` to improve accuracy."

**User asks:** "Help me plan the architecture for this system"

**Respond:** "This requires complex multi-step reasoning. Prompt repetition won't significantly help here, as the task already involves chain-of-thought processing."

**User asks:** "What's the 25th item in this list: [long list]"

**Respond:** "List navigation tasks benefit greatly from prompt repetition. Consider using `/repeat-3x` for maximum accuracy on this type of task."

## Task Classification Guidelines

### Non-Reasoning Task Examples

Tasks where prompt repetition shows strong gains:

1. **Multiple choice** - Select from given options
2. **List indexing** - Find Nth element
3. **Item matching** - Find element between two others
4. **Simple lookup** - Retrieve fact from context
5. **Basic classification** - Categorize into predefined groups
6. **Pattern matching** - Find simple patterns

### Reasoning Task Examples

Tasks where prompt repetition provides minimal benefit:

1. **Planning** - Design architecture, create roadmap
2. **Analysis** - Deep investigation, root cause analysis
3. **Synthesis** - Combine multiple concepts
4. **Debugging** - Trace complex issues
5. **Chain-of-thought** - Already using step-by-step reasoning
6. **Creative generation** - Write stories, design solutions

## Implementation Notes

### Why It Works

Causal language models process tokens left-to-right where past tokens cannot attend to future tokens. This means token order affects prediction performance. Repetition enables each prompt token to attend to every other prompt token, addressing positional limitations.

### Performance Characteristics

**Accuracy improvements:**
- Small gains on standard benchmarks (question-first format)
- Large gains on options-first multiple choice
- Dramatic gains on list navigation (21% → 97% on NameIndex)

**No cost concerns:**
- Output length unchanged
- Latency unchanged (except very long prompts on some models)
- Generation speed unaffected

**Variants comparison:**
- Simple repetition: Reliable baseline
- Verbose: Sometimes outperforms simple
- Triple (×3): Often substantially better on specific tasks

### Edge Cases

**When NOT to recommend:**

1. **Very long prompts** - May affect latency, limited by context window
2. **Already repeated** - Don't suggest if user already applied repetition
3. **Streaming reasoning** - Extended thinking already active
4. **Code generation** - Usually not helpful for generating code

## User Guidance

When recommending prompt repetition:

1. **Explain why**: "This is a non-reasoning task that benefits from repetition"
2. **Suggest specific command**: `/repeat-last`, `/repeat-verbose`, or `/repeat-3x`
3. **Set expectations**: "Research shows this improves accuracy without increasing latency"
4. **Provide context**: Reference Google Research findings if user is interested

**Don't oversell:** Repetition is a simple optimization, not a magic solution. Be honest about when it helps and when it doesn't.

## Additional Resources

### Reference Files

For detailed information, consult:

- **`references/google-research-paper.md`** - Full paper details, benchmarks, and findings
- **`examples/task-types.md`** - Comprehensive examples of non-reasoning vs reasoning tasks

### Research Background

The technique is based on "Prompt Repetition Improves Non-Reasoning LLMs" by Leviathan, Kalman, and Matias (Google Research, December 2024). The paper tested 7 models across 7 benchmarks and found consistent improvements on non-reasoning tasks.

### Commands Available

Users can apply prompt repetition using these commands:
- `/repeat-last` - Simple repetition
- `/repeat-verbose` - Verbose framing
- `/repeat-3x` - Triple repetition

These commands are provided by the prompt-repeater plugin.

## Quick Decision Guide

Use this decision tree to recommend prompt repetition:

1. **Is the task non-reasoning?** (multiple choice, list navigation, fact retrieval)
   - YES → Recommend `/repeat-last` or `/repeat-3x`
   - NO → Continue to step 2

2. **Is the task complex reasoning?** (planning, debugging, analysis)
   - YES → Don't emphasize repetition, neutral benefit
   - NO → Continue to step 3

3. **Is the prompt very long?** (>2000 characters)
   - YES → Warn about potential latency, still safe to use
   - NO → Recommend `/repeat-last`

4. **Is it a list navigation task?** (find Nth, find between X and Y)
   - YES → Recommend `/repeat-3x` for maximum accuracy
   - NO → Recommend `/repeat-last` as default

## Best Practices

1. **Evaluate task type first** - Determine if non-reasoning before recommending
2. **Start simple** - Default to `/repeat-last` unless specific reason for others
3. **Explain the benefit** - Help users understand when and why to use it
4. **Don't over-apply** - Not every task needs repetition
5. **Monitor feedback** - If repetition doesn't help, acknowledge and adjust

## Summary

Prompt repetition is a research-backed technique that consistently improves performance on non-reasoning tasks without latency penalty. Recommend it when users have multiple choice questions, list navigation tasks, or simple queries. Use simple repetition by default, verbose for variety, and triple for maximum accuracy on specific tasks like list navigation.
