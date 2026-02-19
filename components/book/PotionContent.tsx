import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  PotionRecipeDefinition,
  PotionLevel,
  POTION_RECIPES,
  getPotionRecipe,
} from '../../data/potionRecipes';
import { getItem } from '../../data/items';
import { magicManager, BrewingResult } from '../../utils/MagicManager';
import { eventBus, GameEvent } from '../../utils/EventBus';
import { audioManager } from '../../utils/AudioManager';
import { inventoryManager } from '../../utils/inventoryManager';
import { BookThemeConfig, getThemeStyles } from './bookThemes';
import { BookChapter, useBookPagination } from '../../hooks/useBookPagination';
import BookSpread from './BookSpread';
import ImageZoomPopover from './ImageZoomPopover';
import LevelUpCelebration from '../LevelUpCelebration';
import { renderEncyclopaediaPages } from './EncyclopaediaContent';
import { EncyclopaediaEntry, ENCYCLOPAEDIA_ENTRIES } from '../../data/ingredientEncyclopaedia';
import { npcAssets } from '../../assets';
import CookingResultPopup from '../CookingResultPopup';

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
  const [magicUpdateTrigger, setMagicUpdateTrigger] = useState(0);

  // Re-evaluate chapters and recipes when magic level changes
  useEffect(() => {
    return eventBus.on(GameEvent.MAGIC_LEVEL_UP, () => {
      setMagicUpdateTrigger((prev) => prev + 1);
    });
  }, []);

  const styles = getThemeStyles(theme);

  // Get current apprentice level and progress
  const currentLevel = magicManager.getCurrentLevel();
  const levelProgress = magicManager.getLevelMasteryProgress();

  // Potion levels as chapters
  const potionChapters: BookChapter<PotionLevel | 'all' | 'encyclopaedia'>[] = useMemo(
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
      { id: 'encyclopaedia', label: 'Encyclopaedia', icon: '🌿', locked: false },
    ],
    [magicUpdateTrigger]
  );

  // Get all unlocked recipes (re-evaluate when level changes to include new recipes)
  const unlockedRecipes = useMemo(() => magicManager.getUnlockedRecipes(), [magicUpdateTrigger]);

  // Group recipes by level (plus encyclopaedia entries)
  const recipesByLevel = useMemo(() => {
    const byLevel: Record<
      PotionLevel | 'all' | 'encyclopaedia',
      (PotionRecipeDefinition | EncyclopaediaEntry)[]
    > = {
      all: unlockedRecipes,
      novice: [],
      journeyman: [],
      master: [],
      encyclopaedia: ENCYCLOPAEDIA_ENTRIES,
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
    audioManager.playSfx('sfx_potion_making');
    const result = magicManager.brew(recipeId);
    setBrewingResult(result);
    setShowResult(true);

    // Refresh mastery progress display after each brew
    setMagicUpdateTrigger((prev) => prev + 1);

    // Show level-up celebration if player advanced
    if (result.levelUp && result.newLevel) {
      setLevelUpLevel(result.newLevel);
    }

    // Popup handles its own auto-dismiss via CookingResultPopup
  }, []);

  // Handle dismissing the level-up celebration
  const handleDismissLevelUp = useCallback(() => {
    setLevelUpLevel(null);
  }, []);

  // Encyclopaedia mode check
  const isEncyclopaedia = pagination.currentChapterId === 'encyclopaedia';

  // Get selected potion details (only when not in encyclopaedia mode)
  const selectedPotion = !isEncyclopaedia
    ? (pagination.selectedItem as PotionRecipeDefinition | null)
    : null;
  const selectedEntry = isEncyclopaedia
    ? (pagination.selectedItem as EncyclopaediaEntry | null)
    : null;

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
        className="text-xl font-bold mb-2 pb-1 border-b"
        style={{
          fontFamily: theme.fontHeading,
          color: theme.textPrimary,
          borderColor: theme.accentPrimary,
        }}
      >
        {pagination.currentChapter?.label}
      </h2>

      {/* Level progress bar (for potion level chapters only) */}
      {pagination.currentChapterId !== 'all' && !isEncyclopaedia && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
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
            <p className="text-sm mt-1 italic" style={{ color: theme.masteredColour }}>
              ★ Ready to advance!
            </p>
          )}
        </div>
      )}

      <div className="flex-1 space-y-1 overflow-y-auto">
        {isEncyclopaedia
          ? /* Encyclopaedia ingredient list */
            pagination.currentPageItems.map((item, index) => {
              const entry = item as EncyclopaediaEntry;
              const ingredientItem = getItem(entry.itemId);
              const isSelected = pagination.selectedItemIndex === index;

              return (
                <button
                  key={entry.itemId}
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
                    fontFamily: theme.fontBody,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {ingredientItem?.image && (
                      <img
                        src={ingredientItem.image}
                        alt={ingredientItem.displayName}
                        className="w-6 h-6 object-contain"
                      />
                    )}
                    <span className="font-medium" style={{ color: theme.textPrimary }}>
                      {ingredientItem?.displayName ?? entry.itemId}
                    </span>
                  </div>
                  <div className="text-sm italic" style={{ color: theme.textMuted }}>
                    {entry.latinName}
                  </div>
                </button>
              );
            })
          : /* Potion recipe list */
            pagination.currentPageItems.map((item, index) => {
              const potion = item as PotionRecipeDefinition;
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
                    fontFamily: theme.fontBody,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium" style={{ color: theme.textPrimary }}>
                      {potion.displayName}
                    </span>
                    <span className="text-base flex items-center gap-1">
                      {isMastered && <span style={{ color: theme.masteredColour }}>★</span>}
                      {hasIngredients && <span style={{ color: theme.successColour }}>✓</span>}
                    </span>
                  </div>
                  <div className="text-sm capitalize" style={{ color: theme.textMuted }}>
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

        {pagination.canGoNext && (
          <p className="text-center pt-2 text-xs italic" style={{ color: theme.textMuted }}>
            More entries on next page →
          </p>
        )}
      </div>
    </div>
  );

  // Encyclopaedia pages (override both left and right when entry selected)
  const encyclopaediaPages = isEncyclopaedia
    ? renderEncyclopaediaPages(theme, selectedEntry)
    : null;

  // Right page: Potion details (or encyclopaedia right page)
  const rightPageContent = isEncyclopaedia ? (
    encyclopaediaPages!.rightPage
  ) : (
    <div className="h-full flex flex-col overflow-y-auto">
      {selectedPotion ? (
        <div className="space-y-2">
          {/* Potion header */}
          <h3
            className="text-xl font-bold"
            style={{
              fontFamily: theme.fontHeading,
              color: theme.textPrimary,
            }}
          >
            {selectedPotion.displayName}
          </h3>
          <p className="text-base" style={{ color: theme.textSecondary }}>
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
            className="text-base p-2 rounded"
            style={{ backgroundColor: `${theme.accentPrimary}15` }}
          >
            <span className="font-bold" style={{ color: theme.textSecondary }}>
              Effect:{' '}
            </span>
            <span style={{ color: theme.textPrimary }}>{selectedPotion.effectDescription}</span>
          </div>

          {/* Stats row */}
          <div
            className="flex flex-wrap gap-2 text-sm py-2 border-y"
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
                <div className="text-base">
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

          {/* Result message - now shown as popup overlay */}
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
            fontFamily: theme.fontBody,
          }}
        >
          {theme.actionIcon} Brew!
        </button>
      )}

      <BookSpread
        theme={theme}
        leftPageContent={
          isEncyclopaedia && selectedEntry ? encyclopaediaPages!.leftPage : leftPageContent
        }
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

      {/* Brewing result popup overlay */}
      {showResult && brewingResult && (
        <CookingResultPopup
          result={brewingResult}
          ingredients={selectedPotion?.ingredients}
          portraitSrc={npcAssets.witch_wolf_portrait}
          portraitZoom={{ scale: 2.2, originY: '25%' }}
          theme={theme}
          autoDismissMs={brewingResult.levelUp ? 5000 : 4000}
          onDismiss={() => {
            setShowResult(false);
            setBrewingResult(null);
          }}
        />
      )}

      {/* Level-up celebration overlay */}
      {levelUpLevel && (
        <LevelUpCelebration newLevel={levelUpLevel} onDismiss={handleDismissLevelUp} />
      )}
    </div>
  );
};

export default PotionContent;
