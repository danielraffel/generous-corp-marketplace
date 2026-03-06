# Troubleshooting Reference

Covers memory management, AU/VST3 startup optimization, dirty rect optimization, watchdog timer, common mistakes, and file reference.

## Table of Contents

- [Memory Management Best Practices](#memory-management-best-practices)
- [AU/VST3 Startup Time Optimization](#auvst3-startup-time-optimization)
- [Dirty Rect Optimization](#dirty-rect-optimization)
- [Watchdog Timer](#watchdog-timer)
- [Maintaining Per-Project Notes](#maintaining-per-project-notes)
- [Common Mistakes Reference](#common-mistakes-reference)
- [File Reference](#file-reference)

---

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

---

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

---

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

---

## Watchdog Timer

A watchdog timer prevents stuck states (pink screen, frozen render):

- **Phase 0-20** (first 4 seconds): Force redraws every 200ms
- **Phase 10-30**: Periodic health checks
- If no successful render for 2+ seconds: aggressive redraw
- If no render for 3+ seconds: destroy and recreate the embedded window

---

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

---

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

---

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
