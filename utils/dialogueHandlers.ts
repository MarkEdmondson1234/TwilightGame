import { inventoryManager } from './inventoryManager';
import { gameState } from '../GameState';

/**
 * Handle dialogue node changes and trigger associated actions
 * Currently handles seed pickup from seed keeper NPCs
 */
export function handleDialogueAction(npcId: string, nodeId: string): void {
    // Handle seed pickup from seed shed NPCs
    if (npcId.startsWith('seed_keeper_')) {
        handleSeedPickup(nodeId);
    }
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
