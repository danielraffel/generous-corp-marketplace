import { FileCopier } from '../../src/utils/file-copier';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('micromatch', () => ({
  __esModule: true,
  default: {
    isMatch: jest.fn(),
  },
}));

const micromatch = require('micromatch').default;

describe('FileCopier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePatterns', () => {
    it('should return true for valid array of patterns', () => {
      const patterns = ['.env', '.vscode/**', '*.local'];
      const result = FileCopier.validatePatterns(patterns);
      expect(result).toBe(true);
    });

    it('should return false for non-array input', () => {
      const result = FileCopier.validatePatterns('not-an-array' as any);
      expect(result).toBe(false);
    });

    it('should return false for empty string patterns', () => {
      const patterns = ['.env', '', '*.local'];
      const result = FileCopier.validatePatterns(patterns);
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only patterns', () => {
      const patterns = ['.env', '   ', '*.local'];
      const result = FileCopier.validatePatterns(patterns);
      expect(result).toBe(false);
    });

    it('should return false for patterns with null bytes', () => {
      const patterns = ['.env', 'test\0file', '*.local'];
      const result = FileCopier.validatePatterns(patterns);
      expect(result).toBe(false);
    });

    it('should return true for empty array', () => {
      const result = FileCopier.validatePatterns([]);
      expect(result).toBe(true);
    });
  });

  describe('matchesPattern', () => {
    it('should return false for empty pattern array', () => {
      const result = FileCopier.matchesPattern('.env', []);
      expect(result).toBe(false);
    });

    it('should call micromatch.isMatch with dot:true option', () => {
      micromatch.isMatch.mockReturnValue(true);

      const result = FileCopier.matchesPattern('.env', ['.env', '*.local']);

      expect(result).toBe(true);
      expect(micromatch.isMatch).toHaveBeenCalledWith('.env', ['.env', '*.local'], {
        dot: true,
      });
    });

    it('should return true when pattern matches', () => {
      micromatch.isMatch.mockReturnValue(true);

      const result = FileCopier.matchesPattern('.vscode/settings.json', ['.vscode/**']);

      expect(result).toBe(true);
    });

    it('should return false when pattern does not match', () => {
      micromatch.isMatch.mockReturnValue(false);

      const result = FileCopier.matchesPattern('node_modules/package.json', ['.env']);

      expect(result).toBe(false);
    });
  });

  describe('copyFiles', () => {
    it('should return error when source path does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await FileCopier.copyFiles(
        '/nonexistent/source',
        '/dest',
        ['.env'],
        []
      );

      expect(result.errors).toContain('Source path does not exist: /nonexistent/source');
      expect(result.copied).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should return error when destination path does not exist', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(false); // dest doesn't exist

      const result = await FileCopier.copyFiles(
        '/source',
        '/nonexistent/dest',
        ['.env'],
        []
      );

      expect(result.errors).toContain('Destination path does not exist: /nonexistent/dest');
      expect(result.copied).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });

    it('should return error for invalid include patterns', async () => {
      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        [''] as any,
        []
      );

      expect(result.errors).toContain('Invalid include patterns provided');
    });

    it('should return error for invalid exclude patterns', async () => {
      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.env'],
        [''] as any
      );

      expect(result.errors).toContain('Invalid exclude patterns provided');
    });

    it('should copy files matching include patterns', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true) // dest exists
        .mockReturnValue(false); // dest files don't exist

      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: '.env', isDirectory: () => false, isFile: () => true },
        { name: 'package.json', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ mode: 0o644 });
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.chmodSync as jest.Mock).mockImplementation(() => {});
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      micromatch.isMatch.mockImplementation((file: string, patterns: string[]) => {
        // Include patterns
        if (patterns.includes('.env')) {
          return file === '.env';
        }
        return false;
      });

      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.env'],
        []
      );

      expect(result.copied).toContain('.env');
      expect(result.copied).not.toContain('package.json');
      expect(result.errors).toHaveLength(0);
    });

    it('should exclude files matching exclude patterns', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true) // dest exists
        .mockReturnValue(false); // dest files don't exist

      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: '.env', isDirectory: () => false, isFile: () => true },
        { name: 'package.json', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ mode: 0o644 });
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.chmodSync as jest.Mock).mockImplementation(() => {});
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      micromatch.isMatch.mockImplementation((file: string, patterns: string[]) => {
        // Include patterns - match all
        if (patterns.includes('.env')) return true;
        // Exclude patterns - exclude package.json
        if (patterns.includes('*.json')) return file.endsWith('.json');
        return false;
      });

      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.env'],
        ['*.json']
      );

      expect(result.copied).toContain('.env');
      expect(result.copied).not.toContain('package.json');
    });

    it('should skip files that already exist at destination', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true) // dest exists
        .mockReturnValueOnce(true); // .env already exists at dest

      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: '.env', isDirectory: () => false, isFile: () => true },
      ]);

      micromatch.isMatch.mockReturnValue(true);

      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.env'],
        []
      );

      expect(result.skipped).toContain('.env');
      expect(result.copied).toHaveLength(0);
      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });

    it('should create destination directories as needed', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true) // dest exists
        .mockReturnValue(false); // dest files/dirs don't exist

      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([
          { name: '.vscode', isDirectory: () => true, isFile: () => false },
        ])
        .mockReturnValueOnce([
          { name: 'settings.json', isDirectory: () => false, isFile: () => true },
        ]);

      (fs.statSync as jest.Mock).mockReturnValue({ mode: 0o644 });
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.chmodSync as jest.Mock).mockImplementation(() => {});
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      micromatch.isMatch.mockReturnValue(true);

      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.vscode/**'],
        []
      );

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(result.copied).toContain('.vscode/settings.json');
    });

    it('should preserve file permissions when copying', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true) // dest exists
        .mockReturnValue(false); // dest files don't exist

      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: '.env', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ mode: 0o755 });
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.chmodSync as jest.Mock).mockImplementation(() => {});
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      micromatch.isMatch.mockReturnValue(true);

      await FileCopier.copyFiles('/source', '/dest', ['.env'], []);

      expect(fs.chmodSync).toHaveBeenCalled();
      expect(fs.chmodSync).toHaveBeenCalledWith(expect.any(String), 0o755);
    });

    it('should handle permission errors gracefully', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true) // dest exists
        .mockReturnValue(false); // dest files don't exist

      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: '.env', isDirectory: () => false, isFile: () => true },
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ mode: 0o644 });
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      micromatch.isMatch.mockReturnValue(true);

      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.env'],
        []
      );

      expect(result.errors).toContain('Failed to copy .env: Permission denied');
      expect(result.copied).toHaveLength(0);
    });

    it('should handle directory scanning errors gracefully', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true); // dest exists

      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Access denied');
      });

      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.env'],
        []
      );

      // getAllFiles() handles errors silently to allow partial success
      // So no files copied, but no error reported either
      expect(result.copied).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle nested directories correctly', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true) // dest exists
        .mockReturnValue(false); // dest files don't exist

      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([
          { name: '.vscode', isDirectory: () => true, isFile: () => false },
        ])
        .mockReturnValueOnce([
          { name: 'settings.json', isDirectory: () => false, isFile: () => true },
          { name: 'extensions', isDirectory: () => true, isFile: () => false },
        ])
        .mockReturnValueOnce([
          { name: 'recommended.json', isDirectory: () => false, isFile: () => true },
        ]);

      (fs.statSync as jest.Mock).mockReturnValue({ mode: 0o644 });
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.chmodSync as jest.Mock).mockImplementation(() => {});
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      micromatch.isMatch.mockReturnValue(true);

      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.vscode/**'],
        []
      );

      expect(result.copied).toContain('.vscode/settings.json');
      expect(result.copied).toContain('.vscode/extensions/recommended.json');
      expect(result.errors).toHaveLength(0);
    });

    it('should skip symlinks and special files', async () => {
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true) // source exists
        .mockReturnValueOnce(true) // dest exists
        .mockReturnValue(false); // dest files don't exist

      (fs.readdirSync as jest.Mock).mockReturnValue([
        { name: '.env', isDirectory: () => false, isFile: () => true },
        { name: 'symlink', isDirectory: () => false, isFile: () => false }, // symlink
      ]);
      (fs.statSync as jest.Mock).mockReturnValue({ mode: 0o644 });
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {});
      (fs.chmodSync as jest.Mock).mockImplementation(() => {});
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});

      micromatch.isMatch.mockReturnValue(true);

      const result = await FileCopier.copyFiles(
        '/source',
        '/dest',
        ['.env', 'symlink'],
        []
      );

      expect(result.copied).toContain('.env');
      expect(result.copied).not.toContain('symlink');
    });
  });
});
