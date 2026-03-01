---
description: Create a new JUCE plugin project from the starter template
argument-hint: "<plugin-name> [--visage] [--no-github]"
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Create JUCE Plugin Project

Create a new JUCE audio plugin project from the JUCE-Plugin-Starter template. This replaces the interactive `init_plugin_project.sh` script with a streamlined workflow.

## Arguments

- `<plugin-name>`: Name of the plugin (e.g., "My Cool Synth"). Required — ask if not provided.
- `--visage`: Pre-select Visage GPU UI integration
- `--no-github`: Skip GitHub repository creation

## Implementation

Follow these 5 stages in order. Do NOT skip stages or combine prompts across stages.

---

### Stage 0: Check Environment

**macOS only.** Check `uname` — if not Darwin, tell the user this plugin only supports macOS and stop.

Check for required development tools by running these commands via Bash:

| Tool | Check Command | Required? |
|---|---|---|
| Xcode CLT | `xcode-select -p` | Yes |
| Homebrew | `command -v brew` | Yes |
| CMake | `command -v cmake` | Yes |
| gh CLI | `command -v gh` | Only if GitHub repo desired |

If **all tools are present**, proceed silently to Stage 1.

If **any required tools are missing**, show:
```
question: "Some development tools are missing. Install them now?"
header: "Setup"
options:
  - label: "Install missing tools (Recommended)"
    description: "Runs the JUCE-Plugin-Starter dependencies script to install: {list of missing tools}"
  - label: "Skip — I'll install them myself"
    description: "You'll need these before you can build"
```

If "Install missing tools":
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/danielraffel/JUCE-Plugin-Starter/main/scripts/dependencies.sh)
```

After the script runs, re-check that tools are now available. If Homebrew was just installed, the user may need to add it to their PATH — warn them if `command -v brew` still fails after install.

---

### Stage 1: Locate JUCE-Plugin-Starter Template

1. Search for the template in these locations (in order):
   - `~/Code/JUCE-Plugin-Starter`
   - Sibling directory of the current working directory (e.g., `../JUCE-Plugin-Starter`)

2. **If not found**, use AskUserQuestion:
   ```
   question: "JUCE-Plugin-Starter template not found. How should we proceed?"
   header: "Template"
   options:
     - label: "Clone from GitHub (Recommended)"
       description: "Clone danielraffel/JUCE-Plugin-Starter to ~/Code/"
     - label: "Specify path"
       description: "Enter the path to your existing template"
   ```
   If "Clone from GitHub": run `git clone https://github.com/danielraffel/JUCE-Plugin-Starter.git ~/Code/JUCE-Plugin-Starter`

3. Read the template's `.env` file and classify each developer setting as **configured** or **placeholder**.

   **Placeholder detection rules** — a value is a placeholder if:
   - `DEVELOPER_NAME` equals `"Your Name"`
   - `APPLE_ID` equals `your.email@example.com`
   - `TEAM_ID` equals `YOURTEAMID`
   - `APP_CERT` or `INSTALLER_CERT` contains `"Your Name"`
   - `APP_SPECIFIC_PASSWORD` equals `xxxx-xxxx-xxxx-xxxx`
   - `GITHUB_USER` equals `yourusername`

   The 7 reusable developer settings to extract:
   - `DEVELOPER_NAME`
   - `APPLE_ID`
   - `TEAM_ID`
   - `APP_CERT`
   - `INSTALLER_CERT`
   - `APP_SPECIFIC_PASSWORD`
   - `GITHUB_USER`

---

### Stage 2: Collect Settings via AskUserQuestion

#### 2a. Parse plugin name

Extract the plugin name from `$ARGUMENTS`. If not provided or empty (ignoring flags), ask:
```
question: "What should the plugin be called?"
header: "Plugin name"
options:
  - label: "My Awesome Synth"
    description: "Example name — choose 'Other' to enter your own"
  - label: "My Cool Effect"
    description: "Example name — choose 'Other' to enter your own"
```

#### 2b. Developer settings

**IMPORTANT:** The template's `.env` is read-only for this flow. All settings collected here are written ONLY to the new project's `.env`. The template's `.env` is never modified.

Read the template's `.env` and show the user what was found. Two paths:

**Path A: Template .env has real (non-placeholder) developer settings**

Show the configured values and ask:
```
question: "Found these developer settings in the template .env. Use them for this project?"
header: "Developer"
options:
  - label: "Yes, use these (Recommended)"
    description: "{DEVELOPER_NAME} | {APPLE_ID} | GitHub: {GITHUB_USER}"
  - label: "Edit settings"
    description: "Walk through each setting and adjust as needed"
```

If "Yes, use these" → use all values as-is for the new project, skip to 2c.

If "Edit settings" → walk through each setting individually (same as Path B below), showing the current value as the default option the user can keep or change.

**Path B: Template .env has placeholder/default values (first-time user)**

No existing settings to reuse. Walk through each setting individually:

1. Developer/Company name:
   ```
   question: "What is your developer or company name?"
   header: "Developer"
   options:
     - label: "Skip"
       description: "Use 'audio' as default namespace"
   ```
   (User enters their name via "Other".)

2. Apple ID:
   ```
   question: "What is your Apple ID email? (needed for code signing — skip if no Apple Developer account)"
   header: "Apple ID"
   options:
     - label: "Skip for now"
       description: "You can add this later in .env — needed only for distribution"
   ```

3. If Apple ID was provided, ask for:
   - Team ID: `"What is your Apple Developer Team ID? (Find at developer.apple.com → Membership)"`
   - App cert: `"Developer ID Application certificate name? (e.g., 'Developer ID Application: Your Name (TEAMID)')"`
   - Installer cert: `"Developer ID Installer certificate name?"`
   - App-specific password: `"App-specific password for notarization? (Generate at appleid.apple.com → App-Specific Passwords)"`

   For each, offer "Skip for now" option. If editing from Path A, show the current value as the first option to keep.

4. GitHub username:
   ```
   question: "What is your GitHub username? (for repository creation)"
   header: "GitHub"
   options:
     - label: "Skip"
       description: "No GitHub integration — local git only"
   ```

When editing from Path A, each question shows the current value as the first option (e.g., `label: "Daniel Raffel"`, `description: "Keep current value"`) so the user can quickly keep or change each one.

#### 2c. Optional features

Check `$ARGUMENTS` for `--visage` flag. Then ask:
```
question: "Which optional features do you want to enable?"
header: "Features"
multiSelect: true
options:
  - label: "Visage GPU UI"
    description: "Metal-accelerated rendering framework (macOS) — rich widgets, themes, 60fps"
  - label: "DiagnosticKit"
    description: "User diagnostic reporting with automatic GitHub issue creation"
  - label: "None"
    description: "Start with the basic JUCE plugin template"
```

If `--visage` was in arguments, pre-inform the user that Visage was requested via flag and still show the question (they can add DiagnosticKit too).

#### 2d. GitHub repository

Skip if `--no-github` is in `$ARGUMENTS` or if GITHUB_USER is empty/skipped.

Otherwise:
```
question: "Create a GitHub repository for this project?"
header: "GitHub"
options:
  - label: "Private repo (Recommended)"
    description: "github.com/{GITHUB_USER}/{GITHUB_REPO_NAME}"
  - label: "Public repo"
    description: "github.com/{GITHUB_USER}/{GITHUB_REPO_NAME}"
  - label: "Skip"
    description: "Local git only, no remote repository"
```

#### 2e. Confirm before proceeding

Show a summary and ask for confirmation:
```
question: "Create the project with these settings?"
header: "Confirm"
options:
  - label: "Create project (Recommended)"
    description: "{plugin_name} | {bundle_id} | Features: {features_list}"
  - label: "Start over"
    description: "Re-enter settings from the beginning"
```

If "Start over", go back to Stage 2a.

---

### Stage 3: Execute Project Creation

Run these steps via Bash. Report progress to the user between steps.

#### 3.1. Generate derived values

Compute these from the collected settings:

```bash
# CLASS_NAME: Remove all non-alphanumeric characters
# "My Cool Synth" → "MyCoolSynth"
CLASS_NAME=$(echo "$PLUGIN_NAME" | sed 's/[^a-zA-Z0-9]//g')

# PROJECT_NAME: Same as CLASS_NAME
PROJECT_NAME="$CLASS_NAME"

# PROJECT_FOLDER: Lowercase with hyphens replacing non-alphanumeric
# "My Cool Synth" → "my-cool-synth"
PROJECT_FOLDER=$(echo "$PLUGIN_NAME" | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')

# GITHUB_REPO_NAME: Same as PROJECT_FOLDER but preserves original case
# "My Cool Synth" → "My-Cool-Synth", "Griddy" → "Griddy"
GITHUB_REPO_NAME=$(echo "$PLUGIN_NAME" | sed 's/[^a-zA-Z0-9]/-/g')

# NAMESPACE: Developer name lowercased, alphanumeric only
# "Generous Corp" → "generouscorp"
NAMESPACE=$(echo "$DEVELOPER_NAME" | sed 's/[^a-zA-Z0-9]//g' | tr '[:upper:]' '[:lower:]')
# Fallback to "audio" if empty

# BUNDLE_ID: com.{namespace}.{project-folder}
# "com.generouscorp.my-cool-synth"
BUNDLE_PREFIX=$(echo "$DEVELOPER_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
BUNDLE_ID="com.${BUNDLE_PREFIX}.${PROJECT_FOLDER}"

# PLUGIN_MANUFACTURER: Same as DEVELOPER_NAME
```

**4-letter code generation** (`PLUGIN_CODE` from plugin name, `PLUGIN_MANUFACTURER_CODE` from developer name):

Algorithm:
1. Remove special characters (keep alphanumeric and spaces)
2. If 0 valid chars → `"XXXX"`
3. If 1-4 chars → uppercase and pad with `X` to reach 4
4. If 5+ chars with multiple words → first 2 chars of first word + first 2 chars of second word, uppercased
5. If 5+ chars single word → char[0] + char[1] + char[len/2] + char[last], uppercased
6. Always ensure exactly 4 uppercase characters

Examples:
- "My Cool Synth" → "MYCO"
- "PlunderTube" → "PLUE" (first, second, middle, last)
- "Daniel Raffel" → "DARA"
- "GPU" → "GPUX"

#### 3.2. Copy template

```bash
TEMPLATE_DIR="<path to JUCE-Plugin-Starter>"
TARGET_DIR="<parent of cwd>/$PROJECT_FOLDER"

mkdir -p "$TARGET_DIR"
rsync -av --exclude='integrate/' --exclude='todo/' --exclude='.git/' \
  "$TEMPLATE_DIR/" "$TARGET_DIR/"
```

The new project is created as a **sibling** of the template directory, just like the original script does. Use `"../$PROJECT_FOLDER"` relative to the template, or compute the absolute path.

#### 3.3. Replace placeholders

Run sed across the new project to replace all 9 placeholders:

```bash
cd "$TARGET_DIR"
find . -type f \( -name "*.cpp" -o -name "*.h" -o -name "*.cmake" -o -name "*.txt" -o -name "*.md" -o -name ".env*" \) -exec sed -i '' \
  -e "s/PLUGIN_NAME_PLACEHOLDER/$PLUGIN_NAME/g" \
  -e "s/CLASS_NAME_PLACEHOLDER/$CLASS_NAME/g" \
  -e "s/PROJECT_FOLDER_PLACEHOLDER/$PROJECT_FOLDER/g" \
  -e "s/BUNDLE_ID_PLACEHOLDER/$BUNDLE_ID/g" \
  -e "s/DEVELOPER_NAME_PLACEHOLDER/$DEVELOPER_NAME/g" \
  -e "s/PLUGIN_MANUFACTURER_PLACEHOLDER/$DEVELOPER_NAME/g" \
  -e "s/NAMESPACE_PLACEHOLDER/$NAMESPACE/g" \
  -e "s/PLUGIN_CODE_PLACEHOLDER/$PLUGIN_CODE/g" \
  -e "s/PLUGIN_MANUFACTURER_CODE_PLACEHOLDER/$PLUGIN_MANUFACTURER_CODE/g" \
  {} \; 2>/dev/null || true
```

#### 3.4. Visage setup (if enabled)

```bash
# Copy Visage editor templates over standard ones
cp templates/visage/PluginEditor.h Source/PluginEditor.h
cp templates/visage/PluginEditor.cpp Source/PluginEditor.cpp

# Replace CLASS_NAME_PLACEHOLDER in the Visage templates
sed -i '' "s/CLASS_NAME_PLACEHOLDER/$CLASS_NAME/g" Source/PluginEditor.h Source/PluginEditor.cpp

# Clone Visage and apply patches
./scripts/setup_visage.sh
```

#### 3.5. Generate .env

Use the Write tool to create the project's `.env` file with all collected and derived values. Follow the format from the init script (see the template .env for structure). Key sections:

```
# Project Configuration
PROJECT_NAME={PROJECT_NAME}
PRODUCT_NAME="{PLUGIN_NAME}"
PROJECT_BUNDLE_ID={BUNDLE_ID}
DEVELOPER_NAME="{DEVELOPER_NAME}"

# JUCE Plugin Codes
PLUGIN_CODE={PLUGIN_CODE}
PLUGIN_MANUFACTURER_CODE={PLUGIN_MANUFACTURER_CODE}

# Directory Path
PROJECT_PATH="{absolute path to project}"

# Version Information
VERSION_MAJOR=1
VERSION_MINOR=0
VERSION_PATCH=0
VERSION_BUILD=1

# Apple Developer Settings
APPLE_ID={APPLE_ID}
TEAM_ID={TEAM_ID}
APP_CERT="{APP_CERT}"
INSTALLER_CERT="{INSTALLER_CERT}"
APP_SPECIFIC_PASSWORD={APP_SPECIFIC_PASSWORD}

# GitHub Settings
GITHUB_USER={GITHUB_USER}
GITHUB_REPO={GITHUB_REPO_NAME}

# Feature Flags
ENABLE_DIAGNOSTICS={true|false}
USE_VISAGE_UI={TRUE|FALSE}

# DiagnosticKit Settings (only if ENABLE_DIAGNOSTICS=true)
DIAGNOSTIC_GITHUB_REPO={GITHUB_USER}/{PROJECT_FOLDER}-diagnostics
DIAGNOSTIC_GITHUB_PAT=
DIAGNOSTIC_SUPPORT_EMAIL={APPLE_ID or empty}

# Build Configuration
CMAKE_BUILD_TYPE=Debug
BUILD_DIR=build

# JUCE Configuration
JUCE_REPO=https://github.com/juce-framework/JUCE.git
JUCE_BRANCH=master
```

Leave API keys as placeholder values (`ghp_xxxxxxxxxxxxxxxxxxxx`, etc.).

#### 3.6. Make scripts executable

```bash
find scripts/ -name "*.sh" -exec chmod +x {} \;
find scripts/ -name "*.py" -exec chmod +x {} \;
```

#### 3.7. Initialize git

```bash
git init
git add .
git commit -m "Initial commit: {PLUGIN_NAME} plugin from JUCE-Plugin-Starter template"
```

#### 3.8. Create GitHub repo (if requested)

```bash
# Private or public based on user choice
gh repo create "$GITHUB_REPO_NAME" --private  # or --public
git remote add origin "https://github.com/$GITHUB_USER/$GITHUB_REPO_NAME.git"
git branch -M main
git push -u origin main
```

---

### Stage 4: Summary and Next Steps

Display a summary to the user:

```
## Project Created Successfully

| Setting | Value |
|---------|-------|
| **Project path** | /path/to/{project-folder} |
| **Plugin name** | {PLUGIN_NAME} |
| **Class name** | {CLASS_NAME} |
| **Bundle ID** | {BUNDLE_ID} |
| **Plugin code** | {PLUGIN_CODE} |
| **Manufacturer code** | {PLUGIN_MANUFACTURER_CODE} |
| **Features** | Visage, DiagnosticKit (or "None") |
| **GitHub** | github.com/{user}/{repo} (or "Local only") |

### Build your plugin

cd /path/to/{project-folder}
./scripts/generate_and_open_xcode.sh

### Next steps

- **Ready to start building?** Use `/chainer` to describe what your plugin should do — e.g., "a stereo delay with pitch-shifted feedback" — and it will implement it for you
- The `juce-visage` skill is available for Visage UI development guidance (if Visage enabled)
- Edit `.env` to customize build settings

### Useful build commands

cd /path/to/{project-folder}
./scripts/build.sh au debug          # Build Audio Unit (debug)
./scripts/build.sh vst3 release      # Build VST3 (release)
./scripts/build.sh standalone debug  # Build Standalone app
./scripts/build.sh all release       # Build all formats
```

If DiagnosticKit was enabled, add this section to the summary:

```
### DiagnosticKit setup

DiagnosticKit needs a private GitHub repo and a Personal Access Token (PAT) to submit diagnostic issues.

Run this command to set it up:

cd /path/to/{project-folder}
./scripts/setup_diagnostic_repo.sh

This will:
1. Create a private `{GITHUB_USER}/{project-folder}-diagnostics` repo
2. Walk you through creating a fine-grained PAT (Issues: Write permission only)
3. Save the PAT to your project's .env

**Note:** The GITHUB_TOKEN placeholder in .env is for GitHub Releases (different from the diagnostic PAT). The setup script handles this separately.
```
