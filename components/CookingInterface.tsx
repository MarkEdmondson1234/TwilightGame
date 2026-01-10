import React, { useState, useMemo } from 'react';
import { RecipeDefinition, RecipeCategory, RECIPES, getRecipe } from '../data/recipes';
import { getItem } from '../data/items';
import { cookingManager, CookingResult } from '../utils/CookingManager';
import { inventoryManager } from '../utils/inventoryManager';
import { gameState } from '../GameState';
import { Position, PlacedItem } from '../types';
import { Z_COOKING, zClass } from '../zIndex';

interface CookingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  locationType: 'stove' | 'campfire';
  cookingPosition?: Position | null;
  currentMapId?: string;
  onItemPlaced?: () => void;
}

/**
 * CookingInterface - Modal overlay for the cooking system
 * Shows recipes, ingredients, and allows player to cook
 * Campfire cooking has 10% higher failure rate than stove
 * Cooked items appear on the stove/campfire instead of in inventory
 */
const CookingInterface: React.FC<CookingInterfaceProps> = ({
  isOpen,
  onClose,
  locationType,
  cookingPosition,
  currentMapId,
  onItemPlaced,
}) => {
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all');
  const [cookingResult, setCookingResult] = useState<CookingResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Get recipes based on filter
  const displayedRecipes = useMemo(() => {
    const unlocked = cookingManager.getUnlockedRecipes();
    if (selectedCategory === 'all') {
      return unlocked;
    }
    return unlocked.filter((r) => r.category === selectedCategory);
  }, [selectedCategory]);

  // Get selected recipe details
  const recipe = selectedRecipe ? getRecipe(selectedRecipe) : null;

  // Check if we can cook
  const canCook = recipe ? cookingManager.hasIngredients(recipe.id) : false;

  // Get missing ingredients
  const missingIngredients = recipe ? cookingManager.getMissingIngredients(recipe.id) : [];

  // Get ingredient display info
  const getIngredientInfo = (itemId: string, needed: number) => {
    const item = getItem(itemId);
    const have = inventoryManager.getQuantity(itemId);
    const hasEnough = have >= needed;
    return {
      name: item?.displayName || itemId,
      have,
      needed,
      hasEnough,
    };
  };

  // Handle cooking
  const handleCook = () => {
    if (!recipe) return;

    // Always cook through CookingManager to get proper ingredient checking and error messages
    const result = cookingManager.cook(recipe.id);

    // If cooking succeeded and we're at a campfire, apply campfire failure chance
    if (result.success && locationType === 'campfire' && Math.random() < 0.1) {
      // Campfire caused the dish to burn (ingredients already consumed by cook())
      const campfireResult: CookingResult = {
        success: false,
        message: `Oh no! The dish burnt on the campfire. Cooking on a campfire is tricky!`,
      };
      setCookingResult(campfireResult);
    } else {
      // Show the result from CookingManager (success, or missing ingredients error)
      setCookingResult(result);

      // If cooking succeeded and we have a cooking position, place the item on the stove/campfire
      if (
        result.success &&
        result.foodProduced &&
        cookingPosition &&
        currentMapId &&
        recipe.image
      ) {
        // Remove the item from inventory (CookingManager added it, but we want it on the stove instead)
        inventoryManager.removeItem(result.foodProduced.itemId, result.foodProduced.quantity);

        // Place the cooked item at the cooking position
        const placedItem: PlacedItem = {
          id: `cooked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          itemId: result.foodProduced.itemId,
          position: {
            x: cookingPosition.x,
            y: cookingPosition.y,
          },
          mapId: currentMapId,
          image: recipe.image,
          timestamp: Date.now(),
        };
        gameState.addPlacedItem(placedItem);
        console.log('[CookingInterface] Placed food on stove:', placedItem);

        // Notify parent to update the placed items display
        onItemPlaced?.();
      }
    }

    setShowResult(true);

    // Auto-hide result after 3 seconds
    setTimeout(() => {
      setShowResult(false);
      setCookingResult(null);
    }, 3000);
  };

  // Category filter buttons
  const categories: Array<{ id: RecipeCategory | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All', icon: '📚' },
    { id: 'starter', label: 'Basic', icon: '🍵' },
    { id: 'savoury', label: 'Savoury', icon: '🍝' },
    { id: 'dessert', label: 'Dessert', icon: '🍰' },
    { id: 'baking', label: 'Baking', icon: '🍞' },
  ];

  // Difficulty display
  const difficultyStars = (difficulty: 1 | 2 | 3) => {
    return '⭐'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center ${zClass(Z_COOKING)} p-2 sm:p-4`}
    >
      <div className="bg-gradient-to-b from-amber-900 to-amber-950 border-4 border-amber-600 rounded-lg w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-amber-800 px-4 py-3 border-b-2 border-amber-600 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-amber-200 flex items-center gap-2">
              <span>{locationType === 'campfire' ? '🔥' : '🍳'}</span>
              {locationType === 'campfire' ? 'Campfire Cooking' : 'Kitchen'}
            </h2>
            {locationType === 'campfire' && (
              <p className="text-amber-300 text-sm mt-1">⚠️ 10% higher chance of failure!</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-amber-300 hover:text-white transition-colors text-2xl font-bold px-2"
          >
            ×
          </button>
        </div>

        {/* Category Tabs */}
        <div className="bg-amber-900/50 px-4 py-2 border-b border-amber-700 flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-800/50 text-amber-300 hover:bg-amber-700'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Recipe List */}
          <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-amber-700 overflow-y-auto max-h-40 sm:max-h-none">
            <div className="p-2 space-y-1">
              {displayedRecipes.length === 0 ? (
                <p className="text-amber-400 text-sm italic p-2">
                  No recipes in this category yet.
                </p>
              ) : (
                displayedRecipes.map((r) => {
                  const progress = cookingManager.getProgress(r.id);
                  const isMastered = progress?.isMastered;
                  const hasIngredients = cookingManager.hasIngredients(r.id);

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRecipe(r.id)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        selectedRecipe === r.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-800/30 text-amber-200 hover:bg-amber-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.displayName}</span>
                        <span className="text-xs">
                          {isMastered && '⭐'}
                          {hasIngredients && <span className="text-green-400 ml-1">✓</span>}
                        </span>
                      </div>
                      <div className="text-xs opacity-75 capitalize">{r.category}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Recipe Details */}
          <div className="flex-1 p-4 overflow-y-auto">
            {recipe ? (
              <div className="space-y-4">
                {/* Recipe Header */}
                <div>
                  <h3 className="text-xl font-bold text-amber-200">{recipe.displayName}</h3>
                  <p className="text-amber-400 text-sm mt-1">{recipe.description}</p>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm">
                  <div className="bg-amber-800/50 px-3 py-2 rounded">
                    <span className="text-amber-400">Difficulty:</span>
                    <span className="text-yellow-300 ml-2">
                      {difficultyStars(recipe.difficulty)}
                    </span>
                  </div>
                  <div className="bg-amber-800/50 px-3 py-2 rounded">
                    <span className="text-amber-400">Time:</span>
                    <span className="text-amber-200 ml-2">{recipe.cookingTime}s</span>
                  </div>
                  <div className="bg-amber-800/50 px-3 py-2 rounded">
                    <span className="text-amber-400">Makes:</span>
                    <span className="text-amber-200 ml-2">{recipe.resultQuantity}×</span>
                  </div>
                </div>

                {/* Progress */}
                {(() => {
                  const progress = cookingManager.getProgress(recipe.id);
                  if (progress) {
                    return (
                      <div className="bg-amber-800/30 px-3 py-2 rounded text-sm">
                        <span className="text-amber-400">Cooked:</span>
                        <span className="text-amber-200 ml-2">{progress.timesCooked} times</span>
                        {progress.isMastered && (
                          <span className="text-yellow-400 ml-2">⭐ Mastered!</span>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Ingredients */}
                <div>
                  <h4 className="text-amber-300 font-bold mb-2">Ingredients</h4>
                  <div className="space-y-2">
                    {recipe.ingredients.map((ing) => {
                      const info = getIngredientInfo(ing.itemId, ing.quantity);
                      const item = getItem(ing.itemId);
                      return (
                        <div
                          key={ing.itemId}
                          className={`flex items-center justify-between px-3 py-2 rounded gap-2 ${
                            info.hasEnough
                              ? 'bg-green-900/30 border border-green-700/50'
                              : 'bg-red-900/30 border border-red-700/50'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {item?.image && (
                              <img
                                src={item.image}
                                alt={item.displayName}
                                className="w-8 h-8 object-contain flex-shrink-0"
                              />
                            )}
                            <span className="text-amber-200">{info.name}</span>
                          </div>
                          <span className={info.hasEnough ? 'text-green-400' : 'text-red-400'}>
                            {info.have}/{info.needed}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cook Button */}
                <div className="pt-4">
                  <button
                    onClick={handleCook}
                    className="w-full py-3 rounded-lg font-bold text-lg transition-colors bg-green-600 hover:bg-green-500 text-white"
                  >
                    🍳 Cook!
                  </button>
                </div>

                {/* Result Message */}
                {showResult && cookingResult && (
                  <div
                    className={`p-4 rounded-lg text-center font-bold ${
                      cookingResult.success
                        ? 'bg-green-800/50 text-green-200 border border-green-600'
                        : 'bg-red-800/50 text-red-200 border border-red-600'
                    }`}
                  >
                    {cookingResult.success ? '✨ ' : '❌ '}
                    {cookingResult.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-amber-400 italic">Select a recipe to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-amber-900/50 px-4 py-2 border-t border-amber-700 text-center">
          <p className="text-amber-400 text-xs">
            Press ESC or E to close • Cook recipes 3 times to master them
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookingInterface;
