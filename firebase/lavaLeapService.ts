/** Two-player, per-entrance runs. Loaded only when an online Lava Leap mode is chosen. */
import {
  get,
  ref,
  onValue,
  onDisconnect,
  remove,
  runTransaction,
  set,
  serverTimestamp,
} from 'firebase/database';
import { getRealtimeDb } from './realtimeConfig';
import { authService } from './authService';
import { createState, type State } from '../minigames/lava-leap/engine';
import {
  decodePeer,
  decodeRun,
  gemMask,
  gemIndices,
  mergeProgress,
  roomKey,
  type LeapPeer,
  type LeapRun,
} from '../minigames/lava-leap/multiplayer';
import type { CourseId } from '../minigames/lava-leap/courses';

export interface LeapConnection {
  uid: string;
  now: () => number;
  publish: (state: State, cast: { power: string; castAt: number }) => Promise<void>;
  branch: (course: CourseId) => Promise<void>;
  close: () => Promise<void>;
}

export async function connectLavaLeap(
  map: string,
  mode: 'coop' | 'race',
  name: string,
  character: string,
  update: (run: LeapRun, peers: LeapPeer[]) => void,
  failed: (message: string) => void
): Promise<LeapConnection> {
  const db = getRealtimeDb();
  const uid = authService.getUserId();
  if (!db || !uid || !authService.isAuthenticated()) throw new Error('Sign in to play together.');
  const root = `lavaLeap/${roomKey(map, mode)}`;
  const runRef = ref(db, `${root}/run`);
  let offset = 0;
  const offsetSnapshot = await get(ref(db, '.info/serverTimeOffset'));
  offset = Number(offsetSnapshot.val()) || 0;
  const now = () => Date.now() + offset;
  const proposedId = crypto.randomUUID();
  const initial = { ...createState(mode === 'race'), earthUnlocked: mode === 'race' };
  const joined = await runTransaction(
    runRef,
    (value) => {
      let run = decodeRun(value);
      if (
        !run ||
        now() - run.updatedAt > 30000 ||
        run.winner ||
        (run.won && run.course !== 'lava')
      ) {
        run = {
          id: proposedId,
          host: uid,
          guest: '',
          mode,
          startsAt: 0,
          courseAt: 0,
          updatedAt: now(),
          course: 'lava',
          gems: 0,
          checkpoint: 0,
          wind: false,
          earth: false,
          won: false,
          banked: 0,
          winner: '',
        };
      } else if (run.host !== uid && run.guest !== uid) {
        if (run.guest) return; // Do not evict either of the two current participants.
        run.guest = uid;
        run.startsAt = now() + 4000;
        run.courseAt = run.startsAt;
      }
      return run;
    },
    { applyLocally: false }
  );
  if (!joined.committed)
    throw new Error('This run already has two players. Try again after they finish.');
  let run = decodeRun(joined.snapshot.val())!;
  const runId = run.id;
  // Old disconnect handlers and delayed cleanup must never remove a newer run's player.
  const playersPath = `${root}/players/${runId}`;
  const self = ref(db, `${playersPath}/${uid}`);
  let peers: LeapPeer[] = [];
  let closed = false;
  let reported = false;
  let lastProgress = '';
  let heartbeat = 0;
  const report = () => {
    if (!closed && !reported) {
      reported = true;
      failed('Connection lost. Leave and rejoin, or play Solo.');
      void close();
    }
  };
  const emit = () => {
    if (!closed) update(run, peers);
  };
  const unsubscribers: Array<() => void> = [];
  const watch = (stop: () => void) => {
    if (closed) stop();
    else unsubscribers.push(stop);
  };
  const close = async () => {
    closed = true;
    unsubscribers.forEach((stop) => stop());
    // Keep disconnect removal armed if explicit removal fails.
    try {
      await remove(self);
      await onDisconnect(self).cancel();
    } catch {
      /* server cleanup */
    }
  };
  try {
    await onDisconnect(self).remove();
    let wasConnected = false;
    watch(
      onValue(ref(db, '.info/connected'), (snapshot) => {
        if (snapshot.val() === true) wasConnected = true;
        else if (wasConnected) report();
      })
    );
    watch(
      authService.onAuthStateChange((state) => {
        if (!state.isAuthenticated || state.user?.uid !== uid) {
          report();
          void close();
        }
      })
    );
    watch(
      onValue(ref(db, '.info/serverTimeOffset'), (snapshot) => {
        offset = Number(snapshot.val()) || 0;
      })
    );
    watch(
      onValue(
        runRef,
        (snapshot) => {
          const next = decodeRun(snapshot.val());
          if (!next || next.id !== runId) {
            report();
            return;
          }
          run = next;
          emit();
        },
        report
      )
    );
    watch(
      onValue(
        ref(db, playersPath),
        (snapshot) => {
          peers = [];
          snapshot.forEach((child) => {
            if (child.key === uid) return;
            const peer = decodePeer(child.key!, child.val(), runId);
            if (peer && [run.host, run.guest].includes(peer.uid)) peers.push(peer);
          });
          emit();
        },
        report
      )
    );
    const publish: LeapConnection['publish'] = async (live, cast) => {
      if (closed) return;
      const state = {
        ...live,
        collected: [...live.collected],
        ice: live.ice && { ...live.ice },
        sealedVent: live.sealedVent && { ...live.sealedVent },
      };
      const time = now();
      const progress = JSON.stringify([
        state.courseId,
        state.collected,
        state.checkpoint,
        state.windUnlocked,
        state.earthUnlocked,
        state.won,
      ]);
      try {
        await set(self, {
          run: runId,
          name: name.slice(0, 20) || 'Explorer',
          character: character === 'character2' ? 'character2' : 'character1',
          course: state.courseId,
          x: state.x,
          y: state.y,
          facing: state.facing,
          t: serverTimestamp(),
          iceX: state.ice?.x ?? 0,
          iceUntil: state.ice ? time + Math.max(0, state.ice.expires - state.time) * 1000 : 0,
          sealX: state.sealedVent?.x ?? 0,
          sealUntil: state.sealedVent
            ? time + Math.max(0, state.sealedVent.expires - state.time) * 1000
            : 0,
          gliding: state.glide > 0,
          ...cast,
          gems: gemMask(state),
          checkpoint: state.checkpoint,
        });
        if (progress !== lastProgress || time - heartbeat > 5000) {
          await runTransaction(
            runRef,
            (value) => {
              const current = decodeRun(value);
              if (!current || current.id !== runId) return;
              const next =
                current.startsAt && time >= current.startsAt
                  ? mergeProgress(current, state)
                  : current;
              if (
                mode === 'race' &&
                state.won &&
                !next.winner &&
                time >= next.startsAt &&
                next.startsAt > 0
              )
                next.winner = uid;
              return { ...next, updatedAt: time };
            },
            { applyLocally: false }
          );
          lastProgress = progress;
          heartbeat = time;
        }
      } catch {
        report();
      }
    };
    await publish(initial, { power: 'frost', castAt: 0 });
    return {
      uid,
      now,
      publish,
      close,
      branch: async (course) => {
        if (mode !== 'coop' || course === 'lava') return;
        try {
          await runTransaction(
            runRef,
            (value) => {
              const current = decodeRun(value);
              if (!current || current.id !== runId || current.course !== 'lava' || !current.won)
                return;
              return {
                ...current,
                course,
                courseAt: now() + 2000,
                gems: 0,
                checkpoint: 0,
                won: false,
                banked: gemIndices(current.gems, 'lava').length,
                updatedAt: now(),
              };
            },
            { applyLocally: false }
          );
        } catch {
          report();
        }
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
