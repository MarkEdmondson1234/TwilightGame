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

import {
  NPCFriendship,
  FriendshipTier,
  NPC,
  NPCGiftConfig,
  NPCFavourConfig,
  FavourType,
} from '../types';
import { characterData, FriendshipData } from './CharacterData';
import { TimeManager } from './TimeManager';
import { inventoryManager } from './inventoryManager';
import { getItem, ItemCategory } from '../data/items';
import { RECIPES, NPC_FOOD_PREFERENCES, RecipeCategory } from '../data/recipes';
import { getGiftReaction, GiftReaction } from '../data/giftReactions';
import { markPotionReceived as markFairyQuestPotionReceived } from '../data/quests/fairyQueenQuest';
import {
  isGardeningQuestActive,
  getCurrentSeasonTask,
  getAvailableSeasonTask,
  markSeasonCompleted,
} from '../data/quests/gardeningQuest';
import {
  isFairyBluebellsActive,
  getQuestItemType,
  markItemDelivered,
  checkFairyBluebellsCompletion,
  QUEST_REWARD as FAIRY_BLUEBELLS_REWARD,
} from '../data/quests/fairyBluebellsQuest';

// Tier reward definitions - items given when reaching a tier with certain NPCs
// Format: { npcId: { tier: [{ itemId, quantity }] } }
const TIER_REWARDS: Record<
  string,
  Record<FriendshipTier, Array<{ itemId: string; quantity: number }>>
> = {
  // Old Man (Jebediah) gives seeds when you become acquaintances
  village_elder: {
    stranger: [],
    acquaintance: [
      { itemId: 'seed_sunflower', quantity: 3 },
      { itemId: 'seed_pea', quantity: 3 },
      { itemId: 'seed_salad', quantity: 3 },
    ],
    good_friend: [],
  },

  // Morgan (fairy attracted to bluebells) gives Fairy Form Potion at good_friend
  'fairy_attracted_morgan_0': {
    stranger: [],
    acquaintance: [],
    good_friend: [{ itemId: 'potion_fairy_form', quantity: 1 }],
  },

  // Stella (fairy attracted to bluebells) gives Fairy Form Potion at good_friend
  'fairy_attracted_stella_0': {
    stranger: [],
    acquaintance: [],
    good_friend: [{ itemId: 'potion_fairy_form', quantity: 1 }],
  },
};

// NPC gift-giving configuration - what items NPCs can give to good friends
const NPC_GIFTS: Record<string, NPCGiftConfig> = {
  // Old Woman gives baked goods
  old_woman: {
    giftItems: [
      { itemId: 'cookies', chance: 0.7, minTier: 'good_friend' },
      { itemId: 'bread', chance: 0.3, minTier: 'good_friend' },
    ],
    dailyGiftLimit: 1,
  },
  // Bear gives forest products
  bear: {
    giftItems: [
      { itemId: 'honey', chance: 0.6, minTier: 'acquaintance' },
      { itemId: 'crop_blackberry', chance: 0.4, minTier: 'good_friend' },
    ],
    dailyGiftLimit: 1,
  },
  // Shopkeeper gives ingredients
  shopkeeper: {
    giftItems: [
      { itemId: 'flour', chance: 0.5, minTier: 'good_friend' },
      { itemId: 'sugar', chance: 0.5, minTier: 'good_friend' },
    ],
    dailyGiftLimit: 1,
  },
  // Fairy gives magical items
  fairy: {
    giftItems: [{ itemId: 'seed_fairy_bluebell', chance: 0.3, minTier: 'good_friend' }],
    dailyGiftLimit: 1,
  },
};

// NPC favour configuration - special actions NPCs can perform for good friends
const NPC_FAVOURS: Record<string, NPCFavourConfig> = {
  village_elder: {
    favourType: 'water_plants',
    minTier: 'good_friend',
    cooldownDays: 1,
    description: "I'll water your plants today, dear.",
  },
  shopkeeper: {
    favourType: 'gift_seeds',
    minTier: 'good_friend',
    cooldownDays: 3,
    description: 'Here, take some seeds - on the house!',
  },
};

// Friendship constants
const POINTS_PER_LEVEL = 100;
const MAX_POINTS = 900; // Level 9
const MIN_POINTS = 0; // Level 1

// Point thresholds for tiers
const ACQUAINTANCE_THRESHOLD = 300; // Level 4+
const GOOD_FRIEND_THRESHOLD = 600; // Level 7+

// Point awards
const DAILY_TALK_POINTS = 100; // +1 level for daily conversation
const GIFT_POINTS = 100; // +1 level for giving food
const LIKED_GIFT_POINTS = 300; // +3 levels for giving liked food
const QUEST_POINTS = 300; // +3 levels for completing a quest

class FriendshipManagerClass {
  private friendships: Map<string, NPCFriendship> = new Map();
  private initialised = false;

  /**
   * Initialise the friendship manager with saved data
   */
  initialise(): void {
    if (this.initialised) return;

    const saved = characterData.loadFriendships();
    if (saved) {
      saved.npcFriendships.forEach((friendship) => {
        this.friendships.set(friendship.npcId, friendship);
      });
    }

    this.initialised = true;
    console.log(`[FriendshipManager] Initialised with ${this.friendships.size} friendships`);
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
   * Get friendship hearts (0-5) for UI display
   * Maps 0-900 points to 0-5 hearts
   */
  getFriendshipHearts(npcId: string): number {
    const friendship = this.friendships.get(npcId);
    if (!friendship) return 0;
    // Each heart = 180 points (900 / 5 = 180)
    return Math.min(5, Math.floor(friendship.points / 180));
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
  meetsFriendshipRequirement(
    npcId: string,
    requiredTier?: FriendshipTier,
    requiresSpecialFriend?: boolean
  ): boolean {
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

    console.log(
      `[FriendshipManager] ${npcId}: +${amount} points (${reason}). Now ${friendship.points} points, level ${newLevel}, tier: ${newTier}`
    );

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
      console.log(
        `[FriendshipManager] 🎁 Received ${reward.quantity}x ${reward.itemId} from ${npcId}!`
      );

      // Special handling for Fairy Form Potion - update quest progress
      if (reward.itemId === 'potion_fairy_form') {
        markFairyQuestPotionReceived();
      }
    }

    // Track that reward was received
    if (!friendship.rewardsReceived) {
      friendship.rewardsReceived = [];
    }
    friendship.rewardsReceived.push(rewardKey);

    // Save inventory using CharacterData API
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools);

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
   *
   * Uses NPC_GIFT_PREFERENCES from giftReactions.ts for item-specific preferences.
   */
  giveGift(
    npcId: string,
    itemId: string,
    npc?: NPC
  ): { points: number; reaction: GiftReaction; questCompleted?: boolean; dialogueNodeId?: string } {
    const item = getItem(itemId);
    if (!item) {
      console.warn(`[FriendshipManager] Unknown item: ${itemId}`);
      return { points: 0, reaction: 'neutral' };
    }

    // ===== ELIAS QUEST HANDLING =====
    // Check for gardening quest and fairy bluebells quest items when gifting to Elias
    if (npcId === 'village_elder') {
      const questResult = this.handleEliasQuestGift(itemId);
      if (questResult) {
        return questResult;
      }
    }

    // Check if this is a friendship potion (given to NPC, not drunk by player)
    if (itemId === 'potion_friendship') {
      const points = 300;
      this.addPoints(npcId, points, 'friendship elixir');
      console.log(`[FriendshipManager] 💖 ${npcId} drinks the Friendship Elixir! (+${points})`);
      return { points, reaction: 'loved' };
    }

    // Check if this is a bitter grudge potion (given to NPC)
    if (itemId === 'potion_bitter_grudge') {
      const points = -300;
      this.addPoints(npcId, points, 'bitter grudge potion');
      console.log(`[FriendshipManager] 💔 ${npcId} drinks the Bitter Grudge... (${points})`);
      return { points, reaction: 'disliked' };
    }

    // Check if this is terrible food (starts with "terrible_")
    const isTerrible = itemId.startsWith('terrible_');
    if (isTerrible) {
      const isSpecial = this.isSpecialFriend(npcId);

      if (isSpecial) {
        // Special Friends are understanding and don't lose friendship
        console.log(
          `[FriendshipManager] 😅 ${npcId} (Special Friend) tries your terrible food but doesn't mind`
        );
        return { points: 0, reaction: 'neutral' };
      } else {
        // Regular NPCs lose 1 friendship point
        const points = -1;
        this.addPoints(npcId, points, `terrible food gift: ${item.displayName}`);
        console.log(
          `[FriendshipManager] 😖 ${npcId} is disgusted by your terrible food (-1 point)`
        );
        return { points, reaction: 'disliked' };
      }
    }

    // Use the new gift reaction system from giftReactions.ts
    // This checks NPC-specific item preferences (loves, dislikes, category preferences)
    const reaction = getGiftReaction(npcId, itemId);

    // Award points based on reaction
    let points: number;
    switch (reaction) {
      case 'loved':
        points = LIKED_GIFT_POINTS; // +300 points
        this.addPoints(npcId, points, `loved gift: ${item.displayName}`);
        console.log(`[FriendshipManager] 💕 ${npcId} loves ${item.displayName}! (+${points})`);
        break;
      case 'liked':
        points = GIFT_POINTS; // +100 points
        this.addPoints(npcId, points, `liked gift: ${item.displayName}`);
        console.log(`[FriendshipManager] 😊 ${npcId} likes ${item.displayName}. (+${points})`);
        break;
      case 'disliked':
        points = -100; // -100 points for disliked items
        this.addPoints(npcId, points, `disliked gift: ${item.displayName}`);
        console.log(`[FriendshipManager] 😟 ${npcId} dislikes ${item.displayName}. (${points})`);
        break;
      case 'neutral':
      default:
        points = GIFT_POINTS; // +100 points
        this.addPoints(npcId, points, `gift: ${item.displayName}`);
        console.log(`[FriendshipManager] 🙂 ${npcId} accepts ${item.displayName}. (+${points})`);
        break;
    }

    return { points, reaction };
  }

  /**
   * Get the recipe category for a food item
   */
  private getFoodRecipeCategory(foodItemId: string): RecipeCategory | null {
    // Find the recipe that produces this food
    const recipe = Object.values(RECIPES).find((r) => r.resultItemId === foodItemId);
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
   * Handle quest-specific gifts for Elias (village elder)
   * - Gardening quest: Accept crops to complete seasonal tasks
   * - Fairy Bluebells quest: Accept shrinking violet, hazelnuts, blueberries
   *
   * @returns Gift result if quest item was accepted, null if not a quest item
   */
  private handleEliasQuestGift(
    itemId: string
  ): { points: number; reaction: GiftReaction; questCompleted?: boolean; dialogueNodeId?: string } | null {
    // Check for gardening quest items
    console.log(`[FriendshipManager] 🔍 Quest gift check: itemId=${itemId}, questActive=${isGardeningQuestActive()}, currentTask=${getCurrentSeasonTask()}`);
    if (isGardeningQuestActive()) {
      // Use current task if set, otherwise check the current season directly
      const task = getCurrentSeasonTask() || getAvailableSeasonTask();

      // Spring/Summer task: Accept any crop
      if ((task === 'spring' || task === 'summer') && itemId.startsWith('crop_')) {
        markSeasonCompleted(task);
        const points = 100;
        this.addPoints('village_elder', points, `gardening quest: ${task} crop delivered`);
        console.log(`[FriendshipManager] 🌱 Elias accepts your ${task} harvest! (+${points})`);
        return { points, reaction: 'loved', dialogueNodeId: 'garden_task_complete' };
      }

      // Autumn task: Accept honey
      if (task === 'autumn' && itemId === 'honey') {
        markSeasonCompleted('autumn');
        const points = 100;
        this.addPoints('village_elder', points, 'gardening quest: autumn honey delivered');
        console.log(`[FriendshipManager] 🍯 Elias is delighted with the honey! (+${points})`);
        return { points, reaction: 'loved', dialogueNodeId: 'garden_task_complete' };
      }
    }

    // Check for Fairy Bluebells quest items
    if (isFairyBluebellsActive()) {
      const questItemType = getQuestItemType(itemId);

      if (questItemType) {
        const wasNew = markItemDelivered(questItemType);

        if (wasNew) {
          const questJustCompleted = checkFairyBluebellsCompletion();

          if (questJustCompleted) {
            // Quest complete! Give the fairy bluebell seed reward
            inventoryManager.addItem(FAIRY_BLUEBELLS_REWARD.itemId, FAIRY_BLUEBELLS_REWARD.quantity);
            const inventoryData = inventoryManager.getInventoryData();
            characterData.saveInventory(inventoryData.items, inventoryData.tools);

            const points = 150;
            this.addPoints('village_elder', points, 'fairy bluebells quest completed');
            console.log(`[FriendshipManager] 🔔 Fairy Bluebells quest complete! Received fairy bluebell seed! (+${points})`);
            return { points, reaction: 'loved', questCompleted: true, dialogueNodeId: 'fairy_bluebells_complete' };
          } else {
            console.log(`[FriendshipManager] 🔔 Elias accepts your ${questItemType} for the Fairy Bluebells quest!`);
            return { points: 0, reaction: 'loved', dialogueNodeId: 'fairy_bluebells_item_received' };
          }
        } else {
          // Already delivered this item
          console.log(`[FriendshipManager] Elias already received ${questItemType}`);
          // Fall through to normal gift handling
        }
      }
    }

    // Not a quest item, return null to use normal gift handling
    return null;
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
   * Check if an NPC has a gift to give the player
   * NPCs with good friendship can randomly give items
   * @returns Gift info if NPC wants to give something, null otherwise
   */
  checkForNPCGift(npcId: string): { itemId: string; itemName: string; message: string } | null {
    const giftConfig = NPC_GIFTS[npcId];
    if (!giftConfig) return null;

    const tier = this.getFriendshipTier(npcId);

    // Filter eligible gifts by tier
    const eligibleGifts = giftConfig.giftItems.filter((gift) => {
      const tierOrder: FriendshipTier[] = ['stranger', 'acquaintance', 'good_friend'];
      return tierOrder.indexOf(tier) >= tierOrder.indexOf(gift.minTier);
    });

    if (eligibleGifts.length === 0) return null;

    // Roll for each gift
    for (const gift of eligibleGifts) {
      if (Math.random() < gift.chance) {
        const item = getItem(gift.itemId);
        if (item) {
          // Add item to player inventory
          inventoryManager.addItem(gift.itemId, 1);
          const inventoryData = inventoryManager.getInventoryData();
          characterData.saveInventory(inventoryData.items, inventoryData.tools);

          console.log(`[FriendshipManager] 🎁 ${npcId} gave player ${item.displayName}!`);

          return {
            itemId: gift.itemId,
            itemName: item.displayName,
            message: `Here, have some ${item.displayName}!`,
          };
        }
      }
    }

    return null;
  }

  /**
   * Get NPC gift configuration (for UI display)
   */
  getNPCGiftConfig(npcId: string): NPCGiftConfig | null {
    return NPC_GIFTS[npcId] || null;
  }

  /**
   * Get NPC favour configuration (for UI display)
   */
  getNPCFavourConfig(npcId: string): NPCFavourConfig | null {
    return NPC_FAVOURS[npcId] || null;
  }

  /**
   * Check if an NPC can offer a favour
   */
  canOfferFavour(npcId: string): boolean {
    const favourConfig = NPC_FAVOURS[npcId];
    if (!favourConfig) return false;

    const tier = this.getFriendshipTier(npcId);
    const tierOrder: FriendshipTier[] = ['stranger', 'acquaintance', 'good_friend'];

    return tierOrder.indexOf(tier) >= tierOrder.indexOf(favourConfig.minTier);
  }

  /**
   * Perform an NPC favour (returns result for UI display)
   * Note: The actual favour execution is handled by the caller (e.g., App.tsx)
   * This method returns the favour details and description.
   */
  getFavourDetails(npcId: string): {
    favourType: FavourType;
    description: string;
  } | null {
    if (!this.canOfferFavour(npcId)) return null;

    const favourConfig = NPC_FAVOURS[npcId];
    if (!favourConfig) return null;

    return {
      favourType: favourConfig.favourType,
      description: favourConfig.description,
    };
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
    characterData.saveFriendships(friendships as FriendshipData['npcFriendships']);
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
