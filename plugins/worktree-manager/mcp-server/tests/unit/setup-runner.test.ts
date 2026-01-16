import { SetupRunner } from '../../src/utils/setup-runner';
import { SetupCommand } from '../../src/types';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

const { exec } = require('child_process');

describe('SetupRunner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('runSetupCommands', () => {
    it('should run all commands successfully', async () => {
      (exec as jest.Mock).mockResolvedValue({ stdout: 'Success\n', stderr: '' });

      const commands: SetupCommand[] = [
        {
          directory: '/path/to/web',
          command: 'npm install',
          description: 'Install web dependencies',
        },
        {
          directory: '/path/to/server',
          command: 'npm install',
          description: 'Install server dependencies',
        },
      ];

      const result = await SetupRunner.runSetupCommands(commands);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(4);
      expect(result.messages[0]).toContain('Running: Install web dependencies');
      expect(result.messages[1]).toContain('✅ Install web dependencies complete');
      expect(result.messages[2]).toContain('Running: Install server dependencies');
      expect(result.messages[3]).toContain('✅ Install server dependencies complete');
      expect(result.errors).toHaveLength(0);
      expect(exec).toHaveBeenCalledTimes(2);
    });

    it('should stop on first error and return failure', async () => {
      (exec as jest.Mock)
        .mockResolvedValueOnce({ stdout: 'Success\n', stderr: '' })
        .mockRejectedValueOnce(new Error('npm install failed'));

      const commands: SetupCommand[] = [
        {
          directory: '/path/to/web',
          command: 'npm install',
          description: 'Install web dependencies',
        },
        {
          directory: '/path/to/server',
          command: 'npm install',
          description: 'Install server dependencies',
        },
        {
          directory: '/path/to/other',
          command: 'npm install',
          description: 'Install other dependencies',
        },
      ];

      const result = await SetupRunner.runSetupCommands(commands);

      expect(result.success).toBe(false);
      expect(result.messages).toHaveLength(3);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('❌ Install server dependencies failed');
      expect(exec).toHaveBeenCalledTimes(2); // Stopped after second command
    });

    it('should handle stderr warnings without failing', async () => {
      (exec as jest.Mock).mockResolvedValue({
        stdout: 'Success\n',
        stderr: 'npm WARN deprecated package@1.0.0\n',
      });

      const commands: SetupCommand[] = [
        {
          directory: '/path/to/web',
          command: 'npm install',
          description: 'Install dependencies',
        },
      ];

      const result = await SetupRunner.runSetupCommands(commands);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toContain('✅');
      expect(result.errors).toHaveLength(0);
    });

    it('should log stderr that is not npm warnings', async () => {
      (exec as jest.Mock).mockResolvedValue({
        stdout: 'Success\n',
        stderr: 'Some other warning message\n',
      });

      const commands: SetupCommand[] = [
        {
          directory: '/path/to/web',
          command: 'npm install',
          description: 'Install dependencies',
        },
      ];

      const result = await SetupRunner.runSetupCommands(commands);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(3);
      expect(result.messages[2]).toContain('⚠️');
      expect(result.messages[2]).toContain('had warnings');
    });

    it('should use correct directory and timeout for each command', async () => {
      (exec as jest.Mock).mockResolvedValue({ stdout: 'Success\n', stderr: '' });

      const commands: SetupCommand[] = [
        {
          directory: '/custom/path',
          command: 'npm install',
          description: 'Install dependencies',
        },
      ];

      await SetupRunner.runSetupCommands(commands);

      expect(exec).toHaveBeenCalledWith('npm install', {
        cwd: '/custom/path',
        timeout: 5 * 60 * 1000,
      });
    });

    it('should handle empty command list', async () => {
      const result = await SetupRunner.runSetupCommands([]);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('runCommand', () => {
    it('should run single command successfully', async () => {
      (exec as jest.Mock).mockResolvedValue({
        stdout: 'Command output\n',
        stderr: '',
      });

      const command: SetupCommand = {
        directory: '/path/to/dir',
        command: 'npm install',
        description: 'Install dependencies',
      };

      const result = await SetupRunner.runCommand(command);

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('Command output\n');
      expect(result.stderr).toBe('');
      expect(result.error).toBeUndefined();
    });

    it('should return error on command failure', async () => {
      (exec as jest.Mock).mockRejectedValue(new Error('Command failed'));

      const command: SetupCommand = {
        directory: '/path/to/dir',
        command: 'npm install',
        description: 'Install dependencies',
      };

      const result = await SetupRunner.runCommand(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command failed');
      expect(result.stdout).toBeUndefined();
      expect(result.stderr).toBeUndefined();
    });

    it('should use correct timeout', async () => {
      (exec as jest.Mock).mockResolvedValue({ stdout: '', stderr: '' });

      const command: SetupCommand = {
        directory: '/path/to/dir',
        command: 'npm install',
        description: 'Install dependencies',
      };

      await SetupRunner.runCommand(command);

      expect(exec).toHaveBeenCalledWith('npm install', {
        cwd: '/path/to/dir',
        timeout: 5 * 60 * 1000,
      });
    });
  });
});
