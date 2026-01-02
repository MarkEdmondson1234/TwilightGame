/**
 * AI Chat History & Memory System
 *
 * Three-tier memory architecture:
 * 1. Recent History (50 messages) - Full conversation log, pruned when limit reached
 * 2. Long-term Memories (100 max) - Key facts extracted when messages are pruned
 * 3. Core Memories (100 max) - Relationship-defining moments, consolidated from long-term
 *
 * Storage format:
 * - 'ai_chat_{npcId}' - Recent message history
 * - 'ai_memory_{npcId}' - Long-term memories
 * - 'ai_core_{npcId}' - Core memories
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
    localStorage.removeItem(`${CORE_PREFIX}${npcId}`);
  } catch (error) {
    console.warn(`[aiChatHistory] Failed to clear data for ${npcId}:`, error);
  }
}

/**
 * Get storage size for all AI chat data
 */
export function getAIStorageSize(): { chat: number; memories: number; core: number; total: number } {
  let chat = 0;
  let memories = 0;
  let core = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key) || '';
    const size = (key.length + value.length) * 2; // UTF-16

    if (key.startsWith(CHAT_PREFIX)) chat += size;
    if (key.startsWith(MEMORY_PREFIX)) memories += size;
    if (key.startsWith(CORE_PREFIX)) core += size;
  }

  return { chat, memories, core, total: chat + memories + core };
}
