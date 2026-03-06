#!/bin/bash
# Syncs the juce-visage skill folder from the canonical location to all distribution copies,
# then optionally commits and pushes the changes.
#
# Canonical: skills/claude/juce-visage/ (SKILL.md + references/)
# Copies to: skills/codex/juce-visage/ and plugins/juce-dev/skills/juce-visage/
#
# Usage:
#   ./sync-juce-visage-skill.sh "commit message"   — sync, commit, push
#   ./sync-juce-visage-skill.sh                     — sync, then ask about commit

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CANONICAL_DIR="skills/claude/juce-visage"
TARGET_DIRS=(
    "skills/codex/juce-visage"
    "plugins/juce-dev/skills/juce-visage"
)

# Files/dirs to sync (SKILL.md + references/)
SYNC_ITEMS=("SKILL.md" "references")

if [ ! -f "$CANONICAL_DIR/SKILL.md" ]; then
    echo "ERROR: Canonical SKILL.md not found at: $CANONICAL_DIR/SKILL.md"
    exit 1
fi

# Sync copies using rsync for full folder sync
for target_dir in "${TARGET_DIRS[@]}"; do
    mkdir -p "$target_dir"
    for item in "${SYNC_ITEMS[@]}"; do
        if [ -d "$CANONICAL_DIR/$item" ]; then
            # Directory: rsync with delete to remove stale files
            mkdir -p "$target_dir/$item"
            rsync -a --delete "$CANONICAL_DIR/$item/" "$target_dir/$item/"
        elif [ -f "$CANONICAL_DIR/$item" ]; then
            cp "$CANONICAL_DIR/$item" "$target_dir/$item"
        fi
    done
    echo "Synced → $target_dir/"
done
echo "All copies in sync."

# Verify checksums for synced files only
VERIFY_FAILED=0
for item in "${SYNC_ITEMS[@]}"; do
    if [ -d "$CANONICAL_DIR/$item" ]; then
        find "$CANONICAL_DIR/$item" -type f | while read -r canonical_file; do
            rel_path="${canonical_file#$CANONICAL_DIR/}"
            CANONICAL_MD5=$(md5 -q "$canonical_file")
            for target_dir in "${TARGET_DIRS[@]}"; do
                target_file="$target_dir/$rel_path"
                if [ ! -f "$target_file" ]; then
                    echo "ERROR: Missing file: $target_file"; exit 1
                fi
                TARGET_MD5=$(md5 -q "$target_file")
                if [ "$CANONICAL_MD5" != "$TARGET_MD5" ]; then
                    echo "ERROR: Checksum mismatch for $target_file"; exit 1
                fi
            done
        done
    elif [ -f "$CANONICAL_DIR/$item" ]; then
        CANONICAL_MD5=$(md5 -q "$CANONICAL_DIR/$item")
        for target_dir in "${TARGET_DIRS[@]}"; do
            TARGET_MD5=$(md5 -q "$target_dir/$item")
            if [ "$CANONICAL_MD5" != "$TARGET_MD5" ]; then
                echo "ERROR: Checksum mismatch for $target_dir/$item"; exit 1
            fi
        done
    fi
done
echo "Checksums verified."

# Collect all synced paths for git
SYNCED_PATHS=("$CANONICAL_DIR")
for target_dir in "${TARGET_DIRS[@]}"; do
    SYNCED_PATHS+=("$target_dir")
done

# Check if there are actual changes to commit
if git diff --quiet -- "${SYNCED_PATHS[@]}" 2>/dev/null && \
   [ -z "$(git ls-files --others --exclude-standard -- "${SYNCED_PATHS[@]}")" ]; then
    echo "No changes to commit — files already in sync."
    exit 0
fi

# Show what changed (summary)
echo ""
echo "Changes detected:"
git diff --stat -- "${SYNCED_PATHS[@]}"
git ls-files --others --exclude-standard -- "${SYNCED_PATHS[@]}" | sed 's/^/  new file: /'
echo ""

# Get commit message
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    # Count changed files
    CHANGED=$(git diff --name-only -- "${SYNCED_PATHS[@]}" | wc -l | tr -d ' ')
    NEW=$(git ls-files --others --exclude-standard -- "${SYNCED_PATHS[@]}" | wc -l | tr -d ' ')
    AUTO_MSG="Update juce-visage skill ($CHANGED changed, $NEW new files, synced all copies)"

    echo "Suggested commit message:"
    echo "  $AUTO_MSG"
    echo ""
    read -p "Commit and push? [Y]es / [n]o / [e]dit message: " REPLY
    REPLY=${REPLY:-y}

    case "$REPLY" in
        [Yy]*)
            COMMIT_MSG="$AUTO_MSG"
            ;;
        [Ee]*)
            read -p "Enter commit message: " COMMIT_MSG
            if [ -z "$COMMIT_MSG" ]; then
                echo "Empty message — aborting."
                exit 1
            fi
            ;;
        *)
            echo "Skipping commit. Files are synced locally."
            exit 0
            ;;
    esac
fi

git add "${SYNCED_PATHS[@]}"
git commit -m "$COMMIT_MSG"
git push origin "$(git branch --show-current)"
echo "Committed and pushed."
