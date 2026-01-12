/**
 * VFX Test Panel
 *
 * Debug sidebar for testing all VFX effects.
 * Positioned on the right side so effects are visible in the center.
 */

import React from 'react';
import { Position } from '../types';
import { VFX_DEFINITIONS, VFXCategory } from '../data/vfxConfig';
import { Z_DEBUG_PANEL, zClass } from '../zIndex';

interface VFXTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerVFX: (vfxType: string, position: Position) => void;
  playerPosition: Position;
}

// Group VFX by category for better organisation
const CATEGORY_LABELS: Record<VFXCategory, string> = {
  lightning: 'Lightning',
  burst: 'Burst',
  float: 'Float',
  aura: 'Aura',
  ring: 'Water/Ring',
  overlay: 'Overlay',
};

const CATEGORY_COLOURS: Record<VFXCategory, string> = {
  lightning: 'bg-yellow-600 hover:bg-yellow-500',
  burst: 'bg-purple-600 hover:bg-purple-500',
  float: 'bg-pink-600 hover:bg-pink-500',
  aura: 'bg-cyan-600 hover:bg-cyan-500',
  ring: 'bg-blue-600 hover:bg-blue-500',
  overlay: 'bg-indigo-600 hover:bg-indigo-500',
};

const VFXTestPanel: React.FC<VFXTestPanelProps> = ({
  isOpen,
  onClose,
  onTriggerVFX,
  playerPosition,
}) => {
  if (!isOpen) return null;

  // Group effects by category
  const effectsByCategory: Record<VFXCategory, string[]> = {
    lightning: [],
    burst: [],
    float: [],
    aura: [],
    ring: [],
    overlay: [],
  };

  Object.entries(VFX_DEFINITIONS).forEach(([id, def]) => {
    effectsByCategory[def.category].push(id);
  });

  const handleTrigger = (vfxType: string) => {
    onTriggerVFX(vfxType, playerPosition);
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full w-64 bg-slate-900/95 border-l-4 border-purple-500 ${zClass(Z_DEBUG_PANEL)} pointer-events-auto overflow-y-auto`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-purple-900/50 border-b border-purple-500">
        <h2 className="text-lg font-bold text-purple-200">VFX Tester</h2>
        <button
          onClick={onClose}
          className="w-6 h-6 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-sm transition-colors"
        >
          ×
        </button>
      </div>

      <div className="p-2">
        {/* Quick test buttons */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => {
                handleTrigger('smoke_puff');
                setTimeout(() => handleTrigger('sparkle'), 200);
                setTimeout(() => handleTrigger('lightning'), 400);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-2 py-1 rounded text-xs font-medium transition-all flex-1"
            >
              Magic Combo
            </button>
            <button
              onClick={() => {
                handleTrigger('lightning');
                setTimeout(() => handleTrigger('rain_summon'), 300);
              }}
              className="bg-gradient-to-r from-gray-600 to-blue-600 hover:from-gray-500 hover:to-blue-500 text-white px-2 py-1 rounded text-xs font-medium transition-all flex-1"
            >
              Storm
            </button>
          </div>
        </div>

        {/* Effects by category */}
        {(Object.keys(effectsByCategory) as VFXCategory[]).map((category) => {
          const effects = effectsByCategory[category];
          if (effects.length === 0) return null;

          return (
            <div key={category} className="mb-2">
              <h3 className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="grid grid-cols-2 gap-1">
                {effects.map((vfxType) => {
                  const def = VFX_DEFINITIONS[vfxType];
                  return (
                    <button
                      key={vfxType}
                      onClick={() => handleTrigger(vfxType)}
                      className={`${CATEGORY_COLOURS[category]} text-white px-2 py-1.5 rounded text-xs font-medium transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1`}
                      title={`${vfxType} (${def.duration}ms)`}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: def.colour }}
                      />
                      <span className="truncate">{vfxType.replace(/_/g, ' ')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Instructions */}
        <div className="mt-3 pt-2 border-t border-slate-700 text-xs text-slate-500">
          F10 to close. Effects play at player.
        </div>
      </div>
    </div>
  );
};

export default VFXTestPanel;
