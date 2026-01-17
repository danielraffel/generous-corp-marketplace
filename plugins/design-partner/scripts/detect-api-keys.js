#!/usr/bin/env node

/**
 * Design Partner - API Key Detection
 * Detects and validates API keys from multiple sources
 */

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    config({ path: pluginEnv });
    sources.push('.env (plugin root)');
  }

  // 2. Check .env in project root (go up to plugins, then marketplace)
  const projectEnv = path.join(__dirname, '..', '..', '..', '.env');
  if (fs.existsSync(projectEnv)) {
    config({ path: projectEnv });
    sources.push('.env (project root)');
  }

  // 3. Check process.env (bash profile, etc.)
  if (process.env.OPENAI_API_KEY) {
    keys.openai = process.env.OPENAI_API_KEY;
    if (!sources.includes('OPENAI_API_KEY from environment')) {
      sources.push('OPENAI_API_KEY from environment');
    }
  }

  if (process.env.GEMINI_API_KEY) {
    keys.gemini = process.env.GEMINI_API_KEY;
    if (!sources.includes('GEMINI_API_KEY from environment')) {
      sources.push('GEMINI_API_KEY from environment');
    }
  }

  if (process.env.GEMINI_PROJECT_ID) {
    keys.geminiProjectId = process.env.GEMINI_PROJECT_ID;
    if (!sources.includes('GEMINI_PROJECT_ID from environment')) {
      sources.push('GEMINI_PROJECT_ID from environment');
    }
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
