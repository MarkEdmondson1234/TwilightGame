import type { WeatherType } from './weatherConfig';
import { TileType } from '../types';

export const WEATHER_VANE = {
  mapId: 'village',
  tileType: TileType.SHOP,
  frameWidth: 192,
  frameHeight: 320,
  rotorFrames: 16,
  rotorColumns: 4,
  heightTiles: 2.6,
  centreX: 0.51,
  roofY: 0.025,
  footY: 0.9,
} as const;

/** Atlas order is pinned by the Blender packer. Shape identifies weather even without colour/motion. */
export const WEATHER_VANE_STATES: Record<WeatherType, {
  frame: number;
  label: string;
  swing: number;
  speed: number;
}> = {
  clear: { frame: 0, label: 'Clear — sun', swing: 0.3, speed: 0.35 },
  rain: { frame: 1, label: 'Rain — cloud and drops', swing: 0.9, speed: 0.9 },
  snow: { frame: 2, label: 'Snow — snowflake', swing: 0.55, speed: 0.5 },
  fog: { frame: 3, label: 'Fog — low horizontal bands', swing: 0.15, speed: 0.2 },
  mist: { frame: 4, label: 'Mist — rising wisps', swing: 0.3, speed: 0.3 },
  storm: { frame: 5, label: 'Storm — cloud and lightning', swing: 2.3, speed: 1.5 },
  cherry_blossoms: { frame: 6, label: 'Cherry blossoms — pink flower', swing: 0.8, speed: 0.75 },
};

export function hasWeatherVane(mapId: string, tileType: TileType): boolean {
  return mapId === WEATHER_VANE.mapId && tileType === WEATHER_VANE.tileType;
}

/** Decorative response to the real weather, not a compass/wind-direction simulation. */
export function weatherVaneRotorFrame(weather: WeatherType, now: number, reducedMotion = false): number {
  if (reducedMotion) return 0;
  const state = WEATHER_VANE_STATES[weather];
  const time = now / 1000 * state.speed;
  const angle = 0.4 + state.swing * (Math.sin(time) + 0.3 * Math.sin(time * 2.17));
  const turn = ((angle / (2 * Math.PI)) % 1 + 1) % 1;
  return Math.round(turn * WEATHER_VANE.rotorFrames) % WEATHER_VANE.rotorFrames;
}
