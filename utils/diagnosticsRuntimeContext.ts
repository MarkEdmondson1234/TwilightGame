/**
 * Slow-minute runtime attribution for session diagnostics.
 *
 * When a one-minute performance window crosses the stall threshold in
 * `utils/sessionDiagnostics.ts`, this getter is asked "what was the world
 * doing?" and its fields are merged into that minute's summary. The point is
 * attribution: production already showed us a village minute at 41 FPS, but
 * with only sprite counts to explain it. Population, weather and remote
 * players turn such a minute from a curiosity into a reproducible report.
 *
 * Read-only by construction — diagnostics must never mutate game state — and
 * counters/enum names only: no gameplay content (children's game).
 */

import { gameState } from '../GameState';
import { npcManager } from '../NPCManager';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import { TimeManager } from './TimeManager';

export type RuntimeContextFields = Record<string, string | number | boolean>;

/** Registered once from gameInitializer via setSlowMinuteContext(). */
export function getSlowMinuteRuntimeContext(): RuntimeContextFields {
  return {
    'runtime.npc_count': npcManager.getCurrentMapNPCs().length,
    // Empty when presence is disabled or offline — that gap is itself signal.
    'runtime.remote_players': remotePlayerManager.getRemotePlayers().length,
    'runtime.weather': gameState.getWeather(),
    'runtime.season': TimeManager.getCurrentTime().season,
  };
}