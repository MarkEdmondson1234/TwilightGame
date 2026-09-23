import { useMemo } from 'react';
import { useQuestGuideRefresh } from '../hooks/useQuestGuideRefresh';
import { pinQuest, readPinnedQuest } from '../utils/pinnedQuest';
import { COTTAGE_COLOURS as colours, COTTAGE_FONTS } from '../utils/transitionIcons';
import { Z_QUEST_GUIDANCE } from '../zIndex';
import './PinnedQuest.css';

export default function PinnedQuest({
  blocked,
  onJournal,
}: {
  blocked: boolean;
  onJournal: () => void;
}) {
  const revision = useQuestGuideRefresh();
  // Read managers only when guidance changes or an overlay closes, not on world frames.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates singleton reads
  const quest = useMemo(() => (blocked ? undefined : readPinnedQuest()), [blocked, revision]);
  if (!quest) return null;
  return (
    <aside
      data-game-ui
      className="pinned-quest"
      aria-label="Pinned quest"
      style={{
        zIndex: Z_QUEST_GUIDANCE,
        background: colours.parchmentLight,
        color: colours.darkBrownText,
        borderColor: colours.warmBrownBorder,
        borderLeftColor: colours.sageGreen,
        fontFamily: COTTAGE_FONTS.body,
      }}
    >
      <button
        className="pinned-quest-open"
        onClick={onJournal}
        aria-label={`Open ${quest.title} in the journal`}
      >
        <span className="pinned-quest-title">{quest.title}</span>
        <strong>{quest.nextStep.action}</strong>
        <span>Where: {quest.nextStep.where}</span>
      </button>
      <button
        className="pinned-quest-remove"
        aria-label="Unpin quest"
        title="Unpin quest"
        onClick={() => pinQuest(null)}
      >
        ×
      </button>
    </aside>
  );
}
