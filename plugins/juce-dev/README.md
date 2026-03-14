# juce-dev

**A Claude Code plugin for the full JUCE audio plugin lifecycle — create, build, test, sign, and ship cross-platform.**

Build audio plugins (synths, effects, MIDI processors, samplers) that output AU, VST3, CLAP, and Standalone formats from a single codebase. Supports macOS, Windows, and Linux. Handles project scaffolding, CMake builds, code signing, notarization, installer creation, GitHub Actions CI/CD, auto-updates, and publishing — so you can focus on the audio code.

Built on top of the [JUCE-Plugin-Starter](https://github.com/danielraffel/JUCE-Plugin-Starter) template.

## Installation

In Claude Code:

```
# 1. Add the marketplace
/plugin marketplace add danielraffel/generous-corp-marketplace

# 2. Install the plugin
/plugin install juce-dev@generous-corp-marketplace

# 3. Restart Claude Code to load the plugin
```

Verify by typing `/juce-dev:create` — if the command is recognized, you're set.

## Prerequisites

**Required:** [Claude Code](https://claude.ai/code) and macOS. The plugin checks for other dependencies (Xcode command-line tools, CMake, Ninja, gh CLI) and helps install anything missing. JUCE is fetched automatically during build — no separate install needed.

**Optional:**
- **Apple Developer account** — needed for code signing and distribution; not required for local development
- **[Visage](https://github.com/VitalAudio/visage)** — for GPU-rendered UI (Metal/D3D11/Vulkan at 60fps); the plugin clones and patches it for you via `--visage` or `/juce-dev:setup-visage`
- **[Visage fork](https://github.com/danielraffel/visage)** — needed only if using `/juce-dev:setup-ios` for iOS/iPadOS targets (includes iOS touch handling patches)
- **Windows/Linux cross-platform** — `/juce-dev:port` handles the transition; Windows needs Visual Studio 2022 + CMake + Ninja, Linux needs Clang + CMake + Ninja + JUCE apt dependencies

## Usage

All commands run inside Claude Code with the `/juce-dev:` prefix.

### Create a project

```
/juce-dev:create "Shimmer Delay"
```

Walks you through developer settings, creates the project, initializes git, and optionally creates a GitHub repo. Ready to build immediately.

```
/juce-dev:create "My Synth" --visage       # With GPU-rendered Metal UI
/juce-dev:create "My Synth" --no-github    # Skip GitHub repo creation
```

### Build and test

```
/juce-dev:build standalone     # Build and launch the standalone app
/juce-dev:build au             # Build Audio Unit only
/juce-dev:build vst3           # Build VST3 only
/juce-dev:build all            # Build all formats
/juce-dev:build all test       # Build all + run PluginVal validation
/juce-dev:build unsigned       # Quick unsigned installer for testing
```

The build system auto-detects whether CMake regeneration is needed — skips it when nothing changed for faster builds.

### Ship

```
/juce-dev:build publish        # Build → sign → notarize → .pkg → GitHub Release
/juce-dev:build draft          # Same, but creates a draft release
/juce-dev:build all notarize   # Sign and notarize without releasing
```

### Add features to an existing project

```
/juce-dev:setup-visage         # Add GPU UI to an existing project
/juce-dev:setup-ios            # Add iOS/iPadOS app target (auto-detects Visage)
/juce-dev:setup-updates        # Add Sparkle/WinSparkle auto-updates
/juce-dev:setup-updates --doctor  # Validate the full update chain
```

### Cross-platform

```
/juce-dev:port windows         # Audit and port macOS project to Windows
/juce-dev:port linux           # Audit and port macOS/Windows project to Linux
/juce-dev:port macos           # Audit and port Windows/Linux project to macOS
/juce-dev:port all             # Port to all other platforms
/juce-dev:port windows --vm win   # Port and test on a Windows VM
/juce-dev:port linux --vm ubuntu  # Port and test on a Linux VM
/juce-dev:port windows --audit-only  # Scan only, don't modify
```

### CI/CD

```
/juce-dev:ci                   # Show config, offer to trigger
/juce-dev:ci macos,windows     # Trigger specific platforms
/juce-dev:ci publish           # Full CI publish pipeline
/juce-dev:ci draft             # Draft release via CI
/juce-dev:ci status            # Check recent run results
/juce-dev:ci logs              # View build output
/juce-dev:ci secrets           # Export signing certs to GitHub Secrets
```

CI reads config from `.env` or `.env.ci` (fallback for repos that gitignore `.env`). Publish mode creates platform-specific installers (macOS .pkg, Windows Setup.exe via Inno Setup), uploads to GitHub Releases, and auto-updates your website download buttons — only activating platforms with actual release assets.

### Other

```
/juce-dev:website              # Create a GitHub Pages download page
/juce-dev:status               # Show project config, features, VMs
/juce-dev:vm add win win-ssh windows  # Add a VM for cross-platform builds
/juce-dev:vm list              # List configured VMs
/juce-dev:build --help         # Full build reference (targets, actions, options)
```

## All Commands

| Command | Purpose |
|---------|---------|
| `/juce-dev:create` | Create a new plugin project from the template |
| `/juce-dev:build` | Build, test, sign, or publish plugins |
| `/juce-dev:ci` | Trigger CI/CD builds, check status, view logs |
| `/juce-dev:port` | Port a project between macOS, Windows, and Linux |
| `/juce-dev:setup-visage` | Add Visage GPU UI to a project |
| `/juce-dev:setup-ios` | Add iOS/iPadOS app target |
| `/juce-dev:setup-updates` | Add Sparkle/WinSparkle/Linux auto-updates |
| `/juce-dev:website` | Create a GitHub Pages download page |
| `/juce-dev:status` | Show project configuration and status |
| `/juce-dev:vm` | Manage cross-platform test VMs |

For every argument and option with examples, see the [homepage](https://www.generouscorp.com/generous-corp-marketplace/plugins/juce-dev/).

## Bundled Skills

The plugin includes skills that activate automatically when relevant:

- **juce-starter** — Knowledge about the JUCE-Plugin-Starter template, .env configuration, placeholder system, and build conventions
- **juce-visage** — Integration guide for Visage GPU UI with JUCE: Metal view embedding, event bridging, focus management, keyboard handling in DAW hosts, iOS touch events, and the full Visage API reference

## Feedback & Issues

- JUCE Dev (Claude Code plugin)
  - [Report a bug](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-dev-bug.yml)
  - [Request a feature](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-dev-feature.yml)
- juce-visage (Codex skill)
  - [Report a bug](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-visage-codex-bug.yml)
  - [Request a feature](https://github.com/danielraffel/generous-corp-marketplace/issues/new?template=juce-visage-codex-feature.yml)
