/**
 * CookingResultPopup - Cottagecore-styled popup for cooking results
 *
 * Overlays on top of the cooking book/interface to show success or failure
 * messages prominently, with a warm handmade aesthetic. Shows Mum's portrait
 * as the icon and an ingredient checklist on failure so the player can see
 * at a glance what they still need.
 */

import React, { useEffect, useState } from 'react';
import { CookingResult } from '../utils/CookingManager';
import { getRecipe } from '../data/recipes';
import { getItem } from '../data/items';
import { inventoryManager } from '../utils/inventoryManager';
import { npcAssets } from '../assets';
import { BookThemeConfig } from './book/bookThemes';

interface CookingResultPopupProps {
  result: CookingResult;
  /** Recipe ID — used to show ingredient checklist on failure */
  recipeId?: string;
  /** Book theme for consistent styling (optional — uses defaults for CookingInterface) */
  theme?: BookThemeConfig;
  /** Called when the popup is dismissed */
  onDismiss: () => void;
  /** Auto-dismiss after this many ms (default 4000) */
  autoDismissMs?: number;
}

const CookingResultPopup: React.FC<CookingResultPopupProps> = ({
  result,
  recipeId,
  theme,
  onDismiss,
  autoDismissMs = 4000,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  // Animate in on mount, auto-dismiss after timeout
  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade-out
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  // Colour scheme
  const colours = result.success
    ? {
        border: theme?.successColour || '#5C6B3D',
        bg: theme?.successColour ? `${theme.successColour}18` : '#5C6B3D18',
        accent: theme?.successColour || '#5C6B3D',
        iconBg: theme?.successColour ? `${theme.successColour}30` : '#5C6B3D30',
      }
    : {
        border: theme?.errorColour || '#A4414F',
        bg: theme?.errorColour ? `${theme.errorColour}18` : '#A4414F18',
        accent: theme?.errorColour || '#A4414F',
        iconBg: theme?.errorColour ? `${theme.errorColour}30` : '#A4414F30',
      };

  const successColour = theme?.successColour || '#5C6B3D';
  const textColour = theme?.textPrimary || '#4a3228';
  const mutedColour = theme?.textMuted || '#8C7A6B';
  const fontHeading = theme?.fontHeading || '"Palatino Linotype", "Book Antiqua", Palatino, serif';
  const fontBody = theme?.fontBody || 'Georgia, "Times New Roman", serif';

  // Build ingredient checklist when we have a recipeId
  const recipe = recipeId ? getRecipe(recipeId) : null;
  const ingredientChecklist = recipe
    ? recipe.ingredients.map((ing) => {
        const item = getItem(ing.itemId);
        const have = inventoryManager.getQuantity(ing.itemId);
        return {
          name: item?.displayName || ing.itemId,
          image: item?.image,
          need: ing.quantity,
          have,
          hasEnough: have >= ing.quantity,
        };
      })
    : [];

  // Pick title based on result
  const title = result.success
    ? result.masteryAchieved
      ? 'Recipe Mastered!'
      : 'Cooking Success!'
    : 'Oh Dear...';

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-auto"
      style={{ zIndex: 50 }}
      onClick={handleClick}
    >
      {/* Translucent backdrop */}
      <div
        className="absolute inset-0 rounded-lg transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(74, 50, 40, 0.35)',
          opacity: isVisible ? 1 : 0,
        }}
      />

      {/* Popup card */}
      <div
        className="relative max-w-sm w-full mx-4 transition-all duration-300 cursor-pointer"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(12px)',
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleClick();
        }}
      >
        {/* Mum portrait medallion */}
        <div className="flex justify-center -mb-3" style={{ zIndex: 2, position: 'relative' }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg overflow-hidden"
            style={{
              backgroundColor: colours.iconBg,
              border: `3px solid ${colours.border}`,
              boxShadow: `0 4px 12px ${colours.border}40`,
            }}
          >
            <img
              src={npcAssets.mum_portrait}
              alt="Mum"
              className="w-full h-full object-cover"
              style={{ transform: 'scale(3)', transformOrigin: '50% 33%' }}
            />
          </div>
        </div>

        {/* Main card body */}
        <div
          className="rounded-xl shadow-xl px-6 pt-10 pb-5 text-center"
          style={{
            backgroundColor: '#FAF6F0',
            border: `2px solid ${colours.border}`,
            boxShadow: `
              0 8px 32px rgba(74, 50, 40, 0.25),
              inset 0 1px 0 rgba(255, 255, 255, 0.6)
            `,
            backgroundImage: `
              radial-gradient(ellipse at 20% 50%, ${colours.bg} 0%, transparent 50%),
              radial-gradient(ellipse at 80% 50%, ${colours.bg} 0%, transparent 50%)
            `,
          }}
        >
          {/* Title */}
          <h3
            className="text-xl font-bold mb-2"
            style={{
              fontFamily: fontHeading,
              color: colours.accent,
            }}
          >
            {title}
          </h3>

          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <div
              className="h-px flex-1"
              style={{ backgroundColor: colours.border, opacity: 0.3 }}
            />
            <span style={{ color: colours.accent, fontSize: '12px' }}>✿</span>
            <div
              className="h-px flex-1"
              style={{ backgroundColor: colours.border, opacity: 0.3 }}
            />
          </div>

          {/* Short message for failures (ingredient list replaces the long text) */}
          {!result.success && ingredientChecklist.length > 0 ? (
            <p
              className="text-sm leading-relaxed mb-3"
              style={{ fontFamily: fontBody, color: textColour }}
            >
              You&apos;re missing a few ingredients:
            </p>
          ) : (
            <p
              className="text-base leading-relaxed mb-3"
              style={{ fontFamily: fontBody, color: textColour }}
            >
              {result.message}
            </p>
          )}

          {/* Ingredient checklist (shown on failure when recipeId is provided) */}
          {!result.success && ingredientChecklist.length > 0 && (
            <div className="mb-3 space-y-1.5 text-left">
              {ingredientChecklist.map((ing) => (
                <div
                  key={ing.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    backgroundColor: ing.hasEnough ? `${successColour}12` : `${colours.accent}12`,
                    fontFamily: fontBody,
                  }}
                >
                  {/* Ingredient image or fallback dot */}
                  {ing.image ? (
                    <img
                      src={ing.image}
                      alt={ing.name}
                      className="w-5 h-5 object-contain flex-shrink-0"
                    />
                  ) : (
                    <span
                      className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                      style={{ color: mutedColour }}
                    >
                      •
                    </span>
                  )}

                  {/* Ingredient name */}
                  <span
                    className="flex-1"
                    style={{
                      color: ing.hasEnough ? textColour : colours.accent,
                    }}
                  >
                    {ing.name}
                  </span>

                  {/* Quantity and status */}
                  <span
                    className="flex-shrink-0 font-medium"
                    style={{
                      color: ing.hasEnough ? successColour : colours.accent,
                    }}
                  >
                    {ing.have}/{ing.need} {ing.hasEnough ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Extra info for special results */}
          {result.masteryAchieved && (
            <p
              className="text-sm italic mb-2"
              style={{ color: colours.accent, fontFamily: fontBody }}
            >
              You&apos;ve perfected this recipe!
            </p>
          )}
          {result.isTerrible && (
            <p className="text-sm italic mb-2" style={{ color: mutedColour, fontFamily: fontBody }}>
              Perhaps try a different approach next time...
            </p>
          )}
          {result.feelingSick && (
            <p
              className="text-sm italic mb-2"
              style={{ color: colours.accent, fontFamily: fontBody }}
            >
              Your stomach doesn&apos;t feel so good.
            </p>
          )}

          {/* Dismiss hint */}
          <p className="text-xs mt-2" style={{ color: mutedColour }}>
            Click to dismiss
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookingResultPopup;
