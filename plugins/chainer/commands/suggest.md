---
description: Get plugin and chain suggestions based on natural language
argument-hint: "<description>"
---

# Suggest Command

Intelligently suggest plugins and chains based on what you want to do.

**User Communication:** Be direct. Show suggestions immediately without explaining the matching process.

## Usage

```bash
/chainer:suggest "<what you want to do>"
```

## Examples

```bash
/chainer:suggest "plan and implement a login feature"
/chainer:suggest "review my code for security issues"
/chainer:suggest "create an isolated workspace for testing"
```

## Instructions for Claude

When user invokes this command:

### Step 1: Parse Input

Extract the description from the user's message (everything after `/chainer:suggest`).

If no description provided, show error:
```
❌ Please provide a description of what you want to do

Examples:
  /chainer:suggest "plan and build a feature"
  /chainer:suggest "review my code"
  /chainer:suggest "create isolated workspace"
```

### Step 2: Load Registry

Read the plugin registry to get plugin metadata and keywords:

```javascript
const registryPath = '${CLAUDE_PLUGIN_ROOT}/registry/plugins.yaml';
const registryContent = Read(registryPath);
const registry = parseYaml(registryContent);
```

If registry doesn't exist or can't be parsed:
```
❌ Could not load plugin registry

Expected location: ${CLAUDE_PLUGIN_ROOT}/registry/plugins.yaml
```

### Step 3: Keyword Matching

**Tokenize description**:
1. Convert to lowercase
2. Split on spaces and punctuation
3. Remove common stop words: "the", "a", "an", "and", "or", "to", "for", "in", "on", "with", "my", "i", "want", "need"
4. Extract meaningful words (2+ characters)

**Score each plugin**:
```javascript
const scores = {};
const matchDetails = {};

for (const [pluginName, plugin] of Object.entries(registry.plugins)) {
  if (!plugin.keywords) continue;

  let score = 0;
  const matches = [];

  for (const keyword of plugin.keywords) {
    const keywordLower = keyword.toLowerCase();

    // Direct match (highest score)
    if (descriptionTokens.includes(keywordLower)) {
      score += 10;
      matches.push(keyword);
    }
    // Partial match (medium score)
    else if (descriptionTokens.some(t => t.includes(keywordLower) || keywordLower.includes(t))) {
      score += 5;
      matches.push(keyword);
    }
  }

  if (score > 0) {
    scores[pluginName] = score;
    matchDetails[pluginName] = matches;
  }
}
```

**Sort plugins** by score (highest first).

### Step 4: Match to Chains

Check which built-in chains use the top-scored plugins:

```javascript
const chainSuggestions = [];

for (const [chainName, chain] of Object.entries(registry.chains)) {
  const chainPlugins = chain.requires || [];

  // Count how many of chain's plugins are in our top suggestions
  let relevance = 0;
  for (const plugin of chainPlugins) {
    if (scores[plugin]) {
      relevance += scores[plugin];
    }
  }

  if (relevance > 0) {
    chainSuggestions.push({
      name: chainName,
      score: relevance,
      plugins: chainPlugins
    });
  }
}

chainSuggestions.sort((a, b) => b.score - a.score);
```

### Step 5: Format Response

**If chains match** (preferred - show chain first):

```
Suggestions for: "{description}"

✨ Recommended Chain:
  {chain-name}
  Steps: {plugin1} → {plugin2} → {plugin3}
  Run: /chainer:run {chain-name} --prompt "{description}"

This chain uses:
  • {plugin1} - {description} (matched: "{keyword1}", "{keyword2}")
  • {plugin2} - {description} (matched: "{keyword3}")

{If multiple chain matches, show "Other chains:" with next best}
```

**If only plugins match** (no chain):

```
Suggestions for: "{description}"

Matched plugins:
  • {plugin1} - {description}
    Install: /plugin install {plugin1}@{marketplace}
    Matched keywords: "{keyword1}", "{keyword2}"

  • {plugin2} - {description}
    Install: /plugin install {plugin2}@{marketplace}
    Matched keywords: "{keyword3}"

  • {plugin3} - {description}
    Install: /plugin install {plugin3}@{marketplace}
    Matched keywords: "{keyword4}"

💡 Tip: Create a custom chain to automate these plugins:
   See: /chainer:list for examples
```

**If no matches**:

```
No direct matches found for: "{description}"

Available built-in chains:
  • plan-only - Planning with feature-dev
  • implement-only - Implementation with ralph-loop
  • plan-and-implement - Full development cycle
  • worktree-plan-implement - Isolated feature development

Try:
  /chainer:list - Show all available chains
  /plugin search {term} - Search for plugins
```

### Step 6: Additional Context

At the end of suggestions, always add:

```
Need help? /chainer:list shows all chains with detailed descriptions.
```

## Example Outputs

### Example 1: "plan and implement a login feature"

```
Suggestions for: "plan and implement a login feature"

✨ Recommended Chain:
  plan-and-implement
  Steps: feature-dev → ralph-loop
  Run: /chainer:run plan-and-implement --prompt "login feature"

This chain uses:
  • feature-dev - Feature planning with architecture focus
    (matched: "plan")
  • ralph-loop - Autonomous implementation loops
    (matched: "implement", "feature")

Need help? /chainer:list shows all chains with detailed descriptions.
```

### Example 2: "review my code for security issues"

```
Suggestions for: "review my code for security issues"

Matched plugins:
  • security-guidance - Security best practices and guidance
    Install: /plugin install security-guidance@claude-plugins-official
    Matched keywords: "security"

  • code-review - Code review and quality analysis
    Install: /plugin install code-review@claude-plugins-official
    Matched keywords: "review"

💡 Tip: Create a custom chain to automate these plugins:
   See: /chainer:list for examples

Need help? /chainer:list shows all chains with detailed descriptions.
```

### Example 3: "create isolated workspace for testing"

```
Suggestions for: "create isolated workspace for testing"

✨ Recommended Chain:
  worktree-plan-implement
  Steps: worktree-manager → feature-dev → ralph-loop
  Run: /chainer:run worktree-plan-implement --prompt "testing"

This chain uses:
  • worktree-manager - Git worktree creation and management
    (matched: "workspace", "isolated")
  • feature-dev - Feature planning with architecture focus
    (matched: "plan")
  • ralph-loop - Autonomous implementation loops
    (matched: "implement")

Other chains:
  • plan-and-implement - Planning + implementation without isolation

Need help? /chainer:list shows all chains with detailed descriptions.
```

## Implementation Notes

- **Keyword matching is case-insensitive**
- **Stop words are filtered** to improve matching accuracy
- **Chains take priority** over individual plugins (more useful to users)
- **Show top 3 plugins maximum** to avoid overwhelming output
- **Always provide runnable commands** so users can act immediately
- **Graceful degradation** if registry doesn't have keywords for a plugin
