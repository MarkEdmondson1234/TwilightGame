import { inventoryManager } from './inventoryManager';
import { characterData } from './CharacterData';
import { cutsceneManager } from './CutsceneManager';
import { friendshipManager } from './FriendshipManager';
import { npcManager } from '../NPCManager';
import { cookingManager } from './CookingManager';
import { DEBUG } from '../constants';
import { startFairyQueenQuest, markPotionReceived } from '../data/questHandlers/fairyQueenHandler';
import {
  setQuestOffered,
  startGardeningQuest,
  assignSeasonTask,
  getAvailableSeasonTask,
  isWinter,
  isGardeningQuestActive,
  getCurrentSeasonTask,
  markSeasonCompleted,
} from '../data/questHandlers/gardeningQuestHandler';
import { startFairyBluebellsQuest } from '../data/questHandlers/fairyBluebellsHandler';
import {
  startWitchGardenQuest,
  startPickledOnionsPhase,
  getGardenCropsGrown,
  getWitchGardenStage,
  WITCH_GARDEN_STAGES,
} from '../data/questHandlers/witchGardenHandler';
import { magicManager } from './MagicManager';

/**
 * Handle dialogue node changes and trigger associated actions
 * Handles:
 * - Friendship points (daily talk bonus on greeting)
 * - Seed pickup from seed keeper NPCs
 * - Dialogue-triggered cutscenes
 * - Recipe teaching from Mum
 */
export function handleDialogueAction(npcId: string, nodeId: string): string | void {
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
    if (DEBUG.QUEST)
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
    const redirect = handleEliasQuestActions(nodeId);
    if (redirect) return redirect;
  }

  // Handle witch garden quest
  if (npcId === 'witch') {
    const redirect = handleWitchQuestActions(nodeId);
    if (redirect) return redirect;
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
    if (DEBUG.QUEST)
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
      if (DEBUG.QUEST) console.log('[dialogueHandlers] 🪶 Althea gave you the feather duster!');
    }
  }
}

/**
 * Handle witch garden quest actions
 * - Starts quest when player accepts the garden challenge
 * - Redirects greeting to garden progress when quest is active
 */
function handleWitchQuestActions(nodeId: string): string | void {
  // Mark journeyman congratulations as received when player sees it
  if (nodeId === 'journeyman_congrats') {
    magicManager.setWitchCongratsReceived();
    return;
  }

  // Start the quest when accepting via dialogue
  if (nodeId === 'apprentice_accepted') {
    startWitchGardenQuest();
    return;
  }

  // Teach pickled onions recipe and start that phase
  if (nodeId === 'garden_complete_accept') {
    cookingManager.unlockRecipe('pickled_onions');
    startPickledOnionsPhase();
    if (DEBUG.QUEST) console.log('[dialogueHandlers] Witch taught pickled onions recipe');
    return;
  }

  // When the quest is active, the witch proactively comments on progress
  // instead of showing her normal greeting
  if (nodeId === 'greeting') {
    const stage = getWitchGardenStage();

    // No quest yet — show normal greeting
    if (stage === WITCH_GARDEN_STAGES.NOT_STARTED) return;

    // Quest complete — check if witch needs to congratulate level-up
    if (stage >= WITCH_GARDEN_STAGES.COMPLETED) {
      if (
        magicManager.getCurrentLevel() !== 'novice' &&
        !magicManager.hasReceivedWitchCongrats()
      ) {
        return 'journeyman_congrats';
      }
      return; // Normal greeting
    }

    // Pickled onions phase — remind player
    if (stage === WITCH_GARDEN_STAGES.PICKLED_ONIONS) {
      return 'pickled_onions_waiting';
    }

    // Garden phase complete — show congratulations
    if (stage === WITCH_GARDEN_STAGES.GARDEN_COMPLETE) {
      return 'garden_complete';
    }

    // Quest active — show progress based on unique crops harvested
    const cropsGrown = getGardenCropsGrown().length;
    if (cropsGrown >= 2) return 'garden_progress_2';
    if (cropsGrown >= 1) return 'garden_progress_1';
    return 'garden_progress_0';
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
    if (DEBUG.QUEST)
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
      if (DEBUG.QUEST) console.log(`[dialogueHandlers] ✅ Mum taught you how to make: ${recipeId}`);
    } else {
      if (DEBUG.QUEST) console.log(`[dialogueHandlers] ❌ Failed to unlock recipe: ${recipeId}`);
    }
  }

  // Mum gifts her sourdough starter when teaching bread (one-time; node hidden after recipe unlock)
  if (nodeId === 'learn_bread') {
    inventoryManager.addItem('sourdough', 1);
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools);
    if (DEBUG.QUEST)
      console.log('[dialogueHandlers] 🍞 Mum gave you her Sourdough Starter!');
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
    if (DEBUG.QUEST)
      console.log(`[dialogueHandlers] 🧚 Started Fairy Queen quest - met ${fairyName}!`);
  }

  // Fairy gives Fairy Form Potion when reaching Good Friends
  if (nodeId === 'potion_accept') {
    inventoryManager.addItem('potion_fairy_form', 1);
    const inventoryData = inventoryManager.getInventoryData();
    characterData.saveInventory(inventoryData.items, inventoryData.tools);
    markPotionReceived();
    if (DEBUG.QUEST)
      console.log(`[dialogueHandlers] 🧚 ${fairyName} gave Fairy Form Potion!`);
  }

  // Give replacement potion when player requests one (Good Friends only)
  if (nodeId === 'potion_request') {
    const hasPotion = inventoryManager.hasItem('potion_fairy_form');
    if (!hasPotion) {
      inventoryManager.addItem('potion_fairy_form', 1);
      const inventoryData = inventoryManager.getInventoryData();
      characterData.saveInventory(inventoryData.items, inventoryData.tools);
      if (DEBUG.QUEST)
        console.log(`[dialogueHandlers] 🧪 ${npcId} gave you another Fairy Form Potion!`);
    } else {
      if (DEBUG.QUEST) console.log(`[dialogueHandlers] Player already has Fairy Form Potion`);
    }
  }
}

/**
 * Handle Elias's quest actions
 * - Gardening quest: decline, accept, seasonal tasks
 * - Fairy Bluebells quest: accept
 */
function handleEliasQuestActions(nodeId: string): string | void {
  // Auto-redirect to quest check when greeting Elias with an active quest
  // We compute the final destination here rather than returning 'garden_task_check' and
  // relying on a second redirect, because UnifiedDialogueBox ignores the return value of
  // the second onNodeChange call (so garden_task_check's own redirects are swallowed).
  if (nodeId === 'greeting' && isGardeningQuestActive()) {
    // If no current task, try to assign one for the current season
    if (!getCurrentSeasonTask()) {
      const availableTask = getAvailableSeasonTask();
      if (availableTask) {
        // Assign the seasonal task and give seeds if this is the first time
        const seeds = assignSeasonTask(availableTask);
        if (seeds) {
          for (const seed of seeds) {
            inventoryManager.addItem(seed.itemId, seed.quantity);
          }
          const inventoryData = inventoryManager.getInventoryData();
          characterData.saveInventory(inventoryData.items, inventoryData.tools);
          if (DEBUG.QUEST)
            console.log(
              `[dialogueHandlers] 🌱 Elias gave seeds for new ${availableTask} task:`,
              seeds.map((s) => `${s.quantity}x ${s.itemId}`).join(', ')
            );
        }
      } else if (isWinter()) {
        return 'garden_winter_wait';
      } else {
        // Current season's task is already completed — wait for next season
        return 'garden_wait_next_season';
      }
    }
    return 'garden_task_check';
  }

  // Player declined the garden offer - mark as offered for future "Help with garden?" option
  if (nodeId === 'garden_decline') {
    setQuestOffered();
    if (DEBUG.QUEST)
      console.log(
        '[dialogueHandlers] 🌱 Player declined garden quest - offer will appear in future visits'
      );
  }

  // Player accepted the garden quest
  if (nodeId === 'garden_accept') {
    startGardeningQuest();
    if (DEBUG.QUEST) console.log('[dialogueHandlers] 🌱 Gardening quest started!');
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

        if (DEBUG.QUEST)
          console.log(
            `[dialogueHandlers] 🌱 Elias gave seeds for ${availableTask} task:`,
            seeds.map((s) => `${s.quantity}x ${s.itemId}`).join(', ')
          );
      }
    } else if (isWinter()) {
      if (DEBUG.QUEST) console.log('[dialogueHandlers] 🌱 Winter - no tasks available');
    }
  }

  // Handle individual seasonal task nodes (for when dialogue routes directly)
  if (
    nodeId === 'garden_spring_task' ||
    nodeId === 'garden_summer_task' ||
    nodeId === 'garden_autumn_task'
  ) {
    const season = nodeId.replace('garden_', '').replace('_task', '') as
      | 'spring'
      | 'summer'
      | 'autumn';

    // Only assign and give seeds if we don't already have a task active
    if (!getCurrentSeasonTask()) {
      const seeds = assignSeasonTask(season);
      if (seeds) {
        for (const seed of seeds) {
          inventoryManager.addItem(seed.itemId, seed.quantity);
        }
        const inventoryData = inventoryManager.getInventoryData();
        characterData.saveInventory(inventoryData.items, inventoryData.tools);

        if (DEBUG.QUEST)
          console.log(
            `[dialogueHandlers] 🌱 Elias gave seeds for ${season} task:`,
            seeds.map((s) => `${s.quantity}x ${s.itemId}`).join(', ')
          );
      }
    }
  }

  // Handle task check - if quest is active but no current task, assign one for the current season
  // This handles the case where player accepted in winter and is now checking in a different season
  // If the current season's task is already done, redirect to "wait for next season" message
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

          if (DEBUG.QUEST)
            console.log(
              `[dialogueHandlers] 🌱 Elias gave seeds for new ${availableTask} task:`,
              seeds.map((s) => `${s.quantity}x ${s.itemId}`).join(', ')
            );
        }
      } else if (isWinter()) {
        // Winter - no tasks available
        return 'garden_winter_wait';
      } else {
        // Season's task already done - tell player to come back next season
        return 'garden_wait_next_season';
      }
    }
  }

  // Player wants to deliver a crop via dialogue
  if (nodeId === 'garden_deliver_crop') {
    if (isGardeningQuestActive()) {
      // Use current task if set, otherwise check the current season directly
      const task = getCurrentSeasonTask() || getAvailableSeasonTask();

      if (task === 'spring' || task === 'summer') {
        // Look for any crop in inventory
        const inventoryData = inventoryManager.getInventoryData();
        const cropItem = inventoryData.items.find(
          (item) => item.itemId.startsWith('crop_') && item.quantity > 0
        );

        if (cropItem) {
          inventoryManager.removeItem(cropItem.itemId, 1);
          const invData = inventoryManager.getInventoryData();
          characterData.saveInventory(invData.items, invData.tools);
          markSeasonCompleted(task);
          friendshipManager.addPoints(
            'village_elder',
            100,
            `gardening quest: ${task} crop delivered via dialogue`
          );
          if (DEBUG.QUEST)
            console.log(
              `[dialogueHandlers] 🌱 Elias accepts your ${cropItem.itemId} for ${task} task!`
            );
          return 'garden_task_complete';
        }
      }

      if (task === 'autumn') {
        // Look for honey in inventory
        const inventoryData = inventoryManager.getInventoryData();
        const honeyItem = inventoryData.items.find(
          (item) => item.itemId === 'honey' && item.quantity > 0
        );

        if (honeyItem) {
          inventoryManager.removeItem('honey', 1);
          const invData = inventoryManager.getInventoryData();
          characterData.saveInventory(invData.items, invData.tools);
          markSeasonCompleted('autumn');
          friendshipManager.addPoints(
            'village_elder',
            100,
            'gardening quest: autumn honey delivered via dialogue'
          );
          if (DEBUG.QUEST)
            console.log('[dialogueHandlers] 🍯 Elias accepts your honey for autumn task!');
          return 'garden_task_complete';
        }
      }

      // Player doesn't have the right items
      if (DEBUG.QUEST)
        console.log('[dialogueHandlers] 🌱 Player has no matching crops/honey to deliver');
      return 'garden_no_crop';
    }
  }

  // Player accepted the Fairy Bluebells quest
  if (nodeId === 'fairy_bluebells_accept') {
    startFairyBluebellsQuest();
    if (DEBUG.QUEST) console.log('[dialogueHandlers] 🔔 Fairy Bluebells quest started!');
  }
}
