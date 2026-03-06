# macOS Platform Reference

Covers native standalone appearance, plugin-specific Visage patches, event bridging, focus management, and keyboard handling for macOS DAW hosts.

## Table of Contents

- [Native Standalone Appearance](#native-standalone-appearance)
- [Custom macOS Menu Bar](#custom-macos-menu-bar)
- [Custom Standalone App Structure](#custom-standalone-app-structure)
- [Audio/MIDI Configuration](#audiomidi-configuration)
- [Keyboard Shortcuts (Standalone)](#keyboard-shortcuts-standalone)
- [Event Bridging](#event-bridging)
- [Focus Management](#focus-management)
- [Plugin-Specific Fixes](#plugin-specific-fixes-macos)
- [Visage Patches Checklist](#visage-patches-checklist)

---

## Native Standalone Appearance

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

## Custom macOS Menu Bar

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

## Custom Standalone App Structure

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

## Audio/MIDI Configuration

Don't try to override JUCE's `StandaloneFilterWindow` — it's an internal class not exposed in the public API. Instead, add Audio/MIDI configuration to your settings panel:

- Use `#if JucePlugin_Build_Standalone` conditional compilation to show audio/MIDI settings only in standalone builds
- Use JUCE's `AudioDeviceSelectorComponent` for device selection UI
- In standalone mode, get the `AudioDeviceManager` from `StandalonePluginHolder::getInstance()`, not from a local instance
- Skip Bluetooth MIDI device enumeration on macOS — it can crash due to system-level issues

## Keyboard Shortcuts (Standalone)

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

---

## Event Bridging

### Coordinate Spaces

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

---

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

---

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

---

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
