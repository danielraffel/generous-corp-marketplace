---
description: Check plugin dependencies for a chain
argument-hint: "[chain-name]"
---

# Check Dependencies Command

Verify plugin installation status for Chainer chains.

## Usage

```bash
/chainer:check-deps [chain-name]
```

## What It Does

- Checks if required plugins are installed for a chain
- Shows which plugins are missing
- Provides exact installation commands
- Can check a specific chain or all built-in chains

## Examples

### Check Specific Chain

```bash
/chainer:check-deps plan-and-implement
```

Output:
```
Dependency Check: plan-and-implement

Required plugins:
  ✅ feature-dev (installed)
  ✅ ralph-loop (installed)

Status: ✅ Ready to run
```

### Check All Chains

```bash
/chainer:check-deps
```

Output:
```
Built-in Chains Dependency Status:

plan-only:
  ✅ feature-dev (installed)
  Status: ✅ Ready

implement-only:
  ✅ ralph-loop (installed)
  Status: ✅ Ready

plan-and-implement:
  ✅ feature-dev (installed)
  ❌ ralph-loop (not installed)
  Status: ❌ Cannot run (missing 1 plugin)

worktree-plan-implement:
  ✅ worktree-manager (installed)
  ✅ feature-dev (installed)
  ❌ ralph-loop (not installed)
  Status: ❌ Cannot run (missing 1 plugin)
```

## Instructions for Claude

When user invokes this command:

### Step 1: Parse Arguments

```javascript
const args = parseArguments();
const chainName = args[0]; // Optional - if omitted, check all chains
```

### Step 2: Load Registry

Read the plugin registry:

```javascript
const registryPath = '${CLAUDE_PLUGIN_ROOT}/registry/plugins.yaml';
const registryContent = Read(registryPath);
const registry = parseYaml(registryContent);
```

If registry doesn't exist:
```
❌ Plugin registry not found

Expected location: ${CLAUDE_PLUGIN_ROOT}/registry/plugins.yaml

This is required for dependency checking.
```

### Step 3: Load Installed Plugins

```javascript
const installedPath = '~/.claude/plugins/installed_plugins.json';
const installedData = JSON.parse(Read(installedPath));
```

If file doesn't exist, treat as no plugins installed.

### Step 4: Check Dependencies

**If chain name provided (specific chain):**

1. Verify chain exists in registry
2. Get required plugins for that chain
3. Check installation status for each
4. Display results

Format:
```
Dependency Check: {chainName}

Required plugins:
  {✅/❌} {plugin-name} ({installed/not installed})
  {✅/❌} {plugin-name2} ({installed/not installed})

{If missing plugins:}
Missing plugins:
  • {name} - {description}
    Install: /plugin install {name}@{marketplace}
    {docs ? `Docs: ${docs}` : ''}

Status: {✅ Ready to run / ❌ Cannot run (missing N plugin(s))}
```

**If no chain name (check all):**

1. Iterate through all chains in `registry.chains`
2. For each chain, check its dependencies
3. Display summary table

Format:
```
Built-in Chains Dependency Status:

{chain-name}:
  {✅/❌} {plugin1} ({installed/not installed})
  {✅/❌} {plugin2} ({installed/not installed})
  Status: {✅ Ready / ❌ Cannot run (missing N)}

{chain-name2}:
  {✅/❌} {plugin1} ({installed/not installed})
  Status: {✅ Ready / ❌ Cannot run (missing N)}

Summary:
  ✅ Ready: {count} chains
  ❌ Missing dependencies: {count} chains
```

### Step 5: Helper Function - Check Plugin Installation

```javascript
function isPluginInstalled(pluginName, registry, installedData) {
  const plugin = registry.plugins[pluginName];
  if (!plugin) return false;

  const key = `${pluginName}@${plugin.marketplace}`;
  return installedData.plugins[key] !== undefined;
}
```

### Error Handling

**Chain not found in registry:**
```
❌ Chain '{chainName}' not found in registry

Available built-in chains:
  - plan-only
  - implement-only
  - plan-and-implement
  - worktree-plan-implement

Note: User-defined chains (from .claude/chainer.local.md) don't have dependency info.
```

**Registry parse error:**
```
❌ Could not parse plugin registry

File: ${CLAUDE_PLUGIN_ROOT}/registry/plugins.yaml
Error: {error message}

Please check the YAML syntax.
```

## Example Outputs

### All Dependencies Satisfied

```
Dependency Check: worktree-plan-implement

Required plugins:
  ✅ worktree-manager (installed)
  ✅ feature-dev (installed)
  ✅ ralph-loop (installed)

Status: ✅ Ready to run
```

### Missing Dependencies

```
Dependency Check: plan-and-implement

Required plugins:
  ✅ feature-dev (installed)
  ❌ ralph-loop (not installed)

Missing plugins:
  • ralph-loop - Autonomous implementation loops
    Install: /plugin install ralph-loop@claude-plugins-official
    Docs: https://awesomeclaude.ai/ralph-loop

Status: ❌ Cannot run (missing 1 plugin)
```

### All Chains Summary

```
Built-in Chains Dependency Status:

plan-only:
  ✅ feature-dev (installed)
  Status: ✅ Ready

implement-only:
  ❌ ralph-loop (not installed)
  Status: ❌ Cannot run (missing 1 plugin)

plan-and-implement:
  ✅ feature-dev (installed)
  ❌ ralph-loop (not installed)
  Status: ❌ Cannot run (missing 1 plugin)

worktree-plan-implement:
  ✅ worktree-manager (installed)
  ✅ feature-dev (installed)
  ❌ ralph-loop (not installed)
  Status: ❌ Cannot run (missing 1 plugin)

Summary:
  ✅ Ready: 1 chain
  ❌ Missing dependencies: 3 chains

To install missing plugins:
  /plugin install ralph-loop@claude-plugins-official
```
