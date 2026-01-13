import React, { useState, useMemo, useEffect } from 'react';
import { PotionRecipeDefinition, PotionLevel, getPotionRecipe } from '../data/potionRecipes';
import { getItem } from '../data/items';
import { magicManager, BrewingResult } from '../utils/MagicManager';
import { inventoryManager } from '../utils/inventoryManager';
import { Z_MAGIC_BOOK, zClass } from '../zIndex';

interface MagicRecipeBookProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * MagicRecipeBook - Modal overlay for the magic/potion brewing system
 * Shows potion recipes organized by level (Novice → Journeyman → Master)
 * Players must master all recipes in a level to unlock the next level
 */
const MagicRecipeBook: React.FC<MagicRecipeBookProps> = ({ isOpen, onClose }) => {
  const [selectedRecipe, setSelectedRecipe] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<PotionLevel | 'all'>('all');
  const [brewingResult, setBrewingResult] = useState<BrewingResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Get current apprentice level and progress
  const currentLevel = magicManager.getCurrentLevel();
  const levelProgress = magicManager.getLevelMasteryProgress();

  // Get recipes based on filter
  const displayedRecipes = useMemo(() => {
    const unlocked = magicManager.getUnlockedRecipes();
    if (selectedLevel === 'all') {
      return unlocked;
    }
    return unlocked.filter((r) => r.level === selectedLevel);
  }, [selectedLevel]);

  // Get selected recipe details
  const recipe = selectedRecipe ? getPotionRecipe(selectedRecipe) : null;

  // Check if we can brew
  const canBrew = recipe ? magicManager.hasIngredients(recipe.id) : false;

  // Get missing ingredients
  const missingIngredients = recipe ? magicManager.getMissingIngredients(recipe.id) : [];

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

  // Handle brewing
  const handleBrew = () => {
    if (!recipe) return;

    // Brew through MagicManager to get proper ingredient checking and level progression
    const result = magicManager.brew(recipe.id);

    // Show the result
    setBrewingResult(result);
    setShowResult(true);

    // Auto-hide result after 3 seconds (or 5 if level up)
    const duration = result.levelUp ? 5000 : 3000;
    setTimeout(() => {
      setShowResult(false);
      setBrewingResult(null);
    }, duration);
  };

  // Level filter buttons
  const levels: Array<{
    id: PotionLevel | 'all';
    label: string;
    icon: string;
    locked: boolean;
  }> = [
    { id: 'all', label: 'All', icon: '📚', locked: false },
    { id: 'novice', label: 'Novice', icon: '🧪', locked: false },
    {
      id: 'journeyman',
      label: 'Journeyman',
      icon: '✨',
      locked: !magicManager.isLevelUnlocked('journeyman'),
    },
    {
      id: 'master',
      label: 'Master',
      icon: '🌟',
      locked: !magicManager.isLevelUnlocked('master'),
    },
  ];

  // Difficulty display
  const difficultyStars = (difficulty: 1 | 2 | 3) => {
    return '⭐'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
  };

  // Level title display
  const getLevelTitle = (level: PotionLevel): string => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center ${zClass(Z_MAGIC_BOOK)} p-2 sm:p-4`}
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-gradient-to-b from-purple-900 to-purple-950 border-4 border-purple-600 rounded-lg w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-purple-800 px-4 py-3 border-b-2 border-purple-600 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-purple-200 flex items-center gap-2">
              <span>✨</span>
              Magic Recipe Book
            </h2>
            <p className="text-purple-300 text-sm mt-1">
              {getLevelTitle(currentLevel)} Witch • {levelProgress.mastered}/
              {levelProgress.total} recipes mastered
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors text-2xl font-bold px-2"
          >
            ×
          </button>
        </div>

        {/* Level Progress Bar */}
        <div className="bg-purple-900/50 px-4 py-2 border-b border-purple-700">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-300 text-sm font-bold">
              {getLevelTitle(currentLevel)} Progress:
            </span>
            <span className="text-purple-200 text-sm">{levelProgress.percentage}%</span>
          </div>
          <div className="w-full bg-purple-950 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-500"
              style={{ width: `${levelProgress.percentage}%` }}
            />
          </div>
          {levelProgress.percentage === 100 && currentLevel !== 'master' && (
            <p className="text-yellow-300 text-xs mt-1">
              ⭐ Master one more recipe to advance to the next level!
            </p>
          )}
        </div>

        {/* Level Tabs */}
        <div className="bg-purple-900/50 px-4 py-2 border-b border-purple-700 flex gap-2 overflow-x-auto">
          {levels.map((lv) => (
            <button
              key={lv.id}
              onClick={() => !lv.locked && setSelectedLevel(lv.id)}
              disabled={lv.locked}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                lv.locked
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed opacity-50'
                  : selectedLevel === lv.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-800/50 text-purple-300 hover:bg-purple-700'
              }`}
            >
              {lv.icon} {lv.label}
              {lv.locked && ' 🔒'}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Recipe List */}
          <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-purple-700 overflow-y-auto max-h-40 sm:max-h-none">
            <div className="p-2 space-y-1">
              {displayedRecipes.length === 0 ? (
                <p className="text-purple-400 text-sm italic p-2">
                  {selectedLevel !== 'all' &&
                  levels.find((l) => l.id === selectedLevel)?.locked
                    ? 'Unlock this level by mastering all recipes in the previous level.'
                    : 'No recipes in this level yet.'}
                </p>
              ) : (
                displayedRecipes.map((r) => {
                  const progress = magicManager.getProgress(r.id);
                  const isMastered = progress?.isMastered;
                  const hasIngredients = magicManager.hasIngredients(r.id);

                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRecipe(r.id)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        selectedRecipe === r.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-800/30 text-purple-200 hover:bg-purple-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.displayName}</span>
                        <span className="text-xs">
                          {isMastered && '⭐'}
                          {hasIngredients && <span className="text-green-400 ml-1">✓</span>}
                        </span>
                      </div>
                      <div className="text-xs opacity-75 capitalize">{r.level}</div>
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
                  <h3 className="text-xl font-bold text-purple-200">{recipe.displayName}</h3>
                  <p className="text-purple-400 text-sm mt-1">{recipe.description}</p>
                </div>

                {/* Effect Description */}
                <div className="bg-purple-800/30 px-3 py-2 rounded text-sm">
                  <span className="text-purple-400 font-bold">Effect:</span>
                  <span className="text-purple-200 ml-2">{recipe.effectDescription}</span>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm flex-wrap">
                  <div className="bg-purple-800/50 px-3 py-2 rounded">
                    <span className="text-purple-400">Difficulty:</span>
                    <span className="text-yellow-300 ml-2">
                      {difficultyStars(recipe.difficulty)}
                    </span>
                  </div>
                  <div className="bg-purple-800/50 px-3 py-2 rounded">
                    <span className="text-purple-400">Brewing Time:</span>
                    <span className="text-purple-200 ml-2">{recipe.brewingTime}s</span>
                  </div>
                  <div className="bg-purple-800/50 px-3 py-2 rounded">
                    <span className="text-purple-400">Makes:</span>
                    <span className="text-purple-200 ml-2">{recipe.resultQuantity}×</span>
                  </div>
                  <div className="bg-purple-800/50 px-3 py-2 rounded capitalize">
                    <span className="text-purple-400">Level:</span>
                    <span className="text-purple-200 ml-2">{recipe.level}</span>
                  </div>
                </div>

                {/* Progress */}
                {(() => {
                  const progress = magicManager.getProgress(recipe.id);
                  if (progress) {
                    return (
                      <div className="bg-purple-800/30 px-3 py-2 rounded text-sm">
                        <span className="text-purple-400">Brewed:</span>
                        <span className="text-purple-200 ml-2">{progress.timesBrewed} times</span>
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
                  <h4 className="text-purple-300 font-bold mb-2">Ingredients</h4>
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
                            <span className="text-purple-200">{info.name}</span>
                          </div>
                          <span className={info.hasEnough ? 'text-green-400' : 'text-red-400'}>
                            {info.have}/{info.needed}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Brew Button */}
                <div className="pt-4">
                  <button
                    onClick={handleBrew}
                    className="w-full py-3 rounded-lg font-bold text-lg transition-colors bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    🧪 Brew Potion!
                  </button>
                </div>

                {/* Result Message */}
                {showResult && brewingResult && (
                  <div
                    className={`p-4 rounded-lg text-center font-bold ${
                      brewingResult.success
                        ? 'bg-green-800/50 text-green-200 border border-green-600'
                        : 'bg-red-800/50 text-red-200 border border-red-600'
                    }`}
                  >
                    {brewingResult.success ? '✨ ' : '❌ '}
                    {brewingResult.message}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-purple-400 italic">Select a recipe to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-purple-900/50 px-4 py-2 border-t border-purple-700 text-center">
          <p className="text-purple-400 text-xs">
            Press ESC to close • Master all recipes in a level to unlock the next level
          </p>
        </div>
      </div>
    </div>
  );
};

export default MagicRecipeBook;
