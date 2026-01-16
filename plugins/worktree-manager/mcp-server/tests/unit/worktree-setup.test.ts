import { WorktreeSetupTool } from '../../src/tools/worktree-setup';
import { ProjectDetector } from '../../src/utils/project-detector';
import { SetupRunner } from '../../src/utils/setup-runner';

jest.mock('../../src/utils/project-detector');
jest.mock('../../src/utils/setup-runner');

describe('WorktreeSetupTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should run setup for selected ecosystems', async () => {
      const mockAllCommands = [
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
        {
          directory: '/path/to/worktree',
          command: 'swift package resolve',
          description: 'Resolve Swift dependencies',
        },
      ];

      (ProjectDetector.detectAll as jest.Mock).mockReturnValue(mockAllCommands);
      (SetupRunner.runCommand as jest.Mock).mockResolvedValue({
        success: true,
        messages: [],
        errors: [],
      });

      const result = await WorktreeSetupTool.execute({
        worktree_path: '/path/to/worktree',
        ecosystem_names: ['Node.js', 'Rust'],
      });

      expect(result.success).toBe(true);
      expect(result.ran).toEqual(['Node.js', 'Rust']);
      expect(result.failed).toEqual([]);
      expect(SetupRunner.runCommand).toHaveBeenCalledTimes(2);
    });

    it('should handle no ecosystems selected', async () => {
      (ProjectDetector.detectAll as jest.Mock).mockReturnValue([]);

      const result = await WorktreeSetupTool.execute({
        worktree_path: '/path/to/worktree',
        ecosystem_names: [],
      });

      expect(result.success).toBe(true);
      expect(result.ran).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(result.messages).toContain('No ecosystems selected for setup');
    });

    it('should track failed setups', async () => {
      const mockAllCommands = [
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
      ];

      (ProjectDetector.detectAll as jest.Mock).mockReturnValue(mockAllCommands);
      (SetupRunner.runCommand as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          messages: [],
          errors: [],
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Cargo not found',
          messages: [],
          errors: [],
        });

      const result = await WorktreeSetupTool.execute({
        worktree_path: '/path/to/worktree',
        ecosystem_names: ['Node.js', 'Rust'],
      });

      expect(result.success).toBe(false);
      expect(result.ran).toEqual(['Node.js']);
      expect(result.failed).toEqual(['Rust']);
      expect(result.messages.some(m => m.includes('complete'))).toBe(true);
      expect(result.messages.some(m => m.includes('failed'))).toBe(true);
    });

    it('should match ecosystem names correctly', async () => {
      const mockAllCommands = [
        { directory: '/path', command: 'npm install', description: 'Install deps' },
        { directory: '/path', command: 'poetry install', description: 'Install deps' },
        { directory: '/path', command: 'mvn dependency:resolve', description: 'Resolve deps' },
        { directory: '/path', command: 'gradle dependencies', description: 'Get deps' },
      ];

      (ProjectDetector.detectAll as jest.Mock).mockReturnValue(mockAllCommands);
      (SetupRunner.runCommand as jest.Mock).mockResolvedValue({
        success: true,
        messages: [],
        errors: [],
      });

      const result = await WorktreeSetupTool.execute({
        worktree_path: '/path/to/worktree',
        ecosystem_names: ['Python', 'Java (Gradle)'],
      });

      expect(result.success).toBe(true);
      expect(result.ran).toHaveLength(2);
      expect(result.ran).toContain('Python (Poetry)');
      expect(result.ran).toContain('Java (Gradle)');
      expect(SetupRunner.runCommand).toHaveBeenCalledTimes(2);
    });

    it('should handle variant ecosystem names', async () => {
      const mockAllCommands = [
        { directory: '/path', command: 'uv sync', description: 'Sync deps' },
      ];

      (ProjectDetector.detectAll as jest.Mock).mockReturnValue(mockAllCommands);
      (SetupRunner.runCommand as jest.Mock).mockResolvedValue({
        success: true,
        messages: [],
        errors: [],
      });

      // Should match "Python" to "uv" command
      const result = await WorktreeSetupTool.execute({
        worktree_path: '/path/to/worktree',
        ecosystem_names: ['Python'],
      });

      expect(result.success).toBe(true);
      expect(result.ran).toHaveLength(1);
      expect(SetupRunner.runCommand).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      (ProjectDetector.detectAll as jest.Mock).mockImplementation(() => {
        throw new Error('Detection failed');
      });

      const result = await WorktreeSetupTool.execute({
        worktree_path: '/path/to/worktree',
        ecosystem_names: ['Node.js'],
      });

      expect(result.success).toBe(false);
      expect(result.ran).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(result.error).toContain('Detection failed');
    });

    it('should skip ecosystems not found', async () => {
      const mockAllCommands = [
        { directory: '/path', command: 'npm install', description: 'Install deps' },
      ];

      (ProjectDetector.detectAll as jest.Mock).mockReturnValue(mockAllCommands);

      const result = await WorktreeSetupTool.execute({
        worktree_path: '/path/to/worktree',
        ecosystem_names: ['Rust', 'Go'], // Neither detected
      });

      expect(result.success).toBe(true);
      expect(result.ran).toEqual([]);
      expect(result.failed).toEqual([]);
      expect(result.messages).toContain('No ecosystems selected for setup');
    });
  });
});
