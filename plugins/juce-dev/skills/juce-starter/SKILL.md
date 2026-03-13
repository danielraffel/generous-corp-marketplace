---
name: JUCE Plugin Starter
description: This skill should be used when the user asks about "JUCE-Plugin-Starter", "starter template", "init plugin project", "plugin template", "juce project setup", ".env configuration", "plugin codes", "bundle ID", "generate_and_open_xcode", mentions placeholder replacement, discusses creating new JUCE plugin projects from a template, or asks about VST3 MIDI generator configuration, cross-DAW MIDI effect setup, IS_SYNTH/IS_MIDI_EFFECT settings, or Ableton Live VST3 MIDI routing. Provides knowledge about the JUCE-Plugin-Starter template conventions, build system, configuration, and VST3 MIDI generator patterns.
version: 1.0.0
---

# JUCE-Plugin-Starter Template Reference

## Overview

JUCE-Plugin-Starter is a cross-platform template for creating audio plugin projects (AU, AUv3, VST3, CLAP, Standalone). It provides a CMake-based build system, automatic versioning, code signing, and optional Visage GPU UI integration.

**Supported platforms:**
- **macOS**: AU, AUv3, VST3, CLAP, Standalone (Xcode or Ninja)
- **Windows**: VST3, CLAP, Standalone (MSVC + Ninja)
- **Linux**: VST3, CLAP, Standalone (Clang + Ninja)

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
│   ├── build.sh                 # Command-line build (au/auv3/vst3/clap/standalone)
│   ├── setup_visage.sh          # Clone Visage + apply patches
│   ├── post_build.sh            # Info.plist version updates
│   ├── sign_and_package_plugin.sh  # Code signing + notarization
│   └── patches/visage/          # Visage patch files
├── tests/
│   ├── Catch2Main.cpp           # Custom main with JUCE MessageManager init
│   ├── PluginBasics.cpp         # Example plugin tests
│   └── helpers/test_helpers.h   # Helper for editor-context testing
├── CMakeLists.txt               # Build configuration
├── .clang-format                # JUCE-style code formatting (Allman, 4-space, C++17)
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
| `BUILD_FORMATS` | `"AU AUv3 VST3 CLAP Standalone"` | Plugin formats to build (macOS); `"VST3 CLAP Standalone"` on Windows/Linux |
| `DEFAULT_CONFIG` | `Debug` | Build configuration |
| `COPY_AFTER_BUILD` | `TRUE` | Auto-install plugins to system folders |
| `JUCE_REPO` | GitHub JUCE URL | JUCE source repository |
| `JUCE_TAG` | `8.0.12` | JUCE version tag (checked against latest GitHub release during project creation) |

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

# CLAP format support via clap-juce-extensions
FetchContent_Declare(clap-juce-extensions
    GIT_REPOSITORY https://github.com/free-audio/clap-juce-extensions.git
    GIT_TAG main
    GIT_SHALLOW ON
)
FetchContent_MakeAvailable(JUCE clap-juce-extensions)
```

### Build Commands

**macOS:**
```bash
# Generate Xcode project and build
./scripts/generate_and_open_xcode.sh

# Command-line builds (no Xcode)
./scripts/build.sh au debug
./scripts/build.sh vst3 release
./scripts/build.sh clap release
./scripts/build.sh standalone debug
./scripts/build.sh all release

# Package for distribution (signs + notarizes)
./scripts/sign_and_package_plugin.sh
```

**Linux:**
```bash
# Requires: Clang (or GCC), CMake, Ninja, JUCE apt dependencies
# Install deps: sudo apt install cmake ninja-build clang libasound2-dev libx11-dev libxinerama-dev libxext-dev libxrandr-dev libxcursor-dev libfreetype6-dev libwebkit2gtk-4.1-dev libglu1-mesa-dev libcurl4-openssl-dev pkg-config

./scripts/build.sh                   # Build all formats (VST3, CLAP, Standalone)
./scripts/build.sh vst3              # Build VST3 only
./scripts/build.sh standalone        # Build Standalone only
./scripts/build.sh all test          # Build and run Catch2 + PluginVal tests
./scripts/build.sh all unsigned      # Build and create tar.gz package
```

**Windows (PowerShell):**
```powershell
# Requires: MSVC (VS2022), CMake, Ninja in PATH
# Load VS dev environment first:
# Import-Module "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\Microsoft.VisualStudio.DevShell.dll"
# Enter-VsDevShell -VsInstallPath "C:\Program Files\Microsoft Visual Studio\2022\Community" -SkipAutomaticLocation

.\scripts\build.ps1                  # Build all formats (VST3, CLAP, Standalone)
.\scripts\build.ps1 vst3             # Build VST3 only
.\scripts\build.ps1 standalone       # Build Standalone only
.\scripts\build.ps1 all test         # Build and run tests
.\scripts\build.ps1 all publish      # Build and create Inno Setup installer
```

### Testing

Unit tests use Catch2 v3, fetched via FetchContent. PluginVal validates AU/VST3 plugins.

```bash
# Run all tests (Catch2 + PluginVal)
./scripts/build.sh all test

# Tests are in tests/ directory
tests/
  Catch2Main.cpp          # Custom main with JUCE MessageManager init
  PluginBasics.cpp        # Example plugin tests
  helpers/test_helpers.h  # Helper for editor-context testing
```

### CMake Configuration

- C++ standard: C++17
- **macOS**: Minimum macOS 15.0, Xcode or Ninja generator, AU+AUv3+VST3+CLAP+Standalone formats
- **Windows**: MSVC + Ninja generator, VST3+CLAP+Standalone formats (AU/AUv3 excluded automatically)
- **Linux**: Clang + Ninja generator, VST3+CLAP+Standalone formats (AU/AUv3 excluded automatically)
- AU version integer: `(major << 16) | (minor << 8) | patch`
- Post-build scripts update Info.plist for AU and VST3 targets (macOS only)
- VST3 helper tool code signing is disabled to avoid build errors (macOS only)
- Catch2 v3 for unit testing (Tests target)
- JUCE cache shared at `~/.juce_cache/` (uses `USERPROFILE` on Windows, `HOME` on macOS)
- Platform-conditional: `if(APPLE)` for macOS, `elseif(MSVC)` for Windows, `elseif(UNIX AND NOT APPLE)` for Linux

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
- Formats: AU (v2), AUv3, VST3, CLAP, Standalone

## Post-Build Info.plist Versioning

The `post_build.sh` script updates Info.plist entries after each build:
- `CFBundleShortVersionString` — semantic version (e.g., "1.2.3")
- `CFBundleVersion` — build number
- AU-specific version integer for DAW compatibility
