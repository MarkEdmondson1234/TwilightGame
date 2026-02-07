/**
 * DecorationCraftingUI - Modal overlay for the decoration crafting system
 *
 * Tabs:
 * - Paintings: upload image, select frame paints, craft framed painting
 * - Flower Arrangements: select vase + flowers, craft arrangement
 * - Potted Plants: select pot + crop, craft potted plant
 * - Craft Paints: craft paint pots from forageables + honey/water
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { getItem } from '../data/items';
import {
  PAINT_RECIPES,
  CANVAS_RECIPE,
  FLOWER_ARRANGEMENT_RECIPES,
  POTTED_PLANT_RECIPES,
  DecorationRecipe,
} from '../data/decorationRecipes';
import { decorationManager, CraftResult } from '../utils/DecorationManager';
import { inventoryManager } from '../utils/inventoryManager';
import { ColourPaletteDisplay } from './ColourPaletteDisplay';
import { getFrameStyle, getFrameCSS } from '../utils/frameStyles';
import {
  validateImageFile,
  processImageForStorage,
  savePaintingImage,
} from '../utils/paintingImageService';
import { Z_MODAL, zClass } from '../zIndex';

type CraftingTab = 'paintings' | 'arrangements' | 'plants' | 'paints';

interface DecorationCraftingUIProps {
  isOpen: boolean;
  onClose: () => void;
  /** Callback when image upload is needed (Phase 4) */
  onUploadImage?: () => Promise<{ url: string; storageKey: string } | null>;
}

const DecorationCraftingUI: React.FC<DecorationCraftingUIProps> = ({
  isOpen,
  onClose,
  onUploadImage,
}) => {
  const [activeTab, setActiveTab] = useState<CraftingTab>('paintings');
  const [selectedPaints, setSelectedPaints] = useState<string[]>([]);
  const [paintingName, setPaintingName] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{
    url: string;
    storageKey: string;
  } | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [, setForceUpdate] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const forceRerender = useCallback(() => setForceUpdate((n) => n + 1), []);

  const allPaintColours = useMemo(() => decorationManager.getAllPaintColours(), []);

  const handleTogglePaint = useCallback((paintId: string) => {
    setSelectedPaints((prev) => {
      if (prev.includes(paintId)) return prev.filter((id) => id !== paintId);
      if (prev.length >= 2) return prev;
      return [...prev, paintId];
    });
  }, []);

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

  const handleUploadClick = useCallback(async () => {
    if (onUploadImage) {
      const result = await onUploadImage();
      if (result) {
        setUploadedImage(result);
      }
    } else {
      // Fallback: use file input directly (Phase 4 will provide proper handler)
      fileInputRef.current?.click();
    }
  }, [onUploadImage]);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input immediately
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Validate file type and size
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setResultMessage(validation.error ?? 'Invalid image.');
      setTimeout(() => setResultMessage(null), 3000);
      return;
    }

    // Resize and compress to base64 data URL
    try {
      setResultMessage('Processing image...');
      const dataUrl = await processImageForStorage(file);
      setUploadedImage({ url: dataUrl, storageKey: '' });
      setResultMessage(null);
    } catch (err) {
      setResultMessage('Failed to process image. Please try another.');
      setTimeout(() => setResultMessage(null), 3000);
    }
  }, []);

  const handleCreatePainting = useCallback(async () => {
    if (!uploadedImage) {
      setResultMessage('Upload a picture first.');
      setTimeout(() => setResultMessage(null), 3000);
      return;
    }
    if (!paintingName.trim()) {
      setResultMessage('Give your painting a name.');
      setTimeout(() => setResultMessage(null), 3000);
      return;
    }

    const result = decorationManager.createPainting({
      name: paintingName.trim(),
      imageUrl: uploadedImage.url,
      storageKey: '', // Will be set to paintingId by manager
      paintIds: selectedPaints,
      isUploaded: true,
    });

    if (result.success && result.paintingId) {
      // Persist image to localStorage + Firestore
      await savePaintingImage(result.paintingId, uploadedImage.url, paintingName.trim());
    }

    setResultMessage(result.message);
    if (result.success) {
      setUploadedImage(null);
      setPaintingName('');
      setSelectedPaints([]);
      forceRerender();
    }
    setTimeout(() => setResultMessage(null), 3000);
  }, [uploadedImage, paintingName, selectedPaints, forceRerender]);

  if (!isOpen) return null;

  const frameStyle = getFrameStyle(selectedPaints);
  const frameCSS = getFrameCSS(frameStyle);
  const hasCanvas = inventoryManager.hasItem('blank_canvas', 1);
  const hasPaintsSelected = selectedPaints.every((id) => inventoryManager.hasItem(id, 1));

  const tabs: { id: CraftingTab; label: string; icon: string }[] = [
    { id: 'paintings', label: 'Paintings', icon: '🖼️' },
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
        {activeTab === 'paintings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Image upload area */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
              }}
            >
              {/* Preview */}
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  background: '#1a1408',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                  ...frameCSS,
                }}
              >
                {uploadedImage ? (
                  <img
                    src={uploadedImage.url}
                    alt="Painting preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span
                    style={{ color: '#555', fontSize: '12px', textAlign: 'center', padding: '8px' }}
                  >
                    Upload a picture to preview
                  </span>
                )}
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <button
                  onClick={handleUploadClick}
                  style={{
                    padding: '10px',
                    background: '#4a6a3a',
                    border: '2px solid #6a8a5a',
                    borderRadius: '8px',
                    color: '#e8d5b7',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  📷 Upload Picture
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileSelected}
                  style={{ display: 'none' }}
                />

                <input
                  type="text"
                  placeholder="Name your painting..."
                  value={paintingName}
                  onChange={(e) => setPaintingName(e.target.value.slice(0, 30))}
                  maxLength={30}
                  style={{
                    padding: '8px',
                    background: '#1a1408',
                    border: '1px solid #5a4a3a',
                    borderRadius: '6px',
                    color: '#e8d5b7',
                    fontSize: '14px',
                  }}
                />

                <div style={{ fontSize: '12px', color: '#888' }}>
                  Frame style: {frameStyle.displayName}
                </div>
              </div>
            </div>

            {/* Colour palette */}
            <ColourPaletteDisplay
              colours={allPaintColours}
              selectedPaints={selectedPaints}
              onTogglePaint={handleTogglePaint}
              maxSelection={2}
            />

            {/* Cost & craft button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: '#1a1408',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '13px' }}>
                <div style={{ color: hasCanvas ? '#8a8' : '#a66' }}>
                  {hasCanvas ? '✓' : '✗'} Blank Canvas
                </div>
                {selectedPaints.map((id) => {
                  const has = inventoryManager.hasItem(id, 1);
                  const item = getItem(id);
                  return (
                    <div key={id} style={{ color: has ? '#8a8' : '#a66' }}>
                      {has ? '✓' : '✗'} {item?.displayName ?? id}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleCreatePainting}
                disabled={
                  !uploadedImage ||
                  !paintingName.trim() ||
                  !hasCanvas ||
                  !hasPaintsSelected ||
                  selectedPaints.length === 0
                }
                style={{
                  padding: '12px 20px',
                  background: '#4a6a3a',
                  border: '2px solid #6a8a5a',
                  borderRadius: '8px',
                  color: '#e8d5b7',
                  cursor: 'pointer',
                  fontSize: '15px',
                  opacity:
                    !uploadedImage ||
                    !paintingName.trim() ||
                    !hasCanvas ||
                    !hasPaintsSelected ||
                    selectedPaints.length === 0
                      ? 0.5
                      : 1,
                }}
              >
                🎨 Create Painting
              </button>
            </div>
          </div>
        )}

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
