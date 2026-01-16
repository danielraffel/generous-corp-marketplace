import * as fs from 'fs';
import * as path from 'path';
import micromatch from 'micromatch';

interface CopyResult {
  copied: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Utility for copying files based on glob patterns
 */
export class FileCopier {
  /**
   * Copy files matching patterns from source to destination
   * @param sourcePath - Main repo path
   * @param destPath - New worktree path
   * @param includePatterns - Glob patterns to copy (e.g., '.env', '.vscode/**')
   * @param excludePatterns - Glob patterns to exclude (e.g., 'node_modules')
   * @returns Object containing lists of copied, skipped, and error files
   */
  static async copyFiles(
    sourcePath: string,
    destPath: string,
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<CopyResult> {
    const result: CopyResult = {
      copied: [],
      skipped: [],
      errors: [],
    };

    // Validate patterns
    if (!this.validatePatterns(includePatterns)) {
      result.errors.push('Invalid include patterns provided');
      return result;
    }

    if (!this.validatePatterns(excludePatterns)) {
      result.errors.push('Invalid exclude patterns provided');
      return result;
    }

    // Validate paths exist
    if (!fs.existsSync(sourcePath)) {
      result.errors.push(`Source path does not exist: ${sourcePath}`);
      return result;
    }

    if (!fs.existsSync(destPath)) {
      result.errors.push(`Destination path does not exist: ${destPath}`);
      return result;
    }

    try {
      // Get all files in source directory (recursively)
      const allFiles = this.getAllFiles(sourcePath, sourcePath);

      // Filter files based on patterns
      const filesToCopy = allFiles.filter((relPath) => {
        // Check if matches include patterns
        const matchesInclude = includePatterns.length === 0 ||
          this.matchesPattern(relPath, includePatterns);

        // Check if matches exclude patterns
        const matchesExclude = this.matchesPattern(relPath, excludePatterns);

        return matchesInclude && !matchesExclude;
      });

      // Copy each file
      for (const relPath of filesToCopy) {
        const sourceFile = path.join(sourcePath, relPath);
        const destFile = path.join(destPath, relPath);

        try {
          // Skip if destination file already exists
          if (fs.existsSync(destFile)) {
            result.skipped.push(relPath);
            continue;
          }

          // Create destination directory if needed
          const destDir = path.dirname(destFile);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
          }

          // Copy file preserving permissions
          fs.copyFileSync(sourceFile, destFile);

          // Preserve file mode (permissions)
          const stats = fs.statSync(sourceFile);
          fs.chmodSync(destFile, stats.mode);

          result.copied.push(relPath);
        } catch (error: any) {
          result.errors.push(`Failed to copy ${relPath}: ${error.message}`);
        }
      }
    } catch (error: any) {
      result.errors.push(`Error scanning source directory: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate glob patterns
   * @param patterns - Array of glob patterns
   * @returns true if valid, false otherwise
   */
  static validatePatterns(patterns: string[]): boolean {
    if (!Array.isArray(patterns)) {
      return false;
    }

    // Basic validation - check patterns are non-empty strings
    for (const pattern of patterns) {
      if (typeof pattern !== 'string' || pattern.trim().length === 0) {
        return false;
      }

      // Check for invalid characters that could cause issues
      if (pattern.includes('\0')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a file path matches any of the given patterns
   * @param filePath - Relative file path
   * @param patterns - Array of glob patterns
   * @returns true if matches any pattern
   */
  static matchesPattern(filePath: string, patterns: string[]): boolean {
    if (patterns.length === 0) {
      return false;
    }

    // Use micromatch for glob pattern matching
    // Options: dot: true allows matching dotfiles like .env
    return micromatch.isMatch(filePath, patterns, { dot: true });
  }

  /**
   * Recursively get all files in a directory
   * @param dirPath - Directory to scan
   * @param basePath - Base path for relative path calculation
   * @returns Array of relative file paths
   */
  private static getAllFiles(dirPath: string, basePath: string): string[] {
    const files: string[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relPath = path.relative(basePath, fullPath);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          files.push(...this.getAllFiles(fullPath, basePath));
        } else if (entry.isFile()) {
          files.push(relPath);
        }
        // Skip symlinks and other special files
      }
    } catch (error) {
      // If we can't read a directory (permissions, etc), skip it
      // Errors will be caught at the file level
    }

    return files;
  }
}
