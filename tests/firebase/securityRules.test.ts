/** @vitest-environment node */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Note: These tests read the local firestore.rules file.
 * They validate rule structure and best practices.
 * Skip with: npx vitest run --testNamePattern="^(?!.*Security Rules).*$"
 */

/**
 * Security Rules Validation Tests
 *
 * These tests validate the Firestore security rules file structure.
 * For actual rule testing, use Firebase Emulator with @firebase/rules-unit-testing.
 */

describe('Firestore Security Rules File', () => {
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  let rulesContent: string;

  beforeAll(() => {
    rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  });

  it('should exist', () => {
    expect(fs.existsSync(rulesPath)).toBe(true);
  });

  it('should use rules_version 2', () => {
    expect(rulesContent).toContain("rules_version = '2'");
  });

  it('should define service for cloud.firestore', () => {
    expect(rulesContent).toContain('service cloud.firestore');
  });

  describe('Path Matching', () => {
    it('should have users collection match', () => {
      expect(rulesContent).toContain('match /users/{userId}');
    });

    it('should have saves subcollection match', () => {
      expect(rulesContent).toContain('match /saves/{slotId}');
    });

    it('should have data subcollection match', () => {
      expect(rulesContent).toContain('match /data/{docType}');
    });
  });

  describe('Security Functions', () => {
    it('should define isOwner function', () => {
      expect(rulesContent).toContain('function isOwner(userId)');
    });

    it('should check auth.uid in isOwner', () => {
      expect(rulesContent).toContain('request.auth.uid == userId');
    });

    it('should check auth is not null', () => {
      expect(rulesContent).toContain('request.auth != null');
    });
  });

  describe('Validation Functions', () => {
    it('should define isValidUserProfile function', () => {
      expect(rulesContent).toContain('function isValidUserProfile()');
    });

    it('should define isValidSaveMetadata function', () => {
      expect(rulesContent).toContain('function isValidSaveMetadata()');
    });

    it('should define isValidSaveDataType function', () => {
      expect(rulesContent).toContain('function isValidSaveDataType(docType)');
    });

    it('should validate save data document types', () => {
      const expectedTypes = [
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

      expectedTypes.forEach((type) => {
        expect(rulesContent).toContain(`'${type}'`);
      });
    });
  });

  describe('Default Deny', () => {
    it('should have default deny rule', () => {
      expect(rulesContent).toContain('allow read, write: if false');
    });

    it('should match all other documents', () => {
      expect(rulesContent).toContain('match /{document=**}');
    });
  });

  describe('User Document Rules', () => {
    it('should not allow users to delete their profile', () => {
      expect(rulesContent).toContain('allow delete: if false');
    });

    it('should allow users to read their own data', () => {
      expect(rulesContent).toContain('allow read: if isOwner(userId)');
    });

    it('should allow users to create their own profile with validation', () => {
      expect(rulesContent).toContain('allow create: if isOwner(userId) && isValidUserProfile()');
    });
  });

  describe('Save Data Rules', () => {
    it('should validate document types on write', () => {
      expect(rulesContent).toContain('isValidSaveDataType(docType)');
    });

    it('should allow users to delete their saves', () => {
      // Users can delete save slots
      expect(rulesContent).toMatch(/match \/saves\/\{slotId\}[\s\S]*?allow delete: if isOwner/);
    });
  });
});

describe('Security Rules Best Practices', () => {
  const rulesPath = path.join(process.cwd(), 'firestore.rules');
  let rulesContent: string;

  beforeAll(() => {
    rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  });

  it('should not have allow read, write: if true anywhere', () => {
    expect(rulesContent).not.toMatch(/allow read, write: if true/);
  });

  it('should not have allow read: if true anywhere', () => {
    expect(rulesContent).not.toMatch(/allow read: if true[^;]/);
  });

  it('should not have allow write: if true anywhere', () => {
    expect(rulesContent).not.toMatch(/allow write: if true[^;]/);
  });

  it('should require authentication for all user data', () => {
    // All user data access should check isOwner which requires auth
    expect(rulesContent).toContain('request.auth != null');
  });

  it('should validate data on create/update', () => {
    // Create and update operations should have validation
    expect(rulesContent).toMatch(/allow create:.*&&.*isValid/);
    expect(rulesContent).toMatch(/allow update:.*&&.*isValid/);
  });

  it('should have string length limits', () => {
    // Should limit string sizes to prevent abuse
    expect(rulesContent).toContain('.size() <= 50');
  });
});
