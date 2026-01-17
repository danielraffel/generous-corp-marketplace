#!/usr/bin/env node

/**
 * Design Partner - Provider Test Suite
 * Tests image generation providers with simple prompts
 */

import { generateImage } from './image-generator.js';
import { detectApiKeys } from './detect-api-keys.js';

const TEST_PROMPT = "A simple red circle on a white background";

/**
 * Test a single provider
 *
 * @param {string} provider - Provider name (openai|gemini)
 * @returns {Promise<Object>} Test result
 */
async function testProvider(provider) {
  console.log(`\nTesting ${provider}...`);

  const startTime = Date.now();
  const result = await generateImage({
    prompt: TEST_PROMPT,
    provider,
    size: '1024x1024'
  });
  const duration = Date.now() - startTime;

  if (result.success) {
    console.log(`Success`);
    console.log(`   Response time: ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Cost: $${result.cost.toFixed(3)}`);
    if (result.imageUrl) {
      console.log(`   Image URL: ${result.imageUrl.substring(0, 50)}...`);
    }
    if (result.imageBase64) {
      console.log(`   Image data: Base64 encoded (${result.imageBase64.length} chars)`);
    }
    if (result.revisedPrompt) {
      console.log(`   Revised prompt: ${result.revisedPrompt.substring(0, 60)}...`);
    }
  } else {
    console.log(`Failed`);
    console.log(`   Error: ${result.error}`);
  }

  return result;
}

/**
 * Run all provider tests
 */
async function runTests() {
  console.log('Image Generation Provider Tests\n');
  console.log('='.repeat(50));

  const detection = detectApiKeys();

  console.log('\nDetected providers:');
  console.log(`  OpenAI: ${detection.hasOpenAI ? 'Configured' : 'Not configured'}`);
  console.log(`  Gemini: ${detection.hasGemini ? 'Configured' : 'Not configured'}`);

  if (!detection.hasOpenAI && !detection.hasGemini) {
    console.log('\nNo providers configured. Please set up API keys first.');
    console.log('See .env.example for configuration options.');
    process.exit(1);
  }

  const results = {};

  if (detection.hasOpenAI) {
    results.openai = await testProvider('openai');
  }

  if (detection.hasGemini) {
    results.gemini = await testProvider('gemini');
  }

  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`  Tests run: ${Object.keys(results).length}`);
  console.log(`  Passed: ${Object.values(results).filter(r => r.success).length}`);
  console.log(`  Failed: ${Object.values(results).filter(r => !r.success).length}`);

  const totalCost = Object.values(results)
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.cost, 0);
  console.log(`  Total cost: $${totalCost.toFixed(3)}`);

  console.log('\n');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error.message);
  process.exit(1);
});
