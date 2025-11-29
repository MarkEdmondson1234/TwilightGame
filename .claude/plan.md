# Friendship System Implementation Plan

## Overview

Implement the friendship system as described in `design_docs/planned/system_friendship.md`. This is a foundational system that will unlock quests, dialogue variations, and NPC behaviours.

## Design Decisions

### Friendship Scale
- **Points-based internally**: 0-900 points (100 points per level)
- **Display as levels 1-9**: `Math.floor(points / 100) + 1`
- **Tiers**:
  - Stranger (1-3): 0-299 points
  - Acquaintance (4-6): 300-599 points
  - Good Friend (7-9): 600-900 points

### Point Values (per design doc)
- Talk daily: +100 points (1 level worth)
- Give food: +100 points
- Give liked food: +300 points
- Complete quest: +300 points

### Special Friend Status
- Boolean flag, unlocked through crisis events
- Tracked separately from friendship points

---

## Implementation Steps

### Phase 1: Core Data Structures

**1.1 Add types to `types.ts`**
```typescript
export interface NPCFriendship {
  npcId: string;
  points: number;              // 0-900
  lastTalkedDay: number;       // Game day of last interaction
  isSpecialFriend: boolean;    // Unlocked through crisis events
  crisisCompleted?: string;    // Which crisis event was completed
}

export type FriendshipTier = 'stranger' | 'acquaintance' | 'good_friend';
```

**1.2 Add NPC metadata to existing NPCs**
```typescript
// Add to NPC interface in types.ts
export interface NPC {
  // ... existing fields
  friendshipConfig?: {
    canBefriend: boolean;       // Can this NPC be befriended?
    startingPoints: number;     // Initial friendship (0 for strangers, 900 for family)
    likedFoodTypes?: string[];  // Food categories they like
    crisisId?: string;          // ID of their crisis event
  };
}
```

### Phase 2: FriendshipManager

**2.1 Create `utils/FriendshipManager.ts`**
- Singleton class following NPCManager pattern
- Methods:
  - `getFriendship(npcId): NPCFriendship`
  - `getFriendshipTier(npcId): FriendshipTier`
  - `getFriendshipLevel(npcId): number` (1-9)
  - `addPoints(npcId, amount, reason): void`
  - `recordDailyTalk(npcId): boolean` (returns false if already talked today)
  - `giveGift(npcId, itemId): { points: number, reaction: string }`
  - `setSpecialFriend(npcId, crisisId): void`
  - `isSpecialFriend(npcId): boolean`
  - `canUnlockDialogue(npcId, requiredTier): boolean`

### Phase 3: GameState Integration

**3.1 Extend `GameState.ts`**
```typescript
// Add to GameState interface
relationships: {
  npcFriendships: NPCFriendship[];
};
```

**3.2 Add persistence methods**
- `saveFriendships(friendships: NPCFriendship[]): void`
- `loadFriendships(): NPCFriendship[]`
- Migration for existing saves (add empty relationships)

### Phase 4: Dialogue Integration

**4.1 Extend dialogue system**
- Add friendship context to `dialogueHandlers.ts`
- Award +100 points on first daily talk
- Track which day player last talked to NPC

**4.2 Add friendship-gated dialogue**
```typescript
// Add to DialogueNode in types.ts
export interface DialogueNode {
  // ... existing fields
  requiredFriendshipTier?: FriendshipTier;  // Only show if friendship >= tier
  requiredSpecialFriend?: boolean;           // Only show if special friend
}
```

### Phase 5: Gift System

**5.1 Add gift preferences to NPCs**
Update NPC factories with `likedFoodTypes`:
- Shopkeeper: `['savoury']`
- Village Child (Celia): `['dessert']`
- Old Man (Jebediah): `['baked']`
- Old Woman (Althea): `['baked']`
- Mother: `['any']` (accepts all food)

**5.2 Create gift giving mechanic**
- New dialogue option: "Give gift" when holding food item
- Calculate points based on preference
- Show NPC reaction dialogue

### Phase 6: UI Components

**6.1 Friendship indicator (optional, can defer)**
- Show friendship hearts when talking to NPC
- Small heart icon in dialogue box header
- Could use: ♡ (empty) ♥ (filled)

**6.2 HUD integration (optional, can defer)**
- Show friendship overview in pause/menu screen
- List all befriendable NPCs with their current tier

### Phase 7: NPC Updates

**7.1 Update existing NPC factories**
Add `friendshipConfig` to:
- `createMumNPC` - startingPoints: 900 (max)
- `createVillageElderNPC` - startingPoints: 0
- `createOldWomanKnittingNPC` - startingPoints: 0, crisisId: 'old_man_death'
- `createShopkeeperNPC` - startingPoints: 0, likedFoodTypes: ['savoury']
- `createVillageChildNPC` - startingPoints: 0, likedFoodTypes: ['dessert'], crisisId: 'mother_illness'

**7.2 Add friendship-based dialogue variations**
- Add `requiredFriendshipTier` to certain dialogue nodes
- Create new dialogue branches unlocked at Acquaintance/Good Friend levels

---

## Files to Create
1. `utils/FriendshipManager.ts` - Core friendship logic

## Files to Modify
1. `types.ts` - Add NPCFriendship, extend NPC and DialogueNode
2. `GameState.ts` - Add relationships persistence
3. `utils/dialogueHandlers.ts` - Award friendship points on talk
4. `utils/npcFactories.ts` - Add friendshipConfig to NPCs
5. `components/DialogueBox.tsx` - Show friendship indicator (optional)

---

## Testing Plan

1. **Unit tests** (manual verification):
   - Create new game → Mum starts at level 9
   - Talk to village elder → Gains friendship points
   - Talk again same day → No additional points
   - Advance day → Can gain points again

2. **Integration tests**:
   - Save/load game preserves friendship
   - Friendship-gated dialogue only shows at correct tier
   - Gift giving awards correct points

---

## Future Considerations (not in scope)

- Food/gift item system (needs cooking/inventory integration)
- Crisis events (needs quest system)
- Special Friend status unlocking (needs event triggers)
- Father NPC (appears in Year 2)

---

## Estimated Scope

**Core implementation (Phases 1-4)**: Foundation system
**Gift system (Phase 5)**: Requires food items to exist
**UI (Phase 6)**: Nice to have, can defer
**NPC updates (Phase 7)**: Can do incrementally

**Recommended start**: Phases 1-4 (core system + dialogue integration)
