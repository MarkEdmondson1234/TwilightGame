#!/usr/bin/env node
/**
 * Asset Optimization Script
 *
 * This script optimizes game assets for production:
 * 1. Creates sprite sheets from character animation frames
 * 2. Resizes and compresses individual tile images
 * 3. Preserves originals in /public/assets/
 * 4. Outputs optimized assets to /public/assets-optimized/
 *
 * Run: npm run optimize-assets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import sharp from 'sharp';
import Spritesmith from 'spritesmith';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '../public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const OPTIMIZED_DIR = path.join(PUBLIC_DIR, 'assets-optimized');

// Configuration
const SPRITE_SIZE = 256; // Resize character sprites to 256x256
const TILE_SIZE = 128;    // Resize tile images to 128x128 (less aggressive)
const LARGE_FURNITURE_SIZE = 512; // Larger size for multi-tile furniture like beds
const COMPRESSION_QUALITY = 85; // PNG compression quality
const HIGH_QUALITY = 95; // Higher quality for detailed furniture
const ANIMATION_SIZE = 512; // Resize animated GIFs to 512x512 (good balance for effects)

console.log('🎨 Starting asset optimization...\n');

// Create optimized directory structure
function createDirectories() {
  const dirs = [
    OPTIMIZED_DIR,
    path.join(OPTIMIZED_DIR, 'character1'),
    path.join(OPTIMIZED_DIR, 'tiles'),
    path.join(OPTIMIZED_DIR, 'farming'),
    path.join(OPTIMIZED_DIR, 'npcs'),
    path.join(OPTIMIZED_DIR, 'animations')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Generate sprite sheet for character animations
async function generateCharacterSpriteSheets() {
  console.log('📦 Generating character sprite sheets...');

  const baseDir = path.join(ASSETS_DIR, 'character1/base');
  if (!fs.existsSync(baseDir)) {
    console.log('⚠️  No character base sprites found, skipping...');
    return;
  }

  const directions = ['down', 'up', 'left', 'right'];

  for (const direction of directions) {
    const frames = [];

    // Collect all frames for this direction (0-3)
    for (let i = 0; i <= 3; i++) {
      const framePath = path.join(baseDir, `${direction}_${i}.png`);
      if (fs.existsSync(framePath)) {
        frames.push(framePath);
      }
    }

    if (frames.length === 0) {
      console.log(`  ⚠️  No frames found for ${direction}`);
      continue;
    }

    // First, resize all frames to target size
    const resizedFrames = [];
    const tempDir = path.join(OPTIMIZED_DIR, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    for (let i = 0; i < frames.length; i++) {
      const tempPath = path.join(tempDir, `${direction}_${i}.png`);
      await sharp(frames[i])
        .resize(SPRITE_SIZE, SPRITE_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: COMPRESSION_QUALITY, compressionLevel: 9 })
        .toFile(tempPath);
      resizedFrames.push(tempPath);
    }

    // Generate sprite sheet from resized frames
    await new Promise((resolve, reject) => {
      Spritesmith.run({ src: resizedFrames }, async (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        const outputPath = path.join(OPTIMIZED_DIR, 'character1', `${direction}.png`);
        const metadataPath = path.join(OPTIMIZED_DIR, 'character1', `${direction}.json`);

        // Save sprite sheet
        await sharp(result.image)
          .png({ quality: COMPRESSION_QUALITY, compressionLevel: 9 })
          .toFile(outputPath);

        // Save metadata (frame positions)
        const metadata = {
          frames: {},
          meta: {
            size: { w: result.properties.width, h: result.properties.height },
            frameSize: { w: SPRITE_SIZE, h: SPRITE_SIZE }
          }
        };

        Object.keys(result.coordinates).forEach((framePath, index) => {
          const coords = result.coordinates[framePath];
          metadata.frames[index] = {
            x: coords.x,
            y: coords.y,
            w: coords.width,
            h: coords.height
          };
        });

        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        const originalSizes = frames.map(f => fs.statSync(f).size);
        const totalOriginal = originalSizes.reduce((a, b) => a + b, 0);
        const optimizedSize = fs.statSync(outputPath).size;
        const savings = ((1 - optimizedSize / totalOriginal) * 100).toFixed(1);

        console.log(`  ✅ ${direction}: ${frames.length} frames → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);

        resolve();
      });
    });

    // Clean up temp files
    resizedFrames.forEach(f => fs.unlinkSync(f));
  }

  // Clean up temp directory
  const tempDir = path.join(OPTIMIZED_DIR, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmdirSync(tempDir);
  }

  console.log('');
}

// Optimize individual tile images
async function optimizeTiles() {
  console.log('🎨 Optimizing tile images...');

  const tilesDir = path.join(ASSETS_DIR, 'tiles');
  if (!fs.existsSync(tilesDir)) {
    console.log('⚠️  No tile images found, skipping...');
    return;
  }

  const files = fs.readdirSync(tilesDir);
  let optimized = 0;

  for (const file of files) {
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    const inputPath = path.join(tilesDir, file);
    const outputPath = path.join(OPTIMIZED_DIR, 'tiles', file.replace(/\.jpeg$/i, '.png'));

    const originalSize = fs.statSync(inputPath).size;

    // Special handling for large furniture (beds, sofas, rugs, tables, stoves, chimneys, etc.) - keep higher resolution and quality
    if (file.includes('tree_cherry') || file.includes('bed') || file.includes('sofa') || file.includes('rug') || file.includes('cottage') || file.includes('table') || file.includes('stove') || file.includes('chimney')) {
      await sharp(inputPath)
        .resize(LARGE_FURNITURE_SIZE, LARGE_FURNITURE_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: HIGH_QUALITY, compressionLevel: 6 }) // Higher quality, less compression
        .toFile(outputPath);
    }
    // Special handling for brick/wall textures - crop center instead of scaling down
    else if (file.includes('brick') || file.includes('wall')) {
      const metadata = await sharp(inputPath).metadata();
      const cropSize = Math.min(metadata.width, metadata.height) / 5; // Take center 1/5th for medium-sized bricks

      await sharp(inputPath)
        .extract({
          left: Math.floor((metadata.width - cropSize) / 2),
          top: Math.floor((metadata.height - cropSize) / 2),
          width: Math.floor(cropSize),
          height: Math.floor(cropSize)
        })
        .resize(TILE_SIZE, TILE_SIZE, {
          fit: 'cover',
          position: 'centre'
        })
        .png({ quality: COMPRESSION_QUALITY, compressionLevel: 9 })
        .toFile(outputPath);
    } else {
      // Regular tiles - scale to fit
      await sharp(inputPath)
        .resize(TILE_SIZE, TILE_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: COMPRESSION_QUALITY, compressionLevel: 9 })
        .toFile(outputPath);
    }

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    console.log(`  ✅ ${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
    optimized++;
  }

  console.log(`\n  Optimized ${optimized} tile images\n`);
}

// Optimize farming sprites
async function optimizeFarming() {
  console.log('🌾 Optimizing farming sprites...');

  const farmingDir = path.join(ASSETS_DIR, 'farming');
  if (!fs.existsSync(farmingDir)) {
    console.log('⚠️  No farming sprites found, skipping...');
    return;
  }

  const files = fs.readdirSync(farmingDir);
  let optimized = 0;

  for (const file of files) {
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    const inputPath = path.join(farmingDir, file);
    const outputPath = path.join(OPTIMIZED_DIR, 'farming', file.replace(/\.jpeg$/i, '.png'));

    const originalSize = fs.statSync(inputPath).size;

    // Farming tiles - scale to fit tile size
    await sharp(inputPath)
      .resize(TILE_SIZE, TILE_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: COMPRESSION_QUALITY, compressionLevel: 9 })
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    console.log(`  ✅ ${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
    optimized++;
  }

  console.log(`\n  Optimized ${optimized} farming sprites\n`);
}

// Optimize NPC sprites
async function optimizeNPCs() {
  console.log('👥 Optimizing NPC sprites...');

  const npcsDir = path.join(ASSETS_DIR, 'npcs');
  if (!fs.existsSync(npcsDir)) {
    console.log('⚠️  No NPC sprites found, skipping...');
    return;
  }

  const files = fs.readdirSync(npcsDir);
  let optimized = 0;

  for (const file of files) {
    if (!file.match(/\.(png|svg)$/i)) continue;

    const inputPath = path.join(npcsDir, file);
    const outputPath = path.join(OPTIMIZED_DIR, 'npcs', file);

    // SVGs - just copy (they're already small)
    if (file.endsWith('.svg')) {
      fs.copyFileSync(inputPath, outputPath);
      continue;
    }

    // PNGs - resize and compress
    const originalSize = fs.statSync(inputPath).size;

    await sharp(inputPath)
      .resize(SPRITE_SIZE, SPRITE_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: COMPRESSION_QUALITY, compressionLevel: 9 })
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    console.log(`  ✅ ${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
    optimized++;
  }

  console.log(`\n  Optimized ${optimized} NPC sprites\n`);
}

// Check if gifsicle is installed
function hasGifsicle() {
  try {
    execSync('which gifsicle', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Optimize animated GIFs
async function optimizeAnimations() {
  console.log('🎬 Optimizing animated GIFs...');

  const animationsDir = path.join(ASSETS_DIR, 'animations');
  if (!fs.existsSync(animationsDir)) {
    console.log('⚠️  No animations found, skipping...');
    return;
  }

  const files = fs.readdirSync(animationsDir);
  let optimized = 0;
  const hasGifsicleInstalled = hasGifsicle();

  if (!hasGifsicleInstalled) {
    console.log('⚠️  gifsicle not found - GIFs will be copied without optimization');
    console.log('   Install with: brew install gifsicle (macOS) or apt-get install gifsicle (Linux)\n');
  }

  for (const file of files) {
    if (!file.match(/\.gif$/i)) continue;

    const inputPath = path.join(animationsDir, file);
    const outputPath = path.join(OPTIMIZED_DIR, 'animations', file);

    const originalSize = fs.statSync(inputPath).size;

    if (hasGifsicleInstalled) {
      try {
        // Optimize GIF with gifsicle: resize and optimize
        execSync(
          `gifsicle --resize ${ANIMATION_SIZE}x${ANIMATION_SIZE} --optimize=3 --colors 256 "${inputPath}" -o "${outputPath}"`,
          { stdio: 'pipe' }
        );

        const optimizedSize = fs.statSync(outputPath).size;
        const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

        console.log(`  ✅ ${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
      } catch (error) {
        console.log(`  ⚠️  ${file}: optimization failed, copying original`);
        fs.copyFileSync(inputPath, outputPath);
      }
    } else {
      // Just copy if gifsicle not available
      fs.copyFileSync(inputPath, outputPath);
      console.log(`  ℹ️  ${file}: ${(originalSize / 1024).toFixed(1)}KB (copied without optimization)`);
    }

    optimized++;
  }

  console.log(`\n  Processed ${optimized} animation file(s)\n`);
}

// Main execution
async function main() {
  try {
    createDirectories();
    await generateCharacterSpriteSheets();
    await optimizeTiles();
    await optimizeFarming();
    await optimizeNPCs();
    await optimizeAnimations();

    console.log('✨ Asset optimization complete!');
    console.log(`📁 Optimized assets saved to: ${OPTIMIZED_DIR}`);
  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

main();
