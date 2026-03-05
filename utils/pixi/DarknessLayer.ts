/**
 * DarknessLayer - Global darkness overlay with torch lighting for caves/mines
 *
 * Adds a semi-transparent dark overlay to create atmosphere:
 * - Caves/Mines: 40% darkness during day, 60% at night
 * - Forests: 20-30% during day (varies by season), 50-60% at night
 *
 * LIGHTING SYSTEM
 * ---------------
 * Renders everything to an offscreen Canvas2D using `destination-out` compositing
 * to punch smooth radial gradient holes in the darkness. The result is uploaded
 * to a single PIXI.Sprite each frame — no PixiJS blend mode quirks.
 *
 * Each torch has independent organic flicker driven by layered sine waves
 * (cheap Perlin-like noise) affecting radius, intensity, and position jitter.
 * This produces natural, fire-like variation rather than mechanical toggling.
 *
 * A separate warm amber glow container (additive blend) sits above the darkness
 * to give torch-lit areas a warm colour cast, also flickering per-torch.
 */

import * as PIXI from 'pixi.js';
import { Season, TimeOfDay } from '../TimeManager';
import { Z_WEATHER_TINT } from '../../zIndex';
import { TILE_SIZE } from '../../constants';

/** Light source descriptor — passed from the renderer to describe each active light */
export interface LightSource {
  x: number; // Tile X
  y: number; // Tile Y
  radius?: number; // Light radius in pixels (default: TORCH_LIGHT_RADIUS)
  color?: number; // Glow tint hex (default: GLOW_COLOR)
  intensity?: number; // Base brightness 0-1 (default: 1.0)
  flickerAmount?: number; // Flicker intensity 0-1 (default: FLICKER_INTENSITY_RANGE)
}

// Darkness multipliers for each time of day
const TIME_OF_DAY_MULTIPLIERS: Record<TimeOfDay, number> = {
  [TimeOfDay.DAY]: 1.0,
  [TimeOfDay.DAWN]: 1.4,
  [TimeOfDay.DUSK]: 1.4,
  [TimeOfDay.NIGHT]: 2.0,
};

// Darkness configuration by color scheme
const DARKNESS_CONFIG: Record<
  string,
  {
    baseDarkness: number;
    nightMultiplier: number;
    seasonModifiers?: Record<string, number>;
  }
> = {
  cave: {
    baseDarkness: 0.4,
    nightMultiplier: 1.5,
  },
  forest: {
    baseDarkness: 0.25,
    nightMultiplier: 2.0,
    seasonModifiers: {
      [Season.SUMMER]: 0.2,
      [Season.SPRING]: 0.25,
      [Season.AUTUMN]: 0.3,
      [Season.WINTER]: 0.22,
    },
  },
  village: {
    baseDarkness: 0.25,
    nightMultiplier: 2.0,
  },
  outdoor: {
    baseDarkness: 0.25,
    nightMultiplier: 2.0,
  },
};

const MAX_DARKNESS = 0.7;
export const DEFAULT_DARKNESS_COLOR = 0x241e3b;

// Torch light settings
const TORCH_LIGHT_RADIUS = TILE_SIZE * 3.5;

// Flicker noise settings — layered sine waves for organic fire-like variation
const FLICKER_TICK_MS = 50; // ~20 fps for flicker updates (plenty smooth)
const FLICKER_RADIUS_RANGE = 0.12; // ±12% radius variation
const FLICKER_INTENSITY_RANGE = 0.15; // ±15% intensity (centre alpha) variation
const FLICKER_JITTER_PX = 2.5; // ±2.5px position wobble

// Warm glow settings
const GLOW_COLOR = 0xffa54f;
const GLOW_BASE_ALPHA = 0.12;
const GRADIENT_TEXTURE_SIZE = 128;

// Margin (px) added to each edge of the offscreen canvas to prevent edge clipping
const CANVAS_MARGIN = 100;

// ─── Per-torch flicker state ──────────────────────────────────────────────────

interface TorchFlicker {
  /** Random phase offsets so each torch flickers independently */
  phaseA: number;
  phaseB: number;
  phaseC: number;
  /** Current computed values (updated every tick) */
  radiusScale: number; // Multiplier around 1.0
  intensity: number; // Multiplier around 1.0 (affects gradient centre alpha)
  jitterX: number; // Pixel offset
  jitterY: number; // Pixel offset
  /** Per-light overrides (from LightSource) */
  baseRadius: number; // Pixel radius for this light
  glowColor: number; // Glow tint for this light
  baseIntensity: number; // Base brightness for this light
  flickerRange: number; // Flicker intensity range for this light
}

/**
 * Cheap layered sine noise — three incommensurate frequencies summed and normalised to [-1, 1].
 * Each torch gets unique phase offsets so they drift independently.
 */
function flickerNoise(t: number, phaseA: number, phaseB: number, phaseC: number): number {
  return (
    Math.sin(t * 3.7 + phaseA) * 0.5 +
    Math.sin(t * 7.3 + phaseB) * 0.3 +
    Math.sin(t * 13.1 + phaseC) * 0.2
  );
}

function hexToRGB(hex: number): string {
  const r = (hex >> 16) & 0xff;
  const g = (hex >> 8) & 0xff;
  const b = hex & 0xff;
  return `rgb(${r},${g},${b})`;
}

function createGlowGradientTexture(): PIXI.Texture {
  const size = GRADIENT_TEXTURE_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.7)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return PIXI.Texture.from(canvas);
}

// ─── DarknessLayer class ──────────────────────────────────────────────────────

export class DarknessLayer {
  private container: PIXI.Container;
  private darknessSprite: PIXI.Sprite;
  private darknessTexture: PIXI.Texture | null = null;

  private offCanvas: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  private glowContainer: PIXI.Container;
  private glowSprites: PIXI.Sprite[] = [];
  private glowTexture: PIXI.Texture | null = null;

  // Per-torch flicker state
  private torchFlickers: TorchFlicker[] = [];
  private flickerTimer: ReturnType<typeof setInterval> | null = null;
  private flickerTime = 0;

  // Torch positions in screen space (updated every camera frame)
  private torchScreenPositions: { x: number; y: number }[] = [];

  // State tracking
  private currentDarkness = 0;
  private viewportWidth = 0;
  private viewportHeight = 0;
  private lastColorScheme = '';
  private lastTimeOfDay = '';
  private darknessColor: number = DEFAULT_DARKNESS_COLOR;
  private hasLights = false;

  constructor(color?: number) {
    if (color !== undefined) this.darknessColor = color;

    this.container = new PIXI.Container();
    this.container.zIndex = Z_WEATHER_TINT;

    this.darknessSprite = new PIXI.Sprite();
    this.darknessSprite.x = -CANVAS_MARGIN;
    this.darknessSprite.y = -CANVAS_MARGIN;
    this.container.addChild(this.darknessSprite);

    this.offCanvas = document.createElement('canvas');
    this.offCtx = this.offCanvas.getContext('2d')!;

    this.glowContainer = new PIXI.Container();
    this.glowContainer.zIndex = Z_WEATHER_TINT + 1;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  update(
    colorScheme: string,
    season: Season | string,
    timeOfDay: TimeOfDay | string,
    viewportWidth: number,
    viewportHeight: number
  ): void {
    const config = DARKNESS_CONFIG[colorScheme];

    if (!config) {
      if (this.darknessSprite.visible) {
        console.log(`[DarknessLayer] No config for '${colorScheme}', hiding overlay`);
      }
      this.darknessSprite.visible = false;
      this.currentDarkness = 0;
      this._clearLights();
      return;
    }

    let baseDarkness = config.baseDarkness;
    if (config.seasonModifiers?.[season] !== undefined) {
      baseDarkness = config.seasonModifiers[season];
    }

    const todMultiplier = TIME_OF_DAY_MULTIPLIERS[timeOfDay as TimeOfDay] ?? 1.0;
    const darkness = Math.min(baseDarkness * todMultiplier, MAX_DARKNESS);

    const sizeChanged =
      viewportWidth !== this.viewportWidth || viewportHeight !== this.viewportHeight;
    const schemeChanged = colorScheme !== this.lastColorScheme;
    const timeChanged = timeOfDay !== this.lastTimeOfDay;

    if (darkness === this.currentDarkness && !sizeChanged && !schemeChanged && !timeChanged) {
      return;
    }

    if (schemeChanged || timeChanged || Math.abs(darkness - this.currentDarkness) > 0.01) {
      console.log(
        `[DarknessLayer] scheme=${colorScheme} season=${season} tod=${timeOfDay} darkness=${(darkness * 100).toFixed(0)}%`
      );
    }

    this.currentDarkness = darkness;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.lastColorScheme = colorScheme;
    this.lastTimeOfDay = String(timeOfDay);

    if (sizeChanged) {
      this.offCanvas.width = viewportWidth + CANVAS_MARGIN * 2;
      this.offCanvas.height = viewportHeight + CANVAS_MARGIN * 2;
    }

    this._compositeDarkness();
  }

  updateLights(lightSources: LightSource[], cameraX: number, cameraY: number): void {
    const hasLightSources = lightSources.length > 0;
    const hadLights = this.hasLights;
    this.hasLights = hasLightSources;

    this.torchScreenPositions = lightSources.map((ls) => ({
      x: ls.x * TILE_SIZE + TILE_SIZE / 2 - cameraX,
      y: ls.y * TILE_SIZE + TILE_SIZE / 2 - cameraY,
    }));

    // Ensure we have flicker state for each light (with per-light config)
    this._syncFlickerPool(lightSources);

    if (hasLightSources) {
      this._compositeDarkness();
      this._updateGlowSprites();
      if (!this.flickerTimer) this._startFlicker();
    } else {
      this._clearLights();
      if (hadLights) this._compositeDarkness();
    }
  }

  updateCamera(_cameraX: number, _cameraY: number): void {
    // Darkness overlay is viewport-fixed — intentionally no-op
  }

  hide(): void {
    this.darknessSprite.visible = false;
    this.currentDarkness = 0;
    this._clearLights();
  }

  getContainer(): PIXI.Container {
    return this.container;
  }
  getGlowContainer(): PIXI.Container {
    return this.glowContainer;
  }
  getCurrentDarkness(): number {
    return this.currentDarkness;
  }
  getColor(): number {
    return this.darknessColor;
  }

  setColor(color: number): void {
    this.darknessColor = color;
    this.viewportWidth = 0;
  }

  destroy(): void {
    this._stopFlicker();
    this.darknessSprite.destroy();
    if (this.darknessTexture) {
      this.darknessTexture.destroy(true);
      this.darknessTexture = null;
    }
    this._destroyGlowSprites();
    if (this.glowTexture) {
      this.glowTexture.destroy(true);
      this.glowTexture = null;
    }
    this.glowContainer.destroy();
    this.container.destroy();
  }

  // ─── Private: Per-torch flicker noise ───────────────────────────────────────

  /**
   * Ensure the flicker pool matches the torch count.
   * New torches get random phase offsets so they start at different points in the noise cycle.
   */
  private _syncFlickerPool(sources: LightSource[]): void {
    const count = sources.length;
    while (this.torchFlickers.length < count) {
      this.torchFlickers.push({
        phaseA: Math.random() * Math.PI * 2,
        phaseB: Math.random() * Math.PI * 2,
        phaseC: Math.random() * Math.PI * 2,
        radiusScale: 1.0,
        intensity: 1.0,
        jitterX: 0,
        jitterY: 0,
        baseRadius: TORCH_LIGHT_RADIUS,
        glowColor: GLOW_COLOR,
        baseIntensity: 1.0,
        flickerRange: FLICKER_INTENSITY_RANGE,
      });
    }
    // Trim surplus (if lights were removed)
    if (this.torchFlickers.length > count) {
      this.torchFlickers.length = count;
    }
    // Update per-light config from sources
    for (let i = 0; i < count; i++) {
      const src = sources[i];
      const f = this.torchFlickers[i];
      f.baseRadius = src.radius ?? TORCH_LIGHT_RADIUS;
      f.glowColor = src.color ?? GLOW_COLOR;
      f.baseIntensity = src.intensity ?? 1.0;
      f.flickerRange = src.flickerAmount ?? FLICKER_INTENSITY_RANGE;
    }
  }

  /**
   * Advance flicker time and recompute per-torch noise values.
   */
  private _tickFlicker(): void {
    this.flickerTime += FLICKER_TICK_MS / 1000; // Convert to seconds for sine frequencies

    for (const f of this.torchFlickers) {
      const t = this.flickerTime;

      // Radius: layered sine noise scaled to ±FLICKER_RADIUS_RANGE
      f.radiusScale = 1.0 + flickerNoise(t, f.phaseA, f.phaseB, f.phaseC) * FLICKER_RADIUS_RANGE;

      // Intensity: different phase combination so it doesn't correlate perfectly with radius
      f.intensity = 1.0 + flickerNoise(t * 1.3, f.phaseB, f.phaseC, f.phaseA) * f.flickerRange;

      // Position jitter: two independent noise channels for X and Y
      f.jitterX = flickerNoise(t * 0.9, f.phaseC, f.phaseA, f.phaseB) * FLICKER_JITTER_PX;
      f.jitterY =
        flickerNoise(t * 1.1, f.phaseA + 1, f.phaseB + 2, f.phaseC + 3) * FLICKER_JITTER_PX;
    }
  }

  // ─── Private: Canvas2D compositing ──────────────────────────────────────────

  private _compositeDarkness(): void {
    if (this.currentDarkness <= 0) {
      this.darknessSprite.visible = false;
      return;
    }

    const w = this.offCanvas.width;
    const h = this.offCanvas.height;
    const ctx = this.offCtx;

    // 1. Fill with darkness colour at darkness alpha
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = this.currentDarkness;
    ctx.fillStyle = hexToRGB(this.darknessColor);
    ctx.fillRect(0, 0, w, h);

    // 2. Punch light holes — per-torch radius, intensity, and position jitter
    if (this.hasLights && this.torchScreenPositions.length > 0) {
      ctx.globalCompositeOperation = 'destination-out';

      for (let i = 0; i < this.torchScreenPositions.length; i++) {
        const pos = this.torchScreenPositions[i];
        const f = this.torchFlickers[i];
        if (!f) continue;

        const radius = f.baseRadius * f.radiusScale;
        const cx = pos.x + CANVAS_MARGIN + f.jitterX;
        const cy = pos.y + CANVAS_MARGIN + f.jitterY;

        // Intensity affects the centre alpha of the gradient
        const centreAlpha = Math.min(f.intensity * f.baseIntensity, 1.0);
        const midAlpha = (0.85 * centreAlpha).toFixed(3);
        const halfAlpha = (0.5 * centreAlpha).toFixed(3);
        const edgeAlpha = (0.2 * centreAlpha).toFixed(3);

        ctx.globalAlpha = 1.0;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(0,0,0,${centreAlpha})`);
        gradient.addColorStop(0.25, `rgba(0,0,0,${midAlpha})`);
        gradient.addColorStop(0.5, `rgba(0,0,0,${halfAlpha})`);
        gradient.addColorStop(0.75, `rgba(0,0,0,${edgeAlpha})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0.0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Upload canvas to PixiJS texture
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

    if (this.darknessTexture) {
      this.darknessTexture.source.resource = this.offCanvas;
      this.darknessTexture.source.update();
    } else {
      this.darknessTexture = PIXI.Texture.from(this.offCanvas);
    }

    this.darknessSprite.texture = this.darknessTexture;
    this.darknessSprite.visible = true;
  }

  // ─── Private: Warm glow sprites ─────────────────────────────────────────────

  private _ensureGlowTexture(): PIXI.Texture {
    if (!this.glowTexture) this.glowTexture = createGlowGradientTexture();
    return this.glowTexture;
  }

  private _updateGlowSprites(): void {
    const tex = this._ensureGlowTexture();
    const count = this.torchScreenPositions.length;

    // Grow pool
    while (this.glowSprites.length < count) {
      const sprite = new PIXI.Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.tint = GLOW_COLOR;
      sprite.blendMode = 'add';
      this.glowContainer.addChild(sprite);
      this.glowSprites.push(sprite);
    }

    this.glowContainer.visible = true;

    for (let i = 0; i < count; i++) {
      const s = this.glowSprites[i];
      const pos = this.torchScreenPositions[i];
      const f = this.torchFlickers[i];

      const lightRadius = f?.baseRadius ?? TORCH_LIGHT_RADIUS;
      const diameter = lightRadius * 2 * (f?.radiusScale ?? 1.0);
      s.x = pos.x + (f?.jitterX ?? 0);
      s.y = pos.y + (f?.jitterY ?? 0);
      s.width = diameter;
      s.height = diameter;
      s.tint = f?.glowColor ?? GLOW_COLOR;
      s.alpha = GLOW_BASE_ALPHA * (f?.intensity ?? 1.0) * (f?.baseIntensity ?? 1.0);
      s.visible = true;
    }

    for (let i = count; i < this.glowSprites.length; i++) {
      this.glowSprites[i].visible = false;
    }
  }

  // ─── Private: Flicker timer ─────────────────────────────────────────────────

  private _startFlicker(): void {
    this.flickerTimer = setInterval(() => {
      this._tickFlicker();
      if (this.hasLights) {
        this._compositeDarkness();
        this._updateGlowSprites();
      }
    }, FLICKER_TICK_MS);
  }

  private _stopFlicker(): void {
    if (this.flickerTimer !== null) {
      clearInterval(this.flickerTimer);
      this.flickerTimer = null;
    }
    this.flickerTime = 0;
  }

  // ─── Private: Cleanup ───────────────────────────────────────────────────────

  private _destroyGlowSprites(): void {
    for (const s of this.glowSprites) s.destroy();
    this.glowSprites = [];
  }

  private _clearLights(): void {
    this._stopFlicker();
    this.torchScreenPositions = [];
    this.torchFlickers = [];
    this.hasLights = false;
    for (const s of this.glowSprites) s.visible = false;
    this.glowContainer.visible = false;
  }
}
