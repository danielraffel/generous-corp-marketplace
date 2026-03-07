---
description: Port an existing macOS JUCE plugin project to Windows and/or Linux
argument-hint: "<platform> [--audit-only] [--vm <alias>] [--test-ci]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Agent
---

# Port JUCE Plugin to Windows/Linux

Port an existing macOS JUCE plugin project to Windows and/or Linux. Scans for platform-specific code, generates a plan, applies changes, and optionally tests on a VM or via CI.

## Arguments

**Platform** (required):
- `windows` — Audit and port for Windows (MSVC + Ninja, D3D11)
- `linux` — Audit and port for Linux (Clang + Ninja, Vulkan)
- `all` — Audit and port for both platforms

**Options:**
- `--audit-only` — Just scan and report issues, don't make changes
- `--vm <alias>` — SSH alias for target platform VM (e.g., `--vm win`)
- `--test-ci` — After porting, trigger GitHub Actions CI to verify

## Implementation

### Stage 0: Detect Project

Verify this is a JUCE-Plugin-Starter project:

```bash
# Must have these files
test -f CMakeLists.txt || { echo "ERROR: No CMakeLists.txt — not a JUCE project"; exit 1; }
test -f .env || test -f .env.example || { echo "WARNING: No .env file found"; }
test -d scripts/ || { echo "WARNING: No scripts/ directory"; }
test -d Source/ || { echo "ERROR: No Source/ directory"; exit 1; }
```

Read `.env` to understand the project:
- `PROJECT_NAME` — plugin name
- `ENABLE_DIAGNOSTICS` — DiagnosticKit enabled?
- `USE_VISAGE_UI` — Visage GPU UI enabled?
- Feature flags that affect cross-platform behavior

Check git status — warn about uncommitted changes:
```bash
git status --short
```

### Stage 1: Audit

Scan the project for platform-specific dependencies and produce a structured report.

#### What to scan

**IMPORTANT: Visage is fully cross-platform.** It uses bgfx for rendering:
- macOS: Metal
- Windows: Direct3D11
- Linux: Vulkan
- Web/Emscripten: WebGL

Do NOT flag Visage as macOS-only. It compiles and runs on all platforms. The JuceVisageBridge may need platform-specific windowing code (NSView on macOS, HWND on Windows, X11 on Linux), but Visage itself works everywhere.

**Source files (*.cpp, *.h, *.mm):**

Scan for these platform-specific patterns:

| Pattern | Severity | Description |
|---------|----------|-------------|
| `.mm` files | HIGH | Objective-C++ — needs `#if JUCE_MAC` guard or platform alternative |
| `#import <Cocoa/` | HIGH | macOS framework import |
| `#import <AppKit/` | HIGH | macOS framework import |
| `#include <CoreAudio/` | HIGH | macOS audio framework |
| `#include <AudioToolbox/` | HIGH | macOS audio framework |
| `#include <CoreMIDI/` | MEDIUM | macOS MIDI — JUCE abstracts this |
| `#include <IOKit/` | MEDIUM | macOS hardware access |
| `#include <Security/` | MEDIUM | macOS keychain/security |
| `#include <Accelerate/` | MEDIUM | macOS math/DSP — use IPP or manual on Windows |
| `#include <execinfo.h>` | LOW | Unix backtrace — not on Windows |
| `#include <dlfcn.h>` | LOW | Unix dynamic loading — not on Windows |
| `NSView`, `NSWindow`, `NSApplication` | HIGH | macOS AppKit types |
| `NSEvent`, `NSColor`, `NSWorkspace` | HIGH | macOS AppKit types |
| `NSPasteboard` | MEDIUM | macOS clipboard — use JUCE SystemClipboard |
| `~/Library/` hardcoded | MEDIUM | macOS-specific path |
| `/usr/local/` hardcoded | LOW | Unix-specific path |
| `.app/Contents/` hardcoded | MEDIUM | macOS bundle path |

Also note already-handled patterns (no action needed):
- `#if JUCE_MAC` / `#if JUCE_WINDOWS` / `#if JUCE_LINUX` — already platform-guarded
- `#ifdef __APPLE__` — already handled
- `#if ! JUCE_WINDOWS` — already handled

**CMakeLists.txt:**

Check for:
- FETCHCONTENT_BASE_DIR — does it handle `$ENV{USERPROFILE}` for Windows?
- Platform conditionals: `if(APPLE)` / `if(WIN32)` / `if(MSVC)` / `if(UNIX)`
- macOS-specific: `CMAKE_OSX_DEPLOYMENT_TARGET`, `MACOSX_BUNDLE`, codesign commands
- MSVC flags needed: `/bigobj`, `_SILENCE_ALL_MS_EXT_DEPRECATION_WARNINGS`
- Plugin FORMATS: AU/AUv3 are macOS-only, need `if(APPLE)` guard
- Post-build scripts that reference macOS paths
- `.mm` files in `target_sources` — need `if(APPLE)` guard
- Visage `add_subdirectory` — should work on all platforms (no guard needed)
- External dependencies: check each for cross-platform support
- `file(TO_CMAKE_PATH ...)` for backslash handling on Windows

**Build scripts:**
- `build.sh` — check for Linux support (BUILD_PLATFORM detection)
- `build.ps1` — exists for Windows? If not, copy from JUCE-Plugin-Starter template
- `generate_and_open_xcode.sh` — macOS-only, OK to skip on other platforms

**External dependencies:**
- Visage: cross-platform via bgfx — should work on all platforms
- Essentia: check for prebuilt libs — may need Windows/Linux builds
- Sparkle: macOS-only auto-update framework — guard with `if(APPLE)`
- Bundled binaries (yt-dlp, ffmpeg, deno, etc.): need platform-specific versions
- FetchContent deps (JUCE, CLAP, Catch2): cross-platform, should work

**Bundled tools / installer binaries:**
- Check `installer_binaries/` for macOS-only binaries
- These tools (yt-dlp, ffmpeg, aria2c, deno, uv) are all cross-platform
- Need `.exe` versions for Windows, Linux binaries for Linux
- Flag as needing platform-specific packaging, not code changes

**Configuration:**
- `.env` — any platform-specific values
- `.github/workflows/` — CI for target platform exists?

#### Audit Output Format

Present findings as a structured table:

```
## Port Audit: <ProjectName> -> <Platform>

### Issues Found

| # | File | Line | Issue | Severity | Fix |
|---|------|------|-------|----------|-----|
| 1 | Source/Foo.mm | - | Objective-C++ file | HIGH | Wrap in if(APPLE) in CMakeLists.txt |
| 2 | Source/Bar.cpp | 45 | #include <dlfcn.h> | LOW | Add #if ! JUCE_WINDOWS guard |
| 3 | CMakeLists.txt | 50 | No MSVC flags | HIGH | Add if(MSVC) block |
| 4 | scripts/ | - | No build.ps1 | HIGH | Copy from template |

### Already Cross-Platform
- Source/PluginProcessor.cpp — no platform-specific code
- Source/DSP/*.cpp — pure C++, portable
- external/visage — fully cross-platform (D3D11 on Windows)

### External Dependencies
| Dependency | Status | Notes |
|-----------|--------|-------|
| JUCE | Cross-platform | Via FetchContent |
| Visage | Cross-platform | D3D11 on Windows, Vulkan on Linux |
| Essentia | macOS-only prebuilt | Need Windows/Linux builds |
| Sparkle | macOS-only | Skip on other platforms |

### Bundled Binaries (need platform versions)
| Binary | macOS | Windows | Linux |
|--------|-------|---------|-------|
| yt-dlp | yt-dlp | yt-dlp.exe | yt-dlp |
| ffmpeg | ffmpeg | ffmpeg.exe | ffmpeg |

### Estimated Effort: <LOW/MEDIUM/HIGH>
```

If `--audit-only` was specified, stop here and show the report.

### Stage 2: Plan

Present the audit results and ask the user how to proceed:

```
question: "Ready to port <ProjectName> to <Platform>?"
header: "Port Plan"
options:
  - label: "Execute all changes"
    description: "Create port/<platform> branch, apply all fixes"
  - label: "Execute selectively"
    description: "Walk through each change individually"
  - label: "Export plan only"
    description: "Save plan to docs/port-<platform>-plan.md"
```

### Stage 3: Execute

Create a feature branch and apply changes:

```bash
git checkout -b port/<platform>   # or feature/windows-build, etc.
```

Apply fixes in order of severity (HIGH first):

1. **CMakeLists.txt platform conditionals** — this is the most impactful change
   - Add FETCHCONTENT_BASE_DIR Windows path handling
   - Add `if(MSVC)` compile options block
   - Guard AU/AUv3 formats with `if(APPLE)`
   - Guard `.mm` files with `if(APPLE)`
   - Guard macOS-only external deps (Sparkle) with `if(APPLE)`
   - Guard post-build scripts with `if(APPLE)`
   - Ensure Visage `add_subdirectory` is NOT guarded (it's cross-platform)

2. **Source code platform guards** — fix compile errors
   - Add `#if ! JUCE_WINDOWS` around Unix-only headers
   - Add `#if JUCE_MAC` around macOS-specific API usage
   - Replace deprecated APIs (e.g., `PopupMenu::show()` → `showMenu()`)
   - Fix MSVC-specific issues (non-virtual override, template quirks)

3. **Build scripts** — ensure Windows/Linux can build
   - Copy `build.ps1` from JUCE-Plugin-Starter template if missing
   - Verify `build.sh` has Linux BUILD_PLATFORM detection

4. **External dependencies** — handle platform-specific deps
   - Guard macOS-only deps in CMakeLists.txt
   - Note which deps need cross-platform builds (report, don't fix)

After each change, commit with a descriptive message.

### Stage 4: Test

Ask the user how to verify:

```
question: "How do you want to test the <Platform> port?"
header: "Testing"
options:
  - label: "Local VM"
    description: "Test on your VM via SSH"
  - label: "GitHub Actions"
    description: "Push branch and trigger CI"
  - label: "Both"
    description: "CI first, then VM for thorough testing"
  - label: "Skip testing"
    description: "I'll test later"
```

#### VM Testing

If VM testing is selected and `--vm <alias>` is provided:

1. Push the branch to remote
2. SSH to VM, pull the branch
3. Run the build:
   - Windows: Create a `.bat` file that calls VsDevCmd.bat then cmake (avoid quoting issues over SSH)
   - Linux: Run `./scripts/build.sh all` directly
4. Report results
5. If failures: analyze errors, fix locally, push, repeat

**Windows VM build pattern** (use .bat files to avoid SSH quoting issues):
```bash
# Write bat file via SSH
cat << 'BATEOF' | ssh <vm> "powershell -Command \"\$input | Set-Content -Path C:\\Users\\<user>\\build.bat -Encoding ASCII\""
@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat" -arch=arm64 -host_arch=arm64
cd /d <project_path>
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release 2>&1
if errorlevel 1 exit /b 1
cmake --build build --config Release 2>&1
BATEOF

# Execute it
ssh <vm> "<build.bat path>"
```

**Key learnings from cross-platform porting:**
- Read `docs/cross-platform-learnings.md` if it exists — it has known gotchas
- Windows ARM64 VMs may have x86-64 emulation issues with some tools
- JUCE cache at `~/.juce_cache/` is generator-specific — clear when switching
- Use `VsDevCmd.bat` not `Enter-VsDevShell` (latter changes CWD)
- `cmd /c` with nested quotes fails over SSH — use `.bat` scripts

#### CI Testing

If CI testing is selected:
```bash
git push -u origin port/<platform>
gh run watch   # or gh workflow run build.yml --ref port/<platform>
```

## VM Configuration

VM details are stored in `.claude/juce-dev.local.md`:

```yaml
---
vms:
  windows:
    ssh: win
    project_path: "C:\\Users\\daniel\\Code\\ProjectName"
    shell: powershell
  linux:
    ssh: linux
    project_path: /home/daniel/Code/ProjectName
    shell: bash
---
```

If no VM config exists and `--vm` is used, ask the user:

```
question: "What's your SSH alias for the Windows VM?"
```

Save it to `.claude/juce-dev.local.md` for future use.

## Reference: Cross-Platform Learnings

Before executing, check if `docs/cross-platform-learnings.md` exists in the project. It contains known gotchas and solutions discovered during previous porting work.

Key facts:
- **Visage is fully cross-platform** (Metal/D3D11/Vulkan/WebGL via bgfx). NEVER skip Visage on non-macOS platforms.
- **bgfx shaderc.exe** bundled with Visage is x86-64 — may crash on ARM64 Windows. Need ARM64 build or Windows SDK installed.
- **Windows SDK** is needed for D3D11 shader compilation (fxc.exe/dxc.exe).
- **FETCHCONTENT_BASE_DIR** backslashes on Windows cause CMake escape errors — use `file(TO_CMAKE_PATH ...)`.
- **`sed -i`** differs between macOS (`sed -i ''`) and Linux (`sed -i`) — use platform detection.
- **AU/AUv3** formats are macOS-only — guard with `if(APPLE)` in CMakeLists.txt.
- **Essentia** may have macOS-only prebuilt libs — check for cross-platform builds.
- **Sparkle** auto-update is macOS-only — guard with `if(APPLE)`.
- **Bundled binaries** (yt-dlp, ffmpeg, etc.) are cross-platform but need platform-specific builds.
