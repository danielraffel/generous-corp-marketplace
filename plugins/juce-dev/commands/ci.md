---
description: Trigger GitHub Actions CI/CD builds, sign, publish, or check CI status
argument-hint: "[macos|windows|linux|all|status|logs|secrets] [sign|publish] [--no-sign-macos] [--no-sign-windows] [--help]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Edit
---

# CI/CD — Trigger & Monitor GitHub Actions

Detect which platforms a JUCE project supports, show the current CI configuration, optionally change it, and trigger GitHub Actions workflows. Supports three modes: **verify** (build + test), **sign** (build + sign), and **publish** (build + sign + release + website update).

## Arguments

- `status` — Show recent CI runs and their results
- `logs` or `logs <run-id>` — Show logs from the latest (or specified) CI run
- `secrets` — Manage signing secrets (show status, sync .env → GitHub Secrets)
- `macos`, `windows`, `linux` — Trigger CI for specific platform(s), comma-separated also works
- `all` — Trigger CI for all configured platforms
- `sign` — Build and sign (no release). Requires signing certs configured.
- `publish` — Full pipeline: build, sign, GitHub Release, update website download links
- `--no-sign-macos` — Skip macOS code signing during this run
- `--no-sign-windows` — Skip Windows code signing during this run
- `--no-create-release` — In publish mode, skip GitHub Release creation
- (no args) — Show current config and offer to trigger
- `--help` — Show help reference

**Examples:**
```
/juce-dev:ci                         # Show config, offer to trigger
/juce-dev:ci macos                   # Trigger macOS-only verify build
/juce-dev:ci macos,windows           # Trigger macOS + Windows
/juce-dev:ci all                     # Trigger all configured platforms
/juce-dev:ci sign                    # Build + sign (all platforms)
/juce-dev:ci publish                 # Full release pipeline + website update
/juce-dev:ci publish --no-sign-windows  # Publish but skip Windows signing
/juce-dev:ci status                  # Show recent CI run results
/juce-dev:ci logs                    # Show logs from latest run
/juce-dev:ci secrets                 # Show/sync signing secrets
/juce-dev:ci --help                  # Show this reference
```

## Implementation

### Step 0: Handle --help

If `--help` is in the arguments, display this reference and stop:

```
juce-dev:ci — Trigger GitHub Actions CI/CD builds or check status

MODES (default: verify):
  (default)     Verify — build + test only (no signing, no release)
  sign          Build + code-sign. Requires signing certs.
  publish       Full pipeline: build → sign → GitHub Release → website update

PLATFORMS (combine with comma or space):
  macos           Build on macOS (arm64 + x86_64)
  windows         Build on Windows (MSVC + Ninja)
  linux           Build on Linux (Clang + Ninja)
  all             Build all configured platforms

ACTIONS:
  status          Show recent CI runs
  logs [run-id]   Show build logs (latest or specific run)
  secrets         Show/sync signing secrets status

OPTIONS:
  --no-sign-macos     Skip macOS code signing
  --no-sign-windows   Skip Windows code signing
  --no-create-release Skip GitHub Release in publish mode
  --help              Show this reference

WHAT PUBLISH DOES:
  1. Builds all formats on all configured platforms
  2. Signs with platform certs (if available, gracefully skips if not)
  3. Creates a draft GitHub Release with all artifacts
  4. Updates website download links (gh-pages, if set up)

  If no signing certs are configured, publish still works — artifacts
  are unsigned. No errors, just a warning in the build log.

EXAMPLES:
  /juce-dev:ci                         Show config and offer to trigger
  /juce-dev:ci macos                   Trigger macOS verify build
  /juce-dev:ci macos,windows           Trigger macOS + Windows
  /juce-dev:ci all                     Trigger all configured platforms
  /juce-dev:ci sign                    Build + sign (all platforms)
  /juce-dev:ci publish                 Full release + website update
  /juce-dev:ci publish --no-sign-windows  Publish, skip Windows signing
  /juce-dev:ci status                  Show last 5 CI runs
  /juce-dev:ci logs                    Show logs from latest run
  /juce-dev:ci secrets                 Check signing secrets status

CONFIGURATION:
  Set CI_PLATFORMS in .env to control default platforms.
  Example: CI_PLATFORMS="macos,windows"
  If unset, platforms are auto-detected from project files.

SIGNING SECRETS (GitHub → Settings → Secrets):
  macOS:
    MACOS_CERTIFICATE       Base64-encoded .p12 file
    MACOS_CERTIFICATE_PWD   Certificate password
    KEYCHAIN_PASSWORD       Temp keychain password (any string)
    APPLE_ID                Apple Developer email
    APP_PASSWORD            App-specific password
    TEAM_ID                 Apple Developer Team ID

  Windows (Option A — Authenticode PFX):
    WINDOWS_CERT_PFX        Base64-encoded .pfx file
    WINDOWS_CERT_PASSWORD   PFX password

  Windows (Option B — Azure Trusted Signing):
    AZURE_TENANT_ID         Azure AD tenant
    AZURE_CLIENT_ID         Service principal app ID
    AZURE_CLIENT_SECRET     Service principal secret
    AZURE_SIGNING_ACCOUNT   Trusted Signing account name
    AZURE_SIGNING_PROFILE   Certificate profile name
    AZURE_SIGNING_ENDPOINT  Signing endpoint URL
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

### Step 4: Handle `secrets` Action

If the user passed `secrets`:

1. Run: `gh secret list` to show which secrets are already configured
2. Read `.env` to check which signing values are set locally
3. Display a comparison table showing which secrets exist in GitHub vs locally:

```
Signing Secrets Status
──────────────────────────────────────────
Secret                    GitHub    Local
──────────────────────────────────────────
MACOS_CERTIFICATE         ✅        ✅
MACOS_CERTIFICATE_PWD     ✅        ✅
APPLE_ID                  ❌        ✅
APP_PASSWORD              ❌        ✅
TEAM_ID                   ❌        ✅
WINDOWS_CERT_PFX          ❌        ❌
WINDOWS_CERT_PASSWORD     ❌        ❌
──────────────────────────────────────────
```

4. If there are secrets set locally but not in GitHub, offer to sync them:
   ```
   question: "Some secrets are set locally but not in GitHub. Sync them?"
   ```
   If yes, run `gh secret set <NAME> --body "<value>"` for each.
5. Stop here.

### Step 5: Detect Platform Configuration

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

### Step 6: Determine Mode

Parse the arguments to determine the CI mode:

- If `publish` is in the arguments → **publish** mode
- If `sign` is in the arguments → **sign** mode
- Otherwise → **verify** mode (default)

Also parse signing flags:
- `--no-sign-macos` → set `sign_macos=false`
- `--no-sign-windows` → set `sign_windows=false`
- `--no-create-release` → set `create_release=false`

### Step 7: Offer Configuration Changes (if no platform args provided)

If the user ran `/juce-dev:ci` with NO platform arguments AND NO mode argument, show the current config from Step 5 and then ask:

```
question: "What would you like to do?"
header: "CI/CD"
options:
  - label: "Verify build (build + test)"
    description: "Run GitHub Actions for: <detected platforms>"
  - label: "Sign build (build + code-sign)"
    description: "Build and sign — no release"
  - label: "Publish (full release)"
    description: "Build → sign → GitHub Release → update website"
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

### Step 8: Determine Platforms to Build

Resolve the final platform list:

- If user explicitly passed platforms (e.g., `macos,windows`), use those
- If user chose a mode from the menu, use the detected set from Step 5
- If user passed `all`, use the detected set from Step 5

Validate: warn if a requested platform isn't detected as supported (e.g., requesting `windows` when no `build.ps1` exists). Ask if they want to proceed anyway.

### Step 9: Trigger the Workflow

1. Check if the current branch is pushed to the remote:
   ```bash
   git rev-parse --abbrev-ref HEAD
   git ls-remote --heads origin <branch>
   ```
   If not pushed, warn: "Branch '<name>' hasn't been pushed to GitHub yet. Push first?"
   If the user confirms, run: `git push -u origin <branch>`

2. Build the workflow dispatch inputs based on mode:
   ```bash
   # Verify mode (default)
   gh workflow run build.yml --ref <branch> -f platforms=<platforms> -f mode=verify

   # Sign mode
   gh workflow run build.yml --ref <branch> -f platforms=<platforms> -f mode=sign \
     -f sign_macos=<true|false> -f sign_windows=<true|false>

   # Publish mode
   gh workflow run build.yml --ref <branch> -f platforms=<platforms> -f mode=publish \
     -f sign_macos=<true|false> -f sign_windows=<true|false> \
     -f create_release=<true|false>
   ```

3. Wait a moment, then get the run URL:
   ```bash
   gh run list --workflow=build.yml --limit=1 --json url -q '.[0].url'
   ```

4. Display result based on mode:

   **Verify mode:**
   ```
   CI triggered (verify): macOS, Windows
   Branch: main
   Run: https://github.com/<user>/<repo>/actions/runs/<id>

   Builds and tests — no signing, no release.
   Use '/juce-dev:ci status' to check progress.
   ```

   **Sign mode:**
   ```
   CI triggered (sign): macOS, Windows
   Branch: main
   Run: https://github.com/<user>/<repo>/actions/runs/<id>

   Builds and signs — no release.
   macOS signing: ✅ enabled
   Windows signing: ❌ skipped (--no-sign-windows)
   Use '/juce-dev:ci status' to check progress.
   ```

   **Publish mode:**
   ```
   CI triggered (publish): macOS, Windows
   Branch: main
   Run: https://github.com/<user>/<repo>/actions/runs/<id>

   Full pipeline: build → sign → GitHub Release → website update
   macOS signing: ✅ enabled
   Windows signing: ✅ enabled
   GitHub Release: ✅ draft release will be created
   Website: download links will be updated (if gh-pages exists)

   Use '/juce-dev:ci status' to check progress.
   Use '/juce-dev:ci logs' to view build output.
   ```

### Step 10: Report

Summarize what was done:
- If platforms were changed: note the .env update
- If CI was triggered: show the run URL and mode
- If status was shown: display the table
- Always remind about `status` and `logs` subcommands for follow-up
