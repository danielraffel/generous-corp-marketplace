# Visage Theme Token Catalog

All known `VISAGE_THEME_COLOR` and `VISAGE_THEME_VALUE` tokens from the Visage widget library, with their C++ default values.

## button.h

### UiButton
| Token | Default | Description |
|-------|---------|-------------|
| UiButtonBackground | 0xFF4C4F52 | Button resting fill |
| UiButtonBackgroundHover | 0xFF606265 | Button hover fill |
| UiButtonText | 0xFFDDDDDD | Button text |
| UiButtonTextHover | 0xFFFFFFFF | Button text on hover |
| UiActionButtonBackground | 0xFF9977EE | Accent button fill |
| UiActionButtonBackgroundHover | 0xFFAA88FF | Accent button hover |
| UiActionButtonText | 0xFFDDDDDD | Accent button text |
| UiActionButtonTextHover | 0xFFFFFFFF | Accent button text hover |

### TextButton
| Token | Default | Description |
|-------|---------|-------------|
| TextButtonBackgroundOff | 0xFF2C3033 | Text button off |
| TextButtonBackgroundOffHover | 0xFF3E4245 | Text button off hover |
| TextButtonBackgroundOn | 0xFF2C3033 | Text button on |
| TextButtonBackgroundOnHover | 0xFF3E4245 | Text button on hover |
| TextButtonTextOff | 0xFF848789 | Label off |
| TextButtonTextOffHover | 0xFFAAACAD | Label off hover |
| TextButtonTextOn | 0xFFAA88FF | Label on (accent) |
| TextButtonTextOnHover | 0xFFBB99FF | Label on hover |

### ToggleButton
| Token | Default | Description |
|-------|---------|-------------|
| ToggleButtonDisabled | 0xFF4C4F52 | Toggle disabled |
| ToggleButtonOff | 0xFF848789 | Toggle off |
| ToggleButtonOffHover | 0xFFAAACAD | Toggle off hover |
| ToggleButtonOn | 0xFFAA88FF | Toggle on (accent) |
| ToggleButtonOnHover | 0xFFBB99FF | Toggle on hover |

### Values
| Token | Default | Description |
|-------|---------|-------------|
| TextButtonRounding | 9.0f | Text button corner radius |
| UiButtonRounding | 9.0f | UI button corner radius |
| UiButtonHoverRoundingMult | 0.7f | Hover rounding multiplier |

## text_editor.h

| Token | Default | Description |
|-------|---------|-------------|
| TextEditorBackground | 0xFF2C3033 | Editor background |
| TextEditorBorder | 0xFF4C4F52 | Editor border |
| TextEditorText | 0xFFEEEEEE | Typed text |
| TextEditorDefaultText | 0xFF848789 | Placeholder text |
| TextEditorCaret | 0xFFAA88FF | Text caret |
| TextEditorSelection | 0x4DAA88FF | Selection highlight |

| Value | Default | Description |
|-------|---------|-------------|
| TextEditorRounding | 9.0f | Corner radius |
| TextEditorMarginX | 9.0f | Horizontal margin |
| TextEditorMarginY | 9.0f | Vertical margin |

## popup_menu.cpp

| Token | Default | Description |
|-------|---------|-------------|
| PopupMenuBackground | 0xFF262A2E | Menu background |
| PopupMenuBorder | 0xFF606265 | Menu border |
| PopupMenuText | 0xFFEEEEEE | Menu item text |
| PopupMenuDisabledText | 0xFF888888 | Disabled item |
| PopupMenuSelection | 0xFFAA88FF | Hover highlight |
| PopupMenuSelectionText | 0xFFFFFFFF | Hover text |

| Value | Default | Description |
|-------|---------|-------------|
| PopupOptionHeight | 22.0f | Item height |
| PopupMinWidth | 175.0f | Minimum width |
| PopupTextPadding | 9.0f | Text padding |
| PopupFontSize | 14.0f | Font size |
| PopupSelectionPadding | 4.0f | Selection padding |

## scroll_bar.cpp

| Token | Default | Description |
|-------|---------|-------------|
| ScrollBarDefault | 0x22FFFFFF | Scrollbar track |
| ScrollBarDown | 0x55FFFFFF | Scrollbar pressed |

| Value | Default | Description |
|-------|---------|-------------|
| ScrollBarWidth | 20.0f | Scrollbar width |

## Other

| Token | Default | Source | Description |
|-------|---------|--------|-------------|
| ButtonShadow | 0x88000000 | button.cpp | Button drop shadow |
| PositionBulbWidth | 4.0f | graph_line.cpp | Graph position indicator width |
