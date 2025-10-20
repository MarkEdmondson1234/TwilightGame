/**
 * Dialogue Service - Handles AI-generated and static NPC dialogue
 *
 * Features:
 * - AI dialogue generation with persona-based responses
 * - Fallback to static dialogue trees when AI unavailable
 * - NPC personality/knowledge system
 * - Conversation history tracking
 */

import { DialogueNode, NPC } from '../types';

/**
 * NPC Persona - Defines personality, speaking style, and knowledge
 */
export interface NPCPersona {
  id: string;
  name: string;
  personality: string[];       // e.g., ["wise", "cautious", "friendly"]
  speakingStyle: string;        // e.g., "Uses archaic English, speaks formally"
  knowledge: string[];          // What the NPC knows about
  occupation?: string;
  background?: string;
}

/**
 * Conversation History - Tracks player interactions with NPCs
 */
export interface ConversationHistory {
  npcId: string;
  messages: {
    speaker: 'player' | 'npc';
    text: string;
    timestamp: number;
  }[];
}

/**
 * AI Dialogue Request
 */
export interface AIDialogueRequest {
  npc: NPC;
  persona: NPCPersona;
  playerMessage: string;
  conversationHistory: ConversationHistory;
  gameContext?: {
    playerLocation?: string;
    playerInventory?: string[];
    questStates?: Record<string, any>;
  };
}

/**
 * AI Dialogue Response
 */
export interface AIDialogueResponse {
  text: string;
  responses: {
    text: string;
    nextId?: string;
  }[];
}

/**
 * Configuration for dialogue service
 */
export const DIALOGUE_CONFIG = {
  useAI: false,  // Toggle AI vs static dialogue (set to true when AI endpoint ready)
  maxHistoryLength: 10,  // Keep last N messages in history
  aiTimeout: 5000,  // Timeout for AI requests (ms)
};

/**
 * NPC Personas - Define personality for each NPC
 */
export const NPC_PERSONAS: Record<string, NPCPersona> = {
  village_elder: {
    id: 'village_elder',
    name: 'Village Elder',
    personality: ['wise', 'cautious', 'formal', 'knowledgeable'],
    speakingStyle: 'Uses archaic English ("hast thou", "yon", "mayhaps"), speaks in a grandfatherly manner',
    knowledge: ['village history', 'forest dangers', 'ancient legends', 'herbs and stones'],
    occupation: 'Village Elder',
    background: 'Has lived in the village for 70 years, knows many secrets',
  },
  shopkeeper: {
    id: 'shopkeeper',
    name: 'Shopkeeper',
    personality: ['friendly', 'commercial', 'gossipy', 'welcoming'],
    speakingStyle: 'Cheerful and welcoming, uses "thee" and "thy", loves to chat',
    knowledge: ['shop inventory', 'traveller news', 'village gossip', 'distant lands'],
    occupation: 'Shopkeeper',
    background: 'Runs the village shop, hears news from traveling merchants',
  },
  child: {
    id: 'child',
    name: 'Village Child',
    personality: ['playful', 'curious', 'energetic', 'naive'],
    speakingStyle: 'Childlike and enthusiastic, uses contractions and exclamations',
    knowledge: ['games', 'forest stories', 'village children', 'mum\'s rules'],
    occupation: 'Child',
    background: 'A curious village child who dreams of adventure',
  },
};

/**
 * Conversation history storage (in-memory, could be localStorage in future)
 */
const conversationHistories = new Map<string, ConversationHistory>();

/**
 * Get or create conversation history for an NPC
 */
export function getConversationHistory(npcId: string): ConversationHistory {
  if (!conversationHistories.has(npcId)) {
    conversationHistories.set(npcId, {
      npcId,
      messages: [],
    });
  }
  return conversationHistories.get(npcId)!;
}

/**
 * Add message to conversation history
 */
export function addToHistory(npcId: string, speaker: 'player' | 'npc', text: string) {
  const history = getConversationHistory(npcId);
  history.messages.push({
    speaker,
    text,
    timestamp: Date.now(),
  });

  // Trim history to max length
  if (history.messages.length > DIALOGUE_CONFIG.maxHistoryLength) {
    history.messages = history.messages.slice(-DIALOGUE_CONFIG.maxHistoryLength);
  }
}

/**
 * Generate AI dialogue (placeholder for future AI integration)
 *
 * TODO: Implement actual AI API call when ready
 * This could call:
 * - OpenAI API with persona in system prompt
 * - Local LLM endpoint
 * - Custom dialogue generation service
 */
async function generateAIDialogue(request: AIDialogueRequest): Promise<AIDialogueResponse> {
  // Placeholder implementation
  // In production, this would make an API call with persona context

  const systemPrompt = `You are ${request.persona.name}.
Personality: ${request.persona.personality.join(', ')}
Speaking Style: ${request.persona.speakingStyle}
Knowledge: ${request.persona.knowledge.join(', ')}
Background: ${request.persona.background}

Generate a response in character. Keep responses 1-3 sentences.
Include 2-4 response options for the player.`;

  // TODO: Replace with actual AI API call
  // Example: const response = await fetch('/api/dialogue', { ... });

  throw new Error('AI dialogue generation not yet implemented');
}

/**
 * Get static fallback dialogue
 * Uses the pre-written dialogue trees from NPC definition
 */
function getStaticDialogue(npc: NPC, currentNodeId: string): DialogueNode | null {
  return npc.dialogue.find(node => node.id === currentNodeId) || npc.dialogue[0] || null;
}

/**
 * Main dialogue service function
 * Returns dialogue for NPC, using AI or static fallback
 *
 * @param npc - The NPC being talked to
 * @param currentNodeId - Current dialogue node (for static trees)
 * @param playerMessage - Player's message (for AI mode)
 * @returns Dialogue node to display
 */
export async function getDialogue(
  npc: NPC,
  currentNodeId: string = 'greeting',
  playerMessage?: string
): Promise<DialogueNode | null> {
  // If AI is disabled, use static dialogue
  if (!DIALOGUE_CONFIG.useAI) {
    return getStaticDialogue(npc, currentNodeId);
  }

  // Try AI generation with fallback to static
  try {
    const persona = NPC_PERSONAS[npc.id];
    if (!persona) {
      console.warn(`No persona defined for NPC: ${npc.id}, using static dialogue`);
      return getStaticDialogue(npc, currentNodeId);
    }

    const history = getConversationHistory(npc.id);

    const aiResponse = await Promise.race([
      generateAIDialogue({
        npc,
        persona,
        playerMessage: playerMessage || 'Hello',
        conversationHistory: history,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), DIALOGUE_CONFIG.aiTimeout)
      ),
    ]);

    // Record AI response in history
    if (playerMessage) {
      addToHistory(npc.id, 'player', playerMessage);
    }
    addToHistory(npc.id, 'npc', aiResponse.text);

    // Convert AI response to DialogueNode format
    return {
      id: `ai_${Date.now()}`,
      text: aiResponse.text,
      responses: aiResponse.responses,
    };
  } catch (error) {
    console.warn('AI dialogue generation failed, falling back to static:', error);
    return getStaticDialogue(npc, currentNodeId);
  }
}

/**
 * Reset conversation history for an NPC
 * Useful when starting a new conversation
 */
export function resetConversationHistory(npcId: string) {
  conversationHistories.delete(npcId);
}

/**
 * Enable or disable AI dialogue
 */
export function setAIDialogueEnabled(enabled: boolean) {
  DIALOGUE_CONFIG.useAI = enabled;
  console.log(`AI dialogue ${enabled ? 'enabled' : 'disabled'}`);
}
