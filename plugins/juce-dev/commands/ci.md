---
description: Trigger GitHub Actions CI/CD builds or check CI status
argument-hint: "[macos|windows|linux|all|status|logs] [--help]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Edit
---

# CI/CD — Trigger & Monitor GitHub Actions

Detect which platforms a JUCE project supports, show the current CI configuration, optionally change it, and trigger GitHub Actions workflows.

## Arguments

- `status` — Show recent CI runs and their results
- `logs` or `logs <run-id>` — Show logs from the latest (or specified) CI run
- `macos`, `windows`, `linux` — Trigger CI for specific platform(s), comma-separated also works
- `all` — Trigger CI for all configured platforms
- (no args) — Show current config and offer to trigger
- `--help` — Show help reference

**Examples:**
```
/juce-dev:ci                    # Show config, offer to trigger
/juce-dev:ci macos              # Trigger macOS-only build
/juce-dev:ci macos,windows      # Trigger macOS + Windows
/juce-dev:ci all                # Trigger all configured platforms
/juce-dev:ci status             # Show recent CI run results
/juce-dev:ci logs               # Show logs from latest run
/juce-dev:ci --help             # Show this reference
```

## Implementation

### Step 0: Handle --help

If `--help` is in the arguments, display this reference and stop:

```
juce-dev:ci — Trigger GitHub Actions CI/CD builds or check status

PLATFORMS (combine with comma or space):
  macos           Build on macOS (arm64 + x86_64)
  windows         Build on Windows (MSVC + Ninja)
  linux           Build on Linux (Clang + Ninja)
  all             Build all configured platforms

ACTIONS:
  status          Show recent CI runs
  logs [run-id]   Show build logs (latest or specific run)

OPTIONS:
  --help          Show this reference

EXAMPLES:
  /juce-dev:ci                    Show config and offer to trigger
  /juce-dev:ci macos              Trigger macOS build only
  /juce-dev:ci macos,windows      Trigger macOS + Windows
  /juce-dev:ci all                Trigger all configured platforms
  /juce-dev:ci status             Show last 5 CI runs
  /juce-dev:ci logs               Show logs from latest run

CONFIGURATION:
  Set CI_PLATFORMS in .env to control default platforms.
  Example: CI_PLATFORMS="macos,windows"
  If unset, platforms are auto-detected from project files.
```

### Step 1: Verify Project & Tools

1. Check that `.env`, `CMakeLists.txt`, and `.github/workflows/build.yml` exist.
   - If `.github/workflows/build.yml` is missing, tell the user: "No CI workflow found. This project doesn't have GitHub Actions set up yet."
2. Check that `gh` CLI is installed: run `gh --version`
   - If missing, tell the user: "GitHub CLI (gh) is required. Install with: brew install gh"
3. Check that `gh` is authenticated: run `gh auth status`
   - If not authenticated, tell the user: "Run 'gh auth login' first."
4. Check that a GitHub remote exists: run `git remote get-url origin`
   - If no remote, tell the user: "No GitHub remote found. Push your project to GitHub first."

### Step 2: Handle `status` Action

If the user passed `status`:

1. Run: `gh run list --workflow=build.yml --limit=5 --json status,conclusion,name,createdAt,headBranch,databaseId`
2. Display the results in a clean table showing: run ID, branch, status, conclusion, date
3. Stop here.

### Step 3: Handle `logs` Action

If the user passed `logs` (with optional run ID):

1. If a run ID was provided: `gh run view <run-id> --log`
2. If no run ID: get the latest run first: `gh run list --workflow=build.yml --limit=1 --json databaseId -q '.[0].databaseId'`
   Then: `gh run view <id> --log`
3. Show the output (may be large — consider `--log-failed` to show only failed step logs).
4. Stop here.

### Step 4: Detect Platform Configuration

Detect which platforms this project supports using these signals (in priority order):

**1. Check CI_PLATFORMS in .env:**
```bash
grep '^CI_PLATFORMS=' .env
```
If set and not empty, use those platforms as the configured set.

**2. Auto-detect from project files:**
- **macOS**: Always supported (all JUCE-Plugin-Starter projects are macOS-capable)
- **Windows**: `scripts/build.ps1` exists OR `CMakeLists.txt` contains `if(MSVC)` or `if(WIN32)`
- **Linux**: `CMakeLists.txt` contains `UNIX AND NOT APPLE`

**3. Build a summary:**

Display to the user:
```
CI Platform Configuration
─────────────────────────
Source:     .env (CI_PLATFORMS="macos,windows")  — or "auto-detected"
Platforms:  macOS, Windows
Workflow:   .github/workflows/build.yml
Branch:     <current git branch>
Remote:     <origin URL>
```

### Step 5: Offer Configuration Changes (if no platform args provided)

If the user ran `/juce-dev:ci` with NO platform arguments (or `all`), show the current config from Step 4 and then ask:

```
question: "What would you like to do?"
header: "CI/CD"
options:
  - label: "Trigger CI for configured platforms"
    description: "Run GitHub Actions for: <detected platforms>"
  - label: "Change platforms"
    description: "Update CI_PLATFORMS in .env"
  - label: "Just show status"
    description: "Show recent CI runs without triggering"
  - label: "Cancel"
    description: "No action"
```

**If "Change platforms":**

Ask which platforms to enable:
```
question: "Which platforms should CI build?"
header: "Platform Selection"
options:
  - label: "macOS only"
    description: "Build on macOS (arm64 + x86_64)"
  - label: "macOS + Windows"
    description: "Build on macOS and Windows"
  - label: "macOS + Windows + Linux"
    description: "Build on all three platforms"
  - label: "Custom"
    description: "Enter platforms manually"
```

Then update `.env`:
- If `CI_PLATFORMS` line exists, update it
- If not, add it after the `BUILD_FORMATS` line

After updating, confirm: "Updated CI_PLATFORMS in .env to '<new value>'"

**If "Just show status":** Go to Step 2.

**If "Cancel":** Stop.

### Step 6: Determine Platforms to Build

Resolve the final platform list:

- If user explicitly passed platforms (e.g., `macos,windows`), use those
- If user chose "Trigger CI for configured platforms", use the detected set from Step 4
- If user passed `all`, use the detected set from Step 4

Validate: warn if a requested platform isn't detected as supported (e.g., requesting `windows` when no `build.ps1` exists). Ask if they want to proceed anyway.

### Step 7: Trigger the Workflow

1. Check if the current branch is pushed to the remote:
   ```bash
   git rev-parse --abbrev-ref HEAD
   git ls-remote --heads origin <branch>
   ```
   If not pushed, warn: "Branch '<name>' hasn't been pushed to GitHub yet. Push first?"
   If the user confirms, run: `git push -u origin <branch>`

2. Trigger the workflow:
   ```bash
   gh workflow run build.yml --ref <branch> -f platforms=<comma-separated-platforms>
   ```

3. Wait a moment, then get the run URL:
   ```bash
   gh run list --workflow=build.yml --limit=1 --json url -q '.[0].url'
   ```

4. Display:
   ```
   CI triggered for: macOS, Windows
   Branch: integrate/cross-platform
   Run: https://github.com/<user>/<repo>/actions/runs/<id>

   Use '/juce-dev:ci status' to check progress
   Use '/juce-dev:ci logs' to view build output
   ```

### Step 8: Report

Summarize what was done:
- If platforms were changed: note the .env update
- If CI was triggered: show the run URL
- If status was shown: display the table
- Always remind about `status` and `logs` subcommands for follow-up
