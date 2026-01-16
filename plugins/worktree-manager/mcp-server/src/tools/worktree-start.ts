import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { WorktreeStartParams, WorktreeStartResult } from '../types';
import { GitHelpers } from '../utils/git-helpers';
import { ProjectDetector } from '../utils/project-detector';
import { SetupRunner } from '../utils/setup-runner';
import { ConfigReader, WorktreeConfig } from '../utils/config-reader';
import { FileCopier } from '../utils/file-copier';

/**
 * Main tool for creating git worktrees with auto-setup
 * Refactored to be worktree-only - workflows delegated to Chainer plugin
 */
export class WorktreeStartTool {
  /**
   * Create a new worktree with auto-setup
   */
  static async execute(params: WorktreeStartParams): Promise<WorktreeStartResult> {
    // Load configuration
    const cwd = process.cwd();
    const config = ConfigReader.getConfig(cwd);

    // Set defaults from config
    const baseBranch = params.base_branch || 'main';
    const defaultWorktreePath = path.join(
      config.worktree_base_path,
      params.feature_name
    );
    const worktreePath = params.worktree_path || defaultWorktreePath;

    // Determine branch name - use existing_branch if provided, else create new one
    const useExistingBranch = !!params.existing_branch;
    const branchName = params.existing_branch || `${config.branch_prefix}${params.feature_name}`;

    try {
      // Step 1: Verify we're in a git repo
      const isGitRepo = await GitHelpers.isGitRepo(cwd);
      if (!isGitRepo) {
        return {
          success: false,
          worktree_path: worktreePath,
          branch: branchName,
          setup_complete: false,
          setup_messages: [],
          error: 'Current directory is not a git repository',
          next_steps: ['Navigate to a git repository and try again'],
        };
      }

      // Step 2: Create worktree (or reuse existing clean one)
      const createResult = useExistingBranch
        ? await GitHelpers.createWorktreeFromExisting({
            path: worktreePath,
            branch: branchName,
            cwd,
          })
        : await GitHelpers.createWorktree({
            path: worktreePath,
            branch: branchName,
            baseBranch: baseBranch,
            cwd,
          });

      let reusingExisting = false;
      if (!createResult.success) {
        // Check if worktree already exists and is clean - if so, reuse it
        if (fs.existsSync(worktreePath)) {
          const isGitRepo = await GitHelpers.isGitRepo(worktreePath);
          if (isGitRepo) {
            const status = await GitHelpers.getStatus(worktreePath);
            const isClean = status.uncommitted_changes === 0 && status.untracked_files === 0;

            if (isClean) {
              // Worktree exists and is clean - reuse it!
              reusingExisting = true;
            } else {
              // Worktree exists but has uncommitted changes
              return {
                success: false,
                worktree_path: worktreePath,
                branch: branchName,
                setup_complete: false,
                setup_messages: [],
                error: `Worktree already exists with uncommitted changes: ${worktreePath}`,
                next_steps: [
                  'Commit or stash changes in existing worktree',
                  'Or use /worktree-manager:cleanup to remove it',
                  'Or try a different feature name',
                ],
              };
            }
          }
        }

        // If we're not reusing, return the original error
        if (!reusingExisting) {
          return {
            success: false,
            worktree_path: worktreePath,
            branch: branchName,
            setup_complete: false,
            setup_messages: [],
            error: createResult.error,
            next_steps: [
              'Check if worktree path already exists',
              'Check if branch name already exists',
              'Try a different feature name',
            ],
          };
        }
      }

      // Step 3: Detect project type
      const projectInfo = ProjectDetector.detect(worktreePath);

      // Step 3.5: Copy development environment files (if enabled)
      let copyFilesCount = 0;
      let copyFilesErrors = 0;

      if (config.copy_files_enabled && !reusingExisting) {
        const copyResult = await FileCopier.copyFiles(
          cwd,
          worktreePath,
          config.copy_file_patterns,
          config.exclude_file_patterns
        );

        copyFilesCount = copyResult.copied.length;
        copyFilesErrors = copyResult.errors.length;
      }

      // Step 4: Initialize submodules if present and configured
      let submoduleSuccess: boolean | undefined;
      let submoduleError: string | undefined;

      if (config.auto_init_submodules && !reusingExisting) {
        const hasSubmodules = GitHelpers.hasSubmodules(cwd);

        if (hasSubmodules) {
          // Note: We'll add this message to setupMessages below
          const submoduleResult = await GitHelpers.initSubmodules(worktreePath);
          // Store result to add to messages later
          submoduleSuccess = submoduleResult.success;
          submoduleError = submoduleResult.error;
        }
      }

      // Step 4: Run setup commands
      const setupMessages: string[] = reusingExisting
        ? [
            `♻️  Reusing existing clean worktree: ${worktreePath}`,
            `Branch: ${branchName}`,
            `Project type: ${projectInfo.type}`,
          ]
        : useExistingBranch
        ? [
            `Worktree created: ${worktreePath}`,
            `Branch: ${branchName} (checked out existing branch)`,
            `Project type: ${projectInfo.type}`,
          ]
        : [
            `Worktree created: ${worktreePath}`,
            `Branch: ${branchName} (from ${baseBranch})`,
            `Project type: ${projectInfo.type}`,
          ];

      let setupComplete = true;
      if (reusingExisting) {
        // Skip setup when reusing - already done
        setupMessages.push('Skipping setup (already configured)');
      } else if (config.auto_run_setup === false) {
        // Skip setup when auto_run_setup is disabled
        setupMessages.push('⚙️  Auto-setup disabled (set auto_run_setup: auto or prompt in config to enable)');
        if (projectInfo.setup_commands.length > 0) {
          setupMessages.push('💡 To set up manually, run:');
          for (const cmd of projectInfo.setup_commands) {
            setupMessages.push(`   cd ${cmd.directory} && ${cmd.command}`);
          }
        }
      } else if (config.auto_run_setup === 'prompt') {
        // Prompt mode - skip auto-setup, let command layer handle it with AskUserQuestion
        setupMessages.push('⚙️  Setup deferred to command layer (prompt mode)');
        if (projectInfo.setup_commands.length > 0) {
          setupMessages.push('💡 The /create command will ask which ecosystems to set up');
        }
      } else if (config.auto_run_setup === 'all') {
        // All mode - detect and run ALL ecosystems
        setupMessages.push('⚙️  Running setup for ALL detected ecosystems...');

        // Add file copying messages
        if (config.copy_files_enabled) {
          if (copyFilesCount > 0) {
            setupMessages.push(`📋 Copied ${copyFilesCount} environment file(s)`);
          }
          if (copyFilesErrors > 0) {
            setupMessages.push(`⚠️  ${copyFilesErrors} file(s) failed to copy`);
          }
        }

        // Add submodule initialization messages
        if (config.auto_init_submodules && GitHelpers.hasSubmodules(cwd)) {
          setupMessages.push('Detected git submodules, initializing...');
          if (typeof submoduleSuccess !== 'undefined' && submoduleSuccess) {
            setupMessages.push('✅ Git submodules initialized');
          } else if (typeof submoduleError !== 'undefined') {
            setupMessages.push(`⚠️  Submodule initialization failed: ${submoduleError}`);
            setupMessages.push('You may need to run: git submodule update --init --recursive');
          }
        }

        // Get ALL ecosystems, not just first detected
        const allEcosystems = ProjectDetector.detectAll(worktreePath);

        if (allEcosystems.length > 0) {
          setupMessages.push(`Installing ${allEcosystems.length} ecosystem(s)...`);

          const setupResult = await SetupRunner.runSetupCommands(allEcosystems);
          setupMessages.push(...setupResult.messages);

          if (!setupResult.success) {
            setupComplete = false;
            setupMessages.push(...setupResult.errors);
          }
        } else {
          setupMessages.push('No ecosystems detected');
        }
      } else if (config.auto_run_setup === 'auto') {
        // Add file copying messages if applicable
        if (config.copy_files_enabled) {
          if (copyFilesCount > 0) {
            setupMessages.push(`📋 Copied ${copyFilesCount} environment file(s)`);
          }
          if (copyFilesErrors > 0) {
            setupMessages.push(`⚠️  ${copyFilesErrors} file(s) failed to copy`);
          }
        }

        // Add submodule initialization messages if applicable
        if (config.auto_init_submodules && GitHelpers.hasSubmodules(cwd)) {
          setupMessages.push('Detected git submodules, initializing...');
          if (typeof submoduleSuccess !== 'undefined' && submoduleSuccess) {
            setupMessages.push('✅ Git submodules initialized');
          } else if (typeof submoduleError !== 'undefined') {
            setupMessages.push(`⚠️  Submodule initialization failed: ${submoduleError}`);
            setupMessages.push('You may need to run: git submodule update --init --recursive');
          }
        }

        if (projectInfo.setup_commands.length > 0) {
          setupMessages.push('Running setup commands...');

          const setupResult = await SetupRunner.runSetupCommands(projectInfo.setup_commands);
          setupMessages.push(...setupResult.messages);

          if (!setupResult.success) {
            setupComplete = false;
            setupMessages.push(...setupResult.errors);
          }
        } else {
          setupMessages.push('No setup commands needed');
        }
      }

      // Step 4.5: Add multi-ecosystem detection report if applicable
      if (!reusingExisting) {
        const detectedEcosystems = projectInfo.details?.detected_ecosystems || [];
        if (detectedEcosystems.length > 1) {
          setupMessages.push('');
          setupMessages.push('📦 Found multiple project types:');
          setupMessages.push(`   ✓ ${detectedEcosystems[0]} - installed`);

          const additionalEcosystems = detectedEcosystems.slice(1);
          for (const eco of additionalEcosystems) {
            setupMessages.push(`   • ${eco} - available`);
          }

          setupMessages.push('');
          setupMessages.push('💡 Need the other project types? Just run their install commands:');

          // Provide simple copy/paste commands based on detected ecosystems
          for (const eco of additionalEcosystems) {
            const cmd = this.getInstallCommandForEcosystem(eco);
            if (cmd) {
              setupMessages.push(`   ${cmd}`);
            }
          }

          setupMessages.push('');
          setupMessages.push('ℹ️  What does this mean? See: https://danielraffel.github.io/worktree-manager/#faq-multiple-languages');
        }
      }

      // Step 4.6: Create learnings file if configured (skip if reusing and file exists)
      if (config.create_learnings_file) {
        const learningsPath = path.join(worktreePath, 'LEARNINGS.md');
        if (reusingExisting && fs.existsSync(learningsPath)) {
          // Skip - already exists
        } else {
          const learningsContent = `# Learnings - ${params.feature_name}

## Overview
This file captures insights, decisions, and learnings during development.

## Key Decisions

## Challenges & Solutions

## What Worked Well

## What Could Be Improved

## Notes

---
*Created by worktree-manager on ${new Date().toISOString()}*
`;
          try {
            fs.writeFileSync(learningsPath, learningsContent);
            setupMessages.push(`Created LEARNINGS.md for capturing insights`);
          } catch (e) {
            setupMessages.push(`Warning: Could not create LEARNINGS.md`);
          }
        }
      }

      // Step 5: Return success with Chainer suggestion
      return this.buildSuccessResult({
        worktreePath,
        branchName,
        setupMessages,
        setupComplete,
      });
    } catch (error: any) {
      return {
        success: false,
        worktree_path: worktreePath,
        branch: branchName,
        setup_complete: false,
        setup_messages: [],
        error: error.message || 'Unknown error creating worktree',
        next_steps: ['Check error message above', 'Verify git and npm are installed'],
      };
    }
  }

  /**
   * Get install command for a detected ecosystem
   * Note: For Node.js, this returns npm by default, but the actual detection
   * logic in ProjectDetector will use the correct package manager based on lockfiles
   */
  private static getInstallCommandForEcosystem(ecosystem: string): string | null {
    const commandMap: { [key: string]: string } = {
      'Node.js (web)': 'cd web && npm install  # or pnpm/yarn/bun based on lockfile',
      'Node.js': 'npm install  # or pnpm/yarn/bun based on lockfile',
      'Python (uv)': 'uv sync',
      'Python (Conda)': 'conda env create -f environment.yml',
      'Python (Poetry)': 'poetry install',
      'Python (pipenv)': 'pipenv install',
      'Python (pip)': 'pip install -r requirements.txt',
      'Python': 'pip install -e .',
      'Ruby': 'bundle install',
      'Go': 'go mod download',
      'Rust': 'cargo fetch',
      'Java (Maven)': 'mvn dependency:resolve',
      'Java/Kotlin (Gradle)': './gradlew dependencies',
      'PHP (Composer)': 'composer install',
      'Elixir': 'mix deps.get',
      '.NET': 'dotnet restore',
      'Scala (sbt)': 'sbt update',
      'Flutter': 'flutter pub get',
      'Dart': 'dart pub get',
      'Swift': 'swift package resolve',
      'Deno': 'deno cache --reload',
      'C++ (CMake)': 'cmake -B build',
      'iOS': '# Open in Xcode (manual setup)',
    };

    return commandMap[ecosystem] || null;
  }

  /**
   * Build success result with Chainer detection and suggestions
   */
  private static buildSuccessResult(options: {
    worktreePath: string;
    branchName: string;
    setupMessages: string[];
    setupComplete: boolean;
  }): WorktreeStartResult {
    const { worktreePath, branchName, setupMessages, setupComplete } = options;

    // Check if Chainer is installed
    const homeDir = os.homedir();
    const chainerPaths = [
      path.join(homeDir, '.claude', 'plugins', 'chainer'),
      path.join(homeDir, 'Code', 'Chainer'),
    ];

    let chainerInstalled = false;
    for (const chainerPath of chainerPaths) {
      if (fs.existsSync(path.join(chainerPath, 'plugin', '.claude-plugin', 'plugin.json'))) {
        chainerInstalled = true;
        break;
      }
    }

    setupMessages.push('');

    const nextSteps: string[] = [];

    if (setupComplete) {
      nextSteps.push('✅ Worktree created successfully!');
      nextSteps.push(`📁 Path: ${worktreePath}`);
      nextSteps.push(`🌿 Branch: ${branchName}`);
      nextSteps.push('');

      if (chainerInstalled) {
        // Chainer detected - suggest using it for automated workflows
        nextSteps.push('🔗 Chainer detected! For automated development:');
        nextSteps.push('');
        nextSteps.push('  # Full workflow (plan + implement)');
        nextSteps.push(`  /chainer:run plan-and-implement \\`);
        nextSteps.push(`    --cwd="${worktreePath}" \\`);
        nextSteps.push(`    --prompt="Your feature idea" \\`);
        nextSteps.push(`    --feature_name="${path.basename(worktreePath)}"`);
        nextSteps.push('');
        nextSteps.push('  # Or just planning');
        nextSteps.push(`  /chainer:run plan-only --cwd="${worktreePath}" --prompt="Your idea"`);
        nextSteps.push('');
        nextSteps.push('  # Or manual development');
        nextSteps.push(`  cd ${worktreePath} && claude`);
      } else {
        // Chainer not installed - suggest manual workflow
        nextSteps.push('Next steps:');
        nextSteps.push(`  cd ${worktreePath}`);
        nextSteps.push('  claude');
        nextSteps.push('');
        nextSteps.push('💡 For automated workflows, install Chainer:');
        nextSteps.push('   /plugin install chainer@generous-corp-marketplace');
        nextSteps.push('');
        nextSteps.push('   Then use:');
        nextSteps.push('   /chainer:run plan-and-implement --prompt="Your idea" --feature_name="name"');
      }
    } else {
      nextSteps.push('⚠️ Worktree created but setup incomplete');
      nextSteps.push('');
      nextSteps.push('Fix setup issues:');
      nextSteps.push(`  cd ${worktreePath}`);
      nextSteps.push('  npm install  # or appropriate setup command');
    }

    return {
      success: true,
      worktree_path: worktreePath,
      branch: branchName,
      setup_complete: setupComplete,
      setup_messages: setupMessages,
      next_steps: nextSteps,
    };
  }
}
