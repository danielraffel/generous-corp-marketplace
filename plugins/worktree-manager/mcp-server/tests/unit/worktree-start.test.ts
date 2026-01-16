import { WorktreeStartTool } from '../../src/tools/worktree-start';
import { GitHelpers } from '../../src/utils/git-helpers';
import { ProjectDetector } from '../../src/utils/project-detector';
import { SetupRunner } from '../../src/utils/setup-runner';
import { ConfigReader } from '../../src/utils/config-reader';
import * as os from 'os';
import * as path from 'path';

jest.mock('../../src/utils/git-helpers');
jest.mock('../../src/utils/project-detector');
jest.mock('../../src/utils/setup-runner');
jest.mock('../../src/utils/config-reader');

describe('WorktreeStartTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ConfigReader to return 'auto' mode for backward-compatible tests
    (ConfigReader.getConfig as jest.Mock).mockReturnValue({
      worktree_base_path: path.join(os.homedir(), 'worktrees'),
      branch_prefix: 'feature/',
      auto_commit: false,
      auto_push: false,
      create_learnings_file: false,
      auto_init_submodules: true,
      auto_run_setup: 'auto', // Changed from true to 'auto'
      copy_files_enabled: true,
      copy_file_patterns: ['.env', '.env.*', '.vscode/**', '*.local'],
      exclude_file_patterns: ['node_modules', 'dist', 'build', 'coverage', '.git'],
      spec_directory: 'audit',
      default_max_iterations: 50,
    });
  });

  describe('execute', () => {
    it('should handle auto_run_setup: "all" mode', async () => {
      (ConfigReader.getConfig as jest.Mock).mockReturnValue({
        worktree_base_path: path.join(os.homedir(), 'worktrees'),
        branch_prefix: 'feature/',
        auto_commit: false,
        auto_push: false,
        create_learnings_file: false,
        auto_init_submodules: true,
        auto_run_setup: 'all', // Test 'all' mode
        copy_files_enabled: true,
        copy_file_patterns: ['.env', '.env.*', '.vscode/**', '*.local'],
        exclude_file_patterns: ['node_modules', 'dist', 'build', 'coverage', '.git'],
        spec_directory: 'audit',
        default_max_iterations: 50,
      });

      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(true);
      (GitHelpers.createWorktree as jest.Mock).mockResolvedValue({ success: true });
      (ProjectDetector.detect as jest.Mock).mockReturnValue({
        type: 'web',
        setup_commands: [],
        details: { has_web: true, has_ios: false, has_root_package_json: false },
      });
      (ProjectDetector.detectAll as jest.Mock).mockReturnValue([
        {
          directory: '/path/to/worktree',
          command: 'npm install',
          description: 'Install Node.js dependencies',
        },
        {
          directory: '/path/to/worktree',
          command: 'cargo fetch',
          description: 'Fetch Rust dependencies',
        },
      ]);
      (SetupRunner.runSetupCommands as jest.Mock).mockResolvedValue({
        success: true,
        messages: ['✅ Install Node.js dependencies complete', '✅ Fetch Rust dependencies complete'],
        errors: [],
      });

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
      });

      expect(result.success).toBe(true);
      expect(ProjectDetector.detectAll).toHaveBeenCalled();
      expect(SetupRunner.runSetupCommands).toHaveBeenCalledWith([
        {
          directory: '/path/to/worktree',
          command: 'npm install',
          description: 'Install Node.js dependencies',
        },
        {
          directory: '/path/to/worktree',
          command: 'cargo fetch',
          description: 'Fetch Rust dependencies',
        },
      ]);
      expect(result.setup_messages.some(m => m.includes('Installing 2 ecosystem'))).toBe(true);
    });

    it('should create worktree successfully with default parameters', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(true);
      (GitHelpers.createWorktree as jest.Mock).mockResolvedValue({ success: true });
      (ProjectDetector.detect as jest.Mock).mockReturnValue({
        type: 'web',
        setup_commands: [
          {
            directory: '/path/to/worktree/web',
            command: 'npm install',
            description: 'Install web dependencies',
          },
        ],
        details: { has_web: true, has_ios: false, has_root_package_json: false },
      });
      (SetupRunner.runSetupCommands as jest.Mock).mockResolvedValue({
        success: true,
        messages: ['✅ Install web dependencies complete'],
        errors: [],
      });

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
      });

      expect(result.success).toBe(true);
      expect(result.branch).toBe('feature/test-feature');
      expect(result.setup_complete).toBe(true);
      expect(result.worktree_path).toBe(
        path.join(os.homedir(), 'worktrees', 'test-feature')
      );
      expect(result.next_steps[0]).toContain('Worktree created successfully');
    });

    it('should use custom worktree path when provided', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(true);
      (GitHelpers.createWorktree as jest.Mock).mockResolvedValue({ success: true });
      (ProjectDetector.detect as jest.Mock).mockReturnValue({
        type: 'web',
        setup_commands: [],
        details: { has_web: true, has_ios: false, has_root_package_json: false },
      });

      const customPath = '/custom/path/to/worktree';
      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
        worktree_path: customPath,
      });

      expect(result.worktree_path).toBe(customPath);
      expect(GitHelpers.createWorktree).toHaveBeenCalledWith({
        path: customPath,
        branch: 'feature/test-feature',
        baseBranch: 'main',
        cwd: expect.any(String),
      });
    });

    it('should use custom base branch when provided', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(true);
      (GitHelpers.createWorktree as jest.Mock).mockResolvedValue({ success: true });
      (ProjectDetector.detect as jest.Mock).mockReturnValue({
        type: 'web',
        setup_commands: [],
        details: { has_web: true, has_ios: false, has_root_package_json: false },
      });

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
        base_branch: 'develop',
      });

      expect(GitHelpers.createWorktree).toHaveBeenCalledWith(
        expect.objectContaining({
          baseBranch: 'develop',
        })
      );
    });

    it('should fail when not in a git repository', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(false);

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not a git repository');
      expect(result.next_steps[0]).toContain('Navigate to a git repository');
    });

    it('should fail when worktree creation fails', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(true);
      (GitHelpers.createWorktree as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Branch already exists',
      });

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Branch already exists');
      expect(result.next_steps).toContain('Try a different feature name');
    });

    it('should mark setup as incomplete when setup commands fail', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(true);
      (GitHelpers.createWorktree as jest.Mock).mockResolvedValue({ success: true });
      (ProjectDetector.detect as jest.Mock).mockReturnValue({
        type: 'web',
        setup_commands: [
          {
            directory: '/path/to/worktree/web',
            command: 'npm install',
            description: 'Install web dependencies',
          },
        ],
        details: { has_web: true, has_ios: false, has_root_package_json: false },
      });
      (SetupRunner.runSetupCommands as jest.Mock).mockResolvedValue({
        success: false,
        messages: ['Running: npm install'],
        errors: ['❌ npm install failed'],
      });

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
      });

      expect(result.success).toBe(true); // Worktree created successfully
      expect(result.setup_complete).toBe(false); // But setup failed
      expect(result.next_steps[0]).toContain('setup incomplete');
      expect(result.setup_messages).toContain('❌ npm install failed');
    });

    it('should succeed when task_description is provided (legacy parameter)', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(true);
      (GitHelpers.createWorktree as jest.Mock).mockResolvedValue({ success: true });
      (ProjectDetector.detect as jest.Mock).mockReturnValue({
        type: 'web',
        setup_commands: [],
        details: { has_web: true, has_ios: false, has_root_package_json: false },
      });

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
        task_description: 'Implement user authentication',
      });

      // task_description is now ignored (legacy parameter), but tool should still succeed
      expect(result.success).toBe(true);
      expect(result.next_steps[0]).toContain('Worktree created successfully');
    });

    it('should handle unknown project type with no setup commands', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockResolvedValue(true);
      (GitHelpers.createWorktree as jest.Mock).mockResolvedValue({ success: true });
      (ProjectDetector.detect as jest.Mock).mockReturnValue({
        type: 'unknown',
        setup_commands: [],
        details: { has_web: false, has_ios: false, has_root_package_json: false },
      });

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
      });

      expect(result.success).toBe(true);
      expect(result.setup_complete).toBe(true);
      expect(result.setup_messages).toContain('No setup commands needed');
    });

    it('should handle unexpected errors gracefully', async () => {
      (GitHelpers.isGitRepo as jest.Mock).mockRejectedValue(new Error('Unexpected error'));

      const result = await WorktreeStartTool.execute({
        feature_name: 'test-feature',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error');
    });
  });

});
