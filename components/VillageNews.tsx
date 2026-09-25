import React, { useState } from 'react';
import type { useVillageNews } from '../hooks/useVillageNews';
import { rememberActivityLead } from '../utils/activityLeadStorage';
import { ACTIVITY_LEADS, type ActivityLeadId } from '../utils/activityDiscovery';
import { getItem } from '../data/items';
import { COTTAGE_COLOURS as colours, COTTAGE_FONTS } from '../utils/transitionIcons';
import { Z_QUEST_GUIDANCE, Z_QUEST_GUIDANCE_RAISED } from '../zIndex';
import { useIsTinyTouchScreen } from '../hooks/useIsTinyTouchScreen';
import './ActivityInvitation.css';

type Props = { news: ReturnType<typeof useVillageNews>; blocked: boolean; onJournal: () => void };
export default function VillageNews({ news, blocked, onJournal }: Props) {
  const [all, setAll] = useState(false);
  const [saved, setSaved] = useState<ActivityLeadId[]>([]);
  // On a tiny screen the card sits over the controls while it is open (see Z_QUEST_GUIDANCE_RAISED).
  const isTinyScreen = useIsTinyTouchScreen();
  if (blocked || news.dismissed || !news.batch?.stories.length) return null;
  const { stories, returning, truncated } = news.batch;
  return (
    <aside
      className="activity-invitation village-news"
      aria-label="Village news"
      style={{
        zIndex: isTinyScreen ? Z_QUEST_GUIDANCE_RAISED : Z_QUEST_GUIDANCE,
        background: colours.parchmentLight,
        color: colours.darkBrownText,
        borderColor: colours.warmBrownBorder,
        fontFamily: COTTAGE_FONTS.body,
      }}
    >
      <div
        className="activity-invitation-actions"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: -14,
          padding: '10px 0',
          background: colours.parchmentLight,
        }}
      >
        <strong>{returning ? 'While you were away' : 'Village news'}</strong>
        <button onClick={news.dismiss}>Later</button>
      </div>
      <small>
        {truncated
          ? 'Recent highlights from a busy village (up to 100 events).'
          : 'News from other players. Your own adventures await.'}
      </small>
      {(all ? stories : stories.slice(0, 3)).map((story) => (
        <section
          key={story.key}
          style={{ marginTop: 14, borderTop: '1px solid #8b735550', paddingTop: 10 }}
        >
          <div className="activity-invitation-heading">
            {story.itemId && getItem(story.itemId)?.image && (
              <img src={getItem(story.itemId)!.image} alt="" />
            )}
            <div>
              <strong>{story.title}</strong>
              <p>{story.story}</p>
              {story.neighbours > 1 && (
                <small>{story.neighbours} neighbours shared this kind of news.</small>
              )}
            </div>
          </div>
          {story.lead && (
            <div className="activity-invitation-actions">
              <button
                disabled={saved.includes(story.lead)}
                onClick={() => {
                  rememberActivityLead(story.lead!);
                  setSaved((ids) => [...ids, story.lead!]);
                }}
              >
                {saved.includes(story.lead) ? 'Kept in Things to try' : 'Keep this lead'}
              </button>
            </div>
          )}
          {story.lead && saved.includes(story.lead) && (
            <p>{ACTIVITY_LEADS.find((lead) => lead.id === story.lead)?.directions}</p>
          )}
        </section>
      ))}
      <div className="activity-invitation-actions" style={{ marginTop: 14 }}>
        {!all && stories.length > 3 && (
          <button onClick={() => setAll(true)}>More village news ({stories.length - 3})</button>
        )}
        <button
          onClick={() => {
            news.dismiss();
            onJournal();
          }}
        >
          Read in journal
        </button>
        <button onClick={news.markRead}>Mark this news read</button>
      </div>
      <small>Later keeps this news unread. Find it again in your journal.</small>
    </aside>
  );
}
