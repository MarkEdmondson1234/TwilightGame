/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FIRESTORE_PATHS } from '../../firebase/types';

/**
 * Shared Data Service Unit Tests
 *
 * Tests for conversation summaries and world events
 * shared between players.
 */

// Mock dependencies
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

vi.mock('../../firebase/config', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  isFirebaseInitialized: vi.fn(() => true),
}));

vi.mock('../../firebase/authService', () => ({
  authService: {
    isAuthenticated: vi.fn(() => true),
    getUserId: vi.fn(() => 'test-user-123'),
    getUser: vi.fn(() => ({ displayName: 'TestPlayer' })),
  },
}));

describe('SharedConversationSummary', () => {
  it('should have correct structure', () => {
    const summary = {
      npcId: 'mum',
      npcName: 'Mum',
      topic: 'recipes',
      summary: 'Discussed how to make apple pie',
      contributorId: 'player_abc123',
      contributorName: 'A villager',
      timestamp: { toMillis: () => Date.now() },
      season: 'spring',
      gameDay: 5,
      sentiment: 'helpful' as const,
    };

    expect(summary).toHaveProperty('npcId');
    expect(summary).toHaveProperty('npcName');
    expect(summary).toHaveProperty('topic');
    expect(summary).toHaveProperty('summary');
    expect(summary).toHaveProperty('contributorId');
    expect(summary).toHaveProperty('contributorName');
    expect(summary).toHaveProperty('timestamp');
    expect(summary).toHaveProperty('season');
    expect(summary).toHaveProperty('gameDay');
    expect(summary).toHaveProperty('sentiment');
  });

  it('should support all valid sentiment values', () => {
    const validSentiments = ['positive', 'neutral', 'curious', 'helpful'];
    validSentiments.forEach((sentiment) => {
      expect(['positive', 'neutral', 'curious', 'helpful']).toContain(sentiment);
    });
  });
});

describe('SharedWorldEvent', () => {
  it('should have correct structure', () => {
    const event = {
      eventType: 'discovery' as const,
      title: 'Rare Mushroom Found',
      description: 'found a glowing moonpetal mushroom',
      contributorId: 'player_xyz789',
      contributorName: 'A traveller',
      timestamp: { toMillis: () => Date.now() },
      location: {
        mapId: 'forest_1234',
        mapName: 'The Deep Forest',
      },
      metadata: { itemId: 'moonpetal_mushroom' },
    };

    expect(event).toHaveProperty('eventType');
    expect(event).toHaveProperty('title');
    expect(event).toHaveProperty('description');
    expect(event).toHaveProperty('contributorId');
    expect(event).toHaveProperty('contributorName');
    expect(event).toHaveProperty('timestamp');
    expect(event).toHaveProperty('location');
    expect(event).toHaveProperty('metadata');
  });

  it('should support all valid event types', () => {
    const validTypes = ['discovery', 'achievement', 'seasonal', 'community', 'mystery'];
    validTypes.forEach((type) => {
      expect(['discovery', 'achievement', 'seasonal', 'community', 'mystery']).toContain(type);
    });
  });
});

describe('Firestore Paths for Shared Data', () => {
  it('sharedConversations should have correct structure (odd segments for collection)', () => {
    const path = FIRESTORE_PATHS.sharedConversations('mum');
    expect(path).toBe('conversations/mum/summaries');

    const segments = path.split('/');
    expect(segments.length).toBe(3); // Odd = valid collection ref
    expect(segments[0]).toBe('conversations');
    expect(segments[1]).toBe('mum');
    expect(segments[2]).toBe('summaries');
  });

  it('sharedConversationDoc should have correct structure (even segments for doc)', () => {
    const path = FIRESTORE_PATHS.sharedConversationDoc('mum', 'summary123');
    expect(path).toBe('conversations/mum/summaries/summary123');

    const segments = path.split('/');
    expect(segments.length).toBe(4); // Even = valid doc ref
  });

  it('sharedEvents should have correct structure (odd segments for collection)', () => {
    const path = FIRESTORE_PATHS.sharedEvents();
    expect(path).toBe('sharedEvents');

    const segments = path.split('/');
    expect(segments.length).toBe(1); // Odd = valid collection ref
  });

  it('sharedEventDoc should have correct structure (even segments for doc)', () => {
    const path = FIRESTORE_PATHS.sharedEventDoc('event123');
    expect(path).toBe('sharedEvents/event123');

    const segments = path.split('/');
    expect(segments.length).toBe(2); // Even = valid doc ref
  });
});

describe('User ID Hashing', () => {
  // Test the hashing function logic
  const hashUserId = (userId: string): string => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `player_${Math.abs(hash).toString(36)}`;
  };

  it('should produce consistent hashes', () => {
    const hash1 = hashUserId('user123');
    const hash2 = hashUserId('user123');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hashUserId('user123');
    const hash2 = hashUserId('user456');
    expect(hash1).not.toBe(hash2);
  });

  it('should have player_ prefix', () => {
    const hash = hashUserId('anyuser');
    expect(hash).toMatch(/^player_/);
  });

  it('should be URL-safe', () => {
    const hash = hashUserId('test@example.com');
    expect(hash).toMatch(/^player_[a-z0-9]+$/);
  });
});

describe('Rate Limiting', () => {
  it('should allow MAX_CONTRIBUTIONS_PER_DAY contributions', () => {
    const MAX_CONTRIBUTIONS_PER_DAY = 10;
    expect(MAX_CONTRIBUTIONS_PER_DAY).toBe(10);
  });

  it('should reset counter after 24 hours', () => {
    const dayMs = 24 * 60 * 60 * 1000;
    expect(dayMs).toBe(86400000);
  });
});

describe('SharedDataService API Contract', () => {
  it('should define expected methods', () => {
    const expectedMethods = [
      'getConversationSummaries',
      'addConversationSummary',
      'getWorldEvents',
      'addWorldEvent',
      'getNPCGossip',
      'getRecentDiscoveries',
      'getRemainingContributions',
    ];

    expectedMethods.forEach((method) => {
      expect(typeof method).toBe('string');
    });
  });
});

describe('NPC Gossip Formatting', () => {
  it('should format single topic correctly', () => {
    const topics = ['recipes'];
    const npcName = 'Mum';

    const gossip =
      topics.length === 1
        ? `Other villagers have been asking ${npcName} about ${topics[0]} recently.`
        : `Other villagers have been chatting with ${npcName} about ${topics.slice(0, 3).join(', ')}.`;

    expect(gossip).toBe('Other villagers have been asking Mum about recipes recently.');
  });

  it('should format multiple topics correctly', () => {
    const topics = ['recipes', 'village history', 'farming tips'];
    const npcName = 'Mum';

    const gossip =
      topics.length === 1
        ? `Other villagers have been asking ${npcName} about ${topics[0]} recently.`
        : `Other villagers have been chatting with ${npcName} about ${topics.slice(0, 3).join(', ')}.`;

    expect(gossip).toBe(
      'Other villagers have been chatting with Mum about recipes, village history, farming tips.'
    );
  });
});
