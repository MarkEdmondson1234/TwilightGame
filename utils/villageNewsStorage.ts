import { gameState } from '../GameState';
import { NEWS_MILESTONES, isNewsCursor, type NewsCursor, type NewsStory } from './villageNews';

const STORAGE = 'village_news_knowledge';
interface ReaderState {
  cursor?: NewsCursor;
  recentCursor?: NewsCursor;
  pending: string[];
  published: string[];
  recent: NewsStory[];
}
export function readVillageNews(uid: string): ReaderState {
  const raw = gameState.getQuestData(STORAGE, uid) as Partial<ReaderState> | undefined;
  const valid = (ids: unknown): string[] =>
    Array.isArray(ids)
      ? ids.filter((id) => typeof id === 'string' && Object.hasOwn(NEWS_MILESTONES, id))
      : [];
  return {
    recentCursor: isNewsCursor(raw?.recentCursor) ? raw.recentCursor : undefined,
    cursor: isNewsCursor(raw?.cursor) ? raw.cursor : undefined,
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
  if (!Object.hasOwn(NEWS_MILESTONES, id)) return;
  const state = readVillageNews(uid);
  if (state.pending.includes(id) || state.published.includes(id)) return;
  updateVillageNews(uid, (current) => ({ ...current, pending: [...current.pending, id] }));
}
