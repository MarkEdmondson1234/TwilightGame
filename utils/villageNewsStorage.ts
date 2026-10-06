import { gameState } from '../GameState';
import { isNewsCursor, resolveMilestone, type NewsCursor, type NewsStory } from './villageNews';

const STORAGE = 'village_news_knowledge';
interface ReaderState {
  cursor?: NewsCursor;
  recentCursor?: NewsCursor;
  pending: string[];
  published: string[];
  recent: NewsStory[];
  /** Real time the player was last seen in the world — finds festivals they missed. */
  lastSeenMs?: number;
}
export function readVillageNews(uid: string): ReaderState {
  const raw = gameState.getQuestData(STORAGE, uid) as Partial<ReaderState> | undefined;
  const valid = (ids: unknown): string[] =>
    Array.isArray(ids) ? ids.filter((id) => typeof id === 'string' && !!resolveMilestone(id)) : [];
  return {
    recentCursor: isNewsCursor(raw?.recentCursor) ? raw.recentCursor : undefined,
    cursor: isNewsCursor(raw?.cursor) ? raw.cursor : undefined,
    lastSeenMs: Number.isSafeInteger(raw?.lastSeenMs) ? raw!.lastSeenMs : undefined,
    pending: valid(raw?.pending),
    published: valid(raw?.published),
    recent: Array.isArray(raw?.recent)
      ? raw.recent
          .filter(
            (story) =>
              story &&
              typeof story.key === 'string' &&
              typeof story.title === 'string' &&
              typeof story.story === 'string'
          )
          .slice(0, 20)
      : [],
  };
}
export function updateVillageNews(uid: string, change: (state: ReaderState) => ReaderState): void {
  gameState.startQuest(STORAGE);
  gameState.setQuestData(STORAGE, uid, change(readVillageNews(uid)));
}
export function queueMilestone(uid: string, id: string): void {
  if (!resolveMilestone(id)) return;
  const state = readVillageNews(uid);
  if (state.pending.includes(id) || state.published.includes(id)) return;
  updateVillageNews(uid, (current) => ({ ...current, pending: [...current.pending, id] }));
}
