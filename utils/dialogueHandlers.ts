import { inventoryManager } from './inventoryManager';
import { gameState } from '../GameState';
import { cutsceneManager } from './CutsceneManager';
import { friendshipManager } from './FriendshipManager';
import { npcManager } from '../NPCManager';

/**
 * Handle dialogue node changes and trigger associated actions
 * Handles:
 * - Friendship points (daily talk bonus on greeting)
 * - Seed pickup from seed keeper NPCs
 * - Dialogue-triggered cutscenes
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
        'take_wheat': { itemId: 'seed_wheat', quantity: 5 },
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
