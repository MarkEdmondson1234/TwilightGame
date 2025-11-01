/**
 * Generate Particle Assets
 * Creates placeholder particle sprites for weather effects
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicDir = join(__dirname, '../public');
const particlesDir = join(publicDir, 'assets/particles');

async function generateRaindrop() {
  console.log('Generating raindrop.png (4x16px)...');

  // Create a 4x16 blue raindrop
  const width = 4;
  const height = 16;
  const channels = 4;

  // Create RGBA buffer
  const buffer = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;

      // Light blue color
      buffer[idx] = 150;      // R
      buffer[idx + 1] = 200;  // G
      buffer[idx + 2] = 255;  // B

      // Gradient alpha (more transparent at top/bottom)
      const distFromCenter = Math.abs(y - height / 2) / (height / 2);
      buffer[idx + 3] = Math.floor(255 * (1 - distFromCenter * 0.5)); // A
    }
  }

  await sharp(buffer, {
    raw: { width, height, channels }
  })
    .png()
    .toFile(join(particlesDir, 'rain.png'));

  console.log('✓ raindrop.png created');
}

async function generateSnowflake() {
  console.log('Generating snowflake.png (8x8px)...');

  const width = 8;
  const height = 8;
  const channels = 4;

  // Create RGBA buffer
  const buffer = Buffer.alloc(width * height * channels);

  const center = { x: width / 2, y: height / 2 };
  const radius = 3;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;

      // Distance from center
      const dx = x - center.x + 0.5;
      const dy = y - center.y + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // White color
      buffer[idx] = 255;     // R
      buffer[idx + 1] = 255; // G
      buffer[idx + 2] = 255; // B

      // Circular shape with soft edge
      if (dist <= radius) {
        const edge = Math.max(0, 1 - (dist / radius));
        buffer[idx + 3] = Math.floor(255 * edge); // A
      } else {
        buffer[idx + 3] = 0; // Transparent
      }
    }
  }

  await sharp(buffer, {
    raw: { width, height, channels }
  })
    .png()
    .toFile(join(particlesDir, 'snow.png'));

  console.log('✓ snowflake.png created');
}

async function generateFog() {
  console.log('Generating fog.png (512x512px)...');

  const width = 512;
  const height = 512;
  const channels = 4;

  // Create RGBA buffer with noise
  const buffer = Buffer.alloc(width * height * channels);

  // Simple Perlin-like noise (using sine waves for simplicity)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;

      // Multiple sine wave frequencies for fog texture
      const noise1 = Math.sin(x * 0.02) * Math.cos(y * 0.02);
      const noise2 = Math.sin(x * 0.05) * Math.cos(y * 0.05);
      const noise3 = Math.sin(x * 0.1) * Math.cos(y * 0.1);
      const combined = (noise1 + noise2 * 0.5 + noise3 * 0.25) / 1.75;

      // Grey fog color
      const grey = Math.floor(128 + combined * 30);
      buffer[idx] = grey;     // R
      buffer[idx + 1] = grey; // G
      buffer[idx + 2] = grey; // B
      buffer[idx + 3] = 180;  // A (semi-transparent)
    }
  }

  await sharp(buffer, {
    raw: { width, height, channels }
  })
    .png()
    .toFile(join(particlesDir, 'fog.png'));

  console.log('✓ fog.png created');
}

async function generateMist() {
  console.log('Generating mist.png (512x512px)...');

  const width = 512;
  const height = 512;
  const channels = 4;

  // Create RGBA buffer with lighter noise (mist is lighter than fog)
  const buffer = Buffer.alloc(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;

      // Multiple sine wave frequencies for mist texture
      const noise1 = Math.sin(x * 0.015) * Math.cos(y * 0.015);
      const noise2 = Math.sin(x * 0.04) * Math.cos(y * 0.04);
      const combined = (noise1 + noise2 * 0.5) / 1.5;

      // Lighter grey for mist
      const grey = Math.floor(200 + combined * 20);
      buffer[idx] = grey;     // R
      buffer[idx + 1] = grey; // G
      buffer[idx + 2] = grey; // B
      buffer[idx + 3] = 120;  // A (more transparent than fog)
    }
  }

  await sharp(buffer, {
    raw: { width, height, channels }
  })
    .png()
    .toFile(join(particlesDir, 'mist.png'));

  console.log('✓ mist.png created');
}

async function main() {
  try {
    // Create particles directory if it doesn't exist
    await mkdir(particlesDir, { recursive: true });
    console.log(`Created directory: ${particlesDir}\n`);

    // Generate all particle assets
    await generateRaindrop();
    await generateSnowflake();
    await generateFog();
    await generateMist();

    console.log('\n✅ All particle assets generated successfully!');
    console.log('\nGenerated files:');
    console.log('  - /public/assets/particles/rain.png (4x16px)');
    console.log('  - /public/assets/particles/snow.png (8x8px)');
    console.log('  - /public/assets/particles/fog.png (512x512px)');
    console.log('  - /public/assets/particles/mist.png (512x512px)');
  } catch (error) {
    console.error('Error generating particle assets:', error);
    process.exit(1);
  }
}

main();
