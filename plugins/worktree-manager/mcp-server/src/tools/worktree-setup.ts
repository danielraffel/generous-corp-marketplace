import { WorktreeSetupParams, WorktreeSetupResult, SetupCommand } from '../types';
import { ProjectDetector } from '../utils/project-detector';
import { SetupRunner } from '../utils/setup-runner';

/**
 * Run setup for selected ecosystems
 * Used after user makes selection via AskUserQuestion
 */
export class WorktreeSetupTool {
  /**
   * Run setup commands for specified ecosystems
   */
  static async execute(params: WorktreeSetupParams): Promise<WorktreeSetupResult> {
    try {
      const { worktree_path, ecosystem_names } = params;

      // Get all detected ecosystems
      const allCommands = ProjectDetector.detectAll(worktree_path);

      // Filter to only requested ecosystems
      const selectedCommands = allCommands.filter(cmd => {
        // Match ecosystem names by checking command content
        return ecosystem_names.some(name => {
          return this.matchesEcosystem(cmd.command, name);
        });
      });

      if (selectedCommands.length === 0) {
        return {
          success: true,
          ran: [],
          failed: [],
          messages: ['No ecosystems selected for setup'],
        };
      }

      // Run setup commands
      const messages: string[] = [];
      const ran: string[] = [];
      const failed: string[] = [];

      for (const cmd of selectedCommands) {
        messages.push(`Running: ${cmd.description} (${cmd.command})`);

        const result = await SetupRunner.runCommand(cmd);

        if (result.success) {
          ran.push(this.extractEcosystemName(cmd.command));
          messages.push(`✅ ${cmd.description} complete`);
        } else {
          failed.push(this.extractEcosystemName(cmd.command));
          messages.push(`❌ ${cmd.description} failed: ${result.error}`);
        }
      }

      return {
        success: failed.length === 0,
        ran,
        failed,
        messages,
      };
    } catch (error: any) {
      return {
        success: false,
        ran: [],
        failed: [],
        messages: [],
        error: error.message || 'Failed to run setup',
      };
    }
  }

  /**
   * Check if command matches ecosystem name
   */
  private static matchesEcosystem(command: string, ecosystemName: string): boolean {
    const name = ecosystemName.toLowerCase();

    // Direct matches
    if (name.includes('node') && (command.includes('npm') || command.includes('yarn') || command.includes('pnpm') || command.includes('bun'))) {
      return true;
    }
    if (name.includes('rust') && command.includes('cargo')) return true;
    if (name.includes('swift') && command.includes('swift')) return true;
    if (name.includes('go') && command.includes('go ')) return true;
    if (name.includes('ruby') && command.includes('bundle')) return true;
    if (name.includes('python') && (command.includes('pip') || command.includes('poetry') || command.includes('pipenv') || command.includes('uv ') || command.includes('conda'))) {
      return true;
    }
    if (name.includes('java') && name.includes('maven') && command.includes('mvn')) return true;
    if (name.includes('java') && name.includes('gradle') && command.includes('gradle')) return true;
    if (name.includes('gradle') && command.includes('gradle')) return true;
    if (name.includes('php') && command.includes('composer')) return true;
    if (name.includes('elixir') && command.includes('mix')) return true;
    if (name.includes('.net') && command.includes('dotnet')) return true;
    if (name.includes('scala') && command.includes('sbt')) return true;
    if (name.includes('flutter') && command.includes('flutter')) return true;
    if (name.includes('dart') && command.includes('dart')) return true;
    if (name.includes('deno') && command.includes('deno')) return true;
    if (name.includes('c++') && command.includes('cmake')) return true;
    if (name.includes('cmake') && command.includes('cmake')) return true;

    return false;
  }

  /**
   * Extract ecosystem name from command
   */
  private static extractEcosystemName(command: string): string {
    if (command.includes('npm') || command.includes('yarn') || command.includes('pnpm') || command.includes('bun')) {
      return 'Node.js';
    }
    if (command.includes('cargo')) return 'Rust';
    if (command.includes('swift')) return 'Swift';
    if (command.includes('go ')) return 'Go';
    if (command.includes('bundle')) return 'Ruby';
    if (command.includes('uv ')) return 'Python (uv)';
    if (command.includes('poetry')) return 'Python (Poetry)';
    if (command.includes('pipenv')) return 'Python (pipenv)';
    if (command.includes('pip')) return 'Python';
    if (command.includes('conda')) return 'Python (Conda)';
    if (command.includes('mvn')) return 'Java (Maven)';
    if (command.includes('gradle')) return 'Java (Gradle)';
    if (command.includes('composer')) return 'PHP';
    if (command.includes('mix')) return 'Elixir';
    if (command.includes('dotnet')) return '.NET';
    if (command.includes('sbt')) return 'Scala';
    if (command.includes('flutter')) return 'Flutter';
    if (command.includes('dart')) return 'Dart';
    if (command.includes('deno')) return 'Deno';
    if (command.includes('cmake')) return 'C++ (CMake)';

    return 'Unknown';
  }
}
