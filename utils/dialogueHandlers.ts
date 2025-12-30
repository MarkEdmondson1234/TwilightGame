import { inventoryManager } from './inventoryManager';
import { gameState } from '../GameState';
import { cutsceneManager } from './CutsceneManager';
import { friendshipManager } from './FriendshipManager';
import { npcManager } from '../NPCManager';
import { cookingManager } from './CookingManager';

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
        'take_radish': { itemId: 'seed_radish', quantity: 10 },
        'take_tomato': { itemId: 'seed_tomato', quantity: 10 },
        'take_salad': { itemId: 'seed_salad', quantity: 5 },
        'take_corn': { itemId: 'seed_corn', quantity: 3 },
    };

    const action = seedActions[nodeId];
    if (action) {
        inventoryManager.addItem(action.itemId, action.quantity);
        const inventoryData = inventoryManager.getInventoryData();
        gameState.saveInventory(inventoryData.items, inventoryData.tools);
        console.log(`[dialogueHandlers] Added ${action.quantity}x ${action.itemId} to inventory`);
    }
}

/**
 * Handle recipe teaching from Mum based on dialogue node ID
 */
function handleRecipeTeaching(nodeId: string): void {
    // Map dialogue nodes to recipe IDs
    const recipeNodes: Record<string, string> = {
        'learn_french_toast': 'french_toast',
        'learn_spaghetti': 'spaghetti_meat_sauce',
        'learn_crepes': 'crepes_strawberry',
        'learn_marzipan': 'marzipan_chocolates',
        'learn_ice_cream': 'vanilla_ice_cream',
        'learn_bread': 'bread',
        'learn_biscuits': 'cookies',
        'learn_chocolate_cake': 'chocolate_cake',
        'learn_potato_pizza': 'potato_pizza',
        'learn_roast_dinner': 'roast_dinner',
    };

    const recipeId = recipeNodes[nodeId];
    if (recipeId) {
        const result = cookingManager.unlockRecipe(recipeId);
        if (result) {
            console.log(`[dialogueHandlers] Mum taught you how to make: ${recipeId}`);
        }
    }
}
