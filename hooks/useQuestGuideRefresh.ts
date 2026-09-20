import { useEffect, useState } from 'react';
import { eventBus, GameEvent } from '../utils/EventBus';

/** Refresh guidance from authoritative state, without scanning quests every frame. */
export function useQuestGuideRefresh() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    const unsubscribe = [
      GameEvent.QUEST_DATA_CHANGED,
      GameEvent.QUEST_COMPLETED,
      GameEvent.PLACED_ITEMS_CHANGED,
      GameEvent.EVENT_CHAIN_UPDATED,
      GameEvent.INVENTORY_CHANGED,
      GameEvent.TIME_CHANGED,
      GameEvent.PLAYER_MILESTONE,
      GameEvent.COOKING_COURSE_COMPLETE,
      GameEvent.CLOUD_SYNC_COMPLETED,
    ].map((event) => eventBus.on(event, refresh));
    return () => unsubscribe.forEach((off) => off());
  }, []);
  return revision;
}
