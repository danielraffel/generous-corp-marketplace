---
description: Add iOS app target to an existing JUCE-Plugin-Starter project
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Add iOS App Target

Add an iOS/iPadOS app target to an existing JUCE-Plugin-Starter project. Detects whether Visage GPU UI is enabled and creates the appropriate iOS app files.

## Implementation

### Step 1: Verify Project

1. Check that the current working directory is a JUCE-Plugin-Starter project:
   - `CMakeLists.txt` must exist
   - `.env` must exist

2. If any are missing, tell the user this command must be run from a JUCE-Plugin-Starter project root.

3. Check if an iOS target already exists:
   - If `CMakeLists.txt` contains `juce_add_gui_app` with iOS configuration, tell the user an iOS target already exists.

### Step 2: Detect Visage Status

Check if Visage GPU UI is available:
- If `external/visage/` directory exists AND `.env` contains `USE_VISAGE_UI=TRUE` → **Visage mode**
- Otherwise → **Plain JUCE mode**

### Step 3: Detect Project Configuration

Read `.env` to extract:
- `PROJECT_NAME` (fallback: directory name)
- `PROJECT_BUNDLE_ID` (fallback: `com.example.appname`)
- `COMPANY_NAME` (fallback: "Company")

Read `Source/PluginProcessor.h` (if it exists) to understand the audio engine pattern.

### Step 4: Confirm

```
question: "Add iOS app target to this project?"
header: "iOS"
options:
  - label: "Yes, add iOS target (Recommended)"
    description: "Creates App/ directory with iOS-specific files and updates CMakeLists.txt"
  - label: "Cancel"
    description: "No changes will be made"
```

If Visage mode, note: "Will use Visage GPU-accelerated UI (Metal rendering, native touch events)"
If Plain JUCE mode, note: "Will use standard JUCE UI components"

### Step 5: Create iOS App Files

Create the `App/` directory with these files:

#### 5a: GriddyApp.cpp (Main entry point)

Create `App/{ProjectName}App.cpp`:
- Standard JUCE `START_JUCE_APPLICATION` with a `JUCEApplication` subclass
- Creates main window with `MainComponent` as content
- Configures for full-screen iOS display

#### 5b: MainComponent

**Visage mode** — Create `App/{ProjectName}MainComponent.h` and `.cpp`:
- Extends `juce::AudioAppComponent` with `juce::Timer`
- Uses `JuceVisageBridge` for Visage rendering
- Creates Visage Frame hierarchy in `createVisageUI()`
- Implements `layoutChildren()` with safe area insets
- Timer-based deferred window creation
- Includes `#if !JUCE_IOS` guards on mouse-related bridge code

**Plain JUCE mode** — Create `App/{ProjectName}MainComponent.h` and `.cpp`:
- Extends `juce::AudioAppComponent`
- Uses standard JUCE components (Slider, Button, Label)
- Standard `resized()` layout

#### 5c: Update CMakeLists.txt

Add iOS target section at the end of CMakeLists.txt:

```cmake
# iOS GUI App Target
if(IOS OR CMAKE_SYSTEM_NAME STREQUAL "iOS")
    juce_add_gui_app({ProjectName}App
        COMPANY_NAME ${COMPANY_NAME}
        BUNDLE_ID ${PROJECT_BUNDLE_ID}.app
        PRODUCT_NAME "{ProjectName}"
        VERSION ${PLUGIN_VERSION}
        BACKGROUND_AUDIO_ENABLED TRUE
        STATUS_BAR_HIDDEN TRUE
        REQUIRES_FULL_SCREEN TRUE
        IPHONE_SCREEN_ORIENTATIONS "UIInterfaceOrientationPortrait"
        IPAD_SCREEN_ORIENTATIONS "UIInterfaceOrientationPortrait"
    )

    juce_generate_juce_header({ProjectName}App)

    target_sources({ProjectName}App PRIVATE
        App/{ProjectName}App.cpp
        App/{ProjectName}MainComponent.cpp
        App/{ProjectName}MainComponent.h
    )

    # If Visage mode, also add:
    # Source/Visage/JuceVisageBridge.cpp
    # Source/Visage/JuceVisageBridge.h
    # All Source/UI/*.h frame files

    target_include_directories({ProjectName}App PRIVATE
        ${CMAKE_SOURCE_DIR}/Source
        ${CMAKE_SOURCE_DIR}/App
    )

    # If Visage mode, also add visage include paths

    target_compile_features({ProjectName}App PRIVATE cxx_std_17)

    target_compile_definitions({ProjectName}App PRIVATE
        JUCE_USE_CURL=0
        JUCE_WEB_BROWSER=0
        JUCE_DISPLAY_SPLASH_SCREEN=0
    )

    target_link_libraries({ProjectName}App PRIVATE
        juce::juce_audio_basics
        juce::juce_audio_devices
        juce::juce_audio_formats
        juce::juce_audio_processors
        juce::juce_audio_utils
        juce::juce_core
        juce::juce_data_structures
        juce::juce_dsp
        juce::juce_events
        juce::juce_graphics
        juce::juce_gui_basics
        juce::juce_gui_extra
    )

    # If Visage mode:
    # target_link_libraries({ProjectName}App PRIVATE visage)

    # Allow simulator builds without signing
    set_target_properties({ProjectName}App PROPERTIES
        XCODE_ATTRIBUTE_CODE_SIGNING_ALLOWED[sdk=iphonesimulator*] "NO"
        XCODE_ATTRIBUTE_CODE_SIGNING_REQUIRED[sdk=iphonesimulator*] "NO"
        XCODE_ATTRIBUTE_CODE_SIGN_IDENTITY[sdk=iphonesimulator*] ""
    )
endif()
```

### Step 6: Summary

Tell the user:

```
iOS app target has been added to your project.

### Build for iOS Simulator

cmake -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS
xcodebuild -project build-ios/{ProjectName}.xcodeproj -scheme {ProjectName}App -sdk iphonesimulator -configuration Debug

### Build for Device (requires signing)

cmake -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS -DDEVELOPMENT_TEAM=YOUR_TEAM_ID
xcodebuild -project build-ios/{ProjectName}.xcodeproj -scheme {ProjectName}App -sdk iphoneos -configuration Debug

### iOS-specific notes

- Safe area insets: Content respects notch/home indicator automatically
- Touch targets: All interactive elements are 44pt+ for reliable touch
- No hover states: iOS has no cursor hover (press/active states only)
```

If Visage mode, also mention:
```
### Visage GPU UI

- Metal rendering is handled natively by VisageMetalView
- Touch events are mapped to Visage mouse events automatically
- The `juce-visage` skill has an iOS/iPadOS Integration section for reference
- DPI scale: 2x (standard Retina) or 3x (iPhone Pro/Max)
```
