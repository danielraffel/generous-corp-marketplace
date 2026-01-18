---
description: "View and configure image generation providers (DALL-E 3, Gemini)"
argument-hint: "[list|set-default|test|setup]"
allowed-tools: ["AskUserQuestion", "Read", "Edit", "Bash"]
---

# Design Partner Providers Command

**For Claude:** Manage image generation API providers and settings.

## Sub-commands

### 1. List Providers (default)

**Usage:** `/dp:providers` or `/dp:providers list`

**Process:**
1. Run detect-api-keys.js to check configuration
2. Read `.claude/dp.local.md` for usage stats
3. Display current status

**Output:**
```
Image Generation Providers

Configured:
OpenAI DALL-E 3
   - Status: Enabled
   - Cost: $0.04/image (standard), $0.08/image (HD)
   - Usage: 3 images, $0.12 total
   - Last used: Today 2:30 PM
   - Rate limit: 5/min

Google Gemini Imagen
   - Status: Not configured
   - Cost: $0.02/image
   - Setup: Run /dp:providers setup

Default: DALL-E 3
Fallback order: DALL-E 3 → Gemini

Budget:
   - Daily limit: $5.00
   - Today's spend: $0.12 (2%)
   - Remaining: $4.88
   - Resets: Tonight at midnight
```

### 2. Set Default Provider

**Usage:** `/dp:providers set-default`

**Process:**

Use AskUserQuestion:
```json
{
  "questions": [
    {
      "question": "Which provider should be your default?",
      "header": "Default Provider",
      "multiSelect": false,
      "options": [
        {
          "label": "OpenAI DALL-E 3",
          "description": "Higher quality, $0.04/image (standard)"
        },
        {
          "label": "Google Gemini",
          "description": "Budget-friendly, $0.02/image"
        },
        {
          "label": "Ask each time",
          "description": "Choose provider per generation"
        }
      ]
    },
    {
      "question": "Set fallback order?",
      "header": "Fallback",
      "multiSelect": false,
      "options": [
        {
          "label": "DALL-E → Gemini",
          "description": "Use Gemini if DALL-E fails"
        },
        {
          "label": "Gemini → DALL-E",
          "description": "Use DALL-E if Gemini fails"
        },
        {
          "label": "No fallback",
          "description": "Fail if default provider unavailable"
        }
      ]
    }
  ]
}
```

Update `.claude/dp.local.md`:
```yaml
image_generation:
  default_provider: "[selection]"
  fallback_order: ["[primary]", "[fallback]"]
```

**Output:**
```
Default provider updated to: DALL-E 3
Fallback order: DALL-E 3 → Gemini

Settings saved to .claude/dp.local.md
```

### 3. Test Providers

**Usage:** `/dp:providers test`

**Process:**

```bash
# Run test suite
node ${CLAUDE_PLUGIN_ROOT}/scripts/test-providers.js
```

**Output:**
```
Provider Test Results

OpenAI DALL-E 3:
Success
   - Response time: 11.2s
   - Cost: $0.04
   - Image saved to: artifacts/images/test-dalle.png

Google Gemini:
Failed
   - Error: API key not configured
   - Setup: /dp:providers setup

Summary:
   - Tests run: 2
   - Passed: 1
   - Failed: 1
```

### 4. Setup Wizard

**Usage:** `/dp:providers setup`

**Process:**

1. **Detect current configuration**
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/detect-api-keys.js
   ```

2. **Ask which provider(s) to configure**
   ```json
   {
     "question": "Which provider would you like to configure?",
     "header": "Setup",
     "multiSelect": true,
     "options": [
       {
         "label": "OpenAI DALL-E 3",
         "description": "Best quality, $0.04/image - Get key at: https://platform.openai.com/api-keys"
       },
       {
         "label": "Google Gemini",
         "description": "Budget-friendly, $0.02/image - Get key at: https://aistudio.google.com/api-keys"
       }
     ]
   }
   ```

3. **For each selected provider:**

   **OpenAI Setup:**
   ```
   OpenAI DALL-E 3 Setup

   Get your API key:
   1. Visit: https://platform.openai.com/api-keys
   2. Sign in or create account
   3. Click "Create new secret key"
   4. Copy the key (starts with sk-proj-...)

   Paste your API key: [user input]

   Save to your shell profile (~/.zshrc or ~/.bashrc):
   export OPENAI_API_KEY="your-key-here"

   Then restart your terminal or run: source ~/.zshrc

   Testing connection...
   [Runs test generation]

   Success! DALL-E 3 is ready to use.
   ```

   **Gemini Setup:**
   ```
   Google Gemini Setup

   Get your credentials:
   1. Visit: https://aistudio.google.com/api-keys
   2. Click "Create API Key"
   3. Copy the API key (starts with AIza...)
   4. Note your Project ID shown on the same page

   Paste your API key: [user input]
   Paste your Project ID: [user input]

   Save to your shell profile (~/.zshrc or ~/.bashrc):
   export GEMINI_API_KEY="your-key-here"
   export GEMINI_PROJECT_ID="your-project-id"

   Then restart your terminal or run: source ~/.zshrc

   Testing connection...
   [Runs test generation]

   Success! Gemini is ready to use.
   ```

4. **Create or update .env file**
   ```bash
   # Check if .env exists in plugin root
   if [ ! -f .env ]; then
     cp .env.example .env
   fi

   # Append or update keys
   echo "OPENAI_API_KEY=${apiKey}" >> .env
   ```

5. **Security check**
   ```
   Checking .gitignore...

   WARNING: .env is not in .gitignore!

   This is a security risk. Your API keys could be committed to git.

   Should I add .env to .gitignore? (Recommended)
   ```

6. **Update state**
   ```yaml
   # In .claude/dp.local.md
   image_generation:
     enabled: true
     providers:
       openai:
         configured: true
         enabled: true
   ```

7. **Set default provider**
   ```json
   {
     "question": "Which should be your default?",
     "options": ["OpenAI", "Gemini", "Ask each time"]
   }
   ```

**Final Output:**
```
Setup complete!

Configured providers:
- OpenAI DALL-E 3: Ready
- Google Gemini: Ready

Default: DALL-E 3
Daily budget: $5.00

You're all set! Use /dp:visualize to generate images.
```

## Budget Management

Can also be used to adjust budget settings:

```json
{
  "question": "Adjust daily budget?",
  "header": "Budget",
  "options": [
    {"label": "$5.00 (default)", "description": "~125 standard images/day"},
    {"label": "$10.00", "description": "~250 standard images/day"},
    {"label": "$20.00", "description": "~500 standard images/day"},
    {"label": "No limit", "description": "Use with caution"},
    {"label": "Custom amount", "description": "Enter specific amount"}
  ]
}
```

## Output Path Configuration

**Usage:** `/dp:providers configure-output` or first-time setup prompt

**Process:**

1. **Detect current environment**
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/scripts/configure-output.js "${PWD}/.claude/dp.local.md" "${CLAUDE_PLUGIN_ROOT}"
   ```

2. **Show current configuration and options**
   ```
   Where should generated images be saved?

   Current: Downloads folder (default)
   Location: ~/Downloads/design-partner-a3f8c2/
   ```

3. **Use AskUserQuestion to configure**
   ```json
   {
     "questions": [
       {
         "question": "Where should generated images be saved?",
         "header": "Output Path",
         "multiSelect": false,
         "options": [
           {
             "label": "Downloads folder (Default)",
             "description": "Easy to find: ~/Downloads/design-partner-[session]/"
           },
           {
             "label": "Git repo (.claude/design-partner/)",
             "description": "Save in your project repo (gitignored automatically)"
           },
           {
             "label": "Custom path",
             "description": "Specify your own location"
           },
           {
             "label": "Plugin cache (hidden)",
             "description": "~/.claude/plugins/cache/... (harder to discover)"
           }
         ]
       }
     ]
   }
   ```

4. **If custom path selected, ask for path**
   ```
   Enter custom path (use ~ for home directory):
   Examples:
   - ~/Documents/design-partner
   - ~/Desktop/mockups
   - /Users/you/projects/designs
   ```

5. **Update .claude/dp.local.md**
   ```yaml
   output_path_preference: "git-repo" # or "downloads", "plugin-cache", or "/custom/path"
   session_id: "a3f8c2"
   output_path: "/Users/you/project/.claude/design-partner/artifacts"
   ```

6. **Create directories and show confirmation**
   ```
   Output path configured!

   Images will be saved to:
   /Users/you/Downloads/design-partner-a3f8c2/images/

   Gallery will be at:
   /Users/you/Downloads/design-partner-a3f8c2/gallery.html

   You can change this anytime with /dp:providers configure-output
   ```

## Example Usage

```bash
# List current providers
/dp:providers

# Setup new provider
/dp:providers setup

# Configure where images are saved
/dp:providers configure-output

# Test all configured providers
/dp:providers test

# Change default
/dp:providers set-default
```
