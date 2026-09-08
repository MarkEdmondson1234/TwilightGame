/**
 * @vitest-environment node
 *
 * Shared battles — one player fights, the others watch and cheer.
 *
 * Two properties matter here and both fail silently if they break:
 *
 *  - A spectator must never see their *own* fight in the spectator panel (they
 *    have the combat screen), and must never keep watching a fight that has
 *    ended or whose fighter closed the tab.
 *  - A cheer must pay out once. Cheers arrive through a whole-subtree listener,
 *    so every cheer redelivers every other cheer alongside it; without the
 *    monotonic-timestamp guard in useBattleController one cheer would keep
 *    topping the fighter up every time anyone else cheered.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  battleManager,
  decodeBattle,
  decodeCheer,
  shouldActOnCheer,
  trimField,
  BATTLE_STALE_AFTER_MS,
  CHEER_COOLDOWN_MS,
  MAX_BATTLE_LINE_CHARS,
  MAX_BATTLE_NAME_CHARS,
} from '../multiplayer/battle';
import type { BattleWire } from '../multiplayer/battle';

const ROOT = join(__dirname, '..');
const NOW = 1_700_000_000_000;
const FIGHTER = 'uid-fighter';
const WATCHER = 'uid-watcher';

function wire(overrides: Partial<BattleWire> = {}): BattleWire {
  return {
    u: FIGHTER,
    n: 'Alma',
    e: 'Goblin',
    p: 'fight',
    r: 3,
    h: 2,
    hm: 4,
    st: 60,
    l: 'The goblin lunges!',
    t: NOW,
    ...overrides,
  };
}

describe('decodeBattle', () => {
  it('accepts a well-formed record', () => {
    expect(decodeBattle(wire())).toMatchObject({ u: FIGHTER, p: 'fight', h: 2, hm: 4 });
  });

  it('rejects anything without a fighter or a known phase', () => {
    expect(decodeBattle(null)).toBeNull();
    expect(decodeBattle({ ...wire(), u: '' })).toBeNull();
    expect(decodeBattle({ ...wire(), p: 'dancing' })).toBeNull();
  });

  it('clamps numbers rather than trusting them', () => {
    const decoded = decodeBattle({ ...wire(), r: -5, h: 1e9, st: 999, hm: 0 });
    expect(decoded).toMatchObject({ r: 0, h: 99, st: 100, hm: 1 });
  });

  it('truncates the narrative line and the name', () => {
    const decoded = decodeBattle({ ...wire(), l: 'x'.repeat(500), n: 'y'.repeat(80) });
    expect(decoded!.l.length).toBeLessThanOrEqual(MAX_BATTLE_LINE_CHARS);
    expect(decoded!.n.length).toBeLessThanOrEqual(MAX_BATTLE_NAME_CHARS);
  });

  it('only carries a revealed passage on a win, and only as a complete pair', () => {
    // The tile is what stops two players opening two entrances in one cave, so
    // a half-record must not be treated as one.
    expect(decodeBattle({ ...wire(), p: 'won', x: 4, y: 9 })).toMatchObject({ x: 4, y: 9 });
    expect(decodeBattle({ ...wire(), p: 'won', x: 4 })).not.toHaveProperty('x');
    expect(decodeBattle({ ...wire(), p: 'fight', x: 4, y: 9 })).not.toHaveProperty('x');
  });
});

describe('decodeCheer', () => {
  it('falls back to a name rather than rendering nothing', () => {
    expect(decodeCheer({ t: NOW })?.n).toBe('Someone');
  });
});

describe('trimField', () => {
  it('collapses whitespace and elides overlong values', () => {
    expect(trimField('  a   b  ', 20)).toBe('a b');
    expect(trimField('x'.repeat(30), 10)).toHaveLength(10);
  });
});

describe('battleManager', () => {
  beforeEach(() => {
    battleManager.setMap(null);
    battleManager.setMap('cave_123');
  });

  it('shows another player’s fight', () => {
    battleManager.apply('goblin_depth_1_123', wire());
    expect(battleManager.getSpectatedBattle(WATCHER, NOW)?.npcId).toBe('goblin_depth_1_123');
  });

  it('never shows us our own fight — we have the combat screen for that', () => {
    battleManager.apply('goblin_depth_1_123', wire());
    expect(battleManager.getSpectatedBattle(FIGHTER, NOW)).toBeNull();
  });

  it('stops showing a fight once it has ended', () => {
    battleManager.apply('goblin_depth_1_123', wire({ p: 'won' }));
    expect(battleManager.getSpectatedBattle(WATCHER, NOW)).toBeNull();
  });

  it('drops a fight nobody is updating — the fighter closed the tab', () => {
    battleManager.apply('goblin_depth_1_123', wire());
    expect(battleManager.getSpectatedBattle(WATCHER, NOW + BATTLE_STALE_AFTER_MS + 1)).toBeNull();
  });

  it('does not carry fights between maps', () => {
    battleManager.apply('goblin_depth_1_123', wire());
    battleManager.setMap('village');
    expect(battleManager.getSpectatedBattle(WATCHER, NOW)).toBeNull();
  });
});

describe('shouldActOnCheer', () => {
  it('pays out the first cheer from a player', () => {
    expect(shouldActOnCheer(undefined, NOW)).toBe(true);
  });

  it('ignores mashing, but lets a later cheer through', () => {
    expect(shouldActOnCheer(NOW, NOW + 1000)).toBe(false);
    expect(shouldActOnCheer(NOW, NOW + CHEER_COOLDOWN_MS)).toBe(true);
  });
});

describe('battle security rules', () => {
  const rules = JSON.parse(readFileSync(join(ROOT, 'database.rules.json'), 'utf-8'));
  const battle = rules.rules?.battles?.$mapId?.$npcId;
  const cheer = rules.rules?.battlesCheers?.$mapId?.$npcId?.$uid;

  it('lets only the fighter write or delete their own battle record', () => {
    // Otherwise anyone could end somebody else's fight, or forge a victory that
    // opens a lava passage on every client in the cave.
    const write: string = battle?.['.write'] ?? '';
    expect(write).toContain("newData.child('u').val() === auth.uid");
    expect(write).toContain("data.child('u').val() === auth.uid");
    expect(battle?.u?.['.validate']).toBe('newData.val() === auth.uid');
  });

  it('pins the phase to the closed vocabulary the client uses', () => {
    const validate: string = battle?.p?.['.validate'] ?? '';
    for (const phase of ['fight', 'won', 'lost', 'fled']) {
      expect(validate, `phase "${phase}" missing from database.rules.json`).toContain(
        `'${phase}'`
      );
    }
  });

  it('enforces the same line cap the client truncates to', () => {
    const cap = battle?.l?.['.validate']?.match(/length <= (\d+)/)?.[1];
    expect(
      Number(cap),
      `database.rules.json caps the battle line at ${cap} but multiplayer/battle.ts uses ` +
        `MAX_BATTLE_LINE_CHARS = ${MAX_BATTLE_LINE_CHARS}. Update both together.`
    ).toBe(MAX_BATTLE_LINE_CHARS);
  });

  it('keeps the revealed passage inside map bounds', () => {
    expect(battle?.x?.['.validate']).toContain('<= 200');
    expect(battle?.y?.['.validate']).toContain('<= 200');
  });

  it('lets a player cheer only as themselves', () => {
    expect(cheer?.['.write']).toContain('auth.uid === $uid');
  });

  it('rejects unknown keys on both records, keeping the shapes closed', () => {
    expect(battle?.$other?.['.validate']).toBe(false);
    expect(cheer?.$other?.['.validate']).toBe(false);
  });
});
