#!/usr/bin/env node

/**
 * Design Partner - Gallery Generator
 * Generates an HTML gallery of all generated images
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, content: content };
  }

  const frontmatter = yaml.load(match[1]);
  const markdownContent = match[2];

  return { frontmatter, content: markdownContent };
}

/**
 * Generate gallery HTML from state file
 */
async function generateGallery(stateFilePath, outputPath) {
  try {
    // Read state file
    const stateContent = await fs.readFile(stateFilePath, 'utf-8');
    const { frontmatter } = parseFrontmatter(stateContent);

    // Extract images and session data
    const images = frontmatter.generated_images || [];
    const sessionData = {
      project_name: frontmatter.project_name || frontmatter.design_brief?.project_name,
      challenge: frontmatter.design_brief?.challenge
    };

    // Read gallery template
    const templatePath = path.join(__dirname, 'gallery-template.html');
    const template = await fs.readFile(templatePath, 'utf-8');

    // Fix image paths - strip 'artifacts/' prefix since gallery is also in artifacts/
    const processedImages = images.map(img => {
      let imagePath = img.file_path;
      // If path starts with 'artifacts/', remove it for relative path from gallery
      if (imagePath.startsWith('artifacts/')) {
        imagePath = imagePath.replace('artifacts/', '');
      }
      return {
        ...img,
        file_path: imagePath,
        full_path: path.join(path.dirname(outputPath), imagePath)
      };
    });

    // Inject data into template
    const html = template
      .replace('__IMAGES_DATA__', JSON.stringify(processedImages, null, 2))
      .replace('__SESSION_DATA__', JSON.stringify(sessionData, null, 2));

    // Write gallery HTML
    await fs.writeFile(outputPath, html, 'utf-8');

    return {
      success: true,
      imageCount: images.length,
      galleryPath: outputPath
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const stateFilePath = process.argv[2];
  const outputPath = process.argv[3];

  if (!stateFilePath || !outputPath) {
    console.log('Usage: node generate-gallery.js <state-file-path> <output-html-path>');
    console.log('Example: node generate-gallery.js .claude/dp.local.md artifacts/gallery.html');
    process.exit(1);
  }

  const result = await generateGallery(stateFilePath, outputPath);
  console.log(JSON.stringify(result, null, 2));
}

export { generateGallery };
