/** Rebuild small item emote thumbnails, catalog and the matching RTDB allowlist. */
import { createServer } from 'vite';
import sharp from 'sharp';
import fs from 'node:fs/promises';

const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
});
try {
  const { ITEMS } = await server.ssrLoadModule('/data/items.ts');
  const { EMOTES } = await server.ssrLoadModule('/multiplayer/emotes.ts');
  await fs.mkdir('public/assets/emotes/items', { recursive: true });
  const catalog = [];
  for (const item of Object.values(ITEMS)) {
    if (!item.image) continue;
    const source = item.image.replace(/^.*?(assets(?:-optimized)?\/)/, '$1');
    try {
      await fs.access(`public/${source}`);
    } catch {
      continue;
    }
    const image = `assets/emotes/items/${item.id}.png`;
    await sharp(`public/${source}`)
      .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(`public/${image}`);
    catalog.push({
      id: `item:${item.id}`,
      label: item.displayName,
      category: item.category,
      image,
      source,
    });
  }
  await fs.writeFile('multiplayer/emoteItemCatalog.json', JSON.stringify(catalog, null, 2) + '\n');
  const rules = JSON.parse(await fs.readFile('database.rules.json', 'utf8'));
  rules.rules.presence.$mapId.$uid.e['.validate'] =
    'newData.val() === null || ' +
    [...EMOTES, ...catalog].map((item) => `newData.val() === '${item.id}'`).join(' || ');
  await fs.writeFile('database.rules.json', JSON.stringify(rules, null, 2) + '\n');
} finally {
  await server.close();
}
