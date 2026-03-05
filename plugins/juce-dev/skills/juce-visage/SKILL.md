---
name: juce-visage
description: Guide for integrating the Visage GPU-accelerated UI framework with JUCE audio plugins on macOS and iOS/iPadOS. Covers Metal view embedding, event bridging, focus management, keyboard handling in DAW hosts, popups/modals/dropdowns, memory management, destruction ordering, native standalone appearance, required Visage patches, iOS touch event handling, safe area insets, and comprehensive Visage API reference (Canvas, Frame, Widget, Theme, Dimension, PostEffect, Event system). Patterns derived from production plugin development.
---

# JUCE + Visage Integration Guide

This skill covers how to build a JUCE audio plugin (AU/VST3/Standalone) or iOS/iPadOS app that uses Visage for its UI.

**Scope**: macOS and iOS/iPadOS (Metal rendering, `NSView`/`UIView` embedding, event bridging). On macOS, the bridge forwards mouse events from JUCE to Visage. On iOS, Visage's `VisageMetalView` handles touch events natively — the bridge skips mouse forwarding entirely. Windows/Linux patterns differ for windowing and key handling but the bridge architecture and Frame patterns apply cross-platform.

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
- **If missing**: Offer to create it from the template below.
- **After solving issues**: Update the per-project file with new learnings, new popup/modal instances, or newly discovered patterns.

### Template for new projects

```markdown
# JUCE+Visage Integration Notes — [Project Name]

<!-- This file is used by the juce-visage Claude skill. -->
<!-- It stores project-specific Visage integration details. -->
<!-- Update it as you add UI components, apply patches, or discover patterns. -->

## Bridge Layer Files

| File | Purpose |
|------|---------|
| <!-- e.g. Source/Visage/Bridge.h/cpp --> | <!-- Primary bridge: window, events, focus --> |

## Visage Patches Applied

- [ ] `performKeyEquivalent:` (windowing_macos.mm) — Two-tier: text editing + plugin Cmd+key shortcuts (macOS only)
- [ ] Keyboard focus initialization (bridge + editor) — `setAcceptsKeystrokes(true)` + `setKeyboardFocusOnFrame()` for Cmd+key shortcuts
- [ ] Cmd+Q propagation (windowing_macos.mm) — `[[self nextResponder] keyDown:event]` (macOS only)
- [ ] MTKView 60 FPS cap (windowing_macos.mm) — Prevent excessive GPU on ProMotion displays (macOS only)
- [ ] Popup menu overflow positioning (popup_menu.cpp) — Above-position fix (cross-platform)
- [ ] Single-line Up/Down arrows (text_editor.cpp) — Up→start, Down→end (cross-platform)
- [ ] setAlwaysOnTop guard (application_window.cpp) — Only call when always_on_top_ is true (cross-platform)
- [ ] DPI scale native bounds recalculation (frame.h) — Recalculate native_bounds_ in setDpiScale() (cross-platform)
- [ ] iOS bridge mouse guard (JuceVisageBridge.h/cpp) — `#if !JUCE_IOS` around mouse overrides (iOS only)
- [ ] iOS modifier mapping (JuceVisageBridge.cpp) — `#if JUCE_MAC || JUCE_IOS` for Cmd key (iOS only)

## JUCE Integration Patterns Applied

- [ ] `setSize()` after `setUsingNativeTitleBar(true)` — Re-assert editor size after switching to native title bar (macOS standalone). Without this, the editor inflates by ~28px height and ~2px width, causing empty space in the Visage rendering.
- [ ] Overlay/modal bounds clamping — All overlays, modals, and settings panels clamp their dimensions to `width()`/`height()` of the host frame. Never use hardcoded panel sizes that could exceed the frame bounds, or the panel position goes negative and content is clipped.

## Destruction Sequence

<!-- Document your plugin editor destructor ordering here -->
<!-- Example:
1. Stop timers
2. shutdownRendering()
3. Destroy overlays/modals
4. Destroy panels
5. Disconnect bridge from frame tree
6. removeAllChildren()
7. Destroy root frame
8. Destroy bridge
-->

## PopupMenu Instances

<!-- List all visage::PopupMenu usage locations -->

## Dropdown Instances

<!-- List all VisageDropdownComboBox usage locations -->

## Modal Dialog Instances

<!-- List all VisageModalDialog::show() and VisageOverlayBase usage locations -->

## JUCE AlertWindow Exceptions

<!-- List any places where JUCE native UI is used instead of Visage, with justification -->

## Known Technical Debt

<!-- Track Visage-related technical debt items -->

## Project-Specific Learnings

<!-- Debugging insights, workarounds, and patterns specific to this project -->
```

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
        // if (myPanel) myPanel->setBounds(20, 40, 220, 210);
        // if (otherPanel) otherPanel->setBounds(260, 40, 220, 210);
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

## Memory Management Best Practices

### Frame Ownership

All frames should be owned via `std::unique_ptr<visage::Frame>`. Use raw pointers only for temporary references (e.g., `rootFrame.get()` passed to the bridge). The bridge holds a non-owning pointer; the editor owns the frame tree.

### Destruction Ordering Principles

The general destruction sequence for a JUCE+Visage plugin editor:

1. **Stop all timers** — prevents timer callbacks from accessing freed UI
2. **Cancel background jobs** — any async work that references UI frames
3. **Stop debounce timers** — `callAfterDelay` callbacks that reference frames
4. **Call `shutdownRendering()`** — stop Metal render loop before touching frames
5. **Destroy overlays, modals, and popups** — top-level floating UI
6. **Destroy UI panels and child frames** — in reverse creation order
7. **Disconnect bridge** — `bridge->setRootFrame(nullptr)`
8. **Remove all children from root** — `rootFrame->removeAllChildren()`
9. **Destroy root frame** — `rootFrame.reset()`
10. **Destroy bridge** — `bridge.reset()` (LAST)
11. **Process pending messages** — `juce::MessageManager::callAsync` or `Thread::yield()` to flush pending Visage operations

**Why this order matters**: The Metal display link holds raw pointers. Background jobs may hold frame pointers. Timer callbacks may reference destroyed UI. Violating this order causes use-after-free crashes or assertion failures (e.g., `visage::InstanceCounter<PackedBrush>::~InstanceCounter()` static destruction order issues).

### Modal and Popup Lifetime Safety

Modals and popups can be dismissed asynchronously (click outside, ESC key). Use defensive patterns:

- **`isClosing_` guard**: Prevent re-entry during close. The `close()` method should set this flag first, then proceed with teardown.
- **`shared_ptr<atomic<T*>>` weak-pointer pattern**: For deferred callbacks (e.g., `callAfterDelay(15, ...)` for focus re-registration), use a shared atomic pointer so the callback can detect if the modal was destroyed.
- **Active registry with mutex**: Track active modals in a thread-safe set (`activeModals_`). Check membership before operating on a modal reference.

### Dropdown Cleanup

Dropdown combo boxes need careful lifecycle management:

- **`isBeingDestroyed` flag**: Set in destructor, check in callbacks to prevent operations on partially-destroyed objects.
- **Try/catch guards**: Wrap teardown operations that may fail if parent hierarchy is already being destroyed.
- **`WeakReference` for `callAfterDelay`**: Deferred close callbacks must verify the dropdown still exists.

### Render Loop Safety

- Call `shutdownRendering()` **before** freeing any frames — the Metal display link runs at 60-120 Hz and holds raw frame pointers.
- Check `parent() != nullptr` before calling `redraw()` — a frame removed from the hierarchy but not yet destroyed may crash on redraw.
- Never call `setBounds()` or `redraw()` before `init()` — this is a common crash source.

### Background Job Cleanup

- **`validityMagic` sentinel**: Use a magic value pattern to detect if the owning object has been destroyed before the job completes.
- **Cancel jobs before freeing UI**: Any async work that references frame pointers must be cancelled in the destructor.
- **Disable animations before removing frames**: Animated frames that are removed mid-animation can crash if the animation timer fires after removal.

### Static Destruction Order

Visage uses `InstanceCounter` templates for resource tracking. If Visage resources (e.g., `PackedBrush`) are destroyed after their counters, you get assertion failures on exit. Fix: clear the root frame from the bridge **before** destroying the window, and process pending messages to flush Visage operations.

## AU/VST3 Startup Time Optimization

DAW plugin scanners (auval, Ableton's scanner) have strict timeouts (~15 seconds). If your plugin takes too long in `constructor` or `prepareToPlay()`, it will fail validation and not appear in the DAW.

### Key Principles

- **Keep constructor and `prepareToPlay()` fast** — defer all heavy initialization to first actual use.
- **Lazy-initialize expensive libraries** — if a library's constructor registers algorithms or loads data (e.g., `essentia::init()` registers 100+ algorithms), create it on demand, not at plugin load.
- **Never run diagnostic/test code in `prepareToPlay()`** — a "does this library work?" check that runs audio analysis will blow the timeout.
- **Test with `time auval -v aumu XXXX YYYY`** — measure your AU validation time. Kill `AudioComponentRegistrar` first to force a fresh scan.

### What Goes Wrong

1. Constructor creates expensive objects → scanner timeout
2. `prepareToPlay()` runs diagnostic analysis → scanner timeout
3. File I/O (session setup, loading samples) blocks initialization → slow scan
4. Creating many voices/objects synchronously → cumulative delay

### Fix Pattern

```cpp
// BAD: expensive library init in constructor
MyProcessor() {
    analyzer = std::make_unique<ExpensiveAnalyzer>(); // 500-2000ms
}

// GOOD: lazy init on first use
void triggerAnalysis() {
    if (!analyzer)
        analyzer = std::make_unique<ExpensiveAnalyzer>();
    analyzer->analyze(buffer);
}
```

**Target**: Cold open < 200ms, warm open < 50ms. Test on baseline hardware (8GB RAM machines).

## Native Standalone Appearance (macOS)

A JUCE+Visage standalone app can look native on macOS with proper configuration. The goal: macOS title bar, standard File menu, and proper menu bar integration.

### Native Title Bar

Use `setUsingNativeTitleBar(true)` on all `DocumentWindow` subclasses to get the standard macOS traffic-light buttons and title.

**Critical**: When calling `setUsingNativeTitleBar(true)` after the window is already shown (common in plugin editors using deferred init via `Timer`), JUCE removes its drawn title bar border (27px top + 1px sides on macOS) but the **native window size stays unchanged**. The content area expands to fill the full window, inflating the editor by ~28px height and ~2px width. **Always call `setSize()` again immediately after** to force correct dimensions:

```cpp
// Main standalone window — MUST re-assert size after title bar switch
if (auto* window = findParentComponentOfClass<juce::DocumentWindow>()) {
    window->setUsingNativeTitleBar(true);
    setSize(desiredWidth, desiredHeight); // Force correct content dimensions
}

// Secondary windows (waveform editor, virtual keyboard, etc.)
MySecondaryWindow() : DocumentWindow("Title", bg, allButtons) {
    setUsingNativeTitleBar(true);
    setResizable(false, false);
}
```

This replaces the default JUCE-styled title bar with the native macOS one, making secondary windows look like proper macOS windows rather than custom-drawn JUCE windows.

**Why this matters for Visage**: The Visage MTKView is sized to the bridge's local bounds, which match the editor's size. If the editor is inflated to 582x358 instead of 580x330, the Visage rendering fills that larger area, creating visible empty space at the window edges (typically ~28px at the bottom). The `setSize()` call after `setUsingNativeTitleBar(true)` resizes the native window to exactly fit the requested content dimensions with zero JUCE border.

### Custom macOS Menu Bar

JUCE creates a default app menu automatically. To add custom items (Check for Updates, About, Audio/MIDI Settings), create a custom `JUCEApplication` with a `MenuBarModel`:

```cpp
class MyMenuBarModel : public juce::MenuBarModel {
public:
    juce::StringArray getMenuBarNames() override {
        return {}; // Empty — use extraAppleMenuItems instead to avoid duplicate menus
    }

    juce::PopupMenu getMenuForIndex(int, const juce::String&) override {
        return {}; // Custom menu items go in the Apple menu, not custom menus
    }

    void menuItemSelected(int menuItemID, int) override {
        switch (menuItemID) {
            case 1: showAboutDialog(); break;
            case 2: checkForUpdates(); break;
        }
    }
};

// In your custom JUCEApplication::initialise():
menuBarModel = std::make_unique<MyMenuBarModel>();
appleMenuItems = std::make_unique<juce::PopupMenu>();
appleMenuItems->addItem(2, "Check for Updates...");
appleMenuItems->addSeparator();
juce::MenuBarModel::setMacMainMenu(menuBarModel.get(), appleMenuItems.get());
```

**Key patterns**:
- Return empty `getMenuBarNames()` to prevent JUCE from creating duplicate menus
- Use `extraAppleMenuItems` parameter of `setMacMainMenu` to add items to the standard Apple menu
- Set menu **before** creating the window — `setMacMainMenu()` must be called in `initialise()` before the main window is constructed
- Requires `JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1` in CMakeLists.txt
- Clean up carefully on shutdown: clear menu model pointers, then call `setMacMainMenu(nullptr)` in a try/catch (macOS 15.5+ can crash in `NSCalendarDate` during periodic event cleanup)

### Custom Standalone App Structure

To fully customize the standalone app (menus, MIDI auto-enable, window behavior), implement `juce_CreateApplication()`:

```cpp
// In CMakeLists.txt:
target_compile_definitions(YourPlugin PUBLIC JUCE_USE_CUSTOM_PLUGIN_STANDALONE_APP=1)

// In StandaloneApp.cpp:
class MyStandaloneApp : public juce::JUCEApplication {
    void initialise(const juce::String&) override {
        // 1. Set up menu BEFORE creating window
        setupMenuBar();
        // 2. Create main window
        mainWindow = std::make_unique<MyStandaloneFilterWindow>(...);
        mainWindow->setVisible(true);
    }
    void shutdown() override {
        // Clean up menu, then window
    }
};

juce::JUCEApplication* juce_CreateApplication() { return new MyStandaloneApp(); }
```

**Auto-enable MIDI**: Desktop platforms default `autoOpenMidiDevices = false`. Set it to `true` in your custom app/filter holder so MIDI keyboards work immediately without manual configuration.

### Audio/MIDI Configuration

Don't try to override JUCE's `StandaloneFilterWindow` — it's an internal class not exposed in the public API. Instead, add Audio/MIDI configuration to your settings panel:

- Use `#if JucePlugin_Build_Standalone` conditional compilation to show audio/MIDI settings only in standalone builds
- Use JUCE's `AudioDeviceSelectorComponent` for device selection UI
- In standalone mode, get the `AudioDeviceManager` from `StandalonePluginHolder::getInstance()`, not from a local instance
- Skip Bluetooth MIDI device enumeration on macOS — it can crash due to system-level issues

### Keyboard Shortcuts (Standalone)

JUCE's `setMacMainMenu()` with `extraAppleMenuItems` does NOT support displaying keyboard shortcut hints (like "Cmd+,") next to menu items. JUCE rebuilds the native `NSMenu` from `PopupMenu` data every time the menu opens, which means any post-hoc modifications to `NSMenuItem` key equivalents are wiped.

**Pattern**: Use `juce::KeyListener` on the top-level component to handle keyboard shortcuts directly. This is the same pattern used by production JUCE+Visage apps (e.g., PlunderTube uses it for Cmd+K):

```cpp
class MyPluginEditor : public juce::AudioProcessorEditor,
                       public juce::Timer,
                       public juce::KeyListener {
public:
    bool keyPressed(const juce::KeyPress& key, juce::Component*) override {
        // Cmd+, opens settings (macOS convention)
        if (key == juce::KeyPress(',', juce::ModifierKeys::commandModifier, 0)) {
            toggleSettings();
            return true;
        }
        // ESC closes settings panel / modal
        if (key == juce::KeyPress::escapeKey) {
            if (settingsPanel_ && settingsPanel_->isVisible()) {
                settingsPanel_->hide();
                return true;
            }
        }
        return false;
    }

    void createVisageUI() {
        // ... create UI ...

        // Register as KeyListener on top-level component (catches keys from any focused child)
        if (auto* topLevel = getTopLevelComponent())
            topLevel->addKeyListener(this);
    }

    ~MyPluginEditor() override {
        if (auto* topLevel = getTopLevelComponent())
            topLevel->removeKeyListener(this);
        // ... rest of destructor ...
    }
};
```

**Expected behaviors for standalone apps**:
- **Cmd+,** opens/toggles Settings panel (macOS convention, add to app menu as "Settings..." item)
- **ESC** closes the currently visible settings panel or modal overlay
- **Cmd+Q** quits the app (handled by JUCE/system automatically if Cmd+Q propagation patch is applied)
- The shortcut does NOT appear in the menu text — this is acceptable; the keyboard shortcut still works

**For AU/VST3 plugins**: ESC to close settings/modals works via the same `KeyListener` pattern. Cmd+, may conflict with DAW shortcuts — consider making it standalone-only via `#if JucePlugin_Build_Standalone`.

## iOS/iPadOS Integration

### Architecture

On iOS, the JUCE→Visage bridge works differently from macOS:

```
JUCE AudioAppComponent → JuceVisageBridge → ApplicationWindow → WindowIos → VisageMetalView
```

**Key difference**: On macOS, the bridge forwards mouse events from JUCE to Visage. On iOS, `VisageMetalView` (an `MTKView` subclass) handles `UITouch` events natively and maps them to Visage mouse events internally. The bridge must NOT forward JUCE mouse events on iOS — doing so causes double events.

### Bridge iOS Simplification

Guard mouse-related overrides and members in the bridge:

```cpp
// JuceVisageBridge.h
#if !JUCE_IOS
    void mouseDown(const juce::MouseEvent& e) override;
    void mouseUp(const juce::MouseEvent& e) override;
    void mouseDrag(const juce::MouseEvent& e) override;
    void mouseMove(const juce::MouseEvent& e) override;
    void mouseWheelMove(const juce::MouseEvent& e,
                        const juce::MouseWheelDetails& wheel) override;
#endif

private:
#if !JUCE_IOS
    visage::MouseEvent convertMouseEvent(const juce::MouseEvent& e) const;
    visage::Frame* mouseDownFrame_ = nullptr;
    visage::Frame* hoverFrame_ = nullptr;
#endif
```

In the `.cpp`, also guard cursor-related code:

```cpp
// Cursor style lambda — no cursors on iOS
#if !JUCE_IOS
visageWindow_->onCursorChange = [this](int cursorStyle) { ... };
#endif
```

### Build System

`VISAGE_IOS=1` is automatically defined when `CMAKE_SYSTEM_NAME` is `"iOS"`. The same `visage` link target works for both platforms. No additional CMake configuration needed beyond the standard iOS target setup.

### DPI Scale

On iOS, DPI scale comes from the device display:

```cpp
float scale = juce::Desktop::getInstance().getDisplays().getMainDisplay().scale;
```

Common values: 2.0 (standard Retina), 3.0 (iPhone Plus/Max/Pro).

### Safe Area Insets

Always query and apply safe area insets in `resized()`:

```cpp
void MyComponent::resized() {
    float safeTop = 0, safeBottom = 0, safeLeft = 0, safeRight = 0;
#if JUCE_IOS
    if (auto* display = juce::Desktop::getInstance().getDisplays()
            .getDisplayForRect(getScreenBounds())) {
        auto insets = display->safeAreaInsets;
        safeTop = static_cast<float>(insets.getTop());
        safeBottom = static_cast<float>(insets.getBottom());
        safeLeft = static_cast<float>(insets.getLeft());
        safeRight = static_cast<float>(insets.getRight());
    }
#endif
    // Apply insets to your layout
    float contentX = safeLeft;
    float contentY = safeTop;
    float contentW = getWidth() - safeLeft - safeRight;
    float contentH = getHeight() - safeTop - safeBottom;
    // ... position frames within safe area
}
```

### Touch Interaction Guidelines

- **No hover**: iOS has no cursor hover (except Apple Pencil hover on iPad). Skip `mouseMove`/hover visuals.
- **No right-click**: No context menus via right-click. Use long-press or dedicated buttons.
- **44pt+ touch targets**: All interactive elements must be at least 44pt tall for reliable touch.
- **Single touch**: Visage maps the primary touch to mouse events. Multi-touch is not supported.
- **No cursor style**: `setCursorStyle()` is a no-op on iOS.

### iPhone vs iPad Layout

- **iPhone**: Portrait-only (typically), compact layout, 3x DPI scale on Pro models
- **iPad**: Portrait + landscape, Split View support on iPadOS, more screen space, 2x DPI scale
- **Both**: Safe area insets vary by device, no title bar, no window chrome

### What's NOT Available on iOS

- No `performKeyEquivalent:` (macOS only)
- No `setAlwaysOnTop()` (no window management)
- No `setAcceptsKeystrokes()` (no DAW host)
- No secondary windows or window-level menus
- No cursor style changes
- No `Cmd+Q` propagation

## Coordinate Spaces

Two coordinate spaces are in play:
- **Logical pixels**: What JUCE reports via `getWidth()`/`getHeight()` and what Visage frames use for `setBounds()`
- **Native pixels**: Physical pixels = logical x DPI scale

Use `Dimension::logicalPixels()` when calling `visageWindow->show()`. The Metal layer handles scaling internally via `view.layer.contentsScale`. Pass logical coordinates to `rootFrame->setBounds()`.

### The Pink/Magenta Flash

Visage's GPU may clear to a default color (magenta `0xFFFF00FF`) before the first frame renders. Multiple layers prevent this from being visible:

1. JUCE `paint()` fills the component with a dark background (`0xFF282828`)
2. The root frame's `onDraw` callback fills the canvas with the background color
3. `visageWindow->drawWindow()` is called immediately after window creation
4. A watchdog timer forces redraws during the first few hundred ms

## Event Bridging

### Key Event Conversion

JUCE and Visage use different key code systems. The critical case is modifier+letter combos (Cmd+C/V/X/A/Z) — JUCE uses raw uppercase ASCII, but Visage expects `visage::KeyCode` enum values:

```cpp
visage::KeyCode convertKeyEvent(const juce::KeyPress& key) {
    int keyCode = key.getKeyCode();
    bool hasModifier = key.getModifiers().isCommandDown() ||
                       key.getModifiers().isCtrlDown();

    if (hasModifier) {
        // Explicit mapping for text-editing shortcuts
        switch (keyCode) {
            case 'A': return visage::KeyCode::A;
            case 'C': return visage::KeyCode::C;
            case 'V': return visage::KeyCode::V;
            case 'X': return visage::KeyCode::X;
            case 'Z': return visage::KeyCode::Z;
            default:  return static_cast<visage::KeyCode>(keyCode);
        }
    }

    // For unmodified keys, use the text character if printable
    auto ch = key.getTextCharacter();
    if (ch > 0 && ch < 127)
        return static_cast<visage::KeyCode>(ch);

    return static_cast<visage::KeyCode>(keyCode);
}
```

### Modifier Conversion (macOS / iOS)

**Critical**: Visage's `TextEditor::isMainModifier()` checks for `kModifierCmd` on Mac/iOS. Mapping Command to `kModifierMacCtrl` silently breaks all clipboard shortcuts.

```cpp
int convertModifiers(const juce::ModifierKeys& mods) {
    int result = 0;
    if (mods.isShiftDown())   result |= visage::kModifierShift;
    if (mods.isAltDown())     result |= visage::kModifierAlt;

#if JUCE_MAC || JUCE_IOS
    if (mods.isCommandDown()) result |= visage::kModifierCmd;     // NOT kModifierMacCtrl!
    if (mods.isCtrlDown())    result |= visage::kModifierMacCtrl; // Physical Ctrl key
#else
    if (mods.isCtrlDown())    result |= visage::kModifierRegCtrl;
#endif
    return result;
}
```

> **iOS note**: On iPad with external keyboard, Cmd key exists. On iPhone, modifiers are rarely relevant but the guard ensures correct behavior when they are.

### Mouse Event Routing

The key pattern is **mouse-down frame capture**: the frame that receives `mouseDown` owns all subsequent `mouseDrag` and `mouseUp` events, regardless of cursor position:

```cpp
void mouseDown(const juce::MouseEvent& e) override {
    auto visEvent = convertMouseEvent(e);
    mouseDownFrame = rootFrame->frameAtPoint(visEvent.window_position);
    if (mouseDownFrame) {
        visEvent.position = visEvent.window_position - mouseDownFrame->positionInWindow();
        mouseDownFrame->mouseDown(visEvent);
    }
}

void mouseDrag(const juce::MouseEvent& e) override {
    if (mouseDownFrame) {
        auto visEvent = convertMouseEvent(e);
        visEvent.position = visEvent.window_position - mouseDownFrame->positionInWindow();
        mouseDownFrame->mouseDrag(visEvent);
    }
}

void mouseUp(const juce::MouseEvent& e) override {
    if (mouseDownFrame) {
        auto visEvent = convertMouseEvent(e);
        visEvent.position = visEvent.window_position - mouseDownFrame->positionInWindow();
        mouseDownFrame->mouseUp(visEvent);
        mouseDownFrame = nullptr;
    }
}
```

### Mouse Event Dispatch in Parent Frames

When a parent frame overrides `mouseDown()`, Visage does NOT automatically dispatch to children — the parent intercepts ALL events in its bounds. If the parent has interactive children (buttons, toggles, dropdowns), check `frameAtPoint()` first:

```cpp
void MyParentFrame::mouseDown(const visage::MouseEvent& e) {
    // Check if a child should handle this
    auto* child = frameAtPoint(e.position);
    if (child && child != this) {
        visage::MouseEvent childEvent = e;
        childEvent.position = e.position - child->topLeft();
        child->mouseDown(childEvent);
        return; // Let child handle it
    }
    // Parent-specific logic...
}
```

Do the same for `mouseUp()`. Without this, child widgets appear non-functional.

## Focus Management

### The Problem

JUCE routes keyboard events to whichever `juce::Component` has focus. Visage has its own focus concept. When a user clicks a Visage `TextEditor`, JUCE doesn't know about it — key events go to JUCE's focused component, never reaching the TextEditor.

### The Solution: Dynamic Focus Toggle

```cpp
void setFocusedChild(visage::Frame* child) {
    if (child) {
        setWantsKeyboardFocus(true);  // Must set BEFORE grabKeyboardFocus()
        grabKeyboardFocus();
    } else {
        setWantsKeyboardFocus(false);
        giveAwayKeyboardFocus();
    }
    focusedChild = child;
}
```

**Gotcha**: `setWantsKeyboardFocus(false)` is the initial state and must be explicitly set to `true` before `grabKeyboardFocus()` — without this, JUCE silently ignores the grab.

**Gotcha**: Start with `setWantsKeyboardFocus(false)` so that DAW transport keys (spacebar, etc.) pass through to the host when no text field is active.

### Keyboard Routing with Focus

```cpp
bool keyPressed(const juce::KeyPress& key) override {
    auto visEvent = makeKeyEvent(key);

    if (focusedChild) {
        bool handled = focusedChild->keyPress(visEvent);
        if (handled) return true;
    }

    // Fallback: route to root frame
    return rootFrame->keyPress(visEvent);
}
```

### Keyboard Interception in AU/VST3

In plugin mode, Visage's `setAcceptsKeystrokes(true)` intercepts keyboard events at a lower level than JUCE KeyListener. This can prevent DAW features like Musical Typing or transport controls from working.

**Rule**: Only enable keyboard acceptance based on wrapper type:

```cpp
bool keyboardEnabled = (audioProcessor.wrapperType == juce::AudioProcessor::wrapperType_Standalone);
myFrame->setAcceptsKeystrokes(keyboardEnabled);
```

Propagate this setting to all child frames in the hierarchy. In standalone mode, keyboard shortcuts (undo/redo, etc.) can work freely.

## Plugin-Specific Fixes (macOS)

These patches to Visage's `windowing_macos.mm` are required for correct behavior in AU/VST3 hosts on macOS. They are **not applicable to iOS** — iOS has no `performKeyEquivalent:`, no DAW plugin hosts, and no secondary windows. The `setAlwaysOnTop` guard (patch 6) applies cross-platform.

### Fix 1: performKeyEquivalent: for Cmd+Key Shortcuts

**Problem**: In plugin hosts, macOS routes `Cmd+key` through `performKeyEquivalent:` before `keyDown:`. The DAW's Edit menu intercepts text editing shortcuts (Cmd+A/C/V/X/Z), and other Cmd+key combos (like plugin-specific shortcuts Cmd+I, Cmd+R) never reach the plugin at all.

**Fix**: Override `performKeyEquivalent:` on `VisageAppView` with a two-tier strategy:
1. **Always intercept** text editing shortcuts (Cmd+A/C/V/X/Z) when a TextEditor is active
2. **Try all other** Cmd+key combos through `handleKeyDown()` — if the plugin handles it, consume; otherwise let the host have it

```objc
// In VisageAppView (MTKView subclass) — windowing_macos.mm
- (BOOL)performKeyEquivalent:(NSEvent*)event {
    if (!self.visage_window)
        return [super performKeyEquivalent:event];

    NSUInteger flags = [event modifierFlags] & NSEventModifierFlagDeviceIndependentFlagsMask;
    bool hasCmd = (flags & NSEventModifierFlagCommand) &&
                  !(flags & NSEventModifierFlagControl) &&
                  !(flags & NSEventModifierFlagOption);

    if (hasCmd) {
        NSString* chars = [event charactersIgnoringModifiers];
        if ([chars length] == 1) {
            unichar ch = [[chars lowercaseString] characterAtIndex:0];

            // Tier 1: Always intercept text editing shortcuts when text is active
            if (self.visage_window->hasActiveTextEntry() &&
                (ch == 'a' || ch == 'c' || ch == 'v' || ch == 'x' || ch == 'z')) {
                visage::KeyCode key_code = visage::translateKeyCode([event keyCode]);
                int modifiers = [self keyboardModifiers:event];
                self.visage_window->handleKeyDown(key_code, modifiers, [event isARepeat]);
                return YES; // Swallow — prevent DAW from seeing this
            }

            // Tier 2: Try all other Cmd+key through Visage's handler
            visage::KeyCode key_code = visage::translateKeyCode([event keyCode]);
            int modifiers = [self keyboardModifiers:event];
            if (self.visage_window->handleKeyDown(key_code, modifiers, [event isARepeat]))
                return YES;  // Plugin handled this shortcut — consume it
        }
    }
    return [super performKeyEquivalent:event]; // Not handled — let host have it
}
```

**Why two tiers?** Text editing shortcuts (Tier 1) are always consumed when a TextEditor is active — we don't want the DAW's Edit menu stealing Cmd+C from a text field. Plugin shortcuts (Tier 2) are tried but NOT forced — if `handleKeyDown()` returns false, the event falls through to the host normally (preserving DAW shortcuts like Cmd+Z undo).

**Prerequisite**: Tier 2 only works if `keyboard_focused_frame_` is set and `acceptsKeystrokes` is true on the target frame. See "Keyboard Focus Initialization" below.

### Fix 2: Cmd+Q/W Propagation to Host

**Problem**: `[super keyDown:]` on macOS does NOT propagate unhandled events up the responder chain — it silently consumes them. `Cmd+Q` dies in the Visage view.

**Fix**: For unhandled Cmd+key events, call `[[self nextResponder] keyDown:event]` instead of `[super keyDown:event]`:

```objc
- (void)keyDown:(NSEvent*)event {
    // ... translate and pass to Visage ...

    if (!self.visage_window->handleKeyDown(key_code, modifiers, [event isARepeat])) {
        if (command) {
            // Walk up the responder chain so Cmd+Q reaches the app
            [[self nextResponder] keyDown:event];
        } else {
            [super keyDown:event];
        }
    }
}
```

### Fix 2b: Routing Unhandled Keys from Visage to JUCE

**Problem**: Non-Cmd keys (ESC, Return, Tab, etc.) that Visage doesn't handle are silently consumed by `[super keyDown:]` on macOS. They never reach JUCE's `Component::keyPressed()`. This means JUCE-level keyboard shortcuts (ESC to cancel, Return to confirm, etc.) don't work in the main plugin editor where Visage's NSView is first responder.

**Why Cmd+keys are different**: Cmd+keys go through `performKeyEquivalent:` which has a `[super performKeyEquivalent:]` fallthrough that DOES reach JUCE. Non-Cmd keys go through `keyDown:` where `[super keyDown:]` is a dead end.

**Fix**: Add a callback on `Window` that fires when `handleKeyDown()` returns false. Register it from the JUCE bridge to convert and dispatch to JUCE's component hierarchy.

```cpp
// In windowing.h — add to Window class (public)
std::function<void(KeyCode, int, bool)> on_unhandled_key_down;
```

```objc
// In windowing_macos.mm — keyDown: handler
if (!self.visage_window->handleKeyDown(key_code, modifiers, [event isARepeat])) {
    // Notify JUCE about unhandled keys via callback
    if (self.visage_window->on_unhandled_key_down)
        self.visage_window->on_unhandled_key_down(key_code, modifiers, [event isARepeat]);

    if (command) {
        [[self nextResponder] keyDown:event]; // Cmd+keys: responder chain
    } else {
        [super keyDown:event]; // Non-Cmd: normal NSView behavior
    }
}
```

```cpp
// In your JUCE bridge, after window creation:
if (auto* win = visageWindow->window()) {
    win->on_unhandled_key_down = [this](visage::KeyCode keyCode, int modifiers, bool repeat) {
        if (repeat) return;

        // Convert Visage key → JUCE KeyPress
        int rawMods = 0;
        if (modifiers & visage::kModifierShift)   rawMods |= juce::ModifierKeys::shiftModifier;
        if (modifiers & visage::kModifierCmd)     rawMods |= juce::ModifierKeys::commandModifier;
        if (modifiers & visage::kModifierAlt)     rawMods |= juce::ModifierKeys::altModifier;
        if (modifiers & visage::kModifierMacCtrl) rawMods |= juce::ModifierKeys::ctrlModifier;

        int juceKeyCode = 0;
        if (keyCode == visage::KeyCode::Escape)      juceKeyCode = juce::KeyPress::escapeKey;
        else if (keyCode == visage::KeyCode::Return)  juceKeyCode = juce::KeyPress::returnKey;
        else if (keyCode == visage::KeyCode::Space)   juceKeyCode = juce::KeyPress::spaceKey;
        else if (keyCode == visage::KeyCode::Tab)     juceKeyCode = juce::KeyPress::tabKey;
        // ... map other keys as needed

        juce::KeyPress juceKey(juceKeyCode, juce::ModifierKeys(rawMods), 0);
        if (auto* parent = getParentComponent())
            parent->keyPressed(juceKey);
    };
}
```

**Why not NSEvent monitor?** `[NSEvent addLocalMonitorForEventsMatchingMask:]` works but causes `ViewBridge` crashes in AU sandboxed hosts. The callback approach is AU-safe — no `[NSApp sendEvent:]`, no CGEvent, no accessibility permissions.

**Why not `[[self nextResponder] keyDown:]` for all keys?** Forwarding non-Cmd keys up the responder chain from Visage's NSView doesn't reliably reach JUCE's Component::keyPressed(). The responder chain goes to the JUCEView but JUCE's internal dispatch requires the component to have JUCE keyboard focus, which the embedded Visage view disrupts. The callback bypasses this entirely.

### Fix 2c: Keyboard Focus Initialization for Plugin Shortcuts

**Problem**: `handleKeyDown()` in Visage's `WindowEventHandler` silently returns `false` when `keyboard_focused_frame_` is null — which is the default. Combined with `acceptsKeystrokes()` defaulting to `false` on `Frame`, this means **plugin-level Cmd+key shortcuts (like Cmd+I, Cmd+R) don't work at all** until something explicitly sets keyboard focus (e.g., opening a TextEditor).

**Symptom**: Plugin shortcuts only work after the user first interacts with a text field or other focus-requesting component.

**Root cause chain**:
1. `WindowEventHandler::keyboard_focused_frame_` starts as `nullptr`
2. `handleKeyDown()` calls `keyboard_focused_frame_->handleKeyDown()` — returns false when null
3. Even if focus is set, `Frame::acceptsKeystrokes()` defaults to `false`, causing the frame to be skipped during key traversal
4. `setFocusedChild()` in the bridge only fires when a child frame (like TextEditor) calls `requestKeyboardFocus()`

**Fix** (two parts — both required):

In your plugin editor, after creating the root frame:
```cpp
rootFrame->setAcceptsKeystrokes(true);  // Enable key event handling on root
```

In your bridge, after the embedded window is created:
```cpp
// Set initial keyboard focus so Cmd+key shortcuts work immediately
if (rootFrame && visageWindow) {
    visageWindow->setKeyboardFocusOnFrame(rootFrame);
}
```

**Gotcha**: Only set initial focus on the main plugin window, not on secondary windows (e.g., waveform editors, settings dialogs) that manage their own focus lifecycle.

### Fix 3: Popup Menu Overflow Positioning

**Problem**: When a popup menu doesn't fit below its trigger element, the upstream Visage code computes the above-position incorrectly for items in lower rows.

**Fix**: In `popup_menu.cpp`, use `window_bounds.y()` directly instead of the computed `top`:

```cpp
// popup_menu.cpp, positioning logic
if (bottom > height()) {
    y = std::max(0, static_cast<int>(window_bounds.y()) - h);
    // Upstream bug: y = std::max(0, top - h);  // 'top' is wrong for lower rows
}
```

### Fix 4: setAlwaysOnTop Guard

**Problem**: Visage's `showWindow()` unconditionally calls `setAlwaysOnTop(always_on_top_)`, which can demote the host DAW's window to `NSNormalWindowLevel` when `always_on_top_` defaults to `false`. This causes plugin windows to appear behind the DAW.

**Fix**: In `application_window.cpp`, only call `setAlwaysOnTop()` when `always_on_top_` is `true`:

```cpp
// In ApplicationWindow::showWindow():
if (always_on_top_)
    window_->setAlwaysOnTop(always_on_top_);
// Upstream: window_->setAlwaysOnTop(always_on_top_); // Always called, even when false
```

For secondary windows (e.g., waveform editor) that should float above the DAW, call `visageWindow->setWindowOnTop(true)` **before** `visageWindow->show()`.

## Visage Frame Essentials

### Frame Lifecycle

```
frame = new MyFrame();           // Construct
frame->setEventHandler(handler); // Set event handler (inherits from parent on addChild)
parentFrame->addChild(frame);    // Adds to hierarchy, propagates handler/palette/DPI
// addChild calls frame->init() if parent is already initialized
// addChild also propagates DPI scale from parent → child via setDpiScale()
frame->setBounds(x, y, w, h);   // Set position and size (computes native_bounds_ = bounds * dpi_scale)
frame->redraw();                 // Queue for rendering
// ...
parentFrame->removeChild(frame); // Removes from hierarchy
// or frame is destroyed
```

**Never call `setBounds()` or `redraw()` before `init()`** — this is a common crash source.

**DPI and native_bounds_ ordering**: `setBounds()` computes `native_bounds_ = (bounds * dpi_scale_).round()`. If DPI changes after `setBounds()` (e.g., via `addChild` propagation), `native_bounds_` is NOT recalculated unless the `setDpiScale()` patch (Patch #7) is applied. Without the patch, always call `setBounds()` on children AFTER the correct DPI has propagated — i.e., set child bounds from `resized()`, not from `createVisageUI()`. See the Visage Patches Checklist for the library-level fix.

### Key Frame Properties

| Property | Purpose |
|----------|---------|
| `accepts_keystrokes_` | Must be `true` to receive keyboard events |
| `ignores_mouse_events_` | Set `true` to pass clicks through |
| `pass_mouse_events_to_children_` | Set `true` for transparent containers — **required** for container frames with interactive children |
| `on_top_` | Renders after all non-on-top siblings; checked first in hit testing |
| `palette_` | Theme color/value lookup, propagated from parent |
| `event_handler_` | Singleton per window, propagated from root |

### Drawing

```cpp
void MyFrame::draw(visage::Canvas& canvas) {
    canvas.setColor(0xFF282828);
    canvas.rectangle(0, 0, width(), height());  // Background

    canvas.setColor(0xFFFFFFFF);
    canvas.text(&myText, x, y, w, h);           // Text

    canvas.setColor(0xFF58A6FF);
    canvas.roundedRectangle(x, y, w, h, radius); // Rounded rect
}
```

All coordinates in `draw()` are local to the frame. The canvas handles DPI scaling automatically.

### Layout System

Visage supports two layout modes:

1. **Flex layout** (CSS Flexbox-like): Applied to all children at once
2. **Margin-based layout**: Per-child margins and padding using `Dimension` values

```cpp
// Flex layout example
myFrame.layout().setFlexDirection(visage::FlexDirection::Row);
myFrame.layout().setJustifyContent(visage::JustifyContent::SpaceBetween);

// Margin-based layout example
child.layout().marginLeft = visage::Dimension::percent(10);
child.layout().marginTop = visage::Dimension::pixels(20);
```

### CallbackList Pattern

Every event on a Frame exposes a `CallbackList` for external observers:

```cpp
myFrame.onMouseDown() += [](const visage::MouseEvent& e) {
    // Handle mouse down
};

myFrame.onDraw() += [](visage::Canvas& canvas) {
    // Draw additional content after the frame's own draw()
};
```

### Show/Hide Pattern for Dynamic Controls

Visage doesn't auto-layout on visibility changes. When showing/hiding dynamic controls:

```cpp
myFrame->setVisible(true);
parentFrame->redraw(); // Must manually trigger redraw
// May also need to call setBounds() to re-layout
```

## TextEditor Integration

### Key Bindings (built-in)

| Key Combo | Action |
|-----------|--------|
| Cmd+A | Select all |
| Cmd+C | Copy |
| Cmd+V | Paste |
| Cmd+X | Cut |
| Cmd+Z | Undo |
| Cmd+Shift+Z | Redo |
| Left/Right | Move caret |
| Cmd+Left/Right | Jump by word |
| Shift+Left/Right | Extend selection |
| Up (single-line) | Move to start |
| Down (single-line) | Move to end |
| Home/End | Start/end of line |
| Tab | Focus next text receiver |
| Enter | Fire `onEnterKey` (single-line) or insert newline (multi-line) |
| Escape | Deselect and fire `onEscapeKey` |

### Convenience Modes

```cpp
textEditor.setNumberEntry();    // Single-line, select-on-focus, center-justified
textEditor.setTextFieldEntry(); // Single-line, select-on-focus, left-justified
textEditor.setPassword('*');    // Password masking
```

### Clipboard

Clipboard access goes through `FrameEventHandler` lambdas set up in the bridge:
`Frame::readClipboardText()` → `eventHandler.read_clipboard_text()` → `juce::SystemClipboard`

### Focus and Text Input

For a Frame to receive text input:
- Override `receivesTextInput()` to return `true`
- Override `textInput(const std::string&)` to handle typed characters
- Call `requestKeyboardFocus()` when the frame should capture input

The bridge's `eventHandler.request_keyboard_focus` callback must call `setWantsKeyboardFocus(true)` then `grabKeyboardFocus()` to pull JUCE focus to the bridge component.

### Custom TextEditor Subclasses

When creating custom `TextEditor` subclasses (e.g., multi-line text editor):
- If the subclass overrides `keyPress()`, don't block modifier key combinations — `visage::TextEditor` has built-in clipboard/selection support
- For multi-line editors, override `mouseWheel()` to handle nested scrolling (call base `TextEditor::mouseWheel()` then return `true` to prevent parent scroll containers from also scrolling)
- For multi-line editors, use `setJustification(visage::Font::Justification::kTopLeft)` for proper cursor alignment

## Popups, Dropdowns, and Modals

A JUCE+Visage plugin should render **all** UI inside the Visage GPU layer — no JUCE native popups, alert windows, or menus in the plugin window. This requires distinct popup/overlay systems.

### Design Principle: No JUCE Native UI

**Rule**: Never use `juce::AlertWindow`, `juce::NativeMessageBox`, `juce::PopupMenu`, or `juce::ComboBox` for in-plugin UI. These render using the OS native toolkit, which:
- Looks inconsistent with the GPU-rendered Visage UI
- Can cause focus/z-order conflicts with the Metal layer
- Doesn't respect the plugin's custom theme

**Allowed exceptions**: JUCE `AlertWindow` is acceptable for text-input scenarios that would be disproportionate effort to build in Visage (e.g., "Save As" dialogs). Document all exceptions in the per-project notes.

### System 1: visage::PopupMenu (Context Menus)

Use Visage's built-in `PopupMenu` for all context menus and selection lists. This is the simplest popup system.

```cpp
visage::PopupMenu menu;
menu.addOption(1, "Forward");
menu.addOption(2, "Reverse");
menu.addBreak();                        // Separator line

visage::PopupMenu subMenu("Loop Mode");
subMenu.addOption(3, "No Loop");
subMenu.addOption(4, "Forward Loop");
menu.addSubMenu(subMenu);              // Nested submenu (up to 4 levels deep)

menu.onSelection() = [this](int id) {
    handleMenuSelection(id);
};
menu.onCancel() = []() {};

menu.show(this);                        // Show below 'this' frame
menu.show(this, visage::Point(x, y));   // Show at explicit position
```

**How it works internally:**
1. `menu.show(source)` creates a `PopupMenuFrame`
2. `PopupMenuFrame` walks up to `source->topParentFrame()` (the root)
3. Adds itself as a child of the root with `setOnTop(true)` — covers the entire window
4. Positions the visible list below (or above, if overflow) the source frame
5. Steals keyboard focus via `requestKeyboardFocus()`
6. Dismisses on: item selection, focus loss, or click outside

**Checkmarks**: No built-in toggle API. Use string prefix convention: `"√ Forward"` for checked items.

**Disabled items**: `menu.addOption(id, "label").enable(false)` grays out an item.

**Positioning**: Default is below the source frame's `window_bounds.bottom()`. If the menu overflows the window height, it flips above using `window_bounds.y() - menuHeight` (requires the overflow positioning patch).

### System 2: VisageDropdownComboBox (Inline Dropdowns)

For combo-box style selectors (settings panel, mode selectors), use a custom `VisageDropdownComboBox` widget:

```cpp
auto* selector = new VisageDropdownComboBox();
parentFrame->addChild(selector);
selector->setDropdownParent(scrollContainer->getContentFrame()); // CRITICAL
selector->addItem("Option A", 1);
selector->addItem("Option B", 2);
selector->setSelectedId(1);
selector->onSelectionChanged = [](int id) { /* handle */ };
```

**Key pattern — `setDropdownParent()`**: The dropdown list must be added to a parent frame that has enough vertical space to display it. For items inside a `ScrollableFrame`, pass `scrollContainer->getContentFrame()` — not the scroll container itself. Without this call, the dropdown won't open.

**How the dropdown positions itself:**
1. On click, traverses the parent chain from the trigger button up to `dropdownParent`, accumulating x/y offsets
2. Positions the list below the button with a 2px gap
3. If the list would overflow downward and there's room above, flips to above
4. Constrains width and clips height to fit within parent bounds
5. Calls `setOnTop(true)` on the list frame

**Dropdown Manager (singleton):**
```cpp
// At plugin startup
VisageDropdownManager::getInstance().setTopLevelParent(rootFrame.get());

// When a dropdown opens
VisageDropdownManager::getInstance().onDropdownOpening(this);
// → Closes any other open dropdown
// → Calls ensureOverlayOnTop() to re-add the overlay container as the last child

// Close-on-click-outside (in bridge's mouseDown):
if (VisageDropdownManager::getInstance().getCurrentlyOpenDropdown()) {
    // Check if click is inside the dropdown; if not, close it
}
```

**Z-order mechanism**: The manager maintains an `overlayContainer_` frame that is always the last child of the root frame. Dropdown menus are added as children of this container. When a dropdown opens, `ensureOverlayOnTop()` removes and re-adds the container to guarantee it renders on top.

```cpp
void ensureOverlayOnTop() {
    topLevelParent_->removeChild(overlayContainer_.get());
    topLevelParent_->addChild(overlayContainer_.get());
    overlayContainer_->setOnTop(true);
    overlayContainer_->setBounds(0, 0, topLevelParent_->width(), topLevelParent_->height());
}
```

The container uses `setIgnoresMouseEvents(true, true)` — ignores events itself but passes them to children (the dropdown list frames).

**Click debounce**: Add a 100ms debounce on clicks to prevent the dropdown from immediately re-closing after being shown (since the open click can also register as a close-outside click).

### System 3: VisageModalDialog (Full-Screen Modals)

For dialogs that need a dimmed background and centered content (URL input, help, sample info, settings):

```cpp
auto content = std::make_unique<MyDialogContent>();
// Configure content...
VisageModalDialog::show(std::move(content), triggerFrame);
```

**The `show()` static method lifecycle:**
1. Creates `VisageModalDialog` wrapping the content frame
2. Finds root: `sourceFrame->topParentFrame()`
3. Copies event handler: `modal->setEventHandler(parentFrame->eventHandler())`
4. Adds to hierarchy: `parentFrame->addChild(std::move(modal))`
5. Registers in thread-safe `activeModals_` set
6. Sets `setOnTop(true)` and full-window bounds
7. Adds content as child, centers it via `calculateContentBounds()`
8. Sets `setAcceptsKeystrokes(true)` on both wrapper and content
9. Calls `requestKeyboardFocus()` immediately
10. Schedules a 15ms deferred focus re-registration (using `shared_ptr<atomic<>>` weak-pointer pattern)

**Drawing**: The modal draws a `0x80000000` (50% black) scrim over the entire window. No blur.

**Dismissal**: Click outside content bounds calls `close()`. ESC calls `close()`. The `close()` method:
1. Guards re-entry with `isClosing_` flag
2. Unregisters from `activeModals_`
3. Fires `onClosed` callback
4. Restores focus to `sourceFrame_`
5. Calls `parentFrame_->removeChild(this)` — triggers destruction

**Keep-alive timer**: A 500ms timer calls `redraw()` on the modal to prevent the watchdog from destroying the window for inactivity.

**Content sizing**: Override `getDesiredWidth()`/`getDesiredHeight()` on your content frame (preferred), or use `dynamic_cast` detection in `calculateContentBounds()` (works but doesn't scale). For custom dialog types, define a virtual `getDesiredSize()` method.

**Critical — Clamp overlay/modal dimensions to parent frame bounds**: Visage clips drawing at the frame boundary. If a modal or overlay panel uses hardcoded dimensions that exceed the host frame's `width()` or `height()`, the panel's computed position goes negative and content is clipped at the edges. This is especially common in plugin UIs where the editor size is compact (e.g., 330px height) but modals are designed for larger windows. Always clamp:

```cpp
// WRONG: hardcoded dimensions can exceed frame bounds
float panelW = 540.0f;
float panelH = 360.0f;  // May exceed frame height!
float panelY = (height() - panelH) / 2.0f;  // Goes NEGATIVE if panelH > height()

// CORRECT: clamp to fit, with minimum margin
float panelW = std::min(540.0f, width() - 10.0f);
float panelH = std::min(360.0f, height() - 10.0f);
float panelX = std::max(5.0f, (width() - panelW) / 2.0f);
float panelY = std::max(5.0f, (height() - panelH) / 2.0f);
```

This applies to any overlay drawn within a frame's `draw()` method: settings panels, modals, popup menus, help screens. If the content needs more space than available, consider adding scroll support via `visage::ScrollableFrame`.

**Gotchas**:
- Copy the event handler before `addChild()`, not after
- Don't call `requestKeyboardFocus()` before the modal is in the hierarchy
- The 15ms deferred focus re-registration is needed because the bridge's focus tracking may not be settled immediately after `addChild()`
- If the modal has a `TextEditor`, don't auto-focus it on open — this can prevent ESC from closing the modal (user must click the field first)

### System 4: VisageOverlayBase (Animated Overlays)

An overlay pattern with GPU blur, fade animation, and `juce::KeyListener` integration. Features over VisageModalDialog:
- Animated fade in/out (0→1 over ~16ms ticks)
- GPU-accelerated blur effect (radius 35px) behind the scrim
- Configurable dim opacity (minimum 85%)
- Content area calculations with visual shadow layers

**When to use**: Only if you need the blur/animation effects. For simple modals, use `VisageModalDialog`. Avoid having two parallel overlay systems in new projects — pick one.

### Ensuring All Input Fields Get Full Text Editing

Every `visage::TextEditor` automatically gets the full suite of keyboard shortcuts (Cmd+A/C/V/X/Z, Shift+arrows, Home/End, etc.) — these are built into the `TextEditor::keyPress()` method. However, **in a DAW plugin context**, these shortcuts only work if:

1. **The `performKeyEquivalent:` patch is applied** (windowing_macos.mm) — without this, Cmd+A/C/V/X/Z go to the DAW's Edit menu
2. **The bridge's `convertModifiers()` maps Command to `kModifierCmd`** — not `kModifierMacCtrl`
3. **The bridge's `convertKeyEvent()` explicitly maps modifier+letter combos** — JUCE returns uppercase ASCII, Visage needs `KeyCode::A/C/V/X/Z`
4. **Focus management is wired up** — the bridge's `request_keyboard_focus` callback must toggle `setWantsKeyboardFocus(true)` and call `grabKeyboardFocus()`

If you add a new `TextEditor` anywhere in the UI, it automatically inherits all these behaviors as long as:
- It's in the Visage frame hierarchy (added via `addChild()`)
- The `FrameEventHandler` is propagated (happens automatically through `addChild()`)
- The bridge's mouse event routing calls `checkForFocusRequest()` after `mouseDown` to detect TextEditor clicks

**Custom text input frames**: If you build a custom Frame that accepts text (not using `visage::TextEditor`), you must:
- Override `receivesTextInput()` to return `true`
- Override `textInput(const std::string&)` to handle typed characters
- Set `setAcceptsKeystrokes(true)` on the frame
- Call `requestKeyboardFocus()` when clicked

### Z-Order Summary

Visage has no built-in z-layer system. Render order = child insertion order. To make something appear on top:

| Approach | Use Case |
|----------|----------|
| `frame->setOnTop(true)` | Renders after all non-on-top siblings. Used by `PopupMenuFrame`, `VisageModalDialog` |
| Re-add as last child | Remove then `addChild()` again. Used by dropdown overlay manager |
| Dedicated overlay container | A permanent last-child frame that hosts floating UI. Used by the dropdown manager |
| Add to root frame | Popups add themselves to `topParentFrame()` to escape their local z-context |

**The `topParentFrame()` pattern**: Popups, modals, and menus all walk up the parent chain to the root frame and add themselves there. This ensures they render above all other content regardless of where they were triggered.

### Code Reuse Patterns

**Recommended architecture for new projects:**
- `visage::PopupMenu` — uniform API for all context/selection menus, no per-menu custom drawing
- `VisageModalDialog::show()` — single static entry point for all modal dialogs
- `VisageDropdownManager` — singleton coordinates all dropdown z-order and mutual exclusivity
- Pick **one** overlay system (VisageModalDialog or VisageOverlayBase), not both

**Anti-patterns to avoid:**
- Two parallel "currently open dropdown" trackers — use only the manager's singleton
- `dynamic_cast` chains to detect dialog types for sizing — define `getDesiredSize()` virtual method instead
- Parallel overlay systems doing the same job with different implementations

## Secondary Windows

### Pattern: DocumentWindow + Visage

For secondary windows (waveform editor, virtual keyboard, etc.):

```cpp
class SecondaryWindow : public juce::DocumentWindow, public juce::Timer {
    std::unique_ptr<visage::ApplicationWindow> visageWindow;
    visage::Frame* contentFrame;

    SecondaryWindow() : DocumentWindow("Title", bg, allButtons) {
        setUsingNativeTitleBar(true);  // Native macOS traffic-light buttons
        setResizable(false, false);
    }

    void timerCallback() override {
        if (!visageWindow && isShowing() && getPeer()) {
            createVisageWindow();
        }
        if (visageWindow) {
            visageWindow->drawWindow(); // Manually drive rendering
        }
    }

    void createVisageWindow() {
        auto* handle = getPeer()->getNativeHandle();
        visageWindow = std::make_unique<visage::ApplicationWindow>();

        // For secondary windows in plugin mode, set on top BEFORE show
        if (!juce::JUCEApplicationBase::isStandaloneApp())
            visageWindow->setWindowOnTop(true);

        visageWindow->show(
            visage::Dimension::logicalPixels(getWidth()),
            visage::Dimension::logicalPixels(getHeight()),
            handle
        );
        visageWindow->addChild(contentFrame);
        contentFrame->init();
        contentFrame->setBounds(0, 0, getWidth(), getHeight());
        visageWindow->drawWindow();
    }
};
```

Unlike the primary plugin editor where Visage's native render loop drives updates, secondary windows typically drive rendering manually via a `juce::Timer` at 60 Hz.

**Background painter**: Add a JUCE component that fills with dark gray (`0xFF282828`) as the content component to prevent magenta flash before Visage renders its first frame.

**Window on top in plugin mode**: Call `setWindowOnTop(true)` before `show()` so the secondary window floats above the DAW's plugin window. This sets `NSFloatingWindowLevel` on the window. In standalone mode, this is unnecessary.

## Dirty Rect Optimization

For complex UIs with many independently-updating regions (e.g., 16 sample cells), track which areas actually changed:

```cpp
class FrameWithDirtyRect : public visage::Frame {
    void invalidateRect(int x, int y, int w, int h) {
        // Convert local coordinates to window coordinates
        auto windowRect = localToWindow(x, y, w, h);
        tracker->invalidateRect(windowRect);
    }
};

class DirtyRectTracker {
    std::vector<juce::Rectangle<float>> dirtyRects;
    static constexpr int MAX_DIRTY_RECTS = 20;

    void invalidateRect(juce::Rectangle<float> rect) {
        // Coalesce overlapping or nearby rects
        for (auto& existing : dirtyRects) {
            if (shouldMerge(existing, rect)) {
                existing = existing.getUnion(rect);
                return;
            }
        }
        dirtyRects.push_back(rect);

        if (dirtyRects.size() > MAX_DIRTY_RECTS)
            invalidateAll(); // Too many rects — full redraw is cheaper
    }
};
```

## Watchdog Timer

A watchdog timer prevents stuck states (pink screen, frozen render):

- **Phase 0-20** (first 4 seconds): Force redraws every 200ms
- **Phase 10-30**: Periodic health checks
- If no successful render for 2+ seconds: aggressive redraw
- If no render for 3+ seconds: destroy and recreate the embedded window

## Maintaining Per-Project Notes

### On session start
Look for `docs/juce-visage-notes.md` in the project root. If it exists, read it alongside this skill for project-specific context.

### After solving issues
Update the per-project file with:
- New popup/modal/dropdown instances added
- New Visage patches applied
- Destruction sequence changes
- Debugging insights and workarounds
- New technical debt items

### Pattern: Generic vs Project-Specific
- **Generic** (this skill): How the pattern works, API usage, common mistakes
- **Project-specific** (per-project file): Where the pattern is used, specific file paths, instance inventories

## Common Mistakes Reference

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Create Visage window in constructor | Crash or zero-size window | Defer with timer until `isShowing()` and bounds > 0 |
| Free frames while Metal is running | Use-after-free crash | Call `shutdownRendering()` before any frame destruction |
| Map Cmd to `kModifierMacCtrl` | Clipboard shortcuts silently fail | Map Cmd to `kModifierCmd` on macOS |
| Call `grabKeyboardFocus()` without `setWantsKeyboardFocus(true)` | Focus grab silently ignored | Always set `true` first |
| Call `[super keyDown:]` for unhandled Cmd+key | Cmd+Q doesn't quit the app | Use `[[self nextResponder] keyDown:event]` |
| Skip `performKeyEquivalent:` override | Cmd+C/V/A/X/Z go to DAW menu, not text field; plugin Cmd+key shortcuts never fire | Override with two-tier approach: text editing + plugin shortcuts |
| Don't initialize `keyboard_focused_frame_` | Plugin Cmd+key shortcuts silently ignored until user opens a TextEditor | Call `setKeyboardFocusOnFrame(rootFrame)` after window creation |
| Don't set `acceptsKeystrokes(true)` on root frame | Root frame skipped during key traversal — `handleKeyDown()` returns false | Set `rootFrame->setAcceptsKeystrokes(true)` after creation |
| Add modal to hierarchy before setting event handler | Focus callbacks fail | Copy parent's event handler before `addChild()` |
| Call `setBounds()` before `init()` | Crash in layout computation | Always `init()` first (or let `addChild()` do it) |
| Pass native pixels to `show()` and logical to `setBounds()` | Half-size or double-size view | Use `Dimension::logicalPixels()` for `show()` and logical for `setBounds()` |
| Start with `setWantsKeyboardFocus(true)` | DAW transport keys (spacebar) don't pass through | Start `false`, toggle `true` only when TextEditor activates |
| Expensive init in constructor/prepareToPlay | AU/VST3 scanner timeout, plugin not listed | Lazy-init expensive libraries on first use |
| Parent mouseDown() without frameAtPoint() check | Child widgets (toggles, buttons) don't respond | Check `frameAtPoint()` first, dispatch to child if needed |
| `setAcceptsKeystrokes(true)` in AU/VST3 mode | DAW Musical Typing and transport blocked | Only enable in standalone mode |
| Logging in audio thread (renderNextBlock) | Complete audio silence, thread starvation | Never log in real-time audio callbacks |
| Set child bounds only in `createVisageUI()`, not in `resized()` | Child frames render at ~50% size on HiDPI (native_bounds_ computed at dpi=1.0 and never updated) | Always set child bounds from `resized()` via a `layoutChildren()` helper; apply the `setDpiScale()` native bounds patch to frame.h |
| Forward JUCE mouse events to Visage on iOS | Double events — VisageMetalView handles touches natively | Wrap bridge mouse overrides with `#if !JUCE_IOS` |
| Ignore safe area insets on iOS | UI hidden behind notch/home indicator | Query `display->safeAreaInsets` in `resized()`, apply to root frame |
| Use hover states on iOS | No visible feedback — iOS has no hover (except Apple Pencil) | Skip hover visuals; use press/active states only |
| Small touch targets on iOS | Unusable on mobile — fingers need 44pt+ | Minimum 44pt height for interactive elements |
| Use `performKeyEquivalent:` pattern on iOS | Compile error — method doesn't exist on UIKit | Guard with `#if !JUCE_IOS` or omit entirely for iOS builds |
| Call `setUsingNativeTitleBar(true)` without re-asserting `setSize()` | Editor inflates by ~28px height, ~2px width — empty space at bottom/sides | Always call `setSize(w, h)` immediately after `setUsingNativeTitleBar(true)` |
| Hardcoded modal/overlay dimensions exceeding frame bounds | Panel position goes negative, content clipped at top/sides — title bars and close buttons cut off | Always clamp: `panelH = std::min(desired, height() - margin)` and `panelY = std::max(margin, ...)` |
| Change `GIT_TAG` in CMakeLists.txt without clearing FetchContent cache | JUCE stays at old version — stale source reused from shared `FETCHCONTENT_BASE_DIR` | Delete `~/.juce_cache/juce-src`, `juce-build`, `juce-subbuild`, then regenerate |
| CMakeLists.txt reads `$ENV{JUCE_TAG}` but `.env` not sourced before `cmake` | `JUCE_TAG` is empty, falls back to hardcoded default (often outdated) | Always keep `CMakeLists.txt` fallback default up to date; or source `.env` before `cmake` |
| Use JUCE < 8.0.12 with iOS 26+ | App crashes on launch — `AudioQueueNewOutput` fails with error -50, JUCE assertion in `juce_Audio_ios.cpp` | Update to JUCE 8.0.12+ which skips AudioQueue probe on iOS 26 |

## Visage Patches Checklist

When updating Visage from upstream, re-apply these patches. Patches marked **required** are needed for correct DAW plugin behavior; **recommended** patches improve UX but may not apply to all projects.

1. **`performKeyEquivalent:`** (windowing_macos.mm) — **Required for plugins.** Two-tier: intercepts text editing shortcuts (Cmd+A/C/V/X/Z) when TextEditor is active, AND tries all other Cmd+key through `handleKeyDown()` for plugin shortcuts. Without this, text editing and plugin shortcuts don't work in DAW hosts.
2. **Keyboard focus initialization** (bridge + plugin editor) — **Required for plugin Cmd+key shortcuts.** Set `rootFrame->setAcceptsKeystrokes(true)` and call `setKeyboardFocusOnFrame(rootFrame)` after window creation. Without this, Cmd+key shortcuts only work after user opens a TextEditor.
3. **Cmd+Q propagation** (windowing_macos.mm) — **Required for standalone apps and secondary windows.** `[[self nextResponder] keyDown:event]` for unhandled Cmd+key. Without this, Cmd+Q silently dies in the Visage view.
4. **MTKView 60 FPS cap** (windowing_macos.mm) — **Recommended.** Prevents excessive GPU usage on ProMotion displays. Skip if you want adaptive frame rates.
5. **Popup menu overflow positioning** (popup_menu.cpp) — **Recommended.** Fixes above-position calculation for menus triggered from lower rows. May be fixed in future upstream.
6. **Single-line Up/Down arrows** (text_editor.cpp) — **Optional.** Maps Up→start, Down→end in single-line TextEditors. Standard text field UX but not universal.
7. **setAlwaysOnTop guard** (application_window.cpp) — **Required for plugin mode.** Without this, plugin window may go behind DAW. Only call `setAlwaysOnTop()` when `always_on_top_` is true.
8. **DPI scale native bounds recalculation** (frame.h) — **Required for HiDPI displays.** `setDpiScale()` updates `dpi_scale_` but does NOT recalculate `native_bounds_`. If `setBounds()` was called before the correct DPI propagated (common in plugin mode where DPI arrives via `addChild` from the window), `native_bounds_` stays computed at dpi=1.0. Child frames render at ~50% size. Fix: patch `setDpiScale()` to recalculate `native_bounds_` when DPI changes:

```cpp
void setDpiScale(float dpi_scale) {
    bool changed = dpi_scale_ != dpi_scale;
    dpi_scale_ = dpi_scale;

    if (changed) {
        // Recalculate native bounds with new DPI scale
        IBounds new_native_bounds = (bounds_ * dpi_scale_).round();
        if (native_bounds_ != new_native_bounds) {
            native_bounds_ = new_native_bounds;
            region_.setBounds(native_bounds_.x(), native_bounds_.y(),
                              native_bounds_.width(), native_bounds_.height());
        }

        on_dpi_change_.callback();
        redraw();
    }

    for (Frame* child : children_)
        child->setDpiScale(dpi_scale);
}
```

**Application-level defense-in-depth**: Always set child bounds from the editor's `resized()` method (via a `layoutChildren()` helper), not only once in `createVisageUI()`. This ensures child bounds are recalculated whenever layout fires, which also recalculates `native_bounds_` with the current DPI.

**Symptom**: Root frame fills window correctly (background, borders draw full-size), but child frames appear at 50-65% of intended size, clustered toward top-left. All DPI debug values report correctly (2.0). Particularly confusing because it looks like a DPI issue but all DPI values are correct.

**Why it happens**: In plugin mode, `createVisageUI()` creates the root frame (dpi=1.0 default) → children are added and inherit dpi=1.0 → `child->setBounds()` computes `native_bounds_` at dpi=1.0 → bridge timer fires → `createEmbeddedWindow()` → `addChild(rootFrame)` propagates dpi=2.0 → `setDpiScale(2.0)` updates `dpi_scale_` but NOT `native_bounds_` → region draws at wrong native size.

Test thoroughly after updates, especially popup menus and text editing in plugin hosts (Logic Pro, Ableton).

## File Reference

### Typical Bridge Layer Files (your project)

| File Pattern | Purpose |
|------|---------|
| `Source/Visage/JuceVisageBridge.h/cpp` | Primary bridge: window creation, event conversion, focus, dirty rects |
| `Source/Visage/VisagePluginEditor.h/cpp` | Main editor: `createVisageUI()`, timer init, destruction ordering |
| `Source/Visage/VisageModalDialog.h/cpp` | Modal overlay: `show()` static method with full lifecycle |
| `Source/Visage/VisageDropdownManager.h/cpp` | Z-order management singleton for dropdowns |
| `Source/Visage/VisageDropdown.h` | Custom combo box + dropdown list |
| `Source/Visage/VisageOverlayBase.h/cpp` | Base class for animated overlay frames with blur |

### Visage Library (external/visage/)
| File | Purpose |
|------|---------|
| `visage_ui/frame.h/cpp` | Frame base class (equivalent to JUCE Component) |
| `visage_ui/events.h` | MouseEvent, KeyEvent, modifiers |
| `visage_ui/popup_menu.h/cpp` | PopupMenu, PopupList, PopupMenuFrame |
| `visage_ui/layout.h` | Flexbox and margin-based layout |
| `visage_ui/scroll_bar.h` | ScrollableFrame, ScrollBar |
| `visage_widgets/text_editor.h/cpp` | Full text editing widget with undo, clipboard, dead keys |
| `visage_widgets/button.h` | Button, UiButton, IconButton, ToggleButton hierarchy |
| `visage_app/application_editor.h/cpp` | Bridge between window system and frame tree |
| `visage_app/application_window.cpp` | ApplicationWindow — apply setAlwaysOnTop guard patch here |
| `visage_app/window_event_handler.h/cpp` | Event routing hub: focus, hover, keyboard, mouse |
| `visage_windowing/windowing.h` | Abstract Window + EventHandler interface |
| `visage_windowing/macos/windowing_macos.mm` | macOS impl: VisageAppView (MTKView), patches 1-3 |
| `visage_windowing/ios/windowing_ios.h` | iOS WindowIos class declaration |
| `visage_windowing/ios/windowing_ios.mm` | iOS impl: VisageMetalView (MTKView), touch→mouse mapping |
| `visage_graphics/canvas.h` | Canvas drawing API (rectangle, text, SVG, etc.) |
| `visage_graphics/renderer.h` | bgfx/Metal renderer |
| `visage_utils/events.h` | KeyCode enum, modifier constants |
| `visage_utils/space.h` | Bounds, Point, IBounds, Dimension types |

## Visage API Reference

> Comprehensive API reference verified against [danielraffel/visage](https://github.com/danielraffel/visage) (patched fork). Covers Frame, Canvas, Color/Brush/Theme, Font, PostEffect, Widget, Event, and Dimension systems. See the [visage-ui-cookbook](https://github.com/danielraffel/visage-ui-cookbook) for related resources.

### 2. Frame API Reference

`Frame` is Visage's base UI class (analogous to JUCE's `Component`). Header: `visage_ui/frame.h`

### Constructors

```cpp
Frame();                          // Default
Frame(std::string name);          // Named frame
```

### Lifecycle (virtual, override these)

```cpp
void draw(Canvas& canvas);       // Called each frame to draw content
void resized();                   // Called when bounds change
void visibilityChanged();         // Called when visibility changes
void hierarchyChanged();          // Called when added/removed from parent
void focusChanged(bool is_focused, bool was_clicked);
void init();                      // Called once when frame enters hierarchy
void destroy();                   // Called when frame is destroyed
void dpiChanged();                // Called when DPI scale changes
```

### Mouse Events (virtual, override these)

```cpp
void mouseEnter(const MouseEvent& e);
void mouseExit(const MouseEvent& e);
void mouseDown(const MouseEvent& e);
void mouseUp(const MouseEvent& e);
void mouseMove(const MouseEvent& e);
void mouseDrag(const MouseEvent& e);
bool mouseWheel(const MouseEvent& e);   // Return true if consumed
```

### Keyboard Events (virtual, override these)

```cpp
bool keyPress(const KeyEvent& e);       // Return true if consumed
bool keyRelease(const KeyEvent& e);     // Return true if consumed
void textInput(const std::string& text);
bool receivesTextInput();               // Override to return true for text input
```

### Drag & Drop (virtual, override these)

```cpp
bool receivesDragDropFiles();
std::string dragDropFileExtensionRegex();
void dragFilesEnter(const std::vector<std::string>& paths);
void dragFilesExit();
void dropFiles(const std::vector<std::string>& paths);
```

### Child Management

```cpp
void addChild(Frame* child, bool make_visible = true);
void addChild(Frame& child, bool make_visible = true);
void addChild(std::unique_ptr<Frame> child, bool make_visible = true);
void removeChild(Frame* child);
void removeAllChildren();
int indexOfChild(const Frame* child) const;
const std::vector<Frame*>& children() const;
Frame* parent() const;
```

### Bounds & Position

```cpp
void setBounds(Bounds bounds);
void setBounds(float x, float y, float width, float height);
float x() const;
float y() const;
float width() const;
float height() const;
float right() const;
float bottom() const;
const Bounds& bounds() const;
Bounds localBounds() const;       // Returns {0, 0, width(), height()}
void setTopLeft(float x, float y);
Point positionInWindow() const;
Bounds relativeBounds(const Frame* other) const;
```

### Layout (Flexbox)

Access via `frame.layout()`:

```cpp
Layout& layout();
void setFlexLayout(bool flex);
// On the Layout object:
layout.setFlexRows(bool rows);            // true = row direction, false = column
layout.setFlexReverseDirection(bool rev);
layout.setFlexWrap(bool wrap);
layout.setFlexWrapReverse(bool wrap);
layout.setFlexGap(Dimension gap);
layout.setFlexGrow(float grow);
layout.setFlexShrink(float shrink);
layout.setFlexItemAlignment(ItemAlignment);   // Stretch, Start, Center, End
layout.setFlexSelfAlignment(ItemAlignment);
layout.setFlexWrapAlignment(WrapAlignment);   // Start, Center, End, Stretch, SpaceBetween, SpaceAround, SpaceEvenly
layout.setWidth(Dimension);
layout.setHeight(Dimension);
layout.setDimensions(Dimension w, Dimension h);
layout.setMargin(Dimension);
layout.setMarginLeft/Right/Top/Bottom(Dimension);
layout.setPadding(Dimension);
layout.setPaddingLeft/Right/Top/Bottom(Dimension);
```

### Visibility & Drawing

```cpp
void setVisible(bool visible);
bool isVisible() const;
void setDrawing(bool drawing);
bool isDrawing() const;
void setOnTop(bool on_top);
bool isOnTop() const;
void redraw();                    // Request a redraw
void redrawAll();                 // Redraw this and all children
```

### Effects & Transparency

```cpp
void setPostEffect(PostEffect* post_effect);
PostEffect* postEffect() const;
void removePostEffect();
void setAlphaTransparency(float alpha);
void removeAlphaTransparency();
void setCached(bool cached);
void setMasked(bool masked);
```

### Focus & Input

```cpp
void requestKeyboardFocus();
void setAcceptsKeystrokes(bool accepts);
bool acceptsKeystrokes() const;
bool hasKeyboardFocus() const;
void setIgnoresMouseEvents(bool ignore, bool pass_to_children);
```

### Palette / Theme

```cpp
void setPalette(Palette* palette);
Palette* palette() const;
float paletteValue(theme::ValueId id) const;
Brush paletteColor(theme::ColorId id) const;
```

### Clipboard

```cpp
std::string readClipboardText();
void setClipboardText(const std::string& text);
```

### Cursor

```cpp
void setCursorStyle(MouseCursor style);
void setCursorVisible(bool visible);
```

### Undo/Redo

```cpp
void addUndoableAction(std::unique_ptr<UndoableAction> action) const;
void triggerUndo() const;
void triggerRedo() const;
bool canUndo() const;
bool canRedo() const;
```

### Callback-Based Event Hooks

Instead of (or in addition to) overriding virtual methods, you can attach callbacks:

```cpp
frame.onDraw() += [](Canvas& c) { /* ... */ };
frame.onResize() += [] { /* ... */ };
frame.onMouseDown() += [](const MouseEvent& e) { /* ... */ };
frame.onMouseUp() += [](const MouseEvent& e) { /* ... */ };
frame.onMouseMove() += [](const MouseEvent& e) { /* ... */ };
frame.onMouseDrag() += [](const MouseEvent& e) { /* ... */ };
frame.onMouseEnter() += [](const MouseEvent& e) { /* ... */ };
frame.onMouseExit() += [](const MouseEvent& e) { /* ... */ };
frame.onMouseWheel() += [](const MouseEvent& e) { return false; };
frame.onKeyPress() += [](const KeyEvent& e) { return false; };
frame.onKeyRelease() += [](const KeyEvent& e) { return false; };
frame.onTextInput() += [](const std::string& text) { /* ... */ };
frame.onVisibilityChange() += [] { /* ... */ };
frame.onHierarchyChange() += [] { /* ... */ };
frame.onFocusChange() += [](bool focused, bool clicked) { /* ... */ };
frame.onDpiChange() += [] { /* ... */ };
```

---


### 3. Canvas API Reference

`Canvas` provides GPU-accelerated drawing primitives. Header: `visage_graphics/canvas.h`

### Filled Shapes

All shape methods accept `Dimension` values or plain floats.

```cpp
canvas.fill(x, y, width, height);                    // Filled rectangle (no rounding)
canvas.circle(x, y, diameter);                        // Filled circle
canvas.rectangle(x, y, width, height);                // Antialiased rectangle
canvas.roundedRectangle(x, y, w, h, rounding);        // Rounded rectangle
canvas.diamond(x, y, width, rounding);                 // Diamond shape
canvas.squircle(x, y, width, power);                   // Squircle (default power=4)
canvas.triangle(ax, ay, bx, by, cx, cy);               // Triangle from 3 points
canvas.roundedTriangle(ax, ay, bx, by, cx, cy, rounding);
```

### Directional Triangles

```cpp
canvas.triangleLeft(x, y, width);
canvas.triangleRight(x, y, width);
canvas.triangleUp(x, y, width);
canvas.triangleDown(x, y, width);
```

### Borders / Outlines

```cpp
canvas.rectangleBorder(x, y, w, h, thickness);
canvas.roundedRectangleBorder(x, y, w, h, rounding, thickness);
canvas.triangleBorder(ax, ay, bx, by, cx, cy, thickness);
canvas.roundedTriangleBorder(ax, ay, bx, by, cx, cy, rounding, thickness);
canvas.squircleBorder(x, y, width, power, thickness);
canvas.ring(x, y, diameter, thickness);               // Circle border
```

### Partial-Side Rounded Rectangles

```cpp
canvas.leftRoundedRectangle(x, y, w, h, rounding);
canvas.rightRoundedRectangle(x, y, w, h, rounding);
canvas.topRoundedRectangle(x, y, w, h, rounding);
canvas.bottomRoundedRectangle(x, y, w, h, rounding);
```

### Arcs & Segments

```cpp
canvas.arc(x, y, diameter, thickness, center_radians, radians, rounded);
canvas.roundedArc(x, y, diameter, thickness, center_radians, radians);
canvas.flatArc(x, y, diameter, thickness, center_radians, radians);
canvas.segment(ax, ay, bx, by, thickness, rounded);    // Line segment between two points
canvas.quadratic(ax, ay, bx, by, cx, cy, thickness);   // Quadratic bezier curve
```

### Shadows

```cpp
canvas.rectangleShadow(x, y, w, h, blur_radius);
canvas.roundedRectangleShadow(x, y, w, h, rounding, blur_radius);
canvas.roundedArcShadow(x, y, diameter, thickness, center_rad, rad, shadow_width);
canvas.flatArcShadow(x, y, diameter, thickness, center_rad, rad, shadow_width);
canvas.fadeCircle(x, y, diameter, pixel_width);         // Faded edge circle
```

### Text

```cpp
// Using a String + Font directly:
canvas.text(string, font, justification, x, y, width, height);
canvas.text(string, font, justification, x, y, width, height, direction);

// Using a Text object:
canvas.text(text_ptr, x, y, width, height);
canvas.text(text_ptr, x, y, width, height, direction);
```

### Images & SVGs

```cpp
canvas.svg(svg_data, svg_size, x, y, width, height);
canvas.svg(svg_data, svg_size, x, y, width, height, blur_radius);
canvas.svg(embedded_file, x, y, width, height);
canvas.svg(Svg, x, y);                                 // Using pre-configured Svg struct

canvas.image(image_data, image_size, x, y, width, height);
canvas.image(embedded_file, x, y, width, height);
canvas.image(Image, x, y);                              // Using pre-configured Image struct
```

### Lines & Data Visualization

```cpp
canvas.line(Line* line, x, y, w, h, line_width);
canvas.lineFill(Line* line, x, y, w, h, fill_position);
```

For graph data, use the `GraphLine` widget (in `visage_widgets/graph_line.h`).

### Shaders

```cpp
canvas.shader(Shader* shader, x, y, width, height);
```

### Color & Brush

```cpp
canvas.setColor(unsigned int argb);           // e.g., 0xff00ff00
canvas.setColor(Color color);
canvas.setColor(Brush brush);
canvas.setColor(theme::ColorId id);           // Theme color
canvas.setBrush(Brush brush);
canvas.setBlendedColor(color_from, color_to, t);

// Read themed colors/values:
Brush brush = canvas.color(theme::ColorId);
float val = canvas.value(theme::ValueId);
```

### Canvas State

```cpp
canvas.saveState();                           // Push current state
canvas.restoreState();                        // Pop state
canvas.setPosition(float x, float y);        // Offset subsequent drawing
canvas.setClampBounds(x, y, w, h);           // Clip region
canvas.trimClampBounds(x, y, w, h);          // Intersect with current clip
canvas.setBlendMode(BlendMode mode);          // Alpha, Add, Multiply, etc.
```

### Timing

```cpp
double canvas.time();                         // Current render time
double canvas.deltaTime();                    // Time since last frame
int canvas.frameCount();                      // Frame counter
```

### NOT in the Canvas API

These methods **do not exist** — don't use them:

- `canvas.save()` / `canvas.restore()` — use `saveState()` / `restoreState()`
- `canvas.translate()` — use `setPosition()`
- `canvas.clipRect()` — use `setClampBounds()`
- `canvas.rotate()` — not available
- `canvas.scale()` — not available
- `canvas.graphLine()` / `canvas.graphFill()` / `canvas.heatMap()` — use `GraphLine` widget or `Line`/`LineFill` shapes

---


### 4. Color, Brush & Theme System

### Color (`visage_graphics/color.h`)

ARGB unsigned int format. Constructors:

```cpp
Color(unsigned int argb);                             // e.g., Color(0xff3366ff)
Color(unsigned int argb, float hdr);                  // With HDR multiplier
Color(float alpha, float red, float green, float blue);
Color::fromAHSV(float alpha, float hue, float saturation, float value);  // HSV
Color::fromARGB(unsigned int argb);
Color::fromABGR(unsigned int abgr);
Color::fromHexString("#ff3366");
```

Key methods:

```cpp
float alpha(), red(), green(), blue(), hdr();
float hue(), saturation(), value();
Color interpolateWith(const Color& other, float t) const;
Color withAlpha(float alpha) const;
unsigned int toARGB() const;
unsigned int toABGR() const;
std::string toARGBHexString() const;
std::string toRGBHexString() const;
```

### Brush (`visage_graphics/gradient.h`)

A `Brush` wraps a `Gradient` and a `GradientPosition` to define colored fills.

```cpp
Brush::solid(const Color& color);                      // Solid color (unsigned int converts implicitly)

Brush::horizontal(Color left, Color right);            // Horizontal gradient
Brush::horizontal(Gradient gradient);

Brush::vertical(Color top, Color bottom);              // Vertical gradient
Brush::vertical(Gradient gradient);

Brush::linear(Gradient gradient, Point from, Point to); // Linear gradient
Brush::linear(Color from, Color to, Point from_pos, Point to_pos);

Brush::interpolate(const Brush& from, const Brush& to, float t);  // Interpolate brushes

brush.withMultipliedAlpha(float mult);
brush.interpolateWith(const Brush& other, float t) const;
```

### Gradient (`visage_graphics/gradient.h`)

```cpp
Gradient();                                            // Empty
Gradient(Color c1, Color c2);                          // Two-color
Gradient(Color c1, Color c2, Color c3);                // Three-color (variadic)
Gradient::fromSampleFunction(int resolution, [](float t) -> Color { ... });
Gradient::interpolate(const Gradient& from, const Gradient& to, float t);

Color gradient.sample(float t) const;                  // Sample at position [0,1]
int gradient.resolution() const;
gradient.withMultipliedAlpha(float mult);
gradient.interpolateWith(const Gradient& other, float t) const;
```

### Theme System (`visage_graphics/theme.h`)

Define themed colors and values with macros:

```cpp
// In a header or namespace scope:
VISAGE_THEME_COLOR(BackgroundColor, 0xff1a1a2e);       // Name, default ARGB
VISAGE_THEME_COLOR(TextColor, 0xffffffff);
VISAGE_THEME_VALUE(BorderRadius, 8.0f);                // Name, default float
VISAGE_THEME_VALUE(FontSize, 14.0f);

// Override groups:
VISAGE_THEME_PALETTE_OVERRIDE(DarkMode);
```

Reading theme values in `draw()`:

```cpp
void draw(Canvas& canvas) override {
    canvas.setColor(BackgroundColor);                  // Uses canvas.color(ColorId)
    canvas.fill(0, 0, width(), height());

    float radius = canvas.value(BorderRadius);         // Reads themed value
    canvas.roundedRectangle(10, 10, 100, 50, radius);
}
```

Reading from a Frame (outside `draw()`):

```cpp
float val = paletteValue(BorderRadius);                // Frame method
Brush col = paletteColor(BackgroundColor);             // Frame method
```

### Palette (`visage_graphics/palette.h`)

A `Palette` stores overridden color and value assignments:

```cpp
Palette palette;
palette.initWithDefaults();                            // Load all default values
frame.setPalette(&palette);                            // Apply to frame tree

// Override specific values per OverrideId
frame.setPaletteOverride(DarkMode, true);              // Recursive
```

---


### 5. Font & Text

### Font (`visage_graphics/font.h`)

Fonts must be embedded as byte arrays (via `visage_file_embed`).

```cpp
Font(float size, const unsigned char* data, int data_size);
Font(float size, const EmbeddedFile& file);             // Preferred
Font(float size, const std::string& file_path);

Font font.withSize(float size) const;
Font font.withDpiScale(float scale) const;

float font.stringWidth(const char32_t* str, int len) const;
float font.stringWidth(const std::u32string& str) const;
float font.lineHeight() const;
float font.capitalHeight() const;
float font.lowerDipHeight() const;
int font.size() const;
```

### Justification

```cpp
Font::kCenter                // Default
Font::kLeft
Font::kRight
Font::kTop
Font::kBottom
Font::kTopLeft
Font::kBottomLeft
Font::kTopRight
Font::kBottomRight
```

### Text Class (`visage_graphics/text.h`)

A `Text` object holds a string, font, and justification together:

```cpp
Text text("Hello", font, Font::kLeft);
text.setText("Updated");
text.setFont(new_font);
text.setJustification(Font::kCenter);
text.setMultiLine(true);
```

### Drawing Text

```cpp
void draw(Canvas& canvas) override {
    canvas.setColor(0xffffffff);
    canvas.text("Hello", font_, Font::kLeft, 10, 10, 200, 30);

    // Or with a Text object:
    canvas.text(&text_, 10, 50, 200, 30);
}
```

---


### 6. PostEffect System

Three user-facing post-effect classes (plus `PostEffect` and `DownsamplePostEffect` base classes). Header: `visage_graphics/post_effects.h`

### BlurPostEffect

```cpp
BlurPostEffect blur;
blur.setBlurSize(float size);        // Blur radius (log2 scale internally)
blur.setBlurAmount(float amount);    // Blur intensity
frame.setPostEffect(&blur);
```

### BloomPostEffect

```cpp
BloomPostEffect bloom;
bloom.setBloomSize(float size);          // Bloom spread
bloom.setBloomIntensity(float intensity); // Bloom brightness
frame.setPostEffect(&bloom);
```

### ShaderPostEffect

Custom GPU shader applied as a post-effect:

```cpp
ShaderPostEffect shader_effect(vertex_shader_file, fragment_shader_file);
shader_effect.setUniformValue("brightness", 1.5f);
shader_effect.setUniformValue("tint", 1.0f, 0.8f, 0.6f, 1.0f);
shader_effect.removeUniform("brightness");
shader_effect.setState(BlendMode::Add);
frame.setPostEffect(&shader_effect);
```

### Applying Effects

```cpp
frame.setPostEffect(&effect);    // Apply post-effect to frame
frame.removePostEffect();        // Remove post-effect
```

### NOT Real Effect Classes

These do **not** exist in Visage:
- `DropShadowEffect` — use `canvas.roundedRectangleShadow()` or `canvas.rectangleShadow()` instead
- `FilmGrainEffect` — does not exist
- `ChromaticAberrationEffect` — does not exist
- `BlurEffect` — the correct name is `BlurPostEffect`
- `BloomEffect` — the correct name is `BloomPostEffect`

---


### 7. Widget Classes

### Button (`visage_widgets/button.h`)

Base class with hover animation:

```cpp
class Button : public Frame {
    auto& onToggle();                     // Callback: void(Button*, bool)
    virtual bool toggle();
    virtual void setToggled(bool toggled);
    void setToggleOnMouseDown(bool on_down);
    float hoverAmount() const;
    void setActive(bool active);
};
```

### UiButton — Styled text button

```cpp
UiButton button("Click Me");
UiButton button("OK", custom_font);
button.setText("New Label");
button.setFont(font);
button.setActionButton(true);             // Primary action styling
button.onToggle() += [](Button* b, bool on) { /* handle click */ };
```

### IconButton — SVG icon button

```cpp
IconButton button(embedded_svg_file);
IconButton button(svg_data, svg_size, /*shadow=*/true);
button.setIcon(new_svg);
button.setMarginRatio(0.1f);
button.setShadowProportion(0.1f);
```

### ToggleButton — Stateful toggle

```cpp
ToggleButton toggle;
toggle.setToggled(true);
bool is_on = toggle.toggled();
toggle.onToggle() += [](Button* b, bool on) { /* handle toggle */ };
```

### ToggleIconButton — SVG toggle

```cpp
ToggleIconButton toggle(icon_svg);
```

### ToggleTextButton — Text toggle

```cpp
ToggleTextButton toggle("Option A");
toggle.setText("Updated");
toggle.setDrawBackground(false);
```

### PopupMenu (`visage_ui/popup_menu.h`)

```cpp
PopupMenu menu;
menu.addOption(1, "Option One");
menu.addOption(2, "Option Two").enable(false);   // Disabled
menu.addOption(3, "Checked").select(true);        // Checked
menu.addBreak();                                  // Separator

PopupMenu sub;
sub.addOption(10, "Sub Item");
menu.addSubMenu(PopupMenu("Submenu", -1, {sub}));

menu.onSelection() += [](int id) {
    // Handle selection
};

menu.onCancel() += [] {
    // Menu dismissed
};

menu.show(source_frame);                          // Show at default position
menu.show(source_frame, Point(100, 200));          // Show at specific point
```

Native menu bar (macOS):

```cpp
menu.setAsNativeMenuBar();   // or: visage::setNativeMenuBar(menu);
```

### ScrollableFrame (`visage_ui/scroll_bar.h`)

A frame with built-in vertical scrolling:

```cpp
class MyScrollView : public ScrollableFrame {
    void resized() override {
        ScrollableFrame::resized();
        setScrollableHeight(total_content_height);
        // Position children inside the scrollable container
    }
};

// Adding scrollable children:
scroll_frame.addScrolledChild(&child);
scroll_frame.setScrollableHeight(2000.0f);
scroll_frame.setYPosition(100.0f);
scroll_frame.scrollUp();
scroll_frame.scrollDown();
scroll_frame.setSensitivity(100.0f);
scroll_frame.setSmoothTime(0.1f);
scroll_frame.setScrollBarRounding(4.0f);
scroll_frame.setScrollBarLeft(true);
scroll_frame.onScroll() += [](ScrollableFrame* sf) { /* scrolled */ };
```

### TextEditor (`visage_widgets/text_editor.h`)

Multi-line text editor with selection, clipboard, undo/redo:

```cpp
TextEditor editor("name");
editor.setNumberEntry();         // Numeric input mode
editor.setTextFieldEntry();      // Text field mode
editor.clear();
editor.insertTextAtCaret(text);
editor.selectAll();
editor.copyToClipboard();
editor.cutToClipboard();
editor.pasteFromClipboard();
```

`TextEditor` extends `ScrollableFrame` and handles `keyPress`, `textInput`, `mouseDown`/`mouseDrag` for text selection, and double/triple-click word/line selection.

---


### 9. Event System

### MouseEvent (`visage_ui/events.h`)

```cpp
Point e.position;                       // Position relative to frame
Point e.relativePosition();             // Same as position
Point e.windowPosition();               // Position in window coordinates
MouseEvent e.relativeTo(const Frame* frame);  // Remap to another frame's coordinates

// Button state:
bool e.isLeftButton();
bool e.isMiddleButton();
bool e.isRightButton();
bool e.isLeftButtonCurrentlyDown();
bool e.isDown();
int e.repeatClickCount();

// Modifiers:
bool e.isAltDown();      // or isOptionDown()
bool e.isShiftDown();
bool e.isCmdDown();
bool e.isRegCtrlDown();
bool e.isMacCtrlDown();
bool e.isCtrlDown();     // Ctrl or Mac Ctrl
bool e.isMainModifier(); // Cmd (macOS) or Ctrl (Windows)

// Scroll wheel:
float e.wheel_delta_x, e.wheel_delta_y;
float e.precise_wheel_delta_x, e.precise_wheel_delta_y;
bool e.hasWheelMomentum();

// Touch:
bool e.isTouch();
bool e.isMouse();

// Context menu:
bool e.shouldTriggerPopup();   // Right-click or Ctrl+click on macOS
```

### KeyEvent (`visage_ui/events.h`)

```cpp
KeyCode e.keyCode();
bool e.isRepeat();
bool e.isAltDown();
bool e.isShiftDown();
bool e.isCmdDown();
bool e.isRegCtrlDown();
bool e.isMainModifier();       // Cmd (macOS) or Ctrl (Windows)
int e.modifierMask();
```

### EventTimer (`visage_ui/events.h`)

```cpp
class MyFrame : public Frame, public EventTimer {
    void timerCallback() override {
        // Called periodically
        redraw();
    }

    void init() override {
        startTimer(16);    // ~60 FPS
    }

    void destroy() override {
        stopTimer();
    }
};
```

### Thread-Safe Callbacks

```cpp
visage::runOnEventThread([] {
    // Runs on the event thread
});
```

---


### 10. Dimension System

Visage uses `Dimension` for DPI-aware and relative sizing. Header: `visage_utils/dimension.h`

### Dimension Literals

```cpp
using namespace visage::dimension;

auto w = 100_px;      // Logical pixels (scaled by DPI)
auto h = 50_npx;      // Native pixels (unscaled)
auto w2 = 50_vw;      // 50% of parent width
auto h2 = 25_vh;      // 25% of parent height
auto s = 10_vmin;      // 10% of min(parent_width, parent_height)
auto s2 = 10_vmax;     // 10% of max(parent_width, parent_height)
```

### Dimension Arithmetic

```cpp
auto combined = 100_px + 5_vw;     // Add dimensions
auto diff = 50_vw - 20_px;         // Subtract
auto scaled = 100_px * 0.5f;       // Scale
auto capped = Dimension::min(100_px, 50_vw);   // Min
auto floored = Dimension::max(50_px, 10_vw);   // Max
```

### Static Constructors

```cpp
Dimension::logicalPixels(100.0f);     // Same as 100_px
Dimension::nativePixels(100.0f);      // Same as 100_npx
Dimension::widthPercent(50.0f);        // Same as 50_vw
Dimension::heightPercent(25.0f);       // Same as 25_vh
Dimension::viewMinPercent(10.0f);      // Same as 10_vmin
Dimension::viewMaxPercent(10.0f);      // Same as 10_vmax
```

---


### 11. JUCE-to-Visage Migration Patterns

### Component → Frame

| JUCE | Visage |
|------|--------|
| `class MyComp : public Component` | `class MyFrame : public Frame` |
| `void paint(Graphics& g)` | `void draw(Canvas& canvas)` |
| `void resized()` | `void resized()` (same name) |
| `addAndMakeVisible(child)` | `addChild(&child)` |
| `removeChildComponent(&child)` | `removeChild(&child)` |
| `setBounds(x, y, w, h)` | `setBounds(x, y, w, h)` (same) |
| `getWidth()`, `getHeight()` | `width()`, `height()` |
| `getLocalBounds()` | `localBounds()` |
| `repaint()` | `redraw()` |
| `setVisible(bool)` | `setVisible(bool)` (same) |
| `isVisible()` | `isVisible()` (same) |
| `grabKeyboardFocus()` | `requestKeyboardFocus()` |
| `hasKeyboardFocus(false)` | `hasKeyboardFocus()` |

### paint(Graphics&) → draw(Canvas&)

| JUCE `Graphics` | Visage `Canvas` |
|-----------------|-----------------|
| `g.setColour(Colour)` | `canvas.setColor(0xAARRGGBB)` |
| `g.fillAll()` | `canvas.fill(0, 0, width(), height())` |
| `g.fillRect(x,y,w,h)` | `canvas.fill(x, y, w, h)` |
| `g.fillRoundedRectangle(...)` | `canvas.roundedRectangle(x, y, w, h, r)` |
| `g.drawRoundedRectangle(...)` | `canvas.roundedRectangleBorder(x, y, w, h, r, thickness)` |
| `g.fillEllipse(x,y,w,h)` | `canvas.circle(x, y, diameter)` |
| `g.drawText(text, area, just)` | `canvas.text(str, font, just, x, y, w, h)` |
| `g.drawImage(img, ...)` | `canvas.image(data, size, x, y, w, h)` |
| `g.saveState()` | `canvas.saveState()` |
| `g.restoreState()` | `canvas.restoreState()` |
| `g.reduceClipRegion(...)` | `canvas.setClampBounds(x, y, w, h)` |
| `g.setOrigin(x, y)` | `canvas.setPosition(x, y)` |

### Timer → EventTimer / redraw()

JUCE's `Timer` maps to `EventTimer`:

```cpp
// JUCE:
class MyComp : public Component, public Timer {
    void timerCallback() override { repaint(); }
};

// Visage:
class MyFrame : public Frame, public EventTimer {
    void timerCallback() override { redraw(); }
};
```

For simple animation, just call `redraw()` and use `canvas.time()` / `canvas.deltaTime()`.

### LookAndFeel → Palette/Theme

```cpp
// JUCE:
getLookAndFeel().findColour(Slider::thumbColourId);

// Visage:
VISAGE_THEME_COLOR(SliderThumb, 0xff4488ff);   // Define once
canvas.setColor(SliderThumb);                   // Use in draw()
```

### Common Gotchas

1. **No `translate`/`rotate`/`scale`** — Canvas has `setPosition()` for offset but no rotation or scaling transforms.
2. **`saveState`/`restoreState`, not `save`/`restore`** — The method names differ from JUCE.
3. **`setClampBounds`, not `clipRect`** — Clipping uses clamp bounds, which are axis-aligned rectangles.
4. **Coordinate system** — Same as JUCE: origin at top-left, y increases downward.
5. **`draw()` is called per frame** — Unlike JUCE's `paint()` which is called on-demand, `draw()` runs every frame when the region is dirty. Call `redraw()` to mark dirty.
6. **Children are not automatically positioned** — Without flex layout, you must manually `setBounds()` children in `resized()`.
7. **Thread model** — Drawing happens on the render thread. Use `runOnEventThread()` for thread-safe callbacks.
8. **`setDpiScale()` does NOT recalculate `native_bounds_`** — This is a critical bug in upstream Visage. When `setBounds()` is called, it computes `native_bounds_ = (bounds * dpi_scale_).round()`. If DPI changes later (e.g., via `addChild` propagation from a Retina-aware parent), `native_bounds_` is NOT updated. Child frames end up with wrong region sizes and render at ~50% size on Retina displays. **Fix**: Patch `setDpiScale()` in `frame.h` to recalculate native bounds when DPI changes, AND always set child bounds from `resized()`/`layoutChildren()` (not just once in setup). See Section 12 for the patch.

---


### 13. Build System

### CMake Integration (FetchContent)

```cmake
include(FetchContent)
FetchContent_Declare(visage
    GIT_REPOSITORY https://github.com/danielraffel/visage.git
    GIT_TAG main
)
FetchContent_MakeAvailable(visage)

target_link_libraries(MyTarget PRIVATE visage)
```

### Direct Inclusion

```cmake
add_subdirectory(external/visage)
target_link_libraries(MyTarget PRIVATE visage)
```

### Key CMake Targets

- `visage` — Main static library (links all modules together)
- Individual modules (PascalCase): `VisageApp`, `VisageGraphics`, `VisageUi`, `VisageUtils`, `VisageWidgets`, `VisageWindowing`

### Embedding Fonts/Icons

Use the `add_embedded_resources` CMake function (provided by `visage_file_embed`):

```cmake
# Signature: add_embedded_resources(target_name header_filename namespace files...)
set(MY_FONTS
    ${CMAKE_CURRENT_SOURCE_DIR}/fonts/MyFont.ttf
    ${CMAKE_CURRENT_SOURCE_DIR}/icons/my_icon.svg
)
add_embedded_resources(MyEmbeddedAssets "fonts.h" my_fonts "${MY_FONTS}")
target_link_libraries(MyTarget PRIVATE MyEmbeddedAssets)
```

This generates a static library with `EmbeddedFile` constants you can use with `Font` and `Canvas::svg()`.

### JUCE Version Management with FetchContent

When JUCE is fetched via `FetchContent` with a shared cache directory (`FETCHCONTENT_BASE_DIR`), **changing the `GIT_TAG` in CMakeLists.txt does NOT automatically re-fetch JUCE**. CMake sees the existing source directory and reuses it, even if the tag has changed.

**The problem**: If your project uses `FETCHCONTENT_BASE_DIR` to share JUCE across projects (common pattern to avoid re-downloading), upgrading JUCE requires manual cache clearing:

```cmake
# CMakeLists.txt pattern that causes stale cache:
set(FETCHCONTENT_BASE_DIR "$ENV{HOME}/.juce_cache")
FetchContent_Declare(JUCE
    GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
    GIT_TAG 8.0.12    # Changed from 8.0.8 — but CMake won't re-fetch!
    GIT_SHALLOW ON
)
```

**To update JUCE version**:
1. Update the `GIT_TAG` in `CMakeLists.txt` (and `.env` if applicable)
2. Delete the cached JUCE source: `rm -rf ~/.juce_cache/juce-src ~/.juce_cache/juce-build ~/.juce_cache/juce-subbuild`
3. Delete your build directory: `rm -rf build-ios` (or `build/`)
4. Regenerate: `cmake -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS`

**Critical**: If `JUCE_TAG` is read from `$ENV{JUCE_TAG}` (e.g., from `.env`), ensure the environment variable is sourced before running CMake. If running `cmake` directly (not through a build script that sources `.env`), the env var will be empty and CMake falls back to the hardcoded default. **Always keep the fallback default in `CMakeLists.txt` up to date** with your intended JUCE version.

**iOS 26+ requires JUCE 8.0.12+**: JUCE 8.0.8–8.0.11 crash on iOS 26 due to `AudioQueueNewOutput` failing with error -50 in `getSampleRateFromAudioQueue()`. JUCE 8.0.12 skips the AudioQueue probe on iOS 26 and uses `AVAudioSession.sampleRate` directly. It also replaces the deprecated `AVAudioSessionCategoryOptionAllowBluetooth` with `AVAudioSessionCategoryOptionAllowBluetoothHFP` on iOS 26+.

### iOS CMake Configuration

For iOS builds, `VISAGE_IOS=1` is automatically defined when `CMAKE_SYSTEM_NAME` is `"iOS"`. The same `visage` link target works for both macOS and iOS — no separate configuration needed.

```cmake
# Generate iOS Xcode project
# cmake -B build-ios -G Xcode -DCMAKE_SYSTEM_NAME=iOS

# In CMakeLists.txt, wrap macOS-only targets:
if(NOT CMAKE_SYSTEM_NAME STREQUAL "iOS")
    # macOS plugin target (juce_add_plugin)
endif()

# iOS app target:
if(IOS OR CMAKE_SYSTEM_NAME STREQUAL "iOS")
    juce_add_gui_app(MyApp
        COMPANY_NAME "Company"
        BUNDLE_ID com.company.myapp
        PRODUCT_NAME "MyApp"
        BACKGROUND_AUDIO_ENABLED TRUE
        STATUS_BAR_HIDDEN TRUE
        REQUIRES_FULL_SCREEN TRUE
    )
    target_link_libraries(MyApp PRIVATE
        juce::juce_audio_basics
        juce::juce_gui_basics
        visage  # Same target as macOS
    )
endif()
```
The generated header is placed in an `embedded/` subdirectory, so include it as `#include "embedded/fonts.h"`.
