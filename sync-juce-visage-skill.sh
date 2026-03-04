#!/bin/bash
# Syncs the juce-visage SKILL.md from the canonical location to all distribution copies.
# Canonical: skills/claude/juce-visage/SKILL.md
# Copies to: skills/codex/juce-visage/ and plugins/juce-dev/skills/juce-visage/

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CANONICAL="$SCRIPT_DIR/skills/claude/juce-visage/SKILL.md"
TARGETS=(
    "$SCRIPT_DIR/skills/codex/juce-visage/SKILL.md"
    "$SCRIPT_DIR/plugins/juce-dev/skills/juce-visage/SKILL.md"
)

if [ ! -f "$CANONICAL" ]; then
    echo "ERROR: Canonical SKILL.md not found at: $CANONICAL"
    exit 1
fi

for target in "${TARGETS[@]}"; do
    cp "$CANONICAL" "$target"
    echo "Synced → $(echo "$target" | sed "s|$SCRIPT_DIR/||")"
done

echo "All copies in sync."
