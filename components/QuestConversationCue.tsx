import { useLayoutEffect, useRef } from 'react';
import type { QuestConversation } from '../utils/questNextSteps';
import { COTTAGE_COLOURS as colours, COTTAGE_FONTS } from '../utils/transitionIcons';
import { Z_ACTION_PROMPTS } from '../zIndex';
import './QuestConversationCue.css';

/** A nearby invitation into normal dialogue. It never spends a quest item. */
export default function QuestConversationCue({
  cue,
  screenX,
  screenY,
  inRange,
  onTalk,
}: {
  cue: QuestConversation;
  screenX: number;
  screenY: number;
  inRange: boolean;
  onTalk: () => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const shift = useRef({ x: 0, y: 0 });
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
  return (
    <div
      ref={element}
      className="quest-conversation-cue"
      data-game-ui
      style={{
        left: screenX,
        top: screenY,
        zIndex: Z_ACTION_PROMPTS,
        color: colours.darkBrownText,
        fontFamily: COTTAGE_FONTS.body,
      }}
    >
      {inRange ? (
        <button
          className="quest-conversation-button"
          onClick={(event) => {
            event.stopPropagation();
            onTalk();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseUp={(event) => event.stopPropagation()}
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
