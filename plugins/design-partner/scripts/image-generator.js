#!/usr/bin/env node

/**
 * Design Partner - Image Generator
 * Generates images using DALL-E 3 or Gemini Imagen
 * Based on the egyptology pattern
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectApiKeys } from './detect-api-keys.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load API keys into environment if not already set
const detection = detectApiKeys();
if (detection.keys.openai && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = detection.keys.openai;
}
if (detection.keys.gemini && !process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = detection.keys.gemini;
}

/**
 * Generate image using specified provider
 *
 * @param {Object} options - Generation options
 * @param {string} options.prompt - Image description prompt
 * @param {string} [options.provider='openai'] - Provider to use (openai|gemini)
 * @param {string} [options.size='1024x1024'] - Image size
 * @param {string} [options.quality='standard'] - Quality level (DALL-E: standard|hd, Gemini: pro|flash)
 * @returns {Promise<Object>} Generation result with image data and metadata
 */
export async function generateImage({
  prompt,
  provider = 'openai',
  size = '1024x1024',
  quality = 'standard'
}) {
  const startTime = Date.now();

  try {
    let result;

    if (provider === 'openai') {
      result = await generateWithDallE(prompt, size, quality);
    } else if (provider === 'gemini') {
      result = await generateWithGemini(prompt, size, quality);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const generationTime = (Date.now() - startTime) / 1000;

    return {
      success: true,
      ...result,
      generationTime
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      provider,
      generationTime: (Date.now() - startTime) / 1000
    };
  }
}

/**
 * DALL-E 3 generation
 */
async function generateWithDallE(prompt, size, quality) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment');
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size,
      quality,
      n: 1
    })
  });

  if (!response.ok) {
    const error = await response.json();

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Try again in 1 minute.');
    }

    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key');
    }

    if (error.error?.code === 'content_policy_violation') {
      throw new Error('Prompt violated content policy');
    }

    throw new Error(error.error?.message || 'DALL-E generation failed');
  }

  const data = await response.json();
  const imageData = data.data[0];

  const cost = quality === 'hd' ? 0.080 : 0.040;

  return {
    imageUrl: imageData.url,
    revisedPrompt: imageData.revised_prompt,
    provider: 'openai',
    cost,
    size,
    quality
  };
}

/**
 * Gemini image generation using Nano Banana models
 * Supports both Gemini 3 Pro (default) and Gemini 2.5 Flash
 * Based on working implementation from egyptology
 *
 * @param {string} prompt - Image generation prompt
 * @param {string} size - Image size (1024x1024, 1792x1024, 1024x1792)
 * @param {string} quality - Model quality: 'pro' (default) or 'flash'
 */
async function generateWithGemini(prompt, size, quality = 'pro') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in environment');
  }

  // Map size to aspect ratio
  const aspectRatio = size === '1792x1024' ? '16:9' :
                      size === '1024x1792' ? '9:16' : '1:1';

  // Select model based on quality parameter
  const model = quality === 'flash'
    ? 'gemini-2.5-flash-image'
    : 'gemini-3-pro-image-preview';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Gemini generation failed';

    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || errorText;
    } catch {
      errorMessage = errorText;
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid Gemini API key');
    }

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Try again in 1 minute.');
    }

    if (response.status === 503) {
      throw new Error('Service temporarily overloaded. Try again in a moment.');
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Extract image from inline_data format
  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new Error('No candidates in response');
  }

  const imagePart = candidate.content?.parts?.find(
    (part) => part.inline_data?.mime_type?.startsWith('image/')
  );

  if (!imagePart || !imagePart.inline_data?.data) {
    throw new Error('No image data in response');
  }

  // Extract base64 image data
  const imageBase64 = imagePart.inline_data.data;

  return {
    imageBase64,
    provider: 'gemini',
    cost: 0.00, // Currently free during preview (pricing may change)
    size,
    aspectRatio,
    model: model,
    quality: quality
  };
}

/**
 * Download image from URL to local file
 *
 * @param {string} url - Image URL
 * @param {string} outputPath - Local file path to save
 * @returns {Promise<string>} Path to saved file
 */
export async function downloadImage(url, outputPath) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}

/**
 * Save base64 image to file
 *
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} outputPath - Local file path to save
 * @returns {Promise<string>} Path to saved file
 */
export async function saveBase64Image(base64Data, outputPath) {
  const buffer = Buffer.from(base64Data, 'base64');
  await fs.writeFile(outputPath, buffer);
  return outputPath;
}


// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const prompt = process.argv[2];
  const provider = process.argv[3] || 'openai';

  if (!prompt) {
    console.log('Usage: node image-generator.js "prompt" [provider]');
    console.log('Example: node image-generator.js "A modern mobile app interface" openai');
    process.exit(1);
  }

  const result = await generateImage({ prompt, provider });
  console.log(JSON.stringify(result, null, 2));
}
