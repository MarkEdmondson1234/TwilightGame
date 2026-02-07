/**
 * PaintingEaselUI - Freehand drawing overlay using Atrament
 *
 * Opens as a modal when the player interacts with a placed easel.
 * Supports Apple Pencil pressure sensitivity, undo, and saves
 * paintings via the existing paintingImageService + DecorationManager.
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useAtrament } from '../hooks/useAtrament';
import { getAvailableDrawingColours, BASE_DRAWING_COLOURS } from '../data/easelColours';
import { decorationManager } from '../utils/DecorationManager';
import { inventoryManager } from '../utils/inventoryManager';
import { savePaintingImage } from '../utils/paintingImageService';
import { Z_PAINTING_EASEL, zClass } from '../zIndex';

const CANVAS_SIZE = 512;

interface PaintingEaselUIProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaintingEaselUI: React.FC<PaintingEaselUIProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing state
  const [selectedColour, setSelectedColour] = useState(BASE_DRAWING_COLOURS[0].colour);
  const [brushSize, setBrushSize] = useState(6);
  const [drawMode, setDrawMode] = useState<'draw' | 'erase'>('draw');

  // Save state
  const [paintingName, setPaintingName] = useState('');
  const [selectedFramePaints, setSelectedFramePaints] = useState<string[]>([]);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { isReady, isDirty, clear, undo, toDataURL } = useAtrament({
    canvasRef,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    colour: selectedColour,
    weight: brushSize,
    mode: drawMode,
  });

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
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const handleSave = useCallback(async () => {
    if (!isDirty) {
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

    // Get the data URL from the canvas
    const dataUrl = toDataURL();
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
    });

    if (result.success && result.paintingId) {
      await savePaintingImage(result.paintingId, dataUrl, paintingName.trim());
    }

    setIsSaving(false);

    if (result.success) {
      showMessage(result.message);
      // Brief delay so user sees the success message
      setTimeout(() => onClose(), 1200);
    } else {
      showMessage(result.message);
    }
  }, [isDirty, paintingName, selectedFramePaints, toDataURL, showMessage, onClose]);

  const handleToggleFramePaint = useCallback((paintId: string) => {
    setSelectedFramePaints((prev) =>
      prev.includes(paintId) ? prev.filter((id) => id !== paintId) : [...prev.slice(-1), paintId]
    );
  }, []);

  if (!isOpen) return null;

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
          width: '680px',
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              color: '#d4a574',
              fontWeight: 'bold',
            }}
          >
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

        {/* Canvas area */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            background: '#1a1308',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              maxWidth: `${CANVAS_SIZE}px`,
              aspectRatio: '1',
              background: '#f5f0e8',
              borderRadius: '4px',
              cursor: drawMode === 'erase' ? 'cell' : 'crosshair',
              touchAction: 'none',
            }}
          />
        </div>

        {/* Drawing colour palette */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '13px', color: '#d4a574', fontWeight: 'bold' }}>
            Drawing Colours
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
            }}
          >
            {drawingColours.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedColour(c.colour);
                  if (drawMode === 'erase') setDrawMode('draw');
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {/* Brush size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 auto' }}>
            <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>Brush</span>
            <input
              type="range"
              min={2}
              max={30}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={{ flex: 1, minWidth: '80px', accentColor: '#d4a574' }}
            />
            <span style={{ fontSize: '12px', color: '#999', minWidth: '20px' }}>{brushSize}</span>
          </div>

          {/* Tool buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <ToolButton
              label="Draw"
              icon="✏️"
              active={drawMode === 'draw'}
              onClick={() => setDrawMode('draw')}
            />
            <ToolButton
              label="Erase"
              icon="🧹"
              active={drawMode === 'erase'}
              onClick={() => setDrawMode('erase')}
            />
            <ToolButton label="Undo" icon="↩️" onClick={undo} />
            <ToolButton label="Clear" icon="🗑️" onClick={clear} />
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
                        🔒
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Name input + Save */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Name your painting..."
            value={paintingName}
            onChange={(e) => setPaintingName(e.target.value)}
            onKeyDown={(e) => {
              // Prevent game keyboard controls from firing
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
            disabled={!isDirty || !paintingName.trim() || isSaving}
            style={{
              padding: '8px 20px',
              background: isDirty && paintingName.trim() && !isSaving ? '#2d6a30' : '#333',
              border: '2px solid #4a8a4d',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isDirty && paintingName.trim() && !isSaving ? 'pointer' : 'not-allowed',
              opacity: isDirty && paintingName.trim() && !isSaving ? 1 : 0.5,
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

export default PaintingEaselUI;
