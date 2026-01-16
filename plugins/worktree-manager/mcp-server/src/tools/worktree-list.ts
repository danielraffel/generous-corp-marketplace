import { GitHelpers } from '../utils/git-helpers';

export interface WorktreeListResult {
  success: boolean;
  worktrees: Array<{
    path: string;
    branch: string;
    is_main: boolean;
    commit?: string;
    status?: {
      uncommitted_changes: number;
      untracked_files: number;
      ahead: number;
      behind: number;
    };
  }>;
  error?: string;
}

/**
 * List all git worktrees with optional status information
 */
export class WorktreeListTool {
  /**
   * List all worktrees, optionally with status
   */
  static async execute(params?: { include_status?: boolean }): Promise<WorktreeListResult> {
    try {
      const includeStatus = params?.include_status || false;
      const cwd = process.cwd();

      // Get all worktrees
      const worktrees = await GitHelpers.listWorktrees(cwd);

      // Optionally fetch status for each worktree
      const enrichedWorktrees = await Promise.all(
        worktrees.map(async (worktree) => {
          if (includeStatus) {
            try {
              const status = await GitHelpers.getStatus(worktree.path);
              return { ...worktree, status };
            } catch (error) {
              // If status fails, return without it
              return worktree;
            }
          }
          return worktree;
        })
      );

      return {
        success: true,
        worktrees: enrichedWorktrees,
      };
    } catch (error: any) {
      return {
        success: false,
        worktrees: [],
        error: error.message || 'Failed to list worktrees',
      };
    }
  }
}
