import { GitHelpers } from '../utils/git-helpers';

export interface WorktreeMoveParams {
  /** Current worktree path */
  current_path: string;
  /** New worktree path */
  new_path: string;
}

export interface WorktreeMoveResult {
  success: boolean;
  current_path: string;
  new_path: string;
  messages: string[];
  error?: string;
}

/**
 * Move worktree to new filesystem location
 */
export class WorktreeMoveTool {
  /**
   * Move a worktree to a new location
   */
  static async execute(params: WorktreeMoveParams): Promise<WorktreeMoveResult> {
    const { current_path, new_path } = params;
    const messages: string[] = [];

    try {
      messages.push(`Moving worktree...`);
      messages.push(`From: ${current_path}`);
      messages.push(`To:   ${new_path}`);
      messages.push('');

      const result = await GitHelpers.moveWorktree(current_path, new_path);

      if (!result.success) {
        return {
          success: false,
          current_path,
          new_path,
          messages: [
            ...messages,
            `❌ Failed to move worktree: ${result.error}`,
            '',
            'Common issues:',
            '- Current path does not exist',
            '- Destination path already exists',
            '- Insufficient permissions',
          ],
          error: result.error,
        };
      }

      messages.push('✅ Worktree moved successfully');
      messages.push('');
      messages.push('Git references have been updated automatically.');

      return {
        success: true,
        current_path,
        new_path,
        messages,
      };
    } catch (error: any) {
      return {
        success: false,
        current_path,
        new_path,
        messages: [...messages, `❌ Move failed: ${error.message}`],
        error: error.message || 'Unknown error moving worktree',
      };
    }
  }
}
