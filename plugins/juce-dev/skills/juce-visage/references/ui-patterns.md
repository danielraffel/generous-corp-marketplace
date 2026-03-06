# UI Patterns Reference

Covers Visage frame essentials, text editors, popups, dropdowns, modals, secondary windows, and z-order management within JUCE+Visage plugins.

## Table of Contents

- [Frame Essentials](#visage-frame-essentials)
- [TextEditor Integration](#texteditor-integration)
- [Popups, Dropdowns, and Modals](#popups-dropdowns-and-modals)
- [Secondary Windows](#secondary-windows)

---

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

**DPI and native_bounds_ ordering**: `setBounds()` computes `native_bounds_ = (bounds * dpi_scale_).round()`. If DPI changes after `setBounds()` (e.g., via `addChild` propagation), `native_bounds_` is NOT recalculated unless the `setDpiScale()` patch is applied. Without the patch, always call `setBounds()` on children AFTER the correct DPI has propagated — i.e., set child bounds from `resized()`, not from `createVisageUI()`. See the Visage Patches Checklist in `references/platform-macos.md` for the library-level fix.

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

---

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

---

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

---

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

### Modal Keyboard Handling in Secondary JUCE Windows

When a Visage modal dialog opens inside a secondary JUCE `DocumentWindow` (e.g., a waveform editor), ESC may not work until the user clicks inside the window. This happens because:

1. JUCE's `toFront(true)` during window creation makes the JUCE view the macOS first responder
2. ESC goes through `keyDown:` which only reaches the first responder — if that's the JUCE view, not the Visage MTKView, the modal never sees ESC
3. The JUCE `KeyListener` may return `false` hoping Visage will handle ESC, but Visage never gets it

**Fix** (two-pronged approach):

1. **JUCE KeyListener closes modals directly** instead of passing through:
```cpp
// In your KeyListener::keyPressed override
if (key == juce::KeyPress::escapeKey) {
    if (VisageModalDialog::hasActiveModal()) {
        if (auto* modal = VisageModalDialog::getActiveModal())
            modal->close();
        return true; // Don't return false — Visage won't get it
    }
    // ... handle other ESC cases
}
```

2. **Register `on_unhandled_key_down` callback** on the secondary window's Visage window so ESC also works when the Visage NSView IS first responder but the modal isn't in the key traversal path:
```cpp
if (auto* win = visageWindow->window()) {
    win->on_unhandled_key_down = [this](visage::KeyCode keyCode, int mods, bool repeat) {
        if (repeat) return;
        if (keyCode == visage::KeyCode::Escape)
            keyPressed(juce::KeyPress(juce::KeyPress::escapeKey), this);
    };
}
```

**Key insight**: In secondary JUCE windows with embedded Visage, there are two completely separate keyboard paths (JUCE `KeyListener` and Visage `keyDown:`). Modal dismiss logic must work through BOTH paths since you can't control which view is macOS first responder.
