/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { WEATHER_VANE, WEATHER_VANE_STATES, hasWeatherVane, weatherVaneRotorFrame } from '../data/weatherVane';
import { ZONE_ALLOWED_WEATHER } from '../data/weatherConfig';
import { weatherVaneAssets } from '../assets';
import { TileType } from '../types';
import { getTexturesForMap, getCoreTextureUrls } from '../utils/mapTextureSet';
import { initializeMaps } from '../maps';

describe('magical weather vane', () => {
  it('has a distinct, in-bounds sign for every real outdoor weather state', () => {
    const weather = ZONE_ALLOWED_WEATHER.default;
    expect(Object.keys(WEATHER_VANE_STATES).sort()).toEqual([...weather].sort());
    const frames = weather.map(state => WEATHER_VANE_STATES[state].frame);
    expect(new Set(frames).size).toBe(weather.length);
    expect([...frames].sort((a, b) => a - b)).toEqual(weather.map((_, i) => i));
    const png = readFileSync(new URL('../public/assets/effects/weather-vane/sign-atlas.png', import.meta.url));
    expect(png.readUInt32BE(16)).toBe(weather.length * WEATHER_VANE.frameWidth);
    expect(png.readUInt32BE(20)).toBe(WEATHER_VANE.frameHeight);
  });

  it('keeps its turning arrow within the atlas and stable for reduced motion', () => {
    for (const weather of ZONE_ALLOWED_WEATHER.default) {
      for (let now = 0; now < 60000; now += 137) {
        const frame = weatherVaneRotorFrame(weather, now);
        expect(Number.isInteger(frame)).toBe(true);
        expect(frame).toBeGreaterThanOrEqual(0);
        expect(frame).toBeLessThan(WEATHER_VANE.rotorFrames);
        expect(weatherVaneRotorFrame(weather, now, true)).toBe(0);
      }
    }
    const poses = (weather: 'fog' | 'storm') => new Set(Array.from({ length: 600 }, (_, i) => weatherVaneRotorFrame(weather, i * 100)));
    expect(poses('storm').size).toBeGreaterThan(poses('fog').size);
  });

  it('belongs only to the village shop and is never pinned on every map', () => {
    initializeMaps();
    expect(hasWeatherVane('village', TileType.SHOP)).toBe(true);
    expect(hasWeatherVane('village', TileType.PLAYER_HOME)).toBe(false);
    expect(hasWeatherVane('shop_123', TileType.SHOP)).toBe(false);
    for (const asset of Object.values(weatherVaneAssets)) {
      expect(getTexturesForMap('village')).toContain(asset);
      expect(getTexturesForMap('bear_cave')).not.toContain(asset);
      expect(getCoreTextureUrls()).not.toContain(asset);
    }
  });
});
