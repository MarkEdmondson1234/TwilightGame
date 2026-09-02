/**
 * ChatPanel — free-text chat between players on the same map.
 *
 * This game shipped with a closed emote vocabulary and no chat at all, chosen
 * so it was not *possible* to say something harmful. Chat exists at the owner's
 * request for a group of children who know one another; see multiplayer/chat.ts
 * for what is still enforced (accounts only, length caps, server-side rules).
 *
 * Sits bottom-left, out of the way of the touch controls on the right. Renders
 * nothing at all when chat is unavailable, so single-player is untouched.
 */

import React, { useEffect, useRef, useState } from 'react';
import { MAX_CHAT_LENGTH } from '../multiplayer/chat';
import type { ChatMessage } from '../multiplayer/chat';
import { Z_CHAT_PANEL, zClass } from '../zIndex';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  /** True while the composer should be focused for typing */
  isComposing: boolean;
  onStartComposing: () => void;
  onStopComposing: () => void;
  /** Smaller layout for short screens */
  compact?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSend,
  isComposing,
  onStartComposing,
  onStopComposing,
  compact = false,
}) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Focus on open. useKeyboardControls ignores keys while an INPUT has focus,
  // so the player types instead of walking — that guard is what makes an
  // always-mounted composer safe to have on screen.
  useEffect(() => {
    if (isComposing) inputRef.current?.focus();
    else inputRef.current?.blur();
  }, [isComposing]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const submit = () => {
    const text = draft;
    setDraft('');
    if (text.trim()) onSend(text);
    onStopComposing();
  };

  return (
    <div
      className={`pointer-events-none fixed left-2 ${zClass(Z_CHAT_PANEL)}`}
      style={{ bottom: compact ? '8px' : '14px', width: compact ? '210px' : '260px' }}
    >
      {messages.length > 0 && (
        <div
          ref={listRef}
          className={`mb-1.5 flex max-h-32 flex-col gap-0.5 overflow-y-auto rounded-lg bg-stone-900/55 px-2 py-1.5 ${
            compact ? 'text-[11px]' : 'text-xs'
          }`}
        >
          {messages.map((message) => (
            <div key={message.id} className="leading-snug text-amber-50">
              <span className={message.isLocal ? 'text-amber-300' : 'text-sky-300'}>
                {message.name}
              </span>
              <span className="text-stone-400">: </span>
              <span className="break-words">{message.text}</span>
            </div>
          ))}
        </div>
      )}

      {isComposing ? (
        <input
          ref={inputRef}
          value={draft}
          maxLength={MAX_CHAT_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Stop movement keys and every other game binding from seeing what
            // is being typed. useKeyboardControls listens on window with a
            // native listener, so this is belt-and-braces alongside its own
            // INPUT check.
            event.stopPropagation();
            if (event.key === 'Enter') submit();
            if (event.key === 'Escape') {
              setDraft('');
              onStopComposing();
            }
          }}
          onBlur={onStopComposing}
          placeholder="Say something…"
          aria-label="Chat message"
          className={`pointer-events-auto w-full rounded-full border-2 border-amber-200/60 bg-stone-800/95 px-3 text-amber-50 placeholder-stone-400 outline-none ${
            compact ? 'h-8 text-xs' : 'h-9 text-sm'
          }`}
        />
      ) : (
        <button
          onClick={onStartComposing}
          onTouchStart={(event) => {
            event.preventDefault();
            onStartComposing();
          }}
          className={`pointer-events-auto flex items-center gap-1.5 rounded-full border-2 border-amber-200/50 bg-stone-800/80 text-amber-100 shadow-md ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
          }`}
        >
          <span aria-hidden="true">💬</span>
          <span>Say something</span>
        </button>
      )}
    </div>
  );
};

export default ChatPanel;
