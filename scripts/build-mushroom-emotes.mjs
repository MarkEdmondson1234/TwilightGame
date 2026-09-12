/** Rebuild runtime emotes from the original hand-drawn mushroom artwork. */
import sharp from 'sharp';
import fs from 'node:fs/promises';

const sources = {
  wave: 'Mushroom wave.png',
  laugh: 'Mushroom laugh.png',
  heart: 'Mushroom heart.png',
  question: 'Mushroom with absolute no idea.png',
  yes: 'Mushroom-thumbs-up.png',
  sad: 'Mushroom sad.png',
  dance: 'Mushroom happy.png',
  // The waving pose also invites other players to come over.
  followme: 'Mushroom wave.png',
};

const output = new URL('../public/assets/emotes/', import.meta.url);
await fs.mkdir(output, { recursive: true });
for (const [id, filename] of Object.entries(sources)) {
  const source = new URL(`../public/assets/icons/ui/${filename}`, import.meta.url);
  await sharp(await fs.readFile(source))
    .trim()
    .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(new URL(`${id}.png`, output).pathname);
}
