/** Build the hand-drawn D-pad control frames from the original artwork. */
import sharp from 'sharp';
import fs from 'node:fs/promises';

// One idle frame (no arrow lit) plus one frame per pressed direction.
const states = ['idle', 'up', 'down', 'left', 'right'];

const source = (state) =>
  new URL(`../public/assets/icons/ui/D-pad ${state}.png`, import.meta.url);
const output = new URL('../public/assets/ui/', import.meta.url);

await fs.mkdir(output, { recursive: true });
for (const state of states) {
  await sharp(await fs.readFile(source(state)))
    .trim()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(new URL(`dpad_${state}.png`, output).pathname);
}