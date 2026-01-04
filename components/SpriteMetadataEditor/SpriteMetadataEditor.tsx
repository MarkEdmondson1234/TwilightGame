/**
 * SpriteMetadataEditor - Visual editor for sprite metadata
 *
 * A dev-only tool for adjusting sprite sizes, collision boxes, and offsets
 * via point-and-click/drag interactions with real-time preview.
 *
 * Access: F6 key (dev mode only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TileType, SpriteMetadata } from '../../types';
import { SPRITE_METADATA, TILE_LEGEND, TILE_SIZE } from '../../constants';
import { spriteMetadataOverrides } from '../../utils/SpriteMetadataOverrides';
import './SpriteMetadataEditor.css';

interface SpriteMetadataEditorProps {
  onClose: () => void;
  onApply?: () => void; // Callback to trigger game re-render
}

const SpriteMetadataEditor: React.FC<SpriteMetadataEditorProps> = ({ onClose, onApply }) => {
  const [selectedTileType, setSelectedTileType] = useState<TileType | null>(null);
  const [overrideVersion, setOverrideVersion] = useState(0);
  const [searchFilter, setSearchFilter] = useState('');
  const [showCollisionBoxes, setShowCollisionBoxes] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Subscribe to override changes
  useEffect(() => {
    return spriteMetadataOverrides.subscribe(() => {
      setOverrideVersion(v => v + 1);
      onApply?.();
    });
  }, [onApply]);

  // Get all sprites with overrides applied
  const allSprites = spriteMetadataOverrides.getAllMetadata();

  // Filter sprites by search
  const filteredSprites = allSprites.filter(sprite => {
    if (!searchFilter) return true;
    const tileName = TileType[sprite.tileType].toLowerCase();
    const legendName = TILE_LEGEND[sprite.tileType]?.name.toLowerCase() || '';
    return tileName.includes(searchFilter.toLowerCase()) ||
           legendName.includes(searchFilter.toLowerCase());
  });

  // Get currently selected sprite metadata
  const selectedSprite = selectedTileType !== null
    ? spriteMetadataOverrides.getMetadata(selectedTileType)
    : null;

  // Handle metadata field changes
  const handleFieldChange = useCallback((
    field: keyof SpriteMetadata,
    value: number | boolean | string | { min: number; max: number }
  ) => {
    if (selectedTileType === null) return;
    spriteMetadataOverrides.setOverride(selectedTileType, { [field]: value } as Partial<SpriteMetadata>);
  }, [selectedTileType]);

  // Reset selected sprite to defaults
  const handleResetSprite = useCallback(() => {
    if (selectedTileType === null) return;
    spriteMetadataOverrides.clearOverride(selectedTileType);
  }, [selectedTileType]);

  // Reset all sprites
  const handleResetAll = useCallback(() => {
    if (confirm('Reset all sprite metadata to defaults? This will clear all your changes.')) {
      spriteMetadataOverrides.clearAllOverrides();
    }
  }, []);

  // Copy single sprite code to clipboard
  const handleExportSprite = useCallback(() => {
    if (selectedTileType === null) return;
    const code = spriteMetadataOverrides.exportSpriteCode(selectedTileType);
    navigator.clipboard.writeText(code).then(() => {
      alert('Sprite code copied to clipboard!');
    });
  }, [selectedTileType]);

  // Copy all modified sprites to clipboard
  const handleExportAll = useCallback(() => {
    const code = spriteMetadataOverrides.exportAllModifiedCode();
    navigator.clipboard.writeText(code).then(() => {
      alert('All modified sprite code copied to clipboard!');
    });
  }, []);

  // Get image URL for a sprite
  const getSpriteImageUrl = (sprite: SpriteMetadata): string => {
    if (Array.isArray(sprite.image)) {
      return sprite.image[0] || '';
    }
    return sprite.image || '';
  };

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const modifiedCount = spriteMetadataOverrides.getModifiedCount();

  return (
    <div className="sprite-editor-overlay">
      <div className="sprite-editor-panel">
        {/* Header */}
        <div className="sprite-editor-header">
          <div className="sprite-editor-title">
            <h2>Sprite Metadata Editor</h2>
            <span className="sprite-editor-subtitle">
              {filteredSprites.length} sprites • {modifiedCount} modified
            </span>
          </div>
          <div className="sprite-editor-header-actions">
            {modifiedCount > 0 && (
              <button
                className="sprite-editor-btn sprite-editor-btn-warning"
                onClick={handleResetAll}
                title="Reset all to defaults"
              >
                Reset All
              </button>
            )}
            {modifiedCount > 0 && (
              <button
                className="sprite-editor-btn sprite-editor-btn-primary"
                onClick={handleExportAll}
                title="Export all modified sprites"
              >
                Export All ({modifiedCount})
              </button>
            )}
            <button className="sprite-editor-close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="sprite-editor-content">
          {/* Left panel - Sprite gallery */}
          <div className="sprite-editor-gallery">
            {/* Search and filters */}
            <div className="sprite-editor-filters">
              <input
                type="text"
                placeholder="Search sprites..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="sprite-editor-search"
              />
            </div>

            {/* Sprite grid */}
            <div className="sprite-editor-grid">
              {filteredSprites.map(sprite => {
                const isSelected = selectedTileType === sprite.tileType;
                const isModified = spriteMetadataOverrides.hasOverride(sprite.tileType);
                const tileName = TileType[sprite.tileType];
                const legendData = TILE_LEGEND[sprite.tileType];

                return (
                  <div
                    key={sprite.tileType}
                    className={`sprite-card ${isSelected ? 'selected' : ''} ${isModified ? 'modified' : ''}`}
                    onClick={() => setSelectedTileType(sprite.tileType)}
                  >
                    <div className="sprite-card-preview">
                      <img
                        src={getSpriteImageUrl(sprite)}
                        alt={tileName}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '80px',
                          objectFit: 'contain',
                          imageRendering: 'pixelated',
                        }}
                      />
                    </div>
                    <div className="sprite-card-info">
                      <div className="sprite-card-name">{legendData?.name || tileName}</div>
                      <div className="sprite-card-size">
                        {sprite.spriteWidth}×{sprite.spriteHeight}
                      </div>
                    </div>
                    {isModified && <div className="sprite-card-modified-badge">*</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel - Editor */}
          <div className="sprite-editor-details">
            {selectedSprite ? (
              <>
                {/* Sprite info header */}
                <div className="sprite-details-header">
                  <h3>{TILE_LEGEND[selectedTileType!]?.name || TileType[selectedTileType!]}</h3>
                  <div className="sprite-details-actions">
                    {spriteMetadataOverrides.hasOverride(selectedTileType!) && (
                      <button
                        className="sprite-editor-btn sprite-editor-btn-small"
                        onClick={handleResetSprite}
                      >
                        Reset
                      </button>
                    )}
                    <button
                      className="sprite-editor-btn sprite-editor-btn-small sprite-editor-btn-primary"
                      onClick={handleExportSprite}
                    >
                      Export
                    </button>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="sprite-preview-container">
                  <div className="sprite-preview-controls">
                    <label>
                      <input
                        type="checkbox"
                        checked={showCollisionBoxes}
                        onChange={(e) => setShowCollisionBoxes(e.target.checked)}
                      />
                      Show Collision
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => setShowGrid(e.target.checked)}
                      />
                      Show Grid
                    </label>
                    <label>
                      Zoom:
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                      />
                      {(zoomLevel * 100).toFixed(0)}%
                    </label>
                  </div>
                  <div
                    className="sprite-preview-area"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {/* Grid overlay */}
                    {showGrid && (
                      <div
                        className="sprite-preview-grid"
                        style={{
                          width: selectedSprite.spriteWidth * TILE_SIZE,
                          height: selectedSprite.spriteHeight * TILE_SIZE,
                          backgroundSize: `${TILE_SIZE}px ${TILE_SIZE}px`,
                        }}
                      />
                    )}

                    {/* Sprite image */}
                    <div
                      className="sprite-preview-sprite"
                      style={{
                        width: selectedSprite.spriteWidth * TILE_SIZE,
                        height: selectedSprite.spriteHeight * TILE_SIZE,
                      }}
                    >
                      <img
                        src={getSpriteImageUrl(selectedSprite)}
                        alt="Preview"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          imageRendering: 'pixelated',
                        }}
                      />
                    </div>

                    {/* Anchor point marker */}
                    <div
                      className="sprite-preview-anchor"
                      style={{
                        left: -selectedSprite.offsetX * TILE_SIZE,
                        top: -selectedSprite.offsetY * TILE_SIZE,
                      }}
                      title="Anchor Point (tile position)"
                    />

                    {/* Collision box overlay */}
                    {showCollisionBoxes && selectedSprite.collisionWidth && selectedSprite.collisionHeight && (
                      <div
                        className="sprite-preview-collision"
                        style={{
                          width: (selectedSprite.collisionWidth || 0) * TILE_SIZE,
                          height: (selectedSprite.collisionHeight || 0) * TILE_SIZE,
                          left: (-selectedSprite.offsetX + (selectedSprite.collisionOffsetX || 0)) * TILE_SIZE,
                          top: (-selectedSprite.offsetY + (selectedSprite.collisionOffsetY || 0)) * TILE_SIZE,
                        }}
                        title="Collision Box"
                      />
                    )}

                    {/* Depth line indicator (blue horizontal line) */}
                    <div
                      className="sprite-preview-depth-line"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: '#4a90d9',
                        top: (-selectedSprite.offsetY +
                          (selectedSprite.depthLineOffset ??
                            ((selectedSprite.collisionOffsetY ?? selectedSprite.offsetY) +
                             (selectedSprite.collisionHeight ?? selectedSprite.spriteHeight)))) * TILE_SIZE,
                        pointerEvents: 'none',
                        zIndex: 15,
                        boxShadow: '0 0 4px rgba(74, 144, 217, 0.8)',
                      }}
                      title="Depth Line (player sorts above/below here)"
                    />
                  </div>
                </div>

                {/* Metadata form */}
                <div className="sprite-metadata-form">
                  {/* Sprite Size */}
                  <div className="sprite-form-section">
                    <h4>Sprite Size (tiles)</h4>
                    <div className="sprite-form-row">
                      <label>
                        Width:
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="20"
                          value={selectedSprite.spriteWidth}
                          onChange={(e) => handleFieldChange('spriteWidth', parseFloat(e.target.value))}
                        />
                      </label>
                      <label>
                        Height:
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="20"
                          value={selectedSprite.spriteHeight}
                          onChange={(e) => handleFieldChange('spriteHeight', parseFloat(e.target.value))}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Offset */}
                  <div className="sprite-form-section">
                    <h4>Offset (tiles from anchor)</h4>
                    <div className="sprite-form-row">
                      <label>
                        X:
                        <input
                          type="number"
                          step="0.1"
                          min="-20"
                          max="20"
                          value={selectedSprite.offsetX}
                          onChange={(e) => handleFieldChange('offsetX', parseFloat(e.target.value))}
                        />
                      </label>
                      <label>
                        Y:
                        <input
                          type="number"
                          step="0.1"
                          min="-20"
                          max="20"
                          value={selectedSprite.offsetY}
                          onChange={(e) => handleFieldChange('offsetY', parseFloat(e.target.value))}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Collision Box */}
                  <div className="sprite-form-section">
                    <h4>Collision Box (tiles)</h4>
                    <div className="sprite-form-row">
                      <label>
                        Width:
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={selectedSprite.collisionWidth ?? 0}
                          onChange={(e) => handleFieldChange('collisionWidth', parseFloat(e.target.value))}
                        />
                      </label>
                      <label>
                        Height:
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="20"
                          value={selectedSprite.collisionHeight ?? 0}
                          onChange={(e) => handleFieldChange('collisionHeight', parseFloat(e.target.value))}
                        />
                      </label>
                    </div>
                    <div className="sprite-form-row">
                      <label>
                        Offset X:
                        <input
                          type="number"
                          step="0.1"
                          min="-20"
                          max="20"
                          value={selectedSprite.collisionOffsetX ?? 0}
                          onChange={(e) => handleFieldChange('collisionOffsetX', parseFloat(e.target.value))}
                        />
                      </label>
                      <label>
                        Offset Y:
                        <input
                          type="number"
                          step="0.1"
                          min="-20"
                          max="20"
                          value={selectedSprite.collisionOffsetY ?? 0}
                          onChange={(e) => handleFieldChange('collisionOffsetY', parseFloat(e.target.value))}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Boolean options */}
                  <div className="sprite-form-section">
                    <h4>Options</h4>
                    <div className="sprite-form-checkboxes">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedSprite.enableFlip ?? true}
                          onChange={(e) => handleFieldChange('enableFlip', e.target.checked)}
                        />
                        Enable Flip
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedSprite.enableScale ?? true}
                          onChange={(e) => handleFieldChange('enableScale', e.target.checked)}
                        />
                        Enable Scale
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedSprite.enableRotation ?? false}
                          onChange={(e) => handleFieldChange('enableRotation', e.target.checked)}
                        />
                        Enable Rotation
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedSprite.enableBrightness ?? false}
                          onChange={(e) => handleFieldChange('enableBrightness', e.target.checked)}
                        />
                        Enable Brightness
                      </label>
                    </div>
                  </div>

                  {/* Scale Range (if enabled) */}
                  {selectedSprite.enableScale && (
                    <div className="sprite-form-section">
                      <h4>Scale Range</h4>
                      <div className="sprite-form-row">
                        <label>
                          Min:
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            max="2"
                            value={selectedSprite.scaleRange?.min ?? 0.98}
                            onChange={(e) => handleFieldChange('scaleRange', {
                              min: parseFloat(e.target.value),
                              max: selectedSprite.scaleRange?.max ?? 1.02,
                            })}
                          />
                        </label>
                        <label>
                          Max:
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            max="2"
                            value={selectedSprite.scaleRange?.max ?? 1.02}
                            onChange={(e) => handleFieldChange('scaleRange', {
                              min: selectedSprite.scaleRange?.min ?? 0.98,
                              max: parseFloat(e.target.value),
                            })}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Depth Sorting */}
                  <div className="sprite-form-section">
                    <h4>Depth Sorting</h4>
                    <p style={{ fontSize: '11px', color: '#888', margin: '0 0 10px 0' }}>
                      The depth line determines where this sprite sorts with player/NPCs.
                      Default: collision box bottom.
                    </p>
                    <div className="sprite-form-row">
                      <label>
                        Depth Line Y:
                        <input
                          type="number"
                          step="0.1"
                          min="-20"
                          max="20"
                          value={selectedSprite.depthLineOffset ??
                            ((selectedSprite.collisionOffsetY ?? selectedSprite.offsetY) +
                             (selectedSprite.collisionHeight ?? selectedSprite.spriteHeight))}
                          onChange={(e) => handleFieldChange('depthLineOffset', parseFloat(e.target.value))}
                        />
                      </label>
                      {selectedSprite.depthLineOffset !== undefined && (
                        <button
                          className="sprite-editor-btn sprite-editor-btn-small"
                          onClick={() => handleFieldChange('depthLineOffset', undefined as unknown as number)}
                          title="Reset to default (collision box bottom)"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="sprite-editor-placeholder">
                <p>Select a sprite from the gallery to edit its metadata</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sprite-editor-footer">
          <p>Press <kbd>F6</kbd> or <kbd>ESC</kbd> to close</p>
        </div>
      </div>
    </div>
  );
};

export default SpriteMetadataEditor;
