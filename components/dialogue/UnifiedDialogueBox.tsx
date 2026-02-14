/**
 * UnifiedDialogueBox - Single dialogue component for both scripted and AI modes
 *
 * Replaces the separate DialogueBox and AIDialogueBox with one unified UI.
 * Both scripted and AI messages appear in the same scrollable chat history.
 * Mode switches seamlessly — only the bottom controls area changes.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NPC, DialogueNode, DialogueResponse } from '../../types';
import {
  NPCPersona,
  NPC_PERSONAS,
  buildSystemPrompt,
  GameContext,
  getDialogue,
} from '../../services/dialogueService';
import {
  generateStructuredResponse,
  generateStreamingResponse,
  isAIAvailable,
  NPCEmotion,
} from '../../services/anthropicClient';
import {
  getHistoryForAPI,
  addToChatHistory,
  getMemoriesForPrompt,
} from '../../services/aiChatHistory';
import { useStreamingDialogue } from '../../hooks/useStreamingDialogue';
import { useChatHistory } from '../../hooks/useChatHistory';
import { TimeManager } from '../../utils/TimeManager';
import { gameState } from '../../GameState';
import { getSharedDataService } from '../../firebase/safe';
import { recordConversation, recordScriptedConversation } from '../../services/diaryService';
import { friendshipManager } from '../../utils/FriendshipManager';
import { globalEventManager } from '../../utils/GlobalEventManager';
import { eventChainManager } from '../../utils/EventChainManager';
import { inventoryManager } from '../../utils/inventoryManager';
import { decorationManager } from '../../utils/DecorationManager';
import { getItem } from '../../data/items';

import DialogueFrame from './DialogueFrame';
import DialogueChatHistory from './DialogueChatHistory';
import ScriptedControls from './ScriptedControls';
import AIControls from './AIControls';
import {
  resolveNpcSprite,
  isFarewellMessage,
  getFallbackGreeting,
  getFallbackResponse,
  getDefaultSuggestions,
} from './dialogueHelpers';

// ============================================================================
// Types
// ============================================================================

type DialogueMode = 'scripted' | 'ai';

interface UnifiedDialogueBoxProps {
  npc: NPC;
  playerSprite: string;
  onClose: () => void;
  onNodeChange?: (npcId: string, nodeId: string) => string | void;
  onSendToBed?: () => void;
  initialNodeId?: string;
}

// ============================================================================
// Component
// ============================================================================

const UnifiedDialogueBox: React.FC<UnifiedDialogueBoxProps> = ({
  npc,
  playerSprite,
  onClose,
  onNodeChange,
  onSendToBed,
  initialNodeId = 'greeting',
}) => {
  // Mode: scripted (default) or ai
  const [mode, setMode] = useState<DialogueMode>('scripted');

  // Scripted state
  const [currentNodeId, setCurrentNodeId] = useState<string>(initialNodeId);
  const [currentDialogue, setCurrentDialogue] = useState<DialogueNode | null>(null);
  const lastSavedNodeRef = useRef<string>('');

  // AI state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingSendToBed, setPendingSendToBed] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // Shared state
  const [currentEmotion, setCurrentEmotion] = useState<NPCEmotion>('neutral');

  // Hooks
  const {
    state: streamState,
    startStreaming,
    handleMetadata,
    handleDialogueChunk,
    handleSuggestions,
    handleComplete,
    handleError,
  } = useStreamingDialogue();

  const chatHistory = useChatHistory();

  const persona = NPC_PERSONAS[npc.id];
  const canUseAI = isAIAvailable() && persona?.aiEnabled;
  const playerName = gameState.getSelectedCharacter()?.name || 'Traveller';
  const displaySuggestions = streamState.showSuggestions ? streamState.suggestions : suggestions;
  const isActivelyLoading = isLoading || (streamState.isStreaming && !streamState.dialogueText);

  // -------------------------------------------------------------------------
  // Load persisted chat history on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    chatHistory.loadHistory(npc.id);
  }, []);

  // Reset to initialNodeId when NPC changes
  useEffect(() => {
    setCurrentNodeId(initialNodeId);
    lastSavedNodeRef.current = '';
  }, [npc.id, initialNodeId]);

  // -------------------------------------------------------------------------
  // Scripted dialogue loading
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (mode !== 'scripted') return;

    const loadDialogue = async () => {
      const dialogue = await getDialogue(npc, currentNodeId);
      setCurrentDialogue(dialogue);

      // Append NPC text as a chat bubble (if not already saved for this node)
      if (dialogue?.text && currentNodeId !== lastSavedNodeRef.current) {
        lastSavedNodeRef.current = currentNodeId;

        // Resolve expression for portrait
        if (dialogue.expression) {
          setCurrentEmotion('neutral'); // Reset — scripted uses expression not emotion
        }

        chatHistory.addAssistantMessage(dialogue.text);
        addToChatHistory(npc.id, 'assistant', `[${currentNodeId}] ${dialogue.text}`);
      }

      // Handle auto-redirects on greeting
      if (currentNodeId === 'greeting' && onNodeChange) {
        const redirect = onNodeChange(npc.id, currentNodeId);
        if (redirect) {
          onNodeChange(npc.id, redirect);
          setCurrentNodeId(redirect);
        }
      }
    };
    loadDialogue();
  }, [npc, currentNodeId, mode]);

  // -------------------------------------------------------------------------
  // Scripted response handling
  // -------------------------------------------------------------------------

  const handleScriptedResponse = useCallback(
    (response: DialogueResponse | string) => {
      if (typeof response === 'string') {
        if (response === '__AI_CHAT__') {
          switchToAI();
          return;
        }
        if (response) {
          let target = response;
          if (onNodeChange) {
            const redirect = onNodeChange(npc.id, response);
            if (redirect) target = redirect;
          }
          setCurrentNodeId(target);
        } else {
          onClose();
        }
        return;
      }

      // Add player's response as a chat bubble
      chatHistory.addPlayerMessage(response.text);
      addToChatHistory(npc.id, 'user', response.text);

      // Record to diary
      if (currentDialogue?.text) {
        recordScriptedConversation(
          npc.id,
          npc.name,
          playerName,
          response.text,
          currentDialogue.text
        ).catch(() => {});
      }

      // Process quest actions
      if (response.startsQuest) gameState.startQuest(response.startsQuest);
      if (response.advancesQuest) {
        const stage = gameState.getQuestStage(response.advancesQuest);
        gameState.setQuestStage(response.advancesQuest, stage + 1);
      }
      if (response.completesQuest) gameState.completeQuest(response.completesQuest);
      if (response.setsQuestStage) {
        gameState.setQuestStage(response.setsQuestStage.questId, response.setsQuestStage.stage);
      }
      if (response.givesItems) {
        for (const gift of response.givesItems) {
          inventoryManager.addItem(gift.itemId, gift.quantity);
        }
      }
      if (response.grantsEasel) decorationManager.grantEasel();

      // Navigate to next node
      if (response.nextId) {
        let target = response.nextId;
        if (onNodeChange) {
          const redirect = onNodeChange(npc.id, response.nextId);
          if (redirect) target = redirect;
        }
        setCurrentNodeId(target);
      } else {
        onClose();
      }
    },
    [npc.id, currentDialogue, onNodeChange, onClose, playerName]
  );

  // -------------------------------------------------------------------------
  // AI mode: game context
  // -------------------------------------------------------------------------

  const getGameContext = useCallback((): GameContext => {
    const gameTime = TimeManager.getCurrentTime();
    const weather = gameState.getWeather();
    let transformation: string | undefined;
    if (gameState.isFairyForm()) transformation = 'fairy';

    const quests = gameState.getFullState().quests || {};
    const activeQuests: string[] = [];
    const completedQuests: string[] = [];
    for (const [questId, quest] of Object.entries(quests)) {
      const displayName = questId.replace(/_/g, ' ');
      if (quest.completed) completedQuests.push(displayName);
      else if (quest.started) activeQuests.push(displayName);
    }

    const recentGlobalEvents = globalEventManager.getRecentDescriptions(5);
    const friendshipTier = friendshipManager.getFriendshipTier(npc.id);
    const activeEventChains = eventChainManager
      .getActiveChains()
      .map((p) => eventChainManager.getChain(p.chainId)?.definition.title)
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
  }, [npc.id]);

  // -------------------------------------------------------------------------
  // AI mode: switch to AI + initial greeting
  // -------------------------------------------------------------------------

  const switchToAI = useCallback(async () => {
    setMode('ai');
    setIsLoading(true);

    const persistedHistory = getHistoryForAPI(npc.id, 10);
    setHistory(persistedHistory);

    try {
      const memoriesSection = getMemoriesForPrompt(npc.id, playerName);
      let systemPrompt = buildSystemPrompt(persona, getGameContext());
      if (memoriesSection) systemPrompt = `${systemPrompt}\n\n${memoriesSection}`;

      const gossip = await getSharedDataService().getNPCGossip(npc.id, npc.name);
      if (gossip) systemPrompt = `${systemPrompt}\n\n## Village Gossip\n${gossip}`;

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
        chatHistory.addAssistantMessage(getFallbackGreeting(persona));
        setSuggestions(getDefaultSuggestions(persona));
      } else {
        chatHistory.addAssistantMessage(response.dialogue, response.emotion, response.action);
        setCurrentEmotion(response.emotion);
        setSuggestions(
          response.suggestions.length > 0 ? response.suggestions : getDefaultSuggestions(persona)
        );
        const full = response.action
          ? `*${response.action}* ${response.dialogue}`
          : response.dialogue;
        addToChatHistory(npc.id, 'assistant', full, playerName);
        setHistory((prev) => [...prev, { role: 'assistant', content: full }]);
      }
    } catch {
      chatHistory.addAssistantMessage(getFallbackGreeting(persona));
      setSuggestions(getDefaultSuggestions(persona));
    } finally {
      setIsLoading(false);
    }
  }, [npc.id, npc.name, persona, playerName, getGameContext]);

  // -------------------------------------------------------------------------
  // AI mode: send message
  // -------------------------------------------------------------------------

  const sendAIMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading || streamState.isStreaming || pendingSendToBed) return;

      if (isFarewellMessage(message)) {
        onClose();
        return;
      }

      chatHistory.addPlayerMessage(message);
      setSuggestions([]);
      setError(null);
      setShowCustomInput(false);
      setInputText('');

      startStreaming();
      chatHistory.startStreamingMessage();
      addToChatHistory(npc.id, 'user', message, playerName);

      let streamedAction: string | undefined;
      let streamedDialogue = '';
      let shouldSendToBedAfter = false;
      let moderationScore = 0;

      try {
        const memoriesSection = getMemoriesForPrompt(npc.id, playerName);
        let systemPrompt = buildSystemPrompt(persona, getGameContext());
        if (memoriesSection) systemPrompt = `${systemPrompt}\n\n${memoriesSection}`;

        getSharedDataService()
          .getNPCGossip(npc.id, npc.name)
          .then((gossip) => {
            if (gossip) console.log(`[AI] Gossip available for ${npc.name}: ${gossip}`);
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
            chatHistory.finaliseStreamingMessage(streamedDialogue, undefined, streamedAction);
            if (streamedAction) setCurrentEmotion(streamState.emotion);

            const full = streamedAction
              ? `*${streamedAction}* ${streamedDialogue}`
              : streamedDialogue;
            if (full) {
              addToChatHistory(npc.id, 'assistant', full, playerName);
              setHistory((prev) => [
                ...prev,
                { role: 'user', content: message },
                { role: 'assistant', content: full },
              ]);
              if (streamedDialogue.length > 50) {
                contributeConversationSummary(message, streamedDialogue);
              }
            }

            if (shouldSendToBedAfter && onSendToBed) {
              console.log(`[AI] Moderation triggered: score ${moderationScore}`);
              setPendingSendToBed(true);
              setTimeout(() => onSendToBed(), 2500);
            }
          },
          onError: async (err) => {
            console.warn('[AI] Streaming failed, falling back to batch:', err);
            handleError(err);

            try {
              const resp = await generateStructuredResponse(systemPrompt, history, message);
              if (!resp.error) {
                chatHistory.replaceStreamingWithFallback(resp.dialogue, resp.emotion, resp.action);
                setCurrentEmotion(resp.emotion);
                setSuggestions(
                  resp.suggestions.length > 0 ? resp.suggestions : getDefaultSuggestions(persona)
                );
                const full = resp.action ? `*${resp.action}* ${resp.dialogue}` : resp.dialogue;
                addToChatHistory(npc.id, 'assistant', full, playerName);
                setHistory((prev) => [
                  ...prev,
                  { role: 'user', content: message },
                  { role: 'assistant', content: full },
                ]);
                if (resp.dialogue.length > 50)
                  contributeConversationSummary(message, resp.dialogue);
                if (resp.shouldSendToBed && onSendToBed) {
                  setPendingSendToBed(true);
                  setSuggestions([]);
                  setTimeout(() => onSendToBed(), 2500);
                }
              } else {
                setError(resp.error);
                chatHistory.replaceStreamingWithFallback(getFallbackResponse(persona));
                setSuggestions(getDefaultSuggestions(persona));
              }
            } catch {
              setError('Failed to get response');
              chatHistory.replaceStreamingWithFallback(getFallbackResponse(persona));
              setSuggestions(getDefaultSuggestions(persona));
            }
          },
        });
      } catch {
        setError('Failed to get response');
        chatHistory.replaceStreamingWithFallback(getFallbackResponse(persona));
        setSuggestions(getDefaultSuggestions(persona));
      }
    },
    [
      isLoading,
      streamState.isStreaming,
      streamState.emotion,
      pendingSendToBed,
      npc.id,
      npc.name,
      persona,
      playerName,
      history,
      onClose,
      onSendToBed,
      getGameContext,
      startStreaming,
      handleMetadata,
      handleDialogueChunk,
      handleSuggestions,
      handleComplete,
      handleError,
    ]
  );

  // -------------------------------------------------------------------------
  // Sync streaming text into chat bubbles
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (streamState.isStreaming && streamState.dialogueText) {
      chatHistory.updateStreamingMessage(
        streamState.dialogueText,
        streamState.emotion,
        streamState.action
      );
      setCurrentEmotion(streamState.emotion);
    }
  }, [streamState.dialogueText, streamState.emotion, streamState.action, streamState.isStreaming]);

  useEffect(() => {
    if (streamState.isStreaming && streamState.dialogueText) {
      chatHistory.scrollToBottom();
    }
  }, [streamState.dialogueText, streamState.isStreaming]);

  // -------------------------------------------------------------------------
  // Conversation summary for diary + shared data
  // -------------------------------------------------------------------------

  const contributeConversationSummary = useCallback(
    (playerMessage: string, npcResponse: string) => {
      const gameTime = TimeManager.getCurrentTime();
      const topic = playerMessage.length > 90 ? playerMessage.slice(0, 87) + '...' : playerMessage;
      const snippet = npcResponse.length > 300 ? npcResponse.slice(0, 297) + '...' : npcResponse;
      const summary = `${playerName}: "${topic}" — ${npc.name}: "${snippet}"`;

      getSharedDataService()
        .addConversationSummary(npc.id, npc.name, topic, summary.slice(0, 1000), 'neutral', {
          season: gameTime.season,
          gameDay: gameTime.day,
        })
        .catch((err) => console.warn('[AI] Failed to contribute conversation summary:', err));

      recordConversation(npc.id, npc.name, playerName, playerMessage, npcResponse).catch((err) =>
        console.warn('[AI] Failed to record diary entry:', err)
      );
    },
    [npc.id, npc.name, playerName]
  );

  // -------------------------------------------------------------------------
  // Switch back to scripted
  // -------------------------------------------------------------------------

  const switchToScripted = useCallback(() => {
    setMode('scripted');
    setCurrentNodeId('greeting');
    lastSavedNodeRef.current = '';
    setSuggestions([]);
    setShowCustomInput(false);
    setInputText('');
  }, []);

  // -------------------------------------------------------------------------
  // Escape key handler
  // -------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'ai' && showCustomInput) {
          setShowCustomInput(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, showCustomInput, onClose]);

  // -------------------------------------------------------------------------
  // Resolve NPC sprite
  // -------------------------------------------------------------------------

  const npcSprite = resolveNpcSprite(
    npc,
    mode === 'scripted' ? currentDialogue?.expression : undefined,
    mode === 'ai' ? currentEmotion : undefined
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Don't render until scripted dialogue is loaded (in scripted mode)
  if (mode === 'scripted' && !currentDialogue) return null;

  return (
    <DialogueFrame
      npcName={npc.name}
      npcSprite={npcSprite}
      playerSprite={playerSprite}
      onClose={onClose}
      nameExtra={
        mode === 'ai' ? (
          <span className="ml-2 text-xs text-amber-600 opacity-75">AI</span>
        ) : undefined
      }
    >
      {/* Scrollable chat history */}
      <DialogueChatHistory
        messages={chatHistory.chatMessages}
        scrollRef={chatHistory.scrollRef}
        onScroll={chatHistory.handleScroll}
        npcName={npc.name}
        playerName={playerName}
        isLoading={isActivelyLoading}
      />

      {/* Controls: scripted or AI */}
      {mode === 'scripted' && currentDialogue ? (
        <ScriptedControls
          dialogue={currentDialogue}
          canUseAI={!!canUseAI}
          onResponse={handleScriptedResponse}
          onClose={onClose}
        />
      ) : mode === 'ai' ? (
        <AIControls
          suggestions={displaySuggestions}
          isLoading={isLoading}
          isStreaming={streamState.isStreaming}
          showCustomInput={showCustomInput}
          inputText={inputText}
          pendingSendToBed={pendingSendToBed}
          onSendMessage={sendAIMessage}
          onToggleCustomInput={setShowCustomInput}
          onInputChange={setInputText}
          onSwitchToScripted={switchToScripted}
          onClose={onClose}
        />
      ) : null}

      {/* Error toast */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </DialogueFrame>
  );
};

export default UnifiedDialogueBox;
