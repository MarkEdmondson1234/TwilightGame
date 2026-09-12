import { useEffect, useRef, useState } from 'react';
import { MULTIPLAYER_ENABLED } from '../../constants';
import { whenFirebaseSettled } from '../../firebase/safe';
import type { LeapConnection } from '../../firebase/lavaLeapService';
import {
  applyRivalCast,
  applyRun,
  PEER_TIMEOUT,
  sharedEffects,
  type LeapPeer,
  type LeapRun,
  type PlayMode,
} from './multiplayer';
import type { State } from './engine';

export function useLeapMultiplayer(
  mode: PlayMode,
  map: string,
  name: string,
  character: string,
  simulation: React.MutableRefObject<State>
) {
  const [run, setRun] = useState<LeapRun | null>(null);
  const [peers, setPeers] = useState<LeapPeer[]>([]);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(0);
  const connection = useRef<LeapConnection | null>(null);
  const liveRun = useRef<LeapRun | null>(null);
  const livePeers = useRef<LeapPeer[]>([]);
  const cast = useRef({ power: 'frost', castAt: 0 });
  const seenCasts = useRef(new Map<string, number>());
  useEffect(() => {
    setRun(null);
    setPeers([]);
    setError('');
    liveRun.current = null;
    livePeers.current = [];
    seenCasts.current.clear();
    cast.current = { power: 'frost', castAt: 0 };
    if (mode === 'solo') return;
    let cancelled = false;
    let session: LeapConnection | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let publishing = false;
    const join = async () => {
      try {
        if (!MULTIPLAYER_ENABLED || !(await whenFirebaseSettled()))
          throw new Error('Multiplayer is unavailable. You can still play Solo.');
        if (cancelled) return;
        const { connectLavaLeap } = await import('../../firebase/lavaLeapService');
        if (cancelled) return;
        session = await connectLavaLeap(
          map,
          mode,
          name,
          character,
          (next, incoming) => {
            if (cancelled) return;
            liveRun.current = next;
            livePeers.current = incoming;
            setRun(next);
          },
          (message) => {
            if (!cancelled) setError(message);
          }
        );
        if (cancelled) {
          await session.close();
          return;
        }
        connection.current = session;
        const tick = () => {
          if (!session || cancelled) return;
          const now = session.now();
          setClock(now);
          setPeers(livePeers.current.filter((p) => now - p.t < PEER_TIMEOUT));
          if (!publishing) {
            publishing = true;
            void session.publish(simulation.current, cast.current).finally(() => {
              publishing = false;
            });
          }
        };
        tick();
        timer = setInterval(tick, 200);
      } catch (reason) {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not join. Try Solo or reopen the game.'
          );
      }
    };
    void join();
    return () => {
      cancelled = true;
      clearInterval(timer);
      connection.current = null;
      void session?.close();
    };
  }, [mode, map, name, character, simulation]);

  const beforeStep = (playing: boolean) => {
    const current = liveRun.current;
    const now = connection.current?.now() ?? Date.now();
    if (!current) return undefined;
    simulation.current = applyRun(simulation.current, current);
    const s = simulation.current;
    // Same vent clock on both devices, even when either player pauses locally.
    if (current.courseAt > 0) s.time = Math.max(0, (now - current.courseAt) / 1000);
    if (mode === 'race') {
      for (const peer of livePeers.current) {
        if (peer.castAt <= (seenCasts.current.get(peer.uid) ?? 0)) continue;
        seenCasts.current.set(peer.uid, peer.castAt);
        if (playing && now >= current.startsAt && !current.winner) applyRivalCast(s, peer, now);
      }
      return undefined;
    }
    return sharedEffects(livePeers.current, s, now);
  };
  const recordCast = () => {
    cast.current = { power: simulation.current.crystal, castAt: connection.current?.now() ?? 0 };
  };
  const ready =
    mode === 'solo' || (!!run?.startsAt && clock >= Math.max(run.startsAt, run.courseAt));
  return {
    run,
    peers,
    error,
    clock,
    ready,
    uid: connection.current?.uid,
    beforeStep,
    recordCast,
    branch: (course: State['courseId']) => connection.current?.branch(course),
  };
}
