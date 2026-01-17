---
description: "Generate high-resolution images for ideas or prototypes using DALL-E 3 or Gemini"
argument-hint: "[idea-id] [--provider=openai|gemini] [--quality=standard|hd]"
allowed-tools: ["AskUserQuestion", "Read", "Write", "Bash"]
---

# Design Partner Visualize Command

**For Claude:** Generate actual images using DALL-E 3 or Gemini Imagen based on design ideas.

## Process

### 1. Check API Key Availability

```bash
# Run detection script
node ${CLAUDE_PLUGIN_ROOT}/scripts/detect-api-keys.js
```

If no keys found, inform user:
```
No image generation providers configured.

To generate images, you'll need an API key from:
- OpenAI DALL-E 3: https://platform.openai.com/api-keys (~$0.04/image)
- Google Gemini: https://aistudio.google.com/app/apikey (~$0.02/image)

Run /dp:providers setup to configure.
```

### 2. Load Context

- Read `.claude/dp.local.md` to get:
  - Current idea (if `idea-id` provided, load that specific idea)
  - Design Brief (users, job, constraints)
  - Current budget and spend

### 3. Use AskUserQuestion (2 questions)

```json
{
  "questions": [
    {
      "question": "What type of image should I generate?",
      "header": "Image Type",
      "multiSelect": false,
      "options": [
        {
          "label": "UI Mockup",
          "description": "Realistic product screenshot or interface"
        },
        {
          "label": "Concept Illustration",
          "description": "Artistic representation of the idea"
        },
        {
          "label": "User Scenario",
          "description": "Person using the product in context"
        },
        {
          "label": "Marketing Visual",
          "description": "Hero image for landing page or presentation"
        }
      ]
    },
    {
      "question": "Which provider should I use?",
      "header": "Provider",
      "multiSelect": false,
      "options": [
        {
          "label": "DALL-E 3 (OpenAI) - $0.04",
          "description": "Best quality, photorealistic (Recommended)"
        },
        {
          "label": "Gemini Imagen - $0.02",
          "description": "Good quality, budget-friendly"
        },
        {
          "label": "Use my default",
          "description": "Auto-select based on your settings"
        }
      ]
    }
  ]
}
```

### 4. Build Enhanced Prompt

Based on image type and Design Brief context:

```javascript
// Example prompt building
const prompt = buildPrompt({
  ideaTitle: "Gamified Focus Timer",
  ideaDescription: "Pomodoro timer with streaks and rewards",
  imageType: "UI Mockup",
  designBrief: {
    users: "College students",
    job: "Stay focused while studying",
    constraints: ["Mobile-first", "Works offline"]
  }
});

// Result:
// "A clean, modern mobile app interface for a focus timer designed for
//  college students. The screen shows a minimalist timer counting down
//  from 25 minutes with a large Pause button. Top of screen shows a
//  streak indicator '🔥 4 days'. Color scheme is calming blues and
//  whites. The phone is in a study environment with a notebook visible.
//  Natural lighting, iOS design patterns, high fidelity, photorealistic
//  product photography."
```

### 5. Check Budget

```javascript
const estimatedCost = provider === 'openai' ? 0.04 : 0.02;
const currentSpend = state.image_generation.current_daily_spend;
const dailyBudget = state.image_generation.daily_budget_usd;

if (currentSpend + estimatedCost > dailyBudget) {
  // Warn user
  return "This would exceed your daily budget ($5.00). Continue anyway?";
}
```

### 6. Generate Image

```bash
# Call image generator
node ${CLAUDE_PLUGIN_ROOT}/scripts/image-generator.js \
  "${enhancedPrompt}" \
  "${provider}"
```

### 7. Download and Save

```bash
# Create unique filename
img_id="img-$(date +%s)"
filename="${img_id}-${idea_name}.png"

# Download (DALL-E) or save base64 (Gemini)
curl -o "${CLAUDE_PLUGIN_ROOT}/artifacts/images/${filename}" "${imageUrl}"
```

### 8. Update State

Add to `.claude/dp.local.md`:

```yaml
generated_images:
  - id: "img-001"
    idea_id: "idea-001"
    prompt: "Original prompt text"
    revised_prompt: "DALL-E revised version"
    provider: "openai"
    size: "1024x1024"
    quality: "standard"
    file_path: "artifacts/images/img-001-gamified-timer.png"
    url: "https://..."
    cost_usd: 0.04
    generated_at: "2026-01-16T14:35:00Z"
    metadata:
      generation_time_sec: 12.3
      image_type: "UI Mockup"

# Update spend
image_generation:
  current_daily_spend: 0.04
  providers:
    openai:
      total_images: 1
      total_cost_usd: 0.04
      last_used: "2026-01-16T14:35:00Z"
```

### 9. Display Result

```
Image generated successfully!

Details:
- Provider: DALL-E 3 (OpenAI)
- Cost: $0.04
- Time: 12.3 seconds
- Size: 1024x1024

Saved to: artifacts/images/img-001-gamified-timer.png

Today's spend: $0.04 / $5.00 budget

DALL-E revised your prompt to:
"A clean, modern mobile app interface..."

Actions:
- /dp:refine img-001 - Create variations
- /dp:visualize - Generate another style
```

## Error Handling

### No API Keys
```
No image generation providers configured.
Run /dp:providers setup to get started.
```

### Rate Limit (429)
```
Rate limit exceeded.
Options:
A) Wait 45 seconds and retry
B) Switch to Gemini
C) Cancel
```

### Content Policy Violation
```
Prompt violated content policy.
Let me try rephrasing it more neutrally...
```

### Provider Failure with Fallback
```
DALL-E 3 failed. Switching to Gemini...
[Retries with fallback provider]
```

## Usage Examples

```bash
# Generate for current idea with default provider
/dp:visualize

# Generate for specific idea
/dp:visualize idea-002

# Force specific provider
/dp:visualize --provider=gemini

# HD quality (DALL-E only, $0.08)
/dp:visualize --quality=hd
```
