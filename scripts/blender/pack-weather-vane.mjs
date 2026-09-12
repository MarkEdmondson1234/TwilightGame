import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('../../', import.meta.url));
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/blender/pack-weather-vane.mjs FRAME_DIRECTORY');
const output = path.join(root, 'public/assets/effects/weather-vane');
const weather = ['clear', 'rain', 'snow', 'fog', 'mist', 'storm', 'cherry_blossoms'];
const blank = (width, height) => sharp({ create: { width, height, channels: 4, background: '#00000000' } });
await copyFile(path.join(input, 'base.png'), path.join(output, 'base.png'));
await blank(768, 1280).composite(Array.from({ length: 16 }, (_, i) => ({
  input: path.join(input, `rotor-${String(i).padStart(2, '0')}.png`),
  left: (i % 4) * 192, top: Math.floor(i / 4) * 320,
}))).png().toFile(path.join(output, 'rotor-atlas.png'));
await blank(1344, 320).composite(weather.map((state, i) => ({
  input: path.join(input, `sign-${state}.png`), left: i * 192, top: 0,
}))).png().toFile(path.join(output, 'sign-atlas.png'));
await copyFile(path.join(input, 'weather-vane.blend'), path.join(root, 'design_docs/blender/weather-vane.blend'));
const labels = ['Clear', 'Rain', 'Snow', 'Fog', 'Mist', 'Storm', 'Cherry blossoms'];
const cells = await Promise.all(weather.map(async (state, i) => ({
  input: await sharp(path.join(input, `preview-${state}.png`)).extend({top:0,bottom:44,left:0,right:0,background:'#e6dfcf'})
    .flatten({background:'#e6dfcf'})
    .composite([{input:Buffer.from(`<svg width="192" height="44"><text x="96" y="29" text-anchor="middle" font-family="Georgia" font-size="17" fill="#384a45">${labels[i]}</text></svg>`),left:0,top:320}])
    .png().toBuffer(), left:i * 192, top:0,
})));
await blank(1344,364).composite(cells).png().toFile(path.join(root,'design_docs/blender/weather-vane-states.png'));

// A review-only turntable; the game selects poses from the actual weather state.
const turntable = await Promise.all(Array.from({ length: 16 }, async (_, i) =>
  sharp(path.join(input, 'base.png')).composite([
    { input: path.join(input, `rotor-${String(i).padStart(2, '0')}.png`) },
    { input: path.join(input, 'sign-rain.png') },
  ]).flatten({ background: '#e6dfcf' }).png().toBuffer(),
));
await sharp(turntable, { join: { animated: true } }).gif({ delay: 125, loop: 0 })
  .toFile(path.join(root, 'design_docs/blender/weather-vane-turntable.gif'));
