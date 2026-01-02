/**
 * AIDialogueBox - Chat interface for AI-powered NPC conversations
 *
 * Features:
 * - NPC response displayed like static dialogue
 * - AI-generated response OPTIONS (click to select, like static dialogue)
 * - Text input for custom questions (optional)
 * - Return to static dialogue option
 * - Touch-friendly (works without keyboard via suggestion buttons)
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { NPC } from '../types';
import { NPCPersona, NPC_PERSONAS, buildSystemPrompt, GameContext } from '../services/dialogueService';
import { generateResponse } from '../services/anthropicClient';
import { getHistoryForAPI, addToChatHistory, getMemoriesForPrompt } from '../services/aiChatHistory';
import { useDialogueAnimation } from '../hooks/useDialogueAnimation';
import { Z_DIALOGUE, zClass } from '../zIndex';
import { TimeManager } from '../utils/TimeManager';
import { gameState } from '../GameState';

interface AIDialogueBoxProps {
  npc: NPC;
  playerSprite: string;
  onClose: () => void;
  onSwitchToStatic: () => void;  // Return to traditional dialogue
}

const AIDialogueBox: React.FC<AIDialogueBoxProps> = ({
  npc,
  playerSprite,
  onClose,
  onSwitchToStatic,
}) => {
  // Current NPC message and AI-generated response options
  const [npcMessage, setNpcMessage] = useState<string>('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Conversation history for context
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const persona = NPC_PERSONAS[npc.id];

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
    loadInitialGreeting();
  }, []);

  // Get current game context for the prompt
  const getGameContext = (): GameContext => {
    const gameTime = TimeManager.getCurrentTime();
    const weather = gameState.getWeather();
    return {
      season: gameTime.season,
      timeOfDay: gameTime.timeOfDay,
      weather,
      location: 'village',
    };
  };

  const loadInitialGreeting = async () => {
    setIsLoading(true);

    // Load persisted conversation history from localStorage
    const persistedHistory = getHistoryForAPI(npc.id, 10);
    setHistory(persistedHistory);

    try {
      // Build system prompt with memories
      const memoriesSection = getMemoriesForPrompt(npc.id);
      let systemPrompt = buildSystemPrompt(persona, getGameContext());
      if (memoriesSection) {
        systemPrompt = `${systemPrompt}\n\n${memoriesSection}`;
      }

      // If we have history, NPC acknowledges returning player
      const openingMessage = persistedHistory.length > 0
        ? "Hello again! (Player is returning - you've spoken before, reference past topics naturally)"
        : "Hello! (Player has just entered the conversation for the first time)";

      const response = await generateResponse(
        systemPrompt,
        persistedHistory,
        openingMessage
      );

      if (response.error) {
        setNpcMessage(getFallbackGreeting(persona));
        setSuggestions(getDefaultSuggestions(persona));
      } else {
        setNpcMessage(response.text);
        setSuggestions(response.suggestions.length > 0
          ? response.suggestions
          : getDefaultSuggestions(persona));

        // Save NPC's greeting to persistent history
        addToChatHistory(npc.id, 'assistant', response.text);
        setHistory(prev => [...prev, { role: 'assistant', content: response.text }]);
      }
    } catch (err) {
      setNpcMessage(getFallbackGreeting(persona));
      setSuggestions(getDefaultSuggestions(persona));
    } finally {
      setIsLoading(false);
    }
  };

  // Send a message (from suggestion click or custom input)
  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // Check if this is a farewell message (ends conversation)
    const isFarewell = isFarewellMessage(message);

    setIsLoading(true);
    setError(null);
    setShowCustomInput(false);
    setInputText('');

    // Save player message to persistent history
    addToChatHistory(npc.id, 'user', message);

    try {
      // Build system prompt with memories
      const memoriesSection = getMemoriesForPrompt(npc.id);
      let systemPrompt = buildSystemPrompt(persona, getGameContext());
      if (memoriesSection) {
        systemPrompt = `${systemPrompt}\n\n${memoriesSection}`;
      }

      const response = await generateResponse(systemPrompt, history, message);

      if (response.error) {
        setError(response.error);
        setNpcMessage(getFallbackResponse(persona));
        setSuggestions(getDefaultSuggestions(persona));
      } else {
        setNpcMessage(response.text);
        setSuggestions(response.suggestions.length > 0
          ? response.suggestions
          : getDefaultSuggestions(persona));

        // Save NPC response to persistent history
        addToChatHistory(npc.id, 'assistant', response.text);

        // Update session history
        setHistory(prev => [
          ...prev,
          { role: 'user', content: message },
          { role: 'assistant', content: response.text },
        ]);

        // If farewell, close dialogue after showing response
        if (isFarewell) {
          setTimeout(() => onClose(), 2000);
        }
      }
    } catch (err) {
      setError('Failed to get response');
      setNpcMessage(getFallbackResponse(persona));
      setSuggestions(getDefaultSuggestions(persona));
    } finally {
      setIsLoading(false);
    }
  };

  // Detect farewell messages to auto-close
  const isFarewellMessage = (message: string): boolean => {
    const farewellWords = ['farewell', 'goodbye', 'bye', 'leaving', 'go now', 'must go', 'should go'];
    const lowerMessage = message.toLowerCase();
    return farewellWords.some(word => lowerMessage.includes(word));
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

  // Get the NPC sprite for dialogue
  const npcDialogueSprite = npc.dialogueExpressions?.default || npc.dialogueSprite || npc.portraitSprite || npc.sprite;

  return (
    <div className={`fixed inset-0 ${zClass(Z_DIALOGUE)} overflow-hidden`}>
      {/* Background gradient overlay - same as static dialogue */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30, 30, 50, 0.85) 0%, rgba(20, 20, 35, 0.95) 100%)',
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
          height: 'min(45vh, 320px)',
          bottom: '80px',
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
            bottom: '-55%',
          }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0">
          {/* Name area */}
          <div
            className="absolute flex items-center justify-center"
            style={{ top: '8%', left: '10%', width: '30%', height: '22%' }}
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

          {/* Main text area */}
          <div
            className="absolute overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600"
            style={{ top: '32%', left: '6%', right: '6%', height: '55%', padding: '2% 3%' }}
          >
            {isLoading ? (
              <p
                className="animate-pulse"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)',
                  color: '#d4a373',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              >
                {npc.name} is thinking...
              </p>
            ) : (
              <div
                className="leading-relaxed ai-dialogue-content"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)',
                  color: '#e8e8e8',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  lineHeight: '1.6',
                }}
              >
                <ReactMarkdown
                  components={{
                    // Render emphasis (italics) with warm amber colour for *actions*
                    em: ({ children }) => (
                      <em style={{ color: '#d4a373', fontStyle: 'italic' }}>{children}</em>
                    ),
                    // Render strong (bold) with slightly brighter colour
                    strong: ({ children }) => (
                      <strong style={{ color: '#f5deb3', fontWeight: 'bold' }}>{children}</strong>
                    ),
                    // Paragraphs without extra margin
                    p: ({ children }) => <span>{children}</span>,
                  }}
                >
                  {npcMessage}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Response options - similar styling to static dialogue */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto"
        style={{ bottom: '12px', width: 'min(90vw, 900px)' }}
      >
        {/* AI-generated response suggestions - cottage-core styled */}
        {!showCustomInput && !isLoading && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                className="px-4 py-2 text-sm transition-all duration-200 ease-out transform hover:scale-105 active:scale-95"
                style={{
                  fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                  background: 'linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.95) 100%)',
                  color: '#faebd7',
                  border: '2px solid rgba(210, 160, 90, 0.7)',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(160, 110, 55, 0.9) 0%, rgba(120, 80, 40, 0.95) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(230, 180, 100, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.95) 100%)';
                  e.currentTarget.style.borderColor = 'rgba(210, 160, 90, 0.7)';
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Custom input option - cottage-core styled */}
        {showCustomInput ? (
          <div className="flex gap-2 justify-center mb-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Speak your mind..."
              className="flex-1 max-w-md px-4 py-2 focus:outline-none"
              style={{
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                background: 'rgba(45, 35, 25, 0.9)',
                color: '#faebd7',
                border: '2px solid rgba(180, 130, 70, 0.6)',
                borderRadius: '8px',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:transform-none"
              style={{
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                background: 'linear-gradient(180deg, rgba(76, 120, 76, 0.9) 0%, rgba(50, 90, 50, 0.95) 100%)',
                color: '#e8f5e8',
                border: '2px solid rgba(140, 180, 120, 0.7)',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
              }}
            >
              Send
            </button>
            <button
              onClick={() => setShowCustomInput(false)}
              className="px-4 py-2 transition-all duration-200 transform hover:scale-105 active:scale-95"
              style={{
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                background: 'linear-gradient(180deg, rgba(80, 70, 60, 0.85) 0%, rgba(60, 50, 40, 0.95) 100%)',
                color: '#d4c4b4',
                border: '2px solid rgba(140, 120, 100, 0.6)',
                borderRadius: '8px',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-4 justify-center items-center">
            <button
              onClick={() => setShowCustomInput(true)}
              className="text-sm px-4 py-1.5 transition-all duration-200 transform hover:scale-105"
              style={{
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                background: 'rgba(60, 50, 40, 0.7)',
                color: '#d4a373',
                border: '1px solid rgba(180, 140, 90, 0.5)',
                borderRadius: '6px',
              }}
              disabled={isLoading}
            >
              Ask something else...
            </button>
            <button
              onClick={onSwitchToStatic}
              className="text-sm transition-colors duration-200"
              style={{
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                color: 'rgba(180, 160, 140, 0.8)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#d4a373'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(180, 160, 140, 0.8)'}
            >
              ← Return to conversation
            </button>
            <button
              onClick={onClose}
              className="text-sm transition-colors duration-200"
              style={{
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                color: 'rgba(180, 160, 140, 0.8)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#d4a373'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(180, 160, 140, 0.8)'}
            >
              Farewell
            </button>
          </div>
        )}
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
          // Only close on tap if there are no active suggestions
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
    village_elder: "Ah, a visitor! Come, sit with me beneath this old tree. What brings thee here today?",
    shopkeeper_fox: "Welcome, welcome! Always lovely to see a friendly face! What can I do for thee?",
    mum_home: "Hello, love! *wipes hands on apron* Come in, come in. How are you today?",
    mum_kitchen: "Hello, sweetheart! *stirs the pot* I'm just preparing something delicious. What's on your mind?",
    old_woman_knitting: "Oh, hello dearie! *needles click softly* Come sit with me a while.",
    child: "Hi! Hi! *bounces excitedly* Do you want to play? I've been so bored!",
    chill_bear: "*The bear looks up and rumbles warmly* Hello, friend. Would you like some tea?",
    witch: "*looks up from the bubbling cauldron* Ah, a visitor. Welcome to my glade, traveller.",
  };
  return greetings[persona.id] || "Hello there! What would you like to talk about?";
}

function getFallbackResponse(persona: NPCPersona): string {
  const fallbacks: Record<string, string> = {
    village_elder: "*strokes beard* Forgive me, my mind wandered for a moment. What were you saying?",
    shopkeeper_fox: "Sorry, got distracted by some new stock! What was that?",
    mum_home: "*gives a warm smile* Sorry, love, I was thinking about dinner. What were you saying?",
    mum_kitchen: "*tastes from a spoon* Mmm, just checking the flavour. What was that, dear?",
    old_woman_knitting: "*counts stitches* Oh my, lost count. What were you saying, dearie?",
    child: "Huh? Sorry, I was thinking about something! What did you say?",
    chill_bear: "*sips tea thoughtfully* Hmm? The breeze distracted me. What was that?",
    witch: "*stirs the cauldron* The brew required my attention. You were saying?",
  };
  return fallbacks[persona.id] || "Hmm? I lost my train of thought. What were we discussing?";
}

function getDefaultSuggestions(persona: NPCPersona): string[] {
  const suggestions: Record<string, string[]> = {
    village_elder: [
      "Tell me about the cherry tree",
      "What was the village like long ago?",
      "Any wisdom to share?",
      "I should be going now",
    ],
    shopkeeper_fox: [
      "What's new in the shop?",
      "Heard any gossip lately?",
      "Tell me about the travelling merchants",
      "Farewell for now",
    ],
    mum_home: [
      "What are you cooking today?",
      "Tell me about the village",
      "Can you teach me a recipe?",
      "I should go explore",
    ],
    mum_kitchen: [
      "What are you making?",
      "Can you teach me to cook something?",
      "Tell me about your recipes",
      "I'll let you cook in peace",
    ],
    old_woman_knitting: [
      "What are you knitting?",
      "Tell me about the old days",
      "Do you know any stories?",
      "I should be going, thank you",
    ],
    child: [
      "What games do you like?",
      "Tell me about the forest!",
      "Have you seen any animals?",
      "I have to go now, bye!",
    ],
    chill_bear: [
      "I'd love some tea, please",
      "What's your favourite honey?",
      "Tell me about the forest",
      "Thank you, I should go",
    ],
    witch: [
      "What are you brewing?",
      "Could you teach me magic?",
      "Tell me about your wolf",
      "I must be going",
    ],
  };
  return suggestions[persona.id] || ["Tell me about yourself", "What do you do here?", "I must go"];
}

export default AIDialogueBox;
