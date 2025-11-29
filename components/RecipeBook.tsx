import React, { useState, useMemo } from 'react';
import { RecipeDefinition, RecipeCategory, RECIPES, getRecipe } from '../data/recipes';
import { getItem } from '../data/items';
import { cookingManager } from '../utils/CookingManager';

interface RecipeBookProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * RecipeBook - Modal for viewing all recipes and discovery
 * Shows locked recipes as hints for players to discover
 */
const RecipeBook: React.FC<RecipeBookProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all'>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);

  // Get all recipes grouped by category
  const allRecipes = useMemo(() => {
    return Object.values(RECIPES);
  }, []);

  // Filter recipes by category
  const displayedRecipes = useMemo(() => {
    if (selectedCategory === 'all') {
      return allRecipes;
    }
    return allRecipes.filter(r => r.category === selectedCategory);
  }, [allRecipes, selectedCategory]);

  // Check if a recipe is unlocked
  const isUnlocked = (recipeId: string) => cookingManager.isRecipeUnlocked(recipeId);
  const isMastered = (recipeId: string) => cookingManager.isRecipeMastered(recipeId);

  // Get unlock hint for locked recipes
  const getUnlockHint = (recipe: RecipeDefinition): string => {
    if (recipe.category === 'starter') {
      return 'Available from the start';
    }
    if (recipe.teacherNpc) {
      return `Learn from ${recipe.teacherNpc}`;
    }
    if (recipe.unlockRequirement) {
      const prereq = getRecipe(recipe.unlockRequirement);
      return prereq ? `Master "${prereq.displayName}" first` : 'Complete prerequisite recipe';
    }
    return 'Discover through gameplay';
  };

  // Category filter buttons
  const categories: Array<{ id: RecipeCategory | 'all'; label: string; icon: string }> = [
    { id: 'all', label: 'All', icon: '📚' },
    { id: 'starter', label: 'Basic', icon: '🍵' },
    { id: 'tutorial', label: 'Tutorial', icon: '👩‍🍳' },
    { id: 'savoury', label: 'Savoury', icon: '🍝' },
    { id: 'dessert', label: 'Dessert', icon: '🍰' },
    { id: 'baking', label: 'Baking', icon: '🍞' },
  ];

  // Difficulty display
  const difficultyStars = (difficulty: 1 | 2 | 3) => {
    return '⭐'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
  };

  // Get category icon
  const getCategoryIcon = (category: RecipeCategory): string => {
    const found = categories.find(c => c.id === category);
    return found?.icon || '📖';
  };

  // Selected recipe details
  const recipe = selectedRecipe ? getRecipe(selectedRecipe) : null;
  const recipeUnlocked = recipe ? isUnlocked(recipe.id) : false;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-4 border-teal-600 rounded-lg w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-teal-800 px-4 py-3 border-b-2 border-teal-600 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-teal-200 flex items-center gap-2">
            <span>📖</span> Recipe Book
          </h2>
          <button
            onClick={onClose}
            className="text-teal-300 hover:text-white transition-colors text-2xl font-bold px-2"
          >
            ×
          </button>
        </div>

        {/* Category Tabs */}
        <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Recipe List */}
          <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-slate-700 overflow-y-auto max-h-40 sm:max-h-none">
            <div className="p-2 space-y-1">
              {displayedRecipes.map(r => {
                const unlocked = isUnlocked(r.id);
                const mastered = isMastered(r.id);

                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecipe(r.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedRecipe === r.id
                        ? 'bg-teal-600 text-white'
                        : unlocked
                          ? 'bg-slate-700/30 text-slate-200 hover:bg-slate-600/50'
                          : 'bg-slate-800/50 text-slate-500 hover:bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${!unlocked && 'italic'}`}>
                        {unlocked ? r.displayName : '???'}
                      </span>
                      <span className="text-xs">
                        {mastered && '⭐'}
                        {unlocked && !mastered && '✓'}
                        {!unlocked && '🔒'}
                      </span>
                    </div>
                    <div className="text-xs opacity-75">
                      {getCategoryIcon(r.category)} {r.category}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipe Details */}
          <div className="flex-1 p-4 overflow-y-auto">
            {recipe ? (
              recipeUnlocked ? (
                <div className="space-y-4">
                  {/* Recipe Header */}
                  <div>
                    <h3 className="text-xl font-bold text-teal-200">{recipe.displayName}</h3>
                    <p className="text-slate-400 text-sm mt-1">{recipe.description}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3 text-sm">
                    <div className="bg-slate-700/50 px-3 py-2 rounded">
                      <span className="text-slate-400">Category:</span>
                      <span className="text-teal-300 ml-2 capitalize">{recipe.category}</span>
                    </div>
                    <div className="bg-slate-700/50 px-3 py-2 rounded">
                      <span className="text-slate-400">Difficulty:</span>
                      <span className="text-yellow-300 ml-2">{difficultyStars(recipe.difficulty)}</span>
                    </div>
                    <div className="bg-slate-700/50 px-3 py-2 rounded">
                      <span className="text-slate-400">Time:</span>
                      <span className="text-slate-200 ml-2">{recipe.cookingTime}s</span>
                    </div>
                    <div className="bg-slate-700/50 px-3 py-2 rounded">
                      <span className="text-slate-400">Friendship:</span>
                      <span className="text-pink-300 ml-2">+{recipe.friendshipValue}</span>
                    </div>
                  </div>

                  {/* Mastery Progress */}
                  {(() => {
                    const progress = cookingManager.getProgress(recipe.id);
                    const mastered = progress?.isMastered;
                    const times = progress?.timesCooked || 0;

                    return (
                      <div className="bg-slate-700/30 px-3 py-2 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Mastery Progress</span>
                          {mastered ? (
                            <span className="text-yellow-400 font-bold">⭐ Mastered!</span>
                          ) : (
                            <span className="text-slate-300">{times}/3</span>
                          )}
                        </div>
                        <div className="mt-2 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all ${mastered ? 'bg-yellow-500' : 'bg-teal-500'}`}
                            style={{ width: `${Math.min(100, (times / 3) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Ingredients */}
                  <div>
                    <h4 className="text-teal-300 font-bold mb-2">Ingredients</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {recipe.ingredients.map(ing => {
                        const item = getItem(ing.itemId);
                        return (
                          <div
                            key={ing.itemId}
                            className="bg-slate-700/30 px-3 py-2 rounded text-sm"
                          >
                            <span className="text-slate-200">{item?.displayName || ing.itemId}</span>
                            <span className="text-slate-400 ml-2">× {ing.quantity}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Result */}
                  <div className="bg-green-900/30 px-3 py-2 rounded border border-green-700/50">
                    <span className="text-green-400">Produces:</span>
                    <span className="text-green-200 ml-2 font-bold">
                      {recipe.resultQuantity}× {getItem(recipe.resultItemId)?.displayName || recipe.resultItemId}
                    </span>
                  </div>
                </div>
              ) : (
                /* Locked Recipe View */
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="text-6xl mb-4">🔒</div>
                  <h3 className="text-xl font-bold text-slate-400 mb-2">Recipe Locked</h3>
                  <p className="text-teal-400 italic">{getUnlockHint(recipe)}</p>
                  <div className="mt-4 text-sm text-slate-500">
                    <span className="capitalize">{recipe.category}</span> • Difficulty: {difficultyStars(recipe.difficulty)}
                  </div>
                </div>
              )
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-slate-400 italic">Select a recipe to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Footer */}
        <div className="bg-slate-800/50 px-4 py-2 border-t border-slate-700 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            <span className="text-teal-400">{cookingManager.getUnlockedRecipes().length}</span>/{allRecipes.length} recipes unlocked
            {' • '}
            <span className="text-yellow-400">{cookingManager.getMasteredRecipes().length}</span> mastered
          </div>
          <p className="text-slate-500 text-xs">Press ESC to close</p>
        </div>
      </div>
    </div>
  );
};

export default RecipeBook;
