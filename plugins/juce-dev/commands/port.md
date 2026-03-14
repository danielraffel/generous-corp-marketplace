---
description: Port a JUCE plugin project between macOS, Windows, and Linux
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

# Port JUCE Plugin Cross-Platform

Port an existing JUCE plugin project to another platform. Supports porting in any direction: macOS → Windows/Linux, or Windows → macOS/Linux. Scans for platform-specific code, generates a plan, applies changes, and optionally tests on a VM or via CI.

## Arguments

**Platform** (required) — the **target** platform you're porting TO:
- `windows` — Port to Windows (MSVC + Ninja, D3D11)
- `linux` — Port to Linux (Clang + Ninja, Vulkan)
- `macos` — Port to macOS (Apple Clang + Xcode/Ninja, Metal)
- `all` — Port to all other platforms

**Options:**
- `--audit-only` — Just scan and report issues, don't make changes
- `--vm <alias>` — SSH alias for target platform VM (e.g., `--vm win`)
- `--test-ci` — After porting, trigger GitHub Actions CI to verify

## Implementation

### Stage 0: Detect Project and Source Platform

Verify this is a JUCE-Plugin-Starter project:

```bash
# Must have these files
test -f CMakeLists.txt || { echo "ERROR: No CMakeLists.txt — not a JUCE project"; exit 1; }
test -f .env || test -f .env.example || { echo "WARNING: No .env file found"; }
test -d scripts/ || { echo "WARNING: No scripts/ directory"; }
test -d Source/ || { echo "ERROR: No Source/ directory"; exit 1; }
```

**Detect the source platform** (what the project was built on):

```bash
# Check for macOS-origin indicators
has_mm_files=$(find Source/ -name "*.mm" 2>/dev/null | head -1)
has_xcode_script=$(test -f scripts/generate_and_open_xcode.sh && echo "yes")
has_build_sh=$(test -f scripts/build.sh && echo "yes")

# Check for Windows-origin indicators
has_ps1=$(test -f scripts/build.ps1 && echo "yes")
has_msvc_cmake=$(grep -l "if(MSVC)" CMakeLists.txt 2>/dev/null)
has_azure_signing=$(grep -l "AZURE_TENANT_ID" .env 2>/dev/null || grep -l "AZURE_TENANT_ID" .env.example 2>/dev/null)
has_inno_setup=$(grep -rl "Inno Setup\|\.iss" scripts/ 2>/dev/null | head -1)

# Check for Linux-origin indicators
has_linux_cmake=$(grep -l "UNIX AND NOT APPLE" CMakeLists.txt 2>/dev/null)
has_linux_deps=$(grep -l "libasound2-dev\|libwebkit2gtk" scripts/dependencies.sh 2>/dev/null)
has_linux_updater=$(test -f Source/AutoUpdater_Linux.cpp && echo "yes")
```

Determine source platform:
- If `.mm` files, Xcode script, or macOS post-build scripts exist → **macOS-origin**
- If `build.ps1` exists without `build.sh`, or Azure signing vars are set, or Inno Setup references → **Windows-origin**
- If Linux CMake guards, Linux deps, or Linux updater exist without macOS/Windows indicators → **Linux-origin**
- If multiple indicators → **hybrid** (already partially cross-platform)
- If neither → ask the user

Validate the port direction makes sense:
- Porting macOS → macOS = error ("Already a macOS project")
- Porting Windows → Windows = error ("Already a Windows project")
- Porting Linux → Linux = error ("Already a Linux project")

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

**IMPORTANT: Visage is fully cross-platform.** It uses bgfx for rendering:
- macOS: Metal
- Windows: Direct3D11
- Linux: Vulkan
- Web/Emscripten: WebGL

Do NOT flag Visage as platform-only. It compiles and runs on all platforms. The JuceVisageBridge may need platform-specific windowing code (NSView on macOS, HWND on Windows, X11 on Linux), but Visage itself works everywhere.

---

#### If porting TO Windows or Linux (from macOS)

**Source files (*.cpp, *.h, *.mm):**

Scan for these macOS-specific patterns:

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

---

#### If porting TO Linux (from macOS or Windows)

**Source files:**

Scan for these platform-specific patterns that won't compile on Linux:

| Pattern | Severity | Description | Linux Fix |
|---------|----------|-------------|-----------|
| `.mm` files | HIGH | Objective-C++ — macOS only | Guard with `if(APPLE)` in CMakeLists.txt |
| `#import <Cocoa/` | HIGH | macOS framework | Guard with `#if JUCE_MAC` |
| `#import <AppKit/` | HIGH | macOS framework | Guard with `#if JUCE_MAC` |
| `#include <windows.h>` | HIGH | Windows API | Guard with `#if JUCE_WINDOWS` |
| `#include <d3d11.h>` | HIGH | DirectX headers | Guard with `#if JUCE_WINDOWS` |
| `NSView`, `NSWindow` | HIGH | macOS AppKit types | Guard with `#if JUCE_MAC` |
| `HWND`, `HINSTANCE` | HIGH | Win32 handle types | Guard with `#if JUCE_WINDOWS` |
| `~/Library/` hardcoded | MEDIUM | macOS-specific path | Use JUCE `File::getSpecialLocation()` |
| `%APPDATA%` hardcoded | MEDIUM | Windows-specific path | Use JUCE `File::getSpecialLocation()` |

**CMakeLists.txt:**
- Ensure `if(UNIX AND NOT APPLE)` block exists for Linux-specific settings
- Plugin FORMATS: must exclude AU/AUv3 (macOS-only)
- Compiler: Clang preferred (for consistency), but GCC also works
- Generator: Ninja (not Xcode or MSVC)
- Auto-update: Linux uses `AutoUpdater_Linux.cpp` (custom appcast poller, no external deps)

**Build scripts:**
- `build.sh` must detect Linux via `uname -s` = `Linux` and use Ninja
- No `generate_and_open_xcode.sh` needed (Xcode is macOS-only)
- No `build.ps1` needed (PowerShell is Windows-only)

**Dependencies:**
- All JUCE apt dependencies must be documented: `libasound2-dev libx11-dev libxinerama-dev libxext-dev libxrandr-dev libxcursor-dev libfreetype6-dev libwebkit2gtk-4.1-dev libglu1-mesa-dev libcurl4-openssl-dev pkg-config`
- `scripts/dependencies.sh` should handle Linux package installation
- Sparkle is macOS-only — on Linux, use custom appcast poller (`AutoUpdater_Linux.cpp`)
- WinSparkle is Windows-only — same as above
- Visage: cross-platform via bgfx (Vulkan on Linux) — no changes needed

**Linux-specific additions needed:**

| Addition | Priority | Description |
|----------|----------|-------------|
| `if(UNIX AND NOT APPLE)` CMake block | HIGH | Platform conditionals for Linux |
| `dependencies.sh` Linux section | HIGH | apt package installation |
| `build.sh` Linux detection | HIGH | Use Ninja, skip AU/AUv3 |
| `AutoUpdater_Linux.cpp` | MEDIUM | Custom appcast poller (if auto-updates enabled) |
| `CI_PLATFORMS` update | MEDIUM | Add `linux` to CI platforms |
| Packaging as tar.gz | LOW | No native installer format (unlike PKG/Inno Setup) |

---

#### If porting TO macOS (from Windows or Linux)

**Source files (*.cpp, *.h):**

Scan for these Windows-specific patterns:

| Pattern | Severity | Description | macOS Fix |
|---------|----------|-------------|-----------|
| `#include <windows.h>` | HIGH | Windows API header | Guard with `#if JUCE_WINDOWS` or use JUCE abstractions |
| `#include <d3d11.h>`, `<dxgi.h>` | HIGH | Direct3D headers | Guard — macOS uses Metal via Visage/bgfx |
| `#include <wrl/client.h>` | HIGH | Windows Runtime C++ (COM) | Guard with `#if JUCE_WINDOWS` |
| `#include <shlobj.h>`, `<shellapi.h>` | HIGH | Windows Shell API | Use JUCE `File::getSpecialLocation()` |
| `#include <combaseapi.h>`, `<oleauto.h>` | MEDIUM | COM automation | Guard with `#if JUCE_WINDOWS` |
| `#include <winsock2.h>` | MEDIUM | Windows sockets | Use JUCE `URL`/`StreamingSocket` |
| `#include <winreg.h>` | MEDIUM | Windows registry | Use JUCE `PropertiesFile` |
| `#include <mmsystem.h>` | MEDIUM | Windows multimedia | JUCE abstracts audio/MIDI |
| `#include <psapi.h>`, `<tlhelp32.h>` | LOW | Process APIs | Guard with `#if JUCE_WINDOWS` |
| `HWND`, `HINSTANCE`, `HMODULE`, `HKEY` | HIGH | Win32 handle types | Guard with `#if JUCE_WINDOWS` |
| `LPWSTR`, `LPCWSTR`, `DWORD`, `BOOL` | MEDIUM | Windows integer/string types | Guard with `#if JUCE_WINDOWS` |
| `CreateWindow`, `RegisterClass`, `DefWindowProc` | HIGH | Win32 windowing | Use JUCE component system |
| `PostMessage`, `SendMessage` | MEDIUM | Win32 message queue | Use JUCE `MessageManager` |
| `CoInitialize`, `CoCreateInstance` | HIGH | COM initialization | Guard — not needed on macOS |
| `IUnknown`, `IDispatch`, `IID_PPV_ARGS` | HIGH | COM interfaces | Guard — Windows-only |
| `HRESULT`, `SUCCEEDED`, `FAILED` | MEDIUM | COM error handling | Guard with `#if JUCE_WINDOWS` |
| `LoadLibrary`, `GetProcAddress` | MEDIUM | DLL loading | Use `dlopen`/`dlsym` or JUCE `DynamicLibrary` |
| `RegOpenKey`, `RegQueryValue` | MEDIUM | Registry access | Use JUCE `PropertiesFile` |
| `QueryPerformanceCounter` | LOW | High-precision timer | Use `std::chrono` or JUCE `Time` |
| `ShellExecute`, `CreateProcess` | MEDIUM | Process execution | Use JUCE `ChildProcess` |
| `OutputDebugString` | LOW | Debug output | Use `DBG()` or `juce::Logger` |
| `GetModuleHandle` | MEDIUM | Module handle | Guard with `#if JUCE_WINDOWS` |
| `WaitForSingleObject`, `CreateEvent` | MEDIUM | Sync primitives | Use `std::mutex`/`std::condition_variable` |
| `__declspec(dllexport/dllimport)` | HIGH | MSVC DLL export | Use `JUCE_API` or cross-platform macro |
| `#pragma comment(lib, ...)` | HIGH | MSVC linker directive | Use CMake `target_link_libraries` |
| `#pragma warning(disable:...)` | MEDIUM | MSVC warning suppression | Guard with `#if _MSC_VER` |
| `%APPDATA%`, `%LOCALAPPDATA%`, `%USERPROFILE%` | MEDIUM | Windows env paths | Use JUCE `File::getSpecialLocation()` |
| `C:\` hardcoded paths | MEDIUM | Windows paths | Use `juce::File` for path construction |
| `.dll` references | LOW | Windows dynamic libs | `.dylib` on macOS |
| `.exe` references | LOW | Windows executables | No extension on macOS |
| `ID3D11Device`, `IDXGISwapChain` | HIGH | Direct3D interfaces | Guard — Visage handles this via bgfx |
| `D3D11_*_DESC` structures | MEDIUM | Direct3D descriptors | Guard with `#if JUCE_WINDOWS` |

Also note already-handled patterns (no action needed):
- `#if JUCE_WINDOWS` / `#ifdef _WIN32` / `#ifdef _MSC_VER` — already platform-guarded
- `#if ! JUCE_MAC` — already handled
- `NOMINMAX`, `WIN32_LEAN_AND_MEAN` — compile definitions, usually guarded

**Windows resource files:**
- `.rc` files — Windows resource files (not needed on macOS, skip)
- `.manifest` files — Windows assembly manifests (not needed on macOS, skip)

**CMakeLists.txt:**

Check for:
- `if(MSVC)` blocks — need `if(APPLE)` equivalents added
- `if(WIN32)` blocks — verify macOS alternatives exist
- `$ENV{USERPROFILE}` — ensure `$ENV{HOME}` fallback exists
- `CMAKE_MSVC_DEBUG_INFORMATION_FORMAT` — macOS doesn't need this
- Missing `CMAKE_OSX_DEPLOYMENT_TARGET` — needs to be added (e.g., 10.15+)
- Missing `CMAKE_OSX_ARCHITECTURES` — add `arm64;x86_64` for universal binaries
- Plugin FORMATS — AU/AUv3 need to be added inside `if(APPLE)` block
- Missing macOS frameworks — CoreAudio, CoreMIDI, AppKit links
- Post-build codesign steps — need `if(APPLE)` block for signing
- `.mm` files — may need to be added for macOS-specific bridging
- Visage `add_subdirectory` — should already work (no changes needed)
- MSVC flags (`/bigobj`, `/permissive-`) — guard with `if(MSVC)` if not already
- `file(TO_CMAKE_PATH ...)` — still useful, no need to remove

**Build scripts:**
- `build.sh` — exists? If not, copy from JUCE-Plugin-Starter template
- `generate_and_open_xcode.sh` — exists? If not, copy from template
- `build.ps1` — Windows-only, OK to keep for Windows builds
- `scripts/post_build.sh` — macOS code signing script, may need to be added

**Installer and packaging:**
- Inno Setup `.iss` files — Windows-only installer, not needed on macOS
- Need macOS packaging: `.pkg` or `.dmg` creation (via `pkgbuild`/`productbuild`)
- `installer_binaries/` — need macOS versions of bundled tools

**External dependencies:**
- Visage: cross-platform — works on macOS via Metal (no changes needed)
- WinSparkle: Windows-only auto-updater — replace with Sparkle on macOS, guard with platform conditional
- FetchContent deps (JUCE, CLAP, Catch2): cross-platform, should work
- Any `.lib` static libraries — need `.a` equivalents for macOS

**macOS-specific additions needed:**

| Addition | Priority | Description |
|----------|----------|-------------|
| AU/AUv3 plugin format | HIGH | macOS-only formats — Logic Pro requires AU |
| Code signing setup | HIGH | Developer ID cert for distribution |
| Notarization setup | HIGH | Required for macOS distribution outside App Store |
| `CMAKE_OSX_DEPLOYMENT_TARGET` | HIGH | Minimum macOS version (e.g., 10.15) |
| `CMAKE_OSX_ARCHITECTURES` | HIGH | `arm64;x86_64` for Apple Silicon + Intel |
| `build.sh` script | HIGH | macOS/Linux build script |
| `generate_and_open_xcode.sh` | MEDIUM | Convenience script for Xcode development |
| macOS framework links | MEDIUM | CoreAudio, CoreMIDI, AppKit in CMakeLists.txt |
| `post_build.sh` | MEDIUM | AU validation, codesign, plugin install |
| `.env` macOS variables | MEDIUM | `APP_CERT`, `INSTALLER_CERT`, `TEAM_ID`, `APPLE_ID` |
| Bundle Info.plist | LOW | JUCE generates this, but verify it's correct |

---

#### Common checks (both directions)

**Configuration:**
- `.env` — any platform-specific values that need counterparts
- `.github/workflows/` — CI for target platform exists?

#### Audit Output Format

Present findings as a structured table:

```
## Port Audit: <ProjectName> (<SourcePlatform> → <TargetPlatform>)

### Issues Found

| # | File | Line | Issue | Severity | Fix |
|---|------|------|-------|----------|-----|
| 1 | Source/Foo.mm | - | Objective-C++ file | HIGH | Wrap in if(APPLE) in CMakeLists.txt |
| 2 | Source/Bar.cpp | 45 | #include <windows.h> | HIGH | Add #if JUCE_WINDOWS guard |
| 3 | CMakeLists.txt | 50 | No if(APPLE) block | HIGH | Add macOS platform conditionals |
| 4 | scripts/ | - | No build.sh | HIGH | Copy from template |

### Already Cross-Platform
- Source/PluginProcessor.cpp — no platform-specific code
- Source/DSP/*.cpp — pure C++, portable
- external/visage — fully cross-platform (Metal on macOS, D3D11 on Windows)

### External Dependencies
| Dependency | Status | Notes |
|-----------|--------|-------|
| JUCE | Cross-platform | Via FetchContent |
| Visage | Cross-platform | Metal on macOS, D3D11 on Windows, Vulkan on Linux |
| Essentia | Needs check | May have platform-specific prebuilt libs |
| WinSparkle | Windows-only | Replace with Sparkle on macOS |

### macOS Additions Needed (for Windows → macOS port)
| Addition | Priority |
|----------|----------|
| AU/AUv3 format support | HIGH |
| Code signing & notarization | HIGH |
| Universal binary (arm64 + x86_64) | HIGH |
| build.sh script | HIGH |

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
git checkout -b port/<platform>   # e.g., port/windows, port/macos, port/linux
```

Apply fixes in order of severity (HIGH first).

---

#### If porting TO Windows (from macOS or Linux)

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

3. **Build scripts** — ensure Windows can build
   - Copy `build.ps1` from JUCE-Plugin-Starter template if missing
   - If porting from Linux, also add macOS build scripts if missing

4. **External dependencies** — handle platform-specific deps
   - Guard macOS-only deps in CMakeLists.txt
   - Guard Linux-only deps (custom appcast poller) with `if(UNIX AND NOT APPLE)`
   - Note which deps need cross-platform builds (report, don't fix)

---

#### If porting TO Linux (from macOS or Windows)

1. **CMakeLists.txt platform conditionals**
   - Add `if(UNIX AND NOT APPLE)` block for Linux-specific settings
   - Guard AU/AUv3 formats with `if(APPLE)` if not already
   - Guard MSVC flags with `if(MSVC)` if not already
   - Ensure Clang is preferred via `find_program(CLANG_CXX_COMPILER clang++)`
   - Ensure Visage `add_subdirectory` is NOT guarded (cross-platform — Vulkan on Linux)

2. **Source code platform guards** — fix compile errors
   - Add `#if JUCE_MAC` around macOS-specific API usage (NSView, NSWindow, Cocoa)
   - Add `#if JUCE_WINDOWS` around Windows-only API usage (HWND, D3D11, COM)
   - Replace hardcoded paths with JUCE `File::getSpecialLocation()`

3. **Build scripts** — ensure Linux can build
   - Verify `build.sh` detects Linux (`uname -s` = `Linux`) and uses Ninja
   - Verify `dependencies.sh` has Linux apt package installation
   - Linux doesn't need `generate_and_open_xcode.sh` or `build.ps1`

4. **Auto-update** — add Linux updater if enabled
   - Copy `AutoUpdater_Linux.cpp` from JUCE-Plugin-Starter template
   - Add `elseif(UNIX AND NOT APPLE)` block in CMakeLists.txt auto-update section
   - Set `AUTO_UPDATE_FEED_URL_LINUX` in `.env` (or reuse `AUTO_UPDATE_FEED_URL`)

5. **External dependencies** — handle platform-specific deps
   - Guard macOS-only deps (Sparkle) with `if(APPLE)`
   - Guard Windows-only deps (WinSparkle) with `if(WIN32)`
   - Note JUCE apt dependencies needed for Linux build

---

#### If porting TO macOS (from Windows or Linux)

1. **CMakeLists.txt platform conditionals** — most impactful change
   - Add `CMAKE_OSX_DEPLOYMENT_TARGET` (e.g., `10.15` or as set in `.env`)
   - Add `CMAKE_OSX_ARCHITECTURES` (`arm64;x86_64` for universal binaries)
   - Add `if(APPLE)` block for AU/AUv3 plugin formats alongside existing VST3/CLAP/Standalone
   - Guard MSVC-specific flags (`/bigobj`, `/permissive-`, `CMAKE_MSVC_DEBUG_INFORMATION_FORMAT`) with `if(MSVC)` if not already guarded
   - Add macOS framework links inside `if(APPLE)`: `-framework CoreAudio`, `-framework CoreMIDI`, `-framework AppKit`
   - Add `if(APPLE)` post-build block for codesign and AU validation
   - Ensure `$ENV{HOME}` fallback exists alongside `$ENV{USERPROFILE}` for FETCHCONTENT_BASE_DIR
   - Ensure Visage `add_subdirectory` is NOT guarded (it's cross-platform — Metal on macOS)

2. **Source code platform guards** — fix compile errors
   - Add `#if JUCE_WINDOWS` around Windows-only headers (`<windows.h>`, `<d3d11.h>`, `<shlobj.h>`, etc.)
   - Add `#if JUCE_WINDOWS` around Win32 API usage (`CreateWindow`, `HWND`, COM calls)
   - Add `#if JUCE_WINDOWS` around DirectX code (Visage handles D3D→Metal via bgfx, but direct D3D calls need guarding)
   - Guard `__declspec` attributes with `#if _MSC_VER`
   - Guard `#pragma comment(lib, ...)` with `#if _MSC_VER`
   - Guard `#pragma warning(disable:...)` with `#if _MSC_VER`
   - Replace Windows path APIs with JUCE abstractions (`File::getSpecialLocation()`)
   - Replace registry access (`RegOpenKey`, etc.) with JUCE `PropertiesFile`
   - Replace `LoadLibrary`/`GetProcAddress` with JUCE `DynamicLibrary`
   - Replace `OutputDebugString` with `DBG()` or `juce::Logger`

3. **Build scripts** — ensure macOS can build
   - Copy `build.sh` from JUCE-Plugin-Starter template if missing
   - Copy `generate_and_open_xcode.sh` from template if missing
   - Copy `post_build.sh` from template if missing (codesign + AU validation)
   - Verify `build.sh` has macOS BUILD_PLATFORM detection (`Darwin` case in `uname -s`)

4. **macOS developer settings** — add to `.env`
   - Add `OSX_DEPLOYMENT_TARGET` if missing (e.g., `10.15`)
   - Add `OSX_ARCHITECTURES` if missing (e.g., `arm64;x86_64`)
   - Add code signing variables: `APP_CERT`, `INSTALLER_CERT`, `TEAM_ID`
   - Add notarization variables: `APPLE_ID`, `APP_SPECIFIC_PASSWORD`
   - Note: these can be left empty — build will work unsigned for development

5. **External dependencies** — handle platform-specific deps
   - Guard Windows-only deps (WinSparkle) with `if(WIN32)` in CMakeLists.txt
   - Guard macOS-only deps (Sparkle) with `if(APPLE)` in CMakeLists.txt
   - **Auto-updates**: If the source project has Sparkle (macOS→Windows port) or WinSparkle (Windows→macOS port), offer to add the counterpart framework for the target platform. Use `/juce-dev:setup-updates` to configure the counterpart.
   - Note which deps need target platform builds (report, don't fix)
   - Check `.lib` static libraries — may need `.a` equivalents

6. **Plugin format setup** — AU/AUv3 specific
   - AU requires correct manufacturer code (4-char) in CMake `PLUGIN_MANUFACTURER_CODE`
   - AUv3 requires App Sandbox entitlements
   - After build, validate AU with: `auval -v aufx <plugin_code> <manufacturer_code>`
   - Plugin install paths: `~/Library/Audio/Plug-Ins/Components/` (AU), `~/Library/Audio/Plug-Ins/VST3/` (VST3)

---

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
3. Run the build (platform-dependent — see below)
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

**macOS VM build pattern:**
```bash
# Build on macOS VM
ssh <vm> "cd <project_path> && git pull origin port/macos"

# Option 1: Use build.sh
ssh <vm> "cd <project_path> && ./scripts/build.sh all"

# Option 2: Use CMake directly (Ninja)
ssh <vm> "cd <project_path> && cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release && cmake --build build --config Release"

# Option 3: Generate Xcode project
ssh <vm> "cd <project_path> && cmake -B build-xcode -G Xcode && cmake --build build-xcode --config Release"

# Validate AU plugin (after successful build)
ssh <vm> "auval -v aufx <plugin_code> <manufacturer_code>"

# Check installed plugins
ssh <vm> "ls ~/Library/Audio/Plug-Ins/Components/ | grep <ProjectName>"
ssh <vm> "ls ~/Library/Audio/Plug-Ins/VST3/ | grep <ProjectName>"
```

**Linux VM build pattern:**
```bash
ssh <vm> "cd <project_path> && git pull origin port/linux && ./scripts/build.sh all"
```

**Key learnings from cross-platform porting:**
- Read `docs/cross-platform-learnings.md` if it exists — it has known gotchas
- Windows ARM64 VMs may have x86-64 emulation issues with some tools
- JUCE cache at `~/.juce_cache/` is generator-specific — clear when switching
- Use `VsDevCmd.bat` not `Enter-VsDevShell` (latter changes CWD)
- `cmd /c` with nested quotes fails over SSH — use `.bat` scripts
- macOS: Xcode/Clang is stricter than MSVC — narrowing conversions, implicit type casts will error
- macOS: Universal binaries (arm64 + x86_64) require ALL dependencies to be built for both architectures
- macOS: `killall -9 AudioComponentRegistrar` forces re-scan of AU plugins after install
- macOS: `auval -a` lists all registered AudioUnits — use to verify plugin shows up
- macOS: Hardened Runtime must be enabled for notarization (entitlements.plist)

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
    platform: windows
    project_path: "C:\\Users\\daniel\\Code\\ProjectName"
    shell: powershell
  linux:
    ssh: linux
    platform: linux
    project_path: /home/daniel/Code/ProjectName
    shell: bash
  macos:
    ssh: mac
    platform: macos
    project_path: /Users/daniel/Code/ProjectName
    shell: zsh
---
```

If no VM config exists and `--vm` is used, ask the user:

```
question: "What's your SSH alias for the <Platform> VM?"
```

Save it to `.claude/juce-dev.local.md` for future use.

## Reference: Cross-Platform Learnings

Before executing, check if `docs/cross-platform-learnings.md` exists in the project. It contains known gotchas and solutions discovered during previous porting work.

Key facts:
- **Visage is fully cross-platform** (Metal/D3D11/Vulkan/WebGL via bgfx). NEVER skip Visage on any platform.
- **bgfx shaderc.exe** bundled with Visage is x86-64 — may crash on ARM64 Windows. Need ARM64 build or Windows SDK installed. macOS universal binary works on Apple Silicon.
- **Windows SDK** is needed for D3D11 shader compilation (fxc.exe/dxc.exe).
- **FETCHCONTENT_BASE_DIR** backslashes on Windows cause CMake escape errors — use `file(TO_CMAKE_PATH ...)`.
- **`sed -i`** differs between macOS (`sed -i ''`) and Linux (`sed -i`) — use platform detection.
- **AU/AUv3** formats are macOS-only — guard with `if(APPLE)` in CMakeLists.txt.
- **Essentia** may have macOS-only prebuilt libs — check for cross-platform builds.
- **Sparkle** auto-update is macOS-only — guard with `if(APPLE)`.
- **WinSparkle** auto-update is Windows-only — guard with `if(WIN32)`.
- **Linux auto-update** uses custom appcast poller (`AutoUpdater_Linux.cpp`) — pure JUCE, no external deps. Guard with `if(UNIX AND NOT APPLE)`.
- **Linux tested on Ubuntu 24.04 LTS** (aarch64) — VST3, CLAP, Standalone all build and link. Catch2 tests pass. Auto-update compiles and integrates with Help menu.
- **Bundled binaries** (yt-dlp, ffmpeg, etc.) are cross-platform but need platform-specific builds.
- **Xcode/Clang strictness** — code that compiles on MSVC may fail on Clang due to stricter narrowing conversion and implicit cast rules.
- **Universal binaries** — macOS plugins should ship arm64 + x86_64. Set `CMAKE_OSX_ARCHITECTURES`.
- **Notarization** — required for macOS distribution. Needs Hardened Runtime, Developer ID cert, and `xcrun notarytool`.
- **Inno Setup** — Windows-only installer. macOS uses `pkgbuild`/`productbuild` or DMG.
- **Azure Trusted Signing** — Windows code signing service. macOS uses Apple Developer ID certificates in Keychain.
