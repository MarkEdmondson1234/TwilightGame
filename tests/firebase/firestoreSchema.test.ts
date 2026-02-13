/** @vitest-environment node */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { FIRESTORE_PATHS, SAVE_DATA_DOCS } from '../../firebase/types';

/**
 * Firestore Schema Guard Tests
 *
 * These tests cross-validate the TypeScript path definitions (firebase/types.ts)
 * against the Firestore security rules (firestore.rules) to catch:
 *
 * 1. Path segment count errors (collection refs must be odd, doc refs must be even)
 * 2. SAVE_DATA_DOCS out of sync with isValidSaveDataType allowlist in rules
 * 3. Shared data paths in TypeScript not matching match rules in firestore.rules
 * 4. Admin email whitelist consistency between adminUtils.ts and firestore.rules
 */

let rulesContent: string;
let adminUtilsContent: string;

beforeAll(() => {
  rulesContent = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf-8');
  adminUtilsContent = fs.readFileSync(
    path.join(process.cwd(), 'firebase', 'adminUtils.ts'),
    'utf-8'
  );
});

// ============================================
// 1. Path Segment Count Validation
// ============================================

describe('Firestore path segment counts', () => {
  /**
   * Firestore collection() requires an ODD number of path segments.
   * Firestore doc() requires an EVEN number of path segments.
   *
   * e.g. collection('users/abc/saves') = 3 segments (odd) ✅
   *      doc('users/abc/saves/slot1')   = 4 segments (even) ✅
   *      collection('shared/events')    = 2 segments (even) ❌ BREAKS
   */

  function segmentCount(path: string): number {
    return path.split('/').length;
  }

  function isOdd(n: number): boolean {
    return n % 2 === 1;
  }

  describe('collection references (must have ODD segment count)', () => {
    it('userSaves path', () => {
      const p = FIRESTORE_PATHS.userSaves('uid');
      expect(isOdd(segmentCount(p))).toBe(true);
    });

    it('sharedConversations path', () => {
      const p = FIRESTORE_PATHS.sharedConversations('mum');
      expect(isOdd(segmentCount(p))).toBe(true);
    });

    it('sharedEvents path', () => {
      const p = FIRESTORE_PATHS.sharedEvents();
      expect(isOdd(segmentCount(p))).toBe(true);
    });

    it('userDiary path', () => {
      const p = FIRESTORE_PATHS.userDiary('uid');
      expect(isOdd(segmentCount(p))).toBe(true);
    });
  });

  describe('document references (must have EVEN segment count)', () => {
    it('userProfile path', () => {
      const p = FIRESTORE_PATHS.userProfile('uid');
      expect(isOdd(segmentCount(p))).toBe(false);
    });

    it('syncMeta path', () => {
      const p = FIRESTORE_PATHS.syncMeta('uid');
      expect(isOdd(segmentCount(p))).toBe(false);
    });

    it('saveSlot path', () => {
      const p = FIRESTORE_PATHS.saveSlot('uid', 'slot_1');
      expect(isOdd(segmentCount(p))).toBe(false);
    });

    it('saveData path', () => {
      const p = FIRESTORE_PATHS.saveData('uid', 'slot_1', 'character');
      expect(isOdd(segmentCount(p))).toBe(false);
    });

    it('sharedConversationDoc path', () => {
      const p = FIRESTORE_PATHS.sharedConversationDoc('mum', 'doc123');
      expect(isOdd(segmentCount(p))).toBe(false);
    });

    it('sharedEventDoc path', () => {
      const p = FIRESTORE_PATHS.sharedEventDoc('event123');
      expect(isOdd(segmentCount(p))).toBe(false);
    });

    it('diaryEntry path', () => {
      const p = FIRESTORE_PATHS.diaryEntry('uid', 'mum_45');
      expect(isOdd(segmentCount(p))).toBe(false);
    });
  });

  it('no path should contain empty segments (double slashes)', () => {
    const allPaths = [
      FIRESTORE_PATHS.userProfile('uid'),
      FIRESTORE_PATHS.syncMeta('uid'),
      FIRESTORE_PATHS.userSaves('uid'),
      FIRESTORE_PATHS.saveSlot('uid', 'slot_1'),
      FIRESTORE_PATHS.saveData('uid', 'slot_1', 'character'),
      FIRESTORE_PATHS.sharedConversations('mum'),
      FIRESTORE_PATHS.sharedConversationDoc('mum', 'doc1'),
      FIRESTORE_PATHS.sharedEvents(),
      FIRESTORE_PATHS.sharedEventDoc('evt1'),
      FIRESTORE_PATHS.userDiary('uid'),
      FIRESTORE_PATHS.diaryEntry('uid', 'mum_45'),
    ];

    allPaths.forEach((p) => {
      expect(p).not.toContain('//');
    });
  });
});

// ============================================
// 2. SAVE_DATA_DOCS vs firestore.rules allowlist
// ============================================

describe('SAVE_DATA_DOCS matches firestore.rules isValidSaveDataType', () => {
  it('every SAVE_DATA_DOCS entry should appear in isValidSaveDataType', () => {
    // Extract the allowlist from isValidSaveDataType in firestore.rules
    const match = rulesContent.match(
      /function isValidSaveDataType\(docType\)\s*\{[\s\S]*?return docType in \[([\s\S]*?)\]/
    );
    expect(match).not.toBeNull();

    const allowlistStr = match![1];
    const rulesTypes = [...allowlistStr.matchAll(/'(\w+)'/g)].map((m) => m[1]);

    SAVE_DATA_DOCS.forEach((docType) => {
      expect(rulesTypes).toContain(docType);
    });
  });

  it('every isValidSaveDataType entry should appear in SAVE_DATA_DOCS', () => {
    const match = rulesContent.match(
      /function isValidSaveDataType\(docType\)\s*\{[\s\S]*?return docType in \[([\s\S]*?)\]/
    );
    const allowlistStr = match![1];
    const rulesTypes = [...allowlistStr.matchAll(/'(\w+)'/g)].map((m) => m[1]);

    rulesTypes.forEach((type) => {
      expect(SAVE_DATA_DOCS).toContain(type);
    });
  });

  it('counts should match exactly', () => {
    const match = rulesContent.match(
      /function isValidSaveDataType\(docType\)\s*\{[\s\S]*?return docType in \[([\s\S]*?)\]/
    );
    const allowlistStr = match![1];
    const rulesTypes = [...allowlistStr.matchAll(/'(\w+)'/g)].map((m) => m[1]);

    expect(rulesTypes.length).toBe(SAVE_DATA_DOCS.length);
  });
});

// ============================================
// 3. Shared data paths match firestore.rules
// ============================================

describe('Shared data paths match firestore.rules match clauses', () => {
  it('sharedConversations path structure should match rules', () => {
    // TypeScript path: conversations/{npcId}/summaries
    // Rules match:     /conversations/{npcId}/summaries/{summaryId}
    const tsPath = FIRESTORE_PATHS.sharedConversations('test_npc');
    const segments = tsPath.split('/');

    // First segment should appear in a match rule
    expect(rulesContent).toContain(`match /conversations/{npcId}/summaries/{summaryId}`);
    // TypeScript collection path should be prefix of the rules match path
    expect(segments[0]).toBe('conversations');
    expect(segments[2]).toBe('summaries');
  });

  it('sharedEvents path structure should match rules', () => {
    // TypeScript path: sharedEvents
    // Rules match:     /sharedEvents/{eventId}
    const tsPath = FIRESTORE_PATHS.sharedEvents();

    expect(rulesContent).toContain(`match /sharedEvents/{eventId}`);
    expect(tsPath).toBe('sharedEvents');
  });
});

// ============================================
// 4. Admin email consistency
// ============================================

describe('Admin email whitelist consistency', () => {
  it('admin emails in firestore.rules should match adminUtils.ts', () => {
    // Extract emails from firestore.rules isAdmin function
    const rulesEmails = [...rulesContent.matchAll(/'([^']+@[^']+)'/g)].map((m) => m[1]);
    // Extract emails from adminUtils.ts
    const utilsEmails = [...adminUtilsContent.matchAll(/'([^']+@[^']+)'/g)].map((m) => m[1]);

    expect(rulesEmails.sort()).toEqual(utilsEmails.sort());
  });
});

// ============================================
// 5. Shared event types consistency
// ============================================

describe('SharedEventType consistency with firestore.rules', () => {
  it('isValidWorldEvent eventType allowlist should match TypeScript SharedEventType', () => {
    // Extract event types from firestore.rules
    const match = rulesContent.match(/data\.eventType in \[([\s\S]*?)\]/);
    expect(match).not.toBeNull();

    const rulesTypes = [...match![1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
    const expectedTypes = ['discovery', 'achievement', 'seasonal', 'community', 'mystery'];

    expect(rulesTypes.sort()).toEqual(expectedTypes.sort());
  });
});
