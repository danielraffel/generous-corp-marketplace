---
name: juce-visage
description: Guide for integrating the Visage GPU-accelerated UI framework with JUCE audio plugins on macOS and iOS/iPadOS. Covers Metal view embedding, event bridging, focus management, keyboard handling in DAW hosts, popups/modals/dropdowns, memory management, destruction ordering, native standalone appearance, required Visage patches, iOS touch event handling, safe area insets, and comprehensive Visage API reference (Canvas, Frame, Widget, Theme, Dimension, PostEffect, Event system). Patterns derived from production plugin development. Use this skill whenever building or debugging JUCE+Visage plugin UI, even if the user doesn't explicitly mention "Visage" — trigger on mentions of Metal rendering in JUCE, GPU UI in audio plugins, embedded MTKView, or bridge layers between JUCE and a GPU framework.
---

# JUCE + Visage Integration Guide

This skill covers how to build a JUCE audio plugin (AU/VST3/Standalone) or iOS/iPadOS app that uses Visage for its UI.

**Scope**: macOS and iOS/iPadOS (Metal rendering, `NSView`/`UIView` embedding, event bridging). On macOS, the bridge forwards mouse events from JUCE to Visage. On iOS, Visage's `VisageMetalView` handles touch events natively — the bridge skips mouse forwarding entirely.

**Tested with**: Visage (VitalAudio fork, included directly in repo), JUCE 7/8, Logic Pro, Ableton Live, Reaper.

## When to Use This Skill

Use when:
- Starting a new JUCE plugin project that will use Visage for its UI
- Adding Visage UI to an existing JUCE plugin
- Building a JUCE iOS/iPadOS app with Visage GPU-accelerated UI
- Debugging rendering, keyboard, mouse, touch, or focus issues in a JUCE+Visage plugin/app
- Building modals, overlays, dropdowns, or secondary windows with Visage inside JUCE
- Porting Visage standalone patterns into a DAW plugin context
- Troubleshooting AU/VST3 validation timeouts or scanner failures
- Making a standalone JUCE+Visage app look native on macOS
- Adapting macOS Visage UI for iOS touch interaction and safe areas

Do NOT use when:
- Building a pure JUCE UI (no Visage)
- Building a standalone Visage app without JUCE
- Working on audio processing, DSP, or MIDI logic unrelated to the UI layer

## Per-Project Notes

This skill provides generic patterns. Each project should maintain a **`docs/juce-visage-notes.md`** file with project-specific details — bridge layer file paths, applied patches, destruction sequences, popup/modal/dropdown inventories, JUCE exceptions, technical debt, and learnings.

### Claude's behavior with per-project notes:
- **On Visage tasks**: Look for `docs/juce-visage-notes.md` in the project root. Read it alongside this skill.
- **If missing**: Offer to create it from the template in `references/troubleshooting.md` (see "Maintaining Per-Project Notes").
- **After solving issues**: Update the per-project file with new learnings, new popup/modal instances, or newly discovered patterns.

## Architecture Overview

JUCE owns the plugin window (the `AudioProcessorEditor` and its native peer). Visage owns a Metal-based render loop via an `MTKView`. The two frameworks have no built-in awareness of each other — every event (mouse, keyboard, clipboard, focus, resize) must be manually bridged.

```
JUCE AudioProcessorEditor
  └── JuceVisageBridge (juce::Component + juce::Timer)
        ├── visage::ApplicationWindow (embedded MTKView as child of JUCE peer NSView)
        │     └── VisageAppView (MTKView, Metal render loop)
        ├── visage::Frame* rootFrame (top of the Visage frame tree)
        │     └── [child frames: buttons, text editors, panels...]
        ├── visage::FrameEventHandler (callbacks into JUCE: clipboard, focus, cursor, redraw)
        └── Focus/event state tracking
```

The `ApplicationWindow` is created in **plugin mode**: no `NSWindow` is created. Instead, the `VisageAppView` (an `MTKView`) is added as a subview of the JUCE peer's `NSView` via `[parentView addSubview:view_]`.

## Quick Start: Minimal Integration

### 1. Build System Setup (CMakeLists.txt)

Add Visage as a subdirectory and link it to your plugin target:

```cmake
# Add Visage
add_subdirectory(external/visage)

# Link to your JUCE plugin target
# Common target names: VisageApp, VisageUi, VisageGraphics, VisageWindowing, VisageWidgets, VisageUtils
# Upstream may expose a single 'visage' target instead.
target_link_libraries(YourPlugin
    PRIVATE
        VisageApp
        VisageUi
        VisageWidgets
        VisageGraphics
        VisageWindowing
        VisageUtils
        juce::juce_audio_processors
        juce::juce_gui_basics
)

# Include paths for Visage headers
target_include_directories(YourPlugin PRIVATE
    ${CMAKE_SOURCE_DIR}/external/visage
    ${CMAKE_SOURCE_DIR}/external/visage/visage_ui
    ${CMAKE_SOURCE_DIR}/external/visage/visage_graphics
    ${CMAKE_SOURCE_DIR}/external/visage/visage_windowing
    ${CMAKE_SOURCE_DIR}/external/visage/visage_app
    ${CMAKE_SOURCE_DIR}/external/visage/visage_widgets
    ${CMAKE_SOURCE_DIR}/external/visage/visage_utils
)
```

Include Visage directly in the repository (not as a git submodule) so you can maintain patches.

### 2. Bridge Component Class

Create a JUCE component that hosts the Visage window:

```cpp
class JuceVisageBridge : public juce::Component,
                         public juce::Timer,
                         public juce::ComponentListener {
public:
    JuceVisageBridge() {
        setOpaque(true);
        setWantsKeyboardFocus(false);     // Start without focus; enable when TextEditor activates
        setInterceptsMouseClicks(true, true);
        setMouseClickGrabsKeyboardFocus(false);

        // Configure Visage event handler
        eventHandler.request_keyboard_focus = [this](visage::Frame* child) {
            setFocusedChild(child);
        };
        eventHandler.read_clipboard_text = []() -> std::string {
            return juce::SystemClipboard::getTextFromClipboard().toStdString();
        };
        eventHandler.set_clipboard_text = [](const std::string& text) {
            juce::SystemClipboard::copyTextToClipboard(juce::String(text));
        };
        eventHandler.set_cursor_style = [this](visage::MouseCursor cursor) {
            // Map visage::MouseCursor to juce::MouseCursor
        };
        eventHandler.request_redraw = [this](visage::Frame* frame) {
            repaint();
        };
    }

    void setRootFrame(visage::Frame* frame) {
        rootFrame = frame;
        if (rootFrame) rootFrame->setEventHandler(&eventHandler);
    }

    void createEmbeddedWindow() {
        if (visageWindow || !isShowing() || !getPeer()) return;

        auto* peer = getPeer();
        void* parentHandle = peer->getNativeHandle();
        auto bounds = getLocalBounds();
        if (bounds.getWidth() <= 0 || bounds.getHeight() <= 0) return;

        visageWindow = std::make_unique<visage::ApplicationWindow>();
        float scale = juce::Desktop::getInstance().getDisplays()
                          .getDisplayForPoint(getScreenPosition())->scale;
        visageWindow->setDpiScale(scale);

        int w = bounds.getWidth();
        int h = bounds.getHeight();
        visageWindow->show(
            visage::Dimension::logicalPixels(w),
            visage::Dimension::logicalPixels(h),
            parentHandle  // NSView* on macOS — triggers plugin-mode embedding
        );
        visageWindow->setBounds(0, 0, w, h);

        if (rootFrame) {
            rootFrame->init();
            visageWindow->addChild(rootFrame);
            rootFrame->setBounds(0, 0, w, h);
        }

        // Flush first Metal frame to prevent pink/magenta flash
        visageWindow->drawWindow();
    }

private:
    std::unique_ptr<visage::ApplicationWindow> visageWindow;
    visage::Frame* rootFrame = nullptr;
    visage::Frame* focusedChild = nullptr;
    visage::FrameEventHandler eventHandler;
};
```

### 3. Plugin Editor

```cpp
class MyPluginEditor : public juce::AudioProcessorEditor,
                       public juce::Timer {
public:
    MyPluginEditor(MyProcessor& p) : AudioProcessorEditor(p) {
        setSize(800, 600);
        startTimer(10); // Defer UI creation until bounds are valid
    }

    ~MyPluginEditor() override {
        stopTimer();
        if (bridge) bridge->shutdownRendering(); // CRITICAL: stop Metal before freeing frames
        if (rootFrame) rootFrame->removeAllChildren();
        rootFrame.reset();
        bridge.reset();
    }

    void timerCallback() override {
        if (!rootFrame && getLocalBounds().getWidth() > 0) {
            stopTimer();
            createVisageUI();
            startTimer(33); // Switch to 30fps update polling
        }
        // Use this timer for polling processor state, updating UI, etc.
    }

    void createVisageUI() {
        rootFrame = std::make_unique<visage::Frame>();
        // Create children and add to rootFrame...
        // Do NOT set child bounds here — they will be set in layoutChildren()
        // (DPI may still be 1.0 at this point; correct DPI arrives later via addChild propagation)

        // Native title bar for standalone mode.
        // CRITICAL: setUsingNativeTitleBar() removes JUCE's drawn border (27px top + 1px sides)
        // but the window stays the same native size, inflating the editor by ~28px.
        // Re-assert setSize() immediately after to force correct dimensions.
        if (auto* window = findParentComponentOfClass<juce::DocumentWindow>()) {
            window->setUsingNativeTitleBar(true);
            setSize(800, 600); // Must re-assert after title bar switch
        }

        bridge = std::make_unique<JuceVisageBridge>();
        addAndMakeVisible(*bridge);
        bridge->setRootFrame(rootFrame.get());
    }

    void resized() override {
        if (bridge) bridge->setBounds(getLocalBounds());
        if (rootFrame) {
            rootFrame->setBounds(0, 0, getWidth(), getHeight());
            layoutChildren(); // Always re-set child bounds — ensures native_bounds_ uses current DPI
        }
    }

    void layoutChildren() {
        // Set all child frame bounds here, not in createVisageUI().
        // This is called from resized(), which fires after DPI is correct,
        // ensuring native_bounds_ = (bounds * dpi_scale).round() uses the real DPI.
    }

private:
    std::unique_ptr<JuceVisageBridge> bridge;
    std::unique_ptr<visage::Frame> rootFrame;
};
```

## Critical Integration Patterns

### Window Creation Timing

**Never create the Visage window in the constructor.** JUCE may call the constructor before the native peer exists or before the component has valid bounds. Always defer:

```cpp
// BAD: crashes or produces zero-size window
MyEditor() { createVisageUI(); }

// GOOD: defer until ready
MyEditor() { startTimer(10); }
void timerCallback() {
    if (isShowing() && getPeer() && getWidth() > 0) {
        createVisageUI();
    }
}
```

For secondary windows (`DocumentWindow`), defer further — use `callAfterDelay(50, ...)` if the native handle is not yet available, as plugin hosts may need extra time to set up the peer.

### Destruction Order

The Metal display link can fire at up to 120 Hz on ProMotion displays (60 Hz with the FPS cap patch applied) and holds raw pointers to Visage frames. If you free frames while the display link is running, you get use-after-free crashes. Always:

```cpp
~MyPluginEditor() {
    bridge->shutdownRendering();        // 1. Stop Metal render loop
    // 2. Destroy overlays and modals
    // 3. Destroy UI panels
    // 4. Destroy child frames
    bridge->setRootFrame(nullptr);      // 5. Disconnect bridge from frame tree
    rootFrame->removeAllChildren();     // 6. Remove all children
    rootFrame.reset();                  // 7. Destroy root frame
    bridge.reset();                     // 8. Destroy bridge LAST
}
```

See `references/troubleshooting.md` for the full 11-step destruction sequence and memory management patterns.

## Key Concepts

### Memory & Lifetime Management

All frames should be owned via `std::unique_ptr<visage::Frame>`. The bridge holds a non-owning pointer. Modals and popups need defensive patterns (`isClosing_` guard, weak-pointer pattern, active registry with mutex) because they can be dismissed asynchronously.

**Details**: `references/troubleshooting.md` — Memory Management, Modal/Popup Lifetime Safety, Dropdown Cleanup

### Event Bridging & Focus (macOS)

JUCE and Visage use different key code and modifier systems. The critical conversions: Cmd must map to `kModifierCmd` (not `kModifierMacCtrl`), and modifier+letter combos need explicit `KeyCode` mapping. Mouse events use a "mouse-down frame capture" pattern. Focus requires dynamic toggling of `setWantsKeyboardFocus()`.

**Details**: `references/platform-macos.md` — Event Bridging, Focus Management, Plugin-Specific Fixes

### iOS Differences

On iOS, `VisageMetalView` handles touches natively — the bridge must NOT forward JUCE mouse events (causes double events). Guard mouse overrides with `#if !JUCE_IOS`. Always apply safe area insets. Minimum 44pt touch targets.

**Details**: `references/platform-ios.md`

### Popups, Modals & Dropdowns

All in-plugin UI should render inside the Visage GPU layer — no JUCE native popups. Four systems available: `visage::PopupMenu` (context menus), `VisageDropdownComboBox` (inline selectors), `VisageModalDialog` (full-screen modals), `VisageOverlayBase` (animated overlays with blur). Pick one overlay system per project.

**Details**: `references/ui-patterns.md` — Popups, Dropdowns, and Modals; Z-Order Summary

### Visage API

Comprehensive reference for Frame, Canvas, Color/Brush/Theme, Font, PostEffect, Widget, Event, and Dimension systems. Also includes JUCE-to-Visage migration tables and build system (CMake, font embedding, FetchContent).

**Details**: `references/visage-api.md`

## Reference Files

Read these as needed based on the task at hand:

| File | When to Read | Content |
|------|-------------|---------|
| `references/visage-api.md` | Building UI, drawing, theming, using widgets, migrating from JUCE | Frame, Canvas, Color/Brush/Theme, Font, PostEffect, Widget, Event, Dimension APIs + JUCE migration tables + CMake build system |
| `references/platform-macos.md` | macOS standalone appearance, DAW plugin keyboard issues, applying Visage patches | Native title bar, menu bar, keyboard shortcuts, event bridging, focus management, all plugin-specific fixes, patches checklist |
| `references/platform-ios.md` | iOS/iPadOS integration, touch events, safe areas | Bridge simplification, DPI, safe area insets, touch guidelines, platform limitations |
| `references/ui-patterns.md` | Building popups, dropdowns, modals, secondary windows, text editors | Frame essentials, TextEditor integration, all 4 popup/modal systems, z-order, secondary windows |
| `references/troubleshooting.md` | Debugging crashes, startup timeouts, rendering issues | Memory management, destruction ordering, AU/VST3 startup optimization, dirty rects, watchdog timer, common mistakes table, file reference |
