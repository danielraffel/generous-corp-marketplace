import { GitHelpers } from '../utils/git-helpers';

export interface WorktreePruneParams {
  // No required parameters - operates on all orphaned worktrees
}

export interface WorktreePruneResult {
  success: boolean;
  pruned: string[];
  errors: string[];
  messages: string[];
}

/**
 * Prune orphaned worktree administrative files
 */
export class WorktreePruneTool {
  /**
   * Prune orphaned worktree references
   */
  static async execute(params: WorktreePruneParams = {}): Promise<WorktreePruneResult> {
    const messages: string[] = [];

    try {
      messages.push('Scanning for orphaned worktree references...');
      messages.push('');

      const result = await GitHelpers.pruneWorktrees();

      if (result.errors.length > 0) {
        return {
          success: false,
          pruned: result.pruned,
          errors: result.errors,
          messages: [
            ...messages,
            `❌ Prune completed with errors:`,
            ...result.errors.map((e) => `   - ${e}`),
          ],
        };
      }

      if (result.pruned.length === 0) {
        messages.push('✅ No orphaned worktrees found');
        messages.push('');
        messages.push('All worktree references are valid.');
      } else {
        messages.push(`✅ Pruned ${result.pruned.length} orphaned worktree(s):`);
        messages.push('');
        result.pruned.forEach((path) => {
          messages.push(`   - ${path}`);
        });
        messages.push('');
        messages.push('These worktree directories were manually deleted but still');
        messages.push('had git references. Those references have been cleaned up.');
      }

      return {
        success: true,
        pruned: result.pruned,
        errors: result.errors,
        messages,
      };
    } catch (error: any) {
      return {
        success: false,
        pruned: [],
        errors: [error.message || 'Unknown error pruning worktrees'],
        messages: [...messages, `❌ Prune failed: ${error.message}`],
      };
    }
  }
}
