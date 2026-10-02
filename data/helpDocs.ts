/**
 * Player-facing help pages shown in the F1 Help Browser.
 *
 * Each `path` is fetched at runtime, so the file must live in `public/docs/` —
 * the only docs a production build ships. The dev server also serves the repo
 * root, which is how pages under `docs/` once worked locally while 404ing on
 * the live site. `tests/helpDocs.test.ts` fails if a path has no file.
 *
 * Developer docs (MAP_GUIDE, ASSETS, …) stay in `docs/` and are not listed here.
 */

export interface DocFile {
  name: string;
  title: string;
  path: string;
}

export const DOC_FILES: DocFile[] = [
  {
    name: 'getting-started',
    title: '🎮 Getting Started',
    path: '/TwilightGame/docs/GETTING_STARTED.md',
  },
  { name: 'stamina', title: '💚 Stamina', path: '/TwilightGame/docs/STAMINA.md' },
  { name: 'farming', title: '🌾 Farming Guide', path: '/TwilightGame/docs/FARMING.md' },
  { name: 'seeds', title: '🌱 Seeds Guide', path: '/TwilightGame/docs/SEEDS.md' },
  { name: 'journal', title: '📖 Journal', path: '/TwilightGame/docs/JOURNAL.md' },
  { name: 'decorations', title: '🎨 Decorations', path: '/TwilightGame/docs/DECORATIONS.md' },
  { name: 'magic', title: '🧪 Magic & Potions', path: '/TwilightGame/docs/MAGIC.md' },
  { name: 'time', title: '⏰ Time & Seasons', path: '/TwilightGame/docs/TIME_SYSTEM.md' },
  { name: 'events', title: '🌍 World Events', path: '/TwilightGame/docs/EVENTS.md' },
  { name: 'ai-chat', title: '💬 AI Chat', path: '/TwilightGame/docs/AI_CHAT.md' },
  { name: 'cloud-saves', title: '☁️ Cloud Saves', path: '/TwilightGame/docs/CLOUD_SAVES.md' },
  // Developer docs excluded: MAP_GUIDE, ASSETS, COORDINATE_GUIDE
];
