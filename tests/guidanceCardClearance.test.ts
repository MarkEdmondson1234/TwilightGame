/** @vitest-environment node */
/**
 * The quest, activity and village-news cards (`.activity-invitation`) sit
 * top-right, above the HUD but below the touch controls. Their height has to
 * end above the chat, emote and satchel column in the bottom-right corner, or
 * the chat button paints over the story being read (issue #157: "the popups
 * have the chat button on top obscuring the news").
 *
 * The card is CSS and the controls are TypeScript, so this ties the two together.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rightClusterFootprint } from '../utils/touchLayout';

const css = readFileSync(resolve(__dirname, '../components/ActivityInvitation.css'), 'utf8');

describe('guidance card clearance', () => {
  it('ends above the bottom-right touch controls', () => {
    const match = css.match(/--guidance-bottom-clearance:\s*(\d+)px/);
    expect(match, 'ActivityInvitation.css must define --guidance-bottom-clearance').toBeTruthy();
    const clearance = Number(match![1]);
    expect(
      clearance,
      `--guidance-bottom-clearance (${clearance}px) must be at least the chat/emote/satchel ` +
        `column's height (${rightClusterFootprint().height}px) — raise it in ActivityInvitation.css`
    ).toBeGreaterThanOrEqual(rightClusterFootprint().height);
  });

  it('uses the clearance in every max-height the card is given', () => {
    const maxHeights = [...css.matchAll(/^\s*max-height:\s*([^;]+);/gm)].map((m) => m[1]);
    expect(maxHeights.length).toBeGreaterThan(0);
    const bypassing = maxHeights.filter((v) => !v.includes('var(--guidance-bottom-clearance)'));
    expect(bypassing, 'a max-height that ignores the controls lets them cover the card').toEqual(
      []
    );
  });
});
