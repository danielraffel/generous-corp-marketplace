# Supported Plugins

Chainer works with a growing number of Claude Code plugins. This document maps which plugins are tested and what features they support.

## Core Development Plugins

| Plugin | Smart Questions | Natural Language | Chain Support | Notes |
|--------|----------------|------------------|---------------|-------|
| [feature-dev](https://github.com/anthropics/claude-plugins-official/tree/main/feature-dev) | ✅ Planned | ✅ Yes | ✅ Yes | Used in plan-and-implement, plan-only chains |
| [ralph-loop](https://github.com/anthropics/claude-plugins-official/tree/main/ralph-loop) | ✅ Planned | ✅ Yes | ✅ Yes | Used in plan-and-implement, implement-only chains |
| [worktree-manager](https://github.com/danielraffel/worktree-manager) | ✅ Planned | ✅ Yes | ✅ Yes | Used in worktree-plan-implement chain |
| [frontend-design](https://github.com/anthropics/claude-plugins-official/tree/main/frontend-design) | ✅ Planned | ✅ Yes | ⚙️ Partial | Can be used in custom chains |

## Official Anthropic Plugins

These plugins are in Chainer's registry and can be used in custom chains:

| Plugin | Description | Chain Support |
|--------|-------------|---------------|
| [agent-sdk-dev](https://github.com/anthropics/claude-plugins-official) | Claude Agent SDK development tools | ⚙️ Untested |
| [code-review](https://github.com/anthropics/claude-plugins-official) | Code review and quality analysis | ⚙️ Untested |
| [commit-commands](https://github.com/anthropics/claude-plugins-official) | Git commit workflow automation | ⚙️ Untested |
| [plugin-dev](https://github.com/anthropics/claude-plugins-official) | Plugin development tools | ⚙️ Untested |
| [pr-review-toolkit](https://github.com/anthropics/claude-plugins-official) | Pull request review toolkit | ⚙️ Untested |
| [security-guidance](https://github.com/anthropics/claude-plugins-official) | Security best practices and guidance | ⚙️ Untested |

## Language Server Plugins (LSP)

These LSP plugins are recognized by Chainer and can be integrated into custom chains:

| Plugin | Language | Chain Support |
|--------|----------|---------------|
| [clangd-lsp](https://github.com/anthropics/claude-plugins-official) | C/C++ | ⚙️ Untested |
| [csharp-lsp](https://github.com/anthropics/claude-plugins-official) | C# | ⚙️ Untested |
| [gopls-lsp](https://github.com/anthropics/claude-plugins-official) | Go | ⚙️ Untested |
| [jdtls-lsp](https://github.com/anthropics/claude-plugins-official) | Java | ⚙️ Untested |
| [lua-lsp](https://github.com/anthropics/claude-plugins-official) | Lua | ⚙️ Untested |
| [php-lsp](https://github.com/anthropics/claude-plugins-official) | PHP | ⚙️ Untested |
| [pyright-lsp](https://github.com/anthropics/claude-plugins-official) | Python | ⚙️ Untested |
| [rust-analyzer-lsp](https://github.com/anthropics/claude-plugins-official) | Rust | ⚙️ Untested |
| [swift-lsp](https://github.com/anthropics/claude-plugins-official) | Swift | ⚙️ Untested |

## Other Plugins

| Plugin | Description | Chain Support |
|--------|-------------|---------------|
| [hookify](https://github.com/anthropics/claude-plugins-official) | Git hook management | ⚙️ Untested |

## Feature Support Legend

- **Smart Questions**: Plugin's clarifying questions can be parsed into interactive UI (when `question_handling.enabled: true`)
- **Natural Language**: Plugin works when invoked via natural language prompts
- **Chain Support**: Plugin can be used as a step in Chainer workflows

### Status Icons
- ✅ **Yes**: Fully supported and tested
- ✅ **Planned**: Feature designed but not yet implemented
- ⚙️ **Partial**: Works but may have limitations
- ❌ **No**: Not currently supported

## Community-Tested Plugins

These plugins have been reported to work by the community but aren't officially tested yet:

| Plugin | Reported By | Status | Notes |
|--------|-------------|--------|-------|
| *None yet* | - | - | [Contribute your experience →](https://github.com/danielraffel/Chainer/issues) |

## Adding Support for Your Plugin

Want to make your plugin work better with Chainer? Here's what helps:

### For Question Support
If your plugin asks clarifying questions:
- Use numbered lists (`1. `, `2. `) for questions
- Include question marks at the end
- Provide options in sub-bullets when applicable
- OR use Claude Code's native `AskUserQuestion` tool

### For Chain Integration
- Accept arguments via standard input or command-line flags
- Return outputs that can be captured and used by subsequent steps
- Document required inputs and expected outputs

## Contributing

Found a plugin that works great (or doesn't work) with Chainer? [Open an issue](https://github.com/danielraffel/Chainer/issues) or submit a PR updating this file!

---

**Last updated:** 2026-01-05
