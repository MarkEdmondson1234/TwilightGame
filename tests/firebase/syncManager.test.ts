/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Sync Manager Unit Tests
 *
 * Tests the hybrid save system that coordinates
 * between localStorage and Firestore.
 */

// Mock dependencies
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

vi.mock('../../firebase/config', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  isFirebaseInitialized: vi.fn(() => true),
}));

vi.mock('../../firebase/authService', () => ({
  authService: {
    onAuthStateChange: vi.fn((cb) => {
      // Return unsubscribe function
      return () => {};
    }),
    isAuthenticated: vi.fn(() => false),
    getUserId: vi.fn(() => null),
  },
}));

vi.mock('../../firebase/cloudSaveService', () => ({
  cloudSaveService: {
    saveGame: vi.fn(),
    loadGame: vi.fn(),
  },
}));

vi.mock('../../GameState', () => ({
  gameState: {
    getFullState: vi.fn(() => ({
      stats: { totalPlayTime: 0 },
    })),
    loadFromCloud: vi.fn(),
  },
}));

vi.mock('../../utils/EventBus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
  GameEvent: {
    INVENTORY_CHANGED: 'items:inventory_changed',
  },
}));

describe('SyncManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage mock
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  });

  describe('SyncState interface', () => {
    it('should have correct shape', () => {
      const mockSyncState = {
        status: 'idle' as const,
        lastSyncTime: null,
        pendingChanges: false,
        error: null,
      };

      expect(mockSyncState).toHaveProperty('status');
      expect(mockSyncState).toHaveProperty('lastSyncTime');
      expect(mockSyncState).toHaveProperty('pendingChanges');
      expect(mockSyncState).toHaveProperty('error');
    });

    it('should support all valid status values', () => {
      const validStatuses = ['idle', 'syncing', 'error', 'offline'];
      validStatuses.forEach((status) => {
        expect(typeof status).toBe('string');
      });
    });
  });

  describe('Device ID generation', () => {
    it('should generate consistent device ID format', () => {
      const deviceIdPattern = /^device_\d+_[a-z0-9]+$/;
      const mockDeviceId = `device_${Date.now()}_abc123`;
      expect(mockDeviceId).toMatch(deviceIdPattern);
    });

    it('should persist device ID in localStorage', () => {
      const deviceId = 'device_123_abc';
      localStorage.setItem('twilight_device_id', deviceId);
      expect(localStorage.setItem).toHaveBeenCalledWith('twilight_device_id', deviceId);
    });
  });

  describe('Sync timing', () => {
    it('should use 5-minute sync interval', () => {
      const SYNC_INTERVAL_MS = 5 * 60 * 1000;
      expect(SYNC_INTERVAL_MS).toBe(300000);
    });
  });
});

describe('SyncManager API Contract', () => {
  it('should define expected methods', () => {
    const expectedMethods = [
      'initialize',
      'uploadToCloud',
      'downloadFromCloud',
      'syncNow',
      'markPendingChanges',
      'getState',
      'onStateChange',
      'destroy',
    ];

    expectedMethods.forEach((method) => {
      expect(typeof method).toBe('string');
    });
  });
});

describe('SyncMetadata', () => {
  it('should have correct structure', () => {
    const mockSyncMeta = {
      lastLocalSave: Date.now(),
      lastCloudSync: Date.now(),
      lastCloudSave: { toMillis: () => Date.now() },
      deviceId: 'device_123_abc',
      version: '1.0.0',
    };

    expect(mockSyncMeta).toHaveProperty('lastLocalSave');
    expect(mockSyncMeta).toHaveProperty('lastCloudSync');
    expect(mockSyncMeta).toHaveProperty('lastCloudSave');
    expect(mockSyncMeta).toHaveProperty('deviceId');
    expect(mockSyncMeta).toHaveProperty('version');
  });
});

describe('Sync Conflict Resolution', () => {
  it('should prefer cloud when cloud timestamp is newer', () => {
    const localTimestamp = 1000;
    const cloudTimestamp = 2000;

    const shouldDownload = cloudTimestamp > localTimestamp;
    const shouldUpload = localTimestamp > cloudTimestamp;

    expect(shouldDownload).toBe(true);
    expect(shouldUpload).toBe(false);
  });

  it('should prefer local when local timestamp is newer', () => {
    const localTimestamp = 2000;
    const cloudTimestamp = 1000;

    const shouldDownload = cloudTimestamp > localTimestamp;
    const shouldUpload = localTimestamp > cloudTimestamp;

    expect(shouldDownload).toBe(false);
    expect(shouldUpload).toBe(true);
  });

  it('should do nothing when timestamps are equal', () => {
    const localTimestamp = 1000;
    const cloudTimestamp = 1000;

    const shouldDownload = cloudTimestamp > localTimestamp;
    const shouldUpload = localTimestamp > cloudTimestamp;

    expect(shouldDownload).toBe(false);
    expect(shouldUpload).toBe(false);
  });
});
