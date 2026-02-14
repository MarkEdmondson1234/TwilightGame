/**
 * useChatHistory - Manages chat message state for AI dialogue
 *
 * Loads persisted history, appends new messages, manages streaming bubble,
 * and handles auto-scroll to bottom with pause-on-user-scroll.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getChatHistory } from '../services/aiChatHistory';
import { parseAssistantContent } from '../components/ChatBubble';
import { NPCEmotion } from '../services/anthropicClient';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: NPCEmotion;
  action?: string;
  isStreaming?: boolean;
  timestamp?: number;
}

let nextId = 0;
function makeId(): string {
  return `msg_${Date.now()}_${nextId++}`;
}

export function useChatHistory() {
  const [chatMessages, setChatMessages] = useState<DisplayMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  /** Load persisted history from localStorage */
  const loadHistory = useCallback((npcId: string) => {
    const history = getChatHistory(npcId);
    const messages: DisplayMessage[] = history.map((msg) => {
      if (msg.role === 'assistant') {
        // Strip [nodeId] prefixes from scripted dialogue entries
        const cleaned = msg.content.replace(/^\[[\w_]+\]\s*/, '');
        const parsed = parseAssistantContent(cleaned);
        return {
          id: makeId(),
          role: msg.role,
          content: parsed.dialogue,
          action: parsed.action,
          timestamp: msg.timestamp,
        };
      }
      return {
        id: makeId(),
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
      };
    });
    setChatMessages(messages);
  }, []);

  /** Add a player message bubble */
  const addPlayerMessage = useCallback((content: string) => {
    isUserScrolledUpRef.current = false;
    setChatMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content, timestamp: Date.now() },
    ]);
  }, []);

  /** Add a complete NPC message bubble (skips if last message has identical content) */
  const addAssistantMessage = useCallback(
    (content: string, emotion?: NPCEmotion, action?: string) => {
      isUserScrolledUpRef.current = false;
      setChatMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.content === content) return prev;
        return [
          ...prev,
          { id: makeId(), role: 'assistant', content, emotion, action, timestamp: Date.now() },
        ];
      });
    },
    []
  );

  /** Append a streaming placeholder NPC bubble */
  const startStreamingMessage = useCallback(() => {
    isUserScrolledUpRef.current = false;
    setChatMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'assistant', content: '', isStreaming: true },
    ]);
  }, []);

  /** Update the last (streaming) message with new text/metadata */
  const updateStreamingMessage = useCallback(
    (text: string, emotion?: NPCEmotion, action?: string) => {
      setChatMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (!last.isStreaming) return prev;
        const updated = { ...last, content: text };
        if (emotion) updated.emotion = emotion;
        if (action) updated.action = action;
        return [...prev.slice(0, -1), updated];
      });
    },
    []
  );

  /** Finalise the streaming message */
  const finaliseStreamingMessage = useCallback(
    (content: string, emotion?: NPCEmotion, action?: string) => {
      setChatMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (!last.isStreaming) return prev;
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            content,
            emotion: emotion || last.emotion,
            action: action || last.action,
            isStreaming: false,
          },
        ];
      });
    },
    []
  );

  /** Replace the last streaming message with a fallback (non-streaming) */
  const replaceStreamingWithFallback = useCallback(
    (content: string, emotion?: NPCEmotion, action?: string) => {
      setChatMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        // Replace the streaming placeholder with a normal message
        if (last.isStreaming || last.content === '') {
          return [
            ...prev.slice(0, -1),
            {
              id: last.id,
              role: 'assistant' as const,
              content,
              emotion,
              action,
              isStreaming: false,
            },
          ];
        }
        // Or just append
        return [...prev, { id: makeId(), role: 'assistant' as const, content, emotion, action }];
      });
    },
    []
  );

  /** Scroll handling */
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isUserScrolledUpRef.current = !isAtBottom;
  }, []);

  /** Auto-scroll to bottom when messages change */
  const scrollToBottom = useCallback(() => {
    if (!isUserScrolledUpRef.current && scrollRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  return {
    chatMessages,
    scrollRef,
    handleScroll,
    scrollToBottom,
    loadHistory,
    addPlayerMessage,
    addAssistantMessage,
    startStreamingMessage,
    updateStreamingMessage,
    finaliseStreamingMessage,
    replaceStreamingWithFallback,
  };
}
