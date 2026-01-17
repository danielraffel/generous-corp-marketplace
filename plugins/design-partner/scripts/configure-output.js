#!/usr/bin/env node

/**
 * Design Partner - Output Path Configuration
 * Determines where to save generated images based on user preferences
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detect if current directory is a git repository
 */
function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the git root directory
 */
function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8'
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Get configured output path from state file or determine default
 *
 * Priority:
 * 1. Explicitly configured path in .claude/dp.local.md
 * 2. DEFAULT: ~/Downloads/design-partner-[session-id] (most discoverable)
 * 3. Git repo option available if user configures it
 * 4. Plugin cache option available if user configures it
 */
async function getOutputPath(stateFilePath, pluginRoot) {
  let outputPathPreference = null;
  let sessionId = null;

  // Try to read state file for existing config
  try {
    const stateContent = await fs.readFile(stateFilePath, 'utf-8');
    const frontmatterMatch = stateContent.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];

      // Extract output_path_preference
      const pathMatch = frontmatter.match(/output_path_preference:\s*"([^"]+)"/);
      if (pathMatch) {
        outputPathPreference = pathMatch[1];
      }

      // Extract or create session_id
      const sessionMatch = frontmatter.match(/session_id:\s*"([^"]+)"/);
      if (sessionMatch) {
        sessionId = sessionMatch[1];
      }
    }
  } catch (error) {
    // State file doesn't exist yet
  }

  // Generate session ID if not found
  if (!sessionId) {
    sessionId = uuidv4().split('-')[0]; // Use first 8 chars of UUID
  }

  // Determine output path based on preference
  // Default: Downloads folder (most discoverable)
  let outputPath;

  if (outputPathPreference === 'git-repo') {
    // Option A: Git repo (only if explicitly configured)
    const gitRoot = getGitRoot();
    if (gitRoot) {
      outputPath = path.join(gitRoot, '.claude', 'design-partner', 'artifacts');
    } else {
      outputPath = path.join(process.env.HOME, 'Downloads', `design-partner-${sessionId}`);
    }
  } else if (outputPathPreference === 'plugin-cache') {
    // Option D: Plugin cache (hidden)
    outputPath = path.join(pluginRoot, 'artifacts');
  } else if (outputPathPreference && outputPathPreference !== 'downloads') {
    // Option B: Custom path (expand ~ if needed)
    outputPath = outputPathPreference.replace(/^~/, process.env.HOME);
  } else {
    // Option C (DEFAULT): Downloads folder - easy to find
    outputPath = path.join(process.env.HOME, 'Downloads', `design-partner-${sessionId}`);
  }

  return {
    outputPath,
    sessionId,
    preference: outputPathPreference || 'auto',
    isGitRepo: isGitRepo(),
    gitRoot: getGitRoot()
  };
}

/**
 * Create output directories
 */
async function ensureOutputDirectories(outputPath) {
  await fs.mkdir(path.join(outputPath, 'images'), { recursive: true });
  return {
    imagesDir: path.join(outputPath, 'images'),
    galleryPath: path.join(outputPath, 'gallery.html')
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const stateFilePath = process.argv[2] || `${process.env.PWD}/.claude/dp.local.md`;
  const pluginRoot = process.argv[3] || process.env.CLAUDE_PLUGIN_ROOT;

  const config = await getOutputPath(stateFilePath, pluginRoot);
  const paths = await ensureOutputDirectories(config.outputPath);

  console.log(JSON.stringify({
    ...config,
    ...paths
  }, null, 2));
}

export { getOutputPath, ensureOutputDirectories, isGitRepo, getGitRoot };
