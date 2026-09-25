/**
 * Touch: walking up to someone no longer opens their action menu unasked (issue #157:
 * "need it small icon and pop up if player clicks"). The name tag above them is the
 * way in; tapping it opens the menu at the tag.
 */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { NPC } from '../types';

vi.mock('../utils/readQuestNextSteps', () => ({ readQuestConversations: () => new Map() }));
vi.mock('../NPCManager', () => ({ npcManager: { isNPCVisible: () => true } }));
vi.mock('../hooks/useTouchDevice', () => ({ useTouchDevice: () => true }));
import NPCInteractionIndicators from '../components/NPCInteractionIndicators';
import { getWorldUiScale, WORLD_UI_MIN_SCALE } from '../utils/touchLayout';

const elias = { id: 'village_elder', name: 'Elias', position: { x: 5, y: 5 }, scale: 1 } as NPC;

describe('tap an NPC tag to see what you can do', () => {
  it('shows a tappable tag for the NPC in range, which opens their actions', () => {
    const open = vi.fn();
    render(
      <NPCInteractionIndicators
        npcs={[elias]}
        playerPos={{ x: 5, y: 6 }}
        tappableNpcId="village_elder"
        onOpenActions={open}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'What can I do with Elias?' }));
    expect(open).toHaveBeenCalledOnce();
    expect(open.mock.calls[0][0]).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });

  it('shows nothing for an ordinary villager who is not the one in range', () => {
    render(
      <NPCInteractionIndicators
        npcs={[elias]}
        playerPos={{ x: 5, y: 6 }}
        tappableNpcId={null}
        onOpenActions={vi.fn()}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('in-world prompt size', () => {
  it('never draws prompts smaller than a phone at 50% always has', () => {
    expect(getWorldUiScale(1)).toBe(1);
    expect(getWorldUiScale(0.5)).toBe(1);
    expect(getWorldUiScale(1 / 3) * (1 / 3)).toBeCloseTo(WORLD_UI_MIN_SCALE);
  });
});
