---
name: JUCE Plugin Starter
description: This skill should be used when the user asks about "JUCE-Plugin-Starter", "starter template", "init plugin project", "plugin template", "juce project setup", ".env configuration", "plugin codes", "bundle ID", "generate_and_open_xcode", mentions placeholder replacement, or discusses creating new JUCE plugin projects from a template. Provides knowledge about the JUCE-Plugin-Starter template conventions, build system, and configuration.
version: 1.0.0
---

# JUCE-Plugin-Starter Template Reference

## Overview

JUCE-Plugin-Starter is a template for creating macOS audio plugin projects (AU, VST3, Standalone). It provides a CMake-based build system, automatic versioning, code signing, and optional Visage GPU UI integration.

## Template Structure

```
JUCE-Plugin-Starter/
├── Source/
│   ├── PluginProcessor.h/cpp    # Audio processing (CLASS_NAME_PLACEHOLDERAudioProcessor)
│   └── PluginEditor.h/cpp       # UI (CLASS_NAME_PLACEHOLDERAudioProcessorEditor)
├── templates/
│   └── visage/
│       ├── PluginEditor.h       # Visage-enabled editor template
│       └── PluginEditor.cpp     # Uses visage::ApplicationWindow + juce::Timer
├── scripts/
│   ├── init_plugin_project.sh   # Interactive project creation
│   ├── generate_and_open_xcode.sh  # CMake → Xcode build
│   ├── build.sh                 # Command-line build (au/vst3/standalone)
│   ├── setup_visage.sh          # Clone Visage + apply patches
│   ├── post_build.sh            # Info.plist version updates
│   ├── sign_and_package_plugin.sh  # Code signing + notarization
│   └── patches/visage/          # Visage patch files
├── CMakeLists.txt               # Build configuration
├── .env                         # Developer + project settings
└── .env.example                 # Settings reference with defaults
```

## Placeholder System

The template uses 9 placeholders that get replaced during project creation:

| Placeholder | Derived From | Example |
|---|---|---|
| `PLUGIN_NAME_PLACEHOLDER` | User input | "My Cool Synth" |
| `CLASS_NAME_PLACEHOLDER` | Plugin name, non-alphanumeric removed | "MyCoolSynth" |
| `PROJECT_FOLDER_PLACEHOLDER` | Plugin name, lowercased with hyphens | "my-cool-synth" |
| `BUNDLE_ID_PLACEHOLDER` | com.{namespace}.{project-folder} | "com.generouscorp.my-cool-synth" |
| `DEVELOPER_NAME_PLACEHOLDER` | User input | "Generous Corp" |
| `PLUGIN_MANUFACTURER_PLACEHOLDER` | Same as developer name | "Generous Corp" |
| `NAMESPACE_PLACEHOLDER` | Developer name, lowercase alphanumeric | "generouscorp" |
| `PLUGIN_CODE_PLACEHOLDER` | 4-letter code from plugin name | "MYCO" |
| `PLUGIN_MANUFACTURER_CODE_PLACEHOLDER` | 4-letter code from developer name | "GECO" |

Placeholders are replaced via `sed` across files matching: `*.cpp`, `*.h`, `*.cmake`, `*.txt`, `*.md`, `.env*`

## 4-Letter Code Generation

JUCE requires 4-letter codes for plugin and manufacturer identification. The algorithm:

1. Clean input: remove all non-alphanumeric characters (keep spaces)
2. If empty → `"XXXX"`
3. If 1-4 chars → uppercase, pad with `X`
4. If 5+ chars, multiple words → first 2 chars of word 1 + first 2 chars of word 2
5. If 5+ chars, single word → `char[0]` + `char[1]` + `char[len/2]` + `char[last]`
6. Always uppercase, exactly 4 characters

## .env Configuration

### Developer Settings (reusable across projects)

These are loaded from the template's `.env` when creating new projects:

| Variable | Placeholder Value | Purpose |
|---|---|---|
| `DEVELOPER_NAME` | `"Your Name"` | Developer/company name |
| `APPLE_ID` | `your.email@example.com` | Apple Developer account email |
| `TEAM_ID` | `YOURTEAMID` | Apple Developer Team ID |
| `APP_CERT` | Contains `"Your Name"` | Developer ID Application certificate |
| `INSTALLER_CERT` | Contains `"Your Name"` | Developer ID Installer certificate |
| `APP_SPECIFIC_PASSWORD` | `xxxx-xxxx-xxxx-xxxx` | Notarization password |
| `GITHUB_USER` | `yourusername` | GitHub username for repo creation |

### Project Settings (generated per project)

| Variable | Purpose |
|---|---|
| `PROJECT_NAME` | Internal name (no spaces) — same as CLASS_NAME |
| `PRODUCT_NAME` | Display name (can have spaces) |
| `PROJECT_BUNDLE_ID` | macOS bundle identifier |
| `PLUGIN_CODE` | 4-letter JUCE plugin code |
| `PLUGIN_MANUFACTURER_CODE` | 4-letter manufacturer code |
| `VERSION_MAJOR/MINOR/PATCH` | Semantic version components |
| `ENABLE_DIAGNOSTICS` | DiagnosticKit integration flag |
| `USE_VISAGE_UI` | Visage GPU UI flag (`TRUE`/`FALSE`) |

### Build Settings

| Variable | Default | Purpose |
|---|---|---|
| `BUILD_FORMATS` | `"VST3 AUV2 Standalone"` | Plugin formats to build |
| `DEFAULT_CONFIG` | `Debug` | Build configuration |
| `COPY_AFTER_BUILD` | `TRUE` | Auto-install plugins to system folders |
| `JUCE_REPO` | GitHub JUCE URL | JUCE source repository |
| `JUCE_TAG` | `8.0.10` | JUCE version tag |

## Build System

### JUCE FetchContent with Shared Cache

JUCE is fetched via CMake's FetchContent and cached at `~/.juce_cache/`. This shared cache avoids re-downloading JUCE for each project. No local JUCE installation is needed.

```cmake
set(FETCHCONTENT_BASE_DIR "$ENV{HOME}/.juce_cache")
FetchContent_Declare(JUCE
    GIT_REPOSITORY ${JUCE_REPO}
    GIT_TAG ${JUCE_TAG}
    GIT_SHALLOW ON
)
```

### Build Commands

```bash
# Generate Xcode project and build
./scripts/generate_and_open_xcode.sh

# Command-line builds (no Xcode)
./scripts/build.sh au debug
./scripts/build.sh vst3 release
./scripts/build.sh standalone debug
./scripts/build.sh all release

# Package for distribution (signs + notarizes)
./scripts/sign_and_package_plugin.sh
```

### CMake Configuration

- Minimum macOS: 15.0 (configurable via `OSX_DEPLOYMENT_TARGET`)
- C++ standard: C++17
- AU version integer: `(major << 16) | (minor << 8) | patch`
- Post-build scripts update Info.plist for AU and VST3 targets
- VST3 helper tool code signing is disabled to avoid build errors

### Visage Conditional Integration

In `CMakeLists.txt`, Visage is conditionally included:

```cmake
set(USE_VISAGE_UI $ENV{USE_VISAGE_UI})
if(USE_VISAGE_UI)
    add_subdirectory(external/visage)
    target_compile_definitions(${PROJECT_NAME} PRIVATE USE_VISAGE_UI=1)
    target_link_libraries(${PROJECT_NAME} PRIVATE visage)
endif()
```

## Visage Integration

### Setup Script

`scripts/setup_visage.sh` handles:
1. Cloning Visage from `https://github.com/VitalAudio/visage.git` into `external/visage/`
2. Applying patches from `scripts/patches/visage/`:
   - `01-performKeyEquivalent.patch` — keyboard shortcut handling in DAW hosts
   - `02-mtkview-60fps.patch` — Metal view FPS cap
   - `03-popup-overflow-position.patch` — popup menu positioning fix
   - `04-single-line-arrows.patch` — single-line text editor arrows
   - `05-setAlwaysOnTop-guard.patch` — always-on-top guard
   - `06-instance-counter-log.patch` — instance counting
   - `07-mtkview-null-check.patch` — null pointer safety

### Visage Editor Template

The Visage editor template (`templates/visage/PluginEditor.h`) differs from standard:
- Inherits from both `juce::AudioProcessorEditor` and `juce::Timer`
- Uses `visage::ApplicationWindow` for GPU-rendered UI
- Defers window creation via `timerCallback()` until after JUCE setup
- Includes `<visage/app.h>`

## Source Code Conventions

### Class Naming

- Processor: `{ClassName}AudioProcessor` (inherits `juce::AudioProcessor`)
- Editor: `{ClassName}AudioProcessorEditor` (inherits `juce::AudioProcessorEditor`)

### Standard Paths

The processor provides helper methods for macOS-recommended paths:
- `~/Library/Application Support/{ProjectName}/Samples/`
- `~/Library/Application Support/{ProjectName}/Presets/`
- `~/Library/Application Support/{ProjectName}/UserData/`
- `~/Library/Logs/{ProjectName}/`

### Audio Configuration

Default setup:
- Stereo I/O bus layout
- MIDI input enabled, MIDI output enabled
- Plugin type: MIDI processor (configurable via CMakeLists.txt)
- Formats: AU, VST3, Standalone

## Post-Build Info.plist Versioning

The `post_build.sh` script updates Info.plist entries after each build:
- `CFBundleShortVersionString` — semantic version (e.g., "1.2.3")
- `CFBundleVersion` — build number
- AU-specific version integer for DAW compatibility
