/** @vitest-environment node */
import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../minigames/registry', () => ({ getMiniGame: () => ({ id: 'skiing' }) }));
vi.mock('../utils/inventoryManager', () => ({ inventoryManager: { addItem: vi.fn() } }));
vi.mock('../GameState', () => ({ gameState: {} }));
vi.mock('../utils/FriendshipManager', () => ({ friendshipManager: {} }));
import { miniGameManager } from '../minigames/MiniGameManager';
import { inventoryManager } from '../utils/inventoryManager';

describe('mini-game recovery rewards', () => {
  beforeEach(() => vi.clearAllMocks());
  it('awards only explicit salvage on failure, never the full haul', () => {
    miniGameManager.processResult('skiing', {
      success: false,
      rewards: [{ itemId: 'wood_poor', quantity: 8 }],
      salvageRewards: [{ itemId: 'wood_poor', quantity: 2 }],
    });
    expect(inventoryManager.addItem).toHaveBeenCalledExactlyOnceWith('wood_poor', 2);
  });
  it('preserves ordinary failed mini-game behaviour', () => {
    miniGameManager.processResult('skiing', {
      success: false,
      rewards: [{ itemId: 'wood_poor', quantity: 8 }],
    });
    expect(inventoryManager.addItem).not.toHaveBeenCalled();
  });
  it('does not award salvage on top of a successful run', () => {
    miniGameManager.processResult('skiing', {
      success: true,
      rewards: [{ itemId: 'wood_poor', quantity: 8 }],
      salvageRewards: [{ itemId: 'wood_poor', quantity: 2 }],
    });
    expect(inventoryManager.addItem).toHaveBeenCalledExactlyOnceWith('wood_poor', 8);
  });
});
