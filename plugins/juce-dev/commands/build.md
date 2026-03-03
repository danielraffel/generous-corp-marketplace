---
description: Build, test, sign, or publish a JUCE plugin project
argument-hint: "[target...] [action] [--help]"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
---

# Build JUCE Plugin

Build, test, sign, or publish a JUCE-Plugin-Starter project. Wraps `scripts/build.sh` with automatic CMake regeneration detection.

## Arguments

Arguments mirror `scripts/build.sh` exactly:

**Targets** (can combine multiple):
- `all` — Build all formats (default if none specified)
- `au` — Audio Unit only
- `vst3` — VST3 only
- `standalone` — Standalone app only

**Actions** (pick one):
- `local` — Build locally without signing (default)
- `test` — Build and run PluginVal tests
- `sign` — Build and code sign
- `notarize` — Build, sign, and notarize
- `pkg` — Build, sign, notarize, and package (no GitHub release)
- `publish` — Full release: build, sign, notarize, publish to GitHub
- `unsigned` — Build unsigned installer package (fast testing)
- `uninstall` — Uninstall all plugin components

**Options:**
- `--regenerate-page` — Force regeneration of GitHub Pages index.html (with publish)
- `--help` — Show this help reference

**Examples:**
```
/juce-dev:build                          # Build all formats locally
/juce-dev:build standalone               # Build standalone only
/juce-dev:build au vst3                  # Build AU + VST3
/juce-dev:build all test                 # Build all and run PluginVal
/juce-dev:build standalone test          # Build standalone and test
/juce-dev:build publish                  # Full release to GitHub
/juce-dev:build pkg                      # Signed PKG, no GitHub release
/juce-dev:build unsigned                 # Unsigned installer for quick testing
/juce-dev:build uninstall                # Remove all installed plugins
/juce-dev:build --help                   # Show help reference
```

## Implementation

### Step 0: Handle --help

If `--help` is in the arguments, display this reference and stop:

```
juce-dev:build — Build, test, sign, or publish a JUCE plugin project

TARGETS (combine multiple):
  all             Build all formats (default)
  au              Audio Unit only
  vst3            VST3 only
  standalone      Standalone app only

ACTIONS (pick one):
  local           Build locally without signing (default)
  test            Build and run PluginVal tests
  sign            Build and code sign
  notarize        Build, sign, and notarize
  pkg             Build, sign, notarize, and create installer
  publish         Full release to GitHub with landing page
  unsigned        Build unsigned installer (fast testing)
  uninstall       Uninstall all plugin components

OPTIONS:
  --regenerate-page   Force regenerate GitHub Pages (with publish)

EXAMPLES:
  /juce-dev:build                    Build all formats locally
  /juce-dev:build standalone         Build and launch standalone app
  /juce-dev:build au vst3 test       Build AU + VST3, then test both
  /juce-dev:build publish            Full signed release to GitHub
  /juce-dev:build uninstall          Remove all installed plugins
```

Do NOT proceed to the build steps. Just display the help and return.

### Step 1: Verify Project

1. Check that the current working directory is a JUCE-Plugin-Starter project:
   - `scripts/build.sh` must exist
   - `.env` must exist
   - `CMakeLists.txt` must exist

2. If any are missing, tell the user: "This command must be run from a JUCE-Plugin-Starter project root."

### Step 2: Parse Arguments

Parse the user's arguments into targets, action, and options. The argument format matches `scripts/build.sh`:

- **Targets**: `all`, `au`, `vst3`, `standalone` — multiple allowed, default `all`
- **Action**: `local`, `test`, `sign`, `notarize`, `pkg`, `publish`, `unsigned`, `uninstall` — one only, default `local`
- **Options**: `--regenerate-page`

If an unrecognized argument is provided, show the help reference and stop.

### Step 3: Confirm Destructive Actions

For potentially destructive or external-facing actions, confirm with the user before proceeding:

**If action is `publish`:**
```
question: "This will build, sign, notarize, and publish a GitHub release. Continue?"
header: "Publish"
options:
  - label: "Yes, publish release"
    description: "Builds all formats, signs, notarizes, creates GitHub release with installer"
  - label: "Cancel"
    description: "No changes will be made"
```

**If action is `uninstall`:**
```
question: "This will remove all installed plugin components. Continue?"
header: "Uninstall"
options:
  - label: "Yes, uninstall"
    description: "Removes AU, VST3, Standalone, and clears AU cache"
  - label: "Cancel"
    description: "No changes will be made"
```

Other actions (`local`, `test`, `sign`, `notarize`, `pkg`, `unsigned`) do NOT need confirmation — proceed directly.

### Step 4: Detect CMake Regeneration Need

**Skip this step if action is `uninstall`.**

Check whether CMake regeneration is needed by examining recent changes:

1. Run: `git diff --name-only HEAD~1..HEAD 2>/dev/null` and `git diff --name-only` (unstaged changes)
2. Check if ANY of these patterns appear in changed files:
   - `CMakeLists.txt` or `*.cmake`
   - `.env`
   - New or deleted source files (`.cpp`, `.h`, `.mm`) that CMake references
3. Also check: does the `build/` directory exist?

**If regeneration IS needed** (or `build/` doesn't exist):
- Run: `./scripts/generate_and_open_xcode.sh`
- Then run: `./scripts/build.sh {args}`

**If regeneration is NOT needed**:
- Run: `SKIP_CMAKE_REGEN=1 SKIP_VERSION_BUMP=1 ./scripts/generate_and_open_xcode.sh`
- Then run: `./scripts/build.sh {args}`

**If regeneration was skipped but the build fails**, retry with full regeneration.

### Step 5: Run Build

Construct the build command from parsed arguments:

```bash
./scripts/build.sh {targets} {action} {options}
```

Examples:
- No args → `./scripts/build.sh`
- `standalone` → `./scripts/build.sh standalone`
- `au vst3 test` → `./scripts/build.sh au vst3 test`
- `publish --regenerate-page` → `./scripts/build.sh all publish --regenerate-page`

Run the command and stream output. The script handles everything: version bumping, building, testing, signing, etc.

### Step 6: Report Result

After the build completes:

**On success:**
- Report which targets were built and the action performed
- For `standalone` or `all` with `local`/`test`: note the app was launched
- For `test`: report PluginVal results
- For `publish`: report the GitHub release URL
- For `pkg`: note the PKG location (Desktop)

**On failure:**
- Show the relevant error output
- If the failure might be due to stale CMake config and regeneration was skipped, suggest retrying with full regeneration
- For signing failures, suggest checking `.env` certificates
- For notarization failures, suggest checking `APPLE_ID` and `APP_SPECIFIC_PASSWORD` in `.env`
