#!/usr/bin/env node
/**
 * Asset Optimization Script
 *
 * This script optimizes game assets for production:
 * 1. Creates sprite sheets from character animation frames
 * 2. Resizes and compresses individual tile images
 * 3. Preserves originals in /public/assets/
 * 4. Outputs optimized assets to /public/assets-optimized/
 * 5. Validates all PNGs are in RGBA format (not 8-bit colormap)
 * 6. Normalizes all output filenames to lowercase
 *
 * IMPORTANT: Cross-Platform Compatibility (Windows/macOS)
 * -------------------------------------------------------
 * Windows filesystems are case-insensitive, which can create files with
 * mixed casing (e.g., "Spruce_tree.PNG" instead of "spruce_tree.png").
 * These files work locally but break when:
 * - Deployed to case-sensitive servers (Linux, most web hosts)
 * - Referenced with lowercase paths in code (assets.ts)
 * - Fetched by Vite's dev server (case-sensitive URL matching)
 *
 * This script normalizes ALL output filenames to lowercase using the
 * normalizePathCase() function to ensure consistency across platforms.
 *
 * IMPORTANT: PixiJS v8 Compatibility
 * ----------------------------------
 * PixiJS v8 CANNOT decode 8-bit colormap (indexed color) PNGs.
 * All PNG outputs must use `palette: false` in Sharp options to ensure
 * RGBA format output. The script includes a final validation step that
 * scans for and fixes any 8-bit colormap PNGs automatically.
 *
 * If you see "InvalidStateError: The source image could not be decoded"
 * in the browser console, it means a PNG is in 8-bit colormap format.
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

// Configuration - Image Showcase Quality
// This game prioritises beautiful artwork, so we use higher resolutions than typical games
const SPRITE_SIZE = 1024; // Resize character sprites to 1024x1024 (highest quality - main character is most important)
const NPC_SIZE = 1024; // Resize NPC sprites to 1024x1024 (match player quality for consistency)
const TILE_SIZE = 256;    // Resize tile images to 256x256 (4x game render size, preserves detail)
const FARMING_PLANT_SIZE = 512; // Larger size for farming plant sprites (crops are key visual elements)
const FLOWER_SIZE = 768; // Larger size for decorative flowers like iris (2x2 multi-tile sprites)
const LARGE_FURNITURE_SIZE = 768; // Larger size for multi-tile furniture like beds, sofas (showcase quality)
const TREE_SIZE = 1024; // Extra large for trees (major visual elements, worth the extra quality)
const SHOP_SIZE = 1024; // Extra large for shop buildings (6x6 tiles with lots of detail)
const WITCH_HUT_SIZE = 1024; // Witch hut at 1024px for best quality (major landmark)
const COMPRESSION_QUALITY = 85; // PNG compression quality
const HIGH_QUALITY = 95; // Higher quality for detailed furniture
const SHOWCASE_QUALITY = 97; // Very high quality for showcase assets (trees, NPCs)
const SHOP_QUALITY = 98; // Very high quality for shop buildings (minimal compression)
const WITCH_HUT_QUALITY = 98; // Very high quality for witch hut (large building, minimal compression)
const ANIMATION_SIZE = 512; // Resize animated GIFs to 512x512 (good balance for effects)
const CUTSCENE_WIDTH = 1920; // Cutscene images: 1920x1080 (16:9 aspect ratio)
const CUTSCENE_HEIGHT = 1080;
const CUTSCENE_QUALITY = 92; // High quality for cutscenes (visible compression artifacts would be distracting)

console.log('🎨 Starting asset optimization...\n');

/**
 * Normalize a file path to lowercase for cross-platform compatibility.
 * Windows filesystems are case-insensitive, which can create files with
 * mixed casing (e.g., "Spruce_tree.PNG") that break on case-sensitive
 * servers or when referenced with lowercase in code.
 *
 * This function ensures all output filenames are lowercase.
 */
function normalizePathCase(filePath) {
  const dir = path.dirname(filePath);
  const ext = path.extname(filePath).toLowerCase(); // .PNG → .png
  const base = path.basename(filePath, path.extname(filePath)).toLowerCase();
  return path.join(dir, base + ext);
}

/**
 * Delete a file if it exists, handling case-sensitivity issues on Windows.
 * On Windows, if a file exists as "brambles_winter.PNG" and we try to write
 * "brambles_winter.png", Sharp will update the existing file but NOT rename it.
 * This causes issues when the code references the lowercase version.
 *
 * This function deletes the file first to ensure Sharp creates it with the
 * correct casing.
 */
function deleteIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Recursively get all files in a directory
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Create optimized directory structure (mirrors source structure)
function createDirectories() {
  const dirs = [
    OPTIMIZED_DIR,
    path.join(OPTIMIZED_DIR, 'character1'),
    path.join(OPTIMIZED_DIR, 'tiles'),
    path.join(OPTIMIZED_DIR, 'farming'),
    path.join(OPTIMIZED_DIR, 'npcs'),
    path.join(OPTIMIZED_DIR, 'animations'),
    path.join(OPTIMIZED_DIR, 'cutscenes'),
    path.join(OPTIMIZED_DIR, 'witchhut'),
    path.join(OPTIMIZED_DIR, 'cooking'),
    path.join(OPTIMIZED_DIR, 'cauldron'),
    path.join(OPTIMIZED_DIR, 'ui')
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
        .png({ palette: false, quality: SHOWCASE_QUALITY, compressionLevel: 4 }) // Showcase quality for main character
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
          .png({ palette: false, quality: SHOWCASE_QUALITY, compressionLevel: 4 }) // Showcase quality for main character
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

  const allFiles = getAllFiles(tilesDir);
  let optimized = 0;

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(tilesDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'tiles', relativePath.replace(/\.jpeg$/i, '.png')));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    // Special handling for witch hut - 20x20 tiles (1280x1280px)
    if (file.includes('witch_hut') || inputPath.includes('witchhut')) {
      await sharp(inputPath)
        .resize(WITCH_HUT_SIZE, WITCH_HUT_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ palette: false, quality: WITCH_HUT_QUALITY, compressionLevel: 3 }) // Very high quality, minimal compression
        .toFile(outputPath);
    }
    // Special handling for large multi-tile sprites (shop, cottage, mine entrance, garden shed) - extra large size with very high quality (minimal compression)
    else if (file.includes('shop') || file.includes('cottage') || file.includes('mine_entrance') || file.includes('garden_shed')) {
      await sharp(inputPath)
        .resize(SHOP_SIZE, SHOP_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ palette: false, quality: SHOP_QUALITY, compressionLevel: 3 }) // Very high quality, minimal compression
        .toFile(outputPath);
    }
    // Special handling for trees - highest resolution as they're major visual elements
    else if (file.includes('tree_') || file.includes('_tree') || file.includes('oak_') || file.includes('birch_') || file.includes('spruce_') || file.includes('willow_') || file.includes('fairy_oak') || file.includes('giant_mushroom')) {
      await sharp(inputPath)
        .resize(TREE_SIZE, TREE_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ palette: false, quality: SHOWCASE_QUALITY, compressionLevel: 4 }) // Showcase quality for trees
        .toFile(outputPath);
    }
    // Special handling for decorative flowers (iris, pond flowers, ferns, etc.) - multi-tile sprites need higher resolution
    else if (file.includes('iris') || inputPath.includes('wild_iris') || file.includes('pond_flowers') || file.includes('fern')) {
      await sharp(inputPath)
        .resize(FLOWER_SIZE, FLOWER_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ palette: false, quality: SHOWCASE_QUALITY, compressionLevel: 4 }) // Showcase quality for beautiful flowers
        .toFile(outputPath);
    }
    // Special handling for tuft grass - decorative ground cover with fine detail
    else if (file.includes('tuft') || inputPath.includes('tuft')) {
      await sharp(inputPath)
        .resize(FARMING_PLANT_SIZE, FARMING_PLANT_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: SHOWCASE_QUALITY, compressionLevel: 4 }) // Showcase quality to preserve grass blade detail
        .toFile(outputPath);
    }
    // Special handling for brambles - 2x2 multi-tile sprites at medium quality (512x512)
    else if (file.includes('brambles') || inputPath.includes('brambles')) {
      await sharp(inputPath)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ palette: false, quality: HIGH_QUALITY, compressionLevel: 6 }) // Higher quality for detailed thorns
        .toFile(outputPath);
    }
    // Special handling for large furniture (beds, sofas, rugs, tables, stoves, chimneys, etc.) - keep higher resolution and quality
    else if (file.includes('bed') || file.includes('sofa') || file.includes('rug') || file.includes('table') || file.includes('stove') || file.includes('chimney')) {
      await sharp(inputPath)
        .resize(LARGE_FURNITURE_SIZE, LARGE_FURNITURE_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ palette: false, quality: HIGH_QUALITY, compressionLevel: 6 }) // Higher quality, less compression
        .toFile(outputPath);
    }
    // Special handling for brick textures - crop center instead of scaling down
    // Note: Wooden walls should NOT be cropped (they need to show all boards)
    else if (file.includes('brick') && !file.includes('wall')) {
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
        .png({ palette: false, quality: COMPRESSION_QUALITY, compressionLevel: 9 })
        .toFile(outputPath);
    }
    // Wooden wall tiles - scale normally to preserve all boards
    else if (file.includes('wall')) {
      await sharp(inputPath)
        .resize(TILE_SIZE, TILE_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ palette: false, quality: COMPRESSION_QUALITY, compressionLevel: 9 })
        .toFile(outputPath);
    } else {
      // Regular tiles - scale to fit
      await sharp(inputPath)
        .resize(TILE_SIZE, TILE_SIZE, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ palette: false, quality: COMPRESSION_QUALITY, compressionLevel: 9 })
        .toFile(outputPath);
    }

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    // Show relative path for files in subdirectories
    const displayPath = relativePath.includes(path.sep) ? relativePath : file;
    console.log(`  ✅ ${displayPath}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
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

  const allFiles = getAllFiles(farmingDir);
  let optimized = 0;

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(farmingDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'farming', relativePath.replace(/\.jpeg$/i, '.png')));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    // Plant sprites (seedling, pea, wilted) - use larger size for visibility (showcase quality)
    // Soil sprites (fallow, tilled) - use regular tile size
    const isPlantSprite = file.includes('seedling') || file.includes('plant_') || file.includes('wilted');
    const targetSize = isPlantSprite ? FARMING_PLANT_SIZE : TILE_SIZE;
    const targetQuality = isPlantSprite ? HIGH_QUALITY : COMPRESSION_QUALITY;
    const targetCompression = isPlantSprite ? 6 : 9;

    await sharp(inputPath)
      .resize(targetSize, targetSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ palette: false, quality: targetQuality, compressionLevel: targetCompression })
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    // Show relative path for files in subdirectories
    const displayPath = relativePath.includes(path.sep) ? relativePath : file;
    console.log(`  ✅ ${displayPath}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
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

  const allFiles = getAllFiles(npcsDir);
  let optimized = 0;

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.(png|svg)$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(npcsDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'npcs', relativePath));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // SVGs - just copy (they're already small)
    if (file.endsWith('.svg')) {
      fs.copyFileSync(inputPath, outputPath);
      continue;
    }

    // PNGs - resize and compress at higher resolution for dialogue portraits (key showcase assets)
    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    await sharp(inputPath)
      .resize(NPC_SIZE, NPC_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ palette: false, quality: SHOWCASE_QUALITY, compressionLevel: 4 }) // Showcase quality for NPCs
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    // Show relative path for files in subdirectories
    const displayPath = relativePath.includes(path.sep) ? relativePath : file;
    console.log(`  ✅ ${displayPath}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
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

  const allFiles = getAllFiles(animationsDir);
  let optimized = 0;
  const hasGifsicleInstalled = hasGifsicle();

  if (!hasGifsicleInstalled) {
    console.log('⚠️  gifsicle not found - GIFs will be copied without optimization');
    console.log('   Install with: brew install gifsicle (macOS) or apt-get install gifsicle (Linux)\n');
  }

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.gif$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(animationsDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'animations', relativePath));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    if (hasGifsicleInstalled) {
      try {
        // Optimize GIF with gifsicle: resize and optimize
        execSync(
          `gifsicle --resize ${ANIMATION_SIZE}x${ANIMATION_SIZE} --optimize=3 --colors 256 "${inputPath}" -o "${outputPath}"`,
          { stdio: 'pipe' }
        );

        const optimizedSize = fs.statSync(outputPath).size;
        const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

        // Show relative path for files in subdirectories
        const displayPath = relativePath.includes(path.sep) ? relativePath : file;
        console.log(`  ✅ ${displayPath}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
      } catch (error) {
        const displayPath = relativePath.includes(path.sep) ? relativePath : file;
        console.log(`  ⚠️  ${displayPath}: optimization failed, copying original`);
        fs.copyFileSync(inputPath, outputPath);
      }
    } else {
      // Just copy if gifsicle not available
      fs.copyFileSync(inputPath, outputPath);
      const displayPath = relativePath.includes(path.sep) ? relativePath : file;
      console.log(`  ℹ️  ${displayPath}: ${(originalSize / 1024).toFixed(1)}KB (copied without optimization)`);
    }

    optimized++;
  }

  console.log(`\n  Processed ${optimized} animation file(s)\n`);
}

// Optimize cutscene images
async function optimizeCutscenes() {
  console.log('🎬 Optimizing cutscene images...');

  const cutscenesDir = path.join(ASSETS_DIR, 'cutscenes');
  if (!fs.existsSync(cutscenesDir)) {
    console.log('⚠️  No cutscene images found, skipping...');
    return;
  }

  const allFiles = getAllFiles(cutscenesDir);
  let optimized = 0;

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(cutscenesDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'cutscenes', relativePath.replace(/\.jpeg$/i, '.png')));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    // Get image metadata to check dimensions
    const metadata = await sharp(inputPath).metadata();

    // If image is already larger than 1920x1080, keep it larger for panning/zooming
    // Otherwise resize to 1920x1080 minimum
    const shouldUpscale = metadata.width < CUTSCENE_WIDTH || metadata.height < CUTSCENE_HEIGHT;
    const targetWidth = shouldUpscale ? CUTSCENE_WIDTH : metadata.width;
    const targetHeight = shouldUpscale ? CUTSCENE_HEIGHT : metadata.height;

    // Resize with high quality (or keep original size if larger)
    await sharp(inputPath)
      .resize(targetWidth, targetHeight, {
        fit: shouldUpscale ? 'cover' : 'inside', // Cover if upscaling, inside if preserving larger size
        position: 'centre',
        withoutEnlargement: !shouldUpscale // Don't enlarge if already large enough
      })
      .png({ palette: false, quality: CUTSCENE_QUALITY, compressionLevel: 6 }) // High quality, moderate compression
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    // Show relative path for files in subdirectories
    const displayPath = relativePath.includes(path.sep) ? relativePath : file;
    console.log(`  ✅ ${displayPath}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
    optimized++;
  }

  console.log(`\n  Optimized ${optimized} cutscene image(s)\n`);
}

// Optimize witch hut assets
async function optimizeWitchHut() {
  console.log('🏚️  Optimizing witch hut assets...');

  const witchHutDir = path.join(ASSETS_DIR, 'witchhut');
  if (!fs.existsSync(witchHutDir)) {
    console.log('⚠️  No witch hut assets found, skipping...');
    return;
  }

  const allFiles = getAllFiles(witchHutDir);
  let optimized = 0;

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(witchHutDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'witchhut', relativePath.replace(/\.jpeg$/i, '.png')));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    // Witch hut - 20x20 tiles (1280x1280px) with very high quality
    await sharp(inputPath)
      .resize(WITCH_HUT_SIZE, WITCH_HUT_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ palette: false, quality: WITCH_HUT_QUALITY, compressionLevel: 3 }) // Very high quality, minimal compression
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    // Show relative path for files in subdirectories
    const displayPath = relativePath.includes(path.sep) ? relativePath : file;
    console.log(`  ✅ ${displayPath}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
    optimized++;
  }

  console.log(`\n  Optimized ${optimized} witch hut asset(s)\n`);
}

// Optimize cooking/food sprites
const COOKING_SIZE = 256; // Food images at 256x256 for inventory icons
async function optimizeCooking() {
  console.log('🍳 Optimizing cooking sprites...');

  const cookingDir = path.join(ASSETS_DIR, 'cooking');
  if (!fs.existsSync(cookingDir)) {
    console.log('⚠️  No cooking sprites found, skipping...');
    return;
  }

  const allFiles = getAllFiles(cookingDir);
  let optimized = 0;

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(cookingDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'cooking', relativePath.replace(/\.jpeg$/i, '.png')));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    await sharp(inputPath)
      .resize(COOKING_SIZE, COOKING_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ palette: false, quality: HIGH_QUALITY, compressionLevel: 6 })
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    console.log(`  ✅ ${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
    optimized++;
  }

  console.log(`\n  Optimized ${optimized} cooking sprite(s)\n`);
}

// Optimize cauldron animation frames
async function optimizeCauldron() {
  console.log('🧙 Optimizing cauldron animation frames...');

  const cauldronDir = path.join(ASSETS_DIR, 'cauldron');
  if (!fs.existsSync(cauldronDir)) {
    console.log('⚠️  No cauldron assets found, skipping...');
    return;
  }

  const allFiles = getAllFiles(cauldronDir);
  let optimized = 0;

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(cauldronDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'cauldron', relativePath.replace(/\.jpeg$/i, '.png')));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    // Resize to 256x256 for tile-size animation frames
    // IMPORTANT: palette: false forces RGBA output (PixiJS v8 can't decode 8-bit colormap PNGs)
    await sharp(inputPath)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ palette: false, quality: HIGH_QUALITY, compressionLevel: 9 })
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    console.log(`  ✅ ${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
    optimized++;
  }

  console.log(`\n  Optimized ${optimized} cauldron frame(s)\n`);
}

// Optimize UI sprites (bookshelf, wallet, etc.)
// IMPORTANT: Preserves original aspect ratios - only compresses, doesn't resize
async function optimizeUI() {
  console.log('🎨 Optimizing UI sprites...');

  const uiDir = path.join(ASSETS_DIR, 'ui');
  if (!fs.existsSync(uiDir)) {
    console.log('⚠️  No UI sprites found, skipping...');
    return;
  }

  const allFiles = getAllFiles(uiDir);
  let optimized = 0;

  for (const inputPath of allFiles) {
    const file = path.basename(inputPath);
    if (!file.match(/\.(png|jpeg|jpg)$/i)) continue;

    // Calculate relative path to preserve directory structure
    // Normalize to lowercase for cross-platform compatibility (Windows creates mixed-case files)
    const relativePath = path.relative(uiDir, inputPath);
    const outputPath = normalizePathCase(path.join(OPTIMIZED_DIR, 'ui', relativePath.replace(/\.jpeg$/i, '.png')));

    // Ensure output subdirectory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const originalSize = fs.statSync(inputPath).size;

    // Delete output file if it exists (handles case-sensitivity issues on Windows)
    deleteIfExists(outputPath);

    // UI sprites: Preserve original dimensions and aspect ratio
    // Only compress - do NOT resize to avoid stretching artwork
    await sharp(inputPath)
      .png({ palette: false, quality: HIGH_QUALITY, compressionLevel: 6 })
      .toFile(outputPath);

    const optimizedSize = fs.statSync(outputPath).size;
    const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

    console.log(`  ✅ ${file}: ${(originalSize / 1024).toFixed(1)}KB → ${(optimizedSize / 1024).toFixed(1)}KB (saved ${savings}%)`);
    optimized++;
  }

  console.log(`\n  Optimized ${optimized} UI sprite(s)\n`);
}

/**
 * Validate and fix any 8-bit colormap PNGs
 * PixiJS v8 cannot decode 8-bit colormap PNGs - they must be RGBA format
 * This function scans all optimized PNGs and converts any that are in colormap format
 */
async function validateAndFixColormapPNGs() {
  console.log('🔍 Validating PNG formats (checking for 8-bit colormap issues)...');

  // execSync is already imported at the top of the file

  // Find all 8-bit colormap PNGs using the file command
  let colormapFiles = [];
  try {
    const result = execSync(
      `find "${OPTIMIZED_DIR}" -name "*.png" -exec sh -c 'file "$1" | grep -q "8-bit colormap" && echo "$1"' _ {} \\;`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
    ).trim();
    colormapFiles = result.split('\n').filter(f => f.length > 0);
  } catch (err) {
    // find returns non-zero if no matches, which is fine
    colormapFiles = [];
  }

  if (colormapFiles.length === 0) {
    console.log('  ✅ All PNGs are in RGBA format (PixiJS compatible)');
    return;
  }

  console.log(`  ⚠️  Found ${colormapFiles.length} 8-bit colormap PNG(s) - converting to RGBA...`);

  let fixed = 0;
  let failed = 0;

  for (const file of colormapFiles) {
    try {
      const tempFile = file + '.tmp';
      await sharp(file)
        .png({ palette: false, compressionLevel: 9 })
        .toFile(tempFile);
      fs.renameSync(tempFile, file);
      fixed++;
      console.log(`  ✅ Fixed: ${path.basename(file)}`);
    } catch (err) {
      failed++;
      console.error(`  ❌ Failed to fix: ${path.basename(file)} - ${err.message}`);
    }
  }

  console.log(`  📊 Validation complete: ${fixed} fixed, ${failed} failed`);

  if (failed > 0) {
    console.warn('  ⚠️  Some files could not be converted. Check the errors above.');
  }
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
    await optimizeCutscenes();
    await optimizeWitchHut();
    await optimizeCooking();
    await optimizeCauldron();
    await optimizeUI();

    // Final validation - check and fix any 8-bit colormap PNGs
    await validateAndFixColormapPNGs();

    console.log('✨ Asset optimization complete!');
    console.log(`📁 Optimized assets saved to: ${OPTIMIZED_DIR}`);
  } catch (error) {
    console.error('❌ Error during optimization:', error);
    process.exit(1);
  }
}

main();
