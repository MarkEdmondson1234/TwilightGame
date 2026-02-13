/**
 * Diary Service — AI-summarised conversation journal
 *
 * Generates diary-style summaries of NPC conversations and stores them
 * both locally (localStorage) and in Firestore (when available).
 *
 * Key behaviours:
 * - One diary entry per NPC per game day (multiple conversations merge)
 * - AI summary when available, raw transcript fallback when not
 * - localStorage always (for instant journal display)
 * - Firestore when authenticated (for cross-device persistence)
 */

import { generateResponse, isAIAvailable } from './anthropicClient';
import { TimeManager } from '../utils/TimeManager';
import type { DiaryEntryDoc } from '../firebase/types';

const DIARY_STORAGE_KEY = 'diary_entries';
const MAX_RAW_EXCHANGE_LENGTH = 3000; // Cap raw text to avoid huge localStorage entries

// ============================================
// Types
// ============================================

export interface DiaryEntry extends DiaryEntryDoc {
  // DiaryEntryDoc has all the fields we need
}

// ============================================
// localStorage Operations
// ============================================

/**
 * Get all diary entries from localStorage
 */
export function getDiaryEntries(): DiaryEntry[] {
  try {
    const stored = localStorage.getItem(DIARY_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as DiaryEntry[];
  } catch (error) {
    console.warn('[Diary] Failed to load diary entries:', error);
    return [];
  }
}

/**
 * Get diary entries for a specific NPC
 */
export function getDiaryEntriesForNPC(npcId: string): DiaryEntry[] {
  return getDiaryEntries().filter((e) => e.npcId === npcId);
}

/**
 * Save diary entries to localStorage
 */
function saveDiaryEntries(entries: DiaryEntry[]): void {
  try {
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('[Diary] Failed to save diary entries:', error);
  }
}

/**
 * Get the entry ID for a given NPC and game day
 */
function getEntryId(npcId: string, totalDays: number): string {
  return `${npcId}_${totalDays}`;
}

// ============================================
// Firestore Operations (best-effort)
// ============================================

/**
 * Save a diary entry to Firestore (non-blocking, best-effort)
 */
async function saveToFirestore(entry: DiaryEntry): Promise<void> {
  try {
    // Dynamic import to avoid crashing when firebase isn't installed
    const { getFirebaseDb, getFirebaseAuth } = await import('../firebase/config');
    const { doc, setDoc } = await import('firebase/firestore');

    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) return;

    const db = getFirebaseDb();
    const entryId = getEntryId(entry.npcId, entry.totalDays);
    const docRef = doc(db, `users/${user.uid}/diary/${entryId}`);

    // Save without the local-only fields, using Firestore-friendly data
    await setDoc(docRef, {
      npcId: entry.npcId,
      npcName: entry.npcName,
      totalDays: entry.totalDays,
      season: entry.season,
      day: entry.day,
      year: entry.year,
      summary: entry.summary,
      isAISummary: entry.isAISummary,
      exchanges: entry.exchanges,
      rawExchanges: entry.rawExchanges,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });

    console.log(`[Diary] Saved to Firestore: ${entryId}`);
  } catch {
    // Non-fatal — localStorage is the primary store for display
  }
}

/**
 * Load all diary entries from Firestore (for sync on login)
 */
export async function loadDiaryFromFirestore(): Promise<DiaryEntry[]> {
  try {
    const { getFirebaseDb, getFirebaseAuth } = await import('../firebase/config');
    const { collection, getDocs, orderBy, query } = await import('firebase/firestore');

    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) return [];

    const db = getFirebaseDb();
    const diaryRef = collection(db, `users/${user.uid}/diary`);
    const q = query(diaryRef, orderBy('totalDays', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => doc.data() as DiaryEntry);
  } catch {
    return [];
  }
}

/**
 * Merge Firestore diary entries into localStorage (union by entryId)
 */
export async function syncDiaryFromFirestore(): Promise<void> {
  const remote = await loadDiaryFromFirestore();
  if (remote.length === 0) return;

  const local = getDiaryEntries();
  const localMap = new Map(local.map((e) => [getEntryId(e.npcId, e.totalDays), e]));

  let added = 0;
  let updated = 0;

  for (const remoteEntry of remote) {
    const id = getEntryId(remoteEntry.npcId, remoteEntry.totalDays);
    const existing = localMap.get(id);

    if (!existing) {
      localMap.set(id, remoteEntry);
      added++;
    } else if (remoteEntry.updatedAt > existing.updatedAt) {
      // Remote is newer — use it
      localMap.set(id, remoteEntry);
      updated++;
    }
  }

  if (added > 0 || updated > 0) {
    saveDiaryEntries(Array.from(localMap.values()));
    console.log(`[Diary] Synced from Firestore: ${added} added, ${updated} updated`);
  }
}

// ============================================
// AI Summary Generation
// ============================================

/**
 * Generate a diary-style summary of conversation exchanges using AI
 */
async function generateDiarySummary(
  npcName: string,
  playerName: string,
  rawExchanges: string
): Promise<string | null> {
  if (!isAIAvailable()) return null;

  const prompt = `You are writing a diary entry for a player in a cosy village game.
Summarise this conversation in 2-4 sentences, written from the player's perspective as a personal diary entry.
Use past tense. Be warm and natural. Include key topics discussed and any notable moments.
Use British English spelling.

CONVERSATION WITH ${npcName}:
${rawExchanges}

Write the diary entry (no header, just the text):`;

  try {
    const response = await generateResponse(
      'You are a diary entry writer. Write concise, warm diary entries in British English.',
      [],
      prompt
    );

    if (response.error || !response.text.trim()) return null;

    // Strip any suggestion lines the API might add
    const lines = response.text
      .split('\n')
      .filter((l) => !l.startsWith('>'))
      .join(' ')
      .trim();

    return lines || null;
  } catch (error) {
    console.warn('[Diary] AI summary generation failed:', error);
    return null;
  }
}

/**
 * Build a raw transcript string from player/NPC exchange
 */
function formatRawExchange(
  playerName: string,
  playerSaid: string,
  npcName: string,
  npcSaid: string
): string {
  return `${playerName}: "${playerSaid}"\n${npcName}: "${npcSaid}"`;
}

// ============================================
// Main API
// ============================================

/**
 * Record a conversation exchange in the diary.
 * Called after each AI conversation exchange completes.
 *
 * - Groups by NPC + game day (one entry per NPC per day)
 * - Generates AI summary if available, falls back to raw transcript
 * - Saves to localStorage immediately, Firestore in background
 *
 * @param npcId - NPC identifier
 * @param npcName - NPC display name
 * @param playerName - Player's character name
 * @param playerSaid - What the player said
 * @param npcSaid - What the NPC responded
 */
export async function recordConversation(
  npcId: string,
  npcName: string,
  playerName: string,
  playerSaid: string,
  npcSaid: string
): Promise<void> {
  const gameTime = TimeManager.getCurrentTime();
  const now = Date.now();
  const entryId = getEntryId(npcId, gameTime.totalDays);

  // Build the new exchange text
  const newExchange = formatRawExchange(playerName, playerSaid, npcName, npcSaid);

  // Check for existing entry today for this NPC
  const entries = getDiaryEntries();
  const existingIndex = entries.findIndex(
    (e) => e.npcId === npcId && e.totalDays === gameTime.totalDays
  );

  let entry: DiaryEntry;

  if (existingIndex >= 0) {
    // Update existing entry — append new exchange and re-summarise
    entry = { ...entries[existingIndex] };
    entry.rawExchanges = (entry.rawExchanges + '\n\n' + newExchange).slice(
      -MAX_RAW_EXCHANGE_LENGTH
    );
    entry.exchanges += 1;
    entry.updatedAt = now;
  } else {
    // Create new entry
    entry = {
      npcId,
      npcName,
      totalDays: gameTime.totalDays,
      season: gameTime.season,
      day: gameTime.day,
      year: gameTime.year,
      summary: '', // Will be filled below
      isAISummary: false,
      exchanges: 1,
      rawExchanges: newExchange.slice(-MAX_RAW_EXCHANGE_LENGTH),
      createdAt: now,
      updatedAt: now,
    };
  }

  // Try AI summary, fall back to raw transcript
  const aiSummary = await generateDiarySummary(npcName, playerName, entry.rawExchanges);

  if (aiSummary) {
    entry.summary = aiSummary;
    entry.isAISummary = true;
  } else {
    // Fallback: build a simple transcript summary
    entry.summary = entry.rawExchanges;
    entry.isAISummary = false;
  }

  // Save to localStorage
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  saveDiaryEntries(entries);

  console.log(
    `[Diary] ${existingIndex >= 0 ? 'Updated' : 'Created'} entry: ${entryId} (AI: ${entry.isAISummary}, exchanges: ${entry.exchanges})`
  );

  // Save to Firestore in background (non-blocking)
  saveToFirestore(entry).catch(() => {});
}

/**
 * Record a scripted (non-AI) dialogue exchange.
 * Always stores as raw transcript since there's no AI to summarise.
 */
export async function recordScriptedConversation(
  npcId: string,
  npcName: string,
  playerName: string,
  playerSaid: string,
  npcSaid: string
): Promise<void> {
  const gameTime = TimeManager.getCurrentTime();
  const now = Date.now();

  const newExchange = formatRawExchange(playerName, playerSaid, npcName, npcSaid);

  const entries = getDiaryEntries();
  const existingIndex = entries.findIndex(
    (e) => e.npcId === npcId && e.totalDays === gameTime.totalDays
  );

  let entry: DiaryEntry;

  if (existingIndex >= 0) {
    entry = { ...entries[existingIndex] };
    entry.rawExchanges = (entry.rawExchanges + '\n\n' + newExchange).slice(
      -MAX_RAW_EXCHANGE_LENGTH
    );
    entry.exchanges += 1;
    entry.updatedAt = now;
    // Keep existing summary type — if it was AI from an earlier AI conversation, keep it
    // Otherwise rebuild the transcript
    if (!entry.isAISummary) {
      entry.summary = entry.rawExchanges;
    }
  } else {
    entry = {
      npcId,
      npcName,
      totalDays: gameTime.totalDays,
      season: gameTime.season,
      day: gameTime.day,
      year: gameTime.year,
      summary: newExchange,
      isAISummary: false,
      exchanges: 1,
      rawExchanges: newExchange.slice(-MAX_RAW_EXCHANGE_LENGTH),
      createdAt: now,
      updatedAt: now,
    };
  }

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  saveDiaryEntries(entries);

  // Save to Firestore in background
  saveToFirestore(entry).catch(() => {});
}
