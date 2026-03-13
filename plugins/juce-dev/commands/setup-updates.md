---
description: Add Sparkle/WinSparkle auto-update support to an existing JUCE plugin project
argument-hint: "[--doctor] [--help]"
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Setup Auto-Updates

Add in-app auto-update support to an existing JUCE-Plugin-Starter project. Uses Sparkle 2.x on macOS and WinSparkle on Windows.

## Arguments

- `--doctor`: Validate existing auto-update configuration and report issues
- `--help`: Show help reference and stop

## Implementation

### Step 0: Handle --help

If `--help` is in the arguments, display this reference and stop:

```
juce-dev:setup-updates — Add auto-update support to a JUCE plugin project

Adds Sparkle 2.x (macOS) or WinSparkle (Windows) auto-update support to the
Standalone target. Updates are distributed as full-product installers (PKG on
macOS, Inno Setup on Windows).

After setup:
  - "Check for Updates..." appears in the Standalone app menu
  - Background update checks run automatically (configurable)
  - /juce-dev:build publish includes EdDSA signing and appcast generation

USAGE:
  /juce-dev:setup-updates              Run setup wizard
  /juce-dev:setup-updates --doctor     Validate existing setup
  /juce-dev:setup-updates --help       Show this reference

PREREQUISITES:
  - JUCE-Plugin-Starter project with .env and CMakeLists.txt
  - GitHub repository configured (GITHUB_USER and GITHUB_REPO in .env)
```

Do NOT proceed to the setup steps. Just display the help and return.

### Step 1: Verify Project

1. Check that `.env`, `CMakeLists.txt`, and `scripts/build.sh` exist in the current directory.
   - If missing: "This command must be run from a JUCE-Plugin-Starter project root."

2. Check if auto-updates are already configured:
   - If `.env` contains `ENABLE_AUTO_UPDATE=true` and `Source/AutoUpdater.h` exists, tell the user auto-updates are already set up and offer to reconfigure.

3. Check that `GITHUB_USER` and `GITHUB_REPO` are set in `.env`:
   - If missing: "Auto-updates require a GitHub repository. Set GITHUB_USER and GITHUB_REPO in .env first."

### Step 2: Confirm Setup

```
question: "Add auto-update support to this project?"
header: "Auto-Updates"
options:
  - label: "Yes, add auto-updates (Recommended)"
    description: "Adds Sparkle (macOS) / WinSparkle (Windows) with EdDSA-signed updates via GitHub Releases"
  - label: "Cancel"
    description: "No changes will be made"
```

If cancelled, stop.

### Step 3: Detect Platform and Download Framework

Detect the platform by running `uname -s`.

**macOS:**

1. Run `scripts/setup_sparkle.sh` to download Sparkle 2.x framework:
   ```bash
   ./scripts/setup_sparkle.sh
   ```
2. Verify `external/Sparkle.framework` exists after download.
3. Verify `external/bin/sign_update` and `external/bin/generate_keys` exist.

**Windows:**

1. Run `scripts/setup_winsparkle.sh` to download WinSparkle (architecture-aware):
   ```bash
   ./scripts/setup_winsparkle.sh
   ```
2. Verify WinSparkle files exist in `external/WinSparkle/`.

If the setup script doesn't exist, tell the user their JUCE-Plugin-Starter template needs updating:
"Your template is missing `scripts/setup_sparkle.sh`. Pull the latest from the template's main branch."

### Step 4: Generate EdDSA Key Pair

**macOS:**

Check if an EdDSA key pair already exists:
```bash
./external/bin/generate_keys 2>&1
```

The `generate_keys` tool:
- If keys exist in Keychain: prints the public key and exits
- If no keys: generates a new pair, stores private key in Keychain, prints the public key

Capture the public key from the output.

**Windows:**

Use WinSparkle's key generation tool (or Sparkle's generate_keys if available in WSL/cross-platform).

### Step 5: Detect Default Branch

Detect the repository's default branch for constructing the feed URL:
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||'
```

If that fails, fall back to checking for `main` or `master`:
```bash
git branch -r | grep -E 'origin/(main|master)$' | head -1 | sed 's|.*origin/||'
```

Default to `main` if all detection fails.

### Step 6: Update .env

Read the current `.env` and add/update the auto-update variables. Set them based on the values gathered:

```bash
# Auto-Update Settings
ENABLE_AUTO_UPDATE=true
AUTO_UPDATE_MODE=public
AUTO_UPDATE_EDDSA_PUBLIC_KEY={captured_public_key}
AUTO_UPDATE_FEED_URL_MACOS=https://raw.githubusercontent.com/{GITHUB_USER}/{GITHUB_REPO}/{default_branch}/appcast-macos.xml
AUTO_UPDATE_FEED_URL_WINDOWS=https://raw.githubusercontent.com/{GITHUB_USER}/{GITHUB_REPO}/{default_branch}/appcast-windows.xml
```

If these variables already exist in `.env`, update them. If not, append them after a blank line.

### Step 7: Verify Source Files

Check that the auto-update source files exist in the project:

- `Source/AutoUpdater.h`
- `Source/AutoUpdater_Mac.mm` (macOS)
- `Source/StandaloneApp.cpp`

These should already be present in the JUCE-Plugin-Starter template. If any are missing, tell the user their template needs updating.

### Step 8: Verify CMakeLists.txt

Check that `CMakeLists.txt` contains the auto-update section:
```bash
grep -q "ENABLE_AUTO_UPDATE" CMakeLists.txt
```

If not present, tell the user their template's CMakeLists.txt needs updating.

### Step 9: Summary

Display the setup summary:

```
## Auto-Update Setup Complete

| Setting | Value |
|---------|-------|
| **Mode** | Public |
| **Platform** | {macOS / Windows} |
| **Framework** | {Sparkle 2.x / WinSparkle} |
| **EdDSA Public Key** | {first 20 chars}... |
| **Feed URL** | {feed_url} |

### Next Steps

1. **Build and test**: `/juce-dev:build standalone` — verify "Check for Updates..." appears in the app menu
2. **First publish**: `/juce-dev:build publish` — creates GitHub release with EdDSA-signed installer and appcast
3. **CI setup** (optional): Export the EdDSA private key for CI:
   - macOS: `./external/bin/generate_keys -x` to export from Keychain
   - Store as GitHub Secret: `EDDSA_PRIVATE_KEY`

### Important Notes

- The EdDSA private key is stored in your macOS Keychain. Guard it carefully.
- Key rotation for PKG-based updates requires distributing the new version through existing channels.
- First release with auto-update support must be distributed via your website/GitHub — the updater only works for users already on a version that includes it.
```

---

## Doctor Mode (--doctor)

If `--doctor` is in the arguments, run a comprehensive validation of the auto-update setup and report results. Do NOT run the setup wizard.

### Checks to perform:

**Config checks:**
1. `ENABLE_AUTO_UPDATE=true` in `.env`
2. `AUTO_UPDATE_EDDSA_PUBLIC_KEY` is set and non-empty
3. `AUTO_UPDATE_MODE` is set (should be "public")

**Framework checks (platform-dependent):**
4. macOS: `external/Sparkle.framework` exists
5. macOS: `external/bin/sign_update` exists and is executable
6. macOS: `external/bin/generate_keys` exists and is executable
7. Windows: `external/WinSparkle/x64/WinSparkle.lib` exists
8. Windows: `external/WinSparkle/include/winsparkle.h` exists

**Source checks:**
9. `Source/AutoUpdater.h` exists
10. macOS: `Source/AutoUpdater_Mac.mm` exists
11. Windows: `Source/AutoUpdater_Win.cpp` exists
12. `Source/StandaloneApp.cpp` exists
13. `CMakeLists.txt` contains `ENABLE_AUTO_UPDATE`

**EdDSA key check:**
14. macOS: Run `./external/bin/generate_keys` to verify private key is in Keychain

**Feed checks:**
15. `AUTO_UPDATE_FEED_URL_MACOS` is set
16. `AUTO_UPDATE_FEED_URL_WINDOWS` is set
17. Check if `appcast-macos.xml` exists in repo root
18. Check if `appcast-windows.xml` exists in repo root
19. If appcast exists, verify it's valid XML (has `<rss>` and `<channel>` tags)
20. If appcast exists, check latest version matches current VERSION in `.env`

### Output format:

```
## Auto-Update Doctor

Config:
  {check or cross} ENABLE_AUTO_UPDATE=true
  {check or cross} AUTO_UPDATE_EDDSA_PUBLIC_KEY is set
  {check or cross} EdDSA private key available (Keychain or env)

Framework ({platform}):
  {check or cross} {framework} present in external/
  {check or cross} sign_update tool available

Sources:
  {check or cross} AutoUpdater.h
  {check or cross} AutoUpdater_{platform impl}
  {check or cross} StandaloneApp.cpp
  {check or cross} CMakeLists.txt has auto-update section

Feed:
  {check or cross} Feed URL configured
  {check or cross} Feed URL is reachable (curl -s -o /dev/null -w "%{http_code}")
  {check or cross} Appcast XML exists in repo root
  {check or cross} Appcast XML is valid (has <rss> and <channel> tags)
  {check or cross} Appcast version matches .env version

Artifacts (if appcast exists and has entries):
  {check or cross} Latest appcast enclosure URL is downloadable
  {check or cross} Downloaded file size matches appcast length attribute
  {check or cross} EdDSA signature in appcast verifies against downloaded file
  {check or cross} macOS: PKG is signed (pkgutil --check-signature) and notarized (spctl --assess --type install)
  {check or cross} Windows: Inno Setup .exe is Authenticode-signed (if applicable)

{N} checks passed, {M} issues found.
```

If issues are found, suggest fixes for each.

**Note:** Artifact checks require a published release. If no appcast entries exist, skip artifact checks and report "No releases published yet — artifact validation skipped."
