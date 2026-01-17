---
description: |
  Use this skill when users ask about design thinking basics, ideation techniques,
  or the Design Partner process. Trigger phrases: "what is design thinking", "how does
  this work", "what's the process", "how do I generate ideas", "what are best practices".
---

# Design Thinking Fundamentals

**For Claude:** This skill provides foundational design thinking knowledge to help users understand the Design Partner workflow and methodology.

## Core Design Thinking Process

Design Partner follows a structured 5-phase approach:

### 1. Context Capture
- **Goal:** Gather essential problem context
- **Questions:** Who is this for? What job needs to be done? What constraints matter?
- **Output:** Design Brief with problem, users, constraints, and success criteria

### 2. Divergent Exploration
- **Goal:** Generate multiple solution directions
- **Approach:** Explore different assumptions, perspectives, and approaches
- **Output:** 5+ idea cards with diverse core assumptions

### 3. Convergent Selection
- **Goal:** Choose the most promising direction(s)
- **Approach:** Evaluate ideas based on feasibility, desirability, and viability
- **Output:** Selected idea(s) for deeper exploration

### 4. Visualization & Prototyping
- **Goal:** Create concrete artifacts to explore the idea
- **Approach:** Generate UI mockups, concept art, user scenarios
- **Output:** High-resolution images via DALL-E 3 or Gemini Imagen

### 5. Critique & Iteration
- **Goal:** Identify risks and refine the approach
- **Approach:** Systematic risk analysis and rapid iteration
- **Output:** Refined concept with addressed concerns

## Ideation Techniques

### Divergent Thinking (Broadening)
- Reframe the problem from different perspectives
- Challenge core assumptions
- Explore extreme constraints or inversions
- Consider different user types or contexts

### Convergent Thinking (Narrowing)
- Evaluate based on impact and feasibility
- Force-rank options
- Identify must-have vs nice-to-have features
- Select direction based on success criteria

## Visual Exploration

### Natural Language
Simply say "show me what this looks like" and Design Partner will:
1. Extract context from your conversation
2. Build an enhanced prompt from your Design Brief
3. Generate a high-resolution image
4. Link it to your design session

### Image Types Available
- **UI Mockups:** Product screenshots for app interfaces
- **Concept Art:** Artistic representations of ideas
- **User Scenarios:** People using the product in context
- **Marketing Visuals:** Hero images for landing pages

### Cost-Conscious Design
- DALL-E 3: $0.04/image (standard), $0.08/image (HD) - Best quality
- Gemini Imagen: $0.02/image - Budget-friendly, good quality
- Daily budget controls prevent overspending
- Provider fallback ensures continuous workflow

## When to Use Design Partner

### ✅ Great For
- Early-stage product ideation
- Exploring multiple directions quickly
- Generating visuals for presentations
- Rapid prototyping and validation
- Team brainstorming sessions
- Design critiques

### ⚠️ Less Ideal For
- Final production design
- Technical implementation details
- Market research and data analysis
- Detailed project management

## Best Practices

### 1. Start Broad, Then Narrow
Generate multiple ideas before selecting one. Diverge first, converge later.

### 2. Use Natural Language
No need to memorize commands. Say what you want:
- "Can we see what this looks like?"
- "Show me a few different styles"
- "Make it more minimal"

### 3. Iterate Rapidly
Generate variations to explore options:
- Different color schemes
- Alternative layouts
- Various styles (minimal, playful, professional)

### 4. Track Decisions
All choices are automatically logged in `.claude/dp.local.md` so you can:
- Review your decision trail
- Understand rationale for choices
- Resume sessions later
- Export complete design documentation

### 5. Stay Within Budget
- Set daily budget in `.env` file
- Use Gemini for iterations (cheaper)
- Use DALL-E for final visuals (better quality)
- Monitor costs with `/dp:cost`

## Design Partner Philosophy

**Collaboration over Automation**
Design Partner is a thinking partner, not an automated solution generator. It helps you explore, not replace your judgment.

**Diverge then Converge**
Generate many options before selecting one. Breadth before depth.

**Visual over Abstract**
"Show, don't tell" - create concrete visuals to evaluate ideas.

**Iteration over Perfection**
Rapid cycles of generation and feedback beat lengthy planning.

**Cost-Conscious Creativity**
Budget controls enable exploration without anxiety.

## Commands Quick Reference

| Command | Purpose |
|---------|---------|
| `/dp:start` | Begin new design session |
| `/dp:visualize` | Generate images |
| `/dp:providers` | Manage API keys and providers |
| `/dp:cost` | View spending and usage |

## Getting Help

If stuck, try these phrases:
- "What should I do next?" - Get process guidance
- "How does this work?" - Explain current phase
- "What are my options?" - Show available actions
- "Can I see examples?" - Show visual examples

Design Partner will guide you through the process with clear questions and options.
