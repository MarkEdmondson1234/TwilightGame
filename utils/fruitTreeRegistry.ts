/**
 * fruitTreeRegistry — Thin bridge between data/tiles.ts and fruitTreeManager
 *
 * data/tiles.ts imports this (safe, no circular deps).
 * fruitTreeManager registers its image resolver here on startup.
 * This breaks the circular chain:
 *   data/tiles.ts → fruitTreeManager → EventBus → constants → data/tiles.ts
 */

export type FruitTreeImageFn = (
  mapId: string,
  x: number,
  y: number,
  season: 'spring' | 'summer' | 'autumn' | 'winter'
) => string;

let _appleTreeImageFn: FruitTreeImageFn | null = null;

export function registerAppleTreeImageFn(fn: FruitTreeImageFn): void {
  _appleTreeImageFn = fn;
}

export function resolveAppleTreeImage(
  mapId: string,
  x: number,
  y: number,
  season: 'spring' | 'summer' | 'autumn' | 'winter'
): string | null {
  return _appleTreeImageFn ? _appleTreeImageFn(mapId, x, y, season) : null;
}
