// Regenerate after editing player artwork. Reads alpha only; never rewrites images.
import sharp from 'sharp';
import { readdir, writeFile } from 'node:fs/promises';
const root = new URL('../public/assets-optimized/', import.meta.url);
const footprints = {};
for (const character of ['character1', 'character2']) {
  for (const folder of ['base', ...(character === 'character1' ? ['fairy'] : [])]) {
    for (const file of (await readdir(new URL(`${character}/${folder}/`, root))).sort()) {
      if (!file.endsWith('.png')) continue;
      const { data, info } = await sharp(new URL(`${character}/${folder}/${file}`, root).pathname)
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let top = info.height, bottom = 0;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 32) {
          top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
        }
      }
      footprints[`${character}/${folder}/${file}`] = { top: top / info.height, bottom: bottom / info.height };
    }
  }
}
await writeFile(new URL('../data/playerSpriteFootprints.json', import.meta.url), JSON.stringify(footprints, null, 2) + '\n');
