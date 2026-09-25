import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { QuestConversation } from '../utils/questNextSteps';
import { COTTAGE_COLOURS as colours, COTTAGE_FONTS } from '../utils/transitionIcons';
import { Z_ACTION_PROMPTS } from '../zIndex';
import GameIcon from './GameIcon';
import './QuestConversationCue.css';

/** A nearby invitation into normal dialogue. It never spends a quest item. */
export default function QuestConversationCue({
  cue,
  screenX,
  screenY,
  inRange,
  onTalk,
  compact = false,
  npcName,
  icon,
}: {
  cue: QuestConversation;
  screenX: number;
  screenY: number;
  inRange: boolean;
  onTalk: () => void;
  /**
   * Touch: start as a small name pill and open the full card on tap. The card is
   * ~240px wide, which on a phone covered the NPC and much of the room the moment
   * the player walked up (issue #157).
   */
  compact?: boolean;
  npcName?: string;
  icon?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const shift = useRef({ x: 0, y: 0 });
  const [expanded, setExpanded] = useState(false);
  // Walking away closes the card, so the next approach starts discreet again.
  useEffect(() => {
    if (!inRange) setExpanded(false);
  }, [inRange]);
  // World coordinates move with the camera. Keep the readable prompt inside the viewport.
  useLayoutEffect(() => {
    if (!element.current) return;
    const rect = element.current.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    const left = rect.left - shift.current.x;
    const top = rect.top - shift.current.y;
    const x = Math.max(8 - left, Math.min(0, window.innerWidth - 8 - left - rect.width));
    const y = Math.max(8 - top, Math.min(0, window.innerHeight - 8 - top - rect.height));
    shift.current = { x, y };
    element.current.style.transform = `translate(calc(-50% + ${x}px), calc(-100% + ${y}px))`;
  });
  // Keep taps on the cue out of the world's click-to-walk handling.
  const stop = {
    onPointerDown: (event: ReactPointerEvent) => event.stopPropagation(),
    onMouseDown: (event: ReactMouseEvent) => event.stopPropagation(),
    onMouseUp: (event: ReactMouseEvent) => event.stopPropagation(),
  };
  const showPill = inRange && compact && !expanded;
  return (
    <div
      ref={element}
      className="world-ui quest-conversation-cue"
      data-game-ui
      style={{
        left: screenX,
        top: screenY,
        zIndex: Z_ACTION_PROMPTS,
        color: colours.darkBrownText,
        fontFamily: COTTAGE_FONTS.body,
      }}
    >
      {showPill ? (
        <button
          className="quest-conversation-pill"
          aria-expanded={false}
          aria-label={`${npcName ?? 'Talk'}: ${cue.label}`}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(true);
          }}
          {...stop}
        >
          {icon ? (
            <GameIcon icon={icon} size={16} />
          ) : (
            <span className="quest-conversation-dots" aria-hidden="true">
              …
            </span>
          )}
          <span className="quest-conversation-pill-name">{npcName ?? 'Talk'}</span>
          <span className="quest-conversation-dots" aria-hidden="true">
            …
          </span>
        </button>
      ) : inRange ? (
        <button
          className="quest-conversation-button"
          onClick={(event) => {
            event.stopPropagation();
            onTalk();
          }}
          {...stop}
          aria-label={`Talk: ${cue.label}`}
        >
          <span className="quest-conversation-label">
            <span className="quest-conversation-dots" aria-hidden="true">
              …
            </span>
            {cue.label}
          </span>
          <span className="quest-conversation-topic">{cue.topic}</span>
          <span className="quest-conversation-action">Talk</span>
        </button>
      ) : (
        <span className="quest-conversation-bubble" role="img" aria-label={cue.label}>
          <span className="quest-conversation-dots" aria-hidden="true">
            …
          </span>
        </span>
      )}
    </div>
  );
}
