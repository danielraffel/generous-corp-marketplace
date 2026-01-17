# Task Type Examples: Non-Reasoning vs Reasoning

This document provides comprehensive examples to help classify tasks as non-reasoning (benefits from prompt repetition) or reasoning (minimal benefit from repetition).

## Non-Reasoning Tasks

Tasks that benefit significantly from prompt repetition.

### 1. Multiple Choice Questions

**Characteristics:**
- Select from predefined options
- No complex analysis required
- Answer exists in options

**Examples:**

```
Which of the following is a mixture rather than a compound?
A. oxygen and nitrogen in air
B. sodium and chlorine in salt
C. hydrogen and oxygen in water
D. nitrogen and hydrogen in ammonia
```

```
What color is the sky on a clear day?
A. Red
B. Blue
C. Green
D. Yellow
```

**Why repetition helps:** Especially effective with options-first format, allowing model to see options in context with question.

### 2. List Navigation

**Characteristics:**
- Find specific item by position
- Find item between two others
- Simple lookup in ordered data

**Examples:**

**Find Nth item:**
```
Here's a list of names:
Alice, Bob, Charlie, David, Emma, Frank, Grace, Henry, Iris, Jack

What's the 5th name?
```

**Find item between:**
```
Here's a list:
Red, Blue, Green, Red, Yellow, Blue, Red, Green, Blue, Yellow

What color appears between the second Red and the first Yellow?
```

**Why repetition helps:** Enables model to track position and context simultaneously, dramatically improving accuracy (21% → 97% in research).

### 3. Simple Fact Retrieval

**Characteristics:**
- Extract information from context
- No inference required
- Answer explicitly stated

**Examples:**

```
The Eiffel Tower was completed in 1889 and stands 330 meters tall.

When was the Eiffel Tower completed?
```

```
Sarah lives in Boston. Her sister Emma lives in Chicago. Their brother Tom lives in Seattle.

Where does Emma live?
```

**Why repetition helps:** Ensures relevant context is in attended scope when generating answer.

### 4. Pattern Matching

**Characteristics:**
- Identify simple patterns
- Match against template
- Basic classification

**Examples:**

```
Which of these email addresses is valid?
- user@example
- user@example.com
- @example.com
- user@
```

```
Which word doesn't belong?
Apple, Banana, Carrot, Orange, Grape
```

**Why repetition helps:** Pattern recognition benefits from full context attention.

### 5. Basic Categorization

**Characteristics:**
- Assign to predefined category
- Simple rules apply
- No complex judgment

**Examples:**

```
Categorize this animal: "has fur, four legs, barks"
Categories: Dog, Cat, Bird, Fish
```

```
Is this number even or odd: 847
```

**Why repetition helps:** Simple classification improves with bidirectional context.

### 6. Simple Comparison

**Characteristics:**
- Compare two or more items
- Objective criteria
- Clear answer

**Examples:**

```
Which is larger: 456 or 789?
```

```
Which word comes first alphabetically: Zebra, Apple, Monkey?
```

**Why repetition helps:** Comparison benefits from seeing all items in full context.

## Reasoning Tasks

Tasks that require complex reasoning where prompt repetition provides minimal benefit.

### 1. Multi-Step Planning

**Characteristics:**
- Multiple sequential steps
- Dependencies between steps
- Strategic thinking required

**Examples:**

```
Design a database schema for an e-commerce platform that handles products, users, orders, and inventory tracking. Consider scalability and data integrity.
```

```
Create a project plan for migrating our monolithic application to microservices. Include timeline, risks, and mitigation strategies.
```

**Why repetition doesn't help much:** Model will internally break down and reason through steps anyway.

### 2. Complex Debugging

**Characteristics:**
- Trace through logic
- Identify root cause
- Multi-factor analysis

**Examples:**

```
This function returns incorrect results intermittently. Debug the issue:

function calculateDiscount(price, category, memberLevel) {
  let discount = 0;
  if (category === 'electronics' && memberLevel > 2) {
    discount = 0.15;
  } else if (memberLevel === 3) {
    discount = 0.10;
  }
  return price - (price * discount);
}
```

```
Our API is timing out randomly. Here are the logs: [extensive logs]. What's causing this and how do we fix it?
```

**Why repetition doesn't help much:** Debugging requires step-by-step analysis and hypothesis testing.

### 3. Deep Analysis

**Characteristics:**
- Interpret complex information
- Draw insights
- Synthesize multiple factors

**Examples:**

```
Analyze this company's financial statements and provide insights into their financial health, growth trajectory, and potential risks.
```

```
Review this code architecture and suggest improvements for maintainability, scalability, and performance.
```

**Why repetition doesn't help much:** Analysis already involves internal reasoning and chain-of-thought.

### 4. Creative Generation

**Characteristics:**
- Generate novel content
- No predetermined answer
- Creativity required

**Examples:**

```
Write a short story about a time traveler who accidentally changes history.
```

```
Design a logo concept for a sustainable energy startup. Describe the visual elements and symbolism.
```

**Why repetition doesn't help much:** Creative tasks don't have a single correct answer that benefits from better attention.

### 5. Complex Problem Solving

**Characteristics:**
- Multiple constraints
- Optimization required
- Trade-off evaluation

**Examples:**

```
We need to reduce server costs by 30% while maintaining 99.9% uptime and handling 2x current traffic. Propose solutions.
```

```
Design an algorithm to efficiently find the shortest path in a weighted graph with dynamic edge weights.
```

**Why repetition doesn't help much:** Problem-solving requires reasoning through constraints and trade-offs.

### 6. Synthesis and Integration

**Characteristics:**
- Combine multiple concepts
- Create coherent whole
- Abstract thinking

**Examples:**

```
How do the principles of quantum mechanics relate to modern cryptography? Explain the connections.
```

```
Integrate these three different authentication methods into a cohesive security strategy.
```

**Why repetition doesn't help much:** Synthesis requires internal processing and reasoning.

## Edge Cases

Tasks that blur the line between non-reasoning and reasoning.

### Mathematical Word Problems

**Simple (non-reasoning):**
```
John has 5 apples. Mary gives him 3 more. How many apples does John have?
Answer: 5 + 3 = 8
```
✅ **Repetition helps:** Simple arithmetic, direct answer

**Complex (reasoning):**
```
A train leaves Station A at 60 mph. Another train leaves Station B (120 miles away) at 40 mph toward Station A. When will they meet?
```
❌ **Repetition doesn't help much:** Requires setup, equations, step-by-step solving

### Code Questions

**Simple (non-reasoning):**
```
What does this function return: `def double(x): return x * 2`
Answer: The input multiplied by 2
```
✅ **Repetition helps:** Direct reading comprehension

**Complex (reasoning):**
```
Refactor this code to follow SOLID principles and improve testability: [complex code]
```
❌ **Repetition doesn't help much:** Requires analysis and design thinking

### Information Extraction

**Simple (non-reasoning):**
```
Extract the email address from: "Contact us at support@example.com for help"
```
✅ **Repetition helps:** Pattern matching and extraction

**Complex (reasoning):**
```
From these 10 documents, extract and reconcile conflicting information about the project timeline, resolving discrepancies.
```
❌ **Repetition doesn't help much:** Requires interpretation and judgment

## Decision Guide

Use this flowchart logic to classify tasks:

### Question 1: Is the answer explicitly in the context?
- **YES** → Likely non-reasoning (extraction/lookup)
- **NO** → Continue to Question 2

### Question 2: Does it require multiple steps to solve?
- **NO** → Likely non-reasoning (simple operation)
- **YES** → Continue to Question 3

### Question 3: Are the steps predetermined and simple?
- **YES** → Possibly non-reasoning (mechanical process)
- **NO** → Likely reasoning (complex analysis)

### Question 4: Is there a single correct answer?
- **YES** → More likely to benefit from repetition
- **NO** → Less likely to benefit (creative/subjective)

## Quick Reference Table

| Task Type | Repetition Benefit | Example Command |
|-----------|-------------------|-----------------|
| Multiple choice | ⭐⭐⭐⭐⭐ High | `/repeat-last` |
| List navigation | ⭐⭐⭐⭐⭐ High | `/repeat-3x` |
| Simple lookup | ⭐⭐⭐⭐ Good | `/repeat-last` |
| Pattern matching | ⭐⭐⭐ Moderate | `/repeat-last` |
| Basic math | ⭐⭐⭐ Moderate | `/repeat-last` |
| Planning | ⭐ Low | Don't emphasize |
| Debugging | ⭐ Low | Don't emphasize |
| Analysis | ⭐ Low | Don't emphasize |
| Creative | ⭐ Low | Don't emphasize |
| Problem-solving | ⭐ Low | Don't emphasize |

## Real-World Examples from Research

### High-Impact Examples (from Google Research paper)

**NameIndex task:**
- **Task:** Find 25th name in list of 50
- **Baseline:** 21.33% accuracy
- **With repetition:** 97.33% accuracy
- **Verdict:** ⭐⭐⭐⭐⭐ Extremely high benefit

**MiddleMatch task:**
- **Task:** Find name between two given names in list with repetitions
- **Result:** Strong gains, triple repetition performs best
- **Verdict:** ⭐⭐⭐⭐⭐ Extremely high benefit

**ARC (options-first):**
- **Task:** Multiple choice science questions (options before question)
- **Result:** Statistically significant improvements across all models
- **Verdict:** ⭐⭐⭐⭐ High benefit

**GSM8K with reasoning:**
- **Task:** Math word problems with "think step by step"
- **Result:** Neutral (22 ties, 5 wins, 1 loss)
- **Verdict:** ⭐ Low benefit (but safe to use)

## Summary Guidelines

**Strongly recommend repetition for:**
- Multiple choice (especially options-first)
- List indexing and navigation
- Simple lookups in text
- Pattern matching tasks

**Don't emphasize repetition for:**
- Multi-step planning
- Complex debugging
- Deep analysis
- Creative generation
- Already using chain-of-thought

**Safe to use (neutral) for:**
- Tasks with reasoning enabled
- Mixed reasoning/non-reasoning tasks
- When uncertain (won't hurt)

When in doubt, recommend `/repeat-last` for non-reasoning tasks and explain that it's research-backed and safe to try.
