# Community Chains

A curated library of shareable Chainer workflows contributed by the community.

## Structure

```
community-chains/
├── development/     # Software development workflows
├── content/         # Content creation and research
└── marketing/       # Marketing and growth workflows
```

## Using Community Chains

### Method 1: Copy to Your Config

Copy the chain definition from any `.yaml` file and paste it into your `~/.claude/chainer.local.md` configuration file.

### Method 2: Import via Settings Editor

1. Open `settings.html` in your browser
2. Click "Import" button
3. Select "From File" and choose the `.yaml` file
4. Chain will be added to your configuration

### Method 3: Import from URL (Future)

```bash
# Coming in Phase 5
/chainer:import https://raw.githubusercontent.com/user/repo/main/chain.yaml
```

## Available Chains

### Development

| Chain | Description | Requirements |
|-------|-------------|--------------|
| `design-and-build` | Design UI with frontend-design, implement with ralph | frontend-design, ralph-loop |
| `tdd-feature` | Test-driven development workflow | feature-dev, ralph-loop |

### Content

| Chain | Description | Requirements |
|-------|-------------|--------------|
| `research-to-doc` | Research topic and create documentation | Web search capability |

### Marketing

| Chain | Description | Requirements |
|-------|-------------|--------------|
| `landing-page-full` | Complete landing page workflow | frontend-design, ralph-loop |

## Contributing Chains

Want to share your chains with the community? Follow these steps:

1. **Create your chain** - Test it thoroughly in your own workflow
2. **Add documentation** - Include usage examples and requirements
3. **Choose category** - development, content, marketing, or propose a new one
4. **Submit PR** - Include the `.yaml` file with frontmatter and description

### Chain Template

```yaml
---
name: my-awesome-chain
enabled: true
description: "Short description of what this chain does"
inputs:
  param1: { required: true, description: "What this parameter is for" }
  param2: { required: false, description: "Optional parameter" }
steps:
  - name: step1
    type: skill
    skill: plugin-name:skill-name
    args: "{{param1}}"
  - name: step2
    type: script
    script: echo "Doing something with {{param1}}"
---

# Chain Name

Detailed description of the chain, what it does, and why it's useful.

## Usage

\`\`\`bash
/chainer:run my-awesome-chain --param1="value"
\`\`\`

## Requirements

- List all required plugins
- Any configuration needed
- External tools required

## Example

\`\`\`bash
# Real-world usage example
/chainer:run my-awesome-chain --param1="Build user dashboard"
\`\`\`
```

## Guidelines

### Good Chains

- ✅ Solve a specific, common problem
- ✅ Have clear, documented steps
- ✅ Include usage examples
- ✅ List all requirements
- ✅ Are well-tested

### Avoid

- ❌ Overly complex chains (break into smaller chains)
- ❌ Chains requiring proprietary tools
- ❌ Undocumented or unclear steps
- ❌ Chains with hardcoded values (use inputs instead)

## License

Community chains are shared under the MIT License. By contributing, you agree to license your chain under MIT.

## Support

- **Issues**: Report problems with community chains on [GitHub Issues](https://github.com/danielraffel/Chainer/issues)
- **Discussions**: Share ideas in [GitHub Discussions](https://github.com/danielraffel/Chainer/discussions)
- **Questions**: Tag your questions with `community-chains`
