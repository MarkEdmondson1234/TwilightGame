/**
 * DialogueChatHistory - Scrollable chat bubble area with expand toggle
 *
 * Renders a list of ChatBubble components with auto-scroll,
 * plus a ThinkingIndicator when loading. An expand button lets
 * the player view the full conversation history in a larger overlay.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ChatBubble from '../ChatBubble';
import { DisplayMessage } from '../../hooks/useChatHistory';
import { DIALOGUE_FONT, TEXT_FONT } from './dialogueHelpers';
import { TimeManager } from '../../utils/TimeManager';

interface DialogueChatHistoryProps {
  messages: DisplayMessage[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  npcName: string;
  playerName: string;
  isLoading: boolean;
}

/** Animated thinking indicator with bouncing dots */
const ThinkingIndicator: React.FC<{ npcName: string }> = ({ npcName }) => (
  <div
    style={{
      fontFamily: TEXT_FONT,
      fontSize: 'clamp(0.75rem, 1.8vw, 0.95rem)',
      color: '#d4a373',
      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
    }}
  >
    <span style={{ fontStyle: 'italic' }}>*{npcName} is thinking</span>
    <span
      className="thinking-dots"
      style={{ display: 'inline-flex', gap: '3px', marginLeft: '2px' }}
    >
      <span className="thinking-dot" style={{ animationDelay: '0ms' }}>
        .
      </span>
      <span className="thinking-dot" style={{ animationDelay: '200ms' }}>
        .
      </span>
      <span className="thinking-dot" style={{ animationDelay: '400ms' }}>
        .
      </span>
    </span>
    <span style={{ fontStyle: 'italic' }}>*</span>
    <style>{`
      @keyframes dotBounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-4px); opacity: 1; }
      }
      .thinking-dot {
        display: inline-block;
        animation: dotBounce 1.2s ease-in-out infinite;
        font-weight: bold;
      }
    `}</style>
  </div>
);

/** Format a real timestamp to game time (e.g. "Spring 12, 3:00pm") */
function formatGameTime(timestamp: number): string {
  const time = TimeManager.getTimeForTimestamp(timestamp);
  if (!time) return '';
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour < 12 ? 'am' : 'pm';
  return `${time.season} ${time.day}, ${hour12}:${String(time.minute).padStart(2, '0')}${ampm}`;
}

/** Message list shared by both inline and expanded views */
const MessageList: React.FC<{
  messages: DisplayMessage[];
  npcName: string;
  playerName: string;
  isLoading: boolean;
  showTimestamps?: boolean;
}> = ({ messages, npcName, playerName, isLoading, showTimestamps }) => {
  let lastTimestamp = '';

  return (
    <>
      {messages.map((msg) => {
        let timestampLabel: string | null = null;
        if (showTimestamps && msg.timestamp) {
          const formatted = formatGameTime(msg.timestamp);
          if (formatted && formatted !== lastTimestamp) {
            lastTimestamp = formatted;
            timestampLabel = formatted;
          }
        }

        return (
          <React.Fragment key={msg.id}>
            {timestampLabel && (
              <div
                className="text-center my-2"
                style={{
                  fontFamily: TEXT_FONT,
                  fontSize: '0.7rem',
                  color: 'rgba(180, 160, 140, 0.5)',
                }}
              >
                {timestampLabel}
              </div>
            )}
            <ChatBubble
              role={msg.role}
              content={msg.content}
              action={msg.action}
              emotion={msg.emotion}
              isStreaming={msg.isStreaming}
              npcName={msg.role === 'assistant' ? npcName : undefined}
              playerName={msg.role === 'user' ? playerName : undefined}
            />
          </React.Fragment>
        );
      })}
      {isLoading && <ThinkingIndicator npcName={npcName} />}
    </>
  );
};

const DialogueChatHistory: React.FC<DialogueChatHistoryProps> = ({
  messages,
  scrollRef,
  onScroll,
  npcName,
  playerName,
  isLoading,
}) => {
  const [expanded, setExpanded] = useState(false);
  const expandedScrollRef = useRef<HTMLDivElement>(null);
  const hasHistory = messages.length > 1;

  /** Auto-scroll expanded view to bottom when it opens */
  const scrollExpandedToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (expandedScrollRef.current) {
        expandedScrollRef.current.scrollTop = expandedScrollRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    if (expanded) scrollExpandedToBottom();
  }, [expanded, scrollExpandedToBottom]);

  return (
    <>
      {/* Inline chat area */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* Expand button — only show when there's history to browse */}
        {hasHistory && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="absolute top-0 right-0 text-xs px-2 py-0.5 transition-colors duration-200"
            style={{
              fontFamily: DIALOGUE_FONT,
              color: 'rgba(180, 160, 140, 0.7)',
              background: 'rgba(40, 30, 25, 0.5)',
              borderRadius: '0 0 0 6px',
              border: 'none',
              zIndex: 1,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#d4a373')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180, 160, 140, 0.7)')}
          >
            View history
          </button>
        )}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto chat-scrollbar flex flex-col"
          onScroll={onScroll}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div style={{ marginTop: 'auto' }}>
            <MessageList
              messages={messages}
              npcName={npcName}
              playerName={playerName}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Expanded history overlay — portalled to body to escape overflow-hidden + transform */}
      {expanded &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 9999, background: 'rgba(10, 8, 15, 0.85)' }}
            onClick={() => setExpanded(false)}
          >
            <div
              className="relative flex flex-col"
              style={{
                width: 'min(92vw, 700px)',
                height: 'min(80vh, 600px)',
                background:
                  'linear-gradient(180deg, rgba(35, 28, 20, 0.97) 0%, rgba(25, 20, 15, 0.98) 100%)',
                border: '2px solid rgba(180, 140, 80, 0.4)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(180, 140, 80, 0.3)' }}
              >
                <span
                  style={{
                    fontFamily: DIALOGUE_FONT,
                    fontSize: '1rem',
                    color: '#d4a373',
                  }}
                >
                  Conversation with {npcName}
                </span>
                <button
                  onClick={() => setExpanded(false)}
                  className="text-sm px-3 py-1 transition-colors duration-200"
                  style={{
                    fontFamily: DIALOGUE_FONT,
                    color: 'rgba(180, 160, 140, 0.8)',
                    background: 'rgba(60, 50, 40, 0.6)',
                    border: '1px solid rgba(140, 120, 100, 0.4)',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#d4a373')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180, 160, 140, 0.8)')}
                >
                  Close
                </button>
              </div>

              {/* Scrollable message list — starts at bottom, scroll up for history */}
              <div
                ref={expandedScrollRef}
                className="flex-1 min-h-0 overflow-y-auto chat-scrollbar px-4 py-2"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <MessageList
                  messages={messages}
                  npcName={npcName}
                  playerName={playerName}
                  isLoading={isLoading}
                  showTimestamps
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default DialogueChatHistory;
