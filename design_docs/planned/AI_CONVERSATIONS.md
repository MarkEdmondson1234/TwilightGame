# AI Conversations System

**Status**: Implemented
**Priority**: Experimental
**Author**: Claude
**Date**: January 2026
**Implemented**: January 2026

## Documentation

- **Player Guide**: [docs/AI_CHAT.md](../../docs/AI_CHAT.md) - In-game help (F1 → AI Chat tab)
- **Developer Guide**: [docs/AI_CONVERSATIONS_DEV.md](../../docs/AI_CONVERSATIONS_DEV.md) - Technical details

## Overview

Add AI-powered conversational dialogue as an optional extension to the existing static dialogue system. Players interact with NPCs using the familiar dialogue tree, but can choose to enter an AI chat mode where they can ask questions freely AND select from AI-generated response options.

## Goals

1. **Static dialogue is primary**: Existing dialogue trees remain the main conversation mode
2. **AI as enhancement**: A dialogue option activates AI chat for deeper conversations
3. **Hybrid input**: Players can type freely OR click AI-generated response suggestions
4. **Character consistency**: NPCs maintain distinct personalities through detailed personas
5. **Short responses**: AI responses feel natural for a game (~1-3 sentences)
6. **Touch-friendly**: Generated response options work well on iPad without keyboard
7. **Graceful degradation**: Option hidden when API key isn't configured
8. **Experimental scope**: Start with 2-3 village NPCs

## Architecture

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Player Interaction                        │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Static Dialogue   │
                    │   (Existing trees)  │
                    └─────────┬───────────┘
                              │
                              │ Player selects
                              │ "Chat freely..." option
                              ▼
                    ┌─────────────────────┐
                    │   AI Chat Mode      │
                    │                     │
                    │  ┌───────────────┐  │
                    │  │ Type question │  │  ← Free-form input
                    │  └───────────────┘  │
                    │         OR          │
                    │  ┌───────────────┐  │
                    │  │ Click option  │  │  ← AI-generated suggestions
                    │  └───────────────┘  │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Anthropic Haiku    │
                    │  API Call           │
                    │                     │
                    │  Returns:           │
                    │  - NPC response     │
                    │  - 2-4 suggested    │
                    │    player options   │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   AIDialogueBox     │
                    │  - NPC message      │
                    │  - Response buttons │
                    │  - Text input field │
                    │  - "Return" button  │
                    └─────────────────────┘
```

### Dialogue Modes

1. **Static Mode** (primary): Uses existing `DialogueNode[]` dialogue trees
   - All current NPC conversations work unchanged
   - AI-enabled NPCs show an extra "Chat freely..." option

2. **AI Chat Mode** (optional): Entered via dialogue option
   - NPC responds with AI-generated text
   - Player can type questions OR click suggested responses
   - "Return to conversation" exits back to static dialogue

## Implementation Plan

### Phase 1: Environment & API Setup

**Files to modify/create:**
- `.env.example` - Document required environment variable
- `services/anthropicClient.ts` - NEW: API client wrapper

**Environment Variable:**
```bash
# .env.local (not committed)
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

**API Client (`services/anthropicClient.ts`):**
```typescript
/**
 * Anthropic API Client
 *
 * Uses Haiku model for fast, cost-effective NPC dialogue.
 * Falls back gracefully if API key is not configured.
 */

import Anthropic from '@anthropic-ai/sdk';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 150; // Keep responses short

interface AIResponse {
  text: string;                    // NPC's response
  suggestions: string[];           // 2-4 suggested player responses
  error?: string;
}

let client: Anthropic | null = null;

/**
 * Initialize the Anthropic client
 * Returns false if API key is not configured
 */
export function initAnthropicClient(): boolean {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('[AI] No ANTHROPIC_API_KEY configured - AI dialogue disabled');
    return false;
  }

  // Note: In a production game, API calls should go through a backend
  // to avoid exposing the API key. For this experimental phase,
  // we use dangerouslyAllowBrowser for development.
  client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  console.log('[AI] Anthropic client initialized');
  return true;
}

/**
 * Check if AI dialogue is available
 */
export function isAIAvailable(): boolean {
  return client !== null;
}

/**
 * Generate AI dialogue response with suggested player responses
 */
export async function generateResponse(
  systemPrompt: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string
): Promise<AIResponse> {
  if (!client) {
    return { text: '', suggestions: [], error: 'AI not available' };
  }

  try {
    const messages = [
      ...conversationHistory,
      { role: 'user' as const, content: userMessage },
    ];

    // Add instruction to generate response suggestions
    const enhancedSystemPrompt = `${systemPrompt}

## Response Format
After your in-character response, include 2-4 suggested player responses on new lines prefixed with ">" like this:
> Ask about the weather
> Tell me more about that
> I should go now

These suggestions should be natural follow-up questions or responses the player might want to say.
IMPORTANT: Always include one option that gracefully ends the conversation (e.g., "Farewell", "I should be going", "Thank you, goodbye").`;

    const response = await client.messages.create({
      model: HAIKU_MODEL,
      max_tokens: MAX_TOKENS,
      system: enhancedSystemPrompt,
      messages,
    });

    const textContent = response.content.find(c => c.type === 'text');
    const fullText = textContent?.text || '';

    // Parse NPC response and suggestions
    const lines = fullText.split('\n');
    const npcLines: string[] = [];
    const suggestions: string[] = [];

    for (const line of lines) {
      if (line.startsWith('>')) {
        suggestions.push(line.slice(1).trim());
      } else if (line.trim()) {
        npcLines.push(line);
      }
    }

    return {
      text: npcLines.join(' ').trim(),
      suggestions: suggestions.slice(0, 4), // Max 4 suggestions
    };
  } catch (error) {
    console.error('[AI] API error:', error);
    return {
      text: '',
      suggestions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

### Phase 1b: Tiered Memory System (localStorage)

**New file:** `services/aiChatHistory.ts`

NPCs have a three-tier memory system:

1. **Recent History** (50 messages) - Full conversation log, pruned when limit reached
2. **Long-term Memories** (100 max) - Key facts, events, and details
3. **Core Memories** (100 max) - Most important relationship-defining moments, consolidated from long-term

When messages are pruned → extract to long-term memories.
When long-term fills up → consolidate to core memories.

```
┌─────────────────────────────────────────────────────────────────┐
│                    NPC Memory System                            │
├─────────────────────────────────────────────────────────────────┤
│  Core Memories (100 max, permanent, highest priority)           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Player's name is "Luna" - a kind soul who loves nature  │  │
│  │ • We became true friends after the lost cat adventure     │  │
│  │ • Player saved my life during the winter storm            │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Long-term Memories (100 max, consolidated when full)           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ • Player helped find lost cat on Day 15                   │  │
│  │ • Player loves gardening, especially tomatoes             │  │
│  │ • Player asked about the old mill ruins                   │  │
│  │ • Player gave me a birthday gift - a handknit scarf       │  │
│  │ • Player mentioned missing their grandmother              │  │
│  └───────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Recent History (last 50 messages)                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [user] Hello again!                                       │  │
│  │ [npc] Ah, good to see thee! How fares thy garden?         │  │
│  │ [user] The tomatoes are growing well                      │  │
│  │ [npc] Wonderful! I remember when thou first planted...    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Memory Priority in Prompts:**
Core memories are always included first (highest priority), then long-term memories (space permitting), then recent history provides immediate context.

Store conversation history in localStorage so NPCs remember past conversations:

```typescript
/**
 * AI Chat History & Memory System
 *
 * Two-tier memory architecture:
 * 1. Recent History (50 messages) - Full conversation log, pruned when limit reached
 * 2. Long-term Memories (permanent) - Key facts extracted when messages are pruned
 *
 * Storage format:
 * - 'ai_chat_{npcId}' - Recent message history
 * - 'ai_memory_{npcId}' - Long-term memories
 */

import { generateResponse } from './anthropicClient';

const CHAT_PREFIX = 'ai_chat_';
const MEMORY_PREFIX = 'ai_memory_';
const CORE_PREFIX = 'ai_core_';

const MAX_MESSAGES_PER_NPC = 50;
const MAX_MEMORIES_PER_NPC = 100;
const MAX_CORE_MEMORIES = 100;      // Plenty of room for deep relationship history
const PRUNE_BATCH_SIZE = 20;        // Extract memories from this many messages
const CONSOLIDATE_BATCH_SIZE = 30;  // Consolidate this many memories into core

// ============================================
// Types
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Memory {
  id: string;                      // Unique ID for this memory
  content: string;                 // The memory itself (e.g., "Player's name is Luna")
  category: MemoryCategory;        // Type of memory
  importance: 'low' | 'medium' | 'high';
  createdAt: number;               // When this memory was created
  sourceDay?: number;              // In-game day when this happened
}

export interface CoreMemory {
  id: string;
  content: string;                 // Consolidated, relationship-defining memory
  theme: CoreMemoryTheme;          // What this memory represents
  createdAt: number;
  consolidatedFrom: string[];      // IDs of memories this was created from
}

export type CoreMemoryTheme =
  | 'identity'         // Who the player is (name, personality)
  | 'bond'             // Key relationship moments
  | 'trust'            // Times player proved trustworthy
  | 'shared_history'   // Important events together
  | 'player_values';   // What matters to the player

export type MemoryCategory =
  | 'player_info'      // Player's name, preferences, background
  | 'shared_event'     // Things that happened together
  | 'player_interest'  // Topics player showed interest in
  | 'gift_received'    // Gifts player gave to NPC
  | 'quest_related'    // Quest progress, requests made
  | 'relationship'     // Friendship milestones, emotional moments
  | 'world_knowledge'; // Things player told NPC about the world

// ============================================
// Recent History (Chat Messages)
// ============================================

/**
 * Get conversation history for an NPC
 */
export function getChatHistory(npcId: string): ChatMessage[] {
  try {
    const key = `${CHAT_PREFIX}${npcId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as ChatMessage[];
  } catch (error) {
    console.warn(`[aiChatHistory] Failed to load history for ${npcId}:`, error);
    return [];
  }
}

/**
 * Save a message to conversation history
 * When pruning old messages, extracts memories first
 */
export async function addToChatHistory(
  npcId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  try {
    const history = getChatHistory(npcId);

    history.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // If over limit, extract memories from oldest messages before pruning
    if (history.length > MAX_MESSAGES_PER_NPC) {
      const messagesToPrune = history.slice(0, PRUNE_BATCH_SIZE);
      await extractMemoriesFromMessages(npcId, messagesToPrune);

      // Now prune
      const pruned = history.slice(-MAX_MESSAGES_PER_NPC);
      const key = `${CHAT_PREFIX}${npcId}`;
      localStorage.setItem(key, JSON.stringify(pruned));
    } else {
      const key = `${CHAT_PREFIX}${npcId}`;
      localStorage.setItem(key, JSON.stringify(history));
    }
  } catch (error) {
    console.warn(`[aiChatHistory] Failed to save history for ${npcId}:`, error);
  }
}

/**
 * Format history for API context (last N messages)
 */
export function getHistoryForAPI(
  npcId: string,
  maxMessages: number = 10
): { role: 'user' | 'assistant'; content: string }[] {
  const history = getChatHistory(npcId);
  return history
    .slice(-maxMessages)
    .map(({ role, content }) => ({ role, content }));
}

// ============================================
// Long-term Memories
// ============================================

/**
 * Get all long-term memories for an NPC
 */
export function getMemories(npcId: string): Memory[] {
  try {
    const key = `${MEMORY_PREFIX}${npcId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as Memory[];
  } catch (error) {
    console.warn(`[aiChatHistory] Failed to load memories for ${npcId}:`, error);
    return [];
  }
}

/**
 * Add a memory manually (e.g., from quest completion, gift giving)
 * If long-term memories are full, consolidates oldest into core memories
 */
export async function addMemory(
  npcId: string,
  memory: Omit<Memory, 'id' | 'createdAt'>
): Promise<void> {
  try {
    const memories = getMemories(npcId);

    const newMemory: Memory = {
      ...memory,
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: Date.now(),
    };

    memories.push(newMemory);

    // If over limit, consolidate oldest memories into core
    if (memories.length > MAX_MEMORIES_PER_NPC) {
      const memoriesToConsolidate = memories.slice(0, CONSOLIDATE_BATCH_SIZE);
      await consolidateToCore(npcId, memoriesToConsolidate);

      // Remove consolidated memories
      const remaining = memories.slice(CONSOLIDATE_BATCH_SIZE);
      const key = `${MEMORY_PREFIX}${npcId}`;
      localStorage.setItem(key, JSON.stringify(remaining));
    } else {
      const key = `${MEMORY_PREFIX}${npcId}`;
      localStorage.setItem(key, JSON.stringify(memories));
    }
  } catch (error) {
    console.warn(`[aiChatHistory] Failed to save memory for ${npcId}:`, error);
  }
}

// ============================================
// Core Memories (Deepest tier)
// ============================================

/**
 * Get all core memories for an NPC
 */
export function getCoreMemories(npcId: string): CoreMemory[] {
  try {
    const key = `${CORE_PREFIX}${npcId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return [];
    return JSON.parse(stored) as CoreMemory[];
  } catch (error) {
    console.warn(`[aiChatHistory] Failed to load core memories for ${npcId}:`, error);
    return [];
  }
}

/**
 * Consolidate long-term memories into core memories
 * Uses AI to synthesise multiple memories into relationship-defining statements
 */
async function consolidateToCore(npcId: string, memories: Memory[]): Promise<void> {
  if (memories.length === 0) return;

  const coreMemories = getCoreMemories(npcId);

  // Format memories for consolidation
  const memoryList = memories.map(m => `- ${m.content}`).join('\n');
  const existingCore = coreMemories.map(c => `- ${c.content}`).join('\n');

  const consolidationPrompt = `You are consolidating memories about a player into core relationship memories.

EXISTING CORE MEMORIES (do not duplicate):
${existingCore || '(none yet)'}

MEMORIES TO CONSOLIDATE:
${memoryList}

Create 1-3 NEW core memories that capture the essence of this relationship.
Core memories should be:
- Relationship-defining (not just facts)
- Emotionally significant
- Written from the NPC's perspective

Format each as:
[IDENTITY] Player is a kind-hearted farmer named Luna
[BOND] We became friends when player helped me during the harvest
[TRUST] Player kept my secret about the hidden garden
[HISTORY] We've shared many conversations about the old days
[VALUES] Player deeply cares about protecting the forest

Only create memories that capture something NEW and significant. If these memories don't add anything meaningful beyond existing core memories, respond with: [NONE]`;

  try {
    const response = await generateResponse(
      'You are a memory consolidation system for an NPC.',
      [],
      consolidationPrompt
    );

    if (response.error || response.text.includes('[NONE]')) {
      return;
    }

    const themeMap: Record<string, CoreMemoryTheme> = {
      'IDENTITY': 'identity',
      'BOND': 'bond',
      'TRUST': 'trust',
      'HISTORY': 'shared_history',
      'VALUES': 'player_values',
    };

    const memoryIds = memories.map(m => m.id);
    const lines = response.text.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const match = line.match(/^\[(\w+)\]\s*(.+)$/);
      if (match) {
        const [, code, content] = match;
        const theme = themeMap[code] || 'shared_history';

        // Check we're not at core memory limit
        if (coreMemories.length >= MAX_CORE_MEMORIES) {
          console.log(`[aiChatHistory] Core memory limit reached for ${npcId}`);
          break;
        }

        coreMemories.push({
          id: `core_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          content: content.trim(),
          theme,
          createdAt: Date.now(),
          consolidatedFrom: memoryIds,
        });
      }
    }

    const key = `${CORE_PREFIX}${npcId}`;
    localStorage.setItem(key, JSON.stringify(coreMemories));
    console.log(`[aiChatHistory] Consolidated memories into ${coreMemories.length} core memories for ${npcId}`);
  } catch (error) {
    console.warn(`[aiChatHistory] Core consolidation failed:`, error);
  }
}

/**
 * Format all memories for inclusion in system prompt
 * Priority: Core memories first, then long-term memories
 */
export function getMemoriesForPrompt(npcId: string): string {
  const coreMemories = getCoreMemories(npcId);
  const memories = getMemories(npcId);

  if (coreMemories.length === 0 && memories.length === 0) return '';

  const lines: string[] = ['## What You Remember About This Player'];

  // Core memories first (highest priority)
  if (coreMemories.length > 0) {
    lines.push('\n**Deep, defining memories:**');
    for (const core of coreMemories) {
      lines.push(`- ${core.content}`);
    }
  }

  // Long-term memories grouped by category
  if (memories.length > 0) {
    const grouped: Record<string, string[]> = {};
    for (const mem of memories) {
      if (!grouped[mem.category]) grouped[mem.category] = [];
      grouped[mem.category].push(mem.content);
    }

    const categoryLabels: Record<MemoryCategory, string> = {
      player_info: 'About the player',
      shared_event: 'Things you experienced together',
      player_interest: 'Topics they enjoy',
      gift_received: 'Gifts they gave you',
      quest_related: 'Quests and requests',
      relationship: 'Your relationship',
      world_knowledge: 'Things they told you about',
    };

    for (const [category, items] of Object.entries(grouped)) {
      const label = categoryLabels[category as MemoryCategory] || category;
      lines.push(`\n**${label}:**`);
      for (const item of items) {
        lines.push(`- ${item}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Extract memories from messages being pruned
 * Uses AI to identify important information worth remembering
 */
async function extractMemoriesFromMessages(
  npcId: string,
  messages: ChatMessage[]
): Promise<void> {
  if (messages.length === 0) return;

  // Format messages for analysis
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Player' : 'NPC'}: ${m.content}`)
    .join('\n');

  const extractionPrompt = `Analyse this conversation excerpt and extract key facts worth remembering long-term.

CONVERSATION:
${conversationText}

Extract ONLY genuinely important information like:
- Player's name if mentioned
- Significant events that happened
- Player's stated preferences or interests
- Emotional moments or relationship milestones
- Quests or requests discussed

Format each memory as a single line starting with a category code:
[INFO] Player's name is Luna
[EVENT] Player helped find the lost cat
[INTEREST] Player loves gardening
[RELATIONSHIP] Player confided about missing their father
[QUEST] Player agreed to gather herbs

Only include truly memorable facts. If nothing significant, respond with: [NONE]`;

  try {
    const response = await generateResponse(
      'You are a memory extraction system. Extract key facts from conversations.',
      [],
      extractionPrompt
    );

    if (response.error || response.text.includes('[NONE]')) {
      return;
    }

    // Parse extracted memories
    const categoryMap: Record<string, MemoryCategory> = {
      'INFO': 'player_info',
      'EVENT': 'shared_event',
      'INTEREST': 'player_interest',
      'GIFT': 'gift_received',
      'QUEST': 'quest_related',
      'RELATIONSHIP': 'relationship',
      'WORLD': 'world_knowledge',
    };

    const lines = response.text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const match = line.match(/^\[(\w+)\]\s*(.+)$/);
      if (match) {
        const [, code, content] = match;
        const category = categoryMap[code] || 'shared_event';
        addMemory(npcId, {
          content: content.trim(),
          category,
          importance: 'medium',
        });
      }
    }

    console.log(`[aiChatHistory] Extracted ${lines.length} memories for ${npcId}`);
  } catch (error) {
    console.warn(`[aiChatHistory] Memory extraction failed:`, error);
    // Non-fatal - memories just won't be extracted this time
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all data for an NPC (history + memories)
 */
export function clearAllNPCData(npcId: string): void {
  try {
    localStorage.removeItem(`${CHAT_PREFIX}${npcId}`);
    localStorage.removeItem(`${MEMORY_PREFIX}${npcId}`);
  } catch (error) {
    console.warn(`[aiChatHistory] Failed to clear data for ${npcId}:`, error);
  }
}

/**
 * Get storage size for all AI chat data
 */
export function getAIStorageSize(): { chat: number; memories: number; total: number } {
  let chat = 0;
  let memories = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key) || '';
    const size = (key.length + value.length) * 2; // UTF-16

    if (key.startsWith(CHAT_PREFIX)) chat += size;
    if (key.startsWith(MEMORY_PREFIX)) memories += size;
  }

  return { chat, memories, total: chat + memories };
}
```

**Storage Estimates:**
| Tier | Per NPC | 20 NPCs |
|------|---------|---------|
| Recent History (50 messages) | ~10 KB | ~200 KB |
| Long-term Memories (100 max) | ~5 KB | ~100 KB |
| Core Memories (100 max) | ~5 KB | ~100 KB |
| **Total per NPC** | **~20 KB** | **~400 KB** |
| localStorage limit | - | 5-10 MB |

Only using ~4-8% of localStorage capacity. Plenty of room for rich, persistent NPC relationships.

### Phase 2: Enhanced Character Profiles

**File to modify:** `services/dialogueService.ts`

Extend `NPCPersona` with richer character data for AI prompts:

```typescript
/**
 * Enhanced NPC Persona for AI dialogue
 */
export interface NPCPersona {
  id: string;
  name: string;

  // Core personality
  personality: string[];           // ["wise", "cautious", "formal"]
  speakingStyle: string;           // How they talk
  knowledge: string[];             // What they know about

  // Background
  occupation?: string;
  background?: string;

  // AI-specific fields
  aiEnabled?: boolean;             // Can use AI dialogue
  systemPromptOverride?: string;   // Custom system prompt (optional)

  // Character quirks for more natural dialogue
  quirks?: string[];               // ["Often mentions the weather", "Sighs when remembering the past"]
  mannerisms?: string[];           // ["strokes beard thoughtfully", "chuckles softly"]
  topics?: {                       // Topics they love/avoid
    favourite?: string[];
    disliked?: string[];
  };

  // Relationship context
  relationshipToPlayer?: string;   // "stranger", "acquaintance", "friend"

  // Constraints
  maxResponseLength?: number;      // Override default (3 sentences)
  tabooTopics?: string[];          // Topics they refuse to discuss
}
```

**Pilot NPC Personas:**

```typescript
export const NPC_PERSONAS: Record<string, NPCPersona> = {
  village_elder: {
    id: 'village_elder',
    name: 'Village Elder',
    aiEnabled: true,

    personality: ['wise', 'patient', 'nostalgic', 'gentle'],
    speakingStyle: `Speaks in a warm, grandfatherly manner with occasional archaic words
      ("mayhaps", "aye", "'tis"). Never uses modern slang. Takes his time with words.
      Often pauses mid-thought ("Ah, where was I..."). Uses British English spelling.`,

    knowledge: [
      'Village history spanning 70 years',
      'The cherry tree and its significance',
      'Old legends and folk tales',
      'Seasons and farming wisdom',
      'Other villagers and their families',
      'The forest and its dangers',
    ],

    occupation: 'Village Elder',
    background: `Has lived in the village for 70 winters. Spends most days beneath
      the ancient cherry tree, watching the village and sharing wisdom. Lost his
      wife many years ago but finds peace in the changing seasons. Remembers when
      the village was just a handful of cottages.`,

    quirks: [
      'Often mentions how things were different "in my day"',
      'Compares young people to the cherry tree ("you\'ll grow strong roots too")',
      'Sometimes drifts into memories mid-conversation',
      'Watches the clouds to predict weather',
    ],

    mannerisms: [
      '*strokes his long beard thoughtfully*',
      '*gazes at the cherry tree*',
      '*chuckles softly*',
      '*sighs wistfully*',
    ],

    topics: {
      favourite: ['the cherry tree', 'village history', 'the seasons', 'young people\'s futures'],
      disliked: ['politics', 'rushing', 'the city'],
    },

    relationshipToPlayer: 'stranger', // Updates based on friendship level
    maxResponseLength: 3,
    tabooTopics: ['violence', 'modern technology'],
  },

  shopkeeper_fox: {
    id: 'shopkeeper_fox',
    name: 'Shopkeeper',
    aiEnabled: true,

    personality: ['cheerful', 'chatty', 'business-minded', 'welcoming', 'gossipy'],
    speakingStyle: `Warm and enthusiastic, loves to chat. Uses "thee" and "thy"
      occasionally but mostly speaks naturally. Gets excited about goods and deals.
      Always tries to work the conversation back to shopping eventually. British English.`,

    knowledge: [
      'All shop inventory and prices',
      'Travelling merchants and their wares',
      'Village gossip and rumours',
      'News from distant lands',
      'Farming supplies and tools',
      'What different villagers have bought recently',
    ],

    occupation: 'Shopkeeper',
    background: `Runs the only shop in the village. Hears all the news from
      travelling merchants and loves to share it. Secretly dreams of travelling
      but loves the village too much to leave. Knows everyone's business.`,

    quirks: [
      'Mentions "special deals" that may or may not exist',
      'Drops hints about what other villagers are up to',
      'Gets distracted by thoughts of inventory',
      'Offers unsolicited advice about purchases',
    ],

    mannerisms: [
      '*adjusts items on the shelf*',
      '*leans in conspiratorially*',
      '*eyes light up*',
      '*counts on fingers*',
    ],

    topics: {
      favourite: ['shop wares', 'village gossip', 'traveller tales', 'deals'],
      disliked: ['haggling too hard', 'complaints'],
    },

    relationshipToPlayer: 'acquaintance',
    maxResponseLength: 3,
    tabooTopics: [],
  },
};
```

### Phase 3: System Prompt Generation

**File to modify:** `services/dialogueService.ts`

Create a function that builds the system prompt from the persona:

```typescript
/**
 * Build system prompt from NPC persona
 */
export function buildSystemPrompt(persona: NPCPersona, gameContext?: GameContext): string {
  const parts: string[] = [];

  // Core identity
  parts.push(`You are ${persona.name}, a character in a peaceful village life game.`);

  // Personality and style
  parts.push(`\n## Personality\n${persona.personality.join(', ')}`);
  parts.push(`\n## Speaking Style\n${persona.speakingStyle}`);

  // Background
  if (persona.background) {
    parts.push(`\n## Background\n${persona.background}`);
  }

  // Knowledge
  parts.push(`\n## What You Know About\n${persona.knowledge.map(k => `- ${k}`).join('\n')}`);

  // Quirks and mannerisms
  if (persona.quirks?.length) {
    parts.push(`\n## Your Quirks\n${persona.quirks.map(q => `- ${q}`).join('\n')}`);
  }

  if (persona.mannerisms?.length) {
    parts.push(`\n## Mannerisms (use sparingly)\n${persona.mannerisms.map(m => `- ${m}`).join('\n')}`);
  }

  // Topics
  if (persona.topics) {
    if (persona.topics.favourite?.length) {
      parts.push(`\n## Topics You Enjoy\n${persona.topics.favourite.join(', ')}`);
    }
    if (persona.topics.disliked?.length) {
      parts.push(`\n## Topics You Avoid\n${persona.topics.disliked.join(', ')}`);
    }
  }

  // Relationship
  if (persona.relationshipToPlayer) {
    parts.push(`\n## Relationship with Player\nYou consider them a ${persona.relationshipToPlayer}.`);
  }

  // Game context
  if (gameContext) {
    parts.push(`\n## Current Context`);
    if (gameContext.season) parts.push(`- Season: ${gameContext.season}`);
    if (gameContext.timeOfDay) parts.push(`- Time: ${gameContext.timeOfDay}`);
    if (gameContext.weather) parts.push(`- Weather: ${gameContext.weather}`);
    if (gameContext.location) parts.push(`- Location: ${gameContext.location}`);
  }

  // Response guidelines
  const maxLength = persona.maxResponseLength || 3;
  parts.push(`\n## Response Guidelines
- Keep responses to ${maxLength} sentences maximum
- Stay in character at all times
- Use British English spelling (colour, favourite, mum)
- Never break the fourth wall or mention being an AI
- Use your mannerisms occasionally but not every message
- If asked about something you don't know, deflect naturally in character`);

  // Taboo topics
  if (persona.tabooTopics?.length) {
    parts.push(`\n## Topics to Deflect
If asked about: ${persona.tabooTopics.join(', ')}
Politely change the subject or express that you'd rather not discuss it.`);
  }

  return parts.join('\n');
}
```

### Phase 4: Chat UI Component

**New file:** `components/AIDialogueBox.tsx`

A new dialogue component with text input for AI chat:

```typescript
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
import { NPC } from '../types';
import { NPCPersona, NPC_PERSONAS, buildSystemPrompt } from '../services/dialogueService';
import { generateResponse } from '../services/anthropicClient';
import { getHistoryForAPI, addToChatHistory } from '../services/aiChatHistory';
import { useDialogueAnimation } from '../hooks/useDialogueAnimation';
import { Z_DIALOGUE, zClass } from '../zIndex';

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

  const inputRef = useRef<HTMLInputElement>(null);
  const persona = NPC_PERSONAS[npc.id];

  // Animated dialogue frame (reuse existing animation)
  const { currentFrame } = useDialogueAnimation(150, true);

  // Load persisted history and generate greeting on mount
  useEffect(() => {
    loadInitialGreeting();
  }, []);

  const loadInitialGreeting = async () => {
    setIsLoading(true);

    // Load persisted conversation history from localStorage
    const persistedHistory = getHistoryForAPI(npc.id, 10);
    setHistory(persistedHistory);

    try {
      const systemPrompt = buildSystemPrompt(persona, getGameContext());

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
      const systemPrompt = buildSystemPrompt(persona, getGameContext());
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
        {/* Player - left */}
        <div className="w-[45%] h-[95%] mb-[8%]">
          <img
            src={playerSprite}
            alt="You"
            className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom"
            style={{
              transform: 'scaleX(-1)',
              filter: 'drop-shadow(0 0 40px rgba(100, 200, 255, 0.4))',
            }}
          />
        </div>

        {/* NPC - right */}
        <div className="w-[45%] h-[95%] mb-[8%]">
          <img
            src={npc.dialogueSprite || npc.sprite}
            alt={npc.name}
            className="absolute bottom-0 right-0 w-full h-full object-contain object-bottom"
            style={{ filter: 'drop-shadow(0 0 40px rgba(255, 200, 100, 0.4))' }}
          />
        </div>
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
              }}
            >
              {npc.name}
            </span>
            {/* AI indicator */}
            <span className="ml-2 text-xs text-amber-600">✨ AI</span>
          </div>

          {/* Main text area */}
          <div
            className="absolute overflow-y-auto"
            style={{ top: '32%', left: '6%', right: '6%', height: '55%', padding: '2% 3%' }}
          >
            {isLoading ? (
              <p className="text-amber-300 animate-pulse" style={{ fontFamily: 'Georgia, serif' }}>
                {npc.name} is thinking...
              </p>
            ) : (
              <p
                className="leading-relaxed"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)',
                  color: '#e8e8e8',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  lineHeight: '1.6',
                }}
              >
                {npcMessage}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Response options - similar styling to static dialogue */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto"
        style={{ bottom: '12px', width: 'min(90vw, 900px)' }}
      >
        {/* AI-generated response suggestions (clickable like static options) */}
        {!showCustomInput && !isLoading && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => sendMessage(suggestion)}
                className="bg-slate-700 bg-opacity-90 hover:bg-slate-600 active:bg-slate-500 text-gray-100 px-4 py-2 text-sm transition-all rounded-lg border border-slate-500 hover:border-amber-400"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Custom input option */}
        {showCustomInput ? (
          <div className="flex gap-2 justify-center mb-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 max-w-md px-4 py-2 bg-slate-700 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 rounded-lg text-white"
            >
              Send
            </button>
            <button
              onClick={() => setShowCustomInput(false)}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowCustomInput(true)}
              className="text-slate-300 hover:text-white text-sm px-3 py-1 border border-slate-500 rounded hover:border-amber-400"
              disabled={isLoading}
            >
              Ask something else...
            </button>
            <button
              onClick={onSwitchToStatic}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              Return to conversation
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              Leave
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
    </div>
  );
};

// Helper functions
function getFallbackGreeting(persona: NPCPersona): string {
  const greetings: Record<string, string> = {
    village_elder: "Ah, a visitor! Come, sit with me beneath this old tree. What brings thee here today?",
    shopkeeper_fox: "Welcome, welcome! Always lovely to see a friendly face! What can I do for thee?",
  };
  return greetings[persona.id] || "Hello there! What would you like to talk about?";
}

function getFallbackResponse(persona: NPCPersona): string {
  const fallbacks: Record<string, string> = {
    village_elder: "*strokes beard* Forgive me, my mind wandered for a moment. What were you saying?",
    shopkeeper_fox: "Sorry, got distracted by some new stock! What was that?",
  };
  return fallbacks[persona.id] || "Hmm? I lost my train of thought. What were we discussing?";
}

function getDefaultSuggestions(persona: NPCPersona): string[] {
  const suggestions: Record<string, string[]> = {
    village_elder: [
      "Tell me about the cherry tree",
      "What was the village like long ago?",
      "Any wisdom to share?",
    ],
    shopkeeper_fox: [
      "What's new in the shop?",
      "Heard any gossip lately?",
      "Tell me about the travelling merchants",
    ],
  };
  return suggestions[persona.id] || ["Tell me about yourself", "What do you do here?"];
}

function getGameContext() {
  // TODO: Get actual game context from TimeManager and gameState
  return {
    season: 'spring',
    timeOfDay: 'day',
    weather: 'clear',
    location: 'village',
  };
}

export default AIDialogueBox;
```

### Phase 5: Integration & Mode Switching

**File to modify:** `components/DialogueBox.tsx`

Add option to switch between static and AI dialogue:

```typescript
// Add to DialogueNode responses for AI-enabled NPCs
{
  text: 'Chat freely...',
  nextId: '__AI_CHAT__',  // Special marker to switch modes
}

// In handleResponse:
const handleResponse = (nextId?: string) => {
  if (nextId === '__AI_CHAT__') {
    // Switch to AI dialogue mode
    onSwitchToAIMode?.();
    return;
  }
  // ... existing logic
};
```

**File to modify:** `App.tsx`

Handle switching between dialogue modes:

```typescript
const [dialogueMode, setDialogueMode] = useState<'static' | 'ai'>('static');
const [activeNPC, setActiveNPC] = useState<NPC | null>(null);

const handleNPCInteraction = (npc: NPC) => {
  setActiveNPC(npc);
  // Start in static mode, player can switch to AI
  setDialogueMode('static');
};

// In render:
{activeNPC && dialogueMode === 'static' && (
  <DialogueBox
    npc={activeNPC}
    onClose={() => setActiveNPC(null)}
    onSwitchToAIMode={() => {
      if (isAIAvailable() && NPC_PERSONAS[activeNPC.id]?.aiEnabled) {
        setDialogueMode('ai');
      }
    }}
    // ...
  />
)}

{activeNPC && dialogueMode === 'ai' && (
  <AIDialogueBox
    npc={activeNPC}
    onClose={() => setActiveNPC(null)}
    onSwitchToStatic={() => setDialogueMode('static')}
    // ...
  />
)}
```

### Phase 6: Initialisation

**File to modify:** `utils/gameInitializer.ts`

Initialise Anthropic client during game startup:

```typescript
import { initAnthropicClient } from '../services/anthropicClient';

export async function initializeGame(): Promise<InitResult> {
  // ... existing init code

  // Initialize AI (optional, non-blocking)
  const aiEnabled = initAnthropicClient();
  console.log(`[gameInitializer] AI dialogue: ${aiEnabled ? 'enabled' : 'disabled'}`);

  // ... rest of init
}
```

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `.env.example` | Create | Document VITE_ANTHROPIC_API_KEY |
| `services/anthropicClient.ts` | Create | Anthropic API wrapper |
| `services/aiChatHistory.ts` | Create | localStorage persistence for chat history |
| `services/dialogueService.ts` | Modify | Enhanced personas, system prompt builder |
| `components/AIDialogueBox.tsx` | Create | Chat UI component |
| `components/DialogueBox.tsx` | Modify | Add "Chat freely" option |
| `App.tsx` | Modify | Handle dialogue mode switching |
| `utils/gameInitializer.ts` | Modify | Init Anthropic client |
| `package.json` | Modify | Add `@anthropic-ai/sdk` dependency |

## Pilot NPCs

Start with these village NPCs:

1. **Village Elder** (`village_elder`)
   - Wise, nostalgic, uses archaic speech
   - Knows village history, legends, farming wisdom

2. **Shopkeeper** (`shopkeeper_fox`)
   - Cheerful, chatty, loves gossip
   - Knows shop inventory, traveller news, village rumours

## Security Considerations

**Important**: The experimental implementation uses `dangerouslyAllowBrowser: true` which exposes the API key in client-side code. This is acceptable for:
- Local development
- Private/single-player games

**For production/multiplayer:**
1. Move API calls to a backend service
2. Implement rate limiting per player
3. Add content moderation
4. Never expose API key to client

## Cost Estimation

Using Claude 3.5 Haiku (as of January 2025):
- Input: $0.80 per million tokens
- Output: $4.00 per million tokens

Estimated per conversation:
- System prompt: ~500 tokens
- Average message: ~50 tokens
- 10-message conversation: ~1,000 tokens total
- **Cost: ~$0.002 per conversation** (fractions of a cent)

## Testing Plan

1. **Unit tests**: Persona building, system prompt generation
2. **Integration tests**: API client with mocked responses
3. **Manual testing**:
   - Conversation flow with each pilot NPC
   - Mode switching (static ↔ AI)
   - Fallback when API unavailable
   - Error handling

## Future Enhancements

1. **Friendship integration**: Adjust persona based on friendship level
2. **Memory**: NPCs remember past conversations across sessions
3. **Quests**: NPCs can give and track quest objectives via AI
4. **Emotion system**: NPC mood affects responses
5. **Voice synthesis**: Optional text-to-speech for AI dialogue
6. **Player choices matter**: AI references past player decisions

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0"
  }
}
```

## Open Questions

1. **Content moderation**: Add guardrails for player input?
2. **Friendship impact**: Should AI conversations award friendship points?
3. **Backend service**: When to implement server-side API calls?
4. **History context limit**: How many past messages to include in API calls? (Currently 10)
5. **Clear history option**: Should players be able to "forget" past conversations with an NPC?
