/**
 * Regression for issue #106 (indoor half): the stamina bar / rest indicator computed
 * their above-head clearance with constants that did not scale with the background-image
 * room's effective tile size, so once PR #43 switched interiors to cover scaling the
 * (proportionally larger) sprite grew until the bar sat inside the character's head and
 * the "z z z" drift start landed on the face.
 *
 * The geometry it locks in (all distances above the player's tile centre):
 * - The character artwork is a 1024x1024 frame drawn at 2.4 x characterScale x tileSize
 *   (PLAYER_SIZE 0.8 at the 3x custom-sprite scale); the visible character's top edge is
 *   ~12.1% down the frame, so the visible head top sits at ~0.91 x cs x ts.
 * - StaminaBar bottom = round(0.4 x cs x ts) + 58 x cs x ts/TILE above centre (plus the
 *   fixed 8px bar): ~25px of daylight above the visible head on exteriors (ts=64), kept
 *   proportionate on interiors by scaling the gap with cs x tileSize.
 * - RestIndicator's drift start tracks the same proportionality (30px offset scaled by
 *   cs x ts/TILE), so the zs still emerge at the head and float up-right.
 *
 * Exteriors (cs=1, tileSize=TILE_SIZE) must be pixel-identical to the pre-fix values.
 */
/** @vitest-environment jsdom */
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StaminaBar } from '../components/StaminaBar';
import { RestIndicator } from '../components/RestIndicator';
import { TILE_SIZE } from '../constants';

vi.mock('../GameState', () => ({ gameState: { getStamina: () => 50 } }));

/** Visible head top above tile centre, from the real artwork's alpha bounding box. */
const HEAD_TOP_FACTOR = 0.91; // (0.5 - 0.121) * 2.4 — see file comment
/** Ideal daylight (bar bottom above head top) as a fraction of cs*ts. */
const DAYLIGHT_FACTOR = 58 / TILE_SIZE - (HEAD_TOP_FACTOR - 0.4); // ~0.396
/** The bar is 8px tall: its bottom edge sits BAR_HEIGHT below the computed top. */
const BAR_HEIGHT = 8;

function barBottomAboveCentre(playerY: number, cs: number, ts: number): number {
  const { container } = render(
    <StaminaBar playerX={5} playerY={playerY} characterScale={cs} tileSize={ts} forceShow />
  );
  // The visible bar is the second div (first is the hover area).
  const bar = container.querySelectorAll('div')[1] as HTMLElement;
  const top = parseFloat(bar.style.top);
  cleanup();
  return playerY * ts - top - BAR_HEIGHT; // px above the player's tile centre
}

function zzzTopAboveCentre(playerY: number, cs: number, ts: number): number {
  const { container } = render(
    <RestIndicator effect="sleep" playerX={5} playerY={playerY} characterScale={cs} tileSize={ts} />
  );
  const box = container.firstElementChild as HTMLElement;
  const top = parseFloat(box.style.top);
  cleanup();
  return playerY * ts - top;
}

describe('issue #106: above-head clearance scales with the room tile size', () => {
  afterEach(() => cleanup());

  it('exteriors (tileSize = TILE_SIZE) keep the pre-fix position exactly', () => {
    // Bar bottom = round(0.4*cs*ts) + 58*cs above centre (unchanged by the fix).
    expect(barBottomAboveCentre(10, 1.0, TILE_SIZE)).toBeCloseTo(26 + 58, 5);
    // Zzz block top = round(0.4*cs*ts) + 30 above centre (unchanged).
    expect(zzzTopAboveCentre(10, 1.0, TILE_SIZE)).toBeCloseTo(26 + 30, 5);
  });

  it('home_upstairs at 1920x900 (ts=128, cs=1.8) keeps the bar clear of the head', () => {
    // Pre-fix the bar bottom sat ~5px INSIDE the visible head here (and deeper on
    // larger monitors, where the fixed gap fell further behind the growing sprite).
    const above = barBottomAboveCentre(6, 1.8, 128);
    expect(above).toBeGreaterThan(HEAD_TOP_FACTOR * 1.8 * 128);
  });

  it('daylight above the head is proportional to characterScale * tileSize at every scale', () => {
    // daylight = DAYLIGHT_FACTOR * cs * ts + fixed 8px bar (rounding of the half-sprite
    // term adds <= 0.5px). The proportionality — not the constant — is what stops the
    // bar from sliding into the head as rooms cover-scale.
    for (const [cs, ts] of [
      [1.0, 64], // exterior farm
      [1.8, 83.2], // home_upstairs floor (viewportScale 1.0)
      [1.8, 128], // home_upstairs at 1920x900 after #43
      [1.0, 171], // large-monitor interior
    ] as const) {
      const daylight = barBottomAboveCentre(6, cs, ts) - HEAD_TOP_FACTOR * cs * ts;
      expect(daylight).toBeGreaterThan(0);
      // Math.round on the half-sprite term costs up to 0.5px; proportionality itself
      // is exact, so hold the deviation to well under a pixel.
      expect(Math.abs(daylight - DAYLIGHT_FACTOR * cs * ts)).toBeLessThan(0.6);
    }
  });

  it('the resting "z z z" starts at the head at interior scales, not on the face', () => {
    // Drift start = round(0.4*cs*ts) + 30*cs*ts/TILE = ~0.869*cs*ts above centre — just
    // under the head top, matching the exterior relationship (2.6px below at ts=64).
    // Pre-fix it sat at 0.4*cs*ts + 30: ~88px below the head top at ts=128, cs=1.8.
    expect(zzzTopAboveCentre(6, 1.8, 128)).toBeCloseTo(0.869 * 1.8 * 128, 0);
  });
});
