---
description: Manage test VMs for cross-platform builds
argument-hint: "<action> [name] [ssh-alias] [platform]"
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Bash
  - Glob
---

# JUCE Dev VM Management

Configure and manage SSH-accessible VMs for cross-platform build testing.

## Usage

```
/juce-dev:vm add <name> <ssh-alias> <platform>    # Add a VM
/juce-dev:vm remove <name>                          # Remove a VM
/juce-dev:vm list                                   # List all VMs
/juce-dev:vm test [name]                            # Test VM connectivity
```

## Arguments

- `add <name> <ssh-alias> <platform>`: Register a new VM
  - `name`: Friendly name (e.g., "win11", "ubuntu24", "win10-arm64")
  - `ssh-alias`: SSH config alias (e.g., "win" for `ssh win`)
  - `platform`: One of `windows`, `linux`, `macos`
- `remove <name>`: Remove a registered VM
- `list`: Show all registered VMs and their status
- `test [name]`: Test SSH connectivity (all VMs if no name given)

## Examples

```
/juce-dev:vm add win11 win windows
/juce-dev:vm add ubuntu24 linux linux
/juce-dev:vm add win10-arm win-arm windows
/juce-dev:vm list
/juce-dev:vm test win11
/juce-dev:vm remove ubuntu24
```

## Implementation

### Storage

VM configs are stored in `.claude/juce-dev.local.md` in the project root.

YAML frontmatter format:

```yaml
---
vms:
  win11:
    ssh: win
    platform: windows
    project_path: C:\Users\daniel\Code\JUCE-Plugin-Starter
    shell: powershell
  ubuntu24:
    ssh: linux
    platform: linux
    project_path: /home/daniel/Code/JUCE-Plugin-Starter
    shell: bash
---
```

### Action: add

1. Parse `$ARGUMENTS` for name, ssh-alias, platform.
2. If any are missing, use AskUserQuestion:
   ```
   question: "What SSH alias connects to this VM? (e.g., 'win' if you use 'ssh win')"
   header: "SSH Alias"
   ```
3. Verify SSH connectivity:
   ```bash
   ssh -o ConnectTimeout=5 <ssh-alias> "echo connected" 2>&1
   ```
4. If connected, detect the remote home/project directory:
   ```bash
   # Windows
   ssh <ssh-alias> "echo %USERPROFILE%"
   # Linux/macOS
   ssh <ssh-alias> "echo $HOME"
   ```
5. Ask where the project should live on the VM:
   ```
   question: "Where should projects live on this VM?"
   header: "Project Path"
   options:
     - label: "{detected_home}/Code"
       description: "Standard location"
     - label: "Other"
       description: "Specify a custom path"
   ```
6. Write/update `.claude/juce-dev.local.md` with the new VM entry.
7. Confirm:
   ```
   VM 'win11' added:
   - SSH: ssh win
   - Platform: windows
   - Project path: C:\Users\daniel\Code
   - Shell: powershell
   ```

### Action: remove

1. Read `.claude/juce-dev.local.md`
2. Remove the named VM entry
3. Write updated file

### Action: list

1. Read `.claude/juce-dev.local.md`
2. For each VM, test SSH connectivity (with 5s timeout)
3. Display:

```
## Test VMs

| Name | Platform | SSH | Project Path | Status |
|------|----------|-----|-------------|--------|
| win11 | Windows | ssh win | C:\Users\daniel\Code | Connected |
| ubuntu24 | Linux | ssh linux | /home/daniel/Code | Offline |
```

### Action: test

1. SSH to the named VM (or all if no name)
2. Check connectivity, installed tools, and project state:
   ```bash
   # Connectivity
   ssh <alias> "echo connected"

   # Tools (platform-dependent)
   # Windows:
   ssh <alias> "cmake --version && ninja --version && git --version"
   # Linux:
   ssh <alias> "cmake --version && ninja --version && clang++ --version && git --version"

   # Check if project exists
   ssh <alias> "test -d <project_path>/JUCE-Plugin-Starter && echo 'Project found'"
   ```
3. Report:
   ```
   VM 'win11' (Windows):
   - SSH: Connected
   - CMake: 3.28.1
   - Ninja: 1.11.1
   - Git: 2.43.0
   - MSVC: Found (VS2022 Community)
   - Project: Not cloned yet
   ```

## Integration with /juce-dev:port and /juce-dev:build

When the port or build command needs a VM, it reads `.claude/juce-dev.local.md` to find available VMs. The platform name in the VM config is used for matching:

```
/juce-dev:port windows          # Looks for any VM with platform: windows
/juce-dev:port windows --vm win11  # Uses specific VM
/juce-dev:build --test-vm win11    # Build locally, test on VM
```
