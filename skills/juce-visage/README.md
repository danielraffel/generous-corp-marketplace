# juce-visage Skill

A Claude Code skill for integrating the [Visage](https://github.com/VitalAudio/visage) GPU-accelerated UI framework with [JUCE](https://juce.com/) audio plugins on macOS.

## What It Does

When you're working on JUCE+Visage UI code, this skill gives Claude deep context about:

- **Bridge architecture** — how to embed a Metal-based Visage render loop inside a JUCE plugin window
- **Event bridging** — converting keyboard, mouse, clipboard, and focus events between JUCE and Visage
- **DAW compatibility** — patches needed so text editing shortcuts (Cmd+C/V/X/A/Z) work in AU/VST3 hosts instead of being intercepted by the DAW
- **Memory management** — destruction ordering to prevent use-after-free crashes with the Metal display link
- **Popup/modal/dropdown systems** — three distinct overlay patterns for GPU-rendered menus, dialogs, and combo boxes
- **Startup optimization** — keeping constructor and `prepareToPlay()` fast enough to pass AU/VST3 scanner timeouts
- **Native standalone appearance** — macOS title bar, menu bar, and app structure that looks native

## How It Works

The skill has two layers:

1. **Generic skill** (`SKILL.md`) — reusable patterns that apply to any JUCE+Visage project
2. **Per-project notes** (`docs/juce-visage-notes.md`) — project-specific details like file paths, patch status, UI component inventories, and debugging learnings

When Claude encounters Visage-related work, it reads both the generic skill and the project's notes file to get full context.

## Installation

Uses sparse checkout to pull only this skill (not the full repo):

```bash
git clone --filter=blob:none --sparse \
  https://github.com/danielraffel/generous-corp-marketplace.git \
  /tmp/gcm-sparse
cd /tmp/gcm-sparse
git sparse-checkout set skills/juce-visage
mkdir -p ~/.claude/skills/juce-visage
cp -r skills/juce-visage/* ~/.claude/skills/juce-visage/
```

Verify the install:

```bash
ls ~/.claude/skills/juce-visage/
```

You should see `SKILL.md` and `README.md`.

The skill activates automatically when you work on JUCE+Visage integration tasks. If your project doesn't have a `docs/juce-visage-notes.md` file yet, Claude will offer to create one from the built-in template.

## Updating

Pull the latest and copy the files again:

```bash
cd /tmp/gcm-sparse
git pull
cp -r skills/juce-visage/* ~/.claude/skills/juce-visage/
```

If you deleted the sparse checkout, re-run the installation steps above.

### The generic skill

The generic skill (`SKILL.md`) captures patterns that work across projects. It evolves as new integration patterns are discovered:

- New Visage patches needed for upstream updates
- Better destruction ordering sequences
- New popup/modal/dropdown patterns
- Performance optimization techniques

To update: edit `SKILL.md` directly, then copy to `~/.claude/skills/juce-visage/`. Changes benefit all projects using the skill.

### Per-project notes

Each project's `docs/juce-visage-notes.md` tracks project-specific details:

- **Bridge layer files** — which source files implement the JUCE-Visage bridge
- **Patches applied** — checklist of which Visage patches are active (useful when updating Visage from upstream)
- **Destruction sequence** — your plugin editor's exact destructor ordering
- **UI component inventories** — all popup menus, dropdowns, modals, and their locations
- **JUCE exceptions** — places where JUCE native UI is used instead of Visage (with justification)
- **Technical debt** — known issues to address
- **Learnings** — debugging insights specific to your project

Claude updates this file as you work — after fixing a Visage bug, adding a new modal dialog, or discovering a new pattern. You can also edit it manually.

## Customizing

### For a new plugin project

1. Create `docs/juce-visage-notes.md` (Claude will offer to do this from the template)
2. Fill in bridge layer files as you build them
3. Check off patches as you apply them
4. Document your destruction sequence once it stabilizes

### For an existing plugin project

1. Create `docs/juce-visage-notes.md` and populate it with your current state
2. List all existing popup/modal/dropdown instances
3. Document any JUCE AlertWindow exceptions
4. Add project-specific learnings from past debugging sessions

### Adding to CLAUDE.md

Optionally add a cross-reference in your project's `CLAUDE.md`:

```markdown
### Visage Integration Notes

Project-specific Visage patterns, file references, and technical debt are documented in:
`docs/juce-visage-notes.md`

This file complements the generic `juce-visage` Claude skill with project-specific details.
When working on Visage UI code, read both the skill and this file.
```

## Key Topics Covered

| Topic | Section in SKILL.md |
|-------|-------------------|
| Embedding Visage in JUCE | Quick Start, Architecture Overview |
| Keyboard shortcuts in DAW plugins | Plugin-Specific Fixes, Event Bridging |
| Preventing crashes on exit | Destruction Order, Memory Management |
| AU/VST scanner timeout | AU/VST3 Startup Time Optimization |
| Context menus | Popups: System 1 (PopupMenu) |
| Settings dropdowns | Popups: System 2 (DropdownComboBox) |
| Modal dialogs | Popups: System 3 (ModalDialog) |
| Secondary windows | Secondary Windows |
| macOS native look | Native Standalone Appearance |
| Common mistakes | Common Mistakes Reference |
| Required patches | Visage Patches Checklist |
