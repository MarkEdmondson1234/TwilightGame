import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ActivityInvitation from '../components/ActivityInvitation';

const state = vi.hoisted(() => ({
  season: 'winter',
  skis: 0,
  remembered: new Set<string>(),
  npcs: [] as Array<{ id: string; name: string; position: { x: number; y: number } }>,
}));
vi.mock('../NPCManager', () => ({
  npcManager: {
    getCurrentMapNPCs: () => state.npcs,
    isNPCVisible: () => true,
    getNPCById: (id: string) => state.npcs.find((n) => n.id === id),
  },
}));
vi.mock('../utils/TimeManager', () => ({
  TimeManager: { getCurrentTime: () => ({ season: state.season }) },
}));
vi.mock('../utils/inventoryManager', () => ({
  inventoryManager: { getQuantity: () => state.skis },
}));
vi.mock('../data/items', () => ({ getItem: () => ({ image: '/skis.png' }) }));
vi.mock('../utils/activityLeadStorage', () => ({
  hasActivityLead: (id: string) => state.remembered.has(id),
  rememberActivityLead: (id: string) => state.remembered.add(id),
}));

const props = () => ({
  mapId: 'forest_123',
  playerPosition: { current: { x: 0, y: 0 } },
  blocked: false,
  onTalk: vi.fn(),
  onSki: vi.fn(),
  onJournal: vi.fn(),
});
beforeEach(() => {
  state.season = 'winter';
  state.skis = 0;
  state.remembered.clear();
  state.npcs = [];
});

describe('activity invitations', () => {
  it('defers behind another interface, then explains acquisition without offering an unequipped launch', () => {
    const p = props();
    const view = render(<ActivityInvitation {...p} blocked />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    view.rerender(<ActivityInvitation {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'How do I try it?' }));
    expect(screen.getByText(/Mr Fox sells skis/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go Skiing' })).not.toBeInTheDocument();
  });
  it('remembers Later and does not repeat after remounting', () => {
    const p = props();
    const view = render(<ActivityInvitation {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(state.remembered.has('skiing')).toBe(true);
    view.unmount();
    render(<ActivityInvitation {...p} />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(p.onSki).not.toHaveBeenCalled();
  });
  it('starts an equipped skier deliberately and preserves the lead', () => {
    state.skis = 1;
    const p = props();
    render(<ActivityInvitation {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go Skiing' }));
    expect(p.onSki).toHaveBeenCalledOnce();
    expect(state.remembered.has('skiing')).toBe(true);
  });
  it('notices winter beginning while already in the forest and stops offering it after winter', () => {
    vi.useFakeTimers();
    try {
      state.season = 'autumn';
      render(<ActivityInvitation {...props()} />);
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
      act(() => {
        state.season = 'winter';
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('complementary')).toBeInTheDocument();
      act(() => {
        state.season = 'spring';
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
  it('only invites a nearby host and hides their invitation after changing maps', () => {
    state.npcs = [{ id: 'child', name: 'Village Child', position: { x: 30, y: 30 } }];
    state.season = 'autumn';
    const p = { ...props(), mapId: 'village' };
    const view = render(<ActivityInvitation {...p} />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    state.npcs[0].position = { x: 1, y: 0 };
    view.rerender(<ActivityInvitation {...p} blocked />);
    view.rerender(<ActivityInvitation {...p} />);
    expect(screen.getByRole('button', { name: 'Ask Village Child' })).toBeInTheDocument();
    state.npcs = [];
    view.rerender(<ActivityInvitation {...p} mapId="home" />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
