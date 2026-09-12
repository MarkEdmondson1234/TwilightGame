// @vitest-environment node
/** Two independent transports against an in-memory RTDB adapter (no production writes). */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createState } from '../minigames/lava-leap/engine';
import type { LeapRun, LeapPeer } from '../minigames/lava-leap/multiplayer';

const db = vi.hoisted(() => {
  interface Snapshot {
    val: () => unknown;
    key: string;
    forEach: (cb: (child: Snapshot) => void) => void;
  }
  let values: Record<string, unknown> = {};
  const listeners = new Map<string, Set<(snapshot: Snapshot) => void>>();
  const read = (path: string) => {
    if (path === '.info/connected') return true;
    if (path === '.info/serverTimeOffset') return 0;
    return path
      .split('/')
      .reduce<unknown>(
        (value, key) =>
          value && typeof value === 'object'
            ? ((value as Record<string, unknown>)[key] ?? null)
            : null,
        values
      );
  };
  const snapshot = (path: string): Snapshot => ({
    val: () => structuredClone(read(path)),
    key: path.split('/').at(-1)!,
    forEach: (cb) =>
      Object.keys((read(path) ?? {}) as object).forEach((key) => cb(snapshot(`${path}/${key}`))),
  });
  const write = (path: string, value: unknown) => {
    const keys = path.split('/');
    let current = values;
    for (const key of keys.slice(0, -1)) {
      current[key] ??= {};
      current = current[key] as Record<string, unknown>;
    }
    if (value === null) delete current[keys.at(-1)!];
    else current[keys.at(-1)!] = structuredClone(value);
    for (const [watched, handlers] of listeners) {
      if (watched === path || path.startsWith(`${watched}/`) || watched.startsWith(`${path}/`)) {
        for (const handler of handlers) handler(snapshot(watched));
      }
    }
  };
  return {
    uid: 'alice',
    read,
    write,
    snapshot,
    listeners,
    reset: () => {
      values = {};
      listeners.clear();
    },
    disconnects: new Set<string>(),
  };
});
vi.mock('../firebase/realtimeConfig', () => ({ getRealtimeDb: () => ({}) }));
vi.mock('../firebase/authService', () => ({
  authService: {
    getUserId: () => db.uid,
    isAuthenticated: () => true,
    onAuthStateChange: (cb: (state: unknown) => void) => {
      cb({ user: { uid: db.uid }, isAuthenticated: true });
      return () => {};
    },
  },
}));
vi.mock('firebase/database', () => ({
  ref: (_db: unknown, path: string) => path,
  get: async (path: string) => db.snapshot(path),
  set: async (path: string, value: unknown) => db.write(path, value),
  remove: async (path: string) => db.write(path, null),
  serverTimestamp: () => Date.now(),
  onDisconnect: (path: string) => ({
    remove: async () => {
      db.disconnects.add(path);
    },
    cancel: async () => {
      db.disconnects.delete(path);
    },
  }),
  onValue: (path: string, cb: (snapshot: ReturnType<typeof db.snapshot>) => void) => {
    const group = db.listeners.get(path) ?? new Set();
    group.add(cb);
    db.listeners.set(path, group);
    cb(db.snapshot(path));
    return () => {
      group.delete(cb);
    };
  },
  runTransaction: async (path: string, reduce: (value: unknown) => unknown) => {
    const next = reduce(structuredClone(db.read(path)));
    if (next !== undefined) db.write(path, next);
    return { committed: next !== undefined, snapshot: db.snapshot(path) };
  },
}));
import { connectLavaLeap, type LeapConnection } from '../firebase/lavaLeapService';

let sessions: LeapConnection[];
beforeEach(() => {
  db.reset();
  db.disconnects.clear();
  sessions = [];
  vi.useFakeTimers();
  vi.setSystemTime(100000);
});
afterEach(async () => {
  await Promise.all(sessions.map((session) => session.close()));
  vi.useRealTimers();
});
async function join(uid: string, mode: 'race' | 'coop' = 'coop') {
  db.uid = uid;
  const received: { run?: LeapRun; peers: LeapPeer[] } = { peers: [] };
  const failed = vi.fn();
  const connection = await connectLavaLeap(
    'lava_123',
    mode,
    uid,
    'character1',
    (run, peers) => {
      received.run = run;
      received.peers = peers;
    },
    failed
  );
  sessions.push(connection);
  return { connection, received, failed };
}
const cast = { power: 'frost', castAt: 0 };

describe('two-device Lava Leap transport', () => {
  it('gives both players the same countdown and shares peer positions and powers', async () => {
    const a = await join('alice');
    expect(a.received.run?.startsAt).toBe(0);
    const b = await join('bob');
    expect(a.received.run).toEqual(b.received.run);
    expect(a.received.run?.startsAt).toBe(104000);
    vi.setSystemTime(105000);
    const state = { ...createState(), x: 450, ice: { x: 500, y: 440, w: 180, expires: 5 } };
    await a.connection.publish(state, cast);
    expect(b.received.peers[0].x).toBe(450);
    expect(b.received.peers[0].iceUntil).toBe(110000);
    expect(db.disconnects.size).toBe(2);
    await a.connection.close();
    expect(b.received.peers).toEqual([]);
  });
  it('merges pickups, keeps one branch choice, and ignores late progress from the old course', async () => {
    const a = await join('alice');
    const b = await join('bob');
    vi.setSystemTime(105000);
    await a.connection.publish({ ...createState(), collected: [0, 2], checkpoint: 1 }, cast);
    await b.connection.publish(
      { ...createState(), collected: [1, 2], checkpoint: 2, won: true },
      cast
    );
    expect(a.received.run?.gems).toBe(7);
    expect(a.received.run?.checkpoint).toBe(2);
    await a.connection.branch('forge');
    await b.connection.branch('grotto');
    expect(a.received.run?.course).toBe('forge');
    expect(b.received.run?.banked).toBe(3);
    await b.connection.publish({ ...createState(), collected: [5], won: true }, cast);
    expect(a.received.run?.gems).toBe(0);
    expect(a.received.run?.won).toBe(false);
  });
  it('records one race winner and does not share pickups between racers', async () => {
    const a = await join('alice', 'race');
    const b = await join('bob', 'race');
    vi.setSystemTime(105000);
    await a.connection.publish({ ...createState(), collected: [0], won: true }, cast);
    await b.connection.publish({ ...createState(), collected: [1], won: true }, cast);
    expect(a.received.run?.winner).toBe('alice');
    expect(b.received.run?.winner).toBe('alice');
    expect(a.received.run?.gems).toBe(0);
  });
  it('does not admit a third player or start a separate copy of an occupied run', async () => {
    await join('alice');
    await join('bob');
    await expect(join('charlie')).rejects.toThrow('already has two players');
  });
  it('isolates a new run from a previous run’s delayed cleanup', async () => {
    const a = await join('alice', 'race');
    await join('bob', 'race');
    vi.setSystemTime(105000);
    await a.connection.publish({ ...createState(), won: true }, cast);
    const next = await join('alice', 'race');
    await a.connection.close();
    await next.connection.publish({ ...createState(), x: 90 }, cast);
    const bob = await join('bob', 'race');
    expect(bob.received.peers[0].x).toBe(90);
    expect(next.failed).not.toHaveBeenCalled();
  });
});
