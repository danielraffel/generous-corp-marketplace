# Prompt Repetition Improves Non-Reasoning LLMs

**Research Paper Reference**

**Authors:** Yaniv Leviathan, Matan Kalman, Yossi Matias (Google Research)
**Published:** December 2024
**arXiv:** 2512.14982v1
**URL:** https://arxiv.org/abs/2512.14982

## Abstract

When not using reasoning, repeating the input prompt improves performance for popular models (Gemini, GPT, Claude, and Deepseek) without increasing the number of generated tokens or latency.

## Key Findings

### Performance Improvements

**Win/Loss Record:** 47 wins, 0 losses across 70 benchmark-model combinations (without reasoning)

**Models Tested:**
- Gemini 2.0 Flash
- Gemini 2.0 Flash Lite
- GPT-4o-mini
- GPT-4o
- Claude 3 Haiku
- Claude 3.7 Sonnet
- Deepseek V3

**Benchmarks:**
- ARC (Challenge)
- OpenBookQA
- GSM8K
- MMLU-Pro
- MATH
- NameIndex (custom)
- MiddleMatch (custom)

### Why It Works

LLMs are trained as causal language models where past tokens cannot attend to future tokens. Token order affects prediction performance. For example:

- `<CONTEXT> <QUESTION>` performs differently from `<QUESTION> <CONTEXT>`

Prompt repetition (`<QUERY><QUERY>`) enables each prompt token to attend to every other prompt token, addressing positional limitations in causal attention.

### Efficiency

**No latency penalty:**
- Only affects parallelizable prefill stage
- Generation stage unchanged
- Output length unchanged
- Format unchanged (drop-in compatible)

**Exception:** Claude models on very long prompts (NameIndex, MiddleMatch, or ×3 variant) show increased prefill latency.

### Variations Tested

**Simple Repetition:**
```
<QUERY>
<QUERY>
```

**Verbose Repetition:**
```
<QUERY>
Let me repeat that:
<QUERY>
```

**Triple Repetition (×3):**
```
<QUERY>
Let me repeat that:
<QUERY>
Let me repeat that one more time:
<QUERY>
```

**Padding (Control):**
```
<QUERY>
Ignore these periods (they are irrelevant) and answer the above question: .......
```

**Results:** All repetition variants perform similarly for most tasks. Triple repetition often substantially outperforms on NameIndex and MiddleMatch tasks. Padding shows no improvement (confirming gains are from repetition, not input length).

## Benchmark Results

### Multiple Choice (Options-First)

Large improvements when options appear before question:

**Example format:**
```
A. oxygen and nitrogen in air
B. sodium and chlorine in salt
C. hydrogen and oxygen in water
D. nitrogen and hydrogen in ammonia

Which of the following is a mixture rather than a compound?
```

This format makes the model process options without seeing the question in context (unless using repetition).

**Results:** Statistically significant improvements across all models on ARC, OpenBookQA, and MMLU-Pro with options-first format.

### Custom Tasks: NameIndex

**Task:** Given a list of N names, output the ith name.
**Parameters:** N = 50, i = 25

**Example:**
```
Here's a list of names:
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

**Results:**
- Baseline: 21.33% accuracy (Gemini 2.0 Flash-Lite)
- With repetition: 97.33% accuracy
- Improvement: +76 percentage points

### Custom Tasks: MiddleMatch

**Task:** Given a list of N names/numbers (from K possible values, K < N means repetitions), output the name/number between two given ones.
**Parameters:** N = 40, K = 10

**Example:**
```
Here's a list (potentially with repetitions) of names:
Carlos Davis, Dale Sims, Carlos Davis, Dale Sims, Stephen Cruz, Dale Sims,
Finnian Ross, Stephen Cruz, Stephen Cruz, Gregory Collins, Dale Sims,
Stephen Cruz, Carlos Davis, Stephen Cruz, Dale Sims, Dale Sims, Stephen
Cruz, Stephen Cruz, Leonard Kalman, Bruce Phillips, Raymond Roberts, Dale
White, Leonard Kalman, Finnian Ross, James Wright, Finnian Ross, Raymond
Roberts, Dale Sims, Dale Sims, Leonard Kalman, Dale Sims, Carlos Davis,
Leonard Kalman, Bruce Phillips, Dale Sims, Raymond Roberts, Gregory Collins,
Gregory Collins, Dale Sims, Finnian Ross

What is the single name that appears right between Carlos Davis and Bruce
Phillips?
```

**Results:** Strong gains across all models, with triple repetition substantially outperforming simple repetition.

### With Reasoning Enabled

When using "think step by step" prompting:

**Results:** 5 wins, 1 loss, 22 neutral

**Interpretation:** Neutral to slightly positive because reasoning models often internally repeat parts of the prompt anyway. Prompt repetition is safe to use but provides minimal additional benefit.

## Practical Implications

### When to Use

**High-value scenarios:**
1. Multiple choice with options-first format
2. List navigation (find Nth, find between)
3. Simple queries without reasoning
4. Tasks requiring full prompt context

**Lower-value scenarios:**
1. Complex reasoning tasks
2. Tasks already using chain-of-thought
3. Very long prompts (may affect latency)

### Deployment Considerations

**Advantages:**
- Drop-in compatible (no format changes)
- Safe to apply broadly (never worse)
- No infrastructure changes needed
- Works with existing systems

**Limitations:**
- May not work with very long prompts (context limits)
- Prefill latency may increase on some models for long inputs
- Minimal benefit when reasoning is already active

### Future Directions (from paper)

1. Fine-tune models with repeated prompts
2. Train reasoning models with repetition to increase efficiency
3. Periodically repeat tokens during generation
4. Only keep second repetition in KV-cache
5. Repeat only parts of long prompts
6. Reorder prompt instead of repeating
7. Apply to non-text modalities (images)
8. Analyze when more than 2 repetitions help
9. Study attention patterns due to repetition
10. Use with selective attention techniques
11. Explore interactions with Prefix LM
12. Investigate when repetition is helpful
13. Explore promising variants

## Related Work

**Chain of Thought (CoT):** Requires specific examples per task, increases output length and latency. Can be used in tandem with repetition (mostly neutral results).

**"Think step by step":** Achieves improvements but increases output length and latency. Repetition is orthogonal and can be combined.

**Previous repetition studies:**
- Shaier (2024): Repeating just question part yields no gains
- Springer et al. (2024): Repetition yields better text embeddings
- Xu et al. (2024): Asking model to re-read improves reasoning

## Citation

```bibtex
@article{leviathan2024prompt,
  title={Prompt Repetition Improves Non-Reasoning LLMs},
  author={Leviathan, Yaniv and Kalman, Matan and Matias, Yossi},
  journal={arXiv preprint arXiv:2512.14982},
  year={2024}
}
```

## Implementation Notes

### Query Templates

**Baseline:**
```
<QUERY>
```

**Prompt Repetition:**
```
<QUERY>
<QUERY>
```

**Prompt Repetition (Verbose):**
```
<QUERY>
Let me repeat that:
<QUERY>
```

**Prompt Repetition ×3:**
```
<QUERY>
Let me repeat that:
<QUERY>
Let me repeat that one more time:
<QUERY>
```

### Measurement Methodology

**Statistical testing:** McNemar test with p-value < 0.1 for statistical significance

**Metrics:**
- Accuracy on benchmarks
- Average response length
- Median response length
- Average latency (end-to-end via API)

**Fairness:** All requests to same provider in round-robin fashion to account for network delays and transient loads.

## Key Takeaways

1. **Simple technique, strong results:** Literal copy-paste improves 47/70 tests
2. **No downside:** Never performs worse than baseline
3. **Efficient:** No latency penalty in most cases
4. **Practical:** Drop-in compatible with existing systems
5. **Research-backed:** Tested across major models and benchmarks
6. **Safe with reasoning:** Neutral to slightly positive even when not optimal

This paper provides strong evidence that prompt repetition should be considered as a default optimization for non-reasoning tasks across all major LLM providers.
