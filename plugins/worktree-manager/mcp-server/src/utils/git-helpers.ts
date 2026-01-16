import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { WorktreeInfo } from '../types';

const execAsync = promisify(exec);

/**
 * Git helper functions for worktree management
 */
export class GitHelpers {
  /**
   * Check if a directory is a git repository
   */
  static async isGitRepo(dirPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git rev-parse --is-inside-work-tree', {
        cwd: dirPath,
      });
      return stdout.trim() === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  static async getCurrentBranch(dirPath: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git branch --show-current', {
        cwd: dirPath,
      });
      return stdout.trim() || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a branch exists
   */
  static async branchExists(branchName: string, dirPath: string): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`git show-ref --verify refs/heads/${branchName}`, {
        cwd: dirPath,
      });
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a new git worktree
   */
  static async createWorktree(params: {
    path: string;
    branch: string;
    baseBranch: string;
    cwd?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const workingDir = params.cwd || process.cwd();

      // Check if worktree path already exists
      if (fs.existsSync(params.path)) {
        return {
          success: false,
          error: `Worktree path already exists: ${params.path}`,
        };
      }

      // Check if branch already exists
      const branchExists = await this.branchExists(params.branch, workingDir);
      if (branchExists) {
        return {
          success: false,
          error: `Branch already exists: ${params.branch}. Use a different feature name or delete the existing branch.`,
        };
      }

      // Create worktree with new branch
      const command = `git worktree add -b ${params.branch} "${params.path}" ${params.baseBranch}`;
      await execAsync(command, { cwd: workingDir });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error creating worktree',
      };
    }
  }

  /**
   * List all git worktrees
   */
  static async listWorktrees(cwd?: string): Promise<WorktreeInfo[]> {
    try {
      const workingDir = cwd || process.cwd();
      const { stdout } = await execAsync('git worktree list --porcelain', {
        cwd: workingDir,
      });

      const worktrees: WorktreeInfo[] = [];
      const lines = stdout.split('\n');
      let current: Partial<WorktreeInfo> = {};

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          current.path = line.substring('worktree '.length);
        } else if (line.startsWith('branch ')) {
          current.branch = line.substring('branch refs/heads/'.length);
        } else if (line.startsWith('HEAD ')) {
          current.commit = line.substring('HEAD '.length);
        } else if (line.startsWith('bare')) {
          current.is_main = false;
        } else if (line.startsWith('locked')) {
          current.locked = true;
          // Extract reason if present (format: "locked <reason>")
          const reasonMatch = line.match(/^locked (.+)$/);
          if (reasonMatch) {
            current.lock_reason = reasonMatch[1];
          }
        } else if (line === '') {
          // End of worktree entry
          if (current.path) {
            worktrees.push({
              path: current.path,
              branch: current.branch || 'unknown',
              is_main: current.is_main !== false,
              commit: current.commit,
              locked: current.locked || false,
              lock_reason: current.lock_reason,
            });
          }
          current = {};
        }
      }

      return worktrees;
    } catch (error) {
      return [];
    }
  }

  /**
   * Remove a git worktree
   */
  static async removeWorktree(
    worktreePath: string,
    cwd?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const workingDir = cwd || process.cwd();
      await execAsync(`git worktree remove "${worktreePath}"`, { cwd: workingDir });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error removing worktree',
      };
    }
  }

  /**
   * Get git status for a worktree
   */
  static async getStatus(dirPath: string): Promise<{
    uncommitted_changes: number;
    untracked_files: number;
    ahead: number;
    behind: number;
  }> {
    try {
      // Get short status
      const { stdout: statusOut } = await execAsync('git status --short', { cwd: dirPath });
      const statusLines = statusOut.split('\n').filter((l) => l.trim().length > 0);

      const uncommitted = statusLines.filter((l) => l.startsWith(' M') || l.startsWith('M ')).length;
      const untracked = statusLines.filter((l) => l.startsWith('??')).length;

      // Get ahead/behind
      const { stdout: aheadBehindOut } = await execAsync(
        'git rev-list --left-right --count @{upstream}...HEAD',
        { cwd: dirPath }
      );
      const [behind, ahead] = aheadBehindOut.trim().split('\t').map(Number);

      return {
        uncommitted_changes: uncommitted,
        untracked_files: untracked,
        ahead: ahead || 0,
        behind: behind || 0,
      };
    } catch (error) {
      return {
        uncommitted_changes: 0,
        untracked_files: 0,
        ahead: 0,
        behind: 0,
      };
    }
  }

  /**
   * Check if a repository has git submodules
   */
  static hasSubmodules(dirPath: string): boolean {
    try {
      const gitmodulesPath = path.join(dirPath, '.gitmodules');
      return fs.existsSync(gitmodulesPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Initialize git submodules recursively
   */
  static async initSubmodules(dirPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync('git submodule update --init --recursive', {
        cwd: dirPath,
        timeout: 10 * 60 * 1000, // 10 minutes
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error initializing submodules',
      };
    }
  }

  /**
   * Move worktree to new location
   */
  static async moveWorktree(
    currentPath: string,
    newPath: string,
    cwd?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const workingDir = cwd || process.cwd();

      // Check if current path exists
      if (!fs.existsSync(currentPath)) {
        return {
          success: false,
          error: `Current worktree path does not exist: ${currentPath}`,
        };
      }

      // Check if new path already exists
      if (fs.existsSync(newPath)) {
        return {
          success: false,
          error: `Destination path already exists: ${newPath}`,
        };
      }

      await execAsync(`git worktree move "${currentPath}" "${newPath}"`, { cwd: workingDir });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error moving worktree',
      };
    }
  }

  /**
   * Lock worktree to prevent accidental removal
   */
  static async lockWorktree(
    worktreePath: string,
    reason?: string,
    cwd?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const workingDir = cwd || process.cwd();
      const reasonArg = reason ? ` --reason "${reason}"` : '';
      await execAsync(`git worktree lock "${worktreePath}"${reasonArg}`, { cwd: workingDir });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error locking worktree',
      };
    }
  }

  /**
   * Unlock worktree
   */
  static async unlockWorktree(
    worktreePath: string,
    cwd?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const workingDir = cwd || process.cwd();
      await execAsync(`git worktree unlock "${worktreePath}"`, { cwd: workingDir });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error unlocking worktree',
      };
    }
  }

  /**
   * Repair broken worktree
   */
  static async repairWorktree(
    worktreePath: string,
    cwd?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const workingDir = cwd || process.cwd();
      await execAsync(`git worktree repair "${worktreePath}"`, { cwd: workingDir });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error repairing worktree',
      };
    }
  }

  /**
   * Prune orphaned worktree references
   */
  static async pruneWorktrees(cwd?: string): Promise<{
    pruned: string[];
    errors: string[];
  }> {
    try {
      const workingDir = cwd || process.cwd();

      // Get list of worktrees before pruning to detect orphans
      const beforeWorktrees = await this.listWorktrees(workingDir);

      // Run prune with verbose output
      const { stdout, stderr } = await execAsync('git worktree prune --verbose', {
        cwd: workingDir,
      });

      // Parse pruned worktrees from output
      const pruned: string[] = [];
      const lines = stdout.split('\n').concat(stderr.split('\n'));
      for (const line of lines) {
        if (line.includes('Removing worktrees/')) {
          const match = line.match(/Removing (.+):/);
          if (match) {
            pruned.push(match[1]);
          }
        }
      }

      return { pruned, errors: [] };
    } catch (error: any) {
      return {
        pruned: [],
        errors: [error.message || 'Unknown error pruning worktrees'],
      };
    }
  }

  /**
   * Check if worktree is locked
   */
  static async isWorktreeLocked(worktreePath: string, cwd?: string): Promise<{
    locked: boolean;
    reason?: string;
  }> {
    try {
      const workingDir = cwd || process.cwd();
      const { stdout } = await execAsync('git worktree list --porcelain', {
        cwd: workingDir,
      });

      let currentPath = '';
      let isLocked = false;
      let lockReason = '';

      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          currentPath = line.substring('worktree '.length);
        } else if (line.startsWith('locked')) {
          if (currentPath === worktreePath) {
            isLocked = true;
            // Extract reason if present (format: "locked <reason>")
            const reasonMatch = line.match(/^locked (.+)$/);
            if (reasonMatch) {
              lockReason = reasonMatch[1];
            }
          }
        } else if (line === '') {
          // Reset for next worktree
          if (currentPath === worktreePath) {
            break;
          }
          currentPath = '';
          isLocked = false;
          lockReason = '';
        }
      }

      return {
        locked: isLocked,
        reason: lockReason || undefined,
      };
    } catch (error) {
      return { locked: false };
    }
  }

  /**
   * Rename branch in a worktree
   */
  static async renameBranch(
    worktreePath: string,
    oldName: string,
    newName: string,
    cwd?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const workingDir = cwd || worktreePath;

      // Check if old branch exists
      const oldExists = await this.branchExists(oldName, workingDir);
      if (!oldExists) {
        return {
          success: false,
          error: `Branch does not exist: ${oldName}`,
        };
      }

      // Check if new branch already exists
      const newExists = await this.branchExists(newName, workingDir);
      if (newExists) {
        return {
          success: false,
          error: `Branch already exists: ${newName}`,
        };
      }

      // Rename branch
      await execAsync(`git branch -m ${oldName} ${newName}`, { cwd: worktreePath });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error renaming branch',
      };
    }
  }

  /**
   * Delete a branch (local and optionally remote)
   */
  static async deleteBranch(
    branchName: string,
    options: {
      force?: boolean;
      deleteRemote?: boolean;
      remoteName?: string;
    } = {},
    cwd?: string
  ): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
    try {
      const workingDir = cwd || process.cwd();
      const { force = false, deleteRemote = false, remoteName = 'origin' } = options;
      const warnings: string[] = [];

      // Check if branch exists
      const exists = await this.branchExists(branchName, workingDir);
      if (!exists) {
        return {
          success: false,
          error: `Branch does not exist: ${branchName}`,
        };
      }

      // Delete local branch
      const deleteFlag = force ? '-D' : '-d';
      try {
        await execAsync(`git branch ${deleteFlag} ${branchName}`, { cwd: workingDir });
      } catch (error: any) {
        if (error.message.includes('not fully merged')) {
          return {
            success: false,
            error: `Branch '${branchName}' is not fully merged. Use force option to delete anyway.`,
          };
        }
        throw error;
      }

      // Delete remote branch if requested
      if (deleteRemote) {
        try {
          await execAsync(`git push ${remoteName} --delete ${branchName}`, {
            cwd: workingDir,
          });
        } catch (error: any) {
          warnings.push(`Failed to delete remote branch: ${error.message}`);
        }
      }

      return {
        success: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error deleting branch',
      };
    }
  }

  /**
   * Get list of all branches (local and remote)
   */
  static async getAllBranches(cwd?: string): Promise<{
    local: string[];
    remote: string[];
  }> {
    try {
      const workingDir = cwd || process.cwd();

      // Get local branches
      const { stdout: localOutput } = await execAsync('git branch --format="%(refname:short)"', {
        cwd: workingDir,
      });
      const local = localOutput
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

      // Get remote branches
      const { stdout: remoteOutput } = await execAsync(
        'git branch -r --format="%(refname:short)"',
        { cwd: workingDir }
      );
      const remote = remoteOutput
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b.length > 0 && !b.includes('HEAD'));

      return { local, remote };
    } catch (error) {
      return { local: [], remote: [] };
    }
  }

  /**
   * Create worktree from existing branch (checkout instead of create)
   */
  static async createWorktreeFromExisting(params: {
    path: string;
    branch: string;
    cwd?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const workingDir = params.cwd || process.cwd();

      // Check if worktree path already exists
      if (fs.existsSync(params.path)) {
        return {
          success: false,
          error: `Worktree path already exists: ${params.path}`,
        };
      }

      // Check if branch exists
      const branchExists = await this.branchExists(params.branch, workingDir);
      if (!branchExists) {
        return {
          success: false,
          error: `Branch does not exist: ${params.branch}`,
        };
      }

      // Create worktree from existing branch (no -b flag, just checkout)
      const command = `git worktree add "${params.path}" ${params.branch}`;
      await execAsync(command, { cwd: workingDir });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error creating worktree from existing branch',
      };
    }
  }
}
