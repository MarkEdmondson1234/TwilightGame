/**
 * WeatherTint - a full-viewport colour wash for rain, storm, fog, mist and snow
 *
 * Replaces components/WeatherTintOverlay.tsx, a `position: fixed` div with
 * `mix-blend-mode` laid over the WebGL canvas. That div forced the browser to
 * composite the whole canvas through a blend every frame, which on iOS is one
 * of the more expensive things a page can ask for
 * (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §5 M1). Here it is one
 * rectangle in the weather layer's batch.
 *
 * Two rectangles crossfade so a change of weather never pops: the old wash
 * fades out while the new one fades in over TIMING.WEATHER_TRANSITION_S.
 * Owned and driven by WeatherLayer, which already receives every weather and
 * visibility change.
 */

import * as PIXI from 'pixi.js';
import { TIMING } from '../../constants';
import type { WeatherType } from '../../data/weatherConfig';

interface TintSpec {
  color: number;
  alpha: number;
  /** 'multiply' darkens (rain, storm); 'screen' lightens (fog, mist, snow). */
  blend: 'multiply' | 'screen';
}

/**
 * The same colours the DOM overlay used. The DOM's `lighten` has no native
 * WebGL equivalent (it would cost a filter pass); `screen` reads the same on
 * these near-white washes.
 */
const TINTS: Partial<Record<WeatherType, TintSpec>> = {
  fog: { color: 0xdcdcdc, alpha: 0.35, blend: 'screen' },
  mist: { color: 0xf0f0f0, alpha: 0.2, blend: 'screen' },
  rain: { color: 0x64788c, alpha: 0.15, blend: 'multiply' },
  storm: { color: 0x505a6e, alpha: 0.25, blend: 'multiply' },
  snow: { color: 0xf5f8ff, alpha: 0.2, blend: 'screen' },
};

interface Wash {
  graphics: PIXI.Graphics;
  spec: TintSpec | null;
  /** 0..1 progress toward `target` alpha. */
  target: number;
}

export class WeatherTint {
  private container: PIXI.Container;
  private washes: [Wash, Wash];
  private active = 0; // index into washes of the one fading in / shown
  private width: number;
  private height: number;
  private current: WeatherType = 'clear';

  constructor(viewportWidth: number, viewportHeight: number, zIndex: number) {
    this.width = viewportWidth;
    this.height = viewportHeight;
    this.container = new PIXI.Container();
    this.container.zIndex = zIndex;
    this.washes = [this.makeWash(), this.makeWash()];
  }

  getContainer(): PIXI.Container {
    return this.container;
  }

  private makeWash(): Wash {
    const graphics = new PIXI.Graphics();
    graphics.alpha = 0;
    graphics.visible = false;
    this.container.addChild(graphics);
    return { graphics, spec: null, target: 0 };
  }

  private draw(wash: Wash): void {
    const { graphics, spec } = wash;
    graphics.clear();
    if (!spec) return;
    graphics.rect(0, 0, this.width, this.height).fill(spec.color);
    graphics.blendMode = spec.blend;
  }

  /** Change the wash. `immediate` skips the crossfade (entering an interior). */
  setWeather(weather: WeatherType, immediate = false): void {
    if (weather === this.current) return;
    this.current = weather;
    const spec = TINTS[weather] ?? null;

    // The other rectangle takes over; the current one fades out.
    const outgoing = this.washes[this.active];
    outgoing.target = 0;
    this.active = 1 - this.active;
    const incoming = this.washes[this.active];
    incoming.spec = spec;
    incoming.target = spec ? 1 : 0;
    this.draw(incoming);
    incoming.graphics.visible = spec !== null;

    if (immediate) {
      outgoing.graphics.alpha = 0;
      outgoing.graphics.visible = false;
      incoming.graphics.alpha = spec ? spec.alpha : 0;
    }
  }

  /** Advance the crossfade. A no-op once both rectangles have settled. */
  update(deltaTime: number): void {
    const step = deltaTime / TIMING.WEATHER_TRANSITION_S;
    for (const wash of this.washes) {
      const { graphics, spec } = wash;
      if (!graphics.visible) continue;
      const full = spec ? spec.alpha : 0;
      const goal = wash.target * full;
      if (graphics.alpha === goal) {
        if (goal === 0) graphics.visible = false;
        continue;
      }
      const delta = full * step;
      graphics.alpha =
        graphics.alpha < goal ? Math.min(goal, graphics.alpha + delta) : Math.max(goal, graphics.alpha - delta);
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const wash of this.washes) this.draw(wash);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
