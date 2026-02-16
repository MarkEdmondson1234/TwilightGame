import React, { useState, useMemo, useCallback } from 'react';
import { RecipeDefinition, RecipeCategory, RECIPES, getRecipe } from '../../data/recipes';
import { getItem } from '../../data/items';
import { cookingManager, CookingResult } from '../../utils/CookingManager';
import { audioManager } from '../../utils/AudioManager';
import { inventoryManager } from '../../utils/inventoryManager';
import { gameState } from '../../GameState';
import { PlacedItem, Position } from '../../types';
import { BookThemeConfig, getThemeStyles } from './bookThemes';
import { BookChapter, useBookPagination } from '../../hooks/useBookPagination';
import GameIcon from '../GameIcon';
import BookSpread from './BookSpread';
import ImageZoomPopover from './ImageZoomPopover';
import CookingResultPopup from '../CookingResultPopup';

interface RecipeContentProps {
  theme: BookThemeConfig;
  playerPosition?: Position;
  currentMapId?: string;
  cookingPosition?: Position | null;
  nearbyNPCs?: string[];
  onItemPlaced?: () => void;
}

// Recipe categories as chapters
const RECIPE_CHAPTERS: BookChapter<RecipeCategory | 'all'>[] = [
  { id: 'all', label: 'All Recipes', icon: '📚' },
  { id: 'starter', label: 'Basics', icon: '🍵' },
  { id: 'tutorial', label: 'Tutorial', icon: '👩‍🍳' },
  { id: 'savoury', label: 'Savoury', icon: '🍝' },
  { id: 'dessert', label: 'Desserts', icon: '🍰' },
  { id: 'baking', label: 'Baking', icon: '🍞' },
];

/**
 * RecipeContent - Cooking recipe book content
 *
 * Displays recipes organised by category (chapters) with a list on the
 * left page and recipe details on the right page.
 */
const RecipeContent: React.FC<RecipeContentProps> = ({
  theme,
  playerPosition,
  currentMapId,
  cookingPosition,
  nearbyNPCs = [],
  onItemPlaced,
}) => {
  const [cookingResult, setCookingResult] = useState<CookingResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const styles = getThemeStyles(theme);

  // Get all recipes
  const allRecipes = useMemo(() => Object.values(RECIPES), []);

  // Group recipes by category
  const recipesByCategory = useMemo(() => {
    const byCategory: Record<RecipeCategory | 'all', RecipeDefinition[]> = {
      all: allRecipes,
      starter: [],
      tutorial: [],
      savoury: [],
      dessert: [],
      baking: [],
    };
    allRecipes.forEach((recipe) => {
      if (byCategory[recipe.category]) {
        byCategory[recipe.category].push(recipe);
      }
    });
    return byCategory;
  }, [allRecipes]);

  // Use pagination hook
  const pagination = useBookPagination(RECIPE_CHAPTERS, recipesByCategory, 8);

  // Check recipe status
  const isUnlocked = useCallback(
    (recipeId: string) => cookingManager.isRecipeUnlocked(recipeId),
    []
  );
  const isMastered = useCallback(
    (recipeId: string) => cookingManager.isRecipeMastered(recipeId),
    []
  );

  // Get unlock hint for locked recipes
  const getUnlockHint = useCallback((recipe: RecipeDefinition): string => {
    if (recipe.category === 'starter') return 'Available from the start';
    if (recipe.teacherNpc) return `Learn from ${recipe.teacherNpc}`;
    if (recipe.unlockRequirement) {
      const prereq = getRecipe(recipe.unlockRequirement);
      return prereq ? `Master "${prereq.displayName}" first` : 'Complete prerequisite recipe';
    }
    return 'Discover through gameplay';
  }, []);

  // Check if player can cook (has ingredients or near Mum for Tea)
  const canCook = useCallback(
    (recipeId: string) => {
      const isNearMum = nearbyNPCs.some((npcId) => npcId.includes('mum'));
      if (isNearMum && recipeId === 'tea') return true;
      return cookingManager.hasIngredients(recipeId);
    },
    [nearbyNPCs]
  );

  // Handle cooking
  const handleCook = useCallback(
    (recipeId: string) => {
      audioManager.playSfx('sfx_frying');
      const isNearMum = nearbyNPCs.some((npcId) => npcId.includes('mum'));

      let result: CookingResult;

      if (isNearMum && recipeId === 'tea') {
        const recipe = getRecipe(recipeId);
        if (recipe) {
          inventoryManager.addItem(recipe.resultItemId, recipe.resultQuantity);
          result = {
            success: true,
            message: `Cooked ${recipe.resultQuantity}x ${recipe.displayName} with Mum's help!`,
            foodProduced: { itemId: recipe.resultItemId, quantity: recipe.resultQuantity },
          };
        } else {
          result = { success: false, message: 'Recipe not found.' };
        }
      } else {
        result = cookingManager.cook(recipeId);
      }

      setCookingResult(result);
      setShowResult(true);

      // Place food on cooking surface if successful
      if (result.success && result.foodProduced && currentMapId) {
        const recipe = getRecipe(recipeId);
        if (recipe?.image) {
          inventoryManager.removeItem(result.foodProduced.itemId, result.foodProduced.quantity);
          const placePosition = cookingPosition
            ? { x: cookingPosition.x, y: cookingPosition.y }
            : playerPosition
              ? { x: Math.round(playerPosition.x), y: Math.round(playerPosition.y) - 1 }
              : null;

          if (placePosition) {
            const placedItem: PlacedItem = {
              id: `food_${Date.now()}_${Math.random()}`,
              itemId: result.foodProduced.itemId,
              position: placePosition,
              mapId: currentMapId,
              image: recipe.image,
              timestamp: Date.now(),
            };
            gameState.addPlacedItem(placedItem);
            onItemPlaced?.();
          }
        }
      }

      // Popup handles its own auto-dismiss via CookingResultPopup
    },
    [nearbyNPCs, currentMapId, cookingPosition, playerPosition, onItemPlaced]
  );

  // Get selected recipe details
  const selectedRecipe = pagination.selectedItem;
  const recipeUnlocked = selectedRecipe ? isUnlocked(selectedRecipe.id) : false;

  // Difficulty stars display
  const difficultyStars = (difficulty: 1 | 2 | 3) => {
    return '★'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
  };

  // Left page: Recipe list
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

      <div className="flex-1 space-y-1 overflow-y-auto">
        {pagination.currentPageItems.map((recipe, index) => {
          const unlocked = isUnlocked(recipe.id);
          const mastered = isMastered(recipe.id);
          const isSelected = pagination.selectedItemIndex === index;

          return (
            <button
              key={recipe.id}
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
                <span
                  className={`font-medium text-base ${!unlocked ? 'italic' : ''}`}
                  style={{ color: unlocked ? theme.textPrimary : theme.lockedColour }}
                >
                  {unlocked ? recipe.displayName : '???'}
                </span>
                <span className="text-base">
                  {mastered && <span style={{ color: theme.masteredColour }}>★</span>}
                  {unlocked && !mastered && <span style={{ color: theme.successColour }}>✓</span>}
                  {!unlocked && <GameIcon icon="🔒" size={16} />}
                </span>
              </div>
            </button>
          );
        })}

        {pagination.currentPageItems.length === 0 && (
          <p className="text-center py-8 italic" style={{ color: theme.textMuted }}>
            No recipes in this chapter yet
          </p>
        )}
      </div>

      {/* Stats */}
      <div
        className="mt-3 pt-2 border-t text-sm"
        style={{ borderColor: theme.accentPrimary, color: theme.textMuted }}
      >
        <span style={{ color: theme.accentPrimary }}>
          {cookingManager.getUnlockedRecipes().length}
        </span>
        /{allRecipes.length} unlocked •{' '}
        <span style={{ color: theme.masteredColour }}>
          {cookingManager.getMasteredRecipes().length}
        </span>{' '}
        mastered
      </div>
    </div>
  );

  // Right page: Recipe details
  const rightPageContent = (
    <div className="h-full flex flex-col">
      {selectedRecipe ? (
        recipeUnlocked ? (
          <div className="h-full flex flex-col">
            {/* Fixed header section */}
            <div className="flex-shrink-0 space-y-1">
              {/* Recipe header */}
              <h3
                className="text-xl font-bold"
                style={{
                  fontFamily: theme.fontHeading,
                  color: theme.textPrimary,
                }}
              >
                {selectedRecipe.displayName}
              </h3>
              <p className="text-sm" style={{ color: theme.textSecondary }}>
                {selectedRecipe.description}
              </p>

              {/* Recipe image - larger, no frame, with zoom on hover */}
              {selectedRecipe.image && (
                <div className="flex justify-center">
                  <ImageZoomPopover
                    src={selectedRecipe.image}
                    alt={selectedRecipe.displayName}
                    zoomSize={280}
                  >
                    <img
                      src={selectedRecipe.image}
                      alt={selectedRecipe.displayName}
                      className="max-h-28 object-contain"
                    />
                  </ImageZoomPopover>
                </div>
              )}

              {/* Stats row */}
              <div
                className="flex flex-wrap gap-2 text-sm py-1 border-y"
                style={{ borderColor: theme.accentPrimary }}
              >
                <span style={{ color: theme.textSecondary }}>
                  {difficultyStars(selectedRecipe.difficulty)}
                </span>
                <span style={{ color: theme.textSecondary }}>• {selectedRecipe.cookingTime}s</span>
                <span style={{ color: theme.textSecondary }}>
                  • +{selectedRecipe.friendshipValue} ♥
                </span>
                {(() => {
                  const progress = cookingManager.getProgress(selectedRecipe.id);
                  const mastered = progress?.isMastered;
                  const times = progress?.timesCooked || 0;
                  return mastered ? (
                    <span style={{ color: theme.masteredColour }} className="font-bold ml-auto">
                      ★ Mastered
                    </span>
                  ) : (
                    <span style={{ color: theme.textMuted }} className="ml-auto">
                      {times}/3
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Scrollable ingredients section */}
            <div className="flex-1 min-h-0 overflow-y-auto mt-1">
              <h4 className="font-bold mb-1 text-base" style={{ color: theme.textPrimary }}>
                Ingredients
              </h4>
              <div className="grid grid-cols-2 gap-1">
                {selectedRecipe.ingredients.map((ing) => {
                  const item = getItem(ing.itemId);
                  return (
                    <div
                      key={ing.itemId}
                      className="flex items-center gap-1 text-sm p-1.5 rounded"
                      style={{ backgroundColor: `${theme.accentPrimary}10` }}
                    >
                      {item?.image && (
                        <ImageZoomPopover src={item.image} alt={item.displayName} zoomSize={180}>
                          <img
                            src={item.image}
                            alt={item.displayName}
                            className="w-5 h-5 object-contain"
                          />
                        </ImageZoomPopover>
                      )}
                      <span style={{ color: theme.textSecondary }}>
                        {item?.displayName || ing.itemId}
                      </span>
                      <span style={{ color: theme.textMuted }} className="ml-auto">
                        ×{ing.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Instructions (if available) */}
              {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                <div className="mt-2">
                  <h4 className="font-bold mb-1 text-base" style={{ color: theme.textPrimary }}>
                    Instructions
                  </h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm pl-1">
                    {selectedRecipe.instructions.map((step, index) => (
                      <li
                        key={index}
                        className="leading-relaxed"
                        style={{ color: theme.textSecondary }}
                      >
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Result message - now shown as popup overlay */}

              {/* Mum helper hint */}
              {canCook(selectedRecipe.id) &&
                !cookingManager.hasIngredients(selectedRecipe.id) &&
                nearbyNPCs.some((id) => id.includes('mum')) && (
                  <p
                    className="text-center text-sm italic mt-1"
                    style={{ color: theme.accentPrimary }}
                  >
                    ✨ Mum is helping you cook!
                  </p>
                )}
            </div>
          </div>
        ) : (
          // Locked recipe view
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="mb-4">
              <GameIcon icon="🔒" size={56} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.textMuted }}>
              Recipe Locked
            </h3>
            <p className="italic" style={{ color: theme.accentPrimary }}>
              {getUnlockHint(selectedRecipe)}
            </p>
            <p className="mt-4 text-base" style={{ color: theme.textMuted }}>
              {selectedRecipe.category} • Difficulty: {difficultyStars(selectedRecipe.difficulty)}
            </p>
          </div>
        )
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="italic" style={{ color: theme.textMuted }}>
            Select a recipe to view details
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-full">
      {/* Cook button - positioned next to the title badge */}
      {selectedRecipe && recipeUnlocked && (
        <button
          onClick={() => handleCook(selectedRecipe.id)}
          className="absolute -top-5 left-1/2 ml-32 px-5 py-1.5 rounded-full font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 z-20"
          style={{
            backgroundColor: theme.buttonColour,
            fontFamily: theme.fontBody,
          }}
        >
          {theme.actionIcon} Cook!
        </button>
      )}

      <BookSpread
        theme={theme}
        leftPageContent={leftPageContent}
        rightPageContent={rightPageContent}
        leftPageNumber={pagination.currentPageIndex + 1}
        totalPages={pagination.totalPages}
        chapters={RECIPE_CHAPTERS}
        currentChapterId={pagination.currentChapterId}
        onChapterSelect={pagination.goToChapter}
        canGoPrev={pagination.canGoPrev}
        canGoNext={pagination.canGoNext}
        onPrevPage={pagination.prevPage}
        onNextPage={pagination.nextPage}
      />

      {/* Cooking result popup overlay */}
      {showResult && cookingResult && (
        <CookingResultPopup
          result={cookingResult}
          ingredients={selectedRecipe?.ingredients}
          theme={theme}
          onDismiss={() => {
            setShowResult(false);
            setCookingResult(null);
          }}
        />
      )}
    </div>
  );
};

export default RecipeContent;
