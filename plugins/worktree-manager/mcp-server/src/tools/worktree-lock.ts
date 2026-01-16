import { GitHelpers } from '../utils/git-helpers';

export interface WorktreeLockParams {
  /** Worktree path to lock */
  worktree_path: string;
  /** Optional reason for locking */
  reason?: string;
}

export interface WorktreeLockResult {
  success: boolean;
  worktree_path: string;
  locked: boolean;
  reason?: string;
  messages: string[];
  error?: string;
}

/**
 * Lock worktree to prevent accidental removal
 */
export class WorktreeLockTool {
  /**
   * Lock a worktree
   */
  static async execute(params: WorktreeLockParams): Promise<WorktreeLockResult> {
    const { worktree_path, reason } = params;
    const messages: string[] = [];

    try {
      messages.push(`Locking worktree: ${worktree_path}`);
      if (reason) {
        messages.push(`Reason: ${reason}`);
      }
      messages.push('');

      const result = await GitHelpers.lockWorktree(worktree_path, reason);

      if (!result.success) {
        return {
          success: false,
          worktree_path,
          locked: false,
          messages: [
            ...messages,
            `❌ Failed to lock worktree: ${result.error}`,
            '',
            'Common issues:',
            '- Worktree does not exist',
            '- Worktree is already locked',
            '- Insufficient permissions',
          ],
          error: result.error,
        };
      }

      messages.push('✅ Worktree locked successfully');
      messages.push('');
      messages.push('This worktree cannot be removed until unlocked.');
      messages.push('Use /worktree-manager:unlock to unlock it.');

      return {
        success: true,
        worktree_path,
        locked: true,
        reason,
        messages,
      };
    } catch (error: any) {
      return {
        success: false,
        worktree_path,
        locked: false,
        messages: [...messages, `❌ Lock failed: ${error.message}`],
        error: error.message || 'Unknown error locking worktree',
      };
    }
  }
}
