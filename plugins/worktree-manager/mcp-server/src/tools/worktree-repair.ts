import { GitHelpers } from '../utils/git-helpers';

export interface WorktreeRepairParams {
  /** Worktree path to repair */
  worktree_path: string;
}

export interface WorktreeRepairResult {
  success: boolean;
  worktree_path: string;
  repaired: boolean;
  messages: string[];
  error?: string;
}

/**
 * Repair broken worktree administrative files
 */
export class WorktreeRepairTool {
  /**
   * Repair a worktree
   */
  static async execute(params: WorktreeRepairParams): Promise<WorktreeRepairResult> {
    const { worktree_path } = params;
    const messages: string[] = [];

    try {
      messages.push(`Repairing worktree: ${worktree_path}`);
      messages.push('');
      messages.push('Checking and repairing git administrative files...');
      messages.push('');

      const result = await GitHelpers.repairWorktree(worktree_path);

      if (!result.success) {
        return {
          success: false,
          worktree_path,
          repaired: false,
          messages: [
            ...messages,
            `❌ Failed to repair worktree: ${result.error}`,
            '',
            'Common issues:',
            '- Worktree does not exist',
            '- Worktree is not broken (already functional)',
            '- Insufficient permissions to modify .git files',
          ],
          error: result.error,
        };
      }

      messages.push('✅ Worktree repaired successfully');
      messages.push('');
      messages.push('Administrative files have been updated.');
      messages.push('The worktree should now be functional.');

      return {
        success: true,
        worktree_path,
        repaired: true,
        messages,
      };
    } catch (error: any) {
      return {
        success: false,
        worktree_path,
        repaired: false,
        messages: [...messages, `❌ Repair failed: ${error.message}`],
        error: error.message || 'Unknown error repairing worktree',
      };
    }
  }
}
