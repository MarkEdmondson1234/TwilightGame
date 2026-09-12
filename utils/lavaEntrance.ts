/**
 * The passage a defeated goblin leaves behind.
 *
 * Extracted from App.tsx because there are now two ways to open it: you beat
 * the goblin yourself, or the friend standing next to you did. Both must open
 * it on *the same tile* — a spectator recomputing the position locally would
 * get a different square, and the two players would be looking at two mine
 * entrances in one cave.
 *
 * So the winner's client chooses the tile and publishes it (see
 * `multiplayer/battle.ts`); everyone else is told where.
 */

import { mapManager } from '../maps/MapManager';
import { gameState } from '../GameState';
import { findClearTileNear } from './mapUtils';
import { TileType } from '../types';
import { debugLog } from './debugLog';
import { battleManager } from '../multiplayer/battle';

/** Where the lava levels drop the player when they take this passage. */
const LAVA_SPAWN = { x: 3, y: 15 };

/**
 * Pick the tile a goblin's passage should open on, or null if there is no clear
 * floor near where it stood.
 *
 * If somebody else in the cave has already beaten this goblin, their published
 * tile wins — the goblin chases every player on their own screen, so two
 * friends beating "the same" goblin a few seconds apart is the normal case,
 * and each picking their own square is how one cave got two entrances.
 */
export function chooseLavaEntranceTile(
  goblinPosition: { x: number; y: number },
  mapId: string,
  npcId?: string
): { x: number; y: number } | null {
  const published = npcId ? battleManager.getVictory(npcId) : null;
  if (published && published.x !== undefined && published.y !== undefined) {
    return { x: published.x, y: published.y };
  }
  return findClearTileNear(
    { x: Math.floor(goblinPosition.x), y: Math.floor(goblinPosition.y) },
    mapId
  );
}

/**
 * Open the passage at `position`.
 *
 * Idempotent: a cave has at most one entrance, and both the local victory and
 * the broadcast one can arrive for the same fight. Returns true only when this
 * call is what opened it, so the caller knows whether to say so.
 */
export function openLavaEntranceAt(mapId: string, position: { x: number; y: number }): boolean {
  if (gameState.getLavaEntrance(mapId)) return false;

  mapManager.setTile(position.x, position.y, TileType.MINE_ENTRANCE);
  mapManager.addTransition({
    fromPosition: position,
    tileType: TileType.MINE_ENTRANCE,
    toMapId: 'RANDOM_LAVA',
    toPosition: LAVA_SPAWN,
    label: 'Enter Lava Levels',
  });
  gameState.revealLavaEntrance(mapId, position);
  debugLog('Cave', `Lava passage opened at (${position.x}, ${position.y}) on ${mapId}`);
  return true;
}
