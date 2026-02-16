/**
 * Painting Easel mini-game — Freehand drawing overlay
 *
 * Supports Apple Pencil pressure sensitivity, multi-layer drawing,
 * image import, per-stroke opacity, and eyedropper colour picking.
 * Saves paintings via paintingImageService + DecorationManager.
 *
 * Ported from components/PaintingEaselUI.tsx to the mini-game system.
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import type { MiniGameComponentProps } from '../types';
import { usePaintingLayers } from '../../hooks/usePaintingLayers';
import { LayerPanel } from '../../components/LayerPanel';
import { getAvailableDrawingColours, BASE_DRAWING_COLOURS } from '../../data/easelColours';
import { decorationManager } from '../../utils/DecorationManager';
import { inventoryManager } from '../../utils/inventoryManager';
import {
  savePaintingImage,
  validateImageFile,
  processImageForStorage,
} from '../../utils/paintingImageService';
import { Z_PAINTING_EASEL, zClass } from '../../zIndex';

const CANVAS_SIZE = 512;
const MAX_LAYERS = 4;

/** Size presets relative to character size */
const SIZE_PRESETS = [
  { label: 'Tiny', value: 0.25 },
  { label: 'Small', value: 0.5 },
  { label: 'Medium', value: 1.0 },
  { label: 'Large', value: 1.5 },
  { label: 'XL', value: 2.0 },
] as const;

const PaintingEaselGame: React.FC<MiniGameComponentProps> = ({ onClose }) => {
  // Drawing state
  const [selectedColour, setSelectedColour] = useState(BASE_DRAWING_COLOURS[0].colour);
  const [brushSize, setBrushSize] = useState(6);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [drawMode, setDrawMode] = useState<'draw' | 'erase'>('draw');
  const [isEyedropper, setIsEyedropper] = useState(false);

  // Save state
  const [paintingName, setPaintingName] = useState('');
  const [transparentBg, setTransparentBg] = useState(false);
  const [selectedScale, setSelectedScale] = useState(1.5);
  const [selectedFramePaints, setSelectedFramePaints] = useState<string[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Layer system
  const painting = usePaintingLayers({ width: CANVAS_SIZE, height: CANVAS_SIZE });

  // Sync brush settings to the layer system
  const colourRef = useRef(selectedColour);
  if (colourRef.current !== selectedColour) {
    colourRef.current = selectedColour;
    painting.setColour(selectedColour);
  }
  const brushSizeRef = useRef(brushSize);
  if (brushSizeRef.current !== brushSize) {
    brushSizeRef.current = brushSize;
    painting.setWeight(brushSize);
  }
  const modeRef = useRef(drawMode);
  if (modeRef.current !== drawMode) {
    modeRef.current = drawMode;
    painting.setMode(drawMode);
  }
  const opacityRef = useRef(brushOpacity);
  if (opacityRef.current !== brushOpacity) {
    opacityRef.current = brushOpacity;
    painting.setBrushOpacity(brushOpacity);
  }

  // Merge base colours with unlocked crafted paints
  const drawingColours = useMemo(() => {
    const unlocked = decorationManager.getUnlockedColours();
    return getAvailableDrawingColours(unlocked);
  }, []);

  // Frame paint colours (for the frame around the painting)
  const framePaintColours = useMemo(() => decorationManager.getAllPaintColours(), []);

  const showMessage = useCallback((msg: string, duration = 3000) => {
    setResultMessage(msg);
    setTimeout(() => setResultMessage(null), duration);
  }, []);

  const handleClose = useCallback(() => {
    if (painting.isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [painting.isDirty, onClose]);

  const handleSave = useCallback(async () => {
    if (!painting.isDirty) {
      showMessage('Draw something first!');
      return;
    }
    if (!paintingName.trim()) {
      showMessage('Give your painting a name.');
      return;
    }

    const hasCanvas = inventoryManager.hasItem('blank_canvas', 1);
    if (!hasCanvas) {
      showMessage('You need a Blank Canvas.');
      return;
    }

    // Flatten all visible layers to a single image
    const dataUrl = painting.flattenToDataURL({ transparent: transparentBg });
    if (!dataUrl) {
      showMessage('Failed to export painting.');
      return;
    }

    setIsSaving(true);

    const result = decorationManager.createPainting({
      name: paintingName.trim(),
      imageUrl: dataUrl,
      storageKey: '',
      paintIds: selectedFramePaints,
      isUploaded: false,
      scale: selectedScale,
    });

    if (result.success && result.paintingId) {
      await savePaintingImage(result.paintingId, dataUrl, paintingName.trim());
    }

    setIsSaving(false);

    if (result.success) {
      showMessage(result.message);
      setTimeout(() => onClose(), 1200);
    } else {
      showMessage(result.message);
    }
  }, [painting, paintingName, selectedFramePaints, showMessage, onClose]);

  const handleToggleFramePaint = useCallback((paintId: string) => {
    setSelectedFramePaints((prev) =>
      prev.includes(paintId) ? prev.filter((id) => id !== paintId) : [...prev.slice(-1), paintId]
    );
  }, []);

  // Eyedropper: handle click on canvas container
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEyedropper) return;

      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const colour = painting.sampleColour(x, y);
      if (colour) {
        setSelectedColour(colour);
        painting.setColour(colour);
        if (drawMode === 'erase') setDrawMode('draw');
      }
      setIsEyedropper(false);
    },
    [isEyedropper, painting, drawMode]
  );

  // Image import handler
  const handleImportImage = useCallback(
    async (file: File) => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        showMessage(validation.error ?? 'Invalid image file.');
        return;
      }
      try {
        const dataUrl = await processImageForStorage(file);
        await painting.addImageLayer(dataUrl);
      } catch {
        showMessage('Failed to import image.');
      }
    },
    [painting, showMessage]
  );

  return (
    <div
      className={zClass(Z_PAINTING_EASEL)}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        style={{
          background: '#2a1f14',
          border: '3px solid #8B7355',
          borderRadius: '12px',
          width: '860px',
          maxWidth: '95vw',
          maxHeight: '95vh',
          overflow: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#d4a574', fontWeight: 'bold' }}>
            Painting Easel
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#999',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1,
            }}
            title="Close"
          >
            &times;
          </button>
        </div>

        {/* Canvas + Layer Panel row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* Canvas stack */}
          <div
            style={{
              flex: '1 1 auto',
              display: 'flex',
              justifyContent: 'center',
              background: '#1a1308',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div
              onClick={handleCanvasClick}
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: `${CANVAS_SIZE}px`,
                aspectRatio: '1',
                background: transparentBg
                  ? 'repeating-conic-gradient(#e0ddd6 0% 25%, #f5f0e8 0% 50%) 0 0 / 20px 20px'
                  : '#f5f0e8',
                borderRadius: '4px',
                overflow: 'hidden',
                cursor: isEyedropper ? 'crosshair' : drawMode === 'erase' ? 'cell' : 'crosshair',
              }}
            >
              {/* Render stacked canvases — one per layer, bottom to top */}
              {painting.layers.map((layer) => (
                <canvas
                  key={layer.id}
                  ref={(el) => painting.registerCanvas(layer.id, el)}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    opacity: layer.visible ? layer.opacity : 0,
                    pointerEvents:
                      layer.id === painting.activeLayerId &&
                      layer.type === 'drawing' &&
                      !isEyedropper
                        ? 'auto'
                        : 'none',
                    touchAction: 'none',
                    transition: 'opacity 0.15s ease',
                  }}
                />
              ))}

              {/* Eyedropper overlay indicator */}
              {isEyedropper && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0,0,0,0.1)',
                    pointerEvents: 'none',
                    fontSize: '32px',
                  }}
                >
                  Click to pick colour
                </div>
              )}
            </div>
          </div>

          {/* Layer panel */}
          <LayerPanel
            layers={painting.layers}
            activeLayerId={painting.activeLayerId}
            onSetActive={painting.setActiveLayer}
            onSetVisible={painting.setLayerVisible}
            onSetOpacity={painting.setLayerOpacity}
            onRemove={painting.removeLayer}
            onMove={painting.moveLayer}
            onAddDrawingLayer={painting.addDrawingLayer}
            onImportImage={handleImportImage}
            maxLayers={MAX_LAYERS}
          />
        </div>

        {/* Drawing colour palette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '13px', color: '#d4a574', fontWeight: 'bold' }}>
            Drawing Colours
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {drawingColours.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedColour(c.colour);
                  painting.setColour(c.colour);
                  if (drawMode === 'erase') setDrawMode('draw');
                  setIsEyedropper(false);
                }}
                title={c.displayName}
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  borderRadius: '6px',
                  border:
                    selectedColour === c.colour && drawMode !== 'erase'
                      ? '3px solid #fff'
                      : '2px solid rgba(255,255,255,0.15)',
                  background: c.colour,
                  cursor: 'pointer',
                  boxShadow:
                    selectedColour === c.colour && drawMode !== 'erase'
                      ? `0 0 8px ${c.colour}`
                      : 'none',
                  transition: 'all 0.15s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        {/* Tools row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Brush size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>Brush</span>
            <input
              type="range"
              min={2}
              max={30}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ flex: 1, minWidth: '60px', accentColor: '#d4a574' }}
            />
            <span style={{ fontSize: '12px', color: '#999', minWidth: '20px' }}>{brushSize}</span>
          </div>

          {/* Opacity slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>Opacity</span>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={Math.round(brushOpacity * 100)}
              onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
              style={{ flex: 1, minWidth: '60px', accentColor: '#d4a574' }}
            />
            <span style={{ fontSize: '12px', color: '#999', minWidth: '28px' }}>
              {Math.round(brushOpacity * 100)}%
            </span>
          </div>

          {/* Tool buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <ToolButton
              label="Draw"
              icon={'\u270F\uFE0F'}
              active={drawMode === 'draw' && !isEyedropper}
              onClick={() => {
                setDrawMode('draw');
                setIsEyedropper(false);
              }}
            />
            <ToolButton
              label="Erase"
              icon={'\u{1F9F9}'}
              active={drawMode === 'erase' && !isEyedropper}
              onClick={() => {
                setDrawMode('erase');
                setIsEyedropper(false);
              }}
            />
            <ToolButton
              label="Pick"
              icon={'\u{1F4A7}'}
              active={isEyedropper}
              onClick={() => setIsEyedropper(!isEyedropper)}
            />
            <ToolButton
              label="Undo"
              icon={'\u21A9\uFE0F'}
              onClick={() => {
                painting.undo();
                setIsEyedropper(false);
              }}
            />
            <ToolButton
              label="Clear"
              icon={'\u{1F5D1}\uFE0F'}
              onClick={() => {
                painting.clearActiveLayer();
                setIsEyedropper(false);
              }}
            />
          </div>
        </div>

        {/* Frame paint selection (optional) */}
        {framePaintColours.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '13px', color: '#d4a574', fontWeight: 'bold' }}>
              Frame Colour{' '}
              <span style={{ fontWeight: 'normal', fontSize: '11px', color: '#888' }}>
                (optional — select up to 2 paints)
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {framePaintColours.map((c) => {
                const isSelected = selectedFramePaints.includes(c.paintId);
                const canSelect =
                  c.unlocked &&
                  (isSelected || selectedFramePaints.length < 2) &&
                  inventoryManager.hasItem(c.paintId, 1);
                return (
                  <button
                    key={c.paintId}
                    onClick={() => {
                      if (canSelect || isSelected) handleToggleFramePaint(c.paintId);
                    }}
                    disabled={!canSelect && !isSelected}
                    title={
                      c.unlocked
                        ? `${c.displayName}${!inventoryManager.hasItem(c.paintId, 1) ? ' (none in inventory)' : ''}`
                        : (c.hint ?? 'Locked')
                    }
                    style={{
                      width: '30px',
                      height: '30px',
                      minWidth: '30px',
                      borderRadius: '6px',
                      border: isSelected ? '3px solid #fff' : '2px solid rgba(0,0,0,0.2)',
                      background: c.unlocked ? c.colour : '#444',
                      cursor: canSelect || isSelected ? 'pointer' : 'not-allowed',
                      opacity: c.unlocked && inventoryManager.hasItem(c.paintId, 1) ? 1 : 0.4,
                      boxShadow: isSelected ? `0 0 6px ${c.colour}` : 'none',
                      transition: 'all 0.15s ease',
                      padding: 0,
                      position: 'relative',
                    }}
                  >
                    {!c.unlocked && (
                      <span
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                        }}
                      >
                        {'\u{1F512}'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Size selector + transparency toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{ fontSize: '12px', color: '#d4a574', fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            Size
          </span>
          {SIZE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setSelectedScale(preset.value)}
              style={{
                padding: '4px 10px',
                background: selectedScale === preset.value ? '#5a4a3a' : '#2a2018',
                border: selectedScale === preset.value ? '2px solid #d4a574' : '2px solid #4a3a2a',
                borderRadius: '16px',
                color: selectedScale === preset.value ? '#d4a574' : '#999',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: selectedScale === preset.value ? 'bold' : 'normal',
              }}
            >
              {preset.label} ({preset.value}×)
            </button>
          ))}

          {/* Transparent background toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => setTransparentBg(e.target.checked)}
              style={{ accentColor: '#d4a574', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>
              Transparent background
            </span>
          </label>
        </div>

        {/* Name input + Save */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Name your painting..."
            value={paintingName}
            onChange={(e) => setPaintingName(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') handleSave();
            }}
            maxLength={40}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#1a1308',
              border: '2px solid #5a4a3a',
              borderRadius: '6px',
              color: '#d4a574',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSave}
            disabled={!painting.isDirty || !paintingName.trim() || isSaving}
            style={{
              padding: '8px 20px',
              background: painting.isDirty && paintingName.trim() && !isSaving ? '#2d6a30' : '#333',
              border: '2px solid #4a8a4d',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor:
                painting.isDirty && paintingName.trim() && !isSaving ? 'pointer' : 'not-allowed',
              opacity: painting.isDirty && paintingName.trim() && !isSaving ? 1 : 0.5,
              whiteSpace: 'nowrap',
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Requirements note */}
        <div style={{ fontSize: '11px', color: '#777', lineHeight: 1.4 }}>
          Requires: 1 Blank Canvas
          {selectedFramePaints.length > 0 && (
            <>
              {' + '}
              {selectedFramePaints
                .map((id) => framePaintColours.find((c) => c.paintId === id)?.displayName ?? id)
                .join(' + ')}
            </>
          )}
        </div>

        {/* Result message */}
        {resultMessage && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              background: resultMessage.includes('Created') ? '#1a3a1a' : '#3a2a1a',
              border: `1px solid ${resultMessage.includes('Created') ? '#4a8a4d' : '#8a6a4d'}`,
              color: resultMessage.includes('Created') ? '#8bc88d' : '#d4a574',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            {resultMessage}
          </div>
        )}
      </div>

      {/* Close confirmation dialog */}
      {showCloseConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
            zIndex: Z_PAINTING_EASEL + 1,
          }}
        >
          <div
            style={{
              background: '#2a1f14',
              border: '3px solid #8B7355',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '320px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <p style={{ margin: 0, color: '#d4a574', fontSize: '15px' }}>
              You have unsaved work. Discard your drawing?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowCloseConfirm(false)}
                style={{
                  padding: '8px 20px',
                  background: '#2d6a30',
                  border: '2px solid #4a8a4d',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                Keep Drawing
              </button>
              <button
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                style={{
                  padding: '8px 20px',
                  background: '#5a2a2a',
                  border: '2px solid #8a4a4a',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  minWidth: '44px',
                  minHeight: '44px',
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** Small tool button used in the toolbar */
function ToolButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        padding: '6px 12px',
        minWidth: '44px',
        minHeight: '44px',
        background: active ? '#4a3a2a' : '#1a1308',
        border: active ? '2px solid #d4a574' : '2px solid #5a4a3a',
        borderRadius: '6px',
        color: active ? '#d4a574' : '#999',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{icon}</span>
      <span style={{ fontSize: '12px' }}>{label}</span>
    </button>
  );
}

export default PaintingEaselGame;
