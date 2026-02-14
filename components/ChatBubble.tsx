/**
 * ChatBubble - Renders a single message bubble in the AI chat dialogue
 *
 * NPC messages: left-aligned, warm brown, with optional action/emotion
 * Player messages: right-aligned, muted green
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { NPCEmotion } from '../services/anthropicClient';

export interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  action?: string;
  emotion?: NPCEmotion;
  isStreaming?: boolean;
  npcName?: string;
  playerName?: string;
}

/** Parse leading *action text* from assistant message content */
export function parseAssistantContent(content: string): {
  action?: string;
  dialogue: string;
} {
  const actionMatch = content.match(/^\*([^*]+)\*\s*/);
  if (actionMatch) {
    return {
      action: actionMatch[1],
      dialogue: content.slice(actionMatch[0].length),
    };
  }
  return { dialogue: content };
}

const FONT_FAMILY = 'Georgia, "Times New Roman", serif';

const markdownComponents = {
  em: ({ children }: { children?: React.ReactNode }) => (
    <em style={{ color: '#d4a373', fontStyle: 'italic' }}>{children}</em>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ color: '#f5deb3', fontWeight: 'bold' }}>{children}</strong>
  ),
  p: ({ children }: { children?: React.ReactNode }) => <span>{children} </span>,
};

const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  content,
  action,
  emotion,
  isStreaming,
  npcName,
  playerName,
}) => {
  const isNPC = role === 'assistant';

  // For NPC messages, parse action from content if not provided separately
  const parsed = isNPC && !action ? parseAssistantContent(content) : null;
  const displayAction = action || parsed?.action;
  const displayContent = parsed ? parsed.dialogue : content;

  const emotionLabel =
    emotion && emotion !== 'neutral'
      ? {
          happy: 'happy',
          sad: 'sad',
          surprised: 'surprised',
          angry: 'upset',
          thoughtful: 'thoughtful',
          worried: 'worried',
          excited: 'excited',
          embarrassed: 'flustered',
          loving: 'warm',
          neutral: '',
        }[emotion]
      : null;

  if (isNPC) {
    return (
      <div className="flex justify-start mb-3">
        <div
          style={{
            maxWidth: '85%',
            background: 'rgba(60, 50, 40, 0.85)',
            border: '1px solid rgba(180, 140, 90, 0.4)',
            borderRadius: '12px 12px 12px 4px',
            padding: '10px 14px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Header: NPC name + emotion */}
          <div className="flex items-center gap-2 mb-1">
            {npcName && (
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: '0.7rem',
                  color: '#d4a373',
                  fontWeight: 'bold',
                  opacity: 0.8,
                }}
              >
                {npcName}
              </span>
            )}
            {emotionLabel && (
              <span
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: '0.6rem',
                  color: '#b8956a',
                  fontStyle: 'italic',
                  opacity: 0.7,
                }}
              >
                {emotionLabel}
              </span>
            )}
          </div>

          {/* Action line */}
          {displayAction && (
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 'clamp(0.8rem, 1.8vw, 0.95rem)',
                color: '#d4a373',
                fontStyle: 'italic',
                marginBottom: '4px',
              }}
            >
              *{displayAction}*
            </div>
          )}

          {/* Message text */}
          <div
            className="leading-relaxed ai-dialogue-content"
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
              color: '#e8e8e8',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              lineHeight: '1.55',
            }}
          >
            <ReactMarkdown components={markdownComponents}>{displayContent}</ReactMarkdown>
            {isStreaming && (
              <span
                className="animate-pulse"
                style={{ color: '#d4a373', marginLeft: '2px', fontWeight: 'bold' }}
              >
                |
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Player message
  return (
    <div className="flex justify-end mb-3">
      <div
        style={{
          maxWidth: '80%',
          background: 'rgba(76, 100, 76, 0.7)',
          border: '1px solid rgba(140, 180, 120, 0.4)',
          borderRadius: '12px 12px 4px 12px',
          padding: '10px 14px',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
        }}
      >
        {playerName && (
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: '0.7rem',
              color: '#a8d4a0',
              fontWeight: 'bold',
              opacity: 0.8,
              marginBottom: '2px',
            }}
          >
            {playerName}
          </div>
        )}
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 'clamp(0.85rem, 2vw, 1.05rem)',
            color: '#e8f5e8',
            lineHeight: '1.55',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ChatBubble);
