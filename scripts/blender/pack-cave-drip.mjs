import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('../../', import.meta.url));
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/blender/pack-cave-drip.mjs FRAME_DIRECTORY');
const frames = Array.from({ length: 24 }, (_, i) => ({
  input: path.join(input, `frame-${String(i).padStart(2, '0')}.png`),
  left: (i % 8) * 128,
  top: Math.floor(i / 8) * 256,
}));
await sharp({ create: { width: 1024, height: 768, channels: 4, background: '#00000000' } })
  .composite(frames).png().toFile(path.join(root, 'public/assets/effects/cave-drip/atlas.png'));
await copyFile(path.join(input, 'cave-drip.blend'), path.join(root, 'design_docs/blender/cave-drip.blend'));
