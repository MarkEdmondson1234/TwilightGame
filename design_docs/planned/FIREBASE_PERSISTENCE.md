# Firebase Persistence Design Document

## Overview

This document outlines the architecture for adding cloud persistence to TwilightGame using Firebase Authentication and Firestore, enabling cross-device save synchronisation and secure player data storage.

## Goals

1. **User Authentication**: Allow players to create accounts and sign in
2. **Cloud Saves**: Persist game state to Firestore
3. **Offline Support**: Continue working offline with local cache, sync when online
4. **Migration Path**: Seamlessly migrate existing localStorage saves to cloud
5. **Multi-device**: Play on any device with the same account

---

## Part 1: Google Cloud & Firebase Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: `twilight-game` (or similar)
3. Note the Project ID (e.g., `twilight-game-12345`)

### 1.2 Enable Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" → Select your GCP project
3. Enable Google Analytics (optional, but useful for player metrics)

### 1.3 Enable Required Services

**Authentication:**
- Firebase Console → Authentication → Get started
- Enable sign-in providers:
  - **Email/Password** (essential)
  - **Google** (recommended for easy sign-in)
  - **Anonymous** (for "try before you sign up")

**Firestore:**
- Firebase Console → Firestore Database → Create database
- Start in **production mode** (we'll configure rules)
- Choose region: `europe-west2` (London) for UK players

### 1.4 Firebase Web SDK Setup

```bash
npm install firebase
```

Create `firebase/config.ts`:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  console.warn('[Firebase] Offline persistence failed:', err.code);
});
```

Create `.env.local` (not committed to git):
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## Part 2: Firestore Data Model

### 2.1 Collection Structure

```
firestore/
├── users/
│   └── {userId}/
│       ├── profile                 # User profile document
│       │   ├── displayName
│       │   ├── email
│       │   ├── createdAt
│       │   └── lastLoginAt
│       │
│       └── saves/                  # Subcollection for save slots
│           └── {saveSlotId}/       # e.g., "slot_1", "slot_2", "slot_3"
│               ├── metadata        # Save metadata (for list view)
│               │   ├── characterName
│               │   ├── playTime
│               │   ├── lastSaved
│               │   ├── currentMapId
│               │   └── gameDay
│               │
│               └── data            # Actual game state (subcollection)
│                   ├── character
│                   ├── inventory
│                   ├── farming
│                   ├── cooking
│                   ├── magic
│                   ├── friendships
│                   ├── quests
│                   ├── world       # weather, placedItems, etc.
│                   └── stats
```

### 2.2 Document Schemas

**users/{userId}/profile**
```typescript
interface UserProfile {
  displayName: string;
  email: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    preferredLanguage: string;
  };
}
```

**users/{userId}/saves/{slotId}/metadata**
```typescript
interface SaveMetadata {
  characterName: string;
  characterId: string;  // For showing character sprite in UI
  playTimeSeconds: number;
  lastSaved: Timestamp;
  currentMapId: string;
  gameDay: number;
  season: string;
  year: number;
  gold: number;
  version: string;  // Game version for migration
}
```

**users/{userId}/saves/{slotId}/data/character**
```typescript
// Maps directly to CharacterCustomization + position
interface CharacterData {
  customization: CharacterCustomization;
  position: { x: number; y: number };
  currentMapId: string;
  currentMapSeed?: number;
}
```

**users/{userId}/saves/{slotId}/data/inventory**
```typescript
interface InventoryData {
  items: Array<{ itemId: string; quantity: number }>;
  tools: string[];
  slotOrder?: string[];
}
```

**users/{userId}/saves/{slotId}/data/farming**
```typescript
interface FarmingData {
  plots: FarmPlot[];
  currentTool: 'hoe' | 'seeds' | 'wateringCan' | 'hand';
  selectedSeed: string | null;
}
```

**users/{userId}/saves/{slotId}/data/cooking**
```typescript
interface CookingData {
  recipeBookUnlocked: boolean;
  unlockedRecipes: string[];
  recipeProgress: Record<string, RecipeProgress>;
}
```

**users/{userId}/saves/{slotId}/data/friendships**
```typescript
interface FriendshipsData {
  npcFriendships: NPCFriendship[];
}
```

**users/{userId}/saves/{slotId}/data/quests**
```typescript
interface QuestsData {
  [questId: string]: {
    started: boolean;
    completed: boolean;
    stage: number;
    data: Record<string, any>;
  };
}
```

**users/{userId}/saves/{slotId}/data/world**
```typescript
interface WorldData {
  weather: WeatherType;
  automaticWeather: boolean;
  weatherDriftSpeed: number;
  placedItems: PlacedItem[];
  deskContents: DeskContents[];
  forageCooldowns: Record<string, number>;
  cutscenes: { completed: string[]; lastSeasonTriggered?: string };
}
```

**users/{userId}/saves/{slotId}/data/stats**
```typescript
interface StatsData {
  gold: number;
  forestDepth: number;
  caveDepth: number;
  statusEffects: StatusEffects;
  wateringCan: { currentLevel: number };
  movementEffect: MovementEffect | null;
  transformations: Transformations;
  activePotionEffects: Record<string, PotionEffect>;
  playerDisguise: PlayerDisguise | null;
  dailyResourceCollections: Record<string, DailyCollection>;
  gamesPlayed: number;
  totalPlayTime: number;
  mushroomsCollected: number;
}
```

### 2.3 Why Subcollections?

Using subcollections (`data/character`, `data/inventory`, etc.) instead of a single document:

1. **Document Size Limit**: Firestore documents max at 1MB. Large inventories or many farm plots could approach this.
2. **Partial Updates**: Save only changed sections, reducing write costs
3. **Bandwidth**: Load only what's needed (e.g., character preview without full inventory)
4. **Concurrent Writes**: Avoid conflicts when different systems save simultaneously

---

## Part 3: Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Profile document
      match /profile {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Save slots
      match /saves/{slotId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Save data subcollection
        match /data/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }

    // Deny all other access by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Part 4: Authentication Flow

### 4.1 Auth Service (`firebase/authService.ts`)

```typescript
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export class AuthService {
  private currentUser: User | null = null;
  private listeners: Set<(user: User | null) => void> = new Set();

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.notifyListeners();
    });
  }

  // Subscribe to auth state changes
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  // Email/password sign up
  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await this.createUserProfile(user, displayName);
    return user;
  }

  // Email/password sign in
  async signIn(email: string, password: string): Promise<User> {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await this.updateLastLogin(user.uid);
    return user;
  }

  // Google sign in
  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    await this.createUserProfile(user, user.displayName || 'Player');
    return user;
  }

  // Anonymous sign in (play without account)
  async signInAnonymously(): Promise<User> {
    const { user } = await signInAnonymously(auth);
    return user;
  }

  // Convert anonymous account to permanent
  async linkAnonymousAccount(email: string, password: string): Promise<User> {
    if (!this.currentUser?.isAnonymous) {
      throw new Error('Current user is not anonymous');
    }
    const credential = EmailAuthProvider.credential(email, password);
    const { user } = await linkWithCredential(this.currentUser, credential);
    await this.createUserProfile(user, email.split('@')[0]);
    return user;
  }

  // Sign out
  async signOut(): Promise<void> {
    await signOut(auth);
  }

  // Create user profile document
  private async createUserProfile(user: User, displayName: string): Promise<void> {
    const profileRef = doc(db, 'users', user.uid, 'profile');
    await setDoc(profileRef, {
      displayName,
      email: user.email,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      settings: {
        musicVolume: 0.7,
        sfxVolume: 1.0,
        preferredLanguage: 'en-GB',
      },
    }, { merge: true });
  }

  private async updateLastLogin(userId: string): Promise<void> {
    const profileRef = doc(db, 'users', userId, 'profile');
    await setDoc(profileRef, {
      lastLoginAt: serverTimestamp(),
    }, { merge: true });
  }

  getUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isAnonymous(): boolean {
    return this.currentUser?.isAnonymous ?? false;
  }
}

export const authService = new AuthService();
```

### 4.2 UI Components

**Login Screen Component** (`components/auth/LoginScreen.tsx`):
- Email/password form
- "Sign in with Google" button
- "Play as Guest" button (anonymous auth)
- "Create Account" link

**Account Upgrade Modal** (`components/auth/UpgradeAccountModal.tsx`):
- Shown to anonymous users when they try to access cloud saves
- Allows converting to permanent account

---

## Part 5: Cloud Save Service

### 5.1 CloudSaveService (`firebase/cloudSaveService.ts`)

```typescript
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';
import { authService } from './authService';
import { GameState } from '../GameState';

export interface SaveSlot {
  id: string;
  metadata: SaveMetadata;
}

export interface SaveMetadata {
  characterName: string;
  characterId: string;
  playTimeSeconds: number;
  lastSaved: Timestamp;
  currentMapId: string;
  gameDay: number;
  season: string;
  year: number;
  gold: number;
  version: string;
}

export class CloudSaveService {
  private readonly GAME_VERSION = '1.0.0';

  // Get all save slots for current user
  async getSaveSlots(): Promise<SaveSlot[]> {
    const user = authService.getUser();
    if (!user) throw new Error('Not authenticated');

    const savesRef = collection(db, 'users', user.uid, 'saves');
    const snapshot = await getDocs(savesRef);

    const slots: SaveSlot[] = [];
    for (const doc of snapshot.docs) {
      const metadataDoc = await getDoc(
        doc(db, 'users', user.uid, 'saves', doc.id, 'metadata')
      );
      if (metadataDoc.exists()) {
        slots.push({
          id: doc.id,
          metadata: metadataDoc.data() as SaveMetadata,
        });
      }
    }

    return slots.sort((a, b) =>
      b.metadata.lastSaved.toMillis() - a.metadata.lastSaved.toMillis()
    );
  }

  // Save game state to a slot
  async saveGame(slotId: string, state: GameState, playTime: number): Promise<void> {
    const user = authService.getUser();
    if (!user) throw new Error('Not authenticated');

    const batch = writeBatch(db);
    const basePath = `users/${user.uid}/saves/${slotId}`;

    // Save metadata
    const metadata: SaveMetadata = {
      characterName: state.selectedCharacter?.name || 'Unknown',
      characterId: state.selectedCharacter?.characterId || 'character1',
      playTimeSeconds: playTime,
      lastSaved: serverTimestamp() as Timestamp,
      currentMapId: state.player.currentMapId,
      gameDay: state.lastKnownTime?.day || 1,
      season: state.lastKnownTime?.season || 'spring',
      year: state.lastKnownTime?.year || 1,
      gold: state.gold,
      version: this.GAME_VERSION,
    };
    batch.set(doc(db, basePath, 'metadata'), metadata);

    // Save character data
    batch.set(doc(db, basePath, 'data', 'character'), {
      customization: state.selectedCharacter,
      position: state.player.position,
      currentMapId: state.player.currentMapId,
      currentMapSeed: state.player.currentMapSeed,
    });

    // Save inventory
    batch.set(doc(db, basePath, 'data', 'inventory'), {
      items: state.inventory.items,
      tools: state.inventory.tools,
    });

    // Save farming
    batch.set(doc(db, basePath, 'data', 'farming'), {
      plots: state.farming.plots,
      currentTool: state.farming.currentTool,
      selectedSeed: state.farming.selectedSeed,
    });

    // Save cooking
    batch.set(doc(db, basePath, 'data', 'cooking'), state.cooking);

    // Save magic (if exists)
    if (state.magic) {
      batch.set(doc(db, basePath, 'data', 'magic'), state.magic);
    }

    // Save friendships
    batch.set(doc(db, basePath, 'data', 'friendships'), {
      npcFriendships: state.relationships.npcFriendships,
    });

    // Save quests
    batch.set(doc(db, basePath, 'data', 'quests'), state.quests);

    // Save world state
    batch.set(doc(db, basePath, 'data', 'world'), {
      weather: state.weather,
      automaticWeather: state.automaticWeather,
      weatherDriftSpeed: state.weatherDriftSpeed,
      placedItems: state.placedItems,
      deskContents: state.deskContents,
      forageCooldowns: state.forageCooldowns,
      cutscenes: state.cutscenes,
    });

    // Save stats
    batch.set(doc(db, basePath, 'data', 'stats'), {
      gold: state.gold,
      forestDepth: state.forestDepth,
      caveDepth: state.caveDepth,
      statusEffects: state.statusEffects,
      wateringCan: state.wateringCan,
      movementEffect: state.movementEffect,
      transformations: state.transformations,
      activePotionEffects: state.activePotionEffects,
      playerDisguise: state.playerDisguise,
      dailyResourceCollections: state.dailyResourceCollections,
      gamesPlayed: state.stats.gamesPlayed,
      totalPlayTime: state.stats.totalPlayTime,
      mushroomsCollected: state.stats.mushroomsCollected,
    });

    await batch.commit();
    console.log(`[CloudSave] Saved to slot ${slotId}`);
  }

  // Load game state from a slot
  async loadGame(slotId: string): Promise<GameState> {
    const user = authService.getUser();
    if (!user) throw new Error('Not authenticated');

    const basePath = `users/${user.uid}/saves/${slotId}/data`;

    // Load all documents in parallel
    const [
      characterDoc,
      inventoryDoc,
      farmingDoc,
      cookingDoc,
      magicDoc,
      friendshipsDoc,
      questsDoc,
      worldDoc,
      statsDoc,
    ] = await Promise.all([
      getDoc(doc(db, basePath, 'character')),
      getDoc(doc(db, basePath, 'inventory')),
      getDoc(doc(db, basePath, 'farming')),
      getDoc(doc(db, basePath, 'cooking')),
      getDoc(doc(db, basePath, 'magic')),
      getDoc(doc(db, basePath, 'friendships')),
      getDoc(doc(db, basePath, 'quests')),
      getDoc(doc(db, basePath, 'world')),
      getDoc(doc(db, basePath, 'stats')),
    ]);

    // Reconstruct GameState
    const character = characterDoc.data();
    const inventory = inventoryDoc.data();
    const farming = farmingDoc.data();
    const cooking = cookingDoc.data();
    const magic = magicDoc.exists() ? magicDoc.data() : undefined;
    const friendships = friendshipsDoc.data();
    const quests = questsDoc.data();
    const world = worldDoc.data();
    const stats = statsDoc.data();

    return {
      selectedCharacter: character?.customization || null,
      gold: stats?.gold || 0,
      forestDepth: stats?.forestDepth || 0,
      caveDepth: stats?.caveDepth || 0,
      player: {
        currentMapId: character?.currentMapId || 'village',
        position: character?.position || { x: 15, y: 25 },
        currentMapSeed: character?.currentMapSeed,
      },
      inventory: {
        items: inventory?.items || [],
        tools: inventory?.tools || [],
      },
      farming: {
        plots: farming?.plots || [],
        currentTool: farming?.currentTool || 'hand',
        selectedSeed: farming?.selectedSeed || null,
      },
      crafting: { unlockedRecipes: [], materials: {} },
      stats: {
        gamesPlayed: stats?.gamesPlayed || 0,
        totalPlayTime: stats?.totalPlayTime || 0,
        mushroomsCollected: stats?.mushroomsCollected || 0,
      },
      weather: world?.weather || 'clear',
      automaticWeather: world?.automaticWeather ?? true,
      nextWeatherCheckTime: 0,
      weatherDriftSpeed: world?.weatherDriftSpeed || 1.0,
      cutscenes: world?.cutscenes || { completed: [] },
      relationships: { npcFriendships: friendships?.npcFriendships || [] },
      placedItems: world?.placedItems || [],
      deskContents: world?.deskContents || [],
      cooking: cooking || { recipeBookUnlocked: false, unlockedRecipes: ['tea'], recipeProgress: {} },
      magic: magic,
      statusEffects: stats?.statusEffects || {
        feelingSick: false,
        stamina: 100,
        maxStamina: 100,
        lastStaminaUpdate: Date.now(),
      },
      wateringCan: stats?.wateringCan || { currentLevel: 8 },
      dailyResourceCollections: stats?.dailyResourceCollections || {},
      forageCooldowns: world?.forageCooldowns || {},
      movementEffect: stats?.movementEffect || null,
      transformations: stats?.transformations || { isFairyForm: false, fairyFormExpiresAt: null },
      quests: quests || {},
      activePotionEffects: stats?.activePotionEffects || {},
      playerDisguise: stats?.playerDisguise || null,
    } as GameState;
  }

  // Delete a save slot
  async deleteSave(slotId: string): Promise<void> {
    const user = authService.getUser();
    if (!user) throw new Error('Not authenticated');

    const batch = writeBatch(db);
    const basePath = `users/${user.uid}/saves/${slotId}`;

    // Delete all data documents
    const dataTypes = ['character', 'inventory', 'farming', 'cooking', 'magic',
                       'friendships', 'quests', 'world', 'stats'];
    for (const type of dataTypes) {
      batch.delete(doc(db, basePath, 'data', type));
    }
    batch.delete(doc(db, basePath, 'metadata'));

    await batch.commit();
    console.log(`[CloudSave] Deleted slot ${slotId}`);
  }
}

export const cloudSaveService = new CloudSaveService();
```

---

## Part 6: Hybrid Save System

### 6.1 Save Strategy

The game will support **both** local and cloud saves:

1. **Offline-first**: Always save to localStorage first
2. **Sync on demand**: Upload to cloud when player explicitly saves
3. **Auto-sync**: Optionally sync every N minutes when online
4. **Conflict resolution**: Cloud timestamp wins (most recent)

### 6.2 Integration with GameState

Modify `GameState.ts` to support cloud sync:

```typescript
// Add to GameStateManager class

async syncToCloud(slotId: string): Promise<void> {
  if (!authService.isAuthenticated()) {
    console.warn('[GameState] Cannot sync - not authenticated');
    return;
  }

  try {
    await cloudSaveService.saveGame(slotId, this.state, this.state.stats.totalPlayTime);
    console.log('[GameState] Synced to cloud');
  } catch (error) {
    console.error('[GameState] Cloud sync failed:', error);
    throw error;
  }
}

async loadFromCloud(slotId: string): Promise<void> {
  if (!authService.isAuthenticated()) {
    throw new Error('Not authenticated');
  }

  const cloudState = await cloudSaveService.loadGame(slotId);
  this.state = cloudState;
  this.saveState(); // Cache locally
  this.notify();
}
```

### 6.3 Migration from localStorage

When a user signs in for the first time, offer to migrate their local save:

```typescript
async migrateLocalSaveToCloud(targetSlotId: string): Promise<void> {
  const localSave = localStorage.getItem('twilight_game_state');
  if (!localSave) {
    console.log('[Migration] No local save to migrate');
    return;
  }

  const state = JSON.parse(localSave);
  await cloudSaveService.saveGame(targetSlotId, state, state.stats?.totalPlayTime || 0);

  console.log('[Migration] Local save migrated to cloud');
}
```

---

## Part 7: UI Components

### 7.1 Main Menu Flow

```
┌─────────────────────────────────────────┐
│           TWILIGHT GAME                 │
│                                         │
│   [Continue]  ← Last played save        │
│   [Load Game] ← Save slot selection     │
│   [New Game]  ← Create new character    │
│   [Settings]                            │
│                                         │
│   ─────────────────────────────────     │
│                                         │
│   [Sign In]   ← If not logged in        │
│   [Account]   ← If logged in            │
│                                         │
└─────────────────────────────────────────┘
```

### 7.2 Save Slot Screen

```
┌─────────────────────────────────────────┐
│         SELECT SAVE SLOT                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🧙 Willow  │ Day 45 │ Spring Y2 │    │
│  │ Village   │ 1,234g │ 12h 34m   │    │
│  │ Last saved: 2 hours ago        │    │
│  │ ☁️ Synced                       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🧝 Oak     │ Day 12 │ Summer Y1 │    │
│  │ Forest    │ 567g   │ 3h 21m    │    │
│  │ Last saved: Yesterday          │    │
│  │ ☁️ Synced                       │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │         + New Save Slot        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Back]                                 │
└─────────────────────────────────────────┘
```

### 7.3 Required Components

1. **LoginScreen.tsx** - Authentication UI
2. **SaveSlotScreen.tsx** - Save slot management
3. **SaveSlotCard.tsx** - Individual save slot display
4. **SyncIndicator.tsx** - Cloud sync status (HUD element)
5. **MigrationModal.tsx** - Prompt to migrate local saves
6. **AccountSettings.tsx** - Manage account, link accounts

---

## Part 8: Implementation Plan

### Phase 1: Foundation
1. Create Google Cloud project and configure Firebase
2. Install Firebase SDK
3. Create `firebase/config.ts` with credentials
4. Set up Firestore security rules
5. Create `AuthService` with basic email/password auth

### Phase 2: Cloud Save Service
1. Implement `CloudSaveService` with save/load/delete
2. Create Firestore data model (all document types)
3. Add save slot metadata for UI
4. Write migration utility for localStorage → Firestore

### Phase 3: GameState Integration
1. Add `syncToCloud()` and `loadFromCloud()` to GameState
2. Implement hybrid save strategy (local + cloud)
3. Add conflict detection and resolution
4. Create `SyncIndicator` component for HUD

### Phase 4: UI Components
1. Build `LoginScreen` component
2. Build `SaveSlotScreen` and `SaveSlotCard`
3. Build `MigrationModal` for first-time users
4. Integrate into main menu flow

### Phase 5: Polish
1. Add Google sign-in
2. Add anonymous → permanent account conversion
3. Add auto-sync option (every 5 minutes)
4. Error handling and offline resilience
5. Testing across devices

---

## Part 9: Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `firebase/config.ts` | Firebase initialisation |
| `firebase/authService.ts` | Authentication logic |
| `firebase/cloudSaveService.ts` | Save/load from Firestore |
| `components/auth/LoginScreen.tsx` | Login UI |
| `components/auth/AccountSettings.tsx` | Account management |
| `components/saves/SaveSlotScreen.tsx` | Save slot selection |
| `components/saves/SaveSlotCard.tsx` | Individual slot card |
| `components/saves/MigrationModal.tsx` | localStorage migration |
| `components/hud/SyncIndicator.tsx` | Cloud sync status |
| `.env.local` | Firebase credentials (not committed) |
| `.env.example` | Template for credentials |

### Modified Files

| File | Changes |
|------|---------|
| `GameState.ts` | Add cloud sync methods |
| `App.tsx` | Add auth state handling, main menu flow |
| `package.json` | Add firebase dependency |
| `.gitignore` | Add `.env.local` |
| `vite-env.d.ts` | Add env variable types |

---

## Part 10: Cost Considerations

### Firebase Free Tier (Spark Plan)

| Service | Free Limit | Estimated Usage |
|---------|------------|-----------------|
| Authentication | 10K users/month | Well within |
| Firestore Reads | 50K/day | ~100-500/user/day |
| Firestore Writes | 20K/day | ~10-50/user/day |
| Firestore Storage | 1 GiB | ~1-5 KB/save × 3 slots |

**Conclusion**: Free tier is sufficient for indie game with <10K active users.

### If Scaling Needed (Blaze Plan)

- Firestore: $0.06/100K reads, $0.18/100K writes
- Storage: $0.18/GiB/month
- Auth: Free up to 50K users, then $0.0055/user

---

## Summary

This design provides:
- Secure user authentication (email, Google, anonymous)
- Cloud persistence via Firestore with offline support
- Multiple save slots per user
- Seamless migration from localStorage
- Hybrid local/cloud save strategy
- Cost-effective for small to medium player base

The architecture integrates cleanly with the existing `CharacterData` API and `GameState` patterns.

---

**Created**: 2026-01-31
**Status**: Planned
