import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAuthService,
  getSharedDataService,
  getSyncManager,
  whenFirebaseSettled,
} from '../firebase/safe';
import { TIMING } from '../constants';
import { eventBus, GameEvent } from '../utils/EventBus';
import { getMissedFestivals, type MissedFestival } from '../utils/missedFestivals';
import {
  compareNews,
  isDetailedMilestoneKind,
  summariseNews,
  type NewsCursor,
  type NewsStory,
} from '../utils/villageNews';
import { queueMilestone, readVillageNews, updateVillageNews } from '../utils/villageNewsStorage';

/** The news id for a milestone event, or null when it is not news (a repeat cook, say). */
function milestoneNewsId(milestoneId: string, detail?: string): string | null {
  if (!isDetailedMilestoneKind(milestoneId)) return milestoneId;
  // Bare cooking/brewing/gardening is every batch: only the first of each recipe or crop is news.
  return detail ? `${milestoneId}:${detail}` : null;
}
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
    /** Festivals that took place since the player was last in the world, newest first. */
    festivals: MissedFestival[];
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
      eventBus.on(GameEvent.PLAYER_MILESTONE, ({ milestoneId, detail }) => {
        const owner = getAuthService().getState().user?.uid;
        const id = milestoneNewsId(milestoneId, detail);
        if (owner && id) queueMilestone(owner, id);
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
        // Read before the first write below: that moves "last seen" to now.
        const now = Date.now();
        const festivals = saved.lastSeenMs ? getMissedFestivals(saved.lastSeenMs, now) : [];
        setBatch({
          uid,
          stories,
          cursor,
          returning: !!saved.cursor || !!saved.lastSeenMs,
          truncated: result.truncated,
          festivals,
        });
        updateVillageNews(uid, (current) => ({
          ...current,
          lastSeenMs: now,
          ...(stories.length ? { recent: stories, recentCursor: cursor } : {}),
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
    // Only after the first fetch, which needs the previous session's value to find missed festivals.
    const recordLastSeen = (force = false) => {
      if (!fetched || !stillOwner()) return;
      const now = Date.now();
      const last = readVillageNews(uid).lastSeenMs ?? 0;
      if (force || now - last >= TIMING.VILLAGE_NEWS_LAST_SEEN_MS)
        updateVillageNews(uid, (current) => ({ ...current, lastSeenMs: now }));
    };
    const onPageHide = () => recordLastSeen(true);
    const tick = () => {
      void fetchNews();
      void flush();
      recordLastSeen();
    };
    const unsubscribeSync = getSyncManager().onStateChange((state) => {
      if (state.status !== 'syncing') tick();
    });
    tick();
    const timer = window.setInterval(tick, 30000);
    window.addEventListener('online', tick);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      cancelled = true;
      unsubscribeSync();
      window.clearInterval(timer);
      window.removeEventListener('online', tick);
      window.removeEventListener('pagehide', onPageHide);
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
        // News already read in the journal hides the card — unless a festival is still to tell.
        !batch?.festivals.length &&
        batch?.cursor &&
        readVillageNews(uid).cursor &&
        compareNews(batch.cursor, readVillageNews(uid).cursor!) <= 0
      ),
    markRead,
    dismiss: () => setDismissed(true),
    refresh: () => setRefresh((n) => n + 1),
  };
}
