---
description: Add Visage GPU UI to an existing JUCE-Plugin-Starter project
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Add Visage GPU UI

Add Visage Metal-accelerated UI to an existing JUCE-Plugin-Starter project that was created without it.

## Implementation

### Step 1: Verify Project

1. Check that the current working directory is a JUCE-Plugin-Starter project:
   - `CMakeLists.txt` must exist
   - `Source/PluginEditor.h` must exist
   - `.env` must exist

2. If any are missing, tell the user this command must be run from a JUCE-Plugin-Starter project root.

3. Check if Visage is already set up:
   - If `external/visage/` exists AND `.env` contains `USE_VISAGE_UI=TRUE`, tell the user Visage is already configured.
   - If `external/visage/` exists but `.env` says `FALSE`, just update the `.env` flag.

### Step 2: Detect Class Name

Read `Source/PluginEditor.h` and extract the class name. Look for the pattern:
```
class {ClassName}AudioProcessorEditor
```

Extract `{ClassName}` — this replaces `CLASS_NAME_PLACEHOLDER` in the Visage templates.

### Step 3: Confirm

```
question: "Add Visage GPU UI to this project?"
header: "Visage"
options:
  - label: "Yes, add Visage (Recommended)"
    description: "Replaces PluginEditor with Visage Metal-rendered UI"
  - label: "Cancel"
    description: "No changes will be made"
```

### Step 4: Setup Visage

1. Check if `templates/visage/PluginEditor.h` and `templates/visage/PluginEditor.cpp` exist in the project.

2. If templates exist, copy them:
   ```bash
   cp templates/visage/PluginEditor.h Source/PluginEditor.h
   cp templates/visage/PluginEditor.cpp Source/PluginEditor.cpp
   ```

3. Replace `CLASS_NAME_PLACEHOLDER` with the detected class name:
   ```bash
   sed -i '' "s/CLASS_NAME_PLACEHOLDER/$CLASS_NAME/g" Source/PluginEditor.h Source/PluginEditor.cpp
   ```

4. Run the Visage setup script (clones Visage repo and applies patches):
   ```bash
   ./scripts/setup_visage.sh
   ```

5. Update `.env` to enable Visage:
   - If `USE_VISAGE_UI` line exists, change its value to `TRUE`
   - If it doesn't exist, add `USE_VISAGE_UI=TRUE`

### Step 5: Summary

Tell the user:

```
Visage GPU UI has been added to your project.

### Rebuild required

rm -rf build/
./scripts/generate_and_open_xcode.sh

### Resources

- The `juce-visage` skill is available for UI development guidance
- Visage docs: external/visage/README.md
- Patches applied by setup_visage.sh are in scripts/patches/visage/
```
