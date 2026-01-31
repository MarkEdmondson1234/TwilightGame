import { inventoryManager } from './inventoryManager';
import { characterData } from './CharacterData';
import { cutsceneManager } from './CutsceneManager';
import { friendshipManager } from './FriendshipManager';
import { npcManager } from '../NPCManager';
import { cookingManager } from './CookingManager';
import { startFairyQueenQuest } from '../data/quests/fairyQueenQuest';
import {
  setQuestOffered,
  startGardeningQuest,
  assignSeasonTask,
  getAvailableSeasonTask,
  isWinter,
  isGardeningQuestActive,
  getCurrentSeasonTask,
} from '../data/quests/gardeningQuest';
import { startFairyBluebellsQuest } from '../data/quests/fairyBluebellsQuest';

/**
 * Handle dialogue node changes and trigger associated actions
 * Handles:
 * - Friendship points (daily talk bonus on greeting)
 * - Seed pickup from seed keeper NPCs
 * - Dialogue-triggered cutscenes
 * - Recipe teaching from Mum
 */
export function handleDialogueAction(npcId: string, nodeId: string): void {
  // Award friendship points when dialogue starts (greeting node)
  if (nodeId === 'greeting') {
    handleFriendshipTalk(npcId);
  }

  // Check for dialogue-triggered cutscenes
  const triggeredCutscene = cutsceneManager.checkAndTriggerCutscenes({
    npcId,
    nodeId,
  });

  if (triggeredCutscene) {
    console.log(`[dialogueHandlers] Triggered cutscene from dialogue: ${triggeredCutscene}`);
  }

  // Handle seed pickup from seed shed NPCs
  if (npcId.startsWith('seed_keeper_')) {
    handleSeedPickup(nodeId);
  }

  // Handle recipe teaching from Mum
  if (npcId.includes('mum')) {
    handleRecipeTeaching(nodeId);
  }

  // Handle Althea's chores quest - grant feather duster when accepting
  if (npcId.includes('althea')) {
    handleAltheaQuestItems(nodeId);
  }

  // Handle fairy quest actions (Morgan and Stella attracted to fairy bluebells)
  if (npcId.startsWith('fairy_attracted_')) {
    handleFairyQuestActions(npcId, nodeId);
  }

  // Handle Elias's gardening quest and fairy bluebells quest
  if (npcId === 'village_elder') {
    handleEliasQuestActions(nodeId);
  }
}

/**
 * Handle friendship points for talking to an NPC
 */
function handleFriendshipTalk(npcId: string): void {
  const npc = npcManager.getNPCById(npcId);
  if (!npc) return;

  // Only award friendship to befriendable NPCs
  if (npc.friendshipConfig?.canBefriend === false) {
    return;
  }

  // Record the daily talk (awards points if not already talked today)
  friendshipManager.recordDailyTalk(npcId, npc);
}

/**
 * Handle seed pickup actions based on dialogue node ID
 */
function handleSeedPickup(nodeId: string): void {
  const seedActions: Record<string, { itemId: string; quantity: number }> = {
    take_radish: { itemId: 'seed_radish', quantity: 10 },
    take_tomato: { itemId: 'seed_tomato', quantity: 10 },
    take_salad: { itemId: 'seed_salad', quantity: 5 },
    take_corn: { itemId: 'seed_corn', quantity: 3 },
  };

  const action = seedActions[nodeId];
  if (action) {
    inventoryManager.addItem(action.itemId, action.quantity);
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools);
    console.log(`[dialogueHandlers] Added ${action.quantity}x ${action.itemId} to inventory`);
  }
}

/**
 * Handle Althea's chores quest items
 * Grants the feather duster when the player accepts the quest
 */
function handleAltheaQuestItems(nodeId: string): void {
  // Grant feather duster when accepting chores quest
  if (nodeId === 'chores_accept') {
    // Check if player already has the feather duster to avoid duplicates
    const hasFeatherDuster = inventoryManager.hasItem('tool_feather_duster');
    if (!hasFeatherDuster) {
      inventoryManager.addItem('tool_feather_duster', 1);
      const inventoryData = inventoryManager.getInventoryData();
      characterData.saveInventory(inventoryData.items, inventoryData.tools);
      console.log('[dialogueHandlers] 🪶 Althea gave you the feather duster!');
    }
  }
}

/**
 * Handle recipe teaching from Mum based on dialogue node ID
 */
function handleRecipeTeaching(nodeId: string): void {
  // Unlock recipe book when Mum starts teaching cooking
  // Use cookingManager as the single source of truth for cooking state
  if (nodeId === 'teach_cooking' && !cookingManager.isRecipeBookUnlocked()) {
    cookingManager.unlockRecipeBook();
    console.log('[dialogueHandlers] 📖 Recipe book unlocked! You can now access it with B key.');
  }

  // Map dialogue nodes to recipe IDs
  const recipeNodes: Record<string, string> = {
    learn_french_toast: 'french_toast',
    learn_spaghetti: 'spaghetti_meat_sauce',
    learn_crepes: 'crepes',
    learn_marzipan: 'marzipan_chocolates',
    learn_ice_cream: 'vanilla_ice_cream',
    learn_bread: 'bread',
    learn_biscuits: 'cookies',
    learn_chocolate_cake: 'chocolate_cake',
    learn_potato_pizza: 'potato_pizza',
    learn_roast_dinner: 'roast_dinner',
  };

  const recipeId = recipeNodes[nodeId];
  if (recipeId) {
    const result = cookingManager.unlockRecipe(recipeId);
    if (result) {
      console.log(`[dialogueHandlers] ✅ Mum taught you how to make: ${recipeId}`);
    } else {
      console.log(`[dialogueHandlers] ❌ Failed to unlock recipe: ${recipeId}`);
    }
  }
}

/**
 * Handle fairy quest actions (Morgan and Stella attracted to fairy bluebells)
 * - Starts quest on first meeting
 * - Gives replacement potion if player doesn't have one and is Good Friends
 */
function handleFairyQuestActions(npcId: string, nodeId: string): void {
  // Determine which fairy from the NPC ID
  const fairyName: 'morgan' | 'stella' = npcId.includes('morgan') ? 'morgan' : 'stella';

  // Start quest on first meeting with either fairy
  if (nodeId === 'first_meeting') {
    startFairyQueenQuest(fairyName);
    console.log(`[dialogueHandlers] 🧚 Started Fairy Queen quest - met ${fairyName}!`);
  }

  // Give replacement potion when player requests one (Good Friends only)
  if (nodeId === 'potion_request') {
    const hasPotion = inventoryManager.hasItem('potion_fairy_form');
    if (!hasPotion) {
      inventoryManager.addItem('potion_fairy_form', 1);
      const inventoryData = inventoryManager.getInventoryData();
      characterData.saveInventory(inventoryData.items, inventoryData.tools);
      console.log(`[dialogueHandlers] 🧪 ${npcId} gave you another Fairy Form Potion!`);
    } else {
      console.log(`[dialogueHandlers] Player already has Fairy Form Potion`);
    }
  }
}

/**
 * Handle Elias's quest actions
 * - Gardening quest: decline, accept, seasonal tasks
 * - Fairy Bluebells quest: accept
 */
function handleEliasQuestActions(nodeId: string): void {
  // Player declined the garden offer - mark as offered for future "Help with garden?" option
  if (nodeId === 'garden_decline') {
    setQuestOffered();
    console.log('[dialogueHandlers] 🌱 Player declined garden quest - offer will appear in future visits');
  }

  // Player accepted the garden quest
  if (nodeId === 'garden_accept') {
    startGardeningQuest();
    console.log('[dialogueHandlers] 🌱 Gardening quest started!');
  }

  // Route to seasonal task and give seeds
  if (nodeId === 'garden_seasonal_task') {
    const availableTask = getAvailableSeasonTask();

    if (availableTask) {
      const seeds = assignSeasonTask(availableTask);
      if (seeds) {
        // Grant seeds to player
        for (const seed of seeds) {
          inventoryManager.addItem(seed.itemId, seed.quantity);
        }
        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);

        console.log(`[dialogueHandlers] 🌱 Elias gave seeds for ${availableTask} task:`,
          seeds.map(s => `${s.quantity}x ${s.itemId}`).join(', ')
        );
      }
    } else if (isWinter()) {
      console.log('[dialogueHandlers] 🌱 Winter - no tasks available');
    }
  }

  // Handle individual seasonal task nodes (for when dialogue routes directly)
  if (nodeId === 'garden_spring_task' || nodeId === 'garden_summer_task' || nodeId === 'garden_autumn_task') {
    const season = nodeId.replace('garden_', '').replace('_task', '') as 'spring' | 'summer' | 'autumn';

    // Only assign and give seeds if we don't already have a task active
    if (!getCurrentSeasonTask()) {
      const seeds = assignSeasonTask(season);
      if (seeds) {
        for (const seed of seeds) {
          inventoryManager.addItem(seed.itemId, seed.quantity);
        }
        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);

        console.log(`[dialogueHandlers] 🌱 Elias gave seeds for ${season} task:`,
          seeds.map(s => `${s.quantity}x ${s.itemId}`).join(', ')
        );
      }
    }
  }

  // Handle task check - if quest is active but no current task, assign one for the current season
  // This handles the case where player accepted in winter and is now checking in a different season
  if (nodeId === 'garden_task_check') {
    if (isGardeningQuestActive() && !getCurrentSeasonTask()) {
      const availableTask = getAvailableSeasonTask();
      if (availableTask) {
        const seeds = assignSeasonTask(availableTask);
        if (seeds) {
          for (const seed of seeds) {
            inventoryManager.addItem(seed.itemId, seed.quantity);
          }
          const inventoryData = inventoryManager.getInventoryData();
          characterData.saveInventory(inventoryData.items, inventoryData.tools);

          console.log(`[dialogueHandlers] 🌱 Elias gave seeds for new ${availableTask} task:`,
            seeds.map(s => `${s.quantity}x ${s.itemId}`).join(', ')
          );
        }
      }
    }
  }

  // Player accepted the Fairy Bluebells quest
  if (nodeId === 'fairy_bluebells_accept') {
    startFairyBluebellsQuest();
    console.log('[dialogueHandlers] 🔔 Fairy Bluebells quest started!');
  }
}
