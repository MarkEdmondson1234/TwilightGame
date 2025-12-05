/**
 * FriendshipManager - Single Source of Truth for NPC relationships
 *
 * Manages:
 * - Friendship points and levels for each NPC
 * - Daily interaction tracking
 * - Special Friend status
 * - Gift giving and preferences
 *
 * Following SSoT principle from CLAUDE.md
 */

import { NPCFriendship, FriendshipTier, NPC } from '../types';
import { gameState } from '../GameState';
import { TimeManager } from './TimeManager';
import { inventoryManager } from './inventoryManager';
import { getItem, ItemCategory } from '../data/items';
import { RECIPES, NPC_FOOD_PREFERENCES, RecipeCategory } from '../data/recipes';

// Tier reward definitions - items given when reaching a tier with certain NPCs
// Format: { npcId: { tier: [{ itemId, quantity }] } }
const TIER_REWARDS: Record<string, Record<FriendshipTier, Array<{ itemId: string; quantity: number }>>> = {
  // Old Man (Jebediah) gives seeds when you become acquaintances
  'village_elder': {
    'stranger': [],
    'acquaintance': [
      { itemId: 'seed_sunflower', quantity: 3 },
      { itemId: 'seed_pea', quantity: 3 },
      { itemId: 'seed_salad', quantity: 3 },
    ],
    'good_friend': [],
  },
};

// Friendship constants
const POINTS_PER_LEVEL = 100;
const MAX_POINTS = 900; // Level 9
const MIN_POINTS = 0;   // Level 1

// Point thresholds for tiers
const ACQUAINTANCE_THRESHOLD = 300; // Level 4+
const GOOD_FRIEND_THRESHOLD = 600;  // Level 7+

// Point awards
const DAILY_TALK_POINTS = 100;  // +1 level for daily conversation
const GIFT_POINTS = 100;        // +1 level for giving food
const LIKED_GIFT_POINTS = 300;  // +3 levels for giving liked food
const QUEST_POINTS = 300;       // +3 levels for completing a quest

class FriendshipManagerClass {
  private friendships: Map<string, NPCFriendship> = new Map();
  private initialised = false;

  /**
   * Initialise the friendship manager with saved data
   */
  initialise(): void {
    if (this.initialised) return;

    const saved = gameState.loadFriendships();
    saved.forEach(friendship => {
      this.friendships.set(friendship.npcId, friendship);
    });

    this.initialised = true;
    console.log(`[FriendshipManager] Initialised with ${saved.length} friendships`);
  }

  /**
   * Get or create friendship data for an NPC
   */
  getFriendship(npcId: string, npc?: NPC): NPCFriendship {
    let friendship = this.friendships.get(npcId);

    if (!friendship) {
      // Create new friendship with starting points from NPC config
      const startingPoints = npc?.friendshipConfig?.startingPoints ?? 0;
      friendship = {
        npcId,
        points: startingPoints,
        lastTalkedDay: -1, // Never talked
        isSpecialFriend: false,
      };
      this.friendships.set(npcId, friendship);
      this.save();
    }

    return friendship;
  }

  /**
   * Get friendship level (1-9)
   */
  getFriendshipLevel(npcId: string): number {
    const friendship = this.friendships.get(npcId);
    if (!friendship) return 1;
    return Math.floor(friendship.points / POINTS_PER_LEVEL) + 1;
  }

  /**
   * Get friendship tier (stranger/acquaintance/good_friend)
   */
  getFriendshipTier(npcId: string): FriendshipTier {
    const friendship = this.friendships.get(npcId);
    if (!friendship) return 'stranger';

    if (friendship.points >= GOOD_FRIEND_THRESHOLD) return 'good_friend';
    if (friendship.points >= ACQUAINTANCE_THRESHOLD) return 'acquaintance';
    return 'stranger';
  }

  /**
   * Check if player meets a friendship requirement
   */
  meetsFriendshipRequirement(npcId: string, requiredTier?: FriendshipTier, requiresSpecialFriend?: boolean): boolean {
    const friendship = this.friendships.get(npcId);

    // Check special friend requirement
    if (requiresSpecialFriend && (!friendship || !friendship.isSpecialFriend)) {
      return false;
    }

    // Check tier requirement
    if (requiredTier) {
      const currentTier = this.getFriendshipTier(npcId);
      const tierOrder: FriendshipTier[] = ['stranger', 'acquaintance', 'good_friend'];
      const requiredIndex = tierOrder.indexOf(requiredTier);
      const currentIndex = tierOrder.indexOf(currentTier);

      if (currentIndex < requiredIndex) {
        return false;
      }
    }

    return true;
  }

  /**
   * Add friendship points (clamped to valid range)
   * Automatically checks for tier changes and gives rewards
   */
  addPoints(npcId: string, amount: number, reason: string): void {
    const friendship = this.getFriendship(npcId);
    const oldLevel = this.getFriendshipLevel(npcId);
    const oldTier = this.getFriendshipTier(npcId);

    friendship.points = Math.max(MIN_POINTS, Math.min(MAX_POINTS, friendship.points + amount));

    const newLevel = this.getFriendshipLevel(npcId);
    const newTier = this.getFriendshipTier(npcId);

    console.log(`[FriendshipManager] ${npcId}: +${amount} points (${reason}). Now ${friendship.points} points, level ${newLevel}, tier: ${newTier}`);

    // Announce level up
    if (newLevel > oldLevel) {
      console.log(`[FriendshipManager] 🎉 ${npcId} friendship increased to level ${newLevel}!`);
    }

    // Check for tier change and give rewards
    if (newTier !== oldTier) {
      console.log(`[FriendshipManager] 🌟 ${npcId} is now a ${newTier}!`);
      this.giveTierReward(npcId, newTier, friendship);
    }

    this.save();
  }

  /**
   * Give tier reward items when friendship tier changes
   */
  private giveTierReward(npcId: string, tier: FriendshipTier, friendship: NPCFriendship): void {
    const npcRewards = TIER_REWARDS[npcId];
    if (!npcRewards) return;

    const rewards = npcRewards[tier];
    if (!rewards || rewards.length === 0) return;

    // Check if already received this tier's reward
    const rewardKey = `${npcId}_${tier}`;
    if (friendship.rewardsReceived?.includes(rewardKey)) {
      console.log(`[FriendshipManager] Already received ${tier} reward from ${npcId}`);
      return;
    }

    // Give the rewards
    for (const reward of rewards) {
      inventoryManager.addItem(reward.itemId, reward.quantity);
      console.log(`[FriendshipManager] 🎁 Received ${reward.quantity}x ${reward.itemId} from ${npcId}!`);
    }

    // Track that reward was received
    if (!friendship.rewardsReceived) {
      friendship.rewardsReceived = [];
    }
    friendship.rewardsReceived.push(rewardKey);

    // Save inventory
    const inventoryData = inventoryManager.getInventoryData();
    gameState.saveInventory(inventoryData.items, inventoryData.tools);

    console.log(`[FriendshipManager] 🎁 ${npcId} gave you a gift for becoming their ${tier}!`);
  }

  /**
   * Record a daily conversation with an NPC
   * Returns true if points were awarded, false if already talked today
   */
  recordDailyTalk(npcId: string, npc?: NPC): boolean {
    const friendship = this.getFriendship(npcId, npc);
    const currentDay = TimeManager.getCurrentTime().totalDays;

    // Check if already talked today
    if (friendship.lastTalkedDay === currentDay) {
      console.log(`[FriendshipManager] Already talked to ${npcId} today`);
      return false;
    }

    // Record the talk and award points
    friendship.lastTalkedDay = currentDay;
    this.addPoints(npcId, DAILY_TALK_POINTS, 'daily conversation');
    return true;
  }

  /**
   * Give a gift to an NPC
   * Returns the points awarded and a reaction type
   */
  giveGift(npcId: string, itemId: string, npc?: NPC): { points: number; reaction: 'loved' | 'liked' | 'neutral' | 'disliked' } {
    const item = getItem(itemId);
    if (!item) {
      console.warn(`[FriendshipManager] Unknown item: ${itemId}`);
      return { points: 0, reaction: 'neutral' };
    }

    // Check if this is terrible food (starts with "terrible_")
    const isTerrible = itemId.startsWith('terrible_');
    if (isTerrible) {
      const isSpecial = this.isSpecialFriend(npcId);

      if (isSpecial) {
        // Special Friends are understanding and don't lose friendship
        console.log(`[FriendshipManager] 😅 ${npcId} (Special Friend) tries your terrible food but doesn't mind`);
        return { points: 0, reaction: 'neutral' };
      } else {
        // Regular NPCs lose 1 friendship point
        const points = -1;
        this.addPoints(npcId, points, `terrible food gift: ${item.displayName}`);
        console.log(`[FriendshipManager] 😖 ${npcId} is disgusted by your terrible food (-1 point)`);
        return { points, reaction: 'disliked' };
      }
    }

    // Check if this is a food item
    if (item.category === ItemCategory.FOOD) {
      // Find which recipe produces this food to get its category
      const recipeCategory = this.getFoodRecipeCategory(itemId);
      if (recipeCategory) {
        const isLoved = this.doesNpcLoveCategory(npcId, recipeCategory);

        if (isLoved) {
          const points = LIKED_GIFT_POINTS;
          this.addPoints(npcId, points, `loved food gift: ${item.displayName}`);
          console.log(`[FriendshipManager] 💕 ${npcId} loves ${item.displayName}!`);
          return { points, reaction: 'loved' };
        }
      }

      // Food but not loved category
      const points = GIFT_POINTS;
      this.addPoints(npcId, points, `food gift: ${item.displayName}`);
      console.log(`[FriendshipManager] 😊 ${npcId} appreciates ${item.displayName}`);
      return { points, reaction: 'liked' };
    }

    // Non-food gifts
    const points = GIFT_POINTS;
    this.addPoints(npcId, points, `gift: ${item.displayName}`);
    return { points, reaction: 'neutral' };
  }

  /**
   * Get the recipe category for a food item
   */
  private getFoodRecipeCategory(foodItemId: string): RecipeCategory | null {
    // Find the recipe that produces this food
    const recipe = Object.values(RECIPES).find(r => r.resultItemId === foodItemId);
    return recipe?.category ?? null;
  }

  /**
   * Check if an NPC loves a particular food category
   */
  private doesNpcLoveCategory(npcId: string, category: RecipeCategory): boolean {
    const preferences = NPC_FOOD_PREFERENCES[npcId];
    if (!preferences) return false;
    return preferences.includes(category);
  }

  /**
   * Award points for completing a quest
   */
  completeQuest(npcId: string, questId: string): void {
    this.addPoints(npcId, QUEST_POINTS, `quest completed: ${questId}`);
  }

  /**
   * Set Special Friend status (unlocked through crisis events)
   */
  setSpecialFriend(npcId: string, crisisId: string): void {
    const friendship = this.getFriendship(npcId);
    friendship.isSpecialFriend = true;
    friendship.crisisCompleted = crisisId;

    console.log(`[FriendshipManager] 💫 ${npcId} is now a Special Friend! (crisis: ${crisisId})`);
    this.save();
  }

  /**
   * Check if NPC is a Special Friend
   */
  isSpecialFriend(npcId: string): boolean {
    const friendship = this.friendships.get(npcId);
    return friendship?.isSpecialFriend ?? false;
  }

  /**
   * Get all friendships (for UI/save)
   */
  getAllFriendships(): NPCFriendship[] {
    return Array.from(this.friendships.values());
  }

  /**
   * Save friendships to GameState
   */
  private save(): void {
    const friendships = this.getAllFriendships();
    gameState.saveFriendships(friendships);
  }

  /**
   * Reset all friendships (for new game)
   */
  reset(): void {
    this.friendships.clear();
    this.initialised = false;
    console.log('[FriendshipManager] Reset all friendships');
  }
}

// Singleton instance
export const friendshipManager = new FriendshipManagerClass();
