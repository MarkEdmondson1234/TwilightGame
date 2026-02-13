/**
 * Shared Data Service
 *
 * Handles shared data between players:
 * - NPC conversation summaries
 * - World events and discoveries
 *
 * Privacy: User IDs are hashed, only display names shown.
 * Rate limiting: Prevents spam by limiting contributions per user.
 */

import {
  doc,
  deleteDoc,
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseInitialized } from './config';
import { authService } from './authService';
import {
  SharedConversationSummary,
  SharedWorldEvent,
  SharedEventType,
  FIRESTORE_PATHS,
} from './types';

// ============================================
// Constants
// ============================================

const MAX_SUMMARIES_PER_NPC = 50; // Max summaries to fetch per NPC
const MAX_EVENTS = 100; // Max events to fetch
const MAX_CONTRIBUTIONS_PER_MINUTE = 10; // Rate limit per user

// Hash user ID for privacy (one-way, consistent)
function hashUserId(userId: string): string {
  // Simple hash - in production, use a proper hash function
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `player_${Math.abs(hash).toString(36)}`;
}

// ============================================
// SharedDataService Class
// ============================================

class SharedDataService {
  private contributionCount = 0;
  private lastContributionReset = 0;

  /**
   * Get conversation summaries for an NPC
   * Returns summaries from other players about their conversations
   */
  async getConversationSummaries(
    npcId: string,
    maxResults: number = 10
  ): Promise<SharedConversationSummary[]> {
    if (!isFirebaseInitialized()) {
      return [];
    }

    try {
      const db = getFirebaseDb();
      const summariesRef = collection(db, FIRESTORE_PATHS.sharedConversations(npcId));

      const q = query(summariesRef, orderBy('timestamp', 'desc'), limit(maxResults));

      const snapshot = await getDocs(q);
      const summaries: SharedConversationSummary[] = [];

      snapshot.forEach((doc) => {
        summaries.push(doc.data() as SharedConversationSummary);
      });

      console.log(`[SharedData] Fetched ${summaries.length} conversation summaries for ${npcId}`);
      return summaries;
    } catch (error) {
      console.error('[SharedData] Failed to get conversation summaries:', error);
      return [];
    }
  }

  /**
   * Add a conversation summary for an NPC
   * Called after a meaningful AI conversation
   */
  async addConversationSummary(
    npcId: string,
    npcName: string,
    topic: string,
    summary: string,
    sentiment: SharedConversationSummary['sentiment'] = 'neutral',
    gameContext: { season: string; gameDay: number }
  ): Promise<boolean> {
    if (!this.canContribute()) {
      console.log('[SharedData] Rate limited, skipping contribution');
      return false;
    }

    if (!isFirebaseInitialized()) {
      console.log('[SharedData] Skipping conversation summary: Firebase not initialised');
      return false;
    }
    if (!authService.isAuthenticated()) {
      console.log('[SharedData] Skipping conversation summary: not authenticated');
      return false;
    }

    try {
      const userId = authService.getUserId()!;
      const user = authService.getUser();
      const db = getFirebaseDb();

      console.log(`[SharedData] Writing conversation summary for ${npcName}: "${topic}"`);

      const summaryData: Omit<SharedConversationSummary, 'timestamp'> & {
        timestamp: ReturnType<typeof serverTimestamp>;
      } = {
        npcId,
        npcName,
        topic,
        summary,
        contributorId: hashUserId(userId),
        contributorName: user?.displayName || 'A villager',
        timestamp: serverTimestamp(),
        season: gameContext.season,
        gameDay: gameContext.gameDay,
        sentiment,
      };

      const summariesRef = collection(db, FIRESTORE_PATHS.sharedConversations(npcId));
      await addDoc(summariesRef, summaryData);

      this.recordContribution();
      console.log(`[SharedData] Added conversation summary for ${npcName}`);
      return true;
    } catch (error) {
      console.error('[SharedData] Failed to add conversation summary:', error);
      return false;
    }
  }

  /**
   * Get recent world events from all players
   */
  async getWorldEvents(
    eventType?: SharedEventType,
    maxResults: number = 20
  ): Promise<SharedWorldEvent[]> {
    if (!isFirebaseInitialized()) {
      return [];
    }

    try {
      const db = getFirebaseDb();
      const eventsRef = collection(db, FIRESTORE_PATHS.sharedEvents());

      let q;
      if (eventType) {
        q = query(
          eventsRef,
          where('eventType', '==', eventType),
          orderBy('timestamp', 'desc'),
          limit(maxResults)
        );
      } else {
        q = query(eventsRef, orderBy('timestamp', 'desc'), limit(maxResults));
      }

      const snapshot = await getDocs(q);
      const events: SharedWorldEvent[] = [];

      snapshot.forEach((doc) => {
        events.push(doc.data() as SharedWorldEvent);
      });

      console.log(`[SharedData] Fetched ${events.length} world events`);
      return events;
    } catch (error) {
      console.error('[SharedData] Failed to get world events:', error);
      return [];
    }
  }

  /**
   * Add a world event
   * Call when player makes a discovery, achievement, etc.
   */
  async addWorldEvent(
    eventType: SharedEventType,
    title: string,
    description: string,
    location?: { mapId: string; mapName: string },
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.canContribute()) {
      console.log('[SharedData] Rate limited, skipping contribution');
      return false;
    }

    if (!isFirebaseInitialized() || !authService.isAuthenticated()) {
      return false;
    }

    try {
      const userId = authService.getUserId()!;
      const user = authService.getUser();
      const db = getFirebaseDb();

      const eventData: Record<string, unknown> = {
        eventType,
        title,
        description,
        contributorId: hashUserId(userId),
        contributorName: user?.displayName || 'A traveller',
        timestamp: serverTimestamp(),
      };
      if (location !== undefined) eventData.location = location;
      if (metadata !== undefined) eventData.metadata = metadata;

      const eventsRef = collection(db, FIRESTORE_PATHS.sharedEvents());
      await addDoc(eventsRef, eventData);

      this.recordContribution();
      console.log(`[SharedData] Added world event: ${title}`);
      return true;
    } catch (error) {
      console.error('[SharedData] Failed to add world event:', error);
      return false;
    }
  }

  /**
   * Get summaries of what other players discussed with an NPC
   * Returns a human-readable summary for display in dialogue
   */
  async getNPCGossip(npcId: string, npcName: string): Promise<string | null> {
    const summaries = await this.getConversationSummaries(npcId, 5);

    if (summaries.length === 0) {
      return null;
    }

    // Format summaries into gossip
    const topics = [...new Set(summaries.map((s) => s.topic))];
    const recentSummary = summaries[0];

    if (topics.length === 1) {
      return `Other villagers have been asking ${npcName} about ${topics[0]} recently.`;
    } else {
      return `Other villagers have been chatting with ${npcName} about ${topics.slice(0, 3).join(', ')}.`;
    }
  }

  /**
   * Get recent discoveries for the notice board or town crier
   */
  async getRecentDiscoveries(): Promise<string[]> {
    const events = await this.getWorldEvents('discovery', 5);

    return events.map((e) => {
      const location = e.location ? ` near ${e.location.mapName}` : '';
      return `${e.contributorName} ${e.description}${location}.`;
    });
  }

  // ============================================
  // Rate Limiting
  // ============================================

  private canContribute(): boolean {
    const now = Date.now();
    const minuteMs = 60 * 1000;

    // Reset counter every minute
    if (now - this.lastContributionReset > minuteMs) {
      this.contributionCount = 0;
      this.lastContributionReset = now;
    }

    return this.contributionCount < MAX_CONTRIBUTIONS_PER_MINUTE;
  }

  private recordContribution(): void {
    this.contributionCount++;
  }

  /**
   * Get remaining contributions this minute
   */
  getRemainingContributions(): number {
    const now = Date.now();
    const minuteMs = 60 * 1000;

    if (now - this.lastContributionReset > minuteMs) {
      return MAX_CONTRIBUTIONS_PER_MINUTE;
    }

    return Math.max(0, MAX_CONTRIBUTIONS_PER_MINUTE - this.contributionCount);
  }

  // ============================================
  // Admin / Moderation Methods
  // ============================================

  /**
   * Get ALL conversation summaries across all NPCs (admin browser).
   * Uses collectionGroup to query across all NPC subcollections.
   */
  async getAllConversationSummaries(
    maxResults: number = 100
  ): Promise<(SharedConversationSummary & { docId: string })[]> {
    if (!isFirebaseInitialized()) {
      return [];
    }

    try {
      const db = getFirebaseDb();
      const summariesGroup = collectionGroup(db, 'summaries');
      const q = query(summariesGroup, orderBy('timestamp', 'desc'), limit(maxResults));
      const snapshot = await getDocs(q);
      const summaries: (SharedConversationSummary & { docId: string })[] = [];

      snapshot.forEach((docSnap) => {
        summaries.push({
          ...(docSnap.data() as SharedConversationSummary),
          docId: docSnap.id,
        });
      });

      console.log(`[SharedData] Admin: fetched ${summaries.length} conversation summaries`);
      return summaries;
    } catch (error) {
      console.error('[SharedData] Failed to get all conversation summaries:', error);
      return [];
    }
  }

  /**
   * Get world events with Firestore document IDs (for admin moderation).
   */
  async getWorldEventsWithIds(
    eventType?: SharedEventType,
    maxResults: number = 50
  ): Promise<(SharedWorldEvent & { docId: string })[]> {
    if (!isFirebaseInitialized()) {
      return [];
    }

    try {
      const db = getFirebaseDb();
      const eventsRef = collection(db, FIRESTORE_PATHS.sharedEvents());

      let q;
      if (eventType) {
        q = query(
          eventsRef,
          where('eventType', '==', eventType),
          orderBy('timestamp', 'desc'),
          limit(maxResults)
        );
      } else {
        q = query(eventsRef, orderBy('timestamp', 'desc'), limit(maxResults));
      }

      const snapshot = await getDocs(q);
      const events: (SharedWorldEvent & { docId: string })[] = [];

      snapshot.forEach((docSnap) => {
        events.push({
          ...(docSnap.data() as SharedWorldEvent),
          docId: docSnap.id,
        });
      });

      console.log(`[SharedData] Admin: fetched ${events.length} world events`);
      return events;
    } catch (error) {
      console.error('[SharedData] Failed to get world events with IDs:', error);
      return [];
    }
  }

  /**
   * Delete a conversation summary (admin moderation).
   */
  async deleteConversationSummary(npcId: string, summaryDocId: string): Promise<boolean> {
    if (!isFirebaseInitialized()) return false;

    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, FIRESTORE_PATHS.sharedConversationDoc(npcId, summaryDocId)));
      console.log(`[SharedData] Deleted conversation summary ${summaryDocId} for ${npcId}`);
      return true;
    } catch (error) {
      console.error('[SharedData] Failed to delete conversation summary:', error);
      return false;
    }
  }

  /**
   * Delete a world event (admin moderation).
   */
  async deleteWorldEvent(eventDocId: string): Promise<boolean> {
    if (!isFirebaseInitialized()) return false;

    try {
      const db = getFirebaseDb();
      await deleteDoc(doc(db, FIRESTORE_PATHS.sharedEventDoc(eventDocId)));
      console.log(`[SharedData] Deleted world event ${eventDocId}`);
      return true;
    } catch (error) {
      console.error('[SharedData] Failed to delete world event:', error);
      return false;
    }
  }
}

// Singleton instance
export const sharedDataService = new SharedDataService();
