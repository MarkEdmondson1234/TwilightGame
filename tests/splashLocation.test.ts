/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { getSplashLocationName, SPLASH_HOME_TITLE } from '../utils/splashLocation';

const names: Record<string, string> = { mushroom_forest: 'Mushroom Forest', village: 'Village' };
const lookup = (id: string) => names[id];

describe('getSplashLocationName', () => {
  it('calls the village by the game name, as does a missing save', () => {
    expect(getSplashLocationName('village', lookup)).toBe(SPLASH_HOME_TITLE);
    expect(getSplashLocationName(undefined, lookup)).toBe(SPLASH_HOME_TITLE);
  });

  it('uses the map name for designed maps', () => {
    expect(getSplashLocationName('mushroom_forest', lookup)).toBe('Mushroom Forest');
  });

  it('names procedural maps by kind, before they have been generated', () => {
    expect(getSplashLocationName('forest_123', () => undefined)).toBe('Forest');
    expect(getSplashLocationName('cave_123', () => undefined)).toBe('Mines');
    expect(getSplashLocationName('lava_123', () => undefined)).toBe('Lava Mines');
    expect(getSplashLocationName('shop_123', () => undefined)).toBe('Magic Shop');
  });

  it('falls back to the game name for a map it cannot find', () => {
    expect(getSplashLocationName('removed_map', lookup)).toBe(SPLASH_HOME_TITLE);
  });
});
