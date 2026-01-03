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

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 400; // Structured JSON output
const STORAGE_KEY = 'twilight_anthropic_api_key';
const STRUCTURED_OUTPUTS_BETA = 'structured-outputs-2025-11-13';

/**
 * NPC emotion states for expression changes during dialogue
 */
export type NPCEmotion =
  | 'neutral'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'angry'
  | 'thoughtful'
  | 'worried'
  | 'excited'
  | 'embarrassed'
  | 'loving';

/**
 * Structured AI response with moderation, emotions, and actions
 */
export interface StructuredAIResponse {
  // Content moderation (0-10 scale)
  moderationScore: number;         // 0 = perfectly fine, 10 = extremely inappropriate
  moderationReason?: string;       // Why the score was given (for inappropriate content)
  shouldSendToBed: boolean;        // True if player was rude enough to warrant consequences

  // NPC response components
  dialogue: string;                // The spoken text (without action markers)
  action?: string;                 // Physical action like "stirs the cauldron"
  emotion: NPCEmotion;             // Current emotional state for expression

  // Response options for player
  suggestions: string[];           // 2-4 suggested follow-up responses

  // Error handling
  error?: string;
}

// Legacy interface for backward compatibility
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

/**
 * JSON Schema for structured NPC response output
 * Used with Anthropic's native structured outputs feature
 */
const NPC_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    moderationScore: {
      type: 'integer',
      description: 'Rate the PLAYER message appropriateness: 0-2 polite, 3-4 slightly rude, 5-6 noticeably rude, 7-8 very rude/inappropriate for children, 9-10 extremely inappropriate (swearing, threats)',
    },
    moderationReason: {
      type: 'string',
      description: 'Brief explanation if moderationScore >= 5, otherwise null',
    },
    shouldSendToBed: {
      type: 'boolean',
      description: 'True ONLY if moderationScore >= 7. If true, dialogue should be a brief scolding.',
    },
    dialogue: {
      type: 'string',
      description: 'ONLY your spoken words - no actions, no asterisks, no *gestures*. Just what you say out loud.',
    },
    action: {
      type: 'string',
      description: 'Optional physical gesture (displayed separately). No asterisks needed, e.g. "strokes beard thoughtfully", "stirs the cauldron". Null if no action.',
    },
    emotion: {
      type: 'string',
      enum: ['neutral', 'happy', 'sad', 'surprised', 'angry', 'thoughtful', 'worried', 'excited', 'embarrassed', 'loving'],
      description: 'Your current emotional state for expression display',
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
      description: '2-4 natural follow-up responses the player might say. Always include one farewell option.',
    },
  },
  required: ['moderationScore', 'shouldSendToBed', 'dialogue', 'emotion', 'suggestions'],
  additionalProperties: false,
} as const;

/**
 * Default fallback response when AI fails
 */
function getDefaultStructuredResponse(): StructuredAIResponse {
  return {
    moderationScore: 0,
    shouldSendToBed: false,
    dialogue: "Hmm? I lost my train of thought. What were we discussing?",
    emotion: 'neutral',
    suggestions: ["Tell me about yourself", "What do you do here?", "I must go"],
  };
}

/**
 * Generate AI dialogue with native structured output
 * Uses Anthropic's structured outputs beta for guaranteed JSON schema compliance
 */
export async function generateStructuredResponse(
  systemPrompt: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string
): Promise<StructuredAIResponse> {
  if (!client) {
    return { ...getDefaultStructuredResponse(), error: 'AI not available' };
  }

  try {
    const messages = [
      ...conversationHistory,
      { role: 'user' as const, content: userMessage },
    ];

    // Use beta API with native structured output
    const response = await client.beta.messages.create({
      model: HAIKU_MODEL,
      max_tokens: MAX_TOKENS,
      betas: [STRUCTURED_OUTPUTS_BETA],
      system: systemPrompt,
      messages,
      output_format: {
        type: 'json_schema',
        schema: NPC_RESPONSE_SCHEMA,
      },
    });

    const textContent = response.content.find(c => c.type === 'text');
    const fullText = textContent?.text || '';

    // Parse the guaranteed-valid JSON response
    try {
      const parsed = JSON.parse(fullText);

      // Build response (schema guarantees structure, but we still sanitize)
      const result: StructuredAIResponse = {
        moderationScore: Math.max(0, Math.min(10, parsed.moderationScore ?? 0)),
        moderationReason: parsed.moderationReason || undefined,
        shouldSendToBed: parsed.shouldSendToBed === true,
        dialogue: parsed.dialogue || '',
        action: parsed.action || undefined,
        emotion: isValidEmotion(parsed.emotion) ? parsed.emotion : 'neutral',
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.slice(0, 4)
          : [],
      };

      // Ensure at least one suggestion
      if (result.suggestions.length === 0) {
        result.suggestions = ["Tell me more", "I should go"];
      }

      return result;
    } catch (parseError) {
      console.warn('[AI] Failed to parse structured response:', parseError, fullText);
      return getDefaultStructuredResponse();
    }
  } catch (error) {
    console.error('[AI] API error:', error);
    return {
      ...getDefaultStructuredResponse(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Type guard for valid emotions
 */
function isValidEmotion(emotion: unknown): emotion is NPCEmotion {
  const validEmotions: NPCEmotion[] = [
    'neutral', 'happy', 'sad', 'surprised', 'angry',
    'thoughtful', 'worried', 'excited', 'embarrassed', 'loving'
  ];
  return typeof emotion === 'string' && validEmotions.includes(emotion as NPCEmotion);
}
