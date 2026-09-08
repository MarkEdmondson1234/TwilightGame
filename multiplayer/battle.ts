/**
 * Shared battles — one player fights, the others watch and cheer.
 *
 * Pure, no Firebase imports (mirrors `multiplayer/chat.ts` and
 * `multiplayer/npcSpeech.ts`).
 *
 * The goblin in a mine level used to be a strictly private encounter: a
 * full-screen modal on one client while the other player watched a character
 * stand motionless next to a goblin. Now that procedural caves are shared (see
 * `multiplayer/sharedMaps.ts`), the same goblin is genuinely the same goblin for
 * both players — so the fight is published as it happens, and beating it opens
 * the passage for everyone standing there.
 *
 * **The fight itself is not simulated remotely.** Only the fighter's client runs
 * `useCombatLogic`; spectators receive a summary and cannot influence the rounds
 * beyond cheering. Two clients independently simulating rock-paper-scissors
 * would need every enemy move seeded and every timer aligned, and the failure
 * mode — two children watching the same fight end differently — is worse than
 * anything it would buy.
 */

/** Longest a spectator keeps showing a battle with no update. */
export const BATTLE_STALE_AFTER_MS = 20000;

/**
 * How long a cheer floats, and the minimum gap between two cheers from the same
 * player that the fighter will act on. Mashing the button is free and does
 * nothing — it is a cheer, not a resource.
 */
export const CHEER_COOLDOWN_MS = 8000;

/** Stamina a cheer restores to the fighter. Losing a round costs several times this. */
export const CHEER_STAMINA = 5;

/** Longest narrative snippet a spectator sees, matching NPC speech. */
export const MAX_BATTLE_LINE_CHARS = 90;

/** Longest display name, matching presence and chat. */
export const MAX_BATTLE_NAME_CHARS = 20;

/** Where a battle is in its life. Terminal phases stop the spectator panel. */
export type BattlePhase = 'fight' | 'won' | 'lost' | 'fled';

const PHASES: readonly BattlePhase[] = ['fight', 'won', 'lost', 'fled'];

/** One battle as it goes on the wire, at `battles/{mapId}/{npcId}`. */
export interface BattleWire {
  /** Fighter's uid */
  u: string;
  /** Fighter's display name */
  n: string;
  /** Enemy display name, so a spectator sees who is being fought */
  e: string;
  /** Phase */
  p: BattlePhase;
  /** Round number */
  r: number;
  /** Enemy hits remaining */
  h: number;
  /** Enemy hits at full health, so a spectator can draw a bar */
  hm: number;
  /** Fighter's stamina, so a spectator can see them struggling */
  st: number;
  /** Latest narrative line */
  l: string;
  /** Server timestamp */
  t: number;
  /**
   * On a win, the tile where the lava passage opened — so every client in the
   * room reveals it at the *same* tile. Recomputing it locally would put two
   * players' entrances on different squares.
   */
  x?: number;
  y?: number;
}

/** One cheer, at `battles_cheers/{mapId}/{npcId}/{uid}`. Overwritten, never appended. */
export interface CheerWire {
  /** Cheerer's display name */
  n: string;
  /** Server timestamp */
  t: number;
}

/** Trim any player- or NPC-supplied string to a safe single line. */
export function trimField(value: string, max: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 1)}…`;
}

function finiteInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Validate an inbound battle record — a malformed one must be ignored, never crash. */
export function decodeBattle(raw: unknown): BattleWire | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;

  if (typeof d.u !== 'string' || !d.u) return null;
  if (typeof d.p !== 'string' || !PHASES.includes(d.p as BattlePhase)) return null;

  const wire: BattleWire = {
    u: d.u,
    n: trimField(typeof d.n === 'string' ? d.n : '', MAX_BATTLE_NAME_CHARS) || 'A traveller',
    e: trimField(typeof d.e === 'string' ? d.e : '', MAX_BATTLE_NAME_CHARS) || 'the enemy',
    p: d.p as BattlePhase,
    r: finiteInt(d.r, 0, 99, 0),
    h: finiteInt(d.h, 0, 99, 0),
    hm: finiteInt(d.hm, 1, 99, 1),
    st: finiteInt(d.st, 0, 100, 0),
    l: trimField(typeof d.l === 'string' ? d.l : '', MAX_BATTLE_LINE_CHARS),
    t: typeof d.t === 'number' ? d.t : 0,
  };

  // The revealed passage is only meaningful on a win, and only as a pair.
  if (wire.p === 'won' && typeof d.x === 'number' && typeof d.y === 'number') {
    wire.x = finiteInt(d.x, 0, 200, 0);
    wire.y = finiteInt(d.y, 0, 200, 0);
  }

  return wire;
}

/** Validate an inbound cheer. */
export function decodeCheer(raw: unknown): CheerWire | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  return {
    n: trimField(typeof d.n === 'string' ? d.n : '', MAX_BATTLE_NAME_CHARS) || 'Someone',
    t: typeof d.t === 'number' ? d.t : 0,
  };
}

/**
 * Should this cheer be acted on?
 *
 * Keyed per cheerer, so two spectators cheering at once both count while one
 * spectator mashing does not. `lastActedAt` is the local clock; the wire
 * timestamp is the server's, and mixing the two would let a slow clock unlock
 * the cooldown.
 */
export function shouldActOnCheer(lastActedAt: number | undefined, now: number): boolean {
  return lastActedAt === undefined || now - lastActedAt >= CHEER_COOLDOWN_MS;
}

/**
 * The live battle on the current map — spectator side.
 *
 * A Map rather than a single record because nothing stops two players fighting
 * two different goblins in the same cave, and the panel should follow the one
 * nearest to us rather than whichever arrived last.
 */
class BattleManager {
  private battles = new Map<string, BattleWire>();
  private mapId: string | null = null;

  getMapId(): string | null {
    return this.mapId;
  }

  /** Switch maps. Battles do not carry between them. */
  setMap(mapId: string | null): void {
    if (this.mapId === mapId) return;
    this.battles.clear();
    this.mapId = mapId;
  }

  apply(npcId: string, wire: BattleWire): void {
    this.battles.set(npcId, wire);
  }

  remove(npcId: string): void {
    this.battles.delete(npcId);
  }

  clear(): void {
    this.battles.clear();
  }

  /**
   * The battle to show, or null.
   *
   * `localUid` is skipped deliberately: the fighter has the combat screen, and a
   * spectator panel repeating it would sit on top of their own fight.
   */
  getSpectatedBattle(
    localUid: string | null,
    now: number = Date.now()
  ): { npcId: string; battle: BattleWire } | null {
    for (const [npcId, battle] of this.battles) {
      if (localUid && battle.u === localUid) continue;
      if (battle.p !== 'fight') continue;
      // A fighter who closed the tab mid-fight leaves a record nobody updates.
      if (battle.t > 0 && now - battle.t > BATTLE_STALE_AFTER_MS) continue;
      return { npcId, battle };
    }
    return null;
  }
}

export const battleManager = new BattleManager();
