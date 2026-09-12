import * as PIXI from 'pixi.js';
import { getEmoteImage } from '../../multiplayer/emotes';
import { getEmoteMotion, prefersReducedEmoteMotion } from '../../multiplayer/emoteMotion';

// Only requested 128px thumbnails enter GPU memory. Keep at most eight idle
// textures; active sprites retain theirs until the emote ends.
interface Entry {
  promise: Promise<PIXI.Texture>;
  users: number;
  texture?: PIXI.Texture;
}
const cache = new Map<string, Entry>();
function trimCache() {
  const idle = [...cache].filter(([, entry]) => entry.users === 0 && entry.texture);
  for (const [url, entry] of idle.slice(0, Math.max(0, idle.length - 8))) {
    cache.delete(url);
    entry.texture?.destroy(true);
  }
}

export class EmoteSprite extends PIXI.Sprite {
  private url: string | null = null;
  private generation = 0;
  private ready = false;
  private emoteId: string | null = null;
  private startedAt = 0;

  constructor() {
    super();
    this.anchor.set(0.5, 1);
    this.visible = false;
  }

  setEmote(id: string | null, now = performance.now()) {
    const url = id ? getEmoteImage(id) : null;
    if (url === this.url) {
      this.visible = !!url && this.ready;
      return;
    }
    this.release();
    this.url = url;
    if (!url) return;
    this.emoteId = id;
    this.startedAt = now;
    const generation = this.generation;
    let entry = cache.get(url);
    if (!entry) {
      entry = {
        promise: new Promise<PIXI.Texture>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(PIXI.Texture.from(image));
          image.onerror = () => reject(new Error('Emote thumbnail unavailable'));
          image.src = url;
        }),
        users: 0,
      };
      const loadedEntry = entry;
      void entry.promise
        .then((texture) => {
          loadedEntry.texture = texture;
          trimCache();
        })
        .catch(() => {});
      cache.set(url, entry);
    }
    entry.users++;
    void entry.promise
      .then((texture) => {
        if (this.destroyed || this.generation !== generation) return;
        this.texture = texture;
        this.width = 48;
        this.height = 48;
        this.ready = true;
        this.visible = true;
      })
      .catch(() => {
        // A failed thumbnail must not disrupt the game loop or retry every frame.
      });
  }

  /** Animate around the current head position; never accumulate offsets as players move. */
  updatePosition(x: number, y: number, now = performance.now()) {
    const motion = getEmoteMotion(this.emoteId, now - this.startedAt, prefersReducedEmoteMotion());
    this.x = x + motion.x;
    this.y = y + motion.y;
    this.rotation = motion.rotation;
  }

  private release() {
    this.generation++;
    this.ready = false;
    this.visible = false;
    this.emoteId = null;
    this.rotation = 0;
    if (this.url) {
      const entry = cache.get(this.url);
      if (entry) entry.users--;
    }
    this.url = null;
    // Detach before any idle texture can be unloaded.
    this.texture = PIXI.Texture.EMPTY;
    trimCache();
  }

  destroy() {
    this.release();
    super.destroy();
  }
}
