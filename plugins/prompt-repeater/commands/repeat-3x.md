---
name: repeat-3x
description: Apply triple prompt repetition for maximum accuracy on list navigation and pattern matching tasks
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
argument-hint: (no arguments)
---

# Repeat Last Prompt (Triple)

Apply triple prompt repetition optimization to the user's last message. This variant repeats the query three times for maximum accuracy on specific task types.

## What This Command Does

1. Retrieves the user's last message from the conversation history
2. Applies triple repetition: `<QUERY> Let me repeat that: <QUERY> Let me repeat that one more time: <QUERY>`
3. Processes the triple-repeated prompt to improve model performance
4. Provides a brief confirmation that triple repetition was applied

## When to Use

Use this command specifically for tasks that benefit from maximum repetition:

**Highly recommended for:**
- **List navigation:** Finding Nth item, finding item between two others
- **Pattern matching:** Complex pattern recognition in lists
- **NameIndex-type tasks:** Locate specific item in long list
- **MiddleMatch-type tasks:** Find item between two others in list with repetitions

**Less beneficial for:**
- Simple multiple choice (use `/repeat-last` instead)
- Short queries (simple repetition sufficient)
- General fact retrieval (simple repetition sufficient)

## Implementation Instructions

When this command is invoked:

1. **Retrieve the last user message** from the conversation history
   - Get the most recent message from the user (not from Claude)
   - If unavailable, inform the user that there's no previous message to repeat

2. **Apply triple repetition**
   - Format: `<QUERY> Let me repeat that: <QUERY> Let me repeat that one more time: <QUERY>`
   - Include framing text between each repetition
   - Example: If user asked "What's the 25th item?", process it as:
     ```
     What's the 25th item?
     Let me repeat that:
     What's the 25th item?
     Let me repeat that one more time:
     What's the 25th item?
     ```

3. **Process the triple-repeated prompt**
   - Treat the triple-repeated prompt as if it were the original user input
   - Generate response based on the repeated context
   - Do not include the repetition in the visible response

4. **Provide confirmation**
   - Briefly note that triple repetition was applied
   - Example: "Applied triple prompt repetition for maximum accuracy."
   - Then provide the actual answer to the query

## Example Usage

**User's original message:**
```
Here's a list of 50 names:
Dale Lopez, Peter Sanchez, Allen Harris, Scott Davis, Hudson Leviathan,
Daphne Kalman, Dennis Davis, Henry King, Alfred Cooper, Bruce Usher, Travis
Ramirez, Rafael Jennings, Richard Rogers, Walter Young, Caleb Harris, Ben
Kalman, Donald Carter, Richard Sterling, Mark Nightingale, Steven Carter,
Talia Kalman, Dennis Hanson, James Harris, Craig Chavez, Paul Sanchez,
Samuel Curtis, Jacob James, Allen Thomas, Dale Evans, James Fox, Douglas
Allen, Orion Johnson, Alexander Wright, Eugene Morrison, Nelson Lee, Alan
Young, Caleb Ward, Alberto Robinson, Robert McCarthy, Mark Price, Kenneth
Ramirez, Jeffrey White, Chad Cooper, Arthur Waters, Bruce Callahan, Liam
Leviathan, Steven Robinson, Alberto Murphy, Leonard Johnson, Robert Murphy

What's the 25th name?
```

**User runs:** `/repeat-3x`

**Claude processes internally:**
```
[Full list and question]
Let me repeat that:
[Full list and question]
Let me repeat that one more time:
[Full list and question]
```

**Claude responds:**
```
Applied triple prompt repetition for maximum accuracy.

The 25th name in the list is Paul Sanchez.
```

## Research Background

From Google Research paper:
- **Triple repetition substantially outperforms simple repetition on NameIndex and MiddleMatch tasks**
- NameIndex example: Finding 25th item in list of 50
  - Baseline: 21.33% accuracy
  - Simple repetition: High accuracy
  - Triple repetition: Substantially better (approaching 97.33%)
- MiddleMatch: Finding item between two others in list
  - Triple repetition shows strong gains over simple repetition

**Trade-offs:**
- Longer input (3x the original prompt)
- May increase prefill latency on very long prompts
- Maximum accuracy benefit on specific task types

## When NOT to Use

**Avoid for:**
- Simple multiple choice questions (use `/repeat-last`)
- Short queries (overhead not justified)
- Reasoning tasks (minimal benefit)
- Very long prompts (may hit context limits)

**Use `/repeat-last` instead if:**
- Query is already short and simple
- Simple repetition provides sufficient accuracy
- Prompt is very long (>2000 characters)

## Comparison to Other Variants

**Simple repetition (`/repeat-last`):**
- Format: `<QUERY><QUERY>`
- Best default choice
- Works well for most non-reasoning tasks

**Verbose repetition (`/repeat-verbose`):**
- Format: `<QUERY> Let me repeat that: <QUERY>`
- Sometimes marginally better than simple
- Good for general use

**Triple repetition (this command):**
- Format: `<QUERY> Let me repeat that: <QUERY> Let me repeat that one more time: <QUERY>`
- **Maximum accuracy** for list navigation
- Use for specific high-value tasks
- May have latency impact on long prompts

## Research Findings

**Performance comparison:**
- NameIndex: Triple > Verbose > Simple > Baseline
- MiddleMatch: Triple > Verbose > Simple > Baseline
- General benchmarks: Triple ≈ Verbose ≈ Simple > Baseline

**Latency:**
- Most models: No significant latency increase
- Claude models with very long prompts: Prefill latency may increase
- Generation stage: Unaffected

**Output:**
- Length unchanged
- Format unchanged
- Quality improved on target tasks

## Edge Cases

**No previous message:**
```
No previous message found to repeat. Please send a query first, then use /repeat-3x.
```

**Very long prompts:**
```
Warning: Your prompt is very long. Triple repetition will significantly increase input length and may affect latency or hit context limits. Consider using /repeat-last instead.

Proceeding with triple repetition.
```

**Already repeated:**
```
Your previous message appears to already use repetition. Applying additional repetition may not help further and could hit context limits.
```

**Context limit warning:**
If the triple-repeated prompt would exceed reasonable length:
```
Warning: Triple repetition of this prompt may approach context limits. Results may be truncated. Consider using /repeat-last for shorter prompts.
```

## Related Commands

- `/repeat-last` - Simple repetition (recommended default)
- `/repeat-verbose` - Verbose repetition with framing

## Tips

- **Use for list navigation tasks** where accuracy is critical
- Start with `/repeat-last` and escalate to this if needed
- Particularly effective when finding items by position or between other items
- Monitor for latency on very long prompts
- Research shows this is the most accurate variant for specific task types
