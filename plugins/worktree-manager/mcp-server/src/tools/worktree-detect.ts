import * as path from 'path';
import { WorktreeDetectParams, WorktreeDetectResult, DetectedEcosystem } from '../types';
import { ProjectDetector } from '../utils/project-detector';

/**
 * Detect all ecosystems in a worktree
 * Used for multi-ecosystem prompting
 */
export class WorktreeDetectTool {
  /**
   * Detect all ecosystems without short-circuiting
   */
  static async execute(params: WorktreeDetectParams): Promise<WorktreeDetectResult> {
    try {
      const { worktree_path } = params;

      // Use detectAll to scan all ecosystems
      const setupCommands = ProjectDetector.detectAll(worktree_path);

      // Convert SetupCommand[] to DetectedEcosystem[]
      const ecosystems: DetectedEcosystem[] = setupCommands.map(cmd => {
        // Extract ecosystem name from description or command
        const name = this.extractEcosystemName(cmd.command, cmd.description);
        const packageManager = this.extractPackageManager(cmd.command);

        return {
          name,
          package_manager: packageManager,
          command: cmd.command,
          description: cmd.description,
          directory: cmd.directory,
        };
      });

      return {
        success: true,
        ecosystems,
        count: ecosystems.length,
      };
    } catch (error: any) {
      return {
        success: false,
        ecosystems: [],
        count: 0,
        error: error.message || 'Failed to detect ecosystems',
      };
    }
  }

  /**
   * Extract ecosystem name from command
   */
  private static extractEcosystemName(command: string, description: string): string {
    // Map commands to ecosystem names
    if (command.includes('npm') || command.includes('yarn') || command.includes('pnpm') || command.includes('bun')) {
      return 'Node.js';
    }
    if (command.includes('cargo')) return 'Rust';
    if (command.includes('swift')) return 'Swift';
    if (command.includes('go ')) return 'Go';
    if (command.includes('bundle')) return 'Ruby';
    if (command.includes('pip') || command.includes('poetry') || command.includes('pipenv') || command.includes('uv ') || command.includes('conda')) {
      return 'Python';
    }
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

    // Fallback to description
    return description.split(' ')[0];
  }

  /**
   * Extract package manager from command
   */
  private static extractPackageManager(command: string): string {
    if (command.includes('pnpm')) return 'pnpm';
    if (command.includes('bun')) return 'bun';
    if (command.includes('yarn')) return 'yarn';
    if (command.includes('npm')) return 'npm';
    if (command.includes('cargo')) return 'cargo';
    if (command.includes('swift')) return 'swift';
    if (command.includes('go ')) return 'go';
    if (command.includes('bundle')) return 'bundle';
    if (command.includes('uv ')) return 'uv';
    if (command.includes('poetry')) return 'poetry';
    if (command.includes('pipenv')) return 'pipenv';
    if (command.includes('pip')) return 'pip';
    if (command.includes('conda')) return 'conda';
    if (command.includes('mvn')) return 'mvn';
    if (command.includes('gradle')) return 'gradle';
    if (command.includes('composer')) return 'composer';
    if (command.includes('mix')) return 'mix';
    if (command.includes('dotnet')) return 'dotnet';
    if (command.includes('sbt')) return 'sbt';
    if (command.includes('flutter')) return 'flutter';
    if (command.includes('dart')) return 'dart';
    if (command.includes('deno')) return 'deno';
    if (command.includes('cmake')) return 'cmake';

    return 'unknown';
  }
}
