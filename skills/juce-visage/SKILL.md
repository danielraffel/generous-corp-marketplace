---
name: juce-visage
description: Guide for integrating the Visage GPU-accelerated UI framework with JUCE audio plugins on macOS. Covers Metal view embedding, event bridging, focus management, keyboard handling in DAW hosts, popups/modals/dropdowns, memory management, destruction ordering, native standalone appearance, and required Visage patches. Patterns derived from production plugin development.
---

# JUCE + Visage Integration Guide

This skill covers how to build a JUCE audio plugin (AU/VST3/Standalone) that uses Visage for its UI on macOS.

**Scope**: macOS-focused (Metal rendering, `NSView` embedding, `performKeyEquivalent:` fixes). Windows/Linux patterns differ for windowing and key handling but the bridge architecture and Frame patterns apply cross-platform.

**Tested with**: Visage (via [danielraffel/visage](https://github.com/danielraffel/visage) fork, copied directly into project — not a submodule), JUCE 7/8, Logic Pro, Ableton Live, Reaper. The fork carries the patches listed in this skill. Projects copy from the fork so patches are included automatically. To update Visage, sync the fork with [upstream](https://github.com/VitalAudio/visage), check for patch conflicts, then copy into your project's `external/visage/`.

## When to Use This Skill

Use when:
- Starting a new JUCE plugin project that will use Visage for its UI
- Adding Visage UI to an existing JUCE plugin
- Debugging rendering, keyboard, mouse, or focus issues in a JUCE+Visage plugin
- Building modals, overlays, dropdowns, or secondary windows with Visage inside JUCE
- Porting Visage standalone patterns into a DAW plugin context
- Troubleshooting AU/VST3 validation timeouts or scanner failures
- Making a standalone JUCE+Visage app look native on macOS

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

- [ ] `performKeyEquivalent:` (windowing_macos.mm) — Cmd+A/C/V/X/Z for TextEditor in plugins
- [ ] Cmd+Q propagation (windowing_macos.mm) — `[[self nextResponder] keyDown:event]`
- [ ] MTKView 60 FPS cap (windowing_macos.mm) — Prevent excessive GPU on ProMotion displays
- [ ] Popup menu overflow positioning (popup_menu.cpp) — Above-position fix
- [ ] Single-line Up/Down arrows (text_editor.cpp) — Up→start, Down→end
- [ ] setAlwaysOnTop guard (application_window.cpp) — Only call when always_on_top_ is true

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
        // Add children to rootFrame...

        bridge = std::make_unique<JuceVisageBridge>();
        addAndMakeVisible(*bridge);
        bridge->setRootFrame(rootFrame.get());
    }

    void resized() override {
        if (bridge) bridge->setBounds(getLocalBounds());
        if (rootFrame) rootFrame->setBounds(0, 0, getWidth(), getHeight());
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

Use `setUsingNativeTitleBar(true)` on all `DocumentWindow` subclasses to get the standard macOS traffic-light buttons and title:

```cpp
// Main standalone window
if (audioProcessor.wrapperType == juce::AudioProcessor::wrapperType_Standalone) {
    if (auto* window = findParentComponentOfClass<juce::DocumentWindow>())
        window->setUsingNativeTitleBar(true);
}

// Secondary windows (waveform editor, virtual keyboard, etc.)
MySecondaryWindow() : DocumentWindow("Title", bg, allButtons) {
    setUsingNativeTitleBar(true);
    setResizable(false, false);
}
```

This replaces the default JUCE-styled title bar with the native macOS one, making secondary windows look like proper macOS windows rather than custom-drawn JUCE windows.

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

### Modifier Conversion (macOS)

**Critical**: Visage's `TextEditor::isMainModifier()` checks for `kModifierCmd` on Mac. Mapping Command to `kModifierMacCtrl` silently breaks all clipboard shortcuts.

```cpp
int convertModifiers(const juce::ModifierKeys& mods) {
    int result = 0;
    if (mods.isShiftDown())   result |= visage::kModifierShift;
    if (mods.isAltDown())     result |= visage::kModifierAlt;

#if JUCE_MAC
    if (mods.isCommandDown()) result |= visage::kModifierCmd;     // NOT kModifierMacCtrl!
    if (mods.isCtrlDown())    result |= visage::kModifierMacCtrl; // Physical Ctrl key
#else
    if (mods.isCtrlDown())    result |= visage::kModifierRegCtrl;
#endif
    return result;
}
```

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

These patches to Visage's `windowing_macos.mm` are required for correct behavior in AU/VST3 hosts.

### Fix 1: performKeyEquivalent: for Text Editing Shortcuts

**Problem**: In plugin hosts, macOS routes `Cmd+A/C/V/X/Z` through `performKeyEquivalent:` before `keyDown:`. The DAW's Edit menu intercepts these, so plugin text fields can't copy/paste.

**Fix**: Override `performKeyEquivalent:` on `VisageAppView` to intercept these when a TextEditor is active:

```objc
// In VisageAppView (MTKView subclass) — windowing_macos.mm
- (BOOL)performKeyEquivalent:(NSEvent*)event {
    if (!self.visage_window)
        return [super performKeyEquivalent:event];

    NSUInteger flags = [event modifierFlags] & NSEventModifierFlagDeviceIndependentFlagsMask;
    bool justCmd = (flags & NSEventModifierFlagCommand) &&
                   !(flags & NSEventModifierFlagControl) &&
                   !(flags & NSEventModifierFlagOption);

    if (justCmd && self.visage_window->hasActiveTextEntry()) {
        NSString* chars = [event charactersIgnoringModifiers];
        if ([chars length] == 1) {
            unichar ch = [[chars lowercaseString] characterAtIndex:0];
            if (ch == 'a' || ch == 'c' || ch == 'v' || ch == 'x' || ch == 'z') {
                visage::KeyCode key_code = visage::translateKeyCode([event keyCode]);
                int modifiers = [self keyboardModifiers:event];
                self.visage_window->handleKeyDown(key_code, modifiers, [event isARepeat]);
                return YES; // Swallow — prevent DAW from seeing this
            }
        }
    }
    return [super performKeyEquivalent:event];
}
```

The `hasActiveTextEntry()` guard is critical — without it, `Cmd+Z` would be stolen from the DAW even when no text field is active, breaking DAW undo.

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
frame->setBounds(x, y, w, h);   // Set position and size
frame->redraw();                 // Queue for rendering
// ...
parentFrame->removeChild(frame); // Removes from hierarchy
// or frame is destroyed
```

**Never call `setBounds()` or `redraw()` before `init()`** — this is a common crash source.

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
| Skip `performKeyEquivalent:` override | Cmd+C/V/A/X/Z go to DAW menu, not text field | Override and check `hasActiveTextEntry()` |
| Add modal to hierarchy before setting event handler | Focus callbacks fail | Copy parent's event handler before `addChild()` |
| Call `setBounds()` before `init()` | Crash in layout computation | Always `init()` first (or let `addChild()` do it) |
| Pass native pixels to `show()` and logical to `setBounds()` | Half-size or double-size view | Use `Dimension::logicalPixels()` for `show()` and logical for `setBounds()` |
| Start with `setWantsKeyboardFocus(true)` | DAW transport keys (spacebar) don't pass through | Start `false`, toggle `true` only when TextEditor activates |
| Expensive init in constructor/prepareToPlay | AU/VST3 scanner timeout, plugin not listed | Lazy-init expensive libraries on first use |
| Parent mouseDown() without frameAtPoint() check | Child widgets (toggles, buttons) don't respond | Check `frameAtPoint()` first, dispatch to child if needed |
| `setAcceptsKeystrokes(true)` in AU/VST3 mode | DAW Musical Typing and transport blocked | Only enable in standalone mode |
| Logging in audio thread (renderNextBlock) | Complete audio silence, thread starvation | Never log in real-time audio callbacks |

## Visage Patches Checklist

Patches 1-4 are maintained in the [danielraffel/visage](https://github.com/danielraffel/visage) fork. Patches 5-6 are project-specific and applied in-project only.

When updating Visage from upstream, patches marked **required** are needed for correct DAW plugin behavior; **recommended** patches improve UX but may not apply to all projects.

**In fork** (applied automatically when copying from `danielraffel/visage`):

1. **`performKeyEquivalent:`** (windowing_macos.mm) — **Required for plugins with text fields.** Without this, Cmd+A/C/V/X/Z go to DAW menu instead of TextEditor.
2. **Cmd+Q propagation** (windowing_macos.mm) — **Required for standalone apps and secondary windows.** `[[self nextResponder] keyDown:event]` for unhandled Cmd+key. Without this, Cmd+Q silently dies in the Visage view.
3. **MTKView 60 FPS cap** (windowing_macos.mm) — **Recommended.** Prevents excessive GPU usage on ProMotion displays. Skip if you want adaptive frame rates.
4. **Popup menu overflow positioning** (popup_menu.cpp) — **Recommended.** Fixes above-position calculation for menus triggered from lower rows. May be fixed in future upstream.

**Project-specific** (apply manually if needed):

5. **Single-line Up/Down arrows** (text_editor.cpp) — **Optional.** Maps Up→start, Down→end in single-line TextEditors. Standard text field UX but not universal.
6. **setAlwaysOnTop guard** (application_window.cpp) — **Required for plugin mode.** Without this, plugin window may go behind DAW. Only call `setAlwaysOnTop()` when `always_on_top_` is true.

Test thoroughly after updates, especially popup menus and text editing in plugin hosts (Logic Pro, Ableton).

### Updating Visage from Upstream

To pull the latest from VitalAudio and check if patches survived:

```bash
# 1. Sync the fork with upstream
cd /tmp/visage-fork  # or wherever you cloned danielraffel/visage
git fetch upstream
git merge upstream/main

# 2. Check if patches are still present (any that got merged upstream
#    will merge cleanly; conflicts mean upstream changed the same area)
grep -n "preferredFramesPerSecond = 60" visage_windowing/macos/windowing_macos.mm
grep -n "nextResponder.*keyDown" visage_windowing/macos/windowing_macos.mm
grep -n "performKeyEquivalent" visage_windowing/macos/windowing_macos.mm
grep -n "window_bounds.y().*- h" visage_ui/popup_menu.cpp

# 3. If all 4 greps match, patches survived. Push and copy to project:
git push origin main
cp -R /tmp/visage-fork/* ~/Code/YourProject/external/visage/

# 4. If a grep doesn't match, either:
#    - The patch was merged upstream (great — remove from checklist)
#    - There was a conflict (resolve it, re-apply the patch)
```

If a patch is missing after merge, check the upstream changelog — if they fixed the same issue differently, the patch is no longer needed. Update this checklist accordingly.

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
| `visage_graphics/canvas.h` | Canvas drawing API (rectangle, text, SVG, etc.) |
| `visage_graphics/renderer.h` | bgfx/Metal renderer |
| `visage_utils/events.h` | KeyCode enum, modifier constants |
| `visage_utils/space.h` | Bounds, Point, IBounds, Dimension types |
