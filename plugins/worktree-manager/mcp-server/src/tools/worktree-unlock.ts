import { GitHelpers } from '../utils/git-helpers';

export interface WorktreeUnlockParams {
  /** Worktree path to unlock */
  worktree_path: string;
}

export interface WorktreeUnlockResult {
  success: boolean;
  worktree_path: string;
  unlocked: boolean;
  messages: string[];
  error?: string;
}

/**
 * Unlock worktree to allow removal
 */
export class WorktreeUnlockTool {
  /**
   * Unlock a worktree
   */
  static async execute(params: WorktreeUnlockParams): Promise<WorktreeUnlockResult> {
    const { worktree_path } = params;
    const messages: string[] = [];

    try {
      messages.push(`Unlocking worktree: ${worktree_path}`);
      messages.push('');

      const result = await GitHelpers.unlockWorktree(worktree_path);

      if (!result.success) {
        return {
          success: false,
          worktree_path,
          unlocked: false,
          messages: [
            ...messages,
            `❌ Failed to unlock worktree: ${result.error}`,
            '',
            'Common issues:',
            '- Worktree does not exist',
            '- Worktree is not locked',
            '- Insufficient permissions',
          ],
          error: result.error,
        };
      }

      messages.push('✅ Worktree unlocked successfully');
      messages.push('');
      messages.push('This worktree can now be removed with /worktree-manager:cleanup');

      return {
        success: true,
        worktree_path,
        unlocked: true,
        messages,
      };
    } catch (error: any) {
      return {
        success: false,
        worktree_path,
        unlocked: false,
        messages: [...messages, `❌ Unlock failed: ${error.message}`],
        error: error.message || 'Unknown error unlocking worktree',
      };
    }
  }
}
