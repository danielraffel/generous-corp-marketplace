# Design Partner - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install Dependencies
```bash
cd /Users/danielraffel/Code/generous-corp-marketplace/plugins/design-partner
npm install
```

### 2. Configure API Key
```bash
# Copy example file
cp .env.example .env

# Edit .env and add your OpenAI API key
# Get key at: https://platform.openai.com/api-keys
```

**Minimum .env configuration:**
```bash
OPENAI_API_KEY=sk-proj-your-actual-key-here
DEFAULT_IMAGE_PROVIDER=openai
DAILY_IMAGE_BUDGET_USD=5.00
```

### 3. Test Configuration
```bash
npm run detect-keys   # Should show "✅ OpenAI DALL-E 3: Configured"
npm test             # Should generate test image (costs $0.04)
```

### 4. Install in Claude Code
```bash
# In Claude Code terminal
/plugin marketplace add danielraffel/worktree-manager
/plugin install design-partner@generous-corp-marketplace

# Restart Claude Code
# (Quit and reopen)
```

---

## 🎯 First Session

### Natural Language (Easiest)

```
You: Let's design a focus timer app for students

Claude: [Starts session with 3 questions]
        • Who is this for?
        • What job needs doing?
        • What constraints matter?

You: [Click answers in visual UI]

Claude: [Generates 5 diverse ideas automatically]

You: I like the "Pomodoro with Streaks" idea.
     Can we see what this looks like?

        ↓ Auto-detects visual intent ↓

Claude: [Shows image type options]

You: [Selects "UI Mockup" + "DALL-E 3"]

Claude: 🎨 Generating...
        ✅ Image generated! (12s, $0.04)
        💾 Saved to: artifacts/images/img-001.png
        [Shows high-res mockup inline]

You: Make it more minimal

Claude: 🎨 Refining...
        ✅ Done! ($0.04)
        [Shows refined version]

Total time: ~3 minutes
Total cost: $0.08
```

### Command-Based

```bash
/dp:start focus-timer-app     # Start session

# [Answer context questions]

/dp:visualize                  # Generate image

# [Select image type and provider]

/dp:cost                       # Check spending
```

---

## 💡 Natural Language Phrases That Work

### Image Generation
- "Show me what this looks like"
- "Can we see what this looks like?"
- "Visualize this"
- "Generate an image"
- "Make a mockup"
- "What would this look like?"

### Image Refinement
- "Make it darker"
- "Try a blue color scheme"
- "Show me a minimal version"
- "Add more breathing space"
- "What if we made it more playful?"

### Multi-Image Generation
- "Show me a few different styles"
- "Generate some variations"
- "What could this look like?" (open-ended)
- "Let's see different options"

---

## 📊 Cost Control

### Check Spending
```bash
/dp:cost                       # Today's usage
/dp:cost week                  # This week
/dp:cost month                 # This month
```

### View Providers
```bash
/dp:providers list             # Show configured providers
/dp:providers test             # Test both providers
```

### Budget Settings
Edit `.env`:
```bash
DAILY_IMAGE_BUDGET_USD=5.00    # Soft limit (warns at 80%)
WARN_THRESHOLD_USD=0.50        # Confirm expensive images
```

---

## 🎨 Image Types

### UI Mockup
- Best for: Product screenshots, app interfaces
- Provider: DALL-E 3 (better for UI)
- Example: "Mobile app timer screen with pause button"

### Concept Art
- Best for: Artistic representations, illustrations
- Provider: Gemini (cheaper, good quality)
- Example: "Zen meditation space with soft lighting"

### User Scenario
- Best for: People using product in context
- Provider: DALL-E 3 (better with people)
- Example: "College student using focus app in library"

### Marketing Visual
- Best for: Hero images, landing pages
- Provider: DALL-E 3 (higher quality)
- Example: "Promotional image for productivity app"

---

## 💰 Cost Examples

**Exploration Session (5 images):**
- 3 variations with Gemini: $0.06
- 2 final mockups with DALL-E: $0.08
- **Total: $0.14**

**Complete Design Session (10 images):**
- 5 concept iterations (Gemini): $0.10
- 3 UI mockups (DALL-E std): $0.12
- 2 hero images (DALL-E HD): $0.16
- **Total: $0.38**

**Heavy Exploration (25 images):**
- 20 iterations (Gemini): $0.40
- 5 finals (DALL-E std): $0.20
- **Total: $0.60**

With $5/day budget = ~8-12 complete design sessions per day

---

## 🔥 Pro Tips

### 1. Use Gemini for Iterations
```
"Show me 3 different styles" → [Select Gemini]
"I like #2, refine it" → [Select Gemini]
"Perfect, now make final version" → [Select DALL-E]
```
**Saves:** $0.08 on iterations, spend on quality finals

### 2. Natural Language Saves Time
Instead of:
```
/dp:visualize
[Select UI Mockup]
[Select DALL-E]
```

Just say:
```
"Show me a UI mockup with DALL-E"
```

### 3. Context Matters
The more you describe, the better the image:
```
❌ "Show me what this looks like"
   → Generic result

✅ "Show me what this meditation app looks like
    with a calm, zen aesthetic and pastel colors"
   → Specific, on-brand result
```

### 4. Check State File
Your entire session is in `.claude/dp.local.md`:
```bash
cat .claude/dp.local.md   # View current state
```

Contains:
- Design Brief
- All ideas generated
- Images with metadata
- Decisions and rationale
- Cost tracking

### 5. Resume Sessions
Next time you run Claude Code in same project:
```
Claude: I see you were working on "Focus Timer App".
        Want to continue where you left off?

You: Yes

Claude: [Loads full context automatically]
```

---

## 🐛 Common Issues

### "API key not found"
```bash
# Check .env exists
ls -la .env

# Verify key detected
npm run detect-keys
```

### "Rate limit exceeded"
```bash
# DALL-E limit: 5 requests/minute
# Solution: Wait 60 seconds OR switch to Gemini
/dp:providers list
```

### "Budget exceeded"
```bash
# Check spending
/dp:cost

# Increase budget
# Edit .env: DAILY_IMAGE_BUDGET_USD=10.00

# Or override once
/dp:visualize --ignore-budget
```

### "Content policy violation"
```bash
# DALL-E blocked prompt
# Solution: Rephrase more neutrally or try Gemini
```

---

## 📚 Learn More

- **Full Docs:** Open `index.html` in browser
- **Command Reference:** See `README.md`
- **Architecture:** See `PLUGIN_SUMMARY.md`
- **Specifications:** `/Users/danielraffel/Code/Design Thinking Partner/explore-v3.md`

---

## 🎉 You're Ready!

**Start your first session:**
```
/dp:start my-first-idea
```

**Or try natural language:**
```
Let's design [your idea here]
```

**Generate your first image:**
```
Show me what this looks like
```

That's it! The plugin will guide you through the rest. 🚀

---

**Questions?** Check the FAQ in `index.html` or `README.md`

**Enjoying it?** Share your designs and help improve the plugin!
