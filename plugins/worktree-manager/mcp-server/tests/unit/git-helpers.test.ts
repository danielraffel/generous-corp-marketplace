import { GitHelpers } from '../../src/utils/git-helpers';
import * as fs from 'fs';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));
jest.mock('fs');

const { exec } = require('child_process');

describe('GitHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isGitRepo', () => {
    it('should return true when directory is a git repository', async () => {
      (exec as jest.Mock).mockResolvedValue({ stdout: 'true\n', stderr: '' });

      const result = await GitHelpers.isGitRepo('/path/to/repo');

      expect(result).toBe(true);
      expect(exec).toHaveBeenCalledWith('git rev-parse --is-inside-work-tree', {
        cwd: '/path/to/repo',
      });
    });

    it('should return false when directory is not a git repository', async () => {
      (exec as jest.Mock).mockRejectedValue(new Error('Not a git repository'));

      const result = await GitHelpers.isGitRepo('/path/to/non-repo');

      expect(result).toBe(false);
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      (exec as jest.Mock).mockResolvedValue({ stdout: 'feature/test\n', stderr: '' });

      const result = await GitHelpers.getCurrentBranch('/path/to/repo');

      expect(result).toBe('feature/test');
      expect(exec).toHaveBeenCalledWith('git branch --show-current', {
        cwd: '/path/to/repo',
      });
    });

    it('should return null on error', async () => {
      (exec as jest.Mock).mockRejectedValue(new Error('Git error'));

      const result = await GitHelpers.getCurrentBranch('/path/to/repo');

      expect(result).toBe(null);
    });

    it('should return null when no current branch (detached HEAD)', async () => {
      (exec as jest.Mock).mockResolvedValue({ stdout: '\n', stderr: '' });

      const result = await GitHelpers.getCurrentBranch('/path/to/repo');

      expect(result).toBe(null);
    });
  });

  describe('branchExists', () => {
    it('should return true when branch exists', async () => {
      (exec as jest.Mock).mockResolvedValue({
        stdout: 'abc123 refs/heads/feature/test\n',
        stderr: '',
      });

      const result = await GitHelpers.branchExists('feature/test', '/path/to/repo');

      expect(result).toBe(true);
      expect(exec).toHaveBeenCalledWith(
        'git show-ref --verify refs/heads/feature/test',
        { cwd: '/path/to/repo' }
      );
    });

    it('should return false when branch does not exist', async () => {
      (exec as jest.Mock).mockRejectedValue(new Error('Branch not found'));

      const result = await GitHelpers.branchExists('nonexistent', '/path/to/repo');

      expect(result).toBe(false);
    });
  });

  describe('createWorktree', () => {
    it('should create worktree successfully', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (exec as jest.Mock)
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // branchExists check
        .mockResolvedValueOnce({ stdout: 'Worktree created\n', stderr: '' }); // git worktree add

      const result = await GitHelpers.createWorktree({
        path: '/path/to/worktree',
        branch: 'feature/test',
        baseBranch: 'main',
        cwd: '/path/to/repo',
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(exec).toHaveBeenCalledWith(
        'git worktree add -b feature/test "/path/to/worktree" main',
        { cwd: '/path/to/repo' }
      );
    });

    it('should fail if worktree path already exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await GitHelpers.createWorktree({
        path: '/path/to/existing',
        branch: 'feature/test',
        baseBranch: 'main',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Worktree path already exists');
    });

    it('should fail if branch already exists', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (exec as jest.Mock).mockResolvedValue({ stdout: 'branch exists', stderr: '' });

      const result = await GitHelpers.createWorktree({
        path: '/path/to/worktree',
        branch: 'existing-branch',
        baseBranch: 'main',
        cwd: '/path/to/repo',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Branch already exists');
    });

    it('should handle git command errors', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (exec as jest.Mock)
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // branchExists returns false
        .mockRejectedValueOnce(new Error('Git error'));

      const result = await GitHelpers.createWorktree({
        path: '/path/to/worktree',
        branch: 'feature/test',
        baseBranch: 'main',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Git error');
    });
  });

  describe('listWorktrees', () => {
    it('should parse worktree list correctly', async () => {
      const mockOutput = `worktree /path/to/main
HEAD abc123
branch refs/heads/main

worktree /path/to/feature1
HEAD def456
branch refs/heads/feature/test1

worktree /path/to/feature2
HEAD ghi789
branch refs/heads/feature/test2
`;

      (exec as jest.Mock).mockResolvedValue({ stdout: mockOutput, stderr: '' });

      const result = await GitHelpers.listWorktrees('/path/to/repo');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        path: '/path/to/main',
        branch: 'main',
        is_main: true,
        commit: 'abc123',
        locked: false,
        lock_reason: undefined,
      });
      expect(result[1]).toEqual({
        path: '/path/to/feature1',
        branch: 'feature/test1',
        is_main: true,
        commit: 'def456',
        locked: false,
        lock_reason: undefined,
      });
    });

    it('should return empty array on error', async () => {
      (exec as jest.Mock).mockRejectedValue(new Error('Git error'));

      const result = await GitHelpers.listWorktrees('/path/to/repo');

      expect(result).toEqual([]);
    });
  });

  describe('removeWorktree', () => {
    it('should remove worktree successfully', async () => {
      (exec as jest.Mock).mockResolvedValue({ stdout: '', stderr: '' });

      const result = await GitHelpers.removeWorktree('/path/to/worktree', '/path/to/repo');

      expect(result.success).toBe(true);
      expect(exec).toHaveBeenCalledWith('git worktree remove "/path/to/worktree"', {
        cwd: '/path/to/repo',
      });
    });

    it('should handle removal errors', async () => {
      (exec as jest.Mock).mockRejectedValue(new Error('Worktree has uncommitted changes'));

      const result = await GitHelpers.removeWorktree('/path/to/worktree');

      expect(result.success).toBe(false);
      expect(result.error).toContain('uncommitted changes');
    });
  });

  describe('getStatus', () => {
    it('should parse git status correctly', async () => {
      (exec as jest.Mock)
        .mockResolvedValueOnce({
          stdout: ' M file1.txt\nM  file2.txt\n?? untracked.txt\n',
          stderr: '',
        })
        .mockResolvedValueOnce({ stdout: '2\t3\n', stderr: '' });

      const result = await GitHelpers.getStatus('/path/to/repo');

      expect(result).toEqual({
        uncommitted_changes: 2,
        untracked_files: 1,
        ahead: 3,
        behind: 2,
      });
    });

    it('should return zeros on error', async () => {
      (exec as jest.Mock).mockRejectedValue(new Error('Git error'));

      const result = await GitHelpers.getStatus('/path/to/repo');

      expect(result).toEqual({
        uncommitted_changes: 0,
        untracked_files: 0,
        ahead: 0,
        behind: 0,
      });
    });
  });

  describe('hasSubmodules', () => {
    it('should return true when .gitmodules exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = GitHelpers.hasSubmodules('/path/to/repo');

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/repo/.gitmodules');
    });

    it('should return false when .gitmodules does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = GitHelpers.hasSubmodules('/path/to/repo');

      expect(result).toBe(false);
    });

    it('should return false on filesystem error', () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = GitHelpers.hasSubmodules('/path/to/repo');

      expect(result).toBe(false);
    });
  });

  describe('initSubmodules', () => {
    it('should initialize submodules successfully', async () => {
      (exec as jest.Mock).mockResolvedValue({
        stdout: 'Submodule path "lib/foo": checked out "abc123"\n',
        stderr: '',
      });

      const result = await GitHelpers.initSubmodules('/path/to/worktree');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(exec).toHaveBeenCalledWith(
        'git submodule update --init --recursive',
        {
          cwd: '/path/to/worktree',
          timeout: 10 * 60 * 1000,
        }
      );
    });

    it('should handle submodule initialization errors', async () => {
      (exec as jest.Mock).mockRejectedValue(
        new Error('fatal: unable to access submodule repository')
      );

      const result = await GitHelpers.initSubmodules('/path/to/worktree');

      expect(result.success).toBe(false);
      expect(result.error).toContain('unable to access submodule');
    });

    it('should use 10 minute timeout for slow clones', async () => {
      (exec as jest.Mock).mockImplementation((cmd, options) => {
        expect(options.timeout).toBe(10 * 60 * 1000);
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      await GitHelpers.initSubmodules('/path/to/worktree');
    });
  });
});
