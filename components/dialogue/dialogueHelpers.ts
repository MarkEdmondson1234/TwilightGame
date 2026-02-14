/**
 * Shared helpers for the unified dialogue system
 *
 * Contains: fallback greetings/responses, default suggestions, farewell detection,
 * emotion-to-sprite resolution, and the ThinkingIndicator component.
 */

import { NPC } from '../../types';
import { NPCPersona } from '../../services/dialogueService';
import { NPCEmotion } from '../../services/anthropicClient';

// ============================================================================
// Font constant
// ============================================================================

export const DIALOGUE_FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
export const TEXT_FONT = 'Georgia, "Times New Roman", serif';

// ============================================================================
// Farewell detection
// ============================================================================

const FAREWELL_PHRASES = [
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

export function isFarewellMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return FAREWELL_PHRASES.some((phrase) => lower.includes(phrase));
}

// ============================================================================
// Fallback greetings / responses / suggestions
// ============================================================================

export function getFallbackGreeting(persona: NPCPersona): string {
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

export function getFallbackResponse(persona: NPCPersona): string {
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

export function getDefaultSuggestions(persona: NPCPersona): string[] {
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

// ============================================================================
// Emotion sprite resolution
// ============================================================================

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

/**
 * Resolve the NPC portrait sprite based on scripted expression or AI emotion.
 * Priority: scriptedExpression > aiEmotion > default hierarchy
 */
export function resolveNpcSprite(
  npc: NPC,
  scriptedExpression?: string,
  aiEmotion?: NPCEmotion
): string {
  // Scripted expression takes priority
  if (scriptedExpression && npc.dialogueExpressions) {
    const sprite = npc.dialogueExpressions[scriptedExpression];
    if (sprite) return sprite;
  }

  // AI emotion mapping
  if (aiEmotion && npc.dialogueExpressions) {
    const targetEmotion = emotionToSprite[aiEmotion];
    const aliases = spriteAliases[targetEmotion] || [];
    for (const alias of aliases) {
      if (npc.dialogueExpressions[alias]) {
        return npc.dialogueExpressions[alias];
      }
    }
  }

  // Default fallback hierarchy
  if (npc.dialogueExpressions?.default) return npc.dialogueExpressions.default;
  return npc.dialogueSprite || npc.portraitSprite || npc.sprite;
}
