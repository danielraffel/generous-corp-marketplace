# Worktree Manager

**Effortless git worktrees for parallel development**

A Claude Code plugin that creates and manages git worktrees with automatic environment setup. Built with a two-layer architecture: user-friendly plugin commands backed by a robust TypeScript MCP server.

## What This Does

Create isolated git worktrees for parallel feature development. Automatically detects project type and runs setup (npm install, swift build, etc.).

```bash
/worktree-manager:create bug-fix
# Creates ~/worktrees/bug-fix/ on branch feature/bug-fix with auto-setup
```

## Key Features

- **One command** creates worktree + new branch
- **Universal language support** - auto-detects 22+ ecosystems with smart package manager detection (Node.js with npm/yarn/pnpm/bun, Python with uv/Conda/Poetry/pipenv/pip, Swift, Deno, C++/CMake, Ruby, Go, Rust, Java, PHP, Elixir, .NET, Scala, Flutter, Dart, iOS)
- **Auto-runs** setup commands for your project type
- **Auto-copies** environment files (.env, .vscode) to new worktrees
- **Advanced worktree operations** - move, lock, repair, and prune worktrees
- **Complete branch management** - rename and delete branches with safety checks
- **Create from existing branches** - checkout existing branches in new worktrees
- **99% test coverage** - reliable and well-tested (86 passing tests)
- **Parallel development** - work on multiple features simultaneously

## Architecture

This project consists of two layers:

```
┌─────────────────────────────────────────┐
│      Claude Code Plugin (Frontend)      │
│                                         │
│  • User-facing slash commands           │
│  • /worktree-manager:create              │
│  • /worktree-manager:list               │
│  • /worktree-manager:status             │
│  • /worktree-manager:cleanup            │
│  • /worktree-manager:move               │
│  • /worktree-manager:lock               │
│  • /worktree-manager:unlock             │
│  • /worktree-manager:repair             │
│  • /worktree-manager:prune              │
│  • /worktree-manager:rename-branch      │
│  • /worktree-manager:delete-branch      │
│                                         │
│  Commands call ↓                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      MCP Server (Backend)               │
│                                         │
│  • TypeScript tools (99% test coverage) │
│  • Git worktree operations              │
│  • Worktree lifecycle management        │
│  • Branch management                    │
│  • Environment auto-detection           │
│  • Auto-setup execution                 │
│  • Project type detection               │
│  • File pattern copying                 │
└─────────────────────────────────────────┘
```

### Why Two Layers?

- **Plugin layer**: User-friendly commands, integrates with Claude Code
- **MCP server layer**: Type-safe TypeScript with comprehensive tests
- **Separation of concerns**: UI in plugin, business logic in MCP server
- **Maintainability**: Update either layer independently

## Installation

### 1. Add the Marketplace

In Claude Code, run:

```bash
/plugin marketplace add danielraffel/generous-corp-marketplace
```

### 2. Install the Plugin

```bash
/plugin install worktree-manager@generous-corp-marketplace
```

Or use the interactive installer:
1. Type `/plugin`
2. Navigate to "generous-corp-marketplace"
3. Select "worktree-manager"
4. Click "Install for you (user scope)"

### 3. Restart Claude Code

Quit and reopen Claude Code to load the plugin.

### 4. Verify Installation

```bash
/plugin list
# Should show worktree-manager

/worktree-manager:list
# Should display your worktrees
```

## Usage

### Worktree Creation

```bash
# Create worktree with new branch
/worktree-manager:create my-feature

# Create worktree from existing branch
/worktree-manager:create my-feature --existing-branch=feature/existing

# Custom base branch
/worktree-manager:create hotfix --base-branch=develop

# Custom location
/worktree-manager:create experiment --worktree-path=/tmp/test
```

### What Happens

1. Creates worktree at `~/worktrees/my-feature/`
2. Creates branch `feature/my-feature`
3. Detects project type (web → npm, iOS → swift, etc.)
4. Runs setup commands automatically
5. Suggests next steps

### Auto-Detection & Setup

Automatically detects project type and runs appropriate setup commands:

| Ecosystem | Detection | Auto-Setup |
|-----------|-----------|------------|
| **Node.js (web)** | `web/package.json` | `npm install` (or pnpm/yarn/bun based on lockfile) |
| **Node.js** | `package.json` (root) | `npm install` (or pnpm/yarn/bun based on lockfile) |
| **Python (uv)** | `uv.lock` | `uv sync` |
| **Python (Conda)** | `environment.yml` | `conda env create -f environment.yml` |
| **Python (Poetry)** | `pyproject.toml` + `poetry.lock` | `poetry install` |
| **Python (pipenv)** | `Pipfile` | `pipenv install` |
| **Python (pip)** | `requirements.txt` | `pip install -r requirements.txt` |
| **Python** | `setup.py` | `pip install -e .` |
| **Swift** | `Package.swift` | `swift package resolve` |
| **Deno** | `deno.json`, `deno.jsonc` | `deno cache --reload` |
| **C++ (CMake)** | `CMakeLists.txt` | `cmake -B build` |
| **Ruby** | `Gemfile` | `bundle install` |
| **Go** | `go.mod` | `go mod download` |
| **Rust** | `Cargo.toml` | `cargo fetch` |
| **Java (Maven)** | `pom.xml` | `mvn dependency:resolve` |
| **Java/Kotlin (Gradle)** | `build.gradle`, `build.gradle.kts` | `gradle dependencies` |
| **PHP** | `composer.json` | `composer install` |
| **Elixir** | `mix.exs` | `mix deps.get` |
| **.NET** | `*.csproj`, `*.fsproj`, `*.vbproj` | `dotnet restore` |
| **Scala** | `build.sbt` | `sbt update` |
| **Flutter** | `pubspec.yaml` (with flutter) | `flutter pub get` |
| **Dart** | `pubspec.yaml` | `dart pub get` |
| **iOS** | `ios/` directory | Manual (Xcode) |
| **Full-stack** | Multiple ecosystems | Priority-based setup |

#### Automatic Environment Setup

**We detect your project type and ask you what to install—nothing runs without your permission.**

When you create a worktree:
1. We scan for all ecosystems (~100ms)
2. Show interactive menu with detected options
3. You select what to install (or skip all)
4. We run only your selections

**Multi-ecosystem example** (Node.js + Rust + Swift):
```
Which project types should I set up?
[x] Node.js (npm) - npm install
[ ] Rust - cargo fetch
[ ] Swift - swift package resolve
```
*Deselect all to skip setup entirely.*

**Control this behavior** via `auto_run_setup` config:
- `'prompt'` (default): Interactive menu - you choose what to install
- `'auto'`: Run first detected only - faster for single-language projects
- `'all'`: Install all detected ecosystems - slower, could take 5+ minutes for polyglot repos
- `false`: Skip all detection and setup

### List Worktrees

```bash
/worktree-manager:list
```

Shows all worktrees with:
- Path
- Branch name
- Commit SHA
- Uncommitted changes
- Untracked files

### Check Status

```bash
/worktree-manager:status
```

Shows git status for all worktrees.

### Cleanup

```bash
/worktree-manager:cleanup <path-or-branch>
```

Safely removes worktree after checking for uncommitted changes.

### Advanced Worktree Operations

**Move Worktree**
```bash
# Move worktree to new location
/worktree-manager:move ~/worktrees/old-feature ~/worktrees/new-location
```

Git automatically updates all internal references.

**Lock Worktree**
```bash
# Prevent accidental removal
/worktree-manager:lock ~/worktrees/important-feature

# With custom reason
/worktree-manager:lock ~/worktrees/important-feature --reason="In active development"
```

Use when you want to protect a worktree from being deleted.

**Unlock Worktree**
```bash
# Allow removal again
/worktree-manager:unlock ~/worktrees/important-feature
```

**Repair Worktree**
```bash
# Fix broken worktree references
/worktree-manager:repair ~/worktrees/my-feature
```

Use when worktree was manually moved or parent repository moved.

**Prune Orphaned Worktrees**
```bash
# Clean up references to deleted worktrees
/worktree-manager:prune
```

Removes administrative references to worktrees that were manually deleted.

### Branch Management

**Rename Branch**
```bash
# Rename branch in worktree
/worktree-manager:rename-branch ~/worktrees/feature old-name new-name
```

Updates all git references automatically.

**Delete Branch**
```bash
# Delete local branch
/worktree-manager:delete-branch feature/old-feature

# Delete with safety checks bypassed (unmerged branches)
/worktree-manager:delete-branch feature/experiment --force

# Delete local and remote
/worktree-manager:delete-branch feature/done --delete-remote

# Delete from specific remote
/worktree-manager:delete-branch feature/test --delete-remote --remote=upstream
```

Safety checks prevent deletion of unmerged branches unless `--force` is used.

## Parallel Development

Worktree Manager enables true parallel development. You can:

1. **Create multiple worktrees** for different features
2. **Open separate Claude Code sessions** in each worktree
3. **Work on multiple features simultaneously** without conflicts

```bash
# Terminal 1: Work on feature A
/worktree-manager:create feature-a
cd ~/worktrees/feature-a
claude

# Terminal 2: Work on feature B
/worktree-manager:create feature-b
cd ~/worktrees/feature-b
claude
```

### Pairs with Chainer

For automated workflows (planning + implementation), pair with [Chainer](https://www.generouscorp.com/Chainer):

```bash
# Create worktree
/worktree-manager:create payments

# Use Chainer for automated development
/chainer:run plan-and-implement \
  --cwd="~/worktrees/payments" \
  --prompt="Add Stripe integration"
```

## Configuration

Create `~/.claude/worktree-manager.local.md` (global) or `.claude/worktree-manager.local.md` (project-specific):

```yaml
---
# Where to create worktrees (default: ~/worktrees)
worktree_base_path: ~/worktrees

# Branch prefix (default: feature/)
branch_prefix: feature/

# Create LEARNINGS.md in worktree to capture insights
create_learnings_file: false

# Auto-initialize git submodules (default: true)
auto_init_submodules: true

# Setup behavior: 'auto' (run first detected), 'prompt' (ask which to run), false (skip)
# - 'prompt' (default): Interactive - asks which ecosystems to set up (recommended for multi-ecosystem repos)
# - 'auto': Legacy behavior - runs first detected ecosystem automatically
# - false: Skips all setup
auto_run_setup: prompt

# Auto-copy environment files to new worktrees (default: true)
copy_files_enabled: true

# Glob patterns for files to copy (default: ['.env', '.env.*', '.vscode/**', '*.local'])
copy_file_patterns: [".env", ".env.*", ".vscode/**", "*.local"]

# Glob patterns to exclude from copying (default: ['node_modules', 'dist', 'build', 'coverage', '.git'])
exclude_file_patterns: ["node_modules", "dist", "build", "coverage", ".git"]

# Auto-commit changes during AI agent execution
auto_commit: false

# Auto-push to remote after commits
auto_push: false

# Default workflow type (always 'simple' for worktree-only)
default_workflow: simple

# Directory for spec files (default: audit)
spec_directory: audit

# Max iterations for automated workflows (default: 50)
default_max_iterations: 50
---

# Project-Specific Notes
Add any project-specific context or conventions here.
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `worktree_base_path` | `~/worktrees` | Base directory where all worktrees are created |
| `branch_prefix` | `feature/` | Prefix for new branches (e.g., `feature/my-task`) |
| `create_learnings_file` | `false` | Create `LEARNINGS.md` in worktree to capture insights |
| `auto_init_submodules` | `true` | Auto-initialize git submodules recursively in new worktrees |
| `auto_run_setup` | `'prompt'` | Setup behavior: `'prompt'` (ask user), `'auto'` (run first detected), `false` (skip) |
| `copy_files_enabled` | `true` | Auto-copy development environment files to new worktrees |
| `copy_file_patterns` | `['.env', '.vscode/**', '*.local']` | Glob patterns for files to copy from main repo |
| `exclude_file_patterns` | `['node_modules', 'dist', '.git']` | Glob patterns to exclude from copying |
| `auto_commit` | `false` | Auto-commit changes during AI agent execution |
| `auto_push` | `false` | Auto-push to remote after commits |
| `default_workflow` | `simple` | Default workflow when not specified |
| `spec_directory` | `audit` | Directory for specification files |
| `default_max_iterations` | `50` | Maximum iterations for automated workflows |

## Development

### Build

```bash
cd mcp-server
npm install
npm run build
```

### Tests

```bash
cd mcp-server
npm test

# With coverage
npm run test:coverage
```

Current coverage: **99%** (81 passing tests)

### Watch Mode

```bash
cd mcp-server
npm run watch
```

### Lint

```bash
cd mcp-server
npm run lint
```

## Project Structure

```
worktree-manager/
├── commands/                    # Claude Code plugin commands
│   ├── create.md               # Create worktree
│   ├── list.md                 # List worktrees
│   ├── status.md               # Check status
│   ├── cleanup.md              # Remove worktree
│   ├── move.md                 # Move worktree
│   ├── lock.md                 # Lock worktree
│   ├── unlock.md               # Unlock worktree
│   ├── repair.md               # Repair worktree
│   ├── prune.md                # Prune orphaned worktrees
│   ├── rename-branch.md        # Rename branch
│   └── delete-branch.md        # Delete branch
│
├── mcp-server/                  # TypeScript MCP server
│   ├── src/
│   │   ├── index.ts            # Server entry point
│   │   ├── tools/              # MCP tools (11 total)
│   │   │   ├── worktree-start.ts
│   │   │   ├── worktree-list.ts
│   │   │   ├── worktree-status.ts
│   │   │   ├── worktree-cleanup.ts
│   │   │   ├── worktree-move.ts
│   │   │   ├── worktree-lock.ts
│   │   │   ├── worktree-unlock.ts
│   │   │   ├── worktree-repair.ts
│   │   │   ├── worktree-prune.ts
│   │   │   ├── worktree-rename-branch.ts
│   │   │   └── worktree-delete-branch.ts
│   │   ├── utils/              # Utilities
│   │   │   ├── git-helpers.ts
│   │   │   ├── project-detector.ts
│   │   │   ├── setup-runner.ts
│   │   │   ├── config-reader.ts
│   │   │   ├── file-copier.ts
│   │   │   └── command-builder.ts
│   │   └── types.ts
│   ├── tests/                  # 99% coverage (71 tests)
│   │   └── unit/
│   ├── package.json
│   └── tsconfig.json
│
├── ai/                          # Development documentation
│   ├── IMPLEMENTATION_PLAN.md  # Feature implementation tracking
│   ├── MANUAL_TESTING_CHECKLIST.md  # Manual testing scenarios
│   ├── TESTING_GUIDE.md        # Testing guidelines
│   └── EDGE_CASES.md           # Edge cases documentation
│
├── .claude-plugin/
│   └── plugin.json             # Plugin manifest
├── CLAUDE.md                    # Development guidance
├── README.md                    # This file
└── index.html                   # Marketing page
```

## Design Philosophy

Worktree Manager follows a focused, single-responsibility approach:

- **Do one thing well**: Create and manage git worktrees with automatic setup
- **Two-layer architecture**: User-friendly plugin commands + robust TypeScript backend
- **99% test coverage**: Reliable, well-tested codebase
- **Composable**: Works standalone or pairs with other plugins (like Chainer) for workflows
- **Clean separation**: Worktree operations here, workflow orchestration elsewhere

## Related Projects

- **[Chainer](https://www.generouscorp.com/Chainer)** - Universal plugin orchestration for Claude Code (pairs well with Worktree Manager for automated workflows)

## Contributing

Contributions welcome! Please:

1. Run tests: `cd mcp-server && npm test`
2. Ensure coverage stays at 99%+
3. Update README if adding features
4. Follow existing code style

## Troubleshooting

### Worktree already exists

```
❌ Worktree already exists with uncommitted changes
```

**Fix**: Commit or stash changes, or use `/worktree-manager:cleanup` to remove it.

### Not in a git repository

```
❌ Current directory is not a git repository
```

**Fix**: Navigate to a git repository first.

### Setup failed

```
⚠️ Worktree created but setup incomplete
```

**Fix**: Run setup manually:
```bash
cd ~/worktrees/my-feature
npm install  # or appropriate setup command
```

## License

MIT License - see LICENSE file for details

## Credits

Built by [Daniel Raffel](https://github.com/danielraffel) for the Claude Code community.

## Links

- [GitHub Repository](https://github.com/danielraffel/worktree-manager)
- [Chainer Plugin](https://www.generouscorp.com/Chainer)
- [Documentation Site](https://danielraffel.github.io/worktree-manager/)
