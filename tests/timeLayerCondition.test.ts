/**
 * Room layers toggled by time of day and season (seaside day/sunset/night, winter art).
 *
 * A gap in coverage does not throw - the sky just goes blank for that season and hour -
 * and an overlap silently paints one picture over another. The coverage test checks the
 * real seaSide definition so that adding spring or autumn art later cannot leave a hole.
 */
/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { matchesTimeCondition } from '../utils/timeLayerCondition';
import { seaSide } from '../maps/definitions/seaSide';
import { Z_PARALLAX_FAR, Z_SPRITE_FOREGROUND } from '../zIndex';
import {
  type FixedDayPhase,
  type LayerSeason,
  type RoomLayer,
  type TimeLayerCondition,
} from '../types';

const PHASES: FixedDayPhase[] = ['day', 'sunset', 'night'];
const SEASONS: LayerSeason[] = ['Spring', 'Summer', 'Autumn', 'Winter'];

describe('matchesTimeCondition', () => {
  it('treats an omitted showWhen or seasons as "any"', () => {
    expect(matchesTimeCondition({ type: 'time' }, 'night', 'Winter')).toBe(true);
    expect(matchesTimeCondition({ type: 'time', showWhen: 'day' }, 'day', 'Autumn')).toBe(true);
    expect(matchesTimeCondition({ type: 'time', seasons: ['Winter'] }, 'sunset', 'Winter')).toBe(
      true
    );
  });

  it('rejects the wrong phase or season', () => {
    expect(matchesTimeCondition({ type: 'time', showWhen: 'day' }, 'night', 'Summer')).toBe(false);
    expect(matchesTimeCondition({ type: 'time', seasons: ['Winter'] }, 'day', 'Summer')).toBe(
      false
    );
  });

  it('accepts a list of phases', () => {
    const cond: TimeLayerCondition = { type: 'time', showWhen: ['day', 'night'] };
    expect(matchesTimeCondition(cond, 'night', 'Winter')).toBe(true);
    expect(matchesTimeCondition(cond, 'sunset', 'Winter')).toBe(false);
  });
});

function visibleImages(layers: RoomLayer[], zIndex: number, phase: FixedDayPhase, season: string) {
  return layers.filter(
    (layer) =>
      layer.type === 'image' &&
      layer.zIndex === zIndex &&
      (layer.condition?.type !== 'time' || matchesTimeCondition(layer.condition, phase, season))
  );
}

describe('seaSide seasonal layers', () => {
  it('shows exactly one background and one foreground for every season and phase', () => {
    const violations: string[] = [];
    for (const season of SEASONS) {
      for (const phase of PHASES) {
        for (const [name, z] of [
          ['background', Z_PARALLAX_FAR],
          ['foreground', Z_SPRITE_FOREGROUND],
        ] as const) {
          const shown = visibleImages(seaSide.layers ?? [], z, phase, season);
          if (shown.length !== 1) {
            violations.push(`${season} ${phase}: ${shown.length} ${name} layers visible`);
          }
        }
      }
    }
    expect(
      violations,
      'Each seaSide season x phase needs exactly one visible layer per depth - adjust the ' +
        "'time' conditions (showWhen/seasons) in maps/definitions/seaSide.ts"
    ).toEqual([]);
  });
});
