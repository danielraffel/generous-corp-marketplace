import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetector } from '../../src/utils/project-detector';

jest.mock('fs');

describe('ProjectDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detect', () => {
    it('should detect web project', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('web/package.json')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.type).toBe('web');
      expect(result.details.has_web).toBe(true);
      expect(result.details.has_ios).toBe(false);
      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0]).toEqual({
        directory: path.join('/path/to/worktree', 'web'),
        command: 'npm install',
        description: 'Install web dependencies',
      });
    });

    it('should detect iOS project', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('ios')) return true;
        return false;
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.type).toBe('ios');
      expect(result.details.has_web).toBe(false);
      expect(result.details.has_ios).toBe(true);
      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0]).toEqual({
        directory: '/path/to/worktree',
        command: 'echo "iOS project detected. Open in Xcode if needed."',
        description: 'iOS project setup (manual)',
      });
    });

    it('should detect full-stack project', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('web/package.json')) return true;
        if (filePath.endsWith('ios')) return true;
        return false;
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.type).toBe('full-stack');
      expect(result.details.has_web).toBe(true);
      expect(result.details.has_ios).toBe(true);
      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0]).toEqual({
        directory: path.join('/path/to/worktree', 'web'),
        command: 'npm install',
        description: 'Install web dependencies',
      });
    });

    it('should detect root package.json project (no web/)', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json') && !filePath.includes('web')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.type).toBe('unknown');
      expect(result.details.has_root_package_json).toBe(true);
      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0]).toEqual({
        directory: '/path/to/worktree',
        command: 'npm install',
        description: 'Install dependencies',
      });
    });

    it('should return unknown type when no project structure detected', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.type).toBe('unknown');
      expect(result.details.has_web).toBe(false);
      expect(result.details.has_ios).toBe(false);
      expect(result.details.has_root_package_json).toBe(false);
      expect(result.setup_commands).toHaveLength(0);
    });

    it('should prioritize web setup over root package.json', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true); // All files exist

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].directory).toContain('web');
    });

    it('should not include iOS setup command when web exists', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('web/package.json')) return true;
        if (filePath.endsWith('ios')) return true;
        return false;
      });
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.type).toBe('full-stack');
      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].description).toBe('Install web dependencies');
    });

    it('should detect pnpm based on pnpm-lock.yaml', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json') && !filePath.includes('web')) return true;
        if (filePath.endsWith('pnpm-lock.yaml')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('pnpm install');
    });

    it('should detect yarn based on yarn.lock', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json') && !filePath.includes('web')) return true;
        if (filePath.endsWith('yarn.lock')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('yarn install');
    });

    it('should detect bun based on bun.lockb', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json') && !filePath.includes('web')) return true;
        if (filePath.endsWith('bun.lockb')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('bun install');
    });

    it('should detect npm based on package-lock.json', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json') && !filePath.includes('web')) return true;
        if (filePath.endsWith('package-lock.json')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('npm install');
    });

    it('should prioritize pnpm over yarn when both lockfiles exist', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json') && !filePath.includes('web')) return true;
        if (filePath.endsWith('pnpm-lock.yaml')) return true;
        if (filePath.endsWith('yarn.lock')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('pnpm install');
    });

    it('should detect package manager for web/ subdirectory', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('web/package.json')) return true;
        if (filePath.endsWith('web/pnpm-lock.yaml')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('pnpm install');
      expect(result.setup_commands[0].directory).toContain('web');
    });

    it('should detect Python (uv) based on uv.lock', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('uv.lock')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('uv sync');
      expect(result.setup_commands[0].description).toBe('Install Python dependencies with uv');
    });

    it('should prioritize uv over Poetry when both exist', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('uv.lock')) return true;
        if (filePath.endsWith('pyproject.toml')) return true;
        if (filePath.endsWith('poetry.lock')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('uv sync');
    });

    it('should detect Python (pipenv) based on Pipfile', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('Pipfile')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('pipenv install');
      expect(result.setup_commands[0].description).toBe('Install Python dependencies with pipenv');
    });

    it('should prioritize Poetry over pipenv when both exist', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('pyproject.toml')) return true;
        if (filePath.endsWith('poetry.lock')) return true;
        if (filePath.endsWith('Pipfile')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('poetry install');
    });

    it('should detect Swift Package Manager based on Package.swift', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('Package.swift')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('swift package resolve');
      expect(result.setup_commands[0].description).toBe('Resolve Swift package dependencies');
    });

    it('should detect Deno based on deno.json', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('deno.json')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('deno cache --reload');
      expect(result.setup_commands[0].description).toBe('Cache Deno dependencies');
    });

    it('should detect Conda based on environment.yml', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('environment.yml')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('conda env create -f environment.yml');
      expect(result.setup_commands[0].description).toBe('Create Conda environment');
    });

    it('should detect CMake based on CMakeLists.txt', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('CMakeLists.txt')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('cmake -B build');
      expect(result.setup_commands[0].description).toBe('Configure CMake build');
    });

    it('should prioritize Conda over Poetry when both exist', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('environment.yml')) return true;
        if (filePath.endsWith('pyproject.toml')) return true;
        if (filePath.endsWith('poetry.lock')) return true;
        return false;
      });

      const result = ProjectDetector.detect('/path/to/worktree');

      expect(result.setup_commands).toHaveLength(1);
      expect(result.setup_commands[0].command).toBe('conda env create -f environment.yml');
    });
  });

  describe('detectAll', () => {
    it('should detect all ecosystems without short-circuiting', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json')) return true;
        if (filePath.endsWith('Cargo.toml')) return true;
        if (filePath.endsWith('Package.swift')) return true;
        return false;
      });

      const result = ProjectDetector.detectAll('/path/to/worktree');

      expect(result).toHaveLength(3);
      expect(result[0].command).toBe('npm install');
      expect(result[1].command).toBe('cargo fetch');
      expect(result[2].command).toBe('swift package resolve');
    });

    it('should deduplicate Node.js family (web takes precedence)', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('web/package.json')) return true;
        if (filePath.endsWith('package.json')) return true; // Root package.json
        return false;
      });

      const result = ProjectDetector.detectAll('/path/to/worktree');

      // Should only return one Node.js entry (web)
      expect(result).toHaveLength(1);
      expect(result[0].directory).toBe(path.join('/path/to/worktree', 'web'));
    });

    it('should deduplicate Python family (first detected wins)', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('uv.lock')) return true;
        if (filePath.endsWith('pyproject.toml')) return true;
        if (filePath.endsWith('poetry.lock')) return true;
        return false;
      });

      const result = ProjectDetector.detectAll('/path/to/worktree');

      // Should only return one Python entry (uv - highest priority)
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('uv sync');
    });

    it('should detect package manager from lockfiles for Node.js', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json')) return true;
        if (filePath.endsWith('pnpm-lock.yaml')) return true;
        return false;
      });

      const result = ProjectDetector.detectAll('/path/to/worktree');

      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('pnpm install');
    });

    it('should return empty array when no ecosystems detected', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = ProjectDetector.detectAll('/path/to/worktree');

      expect(result).toHaveLength(0);
    });

    it('should handle multiple different ecosystems', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json')) return true;
        if (filePath.endsWith('go.mod')) return true;
        if (filePath.endsWith('Gemfile')) return true;
        if (filePath.endsWith('composer.json')) return true;
        return false;
      });

      const result = ProjectDetector.detectAll('/path/to/worktree');

      expect(result).toHaveLength(4);
      const commands = result.map(r => r.command);
      expect(commands).toContain('npm install');
      expect(commands).toContain('go mod download');
      expect(commands).toContain('bundle install');
      expect(commands).toContain('composer install');
    });
  });
});
