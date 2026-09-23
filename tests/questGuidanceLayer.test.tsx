/**
 * Issue #157: the pinned quest, activity invitations and village news are cards
 * fixed to the screen next to the HUD, but they were layered at Z_ACTION_PROMPTS
 * (410) — a world-overlay layer — so the wallet, clock and top-right buttons
 * (Z_HUD, 1000) painted over them on a phone. They now share Z_QUEST_GUIDANCE,
 * which must sit above every HUD element and below the touch controls and every
 * modal. Nothing throws when this ordering breaks; the card just vanishes
 * behind the HUD, so it is pinned here.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as Z from '../zIndex';

vi.mock('../utils/pinnedQuest', () => ({
  readPinnedQuest: () => ({
    id: 'gardening_quest',
    title: 'Help Elias with the Garden',
    nextStep: { action: 'Grow a crop for Elias', where: 'Village garden', details: [] },
  }),
  pinQuest: vi.fn(),
}));
vi.mock('../utils/activityLeadStorage', () => ({
  hasActivityLead: () => false,
  rememberActivityLead: vi.fn(),
}));
vi.mock('../data/items', () => ({ getItem: () => ({ image: '/skis.png' }) }));

import PinnedQuest from '../components/PinnedQuest';
import VillageNews from '../components/VillageNews';

describe('quest guidance layering', () => {
  it('sits above every HUD element and below touch controls and modals', () => {
    const hud = [Z.Z_HUD, Z.Z_INVENTORY, Z.Z_PRESENCE_INDICATOR];
    for (const layer of hud) expect(Z.Z_QUEST_GUIDANCE).toBeGreaterThan(layer);
    // The D-pad and the chat/emote pickers opened from it must stay usable.
    for (const layer of [Z.Z_TOUCH_CONTROLS, Z.Z_CHAT_PANEL, Z.Z_EMOTE_WHEEL]) {
      expect(Z.Z_QUEST_GUIDANCE).toBeLessThan(layer);
    }
    for (const layer of [Z.Z_MODAL, Z.Z_DIALOGUE, Z.Z_JOURNAL]) {
      expect(Z.Z_QUEST_GUIDANCE).toBeLessThan(layer);
    }
  });

  it('is the layer the pinned quest actually renders on', () => {
    render(<PinnedQuest blocked={false} onJournal={() => {}} />);
    const card = screen.getByRole('complementary', { name: 'Pinned quest' });
    expect(Number(card.style.zIndex)).toBe(Z.Z_QUEST_GUIDANCE);
  });

  it('is the layer village news actually renders on', () => {
    render(
      <VillageNews
        blocked={false}
        onJournal={() => {}}
        news={{
          uid: 'reader',
          batch: {
            uid: 'reader',
            stories: [
              {
                key: 'skiing',
                title: 'An adventure in the snow',
                story: 'A neighbour has discovered skiing.',
                lead: 'skiing' as const,
                neighbours: 1,
              },
            ],
            returning: false,
            truncated: false,
          },
          unavailable: false,
          dismissed: false,
          markRead: vi.fn(),
          dismiss: vi.fn(),
          refresh: vi.fn(),
        }}
      />
    );
    const card = screen.getByRole('complementary', { name: 'Village news' });
    expect(Number(card.style.zIndex)).toBe(Z.Z_QUEST_GUIDANCE);
  });
});
