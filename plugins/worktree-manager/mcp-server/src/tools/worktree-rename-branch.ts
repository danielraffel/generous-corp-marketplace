import { GitHelpers } from '../utils/git-helpers';

export interface WorktreeRenameBranchParams {
  /** Worktree path where branch exists */
  worktree_path: string;
  /** Current branch name */
  old_name: string;
  /** New branch name */
  new_name: string;
}

export interface WorktreeRenameBranchResult {
  success: boolean;
  worktree_path: string;
  old_name: string;
  new_name: string;
  messages: string[];
  error?: string;
}

/**
 * Rename branch in a worktree
 */
export class WorktreeRenameBranchTool {
  /**
   * Rename a branch within a worktree
   */
  static async execute(params: WorktreeRenameBranchParams): Promise<WorktreeRenameBranchResult> {
    const { worktree_path, old_name, new_name } = params;
    const messages: string[] = [];

    try {
      messages.push(`Renaming branch in worktree: ${worktree_path}`);
      messages.push(`From: ${old_name}`);
      messages.push(`To:   ${new_name}`);
      messages.push('');

      const result = await GitHelpers.renameBranch(worktree_path, old_name, new_name);

      if (!result.success) {
        return {
          success: false,
          worktree_path,
          old_name,
          new_name,
          messages: [
            ...messages,
            `❌ Failed to rename branch: ${result.error}`,
            '',
            'Common issues:',
            '- Old branch name does not exist',
            '- New branch name already exists',
            '- Not currently on the branch being renamed',
          ],
          error: result.error,
        };
      }

      messages.push('✅ Branch renamed successfully');
      messages.push('');
      messages.push('Git references have been updated automatically.');

      return {
        success: true,
        worktree_path,
        old_name,
        new_name,
        messages,
      };
    } catch (error: any) {
      return {
        success: false,
        worktree_path,
        old_name,
        new_name,
        messages: [...messages, `❌ Rename failed: ${error.message}`],
        error: error.message || 'Unknown error renaming branch',
      };
    }
  }
}
