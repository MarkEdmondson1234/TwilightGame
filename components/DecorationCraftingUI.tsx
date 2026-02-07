/**
 * DecorationCraftingUI - Modal overlay for the decoration crafting system
 *
 * Tabs:
 * - Flower Arrangements: select vase + flowers, craft arrangement
 * - Potted Plants: select pot + crop, craft potted plant
 * - Craft Paints: craft paint pots from forageables + honey/water
 *
 * Note: Painting creation is handled by PaintingEaselUI (the painting easel).
 */

import React, { useState, useCallback } from 'react';
import { getItem } from '../data/items';
import {
  PAINT_RECIPES,
  CANVAS_RECIPE,
  FLOWER_ARRANGEMENT_RECIPES,
  POTTED_PLANT_RECIPES,
  DecorationRecipe,
} from '../data/decorationRecipes';
import { decorationManager } from '../utils/DecorationManager';
import { inventoryManager } from '../utils/inventoryManager';
import { Z_MODAL, zClass } from '../zIndex';

type CraftingTab = 'arrangements' | 'plants' | 'paints';

interface DecorationCraftingUIProps {
  isOpen: boolean;
  onClose: () => void;
}

const DecorationCraftingUI: React.FC<DecorationCraftingUIProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<CraftingTab>('arrangements');
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [, setForceUpdate] = useState(0);

  const forceRerender = useCallback(() => setForceUpdate((n) => n + 1), []);

  const handleCraftPaint = useCallback(
    (recipeId: string) => {
      const result = decorationManager.craftPaint(recipeId);
      setResultMessage(result.message);
      if (result.success) forceRerender();
      setTimeout(() => setResultMessage(null), 3000);
    },
    [forceRerender]
  );

  const handleCraftCanvas = useCallback(() => {
    const result = decorationManager.craftCanvas();
    setResultMessage(result.message);
    if (result.success) forceRerender();
    setTimeout(() => setResultMessage(null), 3000);
  }, [forceRerender]);

  const handleCraftDecoration = useCallback(
    (recipeId: string) => {
      const result = decorationManager.craftDecoration(recipeId);
      setResultMessage(result.message);
      if (result.success) forceRerender();
      setTimeout(() => setResultMessage(null), 3000);
    },
    [forceRerender]
  );

  if (!isOpen) return null;

  const tabs: { id: CraftingTab; label: string; icon: string }[] = [
    { id: 'arrangements', label: 'Flowers', icon: '💐' },
    { id: 'plants', label: 'Plants', icon: '🪴' },
    { id: 'paints', label: 'Craft Paints', icon: '🎨' },
  ];

  return (
    <div
      className={zClass(Z_MODAL)}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#2a1f14',
          border: '3px solid #8B7355',
          borderRadius: '12px',
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: '20px',
          color: '#e8d5b7',
          fontFamily: 'inherit',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px' }}>Decoration Workshop</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#e8d5b7',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 12px',
                background: activeTab === tab.id ? '#5a4a3a' : '#3a2f24',
                border: activeTab === tab.id ? '2px solid #8B7355' : '2px solid transparent',
                borderRadius: '8px',
                color: '#e8d5b7',
                cursor: 'pointer',
                fontSize: '13px',
                flex: 1,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Result message */}
        {resultMessage && (
          <div
            style={{
              padding: '8px 12px',
              marginBottom: '12px',
              background: '#3a4a2a',
              borderRadius: '6px',
              textAlign: 'center',
              fontSize: '14px',
            }}
          >
            {resultMessage}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'arrangements' && (
          <RecipeList
            recipes={Object.values(FLOWER_ARRANGEMENT_RECIPES)}
            onCraft={handleCraftDecoration}
          />
        )}

        {activeTab === 'plants' && (
          <RecipeList
            recipes={Object.values(POTTED_PLANT_RECIPES)}
            onCraft={handleCraftDecoration}
          />
        )}

        {activeTab === 'paints' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Canvas recipe */}
            <RecipeCard recipe={CANVAS_RECIPE} onCraft={handleCraftCanvas} />

            <div
              style={{
                height: '1px',
                background: '#5a4a3a',
                margin: '8px 0',
              }}
            />

            {/* Paint recipes */}
            {Object.values(PAINT_RECIPES).map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                colourSwatch={recipe.colour}
                onCraft={() => handleCraftPaint(recipe.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ===== Sub-components =====

interface RecipeListProps {
  recipes: DecorationRecipe[];
  onCraft: (recipeId: string) => void;
}

const RecipeList: React.FC<RecipeListProps> = ({ recipes, onCraft }) => {
  if (recipes.length === 0) {
    return (
      <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
        No recipes available.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} onCraft={() => onCraft(recipe.id)} />
      ))}
    </div>
  );
};

interface RecipeCardProps {
  recipe: DecorationRecipe;
  colourSwatch?: string;
  onCraft: () => void;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe, colourSwatch, onCraft }) => {
  const hasAll = recipe.ingredients.every((ing) =>
    inventoryManager.hasItem(ing.itemId, ing.quantity)
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px',
        background: '#3a2f24',
        borderRadius: '8px',
        border: '1px solid #5a4a3a',
      }}
    >
      {/* Colour swatch (for paints) */}
      {colourSwatch && (
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '4px',
            background: colourSwatch,
            border: '2px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
          }}
        />
      )}

      {/* Recipe info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{recipe.displayName}</div>
        <div style={{ fontSize: '11px', color: '#999' }}>{recipe.description}</div>
        <div style={{ fontSize: '12px', color: '#aaa', marginTop: '4px' }}>
          {recipe.ingredients.map((ing, i) => {
            const item = getItem(ing.itemId);
            const has = inventoryManager.hasItem(ing.itemId, ing.quantity);
            return (
              <span key={ing.itemId}>
                {i > 0 && ' + '}
                <span style={{ color: has ? '#8a8' : '#a66' }}>
                  {ing.quantity}x {item?.displayName ?? ing.itemId}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Craft button */}
      <button
        onClick={onCraft}
        disabled={!hasAll}
        style={{
          padding: '8px 14px',
          background: hasAll ? '#4a6a3a' : '#3a3a3a',
          border: '2px solid ' + (hasAll ? '#6a8a5a' : '#555'),
          borderRadius: '6px',
          color: '#e8d5b7',
          cursor: hasAll ? 'pointer' : 'not-allowed',
          fontSize: '13px',
          opacity: hasAll ? 1 : 0.6,
          flexShrink: 0,
        }}
      >
        Craft
      </button>
    </div>
  );
};

export default DecorationCraftingUI;
