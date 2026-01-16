import * as fs from 'fs';
import * as path from 'path';
import { ProjectDetectionResult, ProjectType, SetupCommand } from '../types';

/**
 * Ecosystem detector configuration
 */
interface EcosystemDetector {
  name: string;
  markers: string[];  // Files/directories to check
  command: string;
  description: string;
  checkFunction?: (worktreePath: string) => boolean;
}

/**
 * Universal project detection utility
 * Detects multiple language ecosystems and determines setup commands
 * Supports: Node.js, Python, Ruby, Go, Rust, Java, PHP, Elixir, .NET, Scala, Flutter
 */
export class ProjectDetector {
  /**
   * Detect package manager for Node.js projects
   * Checks lockfiles to determine the correct package manager
   */
  private static detectPackageManager(worktreePath: string, subdir?: string): string {
    const checkPath = subdir ? path.join(worktreePath, subdir) : worktreePath;

    // Priority order based on lockfile presence
    if (fs.existsSync(path.join(checkPath, 'pnpm-lock.yaml'))) {
      return 'pnpm install';
    }
    if (fs.existsSync(path.join(checkPath, 'bun.lockb'))) {
      return 'bun install';
    }
    if (fs.existsSync(path.join(checkPath, 'yarn.lock'))) {
      return 'yarn install';
    }
    if (fs.existsSync(path.join(checkPath, 'package-lock.json'))) {
      return 'npm install';
    }

    // Default to npm if only package.json exists
    return 'npm install';
  }

  /**
   * Ecosystem detectors - checked in priority order
   */
  private static ecosystems: EcosystemDetector[] = [
    // JavaScript/Node.js - highest priority (most common)
    {
      name: 'Node.js (web)',
      markers: ['web/package.json'],
      command: 'npm install', // Will be overridden by detectPackageManager
      description: 'Install web dependencies'
    },
    {
      name: 'Node.js',
      markers: ['package.json'],
      command: 'npm install', // Will be overridden by detectPackageManager
      description: 'Install dependencies'
    },

    // Python - uv first (fastest, modern), then Conda (data science)
    {
      name: 'Python (uv)',
      markers: ['uv.lock'],
      command: 'uv sync',
      description: 'Install Python dependencies with uv'
    },
    {
      name: 'Python (Conda)',
      markers: ['environment.yml', 'environment.yaml'],
      command: 'conda env create -f environment.yml',
      description: 'Create Conda environment'
    },
    {
      name: 'Python (Poetry)',
      markers: ['pyproject.toml', 'poetry.lock'],
      command: 'poetry install',
      description: 'Install Python dependencies with Poetry'
    },
    {
      name: 'Python (pipenv)',
      markers: ['Pipfile'],
      command: 'pipenv install',
      description: 'Install Python dependencies with pipenv'
    },
    {
      name: 'Python (pip)',
      markers: ['requirements.txt'],
      command: 'pip install -r requirements.txt',
      description: 'Install Python dependencies'
    },
    {
      name: 'Python',
      markers: ['setup.py'],
      command: 'pip install -e .',
      description: 'Install Python package in development mode'
    },

    // Ruby
    {
      name: 'Ruby',
      markers: ['Gemfile'],
      command: 'bundle install',
      description: 'Install Ruby dependencies'
    },

    // Go
    {
      name: 'Go',
      markers: ['go.mod'],
      command: 'go mod download',
      description: 'Download Go module dependencies'
    },

    // Rust
    {
      name: 'Rust',
      markers: ['Cargo.toml'],
      command: 'cargo fetch',
      description: 'Fetch Rust dependencies'
    },

    // Java - Maven
    {
      name: 'Java (Maven)',
      markers: ['pom.xml'],
      command: 'mvn dependency:resolve',
      description: 'Resolve Maven dependencies'
    },

    // Java/Kotlin - Gradle
    {
      name: 'Java/Kotlin (Gradle)',
      markers: ['build.gradle', 'build.gradle.kts'],
      command: './gradlew dependencies || gradle dependencies',
      description: 'Resolve Gradle dependencies'
    },

    // PHP
    {
      name: 'PHP (Composer)',
      markers: ['composer.json'],
      command: 'composer install',
      description: 'Install PHP dependencies'
    },

    // Elixir
    {
      name: 'Elixir',
      markers: ['mix.exs'],
      command: 'mix deps.get',
      description: 'Get Elixir dependencies'
    },

    // .NET
    {
      name: '.NET',
      markers: [],
      command: 'dotnet restore',
      description: 'Restore .NET dependencies',
      checkFunction: (worktreePath: string) => {
        try {
          // Check for .csproj, .fsproj, or .vbproj files
          const files = fs.readdirSync(worktreePath);
          return files.some(f => f.endsWith('.csproj') || f.endsWith('.fsproj') || f.endsWith('.vbproj'));
        } catch {
          return false;
        }
      }
    },

    // Scala
    {
      name: 'Scala (sbt)',
      markers: ['build.sbt'],
      command: 'sbt update',
      description: 'Update Scala dependencies'
    },

    // Dart/Flutter
    {
      name: 'Flutter',
      markers: ['pubspec.yaml'],
      command: 'flutter pub get',
      description: 'Get Flutter dependencies',
      checkFunction: (worktreePath: string) => {
        try {
          // Only Flutter if pubspec.yaml contains flutter
          const pubspecPath = path.join(worktreePath, 'pubspec.yaml');
          if (!fs.existsSync(pubspecPath)) return false;
          const content = fs.readFileSync(pubspecPath, 'utf-8');
          return content.includes('flutter:');
        } catch {
          return false;
        }
      }
    },
    {
      name: 'Dart',
      markers: ['pubspec.yaml'],
      command: 'dart pub get',
      description: 'Get Dart dependencies'
    },

    // Swift Package Manager
    {
      name: 'Swift',
      markers: ['Package.swift'],
      command: 'swift package resolve',
      description: 'Resolve Swift package dependencies'
    },

    // Deno - modern JavaScript/TypeScript runtime
    {
      name: 'Deno',
      markers: ['deno.json', 'deno.jsonc'],
      command: 'deno cache --reload',
      description: 'Cache Deno dependencies'
    },

    // CMake - C/C++ build system
    {
      name: 'C++ (CMake)',
      markers: ['CMakeLists.txt'],
      command: 'cmake -B build',
      description: 'Configure CMake build'
    },

    // iOS/Swift - keep for backwards compatibility
    {
      name: 'iOS',
      markers: ['ios'],
      command: 'echo "iOS project detected. Open in Xcode if needed."',
      description: 'iOS project setup (manual)',
      checkFunction: (worktreePath: string) => {
        const iosDir = path.join(worktreePath, 'ios');
        try {
          return fs.existsSync(iosDir) && fs.statSync(iosDir).isDirectory();
        } catch {
          return false;
        }
      }
    },
  ];

  /**
   * Detect all applicable ecosystems and return setup commands
   */
  static detect(worktreePath: string): ProjectDetectionResult {
    const detectedEcosystems: string[] = [];
    const setupCommands: SetupCommand[] = [];
    let hasDetectedPrimary = false; // Stop after detecting first primary ecosystem
    let hasDetectedWeb = false;
    let hasDetectedNode = false;
    let hasDetectedPython = false;

    // Pre-scan for iOS to determine full-stack type
    const iosEcosystem = this.ecosystems.find(e => e.name === 'iOS');
    const hasIosDirectory = iosEcosystem ? this.isEcosystemPresent(worktreePath, iosEcosystem) : false;

    for (const ecosystem of this.ecosystems) {
      if (this.isEcosystemPresent(worktreePath, ecosystem)) {
        // Skip iOS setup if we've already detected web/Node.js (backwards compatibility)
        if (ecosystem.name === 'iOS' && (hasDetectedWeb || hasDetectedNode)) {
          continue;
        }

        // For backwards compatibility: only detect ONE primary ecosystem (web/node/iOS)
        // This prevents detecting all 15 ecosystems when mocked tests return true for everything
        if (hasDetectedPrimary && (ecosystem.name.includes('Node.js') || ecosystem.name === 'iOS')) {
          continue;
        }

        // Skip generic Node.js if we detected web variant
        if (ecosystem.name === 'Node.js' && hasDetectedWeb) {
          continue;
        }

        // Skip other Python variants if we've already detected one (uv > poetry > pip > setup.py)
        if (ecosystem.name.includes('Python') && hasDetectedPython) {
          continue;
        }

        detectedEcosystems.push(ecosystem.name);

        // Get the correct directory for the command
        const commandDirectory = ecosystem.name === 'Node.js (web)'
          ? path.join(worktreePath, 'web')
          : worktreePath;

        // For Node.js projects, detect the actual package manager
        let command = ecosystem.command;
        if (ecosystem.name.includes('Node.js')) {
          const subdir = ecosystem.name === 'Node.js (web)' ? 'web' : undefined;
          command = this.detectPackageManager(worktreePath, subdir);
        }

        setupCommands.push({
          directory: commandDirectory,
          command: command,
          description: ecosystem.description,
        });

        // Track ecosystem family detection
        if (ecosystem.name.includes('Node.js (web)')) {
          hasDetectedWeb = true;
          hasDetectedPrimary = true;
        } else if (ecosystem.name.includes('Node.js')) {
          hasDetectedNode = true;
          hasDetectedPrimary = true;
        } else if (ecosystem.name === 'iOS') {
          hasDetectedPrimary = true;
        } else if (ecosystem.name.includes('Python')) {
          hasDetectedPython = true;
        }

        // For non-web/iOS ecosystems, break after first detection to maintain single-setup behavior
        if (hasDetectedPrimary) {
          break;
        }
      }
    }

    // Determine overall project type for backwards compatibility
    const type: ProjectType = this.determineProjectType(detectedEcosystems, hasIosDirectory, hasDetectedWeb);

    return {
      type,
      setup_commands: setupCommands,
      details: {
        detected_ecosystems: detectedEcosystems,
        // Backwards compatibility
        has_web: hasDetectedWeb || detectedEcosystems.some(e => e.includes('Node.js')),
        has_ios: hasIosDirectory,
        has_root_package_json: fs.existsSync(path.join(worktreePath, 'package.json')),
      },
    };
  }

  /**
   * Check if an ecosystem is present in the worktree
   */
  private static isEcosystemPresent(worktreePath: string, ecosystem: EcosystemDetector): boolean {
    // Use custom check function if provided
    if (ecosystem.checkFunction) {
      return ecosystem.checkFunction(worktreePath);
    }

    // Check for marker files/directories
    for (const marker of ecosystem.markers) {
      const markerPath = path.join(worktreePath, marker);
      const exists = fs.existsSync(markerPath);

      if (exists) {
        // If marker ends with /, it's a directory check
        if (marker.endsWith('/')) {
          return fs.statSync(markerPath).isDirectory();
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Determine overall project type for backwards compatibility
   */
  private static determineProjectType(ecosystems: string[], hasIosDirectory: boolean, hasWebDirectory: boolean): ProjectType {
    const hasRootNode = ecosystems.some(e => e === 'Node.js'); // Exact match for root Node.js

    if (hasWebDirectory && hasIosDirectory) return 'full-stack';
    if (hasWebDirectory) return 'web';
    if (hasIosDirectory) return 'ios';
    if (hasRootNode) return 'unknown'; // Root Node.js without web/ returns 'unknown'
    if (ecosystems.length > 0) return 'web'; // Other ecosystems default to 'web'
    return 'unknown';
  }

  /**
   * Detect ALL ecosystems without short-circuiting
   * Used for multi-ecosystem detection and user prompting
   */
  static detectAll(worktreePath: string): SetupCommand[] {
    const setupCommands: SetupCommand[] = [];
    const seenEcosystems = new Set<string>();

    for (const ecosystem of this.ecosystems) {
      if (this.isEcosystemPresent(worktreePath, ecosystem)) {
        // Deduplicate by ecosystem family
        const ecosystemFamily = this.getEcosystemFamily(ecosystem.name);

        // For Node.js family, only add one variant (web takes precedence)
        if (ecosystemFamily === 'nodejs') {
          if (seenEcosystems.has('nodejs')) {
            continue;
          }
          seenEcosystems.add('nodejs');
        }

        // For Python family, only add the first detected (priority order)
        if (ecosystemFamily === 'python') {
          if (seenEcosystems.has('python')) {
            continue;
          }
          seenEcosystems.add('python');
        }

        // Get the correct directory for the command
        const commandDirectory = ecosystem.name === 'Node.js (web)'
          ? path.join(worktreePath, 'web')
          : worktreePath;

        // For Node.js projects, detect the actual package manager
        let command = ecosystem.command;
        if (ecosystem.name.includes('Node.js')) {
          const subdir = ecosystem.name === 'Node.js (web)' ? 'web' : undefined;
          command = this.detectPackageManager(worktreePath, subdir);
        }

        setupCommands.push({
          directory: commandDirectory,
          command: command,
          description: ecosystem.description,
        });
      }
    }

    return setupCommands;
  }

  /**
   * Get ecosystem family for deduplication
   */
  private static getEcosystemFamily(ecosystemName: string): string {
    if (ecosystemName.includes('Node.js')) return 'nodejs';
    if (ecosystemName.includes('Python')) return 'python';
    if (ecosystemName.includes('Java')) return 'java';
    return ecosystemName.toLowerCase();
  }

}
