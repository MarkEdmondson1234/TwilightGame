/** @vitest-environment node */
import { describe, it, expect } from 'vitest';
import { FIRESTORE_PATHS } from '../firebase/types';

/**
 * Tests for Firestore path structure
 *
 * Firestore document references must have an even number of segments:
 * - 2 segments: collection/document (e.g., users/abc123)
 * - 4 segments: collection/document/subcollection/document (e.g., users/abc123/saves/slot_1)
 * - 6 segments: and so on...
 *
 * Collection references must have an odd number of segments:
 * - 1 segment: collection (e.g., users)
 * - 3 segments: collection/document/subcollection (e.g., users/abc123/saves)
 */

describe('FIRESTORE_PATHS', () => {
  const testUserId = 'test_user_123';
  const testSlotId = 'slot_1';
  const testDocType = 'character';

  describe('segment counts for document references', () => {
    it('userProfile should have 2 segments (even)', () => {
      const path = FIRESTORE_PATHS.userProfile(testUserId);
      const segments = path.split('/');
      expect(segments.length).toBe(2);
      expect(segments.length % 2).toBe(0); // Even number
      expect(path).toBe('users/test_user_123');
    });

    it('saveSlot should have 4 segments (even)', () => {
      const path = FIRESTORE_PATHS.saveSlot(testUserId, testSlotId);
      const segments = path.split('/');
      expect(segments.length).toBe(4);
      expect(segments.length % 2).toBe(0); // Even number
      expect(path).toBe('users/test_user_123/saves/slot_1');
    });

    it('saveData should have 6 segments (even)', () => {
      const path = FIRESTORE_PATHS.saveData(testUserId, testSlotId, testDocType);
      const segments = path.split('/');
      expect(segments.length).toBe(6);
      expect(segments.length % 2).toBe(0); // Even number
      expect(path).toBe('users/test_user_123/saves/slot_1/data/character');
    });
  });

  describe('segment counts for collection references', () => {
    it('userSaves should have 3 segments (odd - collection reference)', () => {
      const path = FIRESTORE_PATHS.userSaves(testUserId);
      const segments = path.split('/');
      expect(segments.length).toBe(3);
      expect(segments.length % 2).toBe(1); // Odd number (collection)
      expect(path).toBe('users/test_user_123/saves');
    });
  });

  describe('path structure', () => {
    it('all paths should start with users/', () => {
      expect(FIRESTORE_PATHS.userProfile(testUserId)).toMatch(/^users\//);
      expect(FIRESTORE_PATHS.userSaves(testUserId)).toMatch(/^users\//);
      expect(FIRESTORE_PATHS.saveSlot(testUserId, testSlotId)).toMatch(/^users\//);
      expect(FIRESTORE_PATHS.saveData(testUserId, testSlotId, testDocType)).toMatch(/^users\//);
    });

    it('paths should not have double slashes', () => {
      const paths = [
        FIRESTORE_PATHS.userProfile(testUserId),
        FIRESTORE_PATHS.userSaves(testUserId),
        FIRESTORE_PATHS.saveSlot(testUserId, testSlotId),
        FIRESTORE_PATHS.saveData(testUserId, testSlotId, testDocType),
      ];

      paths.forEach((path) => {
        expect(path).not.toMatch(/\/\//);
      });
    });

    it('paths should not have leading or trailing slashes', () => {
      const paths = [
        FIRESTORE_PATHS.userProfile(testUserId),
        FIRESTORE_PATHS.userSaves(testUserId),
        FIRESTORE_PATHS.saveSlot(testUserId, testSlotId),
        FIRESTORE_PATHS.saveData(testUserId, testSlotId, testDocType),
      ];

      paths.forEach((path) => {
        expect(path).not.toMatch(/^\//);
        expect(path).not.toMatch(/\/$/);
      });
    });
  });

  describe('save data document types', () => {
    const docTypes = [
      'character',
      'inventory',
      'farming',
      'cooking',
      'magic',
      'friendships',
      'quests',
      'world',
      'stats',
    ];

    docTypes.forEach((docType) => {
      it(`saveData path for '${docType}' should have valid structure`, () => {
        const path = FIRESTORE_PATHS.saveData(testUserId, testSlotId, docType);
        const segments = path.split('/');

        expect(segments.length).toBe(6);
        expect(segments[0]).toBe('users');
        expect(segments[1]).toBe(testUserId);
        expect(segments[2]).toBe('saves');
        expect(segments[3]).toBe(testSlotId);
        expect(segments[4]).toBe('data');
        expect(segments[5]).toBe(docType);
      });
    });
  });
});
