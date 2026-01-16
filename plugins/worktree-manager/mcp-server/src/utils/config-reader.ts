import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration options for worktree-manager
 */
export interface WorktreeConfig {
  /** Base directory for worktrees (default: ~/worktrees) */
  worktree_base_path: string;

  /** Prefix for feature branches (default: feature/) */
  branch_prefix: string;

  /** Auto-commit changes periodically (default: false) */
  auto_commit: boolean;

  /** Auto-push to remote after commits (default: false) */
  auto_push: boolean;

  /** Create learnings.md file to capture insights (default: false) */
  create_learnings_file: boolean;

  /** Auto-initialize git submodules (default: true) */
  auto_init_submodules: boolean;

  /** Auto-run setup commands: 'auto' (run first detected), 'prompt' (ask user), 'all' (run all detected), false (skip) (default: 'prompt') */
  auto_run_setup: 'auto' | 'prompt' | 'all' | false;

  /** Auto-copy environment files to new worktrees (default: true) */
  copy_files_enabled: boolean;

  /** Glob patterns for files to copy (default: ['.env', '.env.*', '.vscode/**', '*.local']) */
  copy_file_patterns: string[];

  /** Glob patterns to exclude from copying (default: ['node_modules', 'dist', 'build', 'coverage', '.git']) */
  exclude_file_patterns: string[];

  /** Directory for spec files (default: audit) */
  spec_directory: string;

  /** Max iterations for ralph (default: 50) */
  default_max_iterations: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: WorktreeConfig = {
  worktree_base_path: path.join(os.homedir(), 'worktrees'),
  branch_prefix: 'feature/',
  auto_commit: false,
  auto_push: false,
  create_learnings_file: false,
  auto_init_submodules: true,
  auto_run_setup: 'prompt',
  copy_files_enabled: true,
  copy_file_patterns: ['.env', '.env.*', '.vscode/**', '*.local'],
  exclude_file_patterns: ['node_modules', 'dist', 'build', 'coverage', '.git'],
  spec_directory: 'audit',
  default_max_iterations: 50,
};

/**
 * Read and parse worktree-manager configuration
 *
 * Looks for config in these locations (in order):
 * 1. Project-level: .claude/worktree-manager.local.md
 * 2. User-level: ~/.claude/worktree-manager.local.md
 *
 * Config file format:
 * ```
 * ---
 * worktree_base_path: ~/my-worktrees
 * auto_commit: true
 * ---
 *
 * # Additional notes or context
 * ```
 */
export class ConfigReader {
  /**
   * Get merged configuration (defaults + user overrides)
   */
  static getConfig(projectPath?: string): WorktreeConfig {
    const userConfig = this.readConfigFile(
      path.join(os.homedir(), '.claude', 'worktree-manager.local.md')
    );

    const projectConfig = projectPath
      ? this.readConfigFile(
          path.join(projectPath, '.claude', 'worktree-manager.local.md')
        )
      : {};

    // Merge: defaults < user < project (project wins)
    const merged = {
      ...DEFAULT_CONFIG,
      ...userConfig,
      ...projectConfig,
    };

    // Expand ~ in paths
    if (merged.worktree_base_path.startsWith('~')) {
      merged.worktree_base_path = merged.worktree_base_path.replace(
        '~',
        os.homedir()
      );
    }

    return merged;
  }

  /**
   * Read and parse a config file with YAML frontmatter
   */
  static readConfigFile(filePath: string): Partial<WorktreeConfig> {
    try {
      if (!fs.existsSync(filePath)) {
        return {};
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseYamlFrontmatter(content);
    } catch (error) {
      // Config file doesn't exist or can't be read - use defaults
      return {};
    }
  }

  /**
   * Parse YAML frontmatter from markdown content
   * Simple parser that handles the config options we care about
   */
  static parseYamlFrontmatter(content: string): Partial<WorktreeConfig> {
    const config: Partial<WorktreeConfig> = {};

    // Check for frontmatter delimiters
    if (!content.startsWith('---')) {
      return config;
    }

    const endIndex = content.indexOf('---', 3);
    if (endIndex === -1) {
      return config;
    }

    const frontmatter = content.substring(3, endIndex).trim();
    const lines = frontmatter.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Parse based on known keys
      switch (key) {
        case 'worktree_base_path':
          config.worktree_base_path = value;
          break;
        case 'branch_prefix':
          config.branch_prefix = value;
          break;
        case 'auto_commit':
          config.auto_commit = value === 'true';
          break;
        case 'auto_push':
          config.auto_push = value === 'true';
          break;
        case 'create_learnings_file':
          config.create_learnings_file = value === 'true';
          break;
        case 'auto_init_submodules':
          config.auto_init_submodules = value === 'true';
          break;
        case 'auto_run_setup':
          // Support new modes: 'auto', 'prompt', 'all', or false
          // Backward compatibility: true -> 'auto', false -> false
          if (value === 'true') {
            config.auto_run_setup = 'auto';
          } else if (value === 'false') {
            config.auto_run_setup = false;
          } else if (value === 'auto' || value === 'prompt' || value === 'all') {
            config.auto_run_setup = value;
          }
          break;
        case 'copy_files_enabled':
          config.copy_files_enabled = value === 'true';
          break;
        case 'copy_file_patterns':
          try {
            const patterns = JSON.parse(value);
            if (Array.isArray(patterns)) {
              config.copy_file_patterns = patterns;
            }
          } catch {
            // Invalid JSON, skip
          }
          break;
        case 'exclude_file_patterns':
          try {
            const patterns = JSON.parse(value);
            if (Array.isArray(patterns)) {
              config.exclude_file_patterns = patterns;
            }
          } catch {
            // Invalid JSON, skip
          }
          break;
        case 'spec_directory':
          config.spec_directory = value;
          break;
        case 'default_max_iterations':
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed) && parsed > 0) {
            config.default_max_iterations = parsed;
          }
          break;
      }
    }

    return config;
  }

  /**
   * Get the default config as a template string
   */
  static getConfigTemplate(): string {
    return `---
# Worktree Manager Configuration
# Place this file at: .claude/worktree-manager.local.md (project) or ~/.claude/worktree-manager.local.md (global)

# Where to create worktrees (default: ~/worktrees)
worktree_base_path: ~/worktrees

# Branch prefix (default: feature/)
branch_prefix: feature/

# Auto-commit changes during ralph execution (default: false)
auto_commit: false

# Auto-push to remote after commits (default: false)
auto_push: false

# Create learnings.md to capture insights during development (default: false)
create_learnings_file: false

# Auto-initialize git submodules (default: true)
auto_init_submodules: true

# Setup behavior: 'prompt' (ask user), 'auto' (run first), 'all' (run all), false (skip) (default: 'prompt')
auto_run_setup: prompt

# Auto-copy environment files to new worktrees (default: true)
copy_files_enabled: true

# Glob patterns for files to copy (default: ['.env', '.env.*', '.vscode/**', '*.local'])
copy_file_patterns: [".env", ".env.*", ".vscode/**", "*.local"]

# Glob patterns to exclude from copying (default: ['node_modules', 'dist', 'build', 'coverage', '.git'])
exclude_file_patterns: ["node_modules", "dist", "build", "coverage", ".git"]

# Directory for spec files (default: audit)
spec_directory: audit

# Max iterations for ralph (default: 50)
default_max_iterations: 50
---

# Project-Specific Notes

Add any project-specific context, conventions, or instructions here.
This content will be available to Claude during worktree operations.

# For automated workflows, use Chainer plugin:
# /chainer:run plan-and-implement --prompt="Your feature idea"
`;
  }
}
