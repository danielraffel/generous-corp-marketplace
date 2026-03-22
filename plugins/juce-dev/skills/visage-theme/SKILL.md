---
name: visage-theme
description: Knowledge for designing and applying Visage theme tokens and JUCE LookAndFeel colors. Use when the user asks about colors, theming, palettes, styling, branding, dark mode, light mode, ARGB hex format, color schemes, or the theme-designer tool. Covers the JSON theme schema, C++ codegen, Palette API, OverrideId scoping, and the design workflow.
version: 1.0.0
---

# Visage Theme System

## Theme Designer Workflow

1. Open `Tools/theme-designer.html` in a browser (works via `file://`, no server needed)
2. Edit colors visually or describe what you want to Claude
3. Claude updates the `<script id="theme-data">` JSON block in the HTML
4. Refresh browser to see changes instantly
5. When happy, export C++: `python3 scripts/generate_theme.py Tools/themes/my-theme.json --mode both --output Source/Theme`
6. Include `Source/Theme.h` and call `initThemePalette(palette)` at plugin startup

## JSON Theme Schema

The theme JSON has these sections:

- `colors` — Standard Visage widget tokens (Button, Toggle, TextEditor, PopupMenu, ScrollBar)
- `values` — Visage value tokens (rounding, margins, sizes) as floats with min/max hints
- `custom` — Project-specific tokens (knobs, meters, waveform, panels, cards, accents, etc.)
- `juce` — JUCE LookAndFeel ColourId mappings keyed as `"ClassName::colourIdName"`
- `meta` — Theme name, version, base (for inheritance)
- `overrides` — Per-OverrideId Visage color overrides (advanced)

Color format: `"value": "#RRGGBB"` (web-standard hex) + `"alpha": 0.0-1.0` (separate float).
The codegen converts to Visage `0xAARRGGBB` format automatically.

## ARGB Color Format

Visage uses `0xAARRGGBB` — alpha in the most-significant byte. This differs from CSS rgba.

```cpp
0xFFFF0000  // Fully opaque red
0x800000FF  // 50% transparent blue
0x00000000  // Fully transparent
```

Conversion: `alpha_byte = round(alpha_0_to_1 * 255)`, shifted left 24 bits.

## C++ Codegen

```bash
# Visage header (VISAGE_THEME_COLOR / VISAGE_THEME_VALUE macros)
python3 scripts/generate_theme.py theme.json --output Source/Theme.h

# JUCE LookAndFeel class
python3 scripts/generate_theme.py theme.json --mode juce --output Source/ThemeLookAndFeel.h

# Both at once
python3 scripts/generate_theme.py theme.json --mode both --output Source/Theme

# Validate only
python3 scripts/generate_theme.py theme.json --validate-only
```

## Palette API

```cpp
visage::Palette palette;
palette.initWithDefaults();  // Load all registered token defaults

// Apply theme colors
palette.setColor(theme::KnobArc, visage::Color(0xFF00FFD4));

// Apply theme values
palette.setValue(theme::TextEditorRounding, 6.0f);

// Propagate to frame tree
rootFrame->setPalette(&palette);
```

## OverrideId Scoping

For per-component theme regions (e.g., a dark header in a light app):

```cpp
VISAGE_THEME_PALETTE_OVERRIDE(HeaderRegion);

// Set override colors
palette.setColor(HeaderRegion, theme::PanelBackground, visage::Color(0xFF1A1A2E));

// Apply to a frame subtree
headerFrame->setPaletteOverride(HeaderRegion, true);
```

## JUCE LookAndFeel Integration

The codegen produces a LookAndFeel_V4 subclass with all ColourIds set:

```cpp
#include "ThemeLookAndFeel.h"

// In editor constructor:
static DefaultDarkLookAndFeel themeLAF;
setLookAndFeel(&themeLAF);
```

## Common Mistakes

- Using CSS `#RRGGBBAA` order — Visage is `0xAARRGGBB` (alpha FIRST)
- Forgetting `palette.initWithDefaults()` before applying custom colors
- Not calling `setPalette()` after modifying the palette
- Editing the generated C++ header directly — always regenerate from JSON

## Reference Files

| File | Purpose |
|------|---------|
| `Tools/theme-designer.html` | Visual preview + editing tool |
| `Tools/themes/default.json` | Default theme with all tokens |
| `scripts/generate_theme.py` | JSON to C++ codegen |

See `references/token-catalog.md` for all known Visage tokens with defaults.
