# iOS/iPadOS Platform Reference

Covers iOS-specific bridge simplification, DPI, safe areas, touch interaction, and platform differences from macOS.

---

## Architecture

On iOS, the JUCE→Visage bridge works differently from macOS:

```
JUCE AudioAppComponent → JuceVisageBridge → ApplicationWindow → WindowIos → VisageMetalView
```

**Key difference**: On macOS, the bridge forwards mouse events from JUCE to Visage. On iOS, `VisageMetalView` (an `MTKView` subclass) handles `UITouch` events natively and maps them to Visage mouse events internally. The bridge must NOT forward JUCE mouse events on iOS — doing so causes double events.

## Bridge iOS Simplification

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

## Build System

`VISAGE_IOS=1` is automatically defined when `CMAKE_SYSTEM_NAME` is `"iOS"`. The same `visage` link target works for both platforms. No additional CMake configuration needed beyond the standard iOS target setup.

## DPI Scale

On iOS, DPI scale comes from the device display:

```cpp
float scale = juce::Desktop::getInstance().getDisplays().getMainDisplay().scale;
```

Common values: 2.0 (standard Retina), 3.0 (iPhone Plus/Max/Pro).

## Safe Area Insets

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

## Touch Interaction Guidelines

- **No hover**: iOS has no cursor hover (except Apple Pencil hover on iPad). Skip `mouseMove`/hover visuals.
- **No right-click**: No context menus via right-click. Use long-press or dedicated buttons.
- **44pt+ touch targets**: All interactive elements must be at least 44pt tall for reliable touch.
- **Single touch**: Visage maps the primary touch to mouse events. Multi-touch is not supported.
- **No cursor style**: `setCursorStyle()` is a no-op on iOS.

## iPhone vs iPad Layout

- **iPhone**: Portrait-only (typically), compact layout, 3x DPI scale on Pro models
- **iPad**: Portrait + landscape, Split View support on iPadOS, more screen space, 2x DPI scale
- **Both**: Safe area insets vary by device, no title bar, no window chrome

## What's NOT Available on iOS

- No `performKeyEquivalent:` (macOS only)
- No `setAlwaysOnTop()` (no window management)
- No `setAcceptsKeystrokes()` (no DAW host)
- No secondary windows or window-level menus
- No cursor style changes
- No `Cmd+Q` propagation
