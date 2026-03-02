# Design Partner

AI-powered design thinking partner for Claude Code that helps explore ideas, generate visuals, and create prototypes through natural conversation.

## Overview

Design Partner brings structured design thinking methodology to your development workflow. Start with a problem, explore multiple perspectives, generate visual concepts, and iterate - all through natural language conversation with Claude.

### Key Features

- **Natural Language Visual Generation**: Just say "show me what this looks like" and get instant mockups
- **Prompt Copy Option**: Copy enhanced prompts to use for free in ChatGPT, Claude, or other AI tools
- **Interactive Gallery**: Beautiful web gallery with all generated images, metadata, and prompt copying
- **Configurable Output Paths**: Save images to Downloads (default), git repo, custom location, or plugin cache
- **Guided Design Thinking**: Structured sessions with state persistence across conversations
- **Autonomous Idea Generation**: AI agent generates 5 diverse idea directions from different perspectives
- **Multi-Provider Support**: Choose between DALL-E 3 (OpenAI) or Gemini Imagen (Google)
- **Cost Tracking**: Built-in budget limits and spending transparency
- **Session Persistence**: Resume design sessions exactly where you left off

## Prerequisites

- [Claude Code](https://claude.ai/code) installed
- API key for image generation:
  - **OpenAI API Key** for DALL-E 3, OR
  - **Google Cloud API Key** for Gemini Imagen

## Installation

### 1. Add the Marketplace

In Claude Code:
```
/plugin marketplace add danielraffel/generous-corp-marketplace
```

### 2. Install the Plugin

```
/plugin install design-partner@generous-corp-marketplace
```

### 3. Set Up API Keys

Choose one provider (or set up both and switch between them):

#### For DALL-E 3 (OpenAI)
```bash
export OPENAI_API_KEY="sk-..."
```

Get your API key from: https://platform.openai.com/api-keys

#### For Gemini Imagen (Google)
```bash
export GOOGLE_API_KEY="..."
```

Get your API key from: https://aistudio.google.com/app/apikey

### 4. Configure Your Provider

In Claude Code:
```
/dp:providers
```

Follow the prompts to:
- Select your preferred provider (OpenAI or Gemini)
- Configure where images are saved (Downloads, git repo, custom path)
- Set your daily budget limit (default: $5)

### 5. Restart Claude Code

Quit and reopen Claude Code to activate the plugin.

## Quick Start

### Start a Design Session

Begin a guided design thinking session:
```
/dp:start Build a habit tracking app for busy professionals
```

This creates a state file at `.claude/dp.local.md` and guides you through problem definition, constraints, and ideation.

### Natural Language Visual Generation

Just describe what you want to see - no commands needed:
```
Show me what a minimalist habit tracker would look like
```

The plugin automatically detects visual intent and generates images.

### Explicit Visual Generation

For full control:
```
/dp:visualize A mobile app interface with a clean habit list,
daily streak counter, and celebratory animations.
Modern design with soft colors.
```

The plugin will:
1. Show you the enhanced prompt
2. Offer to copy it (for free use in ChatGPT, etc.) or generate ($0.04)
3. Generate and open the image automatically
4. Open an interactive gallery in your browser with all images

### Refine Generated Visuals

Iterate on the last generated image:
```
/dp:refine Make it darker with more spacing between items
```

### Generate Idea Alternatives

When you're stuck or want more options:
```
/dp:ideas
```

The autonomous idea-generator agent creates 5 diverse approaches with different core assumptions.

### View Session Brief

Get a summary of your current design session:
```
/dp:brief
```

### Check Costs

View your spending and remaining budget:
```
/dp:cost
```

## Command Reference

| Command | Description |
|---------|-------------|
| `/dp:start [challenge]` | Start a new design thinking session with guided workflow |
| `/dp:visualize [description]` | Generate an image or copy prompt for free use elsewhere |
| `/dp:refine [changes]` | Refine the last generated image with specific changes |
| `/dp:ideas` | Generate 5 diverse idea directions (uses idea-generator agent) |
| `/dp:brief` | Show summary of current design session |
| `/dp:providers` | Configure provider, output path, and settings |
| `/dp:providers configure-output` | Change where images are saved |
| `/dp:cost` | View current spending and budget limits |
| `/dp:mode [explore\|define\|prototype]` | Switch between design thinking phases |

## Cost Information

### Pricing Comparison

| Provider | Model | Quality | Cost per Image | Images per $5 |
|----------|-------|---------|----------------|---------------|
| OpenAI | DALL-E 3 | Standard (1024x1024) | $0.040 | 125 |
| OpenAI | DALL-E 3 | HD (1024x1024) | $0.080 | 62 |
| Google | Gemini Imagen 3 | Standard (1024x1024) | $0.040 | 125 |

### Budget Controls

- Default daily limit: **$5.00** (configurable)
- Spending tracked in real-time
- Budget resets daily at midnight UTC
- Generation blocked when limit reached
- View current spend: `/dp:cost`

### Provider Recommendations

**DALL-E 3 (OpenAI)**:
- Better at UI/UX mockups and product concepts
- More artistic interpretation
- HD quality option available
- Stronger understanding of complex descriptions

**Gemini Imagen (Google)**:
- Faster generation times
- Excellent for photorealistic images
- Strong performance on natural scenes
- Great for quick iterations

## Natural Language Examples

Design Partner detects visual intent in your messages automatically:

```
Show me what this looks like as a mobile app
↓
Generates mobile mockup

Make it more minimal with better spacing
↓
Refines previous image

What would a dark mode version look like?
↓
Creates dark mode variant

I want to see different color schemes
↓
Generates palette variations
```

### Detected Phrases

The plugin automatically triggers visual generation when you use:
- "show me what this looks like"
- "visualize this"
- "generate an image"
- "create a mockup"
- "what would this look like"
- "I want to see"
- "can you show me"

## File Structure

Generated images are saved to a configurable location (default: Downloads folder):

```
# Default: Downloads folder
~/Downloads/design-partner-[session-id]/
  images/                  # Generated visuals
    img-001-concept.png
    img-002-mockup.png
  gallery.html            # Interactive gallery viewer

# If git repo option selected:
your-project/
  .claude/
    design-partner/
      artifacts/
        images/            # Generated visuals
        gallery.html      # Interactive gallery viewer
    dp.local.md           # Session state (auto-managed)
```

Configure output location with `/dp:providers configure-output`

### Session State File

The `.claude/dp.local.md` file tracks:
- Current design challenge
- Constraints and requirements
- Ideas explored
- Generated artifacts (paths and descriptions)
- Cost tracking (daily spend)
- Output path configuration
- Session ID and preferences

**This file is auto-managed** - you don't need to edit it manually.

### Gallery Viewer

After generating images, an HTML gallery opens automatically showing:
- All generated images with thumbnails
- Image metadata (provider, cost, size, quality)
- Full prompts used for generation
- "Copy Prompt" buttons for reuse
- "Show in Finder" to locate files
- Total cost and session statistics

## Agents

### Idea Generator (`/dp:ideas`)

Autonomous agent that generates 5 diverse idea directions:
- Uses **Haiku model** for fast generation
- Each idea explores different core assumptions
- Includes risk assessment and differentiation
- Presents interactive selection menu

**When it's invoked:**
- You explicitly call `/dp:ideas`
- You ask "what else?" or "give me more options"
- You're stuck during a design session
- After selecting an initial idea direction

### Design Critic (coming soon)

Evaluates designs against usability heuristics and best practices.

### Synthesis Agent (coming soon)

Combines multiple ideas into cohesive concepts.

## Hooks

Design Partner uses three automatic hooks:

### 1. Session Resume (SessionStart)
- Detects existing `.claude/dp.local.md` on startup
- Offers to resume previous design session
- Loads context and artifacts automatically

### 2. Visual Intent Detection (UserPromptSubmit)
- Monitors messages for visual intent phrases
- Automatically triggers `/dp:visualize` when detected
- Offers prompt copy or generation options

### 3. Auto-Save Artifacts (PostToolUse)
- Tracks new files created in `artifacts/` directories
- Adds references to `.claude/dp.local.md`
- Records timestamps and descriptions

## Skills

### Design Fundamentals (`/design-fundamentals`)

Reference guide for design principles:
- Visual hierarchy
- Color theory
- Typography
- Layout and spacing
- Accessibility guidelines

Invoke with `/design-fundamentals` or naturally ask about design concepts.

## Configuration

Settings are stored in `.claude/dp.local.md` frontmatter:

```yaml
---
# Image generation
image_provider: openai           # openai or google
daily_budget: 5.00              # USD limit per day
current_spend: 0.00             # today's spend (auto-tracked)

# Output paths
output_path_preference: downloads # downloads, git-repo, plugin-cache, or custom path
session_id: a3f8c2              # unique session identifier
output_path: ~/Downloads/design-partner-a3f8c2/

# Session state
session_phase: explore          # explore|define|prototype
---
```

Configure with:
- `/dp:providers` - Change provider, budget
- `/dp:providers configure-output` - Change where images are saved

## Development & Contributing

### Plugin Structure

```
design-partner/
├── plugin.json              # Plugin manifest
├── commands/                # Slash commands
│   ├── start.md
│   ├── visualize.md
│   ├── refine.md
│   ├── ideas.md
│   ├── brief.md
│   ├── providers.md
│   ├── cost.md
│   └── mode.md
├── agents/                  # Autonomous agents
│   ├── idea-generator.md
│   ├── design-critic.md
│   ├── synthesis-agent.md
│   └── scope-validator.md
├── skills/                  # Reference guides
│   └── design-fundamentals.md
├── hooks/                   # Event automation
│   └── hooks.json
├── README.md               # This file
└── index.html             # Documentation site
```

### Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Troubleshooting

### "No image provider configured"

Run `/dp:providers` and follow setup:
1. Select provider (OpenAI or Gemini)
2. Verify API key is set in environment
3. Enable image generation

### "Daily budget limit reached"

Check spending:
```
/dp:cost
```

Options:
- Wait for daily reset (midnight UTC)
- Increase budget limit in `/dp:providers`
- Use a more cost-effective quality setting

### "Session state not found"

Start a new session:
```
/dp:start [your design challenge]
```

### Images not generating automatically

1. Check that image generation is enabled: `/dp:providers`
2. Verify API key is set correctly
3. Use explicit command: `/dp:visualize [description]`

## FAQ

**Q: Can I use this without API keys?**
A: Yes! You can use the prompt copy feature to get enhanced prompts for free use in ChatGPT, Claude.ai, or other AI tools. API keys are only needed if you want to generate images directly within the plugin.

**Q: Which provider is better?**
A: DALL-E 3 excels at UI/UX mockups, Gemini is faster for iterations. Try both!

**Q: How do I switch providers?**
A: Run `/dp:providers` and select a different provider. Works instantly.

**Q: Where are generated images saved?**
A: By default, images are saved to `~/Downloads/design-partner-[session-id]/`. You can configure this with `/dp:providers configure-output` to use your git repo, a custom path, or the plugin cache.

**Q: Can I resume sessions after closing Claude Code?**
A: Yes! The SessionStart hook detects existing sessions and offers to resume automatically.

**Q: How accurate is cost tracking?**
A: Precise to the penny. Tracks every generation in real-time and enforces budget limits before API calls.

**Q: Can I copy prompts without generating images?**
A: Yes! When you run `/dp:visualize`, you'll see the enhanced prompt and can choose to copy it to your clipboard for free use in ChatGPT, Claude.ai, Midjourney, or any other AI tool.

**Q: How do I view all my generated images?**
A: An interactive HTML gallery opens automatically after each generation. It shows all images with metadata, costs, and prompts. You can also open it manually from your configured output folder (default: `~/Downloads/design-partner-[session-id]/gallery.html`).

## License

MIT License - see [LICENSE](LICENSE) for details.

## Feedback & Issues

- [Report a bug](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=design-partner-bug.yml)
- [Request a feature](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=design-partner-feature.yml)

## Links

- [GitHub Repository](https://github.com/danielraffel/generous-corp-marketplace/tree/master/plugins/design-partner)
- [Plugin Documentation](https://www.generouscorp.com/generous-corp-marketplace/plugins/design-partner/)
- [Claude Code Docs](https://code.claude.com/docs)

---

**Made with ❤️ by [Daniel Raffel](https://danielraffel.me)**
