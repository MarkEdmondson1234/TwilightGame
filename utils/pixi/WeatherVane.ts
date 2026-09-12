import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { weatherVaneAssets } from '../../assets';
import { TILE_SIZE } from '../../constants';
import { WEATHER_VANE, WEATHER_VANE_STATES, weatherVaneRotorFrame } from '../../data/weatherVane';
import type { WeatherType } from '../../data/weatherConfig';
import { textureManager } from '../TextureManager';

/** A village-shop roof attachment: existing building art/collision remains unchanged. */
export class WeatherVane {
  private container: Container | null = null;
  private parent: Sprite | null = null;
  private base: Sprite | null = null;
  private rotor: Sprite | null = null;
  private sign: Sprite | null = null;
  private textures: Texture[] = [];
  private rotorFrames: Texture[] = [];
  private signFrames: Texture[] = [];
  private weather: WeatherType = 'clear';
  private motionQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  attach(parent: Sprite, target: Container, weather: WeatherType): void {
    this.weather = weather;
    const textures = Object.values(weatherVaneAssets).map(url => textureManager.getTexture(url));
    if (textures.some(texture => !texture)) {
      if (this.container) this.container.visible = false;
      return;
    }
    if (textures.some((texture, i) => texture !== this.textures[i])) {
      this.clear();
      this.textures = textures as Texture[];
      const [base, rotor, signs] = this.textures;
      const { frameWidth, frameHeight, rotorColumns } = WEATHER_VANE;
      this.rotorFrames = Array.from({ length: WEATHER_VANE.rotorFrames }, (_, i) => new Texture({
        source: rotor.source,
        frame: new Rectangle((i % rotorColumns) * frameWidth, Math.floor(i / rotorColumns) * frameHeight, frameWidth, frameHeight),
      }));
      this.signFrames = Array.from({ length: Object.keys(WEATHER_VANE_STATES).length }, (_, i) => new Texture({
        source: signs.source,
        frame: new Rectangle(i * frameWidth, 0, frameWidth, frameHeight),
      }));
      this.container = new Container();
      this.container.eventMode = 'none';
      this.base = new Sprite(base);
      this.rotor = new Sprite(this.rotorFrames[0]);
      this.sign = new Sprite(this.signFrames[0]);
      this.container.addChild(this.base, this.rotor, this.sign);
      target.addChild(this.container);
    }
    this.parent = parent;
    const height = WEATHER_VANE.heightTiles * TILE_SIZE;
    const width = height * WEATHER_VANE.frameWidth / WEATHER_VANE.frameHeight;
    for (const sprite of [this.base!, this.rotor!, this.sign!]) {
      sprite.width = width;
      sprite.height = height;
    }
    this.container!.x = parent.x + parent.width * WEATHER_VANE.centreX - width / 2;
    this.container!.y = parent.y + parent.height * WEATHER_VANE.roofY - height * WEATHER_VANE.footY;
    this.container!.zIndex = parent.zIndex + 0.1;
    this.update(Date.now());
  }

  update(now: number): void {
    if (!this.container || !this.parent) return;
    const resident = Object.values(weatherVaneAssets).every((url, i) =>
      textureManager.getTexture(url) === this.textures[i]);
    this.container.visible = this.parent.visible && resident;
    if (!this.container.visible) return;
    this.sign!.texture = this.signFrames[WEATHER_VANE_STATES[this.weather].frame];
    this.rotor!.texture = this.rotorFrames[weatherVaneRotorFrame(this.weather, now, this.motionQuery?.matches)];
  }

  clear(): void {
    this.container?.removeFromParent();
    this.container?.destroy({ children: true });
    // Destroy frame views only; shared sources remain owned by TextureManager.
    for (const texture of [...this.rotorFrames, ...this.signFrames]) texture.destroy(false);
    this.container = null;
    this.parent = null;
    this.base = this.rotor = this.sign = null;
    this.rotorFrames = [];
    this.signFrames = [];
    this.textures = [];
  }
}
