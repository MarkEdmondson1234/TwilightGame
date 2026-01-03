/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Anthropic SDK before importing the module
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    beta: {
      messages: {
        create: mockCreate,
      },
    },
    messages: {
      create: mockCreate,
    },
  })),
}));

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import after mocks are set up
import {
  generateStructuredResponse,
  initAnthropicClient,
  setStoredApiKey,
  clearStoredApiKey,
  getStoredApiKey,
  isAIAvailable,
  reinitializeClient,
  type StructuredAIResponse,
  type NPCEmotion,
} from '../services/anthropicClient';

describe('anthropicClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    clearStoredApiKey();
  });

  describe('API key management', () => {
    it('should store and retrieve API key', () => {
      setStoredApiKey('test-key-123');
      expect(getStoredApiKey()).toBe('test-key-123');
    });

    it('should clear API key', () => {
      setStoredApiKey('test-key-123');
      clearStoredApiKey();
      expect(getStoredApiKey()).toBeNull();
    });

    it('should return null when no API key stored', () => {
      expect(getStoredApiKey()).toBeNull();
    });
  });

  describe('client initialization', () => {
    it('should return false when no API key is configured', () => {
      const result = initAnthropicClient();
      expect(result).toBe(false);
      expect(isAIAvailable()).toBe(false);
    });

    it('should return true when API key is configured', () => {
      setStoredApiKey('test-api-key');
      const result = initAnthropicClient();
      expect(result).toBe(true);
      expect(isAIAvailable()).toBe(true);
    });

    it('should reinitialize client', () => {
      setStoredApiKey('test-api-key');
      initAnthropicClient();
      expect(isAIAvailable()).toBe(true);

      clearStoredApiKey();
      const result = reinitializeClient();
      expect(result).toBe(false);
      expect(isAIAvailable()).toBe(false);
    });
  });

  describe('generateStructuredResponse', () => {
    beforeEach(() => {
      setStoredApiKey('test-api-key');
      initAnthropicClient();
    });

    it('should return error when client not initialized', async () => {
      clearStoredApiKey();
      reinitializeClient();

      const result = await generateStructuredResponse(
        'Test system prompt',
        [],
        'Hello'
      );

      expect(result.error).toBe('AI not available');
      expect(result.dialogue).toBe("Hmm? I lost my train of thought. What were we discussing?");
    });

    it('should parse valid structured response', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "Hello, traveller! Welcome to our village.",
        action: "waves warmly",
        emotion: "happy",
        suggestions: ["Tell me about the village", "What's your name?", "Farewell"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await generateStructuredResponse(
        'You are a friendly villager',
        [],
        'Hello!'
      );

      expect(result.dialogue).toBe("Hello, traveller! Welcome to our village.");
      expect(result.action).toBe("waves warmly");
      expect(result.emotion).toBe("happy");
      expect(result.moderationScore).toBe(0);
      expect(result.shouldSendToBed).toBe(false);
      expect(result.suggestions).toHaveLength(3);
      expect(result.error).toBeUndefined();
    });

    it('should handle moderation - rude message', async () => {
      const mockResponse = {
        moderationScore: 8,
        moderationReason: "Rude language used",
        shouldSendToBed: true,
        dialogue: "That is no way to speak to an elder! Off to bed with you!",
        action: "looks disappointed",
        emotion: "angry",
        suggestions: [],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await generateStructuredResponse(
        'You are the village elder',
        [],
        'You are stupid!'
      );

      expect(result.moderationScore).toBe(8);
      expect(result.shouldSendToBed).toBe(true);
      expect(result.moderationReason).toBe("Rude language used");
      expect(result.emotion).toBe("angry");
    });

    it('should clamp moderation score to 0-10 range', async () => {
      const mockResponse = {
        moderationScore: 15, // Out of range
        shouldSendToBed: false,
        dialogue: "Hello!",
        emotion: "neutral",
        suggestions: ["Hi"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await generateStructuredResponse(
        'Test prompt',
        [],
        'Hello'
      );

      expect(result.moderationScore).toBe(10); // Should be clamped to max
    });

    it('should handle all valid emotions', async () => {
      const validEmotions: NPCEmotion[] = [
        'neutral', 'happy', 'sad', 'surprised', 'angry',
        'thoughtful', 'worried', 'excited', 'embarrassed', 'loving'
      ];

      for (const emotion of validEmotions) {
        const mockResponse = {
          moderationScore: 0,
          shouldSendToBed: false,
          dialogue: "Test",
          emotion,
          suggestions: ["Test"],
        };

        mockCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        });

        const result = await generateStructuredResponse('Test', [], 'Test');
        expect(result.emotion).toBe(emotion);
      }
    });

    it('should default to neutral for invalid emotions', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "Test",
        emotion: "invalid_emotion",
        suggestions: ["Test"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await generateStructuredResponse('Test', [], 'Test');
      expect(result.emotion).toBe('neutral');
    });

    it('should provide default suggestions when empty', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "Hello!",
        emotion: "neutral",
        suggestions: [],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await generateStructuredResponse('Test', [], 'Hello');
      expect(result.suggestions).toEqual(["Tell me more", "I should go"]);
    });

    it('should limit suggestions to 4', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "Hello!",
        emotion: "neutral",
        suggestions: ["One", "Two", "Three", "Four", "Five", "Six"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const result = await generateStructuredResponse('Test', [], 'Hello');
      expect(result.suggestions).toHaveLength(4);
    });

    it('should include conversation history in request', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "I remember you!",
        emotion: "happy",
        suggestions: ["Good to see you"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      const history = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there!' },
      ];

      await generateStructuredResponse('Test prompt', history, 'Remember me?');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
            { role: 'user', content: 'Remember me?' },
          ],
        })
      );
    });

    it('should use structured output beta', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "Hello!",
        emotion: "neutral",
        suggestions: ["Hi"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      await generateStructuredResponse('Test', [], 'Hello');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          betas: ['structured-outputs-2025-11-13'],
          output_format: expect.objectContaining({
            type: 'json_schema',
            schema: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                moderationScore: expect.any(Object),
                dialogue: expect.any(Object),
                emotion: expect.any(Object),
                suggestions: expect.any(Object),
              }),
            }),
          }),
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const result = await generateStructuredResponse('Test', [], 'Hello');

      expect(result.error).toBe('API rate limit exceeded');
      expect(result.dialogue).toBe("Hmm? I lost my train of thought. What were we discussing?");
      expect(result.emotion).toBe('neutral');
    });

    it('should handle malformed JSON response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'This is not valid JSON' }],
      });

      const result = await generateStructuredResponse('Test', [], 'Hello');

      // Should return default response
      expect(result.dialogue).toBe("Hmm? I lost my train of thought. What were we discussing?");
      expect(result.emotion).toBe('neutral');
    });

    it('should handle empty response content', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [],
      });

      const result = await generateStructuredResponse('Test', [], 'Hello');

      expect(result.dialogue).toBe("Hmm? I lost my train of thought. What were we discussing?");
    });

    it('should use correct model', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "Hello!",
        emotion: "neutral",
        suggestions: ["Hi"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      await generateStructuredResponse('Test', [], 'Hello');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-haiku-4-5-20251001',
        })
      );
    });
  });

  describe('structured output schema', () => {
    beforeEach(() => {
      setStoredApiKey('test-api-key');
      initAnthropicClient();
    });

    it('should include all required fields in schema', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "Test",
        emotion: "neutral",
        suggestions: ["Test"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      await generateStructuredResponse('Test', [], 'Hello');

      const callArgs = mockCreate.mock.calls[0][0];
      const schema = callArgs.output_format.schema;

      expect(schema.required).toContain('moderationScore');
      expect(schema.required).toContain('shouldSendToBed');
      expect(schema.required).toContain('dialogue');
      expect(schema.required).toContain('emotion');
      expect(schema.required).toContain('suggestions');
      expect(schema.additionalProperties).toBe(false);
    });

    it('should have valid emotion enum in schema', async () => {
      const mockResponse = {
        moderationScore: 0,
        shouldSendToBed: false,
        dialogue: "Test",
        emotion: "neutral",
        suggestions: ["Test"],
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      });

      await generateStructuredResponse('Test', [], 'Hello');

      const callArgs = mockCreate.mock.calls[0][0];
      const emotionSchema = callArgs.output_format.schema.properties.emotion;

      expect(emotionSchema.enum).toEqual([
        'neutral', 'happy', 'sad', 'surprised', 'angry',
        'thoughtful', 'worried', 'excited', 'embarrassed', 'loving'
      ]);
    });
  });
});
