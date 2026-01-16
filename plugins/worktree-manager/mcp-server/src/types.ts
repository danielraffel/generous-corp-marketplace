/**
 * Core types for worktree-manager plugin
 */

export type ExecutionMode = 'manual' | 'background' | 'interactive';
export type ProjectType = 'web' | 'ios' | 'full-stack' | 'unknown';

export interface WorktreeStartParams {
  /** Name of feature (becomes branch: feature/<name>) */
  feature_name: string;
  /** Branch to branch from (default: "main") */
  base_branch?: string;
  /** Description of what you're working on */
  task_description?: string;
  /** Custom worktree location (default: ~/worktrees/<feature_name>) */
  worktree_path?: string;
  /** Checkout existing branch instead of creating new one */
  existing_branch?: string;
}

export interface WorktreeInfo {
  /** Absolute path to worktree */
  path: string;
  /** Branch name */
  branch: string;
  /** Is this the main worktree? */
  is_main: boolean;
  /** Commit SHA */
  commit?: string;
  /** Is worktree locked? */
  locked?: boolean;
  /** Lock reason if locked */
  lock_reason?: string;
}

export interface WorktreeStartResult {
  /** Success status */
  success: boolean;
  /** Worktree path */
  worktree_path: string;
  /** Branch name */
  branch: string;
  /** Setup status */
  setup_complete: boolean;
  /** Setup messages */
  setup_messages: string[];
  /** Error message (if success = false) */
  error?: string;
  /** Next steps for user */
  next_steps: string[];
}

export interface ProjectDetectionResult {
  /** Type of project detected */
  type: ProjectType;
  /** Setup commands to run */
  setup_commands: SetupCommand[];
  /** Detection details */
  details: {
    detected_ecosystems?: string[];
    has_web: boolean;
    has_ios: boolean;
    has_root_package_json: boolean;
  };
}

export interface SetupCommand {
  /** Directory to run command in */
  directory: string;
  /** Command to execute */
  command: string;
  /** Description of what this does */
  description: string;
}

export interface GitHelpers {
  /** Create a new worktree */
  createWorktree(params: {
    path: string;
    branch: string;
    baseBranch: string;
  }): Promise<{ success: boolean; error?: string }>;

  /** List all worktrees */
  listWorktrees(): Promise<WorktreeInfo[]>;

  /** Remove a worktree */
  removeWorktree(path: string): Promise<{ success: boolean; error?: string }>;

  /** Check if path is a git repository */
  isGitRepo(path: string): Promise<boolean>;

  /** Get current branch name */
  getCurrentBranch(path: string): Promise<string | null>;
}

/**
 * Detected ecosystem information for user selection
 */
export interface DetectedEcosystem {
  /** Ecosystem name (e.g., "Node.js", "Rust") */
  name: string;
  /** Package manager or tool (e.g., "npm", "cargo") */
  package_manager: string;
  /** Full command to run (e.g., "npm install") */
  command: string;
  /** Human-readable description */
  description: string;
  /** Directory where command should run */
  directory: string;
}

/**
 * Parameters for ecosystem detection
 */
export interface WorktreeDetectParams {
  /** Path to worktree to scan */
  worktree_path: string;
}

/**
 * Result from ecosystem detection
 */
export interface WorktreeDetectResult {
  /** Success status */
  success: boolean;
  /** Detected ecosystems */
  ecosystems: DetectedEcosystem[];
  /** Number of ecosystems found */
  count: number;
  /** Error message if any */
  error?: string;
}

/**
 * Parameters for running setup
 */
export interface WorktreeSetupParams {
  /** Path to worktree */
  worktree_path: string;
  /** Ecosystem names to set up (from detect result) */
  ecosystem_names: string[];
}

/**
 * Result from running setup
 */
export interface WorktreeSetupResult {
  /** Success status */
  success: boolean;
  /** Ecosystems that ran successfully */
  ran: string[];
  /** Ecosystems that failed */
  failed: string[];
  /** Setup messages */
  messages: string[];
  /** Error message if any */
  error?: string;
}
