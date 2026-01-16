import { GitHelpers } from '../utils/git-helpers';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

export interface WorktreeCleanupParams {
  worktree_path: string;
  /** Auto-merge to base branch before removing (default: false) */
  auto_merge?: boolean;
  /** Target branch to merge into (default: 'main') */
  target_branch?: string;
  /** Force remove even if there are uncommitted changes (default: false) */
  force?: boolean;
  /** Delete the feature branch after merging (default: true) */
  delete_branch?: boolean;
}

export interface WorktreeCleanupResult {
  success: boolean;
  worktree_path: string;
  branch?: string;
  merged?: boolean;
  removed?: boolean;
  branch_deleted?: boolean;
  messages: string[];
  error?: string;
  next_steps?: string[];
}

/**
 * Clean up worktree: merge and remove
 */
export class WorktreeCleanupTool {
  /**
   * Merge and/or remove a worktree
   */
  static async execute(params: WorktreeCleanupParams): Promise<WorktreeCleanupResult> {
    const {
      worktree_path,
      auto_merge = false,
      target_branch = 'main',
      force = false,
      delete_branch = true,
    } = params;

    const messages: string[] = [];

    try {
      // Check if worktree exists
      if (!fs.existsSync(worktree_path)) {
        return {
          success: false,
          worktree_path,
          messages: [`Worktree does not exist: ${worktree_path}`],
          error: 'Worktree not found',
        };
      }

      // Get current branch
      const branch = await GitHelpers.getCurrentBranch(worktree_path);
      if (!branch) {
        return {
          success: false,
          worktree_path,
          messages: ['Could not determine current branch'],
          error: 'Failed to get branch name',
        };
      }

      messages.push(`Worktree: ${worktree_path}`);
      messages.push(`Branch: ${branch}`);

      // Check for uncommitted changes
      const status = await GitHelpers.getStatus(worktree_path);
      const hasChanges = status.uncommitted_changes > 0 || status.untracked_files > 0;

      if (hasChanges && !force) {
        return {
          success: false,
          worktree_path,
          branch,
          messages: [
            ...messages,
            '',
            '❌ Worktree has uncommitted changes:',
            `   - Uncommitted: ${status.uncommitted_changes}`,
            `   - Untracked: ${status.untracked_files}`,
            '',
            'Options:',
            '1. Commit or stash changes first',
            '2. Use force: true to remove anyway (LOSES CHANGES)',
          ],
          error: 'Uncommitted changes prevent cleanup',
          next_steps: [
            `cd ${worktree_path}`,
            'git status',
            'git add . && git commit -m "message" (or git stash)',
          ],
        };
      }

      let merged = false;
      let removed = false;
      let branchDeleted = false;

      // Auto-merge if requested
      if (auto_merge) {
        messages.push('');
        messages.push(`Merging ${branch} into ${target_branch}...`);

        try {
          // Switch to target branch in main worktree
          const cwd = process.cwd();
          await execAsync(`git checkout ${target_branch}`, { cwd });

          // Merge feature branch
          await execAsync(`git merge ${branch} --no-edit`, { cwd });

          messages.push(`✅ Merged ${branch} into ${target_branch}`);
          merged = true;
        } catch (error: any) {
          return {
            success: false,
            worktree_path,
            branch,
            merged: false,
            messages: [
              ...messages,
              `❌ Merge failed: ${error.message}`,
              '',
              'Possible issues:',
              '- Merge conflicts',
              '- Not all changes pushed to remote',
              '- Target branch does not exist',
            ],
            error: `Merge failed: ${error.message}`,
            next_steps: [
              'Resolve conflicts manually:',
              `  git checkout ${target_branch}`,
              `  git merge ${branch}`,
              '  (resolve conflicts)',
              '  git commit',
            ],
          };
        }
      }

      // Remove worktree
      messages.push('');
      messages.push('Removing worktree...');

      const removeResult = await GitHelpers.removeWorktree(worktree_path);
      if (!removeResult.success) {
        return {
          success: false,
          worktree_path,
          branch,
          merged,
          messages: [...messages, `❌ Failed to remove worktree: ${removeResult.error}`],
          error: removeResult.error,
        };
      }

      messages.push(`✅ Worktree removed: ${worktree_path}`);
      removed = true;

      // Delete branch if requested and merged
      if (delete_branch && merged) {
        messages.push('');
        messages.push(`Deleting branch ${branch}...`);

        try {
          const cwd = process.cwd();
          await execAsync(`git branch -d ${branch}`, { cwd });
          messages.push(`✅ Branch deleted: ${branch}`);
          branchDeleted = true;
        } catch (error: any) {
          messages.push(`⚠️  Failed to delete branch: ${error.message}`);
          messages.push('(Branch may still have unmerged commits)');
        }
      }

      const nextSteps: string[] = [];
      if (merged) {
        nextSteps.push(`Changes from ${branch} are now in ${target_branch}`);
        nextSteps.push(`Push to remote: git push origin ${target_branch}`);
      } else {
        nextSteps.push('Worktree removed but changes NOT merged');
        nextSteps.push(`Feature branch ${branch} still exists`);
        nextSteps.push('Merge manually if needed:');
        nextSteps.push(`  git checkout ${target_branch}`);
        nextSteps.push(`  git merge ${branch}`);
      }

      return {
        success: true,
        worktree_path,
        branch,
        merged,
        removed,
        branch_deleted: branchDeleted,
        messages,
        next_steps: nextSteps,
      };
    } catch (error: any) {
      return {
        success: false,
        worktree_path,
        messages: [...messages, `❌ Cleanup failed: ${error.message}`],
        error: error.message || 'Unknown error during cleanup',
      };
    }
  }
}
