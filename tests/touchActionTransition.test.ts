/**
 * The touch action handler takes the exit the player is standing at (issue
 * #157), the same way the keyboard's E key does — as long as nothing closer to
 * hand (a farm action, the mirror, an NPC, a cooking fire) claims the press
 * first, which is the order both inputs share.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const deps = vi.hoisted(() => ({
  checkTransition: vi.fn(),
  checkNPCInteraction: vi.fn(),
  updatePlayerLocation: vi.fn(),
  playSfx: vi.fn(),
}));

vi.mock('../maps', () => ({
  mapManager: { getCurrentMapId: () => 'village', getCurrentMap: () => null },
}));
vi.mock('../GameState', () => ({
  gameState: { updatePlayerLocation: deps.updatePlayerLocation },
}));
vi.mock('../utils/AudioManager', () => ({ audioManager: { playSfx: deps.playSfx } }));
vi.mock('../utils/actionHandlers', () => ({
  handleFarmAction: () => ({ handled: false }),
  checkMirrorInteraction: () => false,
  checkNPCInteraction: deps.checkNPCInteraction,
  checkCookingStationInteraction: () => false,
  checkTransition: deps.checkTransition,
  handleForageAction: vi.fn(),
}));

import { useTouchControls } from '../hooks/useTouchControls';

function setup() {
  const onMapTransition = vi.fn(() => ({ x: 3, y: 4 }));
  const onSetActiveNPC = vi.fn();
  const { result } = renderHook(() =>
    useTouchControls({
      playerPosRef: { current: { x: 10, y: 29 } },
      selectedItemSlot: null,
      inventoryItems: [],
      keysPressed: {},
      onShowCharacterCreator: vi.fn(),
      onOpenCooking: vi.fn(),
      onSetActiveNPC,
      onSetPlayerPos: vi.fn(),
      onMapTransition,
      onFarmUpdate: vi.fn(),
      onFarmActionAnimation: vi.fn(),
    })
  );
  return { actions: result.current, onMapTransition, onSetActiveNPC };
}

beforeEach(() => {
  vi.clearAllMocks();
  deps.checkNPCInteraction.mockReturnValue(null);
});

describe('touch action at an exit', () => {
  it('takes the transition', () => {
    deps.checkTransition.mockReturnValue({
      success: true,
      mapId: 'forest_123',
      spawnPosition: { x: 1, y: 1 },
      hasDoor: true,
    });
    const { actions, onMapTransition } = setup();
    actions.handleActionPress();
    expect(deps.checkTransition).toHaveBeenCalledWith({ x: 10, y: 29 }, 'village');
    expect(onMapTransition).toHaveBeenCalledWith('forest_123', { x: 1, y: 1 });
    expect(deps.playSfx).toHaveBeenCalledWith('sfx_door_open');
    // The new location is saved, with the procedural seed parsed from the map id.
    expect(deps.updatePlayerLocation).toHaveBeenCalledWith('forest_123', { x: 3, y: 4 }, 123);
  });

  it('does nothing when there is no exit here', () => {
    deps.checkTransition.mockReturnValue({ success: false });
    const { actions, onMapTransition } = setup();
    actions.handleActionPress();
    expect(onMapTransition).not.toHaveBeenCalled();
  });

  it('talks to an NPC standing by the exit rather than leaving', () => {
    deps.checkNPCInteraction.mockReturnValue('mum');
    deps.checkTransition.mockReturnValue({ success: true, mapId: 'x', spawnPosition: { x: 0, y: 0 } });
    const { actions, onMapTransition, onSetActiveNPC } = setup();
    actions.handleActionPress();
    expect(onSetActiveNPC).toHaveBeenCalledWith('mum');
    expect(onMapTransition).not.toHaveBeenCalled();
  });
});
