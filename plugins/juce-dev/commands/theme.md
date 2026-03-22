---
description: Design and apply a Visage color theme — preview in browser, edit with prompts, export C++
argument-hint: "[--open | --generate <theme.json> | --new <name>]"
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Visage Theme Designer

Interactive theme design session for Visage-powered JUCE plugins. Supports both Visage GPU tokens and JUCE LookAndFeel ColourIds.

## Arguments

- No arguments or `--open`: Open the theme designer in the browser
- `--generate <theme.json>`: Generate C++ headers from a theme JSON file
- `--new <name>`: Create a new theme JSON based on the default

## Implementation

### Step 0: Verify Environment

1. Check the project has Visage theme designer files:
   - `Tools/theme-designer.html` — the visual preview tool
   - `Tools/themes/default.json` — the default theme
   - `scripts/generate_theme.py` — the C++ codegen script

2. If any are missing, tell the user:
   ```
   Theme designer files not found. These ship with the JUCE-Plugin-Starter template.
   Copy them from the template or run: git checkout main -- Tools/theme-designer.html Tools/themes/ scripts/generate_theme.py
   ```

### Step 1: Handle Arguments

**If `--open` or no arguments:**

1. Open the theme designer in the default browser:
   ```bash
   open Tools/theme-designer.html  # macOS
   ```

2. Ask the user:
   ```
   question: "The theme designer is open in your browser. What would you like to do?"
   header: "Theme Design Session"
   options:
     - label: "Describe a look (Recommended)"
       description: "Tell me what you want — 'warm retro synth with orange accents' — and I'll generate a theme"
     - label: "Tweak the current theme"
       description: "Tell me what to change — 'darker background, brighter knobs'"
     - label: "Generate C++ from current theme"
       description: "Export the embedded theme JSON to a C++ header for your plugin"
     - label: "Done"
       description: "Exit the theme design session"
   ```

3. **If "Describe a look":**
   - Ask the user to describe their desired aesthetic
   - Read `Tools/theme-designer.html`, find the `<script id="theme-data">` block
   - Generate a new theme JSON matching the description, using the default.json structure as reference
   - Replace the theme-data script block content with the new JSON
   - Tell the user to refresh their browser (Cmd+R)
   - Return to Step 1 to ask what's next

4. **If "Tweak the current theme":**
   - Ask what to change
   - Read the current theme-data from the HTML
   - Modify the specific tokens mentioned
   - Write back to the HTML
   - Tell the user to refresh
   - Return to Step 1

5. **If "Generate C++":**
   - Extract the theme JSON from the HTML's `<script id="theme-data">` block
   - Save it to `Tools/themes/current.json`
   - Run: `python3 scripts/generate_theme.py Tools/themes/current.json --mode both --output Source/Theme`
   - This produces `Source/Theme.h` (Visage) and `Source/ThemeLookAndFeel.h` (JUCE)
   - Check if the headers are already included in PluginEditor.cpp/h
   - If not, tell the user where to add the includes and palette init call
   - Suggest building: `SKIP_CMAKE_REGEN=1 SKIP_VERSION_BUMP=1 ./scripts/generate_and_open_xcode.sh && ./scripts/build.sh standalone`

**If `--generate <theme.json>`:**

1. Verify the file exists and is valid JSON
2. Run: `python3 scripts/generate_theme.py <theme.json> --mode both --output Source/Theme`
3. Report what was generated

**If `--new <name>`:**

1. Copy `Tools/themes/default.json` to `Tools/themes/<slugified-name>.json`
2. Update the meta.name field
3. Set `meta.base` to `"default"` (so it inherits)
4. Clear all color/value entries (inherits everything from default)
5. Open the theme designer: `open Tools/theme-designer.html`
6. Tell user to import the new JSON file using the Import button

### Step 2: Applying Theme to Plugin Code

When generating C++, show the user how to integrate:

**For Visage plugins:**
```cpp
// In PluginEditor.h
#include "Theme.h"

// In PluginEditor constructor, after palette.initWithDefaults():
initThemePalette(palette_);
```

**For JUCE-only plugins:**
```cpp
// In PluginEditor.h
#include "ThemeLookAndFeel.h"

// In PluginEditor constructor:
static DefaultDarkLookAndFeel themeLAF;
setLookAndFeel(&themeLAF);
```

### Step 3: Summary

After any operation, summarize:
- What theme is active
- How many tokens were modified
- What files were generated (if any)
- Next steps (refresh browser, rebuild plugin, etc.)
