---
name: repeat-verbose
description: Apply verbose prompt repetition with framing to the user's last message
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
argument-hint: (no arguments)
---

# Repeat Last Prompt (Verbose)

Apply verbose prompt repetition optimization to the user's last message. This variant uses framing text between repetitions: `<QUERY> Let me repeat that: <QUERY>`.

## What This Command Does

1. Retrieves the user's last message from the conversation history
2. Applies verbose repetition with framing text
3. Processes the repeated prompt to improve model performance
4. Provides a brief confirmation that verbose repetition was applied

## When to Use

Use this command for the same scenarios as `/repeat-last`, but when:
- You want to try a variation that sometimes outperforms simple repetition
- The prompt is longer and benefits from explicit framing
- You want to make the repetition more natural-sounding

**Best for:**
- Multiple choice questions
- List navigation tasks
- Simple fact retrieval
- Pattern matching

## Implementation Instructions

When this command is invoked:

1. **Retrieve the last user message** from the conversation history
   - Get the most recent message from the user (not from Claude)
   - If unavailable, inform the user that there's no previous message to repeat

2. **Apply verbose repetition**
   - Format: `<QUERY> Let me repeat that: <QUERY>`
   - Include the framing text "Let me repeat that:" between repetitions
   - Example: If user asked "What's the 5th item?", process it as:
     ```
     What's the 5th item? Let me repeat that: What's the 5th item?
     ```

3. **Process the repeated prompt**
   - Treat the repeated prompt (with framing) as if it were the original user input
   - Generate response based on the repeated context
   - Do not include the repetition in the visible response

4. **Provide confirmation**
   - Briefly note that verbose repetition was applied
   - Example: "Applied verbose prompt repetition to your query."
   - Then provide the actual answer to the query

## Example Usage

**User's original message:**
```
Which of the following is a mixture?
A. oxygen and nitrogen in air
B. sodium and chlorine in salt
C. hydrogen and oxygen in water
D. nitrogen and hydrogen in ammonia
```

**User runs:** `/repeat-verbose`

**Claude processes internally:**
```
Which of the following is a mixture?
A. oxygen and nitrogen in air
B. sodium and chlorine in salt
C. hydrogen and oxygen in water
D. nitrogen and hydrogen in ammonia
Let me repeat that:
Which of the following is a mixture?
A. oxygen and nitrogen in air
B. sodium and chlorine in salt
C. hydrogen and oxygen in water
D. nitrogen and hydrogen in ammonia
```

**Claude responds:**
```
Applied verbose prompt repetition to your query.

The answer is A. Oxygen and nitrogen in air is a mixture (not a compound). The gases are physically combined but not chemically bonded.
```

## Comparison to Simple Repetition

**Simple repetition (`/repeat-last`):**
- Format: `<QUERY><QUERY>`
- Most straightforward
- Good default choice

**Verbose repetition (this command):**
- Format: `<QUERY> Let me repeat that: <QUERY>`
- Sometimes outperforms simple repetition
- More natural-sounding
- Use when simple repetition isn't sufficient

**Research findings:** Both methods perform similarly on most tasks. Verbose sometimes provides marginal improvements.

## Research Background

From Google Research paper variations testing:
- Verbose repetition performs similarly to simple repetition for most tasks
- Occasionally outperforms simple repetition on certain benchmarks
- No additional latency penalty compared to simple repetition
- Output length and format unchanged

## Edge Cases

**No previous message:**
```
No previous message found to repeat. Please send a query first, then use /repeat-verbose.
```

**Very long prompts:**
```
Warning: Your prompt is very long. Verbose repetition may affect latency. Proceeding with verbose repetition.
```

**Already repeated:**
```
Your previous message appears to already use repetition. Applying additional repetition may not help further.
```

## Related Commands

- `/repeat-last` - Simple repetition without framing (recommended default)
- `/repeat-3x` - Triple repetition for maximum accuracy

## Tips

- Try this if `/repeat-last` doesn't provide the expected improvement
- Works well for multiple choice and list tasks
- Safe to experiment - research shows consistent performance
- Can alternate between `/repeat-last` and this command to see which works better for your use case
