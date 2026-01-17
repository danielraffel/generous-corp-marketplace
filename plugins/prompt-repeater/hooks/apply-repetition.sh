#!/bin/bash
set -euo pipefail

# Read hook input
input=$(cat)

# Extract user prompt
user_prompt=$(echo "$input" | jq -r '.user_prompt // ""')

# Defensive check for CLAUDE_PROJECT_DIR
if [ -z "${CLAUDE_PROJECT_DIR:-}" ]; then
  # Fallback: pass through unchanged if env var not available
  echo "$user_prompt"
  exit 0
fi

# Check if settings file exists
settings_file="$CLAUDE_PROJECT_DIR/.claude/prompt-repeater.local.md"

if [ ! -f "$settings_file" ]; then
  # No settings file, pass through unchanged
  echo "$user_prompt"
  exit 0
fi

# Extract YAML frontmatter settings
auto_apply=$(sed -n '/^---$/,/^---$/p' "$settings_file" | grep -E '^auto_apply:' | awk '{print $2}' || echo "false")
mode=$(sed -n '/^---$/,/^---$/p' "$settings_file" | grep -E '^default_mode:' | awk '{print $2}' || echo "simple")
notify=$(sed -n '/^---$/,/^---$/p' "$settings_file" | grep -E '^notify:' | awk '{print $2}' || echo "true")

# Check if auto_apply is enabled
if [ "$auto_apply" != "true" ]; then
  # Auto-apply disabled, pass through unchanged
  echo "$user_prompt"
  exit 0
fi

# Apply repetition based on mode
modified_prompt="$user_prompt"

case "$mode" in
  simple)
    modified_prompt="${user_prompt} ${user_prompt}"
    ;;
  verbose)
    modified_prompt="${user_prompt}
Let me repeat that:
${user_prompt}"
    ;;
  triple)
    modified_prompt="${user_prompt}
Let me repeat that:
${user_prompt}
Let me repeat that one more time:
${user_prompt}"
    ;;
  *)
    # Unknown mode, default to simple
    modified_prompt="${user_prompt} ${user_prompt}"
    ;;
esac

# Output result
if [ "$notify" = "true" ]; then
  # Include notification that repetition was applied
  cat <<EOF
{
  "modifiedPrompt": $(echo "$modified_prompt" | jq -Rs .),
  "systemMessage": "🔁 Auto-repetition applied (mode: $mode). Configure in .claude/prompt-repeater.local.md"
}
EOF
else
  # Silent mode - just return modified prompt
  cat <<EOF
{
  "modifiedPrompt": $(echo "$modified_prompt" | jq -Rs .)
}
EOF
fi

exit 0
