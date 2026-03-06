# Visage API Reference

> Comprehensive API reference verified against [danielraffel/visage](https://github.com/danielraffel/visage) (patched fork). Covers Frame, Canvas, Color/Brush/Theme, Font, PostEffect, Widget, Event, and Dimension systems. See the [visage-ui-cookbook](https://github.com/danielraffel/visage-ui-cookbook) for related resources.

## Table of Contents

- [Frame API](#frame-api-reference)
- [Canvas API](#canvas-api-reference)
- [Color, Brush & Theme](#color-brush--theme-system)
- [Font & Text](#font--text)
- [PostEffect System](#posteffect-system)
- [Widget Classes](#widget-classes)
- [Event System](#event-system)
- [Dimension System](#dimension-system)
- [JUCE-to-Visage Migration](#juce-to-visage-migration-patterns)
- [Build System](#build-system)

---

## Frame API Reference

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

## Canvas API Reference

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

## Color, Brush & Theme System

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

## Font & Text

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

## PostEffect System

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

## Widget Classes

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

## Event System

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

## Dimension System

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

## JUCE-to-Visage Migration Patterns

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
8. **`setDpiScale()` does NOT recalculate `native_bounds_`** — This is a critical bug in upstream Visage. When `setBounds()` is called, it computes `native_bounds_ = (bounds * dpi_scale_).round()`. If DPI changes later (e.g., via `addChild` propagation from a Retina-aware parent), `native_bounds_` is NOT updated. Child frames end up with wrong region sizes and render at ~50% size on Retina displays. **Fix**: Patch `setDpiScale()` in `frame.h` to recalculate native bounds when DPI changes, AND always set child bounds from `resized()`/`layoutChildren()` (not just once in setup). See the Visage Patches Checklist in `references/troubleshooting.md` for the patch.

---

## Build System

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
