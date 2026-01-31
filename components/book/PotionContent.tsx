import React, { useState, useMemo, useCallback } from 'react';
import {
  PotionRecipeDefinition,
  PotionLevel,
  POTION_RECIPES,
  getPotionRecipe,
} from '../../data/potionRecipes';
import { getItem } from '../../data/items';
import { magicManager, BrewingResult } from '../../utils/MagicManager';
import { inventoryManager } from '../../utils/inventoryManager';
import { BookThemeConfig, bookStyles, getThemeStyles } from './bookThemes';
import { BookChapter, useBookPagination } from '../../hooks/useBookPagination';
import BookSpread from './BookSpread';
import ImageZoomPopover from './ImageZoomPopover';
import LevelUpCelebration from '../LevelUpCelebration';

interface PotionContentProps {
  theme: BookThemeConfig;
}

/**
 * PotionContent - Magic potion book content
 *
 * Displays potions organised by level (Novice, Journeyman, Master) with
 * a list on the left page and potion details on the right page.
 * Players must master all recipes in a level to unlock the next.
 */
const PotionContent: React.FC<PotionContentProps> = ({ theme }) => {
  const [brewingResult, setBrewingResult] = useState<BrewingResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<PotionLevel | null>(null);

  const styles = getThemeStyles(theme);

  // Get current apprentice level and progress
  const currentLevel = magicManager.getCurrentLevel();
  const levelProgress = magicManager.getLevelMasteryProgress();

  // Potion levels as chapters
  const potionChapters: BookChapter<PotionLevel | 'all'>[] = useMemo(
    () => [
      { id: 'all', label: 'All Potions', icon: '📚' },
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
    ],
    []
  );

  // Get all unlocked recipes
  const unlockedRecipes = useMemo(() => magicManager.getUnlockedRecipes(), []);

  // Group recipes by level
  const recipesByLevel = useMemo(() => {
    const byLevel: Record<PotionLevel | 'all', PotionRecipeDefinition[]> = {
      all: unlockedRecipes,
      novice: [],
      journeyman: [],
      master: [],
    };
    unlockedRecipes.forEach((recipe) => {
      if (byLevel[recipe.level]) {
        byLevel[recipe.level].push(recipe);
      }
    });
    return byLevel;
  }, [unlockedRecipes]);

  // Use pagination hook
  const pagination = useBookPagination(potionChapters, recipesByLevel, 8);

  // Get ingredient display info
  const getIngredientInfo = useCallback((itemId: string, needed: number) => {
    const item = getItem(itemId);
    const have = inventoryManager.getQuantity(itemId);
    const hasEnough = have >= needed;
    return {
      name: item?.displayName || itemId,
      image: item?.image,
      have,
      needed,
      hasEnough,
    };
  }, []);

  // Handle brewing
  const handleBrew = useCallback((recipeId: string) => {
    const result = magicManager.brew(recipeId);
    setBrewingResult(result);
    setShowResult(true);

    // Show level-up celebration if player advanced
    if (result.levelUp && result.newLevel) {
      setLevelUpLevel(result.newLevel);
    }

    const duration = result.levelUp ? 5000 : 3000;
    setTimeout(() => {
      setShowResult(false);
      setBrewingResult(null);
    }, duration);
  }, []);

  // Handle dismissing the level-up celebration
  const handleDismissLevelUp = useCallback(() => {
    setLevelUpLevel(null);
  }, []);

  // Get selected potion details
  const selectedPotion = pagination.selectedItem;

  // Check if we can brew
  const canBrew = selectedPotion ? magicManager.hasIngredients(selectedPotion.id) : false;

  // Difficulty stars display
  const difficultyStars = (difficulty: 1 | 2 | 3) => {
    return '★'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
  };

  // Level title
  const getLevelTitle = (level: PotionLevel): string => {
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  // Left page: Potion list
  const leftPageContent = (
    <div className="h-full flex flex-col">
      <h2
        className="text-lg font-bold mb-2 pb-1 border-b"
        style={{
          fontFamily: bookStyles.fontFamily.heading,
          color: theme.textPrimary,
          borderColor: theme.accentPrimary,
        }}
      >
        {pagination.currentChapter?.label}
      </h2>

      {/* Level progress bar (for non-all chapters) */}
      {pagination.currentChapterId !== 'all' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: theme.textSecondary }}>
              {getLevelTitle(currentLevel)} Progress
            </span>
            <span style={{ color: theme.textMuted }}>{levelProgress.percentage}%</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: `${theme.accentPrimary}20` }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${levelProgress.percentage}%`,
                background: `linear-gradient(to right, ${theme.accentPrimary}, ${theme.accentSecondary})`,
              }}
            />
          </div>
          {levelProgress.percentage === 100 && currentLevel !== 'master' && (
            <p className="text-xs mt-1 italic" style={{ color: theme.masteredColour }}>
              ★ Ready to advance!
            </p>
          )}
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto">
        {pagination.currentPageItems.map((potion, index) => {
          const progress = magicManager.getProgress(potion.id);
          const isMastered = progress?.isMastered;
          const hasIngredients = magicManager.hasIngredients(potion.id);
          const isSelected = pagination.selectedItemIndex === index;

          return (
            <button
              key={potion.id}
              onClick={() => pagination.selectItem(index)}
              className={`
                w-full text-left px-3 py-2 rounded transition-all duration-150
                ${isSelected ? 'shadow-md' : 'hover:bg-black/5'}
              `}
              style={{
                backgroundColor: isSelected ? `${theme.accentPrimary}30` : 'transparent',
                borderLeft: isSelected
                  ? `3px solid ${theme.accentPrimary}`
                  : '3px solid transparent',
                fontFamily: bookStyles.fontFamily.body,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: theme.textPrimary }}>
                  {potion.displayName}
                </span>
                <span className="text-sm flex items-center gap-1">
                  {isMastered && <span style={{ color: theme.masteredColour }}>★</span>}
                  {hasIngredients && <span style={{ color: theme.successColour }}>✓</span>}
                </span>
              </div>
              <div className="text-xs capitalize" style={{ color: theme.textMuted }}>
                {potion.level}
              </div>
            </button>
          );
        })}

        {pagination.currentPageItems.length === 0 && (
          <p className="text-center py-8 italic" style={{ color: theme.textMuted }}>
            {potionChapters.find((c) => c.id === pagination.currentChapterId)?.locked
              ? 'Unlock this level by mastering all previous recipes'
              : 'No potions in this chapter yet'}
          </p>
        )}
      </div>
    </div>
  );

  // Right page: Potion details
  const rightPageContent = (
    <div className="h-full flex flex-col overflow-y-auto">
      {selectedPotion ? (
        <div className="space-y-2">
          {/* Potion header */}
          <h3
            className="text-xl font-bold"
            style={{
              fontFamily: bookStyles.fontFamily.heading,
              color: theme.textPrimary,
            }}
          >
            {selectedPotion.displayName}
          </h3>
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            {selectedPotion.description}
          </p>

          {/* Potion image - larger, no frame, with zoom on hover */}
          {(() => {
            const resultItem = getItem(selectedPotion.resultItemId);
            if (resultItem?.image) {
              return (
                <div className="flex justify-center py-1">
                  <ImageZoomPopover
                    src={resultItem.image}
                    alt={selectedPotion.displayName}
                    zoomSize={280}
                  >
                    <img
                      src={resultItem.image}
                      alt={selectedPotion.displayName}
                      className="max-h-36 object-contain"
                    />
                  </ImageZoomPopover>
                </div>
              );
            }
            return null;
          })()}

          {/* Effect description */}
          <div
            className="text-sm p-2 rounded"
            style={{ backgroundColor: `${theme.accentPrimary}15` }}
          >
            <span className="font-bold" style={{ color: theme.textSecondary }}>
              Effect:{' '}
            </span>
            <span style={{ color: theme.textPrimary }}>{selectedPotion.effectDescription}</span>
          </div>

          {/* Stats row */}
          <div
            className="flex flex-wrap gap-2 text-xs py-2 border-y"
            style={{ borderColor: theme.accentPrimary }}
          >
            <span style={{ color: theme.textSecondary }}>
              Difficulty:{' '}
              <span style={{ color: theme.masteredColour }}>
                {difficultyStars(selectedPotion.difficulty)}
              </span>
            </span>
            <span style={{ color: theme.textSecondary }}>
              • Time: {selectedPotion.brewingTime}s
            </span>
            <span style={{ color: theme.textSecondary }}>
              • Makes: {selectedPotion.resultQuantity}×
            </span>
          </div>

          {/* Brew progress */}
          {(() => {
            const progress = magicManager.getProgress(selectedPotion.id);
            if (progress) {
              return (
                <div className="text-sm">
                  <span style={{ color: theme.textSecondary }}>Brewed: </span>
                  <span style={{ color: theme.textPrimary }}>{progress.timesBrewed} times</span>
                  {progress.isMastered && (
                    <span className="ml-2 font-bold" style={{ color: theme.masteredColour }}>
                      ★ Mastered!
                    </span>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {/* Ingredients */}
          <div>
            <h4 className="font-bold mb-2" style={{ color: theme.textPrimary }}>
              Ingredients
            </h4>
            <div className="space-y-2">
              {selectedPotion.ingredients.map((ing) => {
                const info = getIngredientInfo(ing.itemId, ing.quantity);
                return (
                  <div
                    key={ing.itemId}
                    className="flex items-center justify-between p-2 rounded border"
                    style={{
                      backgroundColor: info.hasEnough
                        ? `${theme.successColour}15`
                        : `${theme.errorColour}15`,
                      borderColor: info.hasEnough ? theme.successColour : theme.errorColour,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {info.image && (
                        <ImageZoomPopover src={info.image} alt={info.name} zoomSize={180}>
                          <img
                            src={info.image}
                            alt={info.name}
                            className="w-6 h-6 object-contain"
                          />
                        </ImageZoomPopover>
                      )}
                      <span style={{ color: theme.textSecondary }}>{info.name}</span>
                    </div>
                    <span
                      style={{ color: info.hasEnough ? theme.successColour : theme.errorColour }}
                    >
                      {info.have}/{info.needed}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Result message */}
          {showResult && brewingResult && (
            <div
              className="p-3 rounded-lg text-center font-bold border"
              style={brewingResult.success ? styles.success : styles.error}
            >
              {brewingResult.success ? '✨ ' : '❌ '}
              {brewingResult.message}
            </div>
          )}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="italic" style={{ color: theme.textMuted }}>
            Select a potion to view details
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full">
      {/* Brew button - positioned next to the title badge */}
      {selectedPotion && (
        <button
          onClick={() => handleBrew(selectedPotion.id)}
          className="absolute -top-5 left-1/2 ml-36 px-5 py-1.5 rounded-full font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 z-20"
          style={{
            backgroundColor: theme.buttonColour,
            fontFamily: bookStyles.fontFamily.body,
          }}
        >
          {theme.actionIcon} Brew!
        </button>
      )}

      <BookSpread
        theme={theme}
        leftPageContent={leftPageContent}
        rightPageContent={rightPageContent}
        leftPageNumber={pagination.currentPageIndex + 1}
        totalPages={pagination.totalPages}
        chapters={potionChapters}
        currentChapterId={pagination.currentChapterId}
        onChapterSelect={pagination.goToChapter}
        canGoPrev={pagination.canGoPrev}
        canGoNext={pagination.canGoNext}
        onPrevPage={pagination.prevPage}
        onNextPage={pagination.nextPage}
      />

      {/* Level-up celebration overlay */}
      {levelUpLevel && (
        <LevelUpCelebration newLevel={levelUpLevel} onDismiss={handleDismissLevelUp} />
      )}
    </div>
  );
};

export default PotionContent;
