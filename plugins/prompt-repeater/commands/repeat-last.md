---
name: repeat-last
description: Apply simple prompt repetition to the user's last message to improve performance on non-reasoning tasks
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
argument-hint: (no arguments)
---

# Repeat Last Prompt

Apply simple prompt repetition optimization to the user's last message. This command implements the technique from Google Research's "Prompt Repetition Improves Non-Reasoning LLMs" paper.

## What This Command Does

1. Retrieves the user's last message from the conversation history
2. Applies simple repetition by duplicating the prompt: `<QUERY><QUERY>`
3. Processes the repeated prompt to improve model performance
4. Provides a brief confirmation that repetition was applied

## When to Use

Use this command for **non-reasoning tasks** such as:
- Multiple choice questions
- Finding items in lists
- Simple fact retrieval
- Pattern matching
- Basic categorization

**Do not emphasize for:**
- Complex planning or analysis
- Multi-step debugging
- Creative writing tasks
- Tasks already using extended thinking

## Implementation Instructions

When this command is invoked:

1. **Retrieve the last user message** from the conversation history
   - Get the most recent message from the user (not from Claude)
   - If unavailable, inform the user that there's no previous message to repeat

2. **Apply simple repetition**
   - Format: `<QUERY><QUERY>` (the query repeated twice, back-to-back)
   - No additional framing or text between repetitions
   - Example: If user asked "What's the 5th item?", process it as "What's the 5th item?What's the 5th item?"

3. **Process the repeated prompt**
   - Treat the repeated prompt as if it were the original user input
   - Generate response based on the repeated context
   - Do not include the repetition in the visible response

4. **Provide confirmation**
   - Briefly note that prompt repetition was applied
   - Example: "Applied prompt repetition optimization to your query."
   - Then provide the actual answer to the query

## Example Usage

**User's original message:**
```
Here's a list of names:
Alice, Bob, Charlie, David, Emma

What's the 3rd name?
```

**User runs:** `/repeat-last`

**Claude processes internally:**
```
Here's a list of names:
Alice, Bob, Charlie, David, Emma

What's the 3rd name?Here's a list of names:
Alice, Bob, Charlie, David, Emma

What's the 3rd name?
```

**Claude responds:**
```
Applied prompt repetition optimization to your query.

The 3rd name in the list is Charlie.
```

## Research Background

This technique is based on Google Research findings showing:
- 47 wins, 0 losses on non-reasoning benchmarks
- No latency penalty (only affects prefill stage)
- Especially effective for list navigation and multiple choice
- Example: 21% → 97% accuracy improvement on list indexing tasks

## Edge Cases

**No previous message:**
If there's no previous user message in the conversation, respond:
```
No previous message found to repeat. Please send a query first, then use /repeat-last.
```

**Very long prompts:**
If the user's last message is extremely long (>5000 characters), warn:
```
Warning: Your prompt is very long. Repetition may affect latency. Proceeding with simple repetition.
```

**Already repeated:**
If the last message appears to already use repetition (contains identical consecutive sections), inform the user:
```
Your previous message appears to already use repetition. Applying additional repetition may not help further.
```

## Related Commands

- `/repeat-verbose` - Use verbose framing between repetitions
- `/repeat-3x` - Apply triple repetition for maximum accuracy

## Tips

- Works best on non-reasoning tasks (see prompt-repetition-optimization skill)
- Safe to use even if uncertain - never performs worse than baseline
- For maximum benefit on list navigation, consider `/repeat-3x`
- Can be combined with other optimization techniques
