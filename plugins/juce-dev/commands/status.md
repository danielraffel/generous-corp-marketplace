---
description: Show current project configuration, build targets, VMs, and plugin status
argument-hint: "[--verbose]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
---

# JUCE Dev Status

Show the current state of the JUCE plugin project — configuration, build targets, VMs, and features.

## Arguments

- `--verbose`: Show full .env values and detailed VM info

## Implementation

### 1. Read project .env

Read the `.env` file in the current directory. If not found, say "Not in a JUCE-Plugin-Starter project."

Extract and display:

```
## Project Configuration

| Setting | Value |
|---------|-------|
| **Project** | {PROJECT_NAME} |
| **Plugin Name** | {PRODUCT_NAME} |
| **Bundle ID** | {PROJECT_BUNDLE_ID} |
| **Developer** | {DEVELOPER_NAME} |
| **Version** | {VERSION_MAJOR}.{VERSION_MINOR}.{VERSION_PATCH} (build {VERSION_BUILD}) |
| **JUCE** | {JUCE_TAG} |

## Build Targets

| Format | Status |
|--------|--------|
| AU | {check ~/Library/Audio/Plug-Ins/Components/{name}.component} |
| VST3 | {check standard path per platform} |
| CLAP | {check standard path per platform} |
| Standalone | {check /Applications/{name}.app or build dir} |

## Features

| Feature | Enabled |
|---------|---------|
| Visage GPU UI | {USE_VISAGE_UI from .env} |
| DiagnosticKit | {ENABLE_DIAGNOSTICS from .env} |
| GitHub | {GITHUB_USER}/{GITHUB_REPO} or "Not configured" |
| Code Signing | {APP_CERT is set and not placeholder} |
| Notarization | {APPLE_ID + APP_SPECIFIC_PASSWORD set} |
```

### 2. Check VMs

Read `.claude/juce-dev.local.md` if it exists. Parse the YAML frontmatter for VM configs.

```
## Test VMs

| Name | Platform | SSH | Status |
|------|----------|-----|--------|
| win | Windows | ssh win | {test with: ssh win "echo ok" 2>/dev/null} |
| linux | Linux | ssh linux | {test with: ssh linux "echo ok" 2>/dev/null} |
```

If no VMs configured: "No test VMs configured. Use `/juce-dev:vm add <name> <ssh-alias> <platform>` to add one."

### 3. Check build state

```bash
# Check if build directory exists and has been configured
if [ -d build ]; then
    echo "Build: configured"
    # Check last build time
    ls -lt build/*/CMakeCache.txt 2>/dev/null | head -1
else
    echo "Build: not configured (run ./scripts/build.sh or /juce-dev:build)"
fi
```

### 4. Platform detection

Show the current platform:

```
## Platform

| | |
|---|---|
| **Current** | macOS (Darwin arm64) |
| **Build System** | Xcode / Ninja |
| **CI** | {check .github/workflows/build.yml exists} |
```
