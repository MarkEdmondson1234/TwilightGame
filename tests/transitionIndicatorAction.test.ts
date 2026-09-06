import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapDefinition, Transition } from '../types';
const deps = vi.hoisted(() => ({
  transitionToMap: vi.fn(),
  getTransitionAt: vi.fn(),
  cutscene: vi.fn(),
  blocked: vi.fn(),
}));
vi.mock('../maps', () => ({
  mapManager: { getCurrentMapId: () => 'forest', getTransitionAt: deps.getTransitionAt },
  transitionToMap: deps.transitionToMap,
}));
vi.mock('../utils/transitionRequirements', () => ({ transitionBlockedReason: deps.blocked }));
vi.mock('../utils/CutsceneManager', () => ({
  cutsceneManager: { triggerManualCutscene: deps.cutscene },
}));
import { activateTransitionIndicator } from '../utils/activateTransitionIndicator';
const transition: Transition = {
  tileType: 0,
  fromPosition: { x: 5, y: 5 },
  toMapId: 'village',
  toPosition: { x: 1, y: 1 },
};
const map = { id: 'forest', transitions: [transition] } as MapDefinition;
beforeEach(() => {
  vi.clearAllMocks();
  deps.blocked.mockReturnValue(null);
  deps.getTransitionAt.mockReturnValue({ transition });
  deps.transitionToMap.mockReturnValue({
    map: { id: 'village', name: 'Village' },
    spawn: { x: 1, y: 1 },
  });
});
describe('transition indicator validation', () => {
  it('uses the existing transition pipeline within icon range', () => {
    const done = vi.fn();
    activateTransitionIndicator(transition, map, { x: 5, y: 8 }, 0, 0, done);
    expect(deps.transitionToMap).toHaveBeenCalledWith('village', { x: 1, y: 1 });
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ success: true, mapId: 'village' }));
  });
  it('rejects distant, stale and cooldown taps', () => {
    activateTransitionIndicator(transition, map, { x: 0, y: 0 }, 0, 0, vi.fn());
    activateTransitionIndicator(
      transition,
      { ...map, id: 'elsewhere' },
      { x: 5, y: 5 },
      0,
      0,
      vi.fn()
    );
    activateTransitionIndicator(transition, map, { x: 5, y: 5 }, 0, Date.now(), vi.fn());
    expect(deps.transitionToMap).not.toHaveBeenCalled();
  });
  it('preserves quest gates and explains the block', () => {
    deps.blocked.mockReturnValue('Finish the trial first');
    const done = vi.fn();
    activateTransitionIndicator(transition, map, { x: 5, y: 5 }, 0, 0, done);
    expect(deps.transitionToMap).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(
      expect.objectContaining({ blocked: true, message: 'Finish the trial first' })
    );
  });
  it('preserves size restrictions', () => {
    const done = vi.fn();
    activateTransitionIndicator(transition, map, { x: 5, y: 5 }, 2, 0, done);
    expect(deps.transitionToMap).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(expect.objectContaining({ blocked: true }));
  });
  it('runs preceding cutscenes instead of skipping them', () => {
    deps.getTransitionAt.mockReturnValue({
      transition: { ...transition, precedingCutsceneId: 'intro' },
    });
    activateTransitionIndicator(transition, map, { x: 5, y: 5 }, 0, 0, vi.fn());
    expect(deps.cutscene).toHaveBeenCalledWith('intro', expect.anything());
    expect(deps.transitionToMap).not.toHaveBeenCalled();
  });
});
