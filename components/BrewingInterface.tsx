import MobileMenuShell from './MobileMenuShell';
import '../src/styles/mobileMenus.css';
import React, { useEffect, useMemo, useState } from 'react';
import { PotionLevel } from '../data/potionRecipes';
import { getItem } from '../data/items';
import { magicManager, BrewingResult } from '../utils/MagicManager';
import { eventBus, GameEvent } from '../utils/EventBus';
import { audioManager } from '../utils/AudioManager';
import { inventoryManager } from '../utils/inventoryManager';
import { npcAssets } from '../assets';
import { Z_BREWING, zClass } from '../zIndex';
import { useTouchDevice } from '../hooks/useTouchDevice';
import CookingResultPopup from './CookingResultPopup';
import LevelUpCelebration from './LevelUpCelebration';

interface BrewingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * BrewingInterface - Modal overlay for the cauldron brewing system
 *
 * The station counterpart of the magic recipe book (PotionContent): the book is
 * the recipe manual, the cauldron is where potions get made. Both are thin UIs
 * over the same MagicManager — recipe knowledge, ingredient checks, mastery
 * and apprentice level progression all live there (single source of truth).
 *
 * Mirrors CookingInterface (stove) in structure; the result popup is the shared
 * CookingResultPopup with the witch-wolf portrait, as in PotionContent.
 */
const BrewingInterface: React.FC<BrewingInterfaceProps> = ({ isOpen, onClose }) => {
  const isTouchDevice = useTouchDevice();
  const [showRecipeList, setShowRecipeList] = useState(true);
  const MenuBoundary = isTouchDevice ? MobileMenuShell : 'div';
  const [selectedLevel, setSelectedLevel] = useState<PotionLevel | 'all'>('all');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [brewingResult, setBrewingResult] = useState<BrewingResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<PotionLevel | null>(null);
  const [magicUpdateTrigger, setMagicUpdateTrigger] = useState(0);

  // Level-ups unlock new recipes — re-evaluate the list, and celebrate.
  useEffect(() => {
    return eventBus.on(GameEvent.MAGIC_LEVEL_UP, (payload) => {
      setMagicUpdateTrigger((prev) => prev + 1);
      setLevelUpLevel(payload.newLevel);
    });
  }, []);

  const unlockedRecipes = useMemo(() => {
    void magicUpdateTrigger;
    return magicManager.getUnlockedRecipes();
  }, [magicUpdateTrigger]);

  const displayedRecipes = useMemo(() => {
    if (selectedLevel === 'all') return unlockedRecipes;
    return unlockedRecipes.filter((r) => r.level === selectedLevel);
  }, [unlockedRecipes, selectedLevel]);

  const recipe = selectedRecipeId
    ? (unlockedRecipes.find((r) => r.id === selectedRecipeId) ?? null)
    : null;

  const getIngredientInfo = (itemId: string, needed: number) => {
    const item = getItem(itemId);
    const have = inventoryManager.getQuantity(itemId);
    return {
      name: item?.displayName || itemId,
      image: item?.image,
      have,
      needed,
      hasEnough: have >= needed,
    };
  };

  const handleBrew = () => {
    if (!recipe) return;
    audioManager.playSfx('sfx_potion_making');

    // MagicManager owns ingredient checks, mastery and level progression —
    // its result message is player-ready either way.
    const result = magicManager.brew(recipe.id);
    setBrewingResult(result);
    setShowResult(true);
  };

  const difficultyStars = (difficulty: 1 | 2 | 3) => {
    return '⭐'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
  };

  if (!isOpen) {
    return null;
  }

  const levelTabs: Array<{
    id: PotionLevel | 'all';
    label: string;
    icon: string;
    locked: boolean;
  }> = [
    { id: 'all', label: 'All', icon: '📚', locked: false },
    { id: 'novice', label: 'Novice', icon: '🌱', locked: !magicManager.isLevelUnlocked('novice') },
    {
      id: 'journeyman',
      label: 'Journeyman',
      icon: '🌿',
      locked: !magicManager.isLevelUnlocked('journeyman'),
    },
    { id: 'master', label: 'Master', icon: '🌙', locked: !magicManager.isLevelUnlocked('master') },
  ];

  return (
    <MenuBoundary
      className={`fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center ${zClass(Z_BREWING)} p-2 sm:p-4 pointer-events-auto`}
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div
        data-mobile-menu={isTouchDevice ? 'brewing' : undefined}
        role="dialog"
        aria-label="Brewing"
        className="relative bg-gradient-to-b from-purple-900 to-purple-950 border-4 border-purple-500 rounded-lg w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="menu-header bg-purple-800 px-4 py-3 border-b-2 border-purple-500 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-purple-200 flex items-center gap-2">
            <span>🧪</span>
            The Cauldron
          </h2>
          {isTouchDevice && !showRecipeList && (
            <button
              aria-label="Back to recipes"
              className="px-3 border rounded"
              onClick={() => setShowRecipeList(true)}
            >
              Recipes
            </button>
          )}
          <button
            aria-label="Close brewing"
            onClick={onClose}
            className="text-purple-300 hover:text-white transition-colors text-2xl font-bold px-2"
          >
            ×
          </button>
        </div>

        {/* Level Tabs */}
        <div
          hidden={isTouchDevice && !showRecipeList}
          className="menu-filters bg-purple-900/50 px-4 py-2 border-b border-purple-700 flex gap-2 overflow-x-auto"
        >
          {levelTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (!tab.locked) {
                  setSelectedLevel(tab.id);
                  setShowRecipeList(true);
                }
              }}
              disabled={tab.locked}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                tab.locked
                  ? 'bg-purple-950/50 text-purple-500 cursor-not-allowed'
                  : selectedLevel === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-800/50 text-purple-300 hover:bg-purple-700'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.locked && ' 🔒'}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="recipe-panels flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Recipe List */}
          <div
            hidden={isTouchDevice && !showRecipeList}
            className="recipe-list w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-purple-700 overflow-y-auto max-h-40 sm:max-h-none"
          >
            <div className="p-2 space-y-1">
              {displayedRecipes.length === 0 ? (
                <p className="text-purple-400 text-sm italic p-2">
                  {unlockedRecipes.length === 0
                    ? "You don't know any potion recipes yet. The witch could teach you..."
                    : 'No recipes at this level yet.'}
                </p>
              ) : (
                displayedRecipes.map((r) => {
                  const progress = magicManager.getProgress(r.id);
                  const isMastered = progress?.isMastered;
                  const hasIngredients = magicManager.hasIngredients(r.id);

                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRecipeId(r.id);
                        setShowRecipeList(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        selectedRecipeId === r.id
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
                      <div className="text-xs opacity-75 capitalize">
                        {r.level} • {r.brewingTime}s
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Recipe Details */}
          <div
            hidden={isTouchDevice && showRecipeList}
            className="recipe-details flex-1 p-4 overflow-y-auto"
          >
            {recipe ? (
              <div className="space-y-4">
                {/* Recipe Header */}
                <div>
                  <h3 className="text-xl font-bold text-purple-200">{recipe.displayName}</h3>
                  <p className="text-purple-400 text-sm mt-1">{recipe.description}</p>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="bg-purple-800/50 px-3 py-2 rounded">
                    <span className="text-purple-400">Difficulty:</span>
                    <span className="text-yellow-300 ml-2">
                      {difficultyStars(recipe.difficulty)}
                    </span>
                  </div>
                  <div className="bg-purple-800/50 px-3 py-2 rounded">
                    <span className="text-purple-400">Time:</span>
                    <span className="text-purple-200 ml-2">{recipe.brewingTime}s</span>
                  </div>
                  <div className="bg-purple-800/50 px-3 py-2 rounded">
                    <span className="text-purple-400">Makes:</span>
                    <span className="text-purple-200 ml-2">{recipe.resultQuantity}×</span>
                  </div>
                </div>

                {/* Effect */}
                <div className="bg-purple-800/30 px-3 py-2 rounded text-sm">
                  <span className="text-purple-400">Effect:</span>
                  <span className="text-purple-200 ml-2">{recipe.effectDescription}</span>
                </div>

                {/* Progress */}
                {(() => {
                  const progress = magicManager.getProgress(recipe.id);
                  if (!progress) return null;
                  return (
                    <div className="bg-purple-800/30 px-3 py-2 rounded text-sm">
                      <span className="text-purple-400">Brewed:</span>
                      <span className="text-purple-200 ml-2">{progress.timesBrewed} time(s)</span>
                      {progress.isMastered && (
                        <span className="text-yellow-400 ml-2">⭐ Mastered!</span>
                      )}
                    </div>
                  );
                })()}

                {/* Ingredients */}
                <div>
                  <h4 className="text-purple-300 font-bold mb-2">Ingredients</h4>
                  <div className="space-y-2">
                    {recipe.ingredients.map((ing) => {
                      const info = getIngredientInfo(ing.itemId, ing.quantity);
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
                            {info.image && (
                              <img
                                src={info.image}
                                alt={info.name}
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
                <div hidden={isTouchDevice} className="recipe-action pt-4">
                  <button
                    onClick={handleBrew}
                    className="w-full py-3 rounded-lg font-bold text-lg transition-colors bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    🧪 Brew!
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-purple-400 italic">Select a potion to view the recipe</p>
              </div>
            )}
          </div>
        </div>

        {isTouchDevice && !showRecipeList && recipe && (
          <div className="mobile-recipe-action pt-2 shrink-0">
            <button
              onClick={handleBrew}
              className="w-full min-h-12 rounded-lg font-bold text-lg text-white bg-purple-600 hover:bg-purple-500"
            >
              🧪 Brew!
            </button>
          </div>
        )}
        {/* Footer */}
        <div className="menu-footer bg-purple-900/50 px-4 py-2 border-t border-purple-700 text-center">
          <p className="text-purple-400 text-xs">
            {isTouchDevice ? 'Tap ✕ to close' : 'Press ESC or E to close'} • Brew a recipe once to
            master it
          </p>
        </div>

        {/* Result popup overlay — shared with cooking/magic book, witch-wolf portrait */}
        {showResult && brewingResult && (
          <CookingResultPopup
            result={brewingResult}
            ingredients={recipe?.ingredients}
            portraitSrc={npcAssets.witch_wolf_portrait}
            portraitZoom={{ scale: 2.2, originY: '25%' }}
            autoDismissMs={brewingResult.levelUp ? 5000 : 4000}
            onDismiss={() => {
              setShowResult(false);
              setBrewingResult(null);
            }}
          />
        )}

        {/* Apprentice level-up celebration (also fired by book brewing) */}
        {levelUpLevel && (
          <LevelUpCelebration newLevel={levelUpLevel} onDismiss={() => setLevelUpLevel(null)} />
        )}
      </div>
    </MenuBoundary>
  );
};

export default BrewingInterface;
