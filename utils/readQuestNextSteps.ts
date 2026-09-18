import { cookingManager } from './CookingManager';
import { inventoryManager } from './inventoryManager';
import { eventChainManager } from './EventChainManager';
import { TimeManager } from './TimeManager';
import { getItem } from '../data/items';
import { isCookingDomain } from '../data/recipes';
import {
  getCurrentSeasonTask,
  hasCompletedSeason,
} from '../data/questHandlers/gardeningQuestHandler';
import {
  getCobwebsRemaining,
  isTeaDelivered,
  areCookiesDelivered,
  isAltheaChoresDone,
} from '../data/questHandlers/altheaChoresHandler';
import {
  cookingNextStep,
  gardeningNextStep,
  altheaNextStep,
  type QuestNextStep,
} from './questNextSteps';

export function readCookingNextStep(): QuestNextStep | undefined {
  if (!cookingManager.isRecipeBookUnlocked() || cookingManager.isCookingCourseComplete()) return;
  return cookingNextStep({
    teaComplete: cookingManager.isFireplaceTutorialComplete(),
    recipes: cookingManager
      .getUnlockedRecipes()
      .filter((r) => isCookingDomain(r.category))
      .map((r) => ({
        name: r.displayName,
        timesCooked: cookingManager.getProgress(r.id)?.timesCooked ?? 0,
        mastered: cookingManager.isRecipeMastered(r.id),
        missing: cookingManager
          .getMissingIngredients(r.id)
          .map((i) => `${i.need - i.have} ${getItem(i.itemId)?.displayName ?? i.itemId}`),
      })),
  });
}
export function readQuestNextStep(id: string): QuestNextStep | undefined {
  if (id === 'gardening_quest')
    return gardeningNextStep({
      offered: eventChainManager.getProgress(id)?.currentStageId === 'offered',
      season: TimeManager.getCurrentTime().season,
      task: getCurrentSeasonTask(),
      completed: (['spring', 'summer', 'autumn'] as const).filter(hasCompletedSeason),
      cropCount: inventoryManager
        .getInventoryData()
        .items.filter((i) => i.itemId.startsWith('crop_'))
        .reduce((n, i) => n + i.quantity, 0),
      honeyCount: inventoryManager.getQuantity('honey'),
    });
  if (id === 'althea_chores')
    return altheaNextStep({
      done: isAltheaChoresDone(),
      cobwebsRemaining: getCobwebsRemaining(),
      teaDelivered: isTeaDelivered(),
      cookiesDelivered: areCookiesDelivered(),
      teaCount: inventoryManager.getQuantity('food_tea'),
      cookiesCount: inventoryManager.getQuantity('food_cookies'),
      cookiesUnlocked: cookingManager.isRecipeUnlocked('cookies'),
    });
}
