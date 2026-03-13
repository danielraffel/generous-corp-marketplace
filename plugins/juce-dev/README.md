# juce-dev

**Create, build, and ship cross-platform JUCE audio plugin projects**

A Claude Code plugin for the full JUCE plugin development lifecycle — from project scaffolding to building, testing, signing, and publishing. Supports **macOS**, **Linux**, and **Windows**. Wraps the JUCE-Plugin-Starter template with smart CMake regeneration detection and platform-aware build scripts.

## Installation

### 1. Add the Marketplace (if not already added)

```bash
claude mcp add-registry generous-corp-marketplace ~/Code/generous-corp-marketplace
```

### 2. Install the Plugin

```bash
/plugin install juce-dev@generous-corp-marketplace
```

### 3. Restart Claude Code

Close and reopen Claude Code to load the plugin.

### 4. Verify

Type `/juce-dev:create` to confirm the command is available.

## Prerequisites

**macOS:**
- **Xcode** with command-line tools installed
- **CMake** (`brew install cmake`)
- **Ninja** (`brew install ninja`)
- **gh CLI** (`brew install gh`) — for GitHub repo creation

**Linux (Ubuntu/Debian):**
- **Clang** (or GCC), **CMake**, **Ninja** (`sudo apt install clang cmake ninja-build`)
- JUCE dependencies: `libasound2-dev libx11-dev libxinerama-dev libxext-dev libxrandr-dev libxcursor-dev libfreetype6-dev libwebkit2gtk-4.1-dev libglu1-mesa-dev libcurl4-openssl-dev pkg-config`

**Windows:**
- **Visual Studio 2022** (Community or Build Tools) with C++ workload
- **CMake** (`winget install Kitware.CMake`)
- **Ninja** (`winget install Ninja-build.Ninja`)
- **Git** (`winget install Git.Git`)

**All platforms:** JUCE-Plugin-Starter template cloned locally (or the command will clone it for you)

## Commands

### `/juce-dev:build [target...] [action] [--help]`

Build, test, sign, or publish your JUCE plugin. Automatically detects whether CMake regeneration is needed.

```
/juce-dev:build                    # Build all formats locally
/juce-dev:build standalone         # Build and launch standalone app
/juce-dev:build au vst3            # Build AU + VST3
/juce-dev:build all test           # Build all and run PluginVal tests
/juce-dev:build publish            # Full release to GitHub
/juce-dev:build pkg                # Signed installer, no GitHub release
/juce-dev:build unsigned           # Unsigned installer (fast testing)
/juce-dev:build uninstall          # Remove all installed plugins
/juce-dev:build --help             # Show full reference
```

| Targets | Actions | Options |
|---------|---------|---------|
| `all` `au` `auv3` `vst3` `clap` `standalone` | `local` `test` `sign` `notarize` `pkg` `publish` `unsigned` `uninstall` | `--regenerate-page` `--help` |

> **Windows/Linux:** Only `vst3`, `clap`, and `standalone` targets are available (AU/AUv3 are macOS-only). The command auto-detects the platform — uses `build.ps1` on Windows, `build.sh` on macOS and Linux. On Linux, packaging creates tar.gz instead of PKG/Inno Setup.

**Smart regeneration:** Checks if `CMakeLists.txt`, `.env`, or source files changed. If not, skips CMake regeneration for faster builds. Falls back to full regeneration if the build fails.

### `/juce-dev:create <plugin-name> [--visage] [--no-github]`

Create a new JUCE plugin project from the starter template.

```
/juce-dev:create "My Cool Synth"
/juce-dev:create "GPU Synth" --visage
/juce-dev:create "Local Plugin" --no-github
```

**What it does:**
1. Locates the JUCE-Plugin-Starter template
2. Loads developer settings from the template's `.env`
3. Asks for project configuration via clean UI prompts
4. Copies the template, replaces all placeholders
5. Optionally sets up Visage GPU UI, DiagnosticKit
6. Initializes git and optionally creates a GitHub repo
7. Gives you a ready-to-build project

### `/juce-dev:setup-visage`

Add Visage GPU UI to an existing JUCE-Plugin-Starter project.

```
cd my-plugin-project
/juce-dev:setup-visage
```

### `/juce-dev:setup-ios`

Add an iOS/iPadOS app target to an existing project. Auto-detects Visage and creates the appropriate app files.

```
cd my-plugin-project
/juce-dev:setup-ios
```

### `/juce-dev:port <platform>`

Port an existing JUCE plugin project between macOS and Windows.

```
/juce-dev:port windows          # Port macOS project to Windows
/juce-dev:port macos            # Port Windows project to macOS
```

**What it does:**
1. Auto-detects source platform (macOS-origin vs Windows-origin)
2. Scans for platform-specific code (Win32 APIs, COM, DirectX, Objective-C, etc.)
3. Reports findings by severity (HIGH, MEDIUM, LOW)
4. Generates platform-specific build scripts and CMake config
5. Creates VM build/test instructions for the target platform

### `/juce-dev:setup-updates`

Add Sparkle (macOS) and WinSparkle (Windows) auto-update support to an existing project. The updater UI lives in the Standalone app; the update payload is a full product installer (PKG on macOS, Inno Setup on Windows) that replaces all plugin formats.

```
cd my-plugin-project
/juce-dev:setup-updates         # Run setup wizard
/juce-dev:setup-updates --doctor  # Validate existing setup
```

**Features:**
- EdDSA-signed installers with appcast XML feed
- "Check for Updates" menu item in Standalone app
- Automatic background update checks
- `--doctor` flag to validate the full update chain (config, feed, artifacts)
- Private mode for commercial plugins (future phase, requires validation)

### `/juce-dev:status`

Show current project configuration, build targets, VMs, and plugin status.

### `/juce-dev:vm`

Manage test VMs for cross-platform builds.

## Integration with Other Plugins

- **juce-visage** skill: Available automatically for Visage UI development guidance
- **feature-dev**: Use `/feature-dev` after project creation to implement your first feature
- **worktree-manager**: Use `/worktree-manager:create` for parallel feature branches

## How It Works

The plugin replicates the `init_plugin_project.sh` workflow but with a better UX:

| Shell Script | juce-dev Plugin |
|---|---|
| 15+ sequential prompts | Grouped AskUserQuestion prompts |
| Terminal-only | Works in any Claude Code environment |
| Manual re-entry each time | Remembers developer settings from .env |
| No validation feedback | Shows derived values before proceeding |

All project creation steps (rsync, sed replacements, git init, gh repo create) run via Bash — no MCP server needed.

## Feedback & Issues

- JUCE Dev (Claude Code plugin)
  - [Report a bug](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-dev-bug.yml)
  - [Request a feature](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-dev-feature.yml)
- juce-visage (Codex skill)
  - [Report a bug](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-visage-codex-bug.yml)
  - [Request a feature](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-visage-codex-feature.yml)
