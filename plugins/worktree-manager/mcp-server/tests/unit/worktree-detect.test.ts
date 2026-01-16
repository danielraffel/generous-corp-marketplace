import { WorktreeDetectTool } from '../../src/tools/worktree-detect';
import { ProjectDetector } from '../../src/utils/project-detector';

jest.mock('../../src/utils/project-detector');

describe('WorktreeDetectTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should detect and return all ecosystems', async () => {
      const mockCommands = [
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

      (ProjectDetector.detectAll as jest.Mock).mockReturnValue(mockCommands);

      const result = await WorktreeDetectTool.execute({
        worktree_path: '/path/to/worktree',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.ecosystems).toHaveLength(2);
      expect(result.ecosystems[0].name).toBe('Node.js');
      expect(result.ecosystems[0].package_manager).toBe('npm');
      expect(result.ecosystems[0].command).toBe('npm install');
      expect(result.ecosystems[1].name).toBe('Rust');
      expect(result.ecosystems[1].package_manager).toBe('cargo');
    });

    it('should return empty array when no ecosystems detected', async () => {
      (ProjectDetector.detectAll as jest.Mock).mockReturnValue([]);

      const result = await WorktreeDetectTool.execute({
        worktree_path: '/path/to/worktree',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(0);
      expect(result.ecosystems).toHaveLength(0);
    });

    it('should extract correct package managers from commands', async () => {
      const mockCommands = [
        { directory: '/path', command: 'pnpm install', description: 'Install deps' },
        { directory: '/path', command: 'uv sync', description: 'Sync deps' },
        { directory: '/path', command: 'cargo fetch', description: 'Fetch deps' },
        { directory: '/path', command: 'go mod download', description: 'Download deps' },
      ];

      (ProjectDetector.detectAll as jest.Mock).mockReturnValue(mockCommands);

      const result = await WorktreeDetectTool.execute({
        worktree_path: '/path/to/worktree',
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(4);

      expect(result.ecosystems[0].package_manager).toBe('pnpm');
      expect(result.ecosystems[0].name).toBe('Node.js');
      expect(result.ecosystems[1].package_manager).toBe('uv');
      expect(result.ecosystems[1].name).toBe('Python');
      expect(result.ecosystems[2].package_manager).toBe('cargo');
      expect(result.ecosystems[2].name).toBe('Rust');
      expect(result.ecosystems[3].package_manager).toBe('go');
      expect(result.ecosystems[3].name).toBe('Go');
    });

    it('should handle errors gracefully', async () => {
      (ProjectDetector.detectAll as jest.Mock).mockImplementation(() => {
        throw new Error('Detection failed');
      });

      const result = await WorktreeDetectTool.execute({
        worktree_path: '/path/to/worktree',
      });

      expect(result.success).toBe(false);
      expect(result.count).toBe(0);
      expect(result.ecosystems).toHaveLength(0);
      expect(result.error).toContain('Detection failed');
    });
  });
});
