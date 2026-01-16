import { GitHelpers } from '../utils/git-helpers';

export interface WorktreeDeleteBranchParams {
  /** Branch name to delete */
  branch_name: string;
  /** Force delete even if not fully merged (default: false) */
  force?: boolean;
  /** Also delete from remote repository (default: false) */
  delete_remote?: boolean;
  /** Remote name (default: origin) */
  remote_name?: string;
}

export interface WorktreeDeleteBranchResult {
  success: boolean;
  branch_name: string;
  deleted_local: boolean;
  deleted_remote?: boolean;
  messages: string[];
  warnings?: string[];
  error?: string;
}

/**
 * Delete a git branch (local and optionally remote)
 */
export class WorktreeDeleteBranchTool {
  /**
   * Delete a branch with safety checks
   */
  static async execute(params: WorktreeDeleteBranchParams): Promise<WorktreeDeleteBranchResult> {
    const {
      branch_name,
      force = false,
      delete_remote = false,
      remote_name = 'origin',
    } = params;
    const messages: string[] = [];

    try {
      messages.push(`Deleting branch: ${branch_name}`);
      if (force) {
        messages.push('⚠️  Force mode enabled - bypassing merge checks');
      }
      if (delete_remote) {
        messages.push(`Will also delete from remote: ${remote_name}`);
      }
      messages.push('');

      const result = await GitHelpers.deleteBranch(
        branch_name,
        { force, deleteRemote: delete_remote, remoteName: remote_name }
      );

      if (!result.success) {
        return {
          success: false,
          branch_name,
          deleted_local: false,
          messages: [
            ...messages,
            `❌ Failed to delete branch: ${result.error}`,
            '',
            'Common issues:',
            '- Branch does not exist',
            '- Branch not fully merged (use --force to override)',
            '- Currently checked out on this branch',
            '- Remote deletion failed (check network/permissions)',
          ],
          error: result.error,
        };
      }

      messages.push('✅ Local branch deleted successfully');

      const deletedRemote = delete_remote && (!result.warnings || result.warnings.length === 0);

      if (delete_remote) {
        if (deletedRemote) {
          messages.push(`✅ Remote branch deleted from ${remote_name}`);
        } else {
          messages.push(`⚠️  Local deleted but remote deletion failed`);
        }
      }

      if (result.warnings && result.warnings.length > 0) {
        messages.push('');
        messages.push('Warnings:');
        result.warnings.forEach((w) => messages.push(`  - ${w}`));
      }

      return {
        success: true,
        branch_name,
        deleted_local: true,
        deleted_remote: deletedRemote,
        messages,
        warnings: result.warnings,
      };
    } catch (error: any) {
      return {
        success: false,
        branch_name,
        deleted_local: false,
        messages: [...messages, `❌ Delete failed: ${error.message}`],
        error: error.message || 'Unknown error deleting branch',
      };
    }
  }
}
