/**
 * ChatPanel — the composer. Just somewhere to type.
 *
 * What you say appears as a speech bubble above your character, not in a log:
 * this is a world you are standing in, not a chat client. The bubbles are drawn
 * in `utils/pixi/PlayerSpeechBubble.ts`, and the running transcript lives in
 * Settings (F1) for anyone who wants to read back.
 *
 * This game shipped with a closed emote vocabulary and no chat at all, chosen so
 * it was not *possible* to say something harmful. Chat exists at the owner's
 * request for a group of children who know one another; see multiplayer/chat.ts
 * for what is still enforced (accounts only, length caps, server-side rules).
 *
 * Sits bottom-left, out of the way of the touch controls on the right. Renders
 * nothing at all when chat is unavailable, so single-player is untouched.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTouchDevice } from '../hooks/useTouchDevice';
import MobileMenuShell from './MobileMenuShell';
import { getChatHistory, onChatHistoryChange } from '../multiplayer/chatHistory';
import { MAX_CHAT_LENGTH } from '../multiplayer/chat';
import { Z_CHAT_PANEL, zClass } from '../zIndex';

interface ChatPanelProps {
  onSend: (text: string) => void | Promise<boolean>;
  /** True while the composer should be focused for typing */
  isComposing: boolean;
  onStartComposing: () => void;
  onStopComposing: () => void;
  /** Smaller layout for short screens */
  compact?: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  onSend,
  isComposing,
  onStartComposing,
  onStopComposing,
  compact = false,
}) => {
  const isTouchDevice = useTouchDevice();
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [sendError, setSendError] = useState('');
  const [history, setHistory] = useState(getChatHistory);
  useEffect(() => onChatHistoryChange(() => setHistory(getChatHistory())), []);
  const [draft, setDraft] = useState('');
  const historyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isTouchDevice && isComposing && historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history, isComposing, isTouchDevice]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus on open. useKeyboardControls ignores keys while an INPUT has focus,
  // so the player types instead of walking — that guard is what makes an
  // always-mounted composer safe to have on screen.
  useEffect(() => {
    if (isComposing) inputRef.current?.focus();
    else inputRef.current?.blur();
  }, [isComposing]);

  const submit = () => {
    const text = draft;
    setDraft('');
    if (text.trim()) onSend(text);
    onStopComposing();
  };

  const submitMobile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    try {
      const sent = await onSend(draft);
      if (sent === false) {
        setSendError('Message not sent. Your draft is saved; try again.');
      } else {
        setDraft('');
        onStopComposing();
      }
    } catch {
      setSendError('Message not sent. Your draft is saved; try again.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (isTouchDevice) {
    if (!isComposing)
      return (
        <button
          data-game-ui
          onClick={onStartComposing}
          className={`fixed rounded-full border-2 border-amber-200/50 bg-stone-800/95 text-amber-100 ${zClass(Z_CHAT_PANEL)}`}
          style={{
            right: 'calc(84px + env(safe-area-inset-right))',
            bottom: 'calc(96px + env(safe-area-inset-bottom))',
            minWidth: 64,
            minHeight: 44,
          }}
        >
          Chat
        </button>
      );
    return (
      <MobileMenuShell className={`${zClass(Z_CHAT_PANEL)} bg-black/60`}>
        <form
          onSubmit={submitMobile}
          role="dialog"
          aria-modal="true"
          aria-label="Chat"
          className="w-full max-w-xl max-h-full flex flex-col rounded-2xl border-2 border-amber-200/60 bg-stone-800 text-amber-50 p-3 gap-2"
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === 'Escape') {
              event.preventDefault();
              onStopComposing();
            }
          }}
        >
          <div className="flex justify-between items-center gap-2 shrink-0">
            <h2 className="font-bold">Chat with nearby players</h2>
            <button type="button" onClick={onStopComposing} className="px-3 min-h-12">
              Close
            </button>
          </div>
          <div
            className="overflow-y-auto min-h-0"
            style={{ overscrollBehavior: 'contain' }}
            ref={historyRef}
            aria-label="Recent messages"
          >
            {history.slice(-8).map((message) => (
              <p key={message.id} className="break-words text-sm mb-2">
                <strong>{message.name}: </strong>
                {message.text}
              </p>
            ))}
          </div>
          {sendError && (
            <p role="alert" className="text-amber-200 text-sm">
              {sendError}
            </p>
          )}
          <div className="flex gap-2 shrink-0">
            <input
              ref={inputRef}
              value={draft}
              maxLength={MAX_CHAT_LENGTH}
              disabled={sending}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Say something…"
              aria-label="Chat message"
              className="min-w-0 flex-1 rounded-lg bg-stone-700 px-3 min-h-12 text-base"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="min-h-12 px-4 rounded-lg bg-amber-200 text-stone-900 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      </MobileMenuShell>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed left-2 ${zClass(Z_CHAT_PANEL)}`}
      style={{ bottom: compact ? '8px' : '14px', width: compact ? '210px' : '260px' }}
    >
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
          <span>Say something (space)</span>
        </button>
      )}
    </div>
  );
};

export default ChatPanel;
