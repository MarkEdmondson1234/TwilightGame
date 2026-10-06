import React from 'react';
import type { useVillageNews } from '../hooks/useVillageNews';
import { getItem } from '../data/items';
import { festivalBullet } from '../utils/missedFestivals';
import { newsBullet } from '../utils/villageNews';
import { COTTAGE_COLOURS as colours, COTTAGE_FONTS } from '../utils/transitionIcons';
import { Z_QUEST_GUIDANCE, Z_QUEST_GUIDANCE_RAISED } from '../zIndex';
import { useIsTinyTouchScreen } from '../hooks/useIsTinyTouchScreen';
import './ActivityInvitation.css';

/** Bullets shown on the card; the rest wait in the journal. A long card drowns a child in text. */
const MAX_BULLETS = 5;
const ICON_SIZE_PX = 24;

type Props = { news: ReturnType<typeof useVillageNews>; blocked: boolean; onJournal: () => void };
export default function VillageNews({ news, blocked, onJournal }: Props) {
  // On a tiny screen the card sits over the controls while it is open (see Z_QUEST_GUIDANCE_RAISED).
  const isTinyScreen = useIsTinyTouchScreen();
  if (blocked || news.dismissed || !news.batch) return null;
  const { stories, returning, festivals } = news.batch;
  const bullets: { key: string; text: string; image?: string }[] = [
    ...festivals.map(({ name, image }) => ({
      key: `festival:${name}`,
      text: festivalBullet(name),
      image,
    })),
    ...stories.map((story) => ({
      key: story.key,
      text: newsBullet(story),
      image: story.itemId ? getItem(story.itemId)?.image : undefined,
    })),
  ];
  if (!bullets.length) return null;
  const hidden = bullets.length - MAX_BULLETS;
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
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        <strong>{returning ? 'While you were away' : 'Village news'}</strong>
        <button aria-label="Later" title="Later" onClick={news.dismiss}>
          ×
        </button>
      </div>
      <ul style={{ margin: '8px 0', paddingLeft: 20, fontSize: 15, lineHeight: 1.45 }}>
        {bullets.slice(0, MAX_BULLETS).map((bullet) => (
          <li key={bullet.key} style={{ margin: '4px 0' }}>
            {bullet.text}
            {bullet.image && (
              <img
                src={bullet.image}
                alt=""
                width={ICON_SIZE_PX}
                height={ICON_SIZE_PX}
                style={{ objectFit: 'contain', verticalAlign: 'middle', marginLeft: 6 }}
              />
            )}
          </li>
        ))}
      </ul>
      <div
        className="activity-invitation-actions"
        style={{ justifyContent: 'space-between', alignItems: 'center' }}
      >
        {hidden > 0 ? (
          <button
            onClick={() => {
              news.dismiss();
              onJournal();
            }}
          >
            …and {hidden} more
          </button>
        ) : (
          <span />
        )}
        <button onClick={news.markRead}>Got it</button>
      </div>
    </aside>
  );
}
