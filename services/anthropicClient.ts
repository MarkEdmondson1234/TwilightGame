/**
 * Anthropic API Client
 *
 * Uses Haiku model for fast, cost-effective NPC dialogue.
 * Falls back gracefully if API key is not configured.
 *
 * API Key: User-provided via in-game Settings (F1 → Settings tab)
 * Stored in localStorage for persistence across sessions.
 */

import Anthropic from '@anthropic-ai/sdk';

const HAIKU_MODEL = 'claude-3-5-haiku-20241022';
const MAX_TOKENS = 150; // Keep responses short
const STORAGE_KEY = 'twilight_anthropic_api_key';

interface AIResponse {
  text: string;                    // NPC's response
  suggestions: string[];           // 2-4 suggested player responses
  error?: string;
}

let client: Anthropic | null = null;

/**
 * Get API key from localStorage
 */
export function getStoredApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store API key in localStorage
 */
export function setStoredApiKey(apiKey: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, apiKey);
    console.log('[AI] API key stored in localStorage');
  } catch (error) {
    console.error('[AI] Failed to store API key:', error);
  }
}

/**
 * Remove API key from localStorage
 */
export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[AI] API key removed from localStorage');
  } catch (error) {
    console.error('[AI] Failed to clear API key:', error);
  }
}

/**
 * Reinitialize the client (call after changing API key)
 * Returns true if client was successfully initialized
 */
export function reinitializeClient(): boolean {
  client = null;
  return initAnthropicClient();
}

/**
 * Initialize the Anthropic client
 * Uses API key from localStorage (set via F1 → Settings)
 * Returns false if no API key is available
 */
export function initAnthropicClient(): boolean {
  const apiKey = getStoredApiKey();

  if (!apiKey) {
    console.info('[AI] No API key configured - add one via F1 → Settings');
    return false;
  }

  // User-provided key from in-game settings
  // dangerouslyAllowBrowser is acceptable since it's the user's own key
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
