/**
 * Rain must never be drawn indoors. A weather change crossfades — the old
 * particles keep falling for WEATHER_TRANSITION_S — and visibility follows the
 * new weather. Rain stopping just before the player entered Mum's kitchen kept
 * raining in the kitchen ("clear" is allowed indoors, so the layer showed over
 * the fading rain: 80+ drops headless). On CI's software renderer the fade
 * advances per frame at 0.4 fps, so it outlasted the perf gate's whole kitchen
 * measurement as 33 "sprites drawn". weatherLayerTransition() makes the switch
 * instant whenever the weather being drawn is one the map does not allow.
 */
/** @vitest-environment node */
import { describe, it, expect, beforeAll } from 'vitest';
import { weatherLayerTransition } from '../data/weatherConfig';
import { initializeMaps } from '../maps';

describe('weatherLayerTransition', () => {
  // Weather zones come from the registered map definitions (hasClouds).
  beforeAll(() => initializeMaps());

  it('clears rain instantly indoors instead of fading it out on screen', () => {
    expect(weatherLayerTransition('rain', 'clear', 'mums_kitchen')).toEqual({ immediate: true, visible: true });
  });

  it('keeps a disallowed weather hidden indoors', () => {
    expect(weatherLayerTransition('clear', 'snow', 'mums_kitchen').visible).toBe(false);
    expect(weatherLayerTransition('rain', 'snow', 'mums_kitchen')).toEqual({ immediate: true, visible: false });
  });

  it('still crossfades outdoors', () => {
    expect(weatherLayerTransition('rain', 'clear', 'village')).toEqual({ immediate: false, visible: true });
    expect(weatherLayerTransition('clear', 'rain', 'village')).toEqual({ immediate: false, visible: true });
  });
});
