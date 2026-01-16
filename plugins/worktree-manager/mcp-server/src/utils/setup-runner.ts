import { exec } from 'child_process';
import { promisify } from 'util';
import { SetupCommand } from '../types';

const execAsync = promisify(exec);

/**
 * Setup command runner
 * Executes project setup commands (npm install, etc.)
 */
export class SetupRunner {
  /**
   * Run all setup commands
   */
  static async runSetupCommands(
    commands: SetupCommand[]
  ): Promise<{
    success: boolean;
    messages: string[];
    errors: string[];
  }> {
    const messages: string[] = [];
    const errors: string[] = [];

    for (const cmd of commands) {
      try {
        messages.push(`Running: ${cmd.description} (${cmd.command})`);

        const { stdout, stderr } = await execAsync(cmd.command, {
          cwd: cmd.directory,
          // Timeout after 5 minutes
          timeout: 5 * 60 * 1000,
        });

        if (stdout) {
          messages.push(`✅ ${cmd.description} complete`);
        }

        if (stderr && !stderr.includes('npm WARN')) {
          // Only log stderr if it's not just npm warnings
          messages.push(`⚠️  ${cmd.description} had warnings: ${stderr.substring(0, 100)}`);
        }
      } catch (error: any) {
        errors.push(`❌ ${cmd.description} failed: ${error.message}`);
        return {
          success: false,
          messages,
          errors,
        };
      }
    }

    return {
      success: true,
      messages,
      errors,
    };
  }

  /**
   * Run a single setup command
   */
  static async runCommand(cmd: SetupCommand): Promise<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: string;
  }> {
    try {
      const { stdout, stderr } = await execAsync(cmd.command, {
        cwd: cmd.directory,
        timeout: 5 * 60 * 1000,
      });

      return {
        success: true,
        stdout,
        stderr,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
