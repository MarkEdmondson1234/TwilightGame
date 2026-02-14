/**
 * AIDialogueBox - Chat interface for AI-powered NPC conversations
 *
 * Features:
 * - Scrollable chat history within the dialogue frame
 * - NPC responses stream in real-time into chat bubbles
 * - AI-generated response OPTIONS (click to select, like static dialogue)
 * - Text input for custom questions (optional)
 * - Return to static dialogue option
 * - Touch-friendly (works without keyboard via suggestion buttons)
 */

import React, { useState, useRef, useEffect } from 'react';
import { NPC } from '../types';
import {
  NPCPersona,
  NPC_PERSONAS,
  buildSystemPrompt,
  GameContext,
} from '../services/dialogueService';
import {
  generateStructuredResponse,
  generateStreamingResponse,
  NPCEmotion,
} from '../services/anthropicClient';
import {
  getHistoryForAPI,
  addToChatHistory,
  getMemoriesForPrompt,
} from '../services/aiChatHistory';
import { useDialogueAnimation } from '../hooks/useDialogueAnimation';
import { useStreamingDialogue } from '../hooks/useStreamingDialogue';
import { useChatHistory } from '../hooks/useChatHistory';
import { Z_DIALOGUE, zClass } from '../zIndex';
import { TimeManager } from '../utils/TimeManager';
import { gameState } from '../GameState';
import { getSharedDataService } from '../firebase/safe';
import { recordConversation } from '../services/diaryService';
import { friendshipManager } from '../utils/FriendshipManager';
import { globalEventManager } from '../utils/GlobalEventManager';
import { eventChainManager } from '../utils/EventChainManager';
import ChatBubble from './ChatBubble';

interface AIDialogueBoxProps {
  npc: NPC;
  playerSprite: string;
  onClose: () => void;
  onSwitchToStatic: () => void;
  onSendToBed?: () => void;
}

const FONT_FAMILY = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

/**
 * Animated thinking indicator with bouncing dots
 */
const ThinkingIndicator: React.FC<{ npcName: string }> = ({ npcName }) => {
  return (
    <div
      style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
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
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.4;
          }
          30% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
        .thinking-dot {
          display: inline-block;
          animation: dotBounce 1.2s ease-in-out infinite;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

const AIDialogueBox: React.FC<AIDialogueBoxProps> = ({
  npc,
  playerSprite,
  onClose,
  onSwitchToStatic,
  onSendToBed,
}) => {
  // Streaming dialogue hook for real-time text display
  const {
    state: streamState,
    startStreaming,
    handleMetadata,
    handleDialogueChunk,
    handleSuggestions,
    handleComplete,
    handleError,
  } = useStreamingDialogue();

  // Chat history hook for message bubbles
  const {
    chatMessages,
    scrollRef,
    handleScroll,
    scrollToBottom,
    loadHistory,
    addAssistantMessage,
    addPlayerMessage,
    startStreamingMessage,
    updateStreamingMessage,
    finaliseStreamingMessage,
    replaceStreamingWithFallback,
  } = useChatHistory();

  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Conversation history for API context (separate from display messages)
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [pendingSendToBed, setPendingSendToBed] = useState(false);

  // Current emotion for portrait sprite
  const [currentEmotion, setCurrentEmotion] = useState<NPCEmotion>('neutral');

  const inputRef = useRef<HTMLInputElement>(null);
  const persona = NPC_PERSONAS[npc.id];

  const playerName = gameState.getSelectedCharacter()?.name || 'Traveller';

  const displaySuggestions = streamState.showSuggestions ? streamState.suggestions : suggestions;
  const isActivelyLoading = isLoading || (streamState.isStreaming && !streamState.dialogueText);

  // Animated dialogue frame (reuse existing animation)
  const { currentFrame } = useDialogueAnimation(150, true);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768 || window.innerHeight < 500);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Load persisted history and generate greeting on mount
  useEffect(() => {
    loadHistory(npc.id);
    loadInitialGreeting();
  }, []);

  // Sync streaming state into chat bubbles
  useEffect(() => {
    if (streamState.isStreaming && streamState.dialogueText) {
      updateStreamingMessage(streamState.dialogueText, streamState.emotion, streamState.action);
      setCurrentEmotion(streamState.emotion);
    }
  }, [
    streamState.dialogueText,
    streamState.emotion,
    streamState.action,
    streamState.isStreaming,
    updateStreamingMessage,
  ]);

  // Auto-scroll when streaming text updates
  useEffect(() => {
    if (streamState.isStreaming && streamState.dialogueText) {
      scrollToBottom();
    }
  }, [streamState.dialogueText, streamState.isStreaming, scrollToBottom]);

  // Get current game context for the prompt
  const getGameContext = (): GameContext => {
    const gameTime = TimeManager.getCurrentTime();
    const weather = gameState.getWeather();

    let transformation: string | undefined;
    if (gameState.isFairyForm()) {
      transformation = 'fairy';
    }

    const quests = gameState.getFullState().quests || {};
    const activeQuests: string[] = [];
    const completedQuests: string[] = [];
    for (const [questId, quest] of Object.entries(quests)) {
      const displayName = questId.replace(/_/g, ' ');
      if (quest.completed) {
        completedQuests.push(displayName);
      } else if (quest.started) {
        activeQuests.push(displayName);
      }
    }

    const recentGlobalEvents = globalEventManager.getRecentDescriptions(5);
    const friendshipTier = friendshipManager.getFriendshipTier(npc.id);
    const activeEventChains = eventChainManager
      .getActiveChains()
      .map((p) => {
        const chain = eventChainManager.getChain(p.chainId);
        return chain?.definition.title;
      })
      .filter((t): t is string => !!t);

    return {
      season: gameTime.season,
      timeOfDay: gameTime.timeOfDay,
      weather,
      location: 'village',
      transformation,
      activeQuests: activeQuests.length > 0 ? activeQuests : undefined,
      completedQuests: completedQuests.length > 0 ? completedQuests : undefined,
      recentGlobalEvents: recentGlobalEvents.length > 0 ? recentGlobalEvents : undefined,
      activeEventChains: activeEventChains.length > 0 ? activeEventChains : undefined,
      friendshipTier: friendshipTier !== 'stranger' ? friendshipTier : undefined,
    };
  };

  const loadInitialGreeting = async () => {
    setIsLoading(true);

    const persistedHistory = getHistoryForAPI(npc.id, 10);
    setHistory(persistedHistory);

    try {
      const memoriesSection = getMemoriesForPrompt(npc.id, playerName);
      let systemPrompt = buildSystemPrompt(persona, getGameContext());
      if (memoriesSection) {
        systemPrompt = `${systemPrompt}\n\n${memoriesSection}`;
      }

      const gossip = await getSharedDataService().getNPCGossip(npc.id, npc.name);
      if (gossip) {
        systemPrompt = `${systemPrompt}\n\n## Village Gossip\n${gossip}`;
      }

      const openingMessage =
        persistedHistory.length > 0
          ? `Hello again! (${playerName} is returning - you've spoken before, reference past topics naturally)`
          : `Hello! (${playerName} has just entered the conversation for the first time)`;

      const response = await generateStructuredResponse(
        systemPrompt,
        persistedHistory,
        openingMessage
      );

      if (response.error) {
        addAssistantMessage(getFallbackGreeting(persona));
        setSuggestions(getDefaultSuggestions(persona));
      } else {
        addAssistantMessage(response.dialogue, response.emotion, response.action);
        setCurrentEmotion(response.emotion);
        setSuggestions(
          response.suggestions.length > 0 ? response.suggestions : getDefaultSuggestions(persona)
        );

        const fullResponse = response.action
          ? `*${response.action}* ${response.dialogue}`
          : response.dialogue;
        addToChatHistory(npc.id, 'assistant', fullResponse, playerName);
        setHistory((prev) => [...prev, { role: 'assistant', content: fullResponse }]);
      }
    } catch {
      addAssistantMessage(getFallbackGreeting(persona));
      setSuggestions(getDefaultSuggestions(persona));
    } finally {
      setIsLoading(false);
    }
  };

  // Send a message (from suggestion click or custom input)
  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading || streamState.isStreaming || pendingSendToBed) return;

    if (isFarewellMessage(message)) {
      onClose();
      return;
    }

    addPlayerMessage(message);
    setSuggestions([]);
    setError(null);
    setShowCustomInput(false);
    setInputText('');

    startStreaming();
    startStreamingMessage();

    addToChatHistory(npc.id, 'user', message, playerName);

    let streamedAction: string | undefined;
    let streamedDialogue = '';
    let shouldSendToBedAfter = false;
    let moderationScore = 0;

    try {
      const memoriesSection = getMemoriesForPrompt(npc.id, playerName);
      let systemPrompt = buildSystemPrompt(persona, getGameContext());
      if (memoriesSection) {
        systemPrompt = `${systemPrompt}\n\n${memoriesSection}`;
      }

      getSharedDataService()
        .getNPCGossip(npc.id, npc.name)
        .then((gossip) => {
          if (gossip) {
            console.log(`[AI] Gossip available for ${npc.name}: ${gossip}`);
          }
        });

      await generateStreamingResponse(systemPrompt, history, message, {
        onMetadata: (meta) => {
          handleMetadata(meta);
          streamedAction = meta.action;
          shouldSendToBedAfter = meta.shouldSendToBed;
          moderationScore = meta.moderationScore;
        },
        onDialogueChunk: (chunk, fullText) => {
          handleDialogueChunk(chunk, fullText);
          streamedDialogue = fullText;
        },
        onSuggestions: (sug) => {
          if (!shouldSendToBedAfter) {
            handleSuggestions(sug.length > 0 ? sug : getDefaultSuggestions(persona));
          }
        },
        onComplete: () => {
          handleComplete();

          finaliseStreamingMessage(streamedDialogue, undefined, streamedAction);
          if (streamedAction) {
            setCurrentEmotion(streamState.emotion);
          }

          const fullResponse = streamedAction
            ? `*${streamedAction}* ${streamedDialogue}`
            : streamedDialogue;
          if (fullResponse) {
            addToChatHistory(npc.id, 'assistant', fullResponse, playerName);
            setHistory((prev) => [
              ...prev,
              { role: 'user', content: message },
              { role: 'assistant', content: fullResponse },
            ]);

            if (streamedDialogue.length > 50) {
              contributeConversationSummary(message, streamedDialogue);
            }
          }

          if (shouldSendToBedAfter && onSendToBed) {
            console.log(`[AI] Moderation triggered: score ${moderationScore}`);
            setPendingSendToBed(true);
            setTimeout(() => {
              onSendToBed();
            }, 2500);
          }
        },
        onError: async (err) => {
          console.warn('[AI] Streaming failed, falling back to batch:', err);
          handleError(err);

          try {
            const response = await generateStructuredResponse(systemPrompt, history, message);
            if (!response.error) {
              replaceStreamingWithFallback(response.dialogue, response.emotion, response.action);
              setCurrentEmotion(response.emotion);
              setSuggestions(
                response.suggestions.length > 0
                  ? response.suggestions
                  : getDefaultSuggestions(persona)
              );

              const fullResponse = response.action
                ? `*${response.action}* ${response.dialogue}`
                : response.dialogue;
              addToChatHistory(npc.id, 'assistant', fullResponse, playerName);
              setHistory((prev) => [
                ...prev,
                { role: 'user', content: message },
                { role: 'assistant', content: fullResponse },
              ]);

              if (response.dialogue.length > 50) {
                contributeConversationSummary(message, response.dialogue);
              }

              if (response.shouldSendToBed && onSendToBed) {
                setPendingSendToBed(true);
                setSuggestions([]);
                setTimeout(() => onSendToBed(), 2500);
              }
            } else {
              setError(response.error);
              replaceStreamingWithFallback(getFallbackResponse(persona));
              setSuggestions(getDefaultSuggestions(persona));
            }
          } catch {
            setError('Failed to get response');
            replaceStreamingWithFallback(getFallbackResponse(persona));
            setSuggestions(getDefaultSuggestions(persona));
          }
        },
      });
    } catch {
      setError('Failed to get response');
      replaceStreamingWithFallback(getFallbackResponse(persona));
      setSuggestions(getDefaultSuggestions(persona));
    }
  };

  /** Contribute conversation summary to shared data + diary */
  const contributeConversationSummary = (playerMessage: string, npcResponse: string) => {
    const gameTime = TimeManager.getCurrentTime();
    const topic = playerMessage.length > 90 ? playerMessage.slice(0, 87) + '...' : playerMessage;
    const responseSnippet =
      npcResponse.length > 300 ? npcResponse.slice(0, 297) + '...' : npcResponse;
    const summary = `${playerName}: "${topic}" — ${npc.name}: "${responseSnippet}"`;

    getSharedDataService()
      .addConversationSummary(npc.id, npc.name, topic, summary.slice(0, 1000), 'neutral', {
        season: gameTime.season,
        gameDay: gameTime.day,
      })
      .catch((err) => {
        console.warn('[AI] Failed to contribute conversation summary:', err);
      });

    recordConversation(npc.id, npc.name, playerName, playerMessage, npcResponse).catch((err) => {
      console.warn('[AI] Failed to record diary entry:', err);
    });
  };

  const isFarewellMessage = (message: string): boolean => {
    const farewellPhrases = [
      'farewell',
      'goodbye',
      'bye',
      'leaving',
      'go now',
      'must go',
      'should go',
      'be going',
      'have to go',
      'need to go',
      'got to go',
      'be off',
      'take my leave',
      'see you',
      'until next time',
      'good day',
      'good night',
      'later',
    ];
    const lowerMessage = message.toLowerCase();
    return farewellPhrases.some((phrase) => lowerMessage.includes(phrase));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
    if (e.key === 'Escape') {
      if (showCustomInput) {
        setShowCustomInput(false);
      } else {
        onClose();
      }
    }
  };

  // Focus input when custom input mode is activated
  useEffect(() => {
    if (showCustomInput) {
      inputRef.current?.focus();
    }
  }, [showCustomInput]);

  // Emotion sprite logic for NPC portrait
  type SpriteEmotion = 'default' | 'happy' | 'sad' | 'angry' | 'surprised';

  const emotionToSprite: Record<NPCEmotion, SpriteEmotion> = {
    neutral: 'default',
    happy: 'happy',
    excited: 'happy',
    loving: 'happy',
    sad: 'sad',
    worried: 'sad',
    embarrassed: 'sad',
    angry: 'angry',
    surprised: 'surprised',
    thoughtful: 'default',
  };

  const spriteAliases: Record<SpriteEmotion, string[]> = {
    default: ['default', 'neutral'],
    happy: ['happy', 'smile', 'joy'],
    sad: ['sad', 'upset'],
    angry: ['angry', 'mad'],
    surprised: ['surprised', 'shock'],
  };

  const getEmotionSprite = (): string => {
    if (npc.dialogueExpressions) {
      const targetEmotion = emotionToSprite[currentEmotion];
      const aliases = spriteAliases[targetEmotion] || [];
      for (const alias of aliases) {
        if (npc.dialogueExpressions[alias]) {
          return npc.dialogueExpressions[alias];
        }
      }
      if (npc.dialogueExpressions.default) {
        return npc.dialogueExpressions.default;
      }
    }
    return npc.dialogueSprite || npc.portraitSprite || npc.sprite;
  };

  const npcDialogueSprite = getEmotionSprite();

  return (
    <div className={`fixed inset-0 ${zClass(Z_DIALOGUE)} overflow-hidden`}>
      {/* Background gradient overlay - same as static dialogue */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(30, 30, 50, 0.85) 0%, rgba(20, 20, 35, 0.95) 100%)',
        }}
      />

      {/* Character portraits - same layout as static dialogue */}
      <div className="absolute inset-0 flex items-end justify-between pointer-events-none">
        {/* Player - left (hidden on small screens) */}
        {!isSmallScreen && (
          <div
            className="relative flex-shrink-0"
            style={{
              width: '45%',
              height: '95%',
              marginBottom: '8%',
            }}
          >
            <img
              src={playerSprite}
              alt="You"
              className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom"
              style={{
                imageRendering: 'auto',
                filter: 'drop-shadow(0 0 40px rgba(100, 200, 255, 0.4))',
                transform: 'scaleX(-1)',
              }}
            />
          </div>
        )}

        {/* Spacer when player hidden */}
        {isSmallScreen && <div className="flex-1" />}

        {/* NPC - right (centered on small screens) */}
        <div
          className="relative flex-shrink-0"
          style={{
            width: isSmallScreen ? '70%' : '45%',
            height: isSmallScreen ? '70%' : '95%',
            marginBottom: isSmallScreen ? '35%' : '8%',
          }}
        >
          <img
            src={npcDialogueSprite}
            alt={npc.name}
            className="absolute bottom-0 w-full h-full object-contain object-bottom"
            style={{
              imageRendering: 'auto',
              filter: 'drop-shadow(0 0 40px rgba(255, 200, 100, 0.4))',
              right: isSmallScreen ? 'auto' : '0',
              left: isSmallScreen ? '50%' : 'auto',
              transform: isSmallScreen ? 'translateX(-50%)' : 'none',
            }}
          />
        </div>

        {/* Spacer when player hidden */}
        {isSmallScreen && <div className="flex-1" />}
      </div>

      {/* Dialogue window - reuses animated frame from static dialogue */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto overflow-hidden"
        style={{
          width: 'min(95vw, 950px)',
          height: 'min(58vh, 460px)',
          bottom: '16px',
        }}
      >
        {/* Animated dialogue frame background */}
        <img
          src={currentFrame}
          alt=""
          className="absolute"
          style={{
            imageRendering: 'auto',
            width: '100%',
            height: 'auto',
            bottom: '-40%',
          }}
        />

        {/* Content overlay - flex column so controls stay inside frame */}
        <div className="absolute inset-0 flex flex-col">
          {/* Name area with AI indicator */}
          <div
            className="flex items-center flex-shrink-0"
            style={{ paddingTop: '6%', paddingLeft: '10%', paddingBottom: '1%' }}
          >
            <span
              style={{
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
                fontSize: 'clamp(1.1rem, 3vw, 1.6rem)',
                fontWeight: 'bold',
                color: '#4a3228',
                textShadow: '0 1px 2px rgba(255,255,255,0.5)',
                letterSpacing: '0.05em',
              }}
            >
              {npc.name}
            </span>
            {/* AI indicator */}
            <span className="ml-2 text-xs text-amber-600 opacity-75">AI</span>
          </div>

          {/* Scrollable chat history */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto chat-scrollbar"
            onScroll={handleScroll}
            style={{
              paddingLeft: '6%',
              paddingRight: '6%',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {chatMessages.map((msg) => (
              <ChatBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                action={msg.action}
                emotion={msg.emotion}
                isStreaming={msg.isStreaming}
                npcName={msg.role === 'assistant' ? npc.name : undefined}
                playerName={msg.role === 'user' ? playerName : undefined}
              />
            ))}
            {isActivelyLoading && <ThinkingIndicator npcName={npc.name} />}
          </div>

          {/* Response controls - inside the frame */}
          <div className="flex-shrink-0" style={{ padding: '6px 6% 8px' }}>
            {/* Suggestion buttons */}
            {!showCustomInput &&
              !isLoading &&
              !streamState.isStreaming &&
              displaySuggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mb-1.5">
                  {displaySuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(suggestion)}
                      className="px-3 py-1 text-xs transition-all duration-200 ease-out transform hover:scale-105 active:scale-95"
                      style={{
                        fontFamily: FONT_FAMILY,
                        background:
                          'linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.95) 100%)',
                        color: '#faebd7',
                        border: '1.5px solid rgba(210, 160, 90, 0.7)',
                        borderRadius: '6px',
                        boxShadow:
                          '0 1px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          'linear-gradient(180deg, rgba(160, 110, 55, 0.9) 0%, rgba(120, 80, 40, 0.95) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(230, 180, 100, 0.9)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          'linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.95) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(210, 160, 90, 0.7)';
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

            {/* Custom input option */}
            {showCustomInput ? (
              <div className="flex gap-2 justify-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Speak your mind..."
                  className="flex-1 max-w-md px-3 py-1.5 text-sm focus:outline-none"
                  style={{
                    fontFamily: FONT_FAMILY,
                    background: 'rgba(45, 35, 25, 0.9)',
                    color: '#faebd7',
                    border: '1.5px solid rgba(180, 130, 70, 0.6)',
                    borderRadius: '6px',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
                  }}
                  disabled={isLoading || streamState.isStreaming}
                />
                <button
                  onClick={() => sendMessage(inputText)}
                  disabled={isLoading || streamState.isStreaming || !inputText.trim()}
                  className="px-3 py-1.5 text-sm transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none"
                  style={{
                    fontFamily: FONT_FAMILY,
                    background:
                      'linear-gradient(180deg, rgba(76, 120, 76, 0.9) 0%, rgba(50, 90, 50, 0.95) 100%)',
                    color: '#e8f5e8',
                    border: '1.5px solid rgba(140, 180, 120, 0.7)',
                    borderRadius: '6px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  Send
                </button>
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="px-3 py-1.5 text-sm transition-all duration-200 transform hover:scale-105 active:scale-95"
                  style={{
                    fontFamily: FONT_FAMILY,
                    background:
                      'linear-gradient(180deg, rgba(80, 70, 60, 0.85) 0%, rgba(60, 50, 40, 0.95) 100%)',
                    color: '#d4c4b4',
                    border: '1.5px solid rgba(140, 120, 100, 0.6)',
                    borderRadius: '6px',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-3 justify-center items-center">
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="text-xs px-3 py-1 transition-all duration-200 transform hover:scale-105"
                  style={{
                    fontFamily: FONT_FAMILY,
                    background: 'rgba(60, 50, 40, 0.7)',
                    color: '#d4a373',
                    border: '1px solid rgba(180, 140, 90, 0.5)',
                    borderRadius: '6px',
                  }}
                  disabled={isLoading || streamState.isStreaming}
                >
                  Ask something else...
                </button>
                <button
                  onClick={onSwitchToStatic}
                  className="text-xs transition-colors duration-200"
                  style={{
                    fontFamily: FONT_FAMILY,
                    color: 'rgba(180, 160, 140, 0.8)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#d4a373')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180, 160, 140, 0.8)')}
                >
                  ← Return to conversation
                </button>
                <button
                  onClick={onClose}
                  className="text-xs transition-colors duration-200"
                  style={{
                    fontFamily: FONT_FAMILY,
                    color: 'rgba(180, 160, 140, 0.8)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#d4a373')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180, 160, 140, 0.8)')}
                >
                  Farewell
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Mobile touch area for closing */}
      <div
        className="absolute inset-0 sm:hidden"
        onClick={() => {
          if (showCustomInput) return;
          if (suggestions.length === 0 && !isLoading) {
            onClose();
          }
        }}
        style={{ zIndex: -1 }}
      />
    </div>
  );
};

// Helper functions
function getFallbackGreeting(persona: NPCPersona): string {
  const greetings: Record<string, string> = {
    village_elder:
      'Ah, a visitor! Come, sit with me beneath this old tree. What brings thee here today?',
    shopkeeper_fox:
      'Welcome, welcome! Always lovely to see a friendly face! What can I do for thee?',
    mum_home: 'Hello, love! *wipes hands on apron* Come in, come in. How are you today?',
    mum_kitchen:
      "Hello, sweetheart! *stirs the pot* I'm just preparing something delicious. What's on your mind?",
    old_woman_knitting: 'Oh, hello dearie! *needles click softly* Come sit with me a while.',
    child: "Hi! Hi! *bounces excitedly* Do you want to play? I've been so bored!",
    chill_bear: '*The bear looks up and rumbles warmly* Hello, friend. Would you like some tea?',
    witch: '*looks up from the bubbling cauldron* Ah, a visitor. Welcome to my glade, traveller.',
  };
  return greetings[persona.id] || 'Hello there! What would you like to talk about?';
}

function getFallbackResponse(persona: NPCPersona): string {
  const fallbacks: Record<string, string> = {
    village_elder:
      '*strokes beard* Forgive me, my mind wandered for a moment. What were you saying?',
    shopkeeper_fox: 'Sorry, got distracted by some new stock! What was that?',
    mum_home:
      '*gives a warm smile* Sorry, love, I was thinking about dinner. What were you saying?',
    mum_kitchen: '*tastes from a spoon* Mmm, just checking the flavour. What was that, dear?',
    old_woman_knitting: '*counts stitches* Oh my, lost count. What were you saying, dearie?',
    child: 'Huh? Sorry, I was thinking about something! What did you say?',
    chill_bear: '*sips tea thoughtfully* Hmm? The breeze distracted me. What was that?',
    witch: '*stirs the cauldron* The brew required my attention. You were saying?',
  };
  return fallbacks[persona.id] || 'Hmm? I lost my train of thought. What were we discussing?';
}

function getDefaultSuggestions(persona: NPCPersona): string[] {
  const suggestions: Record<string, string[]> = {
    village_elder: [
      'Tell me about the cherry tree',
      'What was the village like long ago?',
      'Any wisdom to share?',
      'I should be going now',
    ],
    shopkeeper_fox: [
      "What's new in the shop?",
      'Heard any gossip lately?',
      'Tell me about the travelling merchants',
      'Farewell for now',
    ],
    mum_home: [
      'What are you cooking today?',
      'Tell me about the village',
      'Can you teach me a recipe?',
      'I should go explore',
    ],
    mum_kitchen: [
      'What are you making?',
      'Can you teach me to cook something?',
      'Tell me about your recipes',
      "I'll let you cook in peace",
    ],
    old_woman_knitting: [
      'What are you knitting?',
      'Tell me about the old days',
      'Do you know any stories?',
      'I should be going, thank you',
    ],
    child: [
      'What games do you like?',
      'Tell me about the forest!',
      'Have you seen any animals?',
      'I have to go now, bye!',
    ],
    chill_bear: [
      "I'd love some tea, please",
      "What's your favourite honey?",
      'Tell me about the forest',
      'Thank you, I should go',
    ],
    witch: [
      'What are you brewing?',
      'Could you teach me magic?',
      'Tell me about your wolf',
      'I must be going',
    ],
  };
  return suggestions[persona.id] || ['Tell me about yourself', 'What do you do here?', 'I must go'];
}

export default AIDialogueBox;
