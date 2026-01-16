import { GitHelpers } from '../utils/git-helpers';
import * as fs from 'fs';

export interface WorktreeStatusResult {
  success: boolean;
  worktree_path?: string;
  branch?: string;
  is_main?: boolean;
  exists?: boolean;
  status?: {
    uncommitted_changes: number;
    untracked_files: number;
    ahead: number;
    behind: number;
  };
  error?: string;
  summary?: string[];
}

/**
 * Get detailed status of a specific worktree
 */
export class WorktreeStatusTool {
  /**
   * Get status for a specific worktree path
   */
  static async execute(params: {
    worktree_path: string;
  }): Promise<WorktreeStatusResult> {
    try {
      const { worktree_path } = params;

      // Check if worktree exists
      if (!fs.existsSync(worktree_path)) {
        return {
          success: false,
          worktree_path,
          exists: false,
          error: `Worktree does not exist: ${worktree_path}`,
        };
      }

      // Verify it's a git worktree
      const isGit = await GitHelpers.isGitRepo(worktree_path);
      if (!isGit) {
        return {
          success: false,
          worktree_path,
          exists: true,
          error: `Path exists but is not a git repository: ${worktree_path}`,
        };
      }

      // Get current branch
      const branch = await GitHelpers.getCurrentBranch(worktree_path);

      // Determine if this is the main worktree
      const allWorktrees = await GitHelpers.listWorktrees(worktree_path);
      const mainWorktree = allWorktrees.find((w) => w.is_main);
      const isMain = mainWorktree?.path === worktree_path;

      // Get status
      const status = await GitHelpers.getStatus(worktree_path);

      // Build summary
      const summary: string[] = [
        `Worktree: ${worktree_path}`,
        `Branch: ${branch || 'unknown'}`,
        '',
        'Status:',
        `  Uncommitted changes: ${status.uncommitted_changes}`,
        `  Untracked files: ${status.untracked_files}`,
        `  Commits ahead of remote: ${status.ahead}`,
        `  Commits behind remote: ${status.behind}`,
      ];

      // Add warnings if needed
      if (status.uncommitted_changes > 0 || status.untracked_files > 0) {
        summary.push('');
        summary.push('⚠️  Worktree has uncommitted changes');
      }
      if (status.behind > 0) {
        summary.push('⚠️  Worktree is behind remote');
      }

      if (status.uncommitted_changes === 0 && status.untracked_files === 0) {
        summary.push('');
        summary.push('✅ Worktree is clean');
      }

      return {
        success: true,
        worktree_path,
        branch: branch || undefined,
        is_main: isMain,
        exists: true,
        status,
        summary,
      };
    } catch (error: any) {
      return {
        success: false,
        worktree_path: params.worktree_path,
        error: error.message || 'Failed to get worktree status',
      };
    }
  }
}
