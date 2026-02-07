/**
 * LayerPanel - Compact layer management panel for the painting easel
 *
 * Displays the layer stack with visibility toggles, opacity sliders,
 * active layer selection, delete, and reorder controls.
 * Also provides buttons to add drawing layers or import images.
 */

import React, { useRef } from 'react';
import type { PaintingLayer } from '../hooks/usePaintingLayers';

interface LayerPanelProps {
  layers: PaintingLayer[];
  activeLayerId: string;
  onSetActive: (id: string) => void;
  onSetVisible: (id: string, visible: boolean) => void;
  onSetOpacity: (id: string, opacity: number) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onAddDrawingLayer: () => void;
  onImportImage: (file: File) => void;
  maxLayers: number;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onSetActive,
  onSetVisible,
  onSetOpacity,
  onRemove,
  onMove,
  onAddDrawingLayer,
  onImportImage,
  maxLayers,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportImage(file);
      // Reset so the same file can be re-imported
      e.target.value = '';
    }
  };

  // Display layers in reverse order (top layer first in the panel)
  const displayLayers = [...layers].reverse();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: '160px',
        maxWidth: '180px',
      }}
    >
      <div style={{ fontSize: '13px', color: '#d4a574', fontWeight: 'bold' }}>Layers</div>

      {/* Layer list */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          maxHeight: '200px',
          overflowY: 'auto',
        }}
      >
        {displayLayers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          const isDrawing = layer.type === 'drawing';
          return (
            <div
              key={layer.id}
              onClick={() => {
                if (isDrawing) onSetActive(layer.id);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                padding: '4px 6px',
                borderRadius: '4px',
                background: isActive ? '#4a3a2a' : '#1a1308',
                border: isActive ? '2px solid #d4a574' : '2px solid transparent',
                cursor: isDrawing ? 'pointer' : 'default',
                transition: 'all 0.1s ease',
                overflow: 'hidden',
              }}
            >
              {/* Row 1: visibility + name + delete */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Visibility toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetVisible(layer.id, !layer.visible);
                  }}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 2px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    opacity: layer.visible ? 1 : 0.4,
                    minWidth: '20px',
                    minHeight: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {layer.visible ? '\u{1F441}' : '\u{1F441}'}
                </button>

                {/* Layer name + type icon */}
                <span
                  style={{
                    flex: 1,
                    fontSize: '11px',
                    color: isActive ? '#d4a574' : '#999',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {layer.type === 'image' ? '\u{1F5BC}\uFE0F ' : ''}
                  {layer.name}
                </span>

                {/* Reorder buttons */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(layer.id, 'up');
                  }}
                  title="Move up"
                  style={{
                    ...miniButtonStyle,
                    fontSize: '10px',
                  }}
                >
                  {'\u25B2'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(layer.id, 'down');
                  }}
                  title="Move down"
                  style={{
                    ...miniButtonStyle,
                    fontSize: '10px',
                  }}
                >
                  {'\u25BC'}
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(layer.id);
                  }}
                  disabled={layers.length <= 1}
                  title="Delete layer"
                  style={{
                    ...miniButtonStyle,
                    opacity: layers.length <= 1 ? 0.3 : 1,
                    cursor: layers.length <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {'\u{1F5D1}'}
                </button>
              </div>

              {/* Row 2: opacity slider (compact) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  paddingLeft: '22px',
                  overflow: 'hidden',
                }}
              >
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onSetOpacity(layer.id, Number(e.target.value) / 100);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: '1 1 0',
                    minWidth: 0,
                    width: '100%',
                    height: '10px',
                    accentColor: '#d4a574',
                  }}
                />
                <span
                  style={{
                    fontSize: '9px',
                    color: '#777',
                    minWidth: '22px',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add layer buttons */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={onAddDrawingLayer}
          disabled={layers.length >= maxLayers}
          title="Add drawing layer"
          style={{
            flex: 1,
            padding: '6px',
            minHeight: '36px',
            background: layers.length >= maxLayers ? '#222' : '#1a1308',
            border: '2px solid #5a4a3a',
            borderRadius: '6px',
            color: layers.length >= maxLayers ? '#555' : '#d4a574',
            fontSize: '12px',
            cursor: layers.length >= maxLayers ? 'not-allowed' : 'pointer',
          }}
        >
          + Layer
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={layers.length >= maxLayers}
          title="Import image as layer"
          style={{
            flex: 1,
            padding: '6px',
            minHeight: '36px',
            background: layers.length >= maxLayers ? '#222' : '#1a1308',
            border: '2px solid #5a4a3a',
            borderRadius: '6px',
            color: layers.length >= maxLayers ? '#555' : '#d4a574',
            fontSize: '12px',
            cursor: layers.length >= maxLayers ? 'not-allowed' : 'pointer',
          }}
        >
          {'\u{1F5BC}\uFE0F'} Import
        </button>
      </div>

      {layers.length >= maxLayers && (
        <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
          Maximum {maxLayers} layers
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

const miniButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '0 2px',
  fontSize: '12px',
  cursor: 'pointer',
  color: '#888',
  minWidth: '18px',
  minHeight: '28px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
