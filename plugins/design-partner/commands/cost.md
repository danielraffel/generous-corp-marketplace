---
description: "View image generation costs and usage statistics"
argument-hint: "[today|week|month|all]"
allowed-tools: ["Read"]
---

# Design Partner Cost Command

**For Claude:** Display cost tracking and usage statistics for image generation.

## Process

1. Read `.claude/dp.local.md` to get:
   - `image_generation.current_daily_spend`
   - `image_generation.daily_budget_usd`
   - `image_generation.providers` stats
   - `generated_images` array

2. Calculate statistics based on timeframe

3. Display formatted report

## Output Formats

### Today's Costs (default)

**Usage:** `/dp:cost` or `/dp:cost today`

```
Image Generation Costs - Today

Provider Breakdown:
- OpenAI DALL-E 3: $0.12 (3 images)
  └─ Standard: $0.12 (3 images)
  └─ HD: $0.00 (0 images)

- Gemini Imagen: $0.00 (0 images)

Total: $0.12 / $5.00 daily budget (2%)

Recent generations:
1. img-003 - Gamified Timer mockup - $0.04 - 2:35 PM
2. img-002 - AI Buddy concept art - $0.04 - 2:25 PM
3. img-001 - Study app hero image - $0.04 - 2:20 PM

Budget status: Well within limit
Estimated remaining: ~122 images at current rate
```

### Weekly View

**Usage:** `/dp:cost week`

```
Image Generation Costs - This Week

Daily breakdown:
Mon 1/13: $0.32 (8 images)
Tue 1/14: $0.28 (7 images)
Wed 1/15: $0.16 (4 images)
Thu 1/16: $0.12 (3 images) ← Today
Fri 1/17: $0.00
Sat 1/18: $0.00
Sun 1/19: $0.00

Week total: $0.88 (22 images)
Average per day: $0.22
Projected month: $6.60

Provider preference:
DALL-E 3: 95% (21 images)
Gemini: 5% (1 image)
```

### Monthly View

**Usage:** `/dp:cost month`

```
Image Generation Costs - January 2026

Week-by-week:
Week 1 (Jan 1-7):   $2.40 (60 images)
Week 2 (Jan 8-14):  $1.92 (48 images)
Week 3 (Jan 15-21): $0.88 (22 images) ← Current
Week 4 (Jan 22-28): $0.00
Week 5 (Jan 29-31): $0.00

Month total: $5.20 (130 images)
Average per day: $0.33
Days with generation: 16 days
Most active day: Jan 5 ($0.48, 12 images)

Cost distribution:
DALL-E Standard: $4.96 (124 images)
DALL-E HD: $0.16 (2 images)
Gemini: $0.08 (4 images)

Image types generated:
- UI Mockups: 78 (60%)
- Concept Art: 32 (25%)
- User Scenarios: 15 (12%)
- Marketing: 5 (3%)
```

### All-Time View

**Usage:** `/dp:cost all`

```
Image Generation Costs - All Time

Total spend: $47.60
Total images: 1,190
Average cost per image: $0.04

By provider:
DALL-E 3: $45.20 (1,130 images)
Gemini: $2.40 (60 images)

Most expensive day: Jan 5, 2026 ($0.48)
Most productive day: Jan 12, 2026 (15 images)

Cost over time:
Jan 2026: $5.20 (130 images)
Dec 2025: $8.40 (210 images)
Nov 2025: $12.80 (320 images)
Oct 2025: $21.20 (530 images)
```

## Budget Alerts

When displaying costs, also check for budget warnings:

```javascript
const spendPercentage = (currentSpend / dailyBudget) * 100;

if (spendPercentage >= 100) {
  console.log('⚠️  OVER BUDGET - Daily limit exceeded');
} else if (spendPercentage >= 80) {
  console.log('⚠️  Approaching daily budget (80%+)');
} else if (spendPercentage >= 50) {
  console.log('ℹ️  Half of daily budget used');
} else {
  console.log('✅ Well within budget');
}
```

## Cost Breakdown Details

If user asks for details on a specific image:

```
Image Details: img-003

File: artifacts/images/img-003-gamified-timer.png
Prompt: "A clean, modern mobile app interface..."
Provider: OpenAI DALL-E 3
Quality: Standard
Size: 1024x1024
Cost: $0.04
Generated: 2026-01-16 14:35:00
Generation time: 12.3 seconds

Linked to: idea-001 (Gamified Focus Timer)
Image type: UI Mockup

DALL-E revised prompt:
"A clean, modern mobile app interface for college students..."
```

## Export Cost Report

Can also generate a CSV export:

```bash
# If user requests export
/dp:cost export

# Generate CSV
Image ID,Date,Time,Provider,Quality,Size,Cost,Type,Idea
img-001,2026-01-16,14:20:00,openai,standard,1024x1024,0.04,UI Mockup,idea-001
img-002,2026-01-16,14:25:00,openai,standard,1024x1024,0.04,Concept Art,idea-002
img-003,2026-01-16,14:35:00,openai,standard,1024x1024,0.04,UI Mockup,idea-001

Exported to: cost-report-2026-01-16.csv
```

## Example Usage

```bash
# Today's costs
/dp:cost

# This week
/dp:cost week

# This month
/dp:cost month

# All time
/dp:cost all

# Export CSV
/dp:cost export
```
