import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAuthService,
  getSharedDataService,
  getSyncManager,
  whenFirebaseSettled,
} from '../firebase/safe';
import { eventBus, GameEvent } from '../utils/EventBus';
import { compareNews, summariseNews, type NewsCursor, type NewsStory } from '../utils/villageNews';
import { queueMilestone, readVillageNews, updateVillageNews } from '../utils/villageNewsStorage';

export function useVillageNews(enabled: boolean) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (enabled) setStarted(true);
  }, [enabled]);
  const [uid, setUid] = useState<string | null>(null);
  const [batch, setBatch] = useState<{
    uid: string;
    stories: NewsStory[];
    cursor?: NewsCursor;
    returning: boolean;
    truncated: boolean;
  } | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const uidRef = useRef(uid);
  uidRef.current = uid;

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void whenFirebaseSettled().then((loaded) => {
      if (cancelled || !loaded) return;
      unsubscribe = getAuthService().onAuthStateChange((state) => setUid(state.user?.uid ?? null));
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Milestones do not perform network work in the cooking/harvesting transaction.
  useEffect(
    () =>
      eventBus.on(GameEvent.PLAYER_MILESTONE, ({ milestoneId }) => {
        const owner = getAuthService().getState().user?.uid;
        if (owner) queueMilestone(owner, milestoneId);
      }),
    []
  );

  useEffect(() => {
    if (!started || !uid) return;
    let cancelled = false;
    let fetching = false;
    let flushing = false;
    let fetched = false;
    setBatch(null);
    setDismissed(false);
    setUnavailable(false);
    const stillOwner = () => !cancelled && getAuthService().getState().user?.uid === uid;
    const fetchNews = async () => {
      if (fetching || fetched || getSyncManager().getState().status === 'syncing') return;
      fetching = true;
      try {
        const result = await getSharedDataService().getVillageNews();
        if (!stillOwner() || getSyncManager().getState().status === 'syncing') return;
        if (result.status !== 'ready') {
          setUnavailable(true);
          return;
        }
        const saved = readVillageNews(uid);
        const stories = summariseNews(result.events, result.ownContributorId, saved.cursor);
        const newest = [...result.events].sort((a, b) => compareNews(b, a))[0];
        const cursor = newest
          ? { id: newest.id, seconds: newest.seconds, nanoseconds: newest.nanoseconds }
          : undefined;
        setBatch({ uid, stories, cursor, returning: !!saved.cursor, truncated: result.truncated });
        if (stories.length)
          updateVillageNews(uid, (current) => ({
            ...current,
            recent: stories,
            recentCursor: cursor,
          }));
        setUnavailable(false);
        fetched = true;
      } catch {
        if (stillOwner()) setUnavailable(true);
      } finally {
        fetching = false;
      }
    };
    const flush = async () => {
      if (flushing || getSyncManager().getState().status === 'syncing') return;
      flushing = true;
      try {
        for (const id of readVillageNews(uid).pending) {
          if (!stillOwner()) return;
          const sent = await getSharedDataService().publishMilestone(id);
          if (!stillOwner()) return;
          if (!sent) break;
          updateVillageNews(uid, (current) => ({
            ...current,
            pending: current.pending.filter((entry) => entry !== id),
            published: [...new Set([...current.published, id])],
          }));
        }
      } catch {
        /* Pending milestones remain saved for the next retry. */
      } finally {
        flushing = false;
      }
    };
    const tick = () => {
      void fetchNews();
      void flush();
    };
    const unsubscribeSync = getSyncManager().onStateChange((state) => {
      if (state.status !== 'syncing') tick();
    });
    tick();
    const timer = window.setInterval(tick, 30000);
    window.addEventListener('online', tick);
    return () => {
      cancelled = true;
      unsubscribeSync();
      window.clearInterval(timer);
      window.removeEventListener('online', tick);
    };
  }, [started, uid, refresh]);

  const markRead = useCallback(() => {
    if (!batch || batch.uid !== uidRef.current) return;
    if (batch.cursor)
      updateVillageNews(batch.uid, (current) => ({
        ...current,
        cursor:
          !current.cursor || compareNews(batch.cursor!, current.cursor) > 0
            ? batch.cursor
            : current.cursor,
      }));
    setDismissed(true);
  }, [batch]);

  return {
    batch: batch?.uid === uid ? batch : null,
    uid,
    unavailable,
    dismissed:
      dismissed ||
      !!(
        uid &&
        batch?.cursor &&
        readVillageNews(uid).cursor &&
        compareNews(batch.cursor, readVillageNews(uid).cursor!) <= 0
      ),
    markRead,
    dismiss: () => setDismissed(true),
    refresh: () => setRefresh((n) => n + 1),
  };
}
