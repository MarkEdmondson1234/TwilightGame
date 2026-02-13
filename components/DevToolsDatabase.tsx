/**
 * DevToolsDatabase — Firebase admin/moderation tab for DevTools (F4).
 *
 * Provides:
 * - Firebase connection status and user info
 * - Sync status with manual sync trigger
 * - Cloud save slot browser with delete
 * - Shared conversation summaries browser with admin delete
 * - Shared world events browser with admin delete
 * - Test data creation buttons
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAuthService,
  getSharedDataService,
  getCloudSaveService,
  getSyncManager,
  isFirebaseLoaded,
  type SyncState,
} from '../firebase/safe';
import { isAdmin } from '../firebase/adminUtils';
import type { SaveSlot } from '../firebase/types';

// ============================================
// Helpers
// ============================================

function formatRelativeTime(timestampMs: number | null): string {
  if (!timestampMs) return 'Never';
  const ms = Date.now() - timestampMs;
  if (ms < 60_000) return 'Just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} min ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)} hours ago`;
  return `${Math.floor(ms / 86_400_000)} days ago`;
}

function formatFirestoreTime(timestamp: { toMillis?: () => number } | null): string {
  if (!timestamp || !timestamp.toMillis) return 'Unknown';
  return formatRelativeTime(timestamp.toMillis());
}

// ============================================
// Sub-sections
// ============================================

function ConnectionStatusSection() {
  const auth = getAuthService();
  const state = auth.getState();
  const loaded = isFirebaseLoaded();
  const admin = isAdmin();

  return (
    <div className="devtools-section">
      <h3>Connection Status</h3>
      <div className="devtools-status">
        <p>
          <strong>Firebase:</strong> {loaded ? '🟢 Connected' : '🔴 Not loaded'}
        </p>
        {state.isAuthenticated && state.user ? (
          <>
            <p>
              <strong>Email:</strong> {state.user.email || '(anonymous)'}
            </p>
            <p>
              <strong>Display Name:</strong> {state.user.displayName || '(not set)'}
            </p>
            <p>
              <strong>UID:</strong>{' '}
              <span style={{ fontSize: '8px', wordBreak: 'break-all' }}>{state.user.uid}</span>
            </p>
            <p>
              <strong>Admin:</strong>{' '}
              {admin ? <span className="devtools-admin-badge">ADMIN</span> : 'No'}
            </p>
          </>
        ) : (
          <p>
            <strong>User:</strong> Not signed in
          </p>
        )}
      </div>
    </div>
  );
}

function SyncStatusSection() {
  const syncManager = getSyncManager();
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getState());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    return syncManager.onStateChange(setSyncState);
  }, [syncManager]);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    try {
      await syncManager.syncNow();
    } finally {
      setSyncing(false);
    }
  }, [syncManager]);

  const statusIcon =
    syncState.status === 'idle'
      ? '🟢'
      : syncState.status === 'syncing'
        ? '🔄'
        : syncState.status === 'error'
          ? '🔴'
          : '⚪';

  return (
    <div className="devtools-section">
      <h3>Sync Status</h3>
      <div className="devtools-status">
        <p>
          <strong>Status:</strong> {statusIcon} {syncState.status}
        </p>
        <p>
          <strong>Last Sync:</strong> {formatRelativeTime(syncState.lastSyncTime)}
        </p>
        <p>
          <strong>Pending Changes:</strong> {syncState.pendingChanges ? 'Yes' : 'No'}
        </p>
        {syncState.error && (
          <p style={{ color: '#f87171' }}>
            <strong>Error:</strong> {syncState.error}
          </p>
        )}
      </div>
      <div style={{ marginTop: '8px' }}>
        <button
          className="devtools-button"
          onClick={handleSyncNow}
          disabled={syncing}
          style={{ width: 'auto', padding: '8px 16px' }}
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    </div>
  );
}

function CloudSavesSection() {
  const cloudSave = getCloudSaveService();
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const result = await cloudSave.getSaveSlots();
      setSlots(result);
    } catch (err) {
      console.error('[DevToolsDB] Failed to fetch save slots:', err);
    } finally {
      setLoading(false);
    }
  }, [cloudSave]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const handleDelete = useCallback(
    async (slotId: string) => {
      if (!confirm(`Delete save slot "${slotId}"? This cannot be undone.`)) return;
      setDeleting(slotId);
      try {
        await cloudSave.deleteSave(slotId);
        await fetchSlots();
      } catch (err) {
        console.error('[DevToolsDB] Failed to delete save:', err);
      } finally {
        setDeleting(null);
      }
    },
    [cloudSave, fetchSlots]
  );

  return (
    <div className="devtools-section">
      <h3>Cloud Saves</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          className="devtools-button"
          onClick={fetchSlots}
          disabled={loading}
          style={{ width: 'auto', padding: '8px 16px' }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      {slots.length === 0 ? (
        <div className="devtools-status">
          <p>No cloud saves found.</p>
        </div>
      ) : (
        <div className="devtools-data-list">
          {slots.map((slot) => (
            <div key={slot.id} className="devtools-data-item">
              <div>
                <strong style={{ color: '#60a5fa' }}>{slot.id}</strong> —{' '}
                {slot.metadata.characterName}
              </div>
              <div style={{ color: '#94a3b8' }}>
                {slot.metadata.season} Day {slot.metadata.gameDay}, Year {slot.metadata.year} |{' '}
                {slot.metadata.gold}g | {formatFirestoreTime(slot.metadata.lastSaved)}
              </div>
              <div className="devtools-data-item-actions">
                <button
                  className="devtools-button devtools-button-danger"
                  onClick={() => handleDelete(slot.id)}
                  disabled={deleting === slot.id}
                  style={{ width: 'auto', padding: '4px 8px', fontSize: '8px' }}
                >
                  {deleting === slot.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ConversationWithId {
  docId: string;
  npcId: string;
  npcName: string;
  topic: string;
  summary: string;
  contributorName: string;
  timestamp: { toMillis?: () => number } | null;
}

function SharedConversationsSection() {
  const shared = getSharedDataService();
  const admin = isAdmin();
  const [conversations, setConversations] = useState<ConversationWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterNpc, setFilterNpc] = useState('');

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const result = await shared.getAllConversationSummaries(100);
      setConversations(result as ConversationWithId[]);
    } catch (err) {
      console.error('[DevToolsDB] Failed to fetch conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [shared]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleDelete = useCallback(
    async (npcId: string, docId: string) => {
      if (!confirm('Delete this conversation summary?')) return;
      await shared.deleteConversationSummary(npcId, docId);
      await fetchConversations();
    },
    [shared, fetchConversations]
  );

  const npcIds = [...new Set(conversations.map((c) => c.npcId))].sort();
  const filtered = filterNpc ? conversations.filter((c) => c.npcId === filterNpc) : conversations;

  return (
    <div className="devtools-section">
      <h3>Shared Conversations ({conversations.length})</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <button
          className="devtools-button"
          onClick={fetchConversations}
          disabled={loading}
          style={{ width: 'auto', padding: '8px 16px' }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <div className="devtools-control" style={{ marginBottom: 0, flex: 1, minWidth: '120px' }}>
          <select
            value={filterNpc}
            onChange={(e) => setFilterNpc(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">All NPCs</option>
            {npcIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="devtools-status">
          <p>No conversation summaries found.</p>
        </div>
      ) : (
        <div className="devtools-data-list">
          {filtered.map((conv) => (
            <div key={conv.docId} className="devtools-data-item">
              <div>
                <strong style={{ color: '#34d399' }}>[{conv.npcName}]</strong>{' '}
                <span style={{ color: '#94a3b8' }}>{conv.contributorName}</span> discussed &quot;
                {conv.topic}&quot;
              </div>
              <div style={{ color: '#64748b', fontSize: '8px' }}>{conv.summary}</div>
              <div style={{ color: '#475569', fontSize: '8px' }}>
                {formatFirestoreTime(conv.timestamp)} | ID: {conv.docId.slice(0, 8)}...
              </div>
              {admin && (
                <div className="devtools-data-item-actions">
                  <button
                    className="devtools-button devtools-button-danger"
                    onClick={() => handleDelete(conv.npcId, conv.docId)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '8px' }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface EventWithId {
  docId: string;
  eventType: string;
  title: string;
  description: string;
  contributorName: string;
  timestamp: { toMillis?: () => number } | null;
  location?: { mapId: string; mapName: string };
}

function SharedEventsSection() {
  const shared = getSharedDataService();
  const admin = isAdmin();
  const [events, setEvents] = useState<EventWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await shared.getWorldEventsWithIds(
        filterType ? (filterType as any) : undefined,
        50
      );
      setEvents(result as EventWithId[]);
    } catch (err) {
      console.error('[DevToolsDB] Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [shared, filterType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDelete = useCallback(
    async (docId: string) => {
      if (!confirm('Delete this world event?')) return;
      await shared.deleteWorldEvent(docId);
      await fetchEvents();
    },
    [shared, fetchEvents]
  );

  return (
    <div className="devtools-section">
      <h3>Shared Events ({events.length})</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <button
          className="devtools-button"
          onClick={fetchEvents}
          disabled={loading}
          style={{ width: 'auto', padding: '8px 16px' }}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        <div className="devtools-control" style={{ marginBottom: 0, flex: 1, minWidth: '120px' }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="">All Types</option>
            <option value="discovery">Discovery</option>
            <option value="achievement">Achievement</option>
            <option value="seasonal">Seasonal</option>
            <option value="community">Community</option>
            <option value="mystery">Mystery</option>
          </select>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="devtools-status">
          <p>No world events found.</p>
        </div>
      ) : (
        <div className="devtools-data-list">
          {events.map((evt) => (
            <div key={evt.docId} className="devtools-data-item">
              <div>
                <strong style={{ color: '#f59e0b' }}>[{evt.eventType}]</strong> {evt.title}
              </div>
              <div style={{ color: '#94a3b8' }}>
                {evt.description}
                {evt.location && (
                  <span style={{ color: '#64748b' }}> — {evt.location.mapName}</span>
                )}
              </div>
              <div style={{ color: '#475569', fontSize: '8px' }}>
                By {evt.contributorName} | {formatFirestoreTime(evt.timestamp)} | ID:{' '}
                {evt.docId.slice(0, 8)}...
              </div>
              {admin && (
                <div className="devtools-data-item-actions">
                  <button
                    className="devtools-button devtools-button-danger"
                    onClick={() => handleDelete(evt.docId)}
                    style={{ width: 'auto', padding: '4px 8px', fontSize: '8px' }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TestDataSection() {
  const shared = getSharedDataService();
  const [status, setStatus] = useState('');

  const createTestConversation = useCallback(async () => {
    setStatus('Creating test conversation...');
    const success = await shared.addConversationSummary(
      'mum',
      'Mum',
      'testing the database',
      'A developer was testing the shared data system and had a lovely chat.',
      'neutral',
      { season: 'spring', gameDay: 1 }
    );
    setStatus(success ? 'Test conversation created!' : 'Failed (rate limited or not signed in)');
  }, [shared]);

  const createTestEvent = useCallback(async () => {
    setStatus('Creating test event...');
    const success = await shared.addWorldEvent(
      'discovery',
      'Test Event',
      'A developer discovered the database admin panel',
      { mapId: 'village', mapName: 'Village' }
    );
    setStatus(success ? 'Test event created!' : 'Failed (rate limited or not signed in)');
  }, [shared]);

  const remaining = shared.getRemainingContributions();

  return (
    <div className="devtools-section">
      <h3>Test Data</h3>
      <div className="devtools-status" style={{ marginBottom: '8px' }}>
        <p>
          <strong>Rate Limit:</strong> {remaining}/10 remaining this minute
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className="devtools-button"
          onClick={createTestConversation}
          style={{ width: 'auto', padding: '8px 12px' }}
        >
          Create Test Conversation
        </button>
        <button
          className="devtools-button"
          onClick={createTestEvent}
          style={{ width: 'auto', padding: '8px 12px' }}
        >
          Create Test Event
        </button>
      </div>
      {status && <p style={{ fontSize: '9px', color: '#94a3b8', marginTop: '8px' }}>{status}</p>}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export default function DevToolsDatabase() {
  return (
    <>
      <ConnectionStatusSection />
      <SyncStatusSection />
      <CloudSavesSection />
      <SharedConversationsSection />
      <SharedEventsSection />
      <TestDataSection />
    </>
  );
}
