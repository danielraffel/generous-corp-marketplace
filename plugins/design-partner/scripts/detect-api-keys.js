#!/usr/bin/env node

/**
 * Design Partner - API Key Detection
 * Detects and validates API keys from multiple sources
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse .env file manually (no dependencies needed)
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      value = value.replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });

  return env;
}

/**
 * Detect API keys from multiple sources
 * Checks in order: plugin .env, project .env, process.env
 *
 * @returns {Object} Detection results with keys and sources
 */
export function detectApiKeys() {
  const sources = [];
  const keys = {
    openai: null,
    gemini: null,
    geminiProjectId: null
  };

  // 1. Check .env in plugin root
  const pluginEnv = path.join(__dirname, '..', '.env');
  if (fs.existsSync(pluginEnv)) {
    const envVars = parseEnvFile(pluginEnv);
    if (envVars.OPENAI_API_KEY) {
      keys.openai = envVars.OPENAI_API_KEY;
      sources.push('.env (plugin root)');
    }
    if (envVars.GEMINI_API_KEY) {
      keys.gemini = envVars.GEMINI_API_KEY;
      sources.push('.env (plugin root)');
    }
    if (envVars.GEMINI_PROJECT_ID) {
      keys.geminiProjectId = envVars.GEMINI_PROJECT_ID;
      sources.push('.env (plugin root)');
    }
  }

  // 2. Check .env in project root (go up to plugins, then marketplace)
  const projectEnv = path.join(__dirname, '..', '..', '..', '.env');
  if (fs.existsSync(projectEnv)) {
    const envVars = parseEnvFile(projectEnv);
    if (envVars.OPENAI_API_KEY && !keys.openai) {
      keys.openai = envVars.OPENAI_API_KEY;
      sources.push('.env (project root)');
    }
    if (envVars.GEMINI_API_KEY && !keys.gemini) {
      keys.gemini = envVars.GEMINI_API_KEY;
      sources.push('.env (project root)');
    }
    if (envVars.GEMINI_PROJECT_ID && !keys.geminiProjectId) {
      keys.geminiProjectId = envVars.GEMINI_PROJECT_ID;
      sources.push('.env (project root)');
    }
  }

  // 3. Check process.env (bash profile, etc.)
  if (process.env.OPENAI_API_KEY && !keys.openai) {
    keys.openai = process.env.OPENAI_API_KEY;
    sources.push('OPENAI_API_KEY from environment');
  }

  if (process.env.GEMINI_API_KEY && !keys.gemini) {
    keys.gemini = process.env.GEMINI_API_KEY;
    sources.push('GEMINI_API_KEY from environment');
  }

  if (process.env.GEMINI_PROJECT_ID && !keys.geminiProjectId) {
    keys.geminiProjectId = process.env.GEMINI_PROJECT_ID;
    sources.push('GEMINI_PROJECT_ID from environment');
  }

  return {
    keys,
    sources,
    hasOpenAI: !!keys.openai,
    hasGemini: !!keys.gemini || !!keys.geminiProjectId
  };
}

/**
 * Check if .env file is properly protected
 *
 * @returns {Object} Security check results
 */
export function checkEnvSecurity() {
  const gitignorePath = path.join(__dirname, '..', '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return {
      protected: false,
      warning: '.gitignore file not found'
    };
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  const hasEnv = gitignoreContent.includes('.env');

  return {
    protected: hasEnv,
    warning: hasEnv ? null : '.env is not in .gitignore - API keys could be committed to git!'
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = detectApiKeys();
  const security = checkEnvSecurity();

  console.log('API Key Detection Results\n');

  if (result.hasOpenAI) {
    console.log('OpenAI DALL-E 3: Configured');
    console.log(`   Key: ${result.keys.openai.substring(0, 20)}...`);
  } else {
    console.log('OpenAI DALL-E 3: Not configured');
  }

  console.log('');

  if (result.hasGemini) {
    console.log('Google Gemini: Configured');
    if (result.keys.gemini) {
      console.log(`   Key: ${result.keys.gemini.substring(0, 20)}...`);
    }
    if (result.keys.geminiProjectId) {
      console.log(`   Project: ${result.keys.geminiProjectId}`);
    }
  } else {
    console.log('Google Gemini: Not configured');
  }

  if (result.sources.length > 0) {
    console.log('\nSources checked:');
    result.sources.forEach(source => console.log(`  - ${source}`));
  }

  if (!result.hasOpenAI && !result.hasGemini) {
    console.log('\nNo image generation providers configured.');
    console.log('Run /dp:providers setup to get started.');
  }

  console.log('');

  // Security check
  if (!security.protected && security.warning) {
    console.log(`WARNING: ${security.warning}`);
  } else if (security.protected) {
    console.log('Security: .env file is properly protected in .gitignore');
  }
}
