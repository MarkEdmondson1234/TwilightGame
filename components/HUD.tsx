import React, { useState, useEffect, useRef } from 'react';
import { mapManager } from '../maps';
import { useGameState } from '../hooks/useGameState';
import { TimeManager, GameTime } from '../utils/TimeManager';
import { eventBus, GameEvent } from '../utils/EventBus';
import { Z_HUD, zClass } from '../zIndex';
import { getItem } from '../data/items';
import { gameState } from '../GameState';
import { WATER_CAN } from '../constants';
import { resolveIcon, isImageIcon } from '../utils/iconMap';
import AnalogClock from './AnalogClock';
import SundialClock from './SundialClock';

/**
 * Format milliseconds into a human-readable time string
 */
function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface HUDProps {
  /** Currently selected item ID (or null if nothing selected) */
  selectedItemId?: string | null;
  /** Quantity of selected item (for display) */
  selectedItemQuantity?: number;
}

const HUD: React.FC<HUDProps> = ({ selectedItemId, selectedItemQuantity }) => {
  const currentMap = mapManager.getCurrentMap();
  const mapName = currentMap ? currentMap.name : 'Loading...';
  const { gold, forestDepth, caveDepth } = useGameState();
  const [currentTime, setCurrentTime] = useState<GameTime>(TimeManager.getCurrentTime());
  const [movementEffect, setMovementEffect] = useState(gameState.getMovementEffect());
  const [movementTimeRemaining, setMovementTimeRemaining] = useState(0);
  const [cloudSyncGlow, setCloudSyncGlow] = useState(false);
  const glowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for cloud sync events to show magic pulse on clock
  useEffect(() => {
    const unsubStart = eventBus.on(GameEvent.CLOUD_SYNC_STARTED, () => {
      setCloudSyncGlow(true);
      // Clear any existing timer
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    });
    const unsubEnd = eventBus.on(GameEvent.CLOUD_SYNC_COMPLETED, () => {
      // Keep the glow for a moment after completion, then fade
      glowTimerRef.current = setTimeout(() => {
        setCloudSyncGlow(false);
        glowTimerRef.current = null;
      }, 1500);
    });
    return () => {
      unsubStart();
      unsubEnd();
      if (glowTimerRef.current) clearTimeout(glowTimerRef.current);
    };
  }, []);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(TimeManager.getCurrentTime());

      // Update movement effect status
      const effect = gameState.getMovementEffect();
      setMovementEffect(effect);
      if (effect) {
        setMovementTimeRemaining(effect.expiresAt - Date.now());
      } else {
        setMovementTimeRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Get the selected item details
  const selectedItemDef = selectedItemId ? getItem(selectedItemId) : null;

  return (
    <>
      {/* Top-left: Wallet + Equipped Item */}
      <div
        className={`absolute left-2 ${zClass(Z_HUD)} pointer-events-none flex items-start gap-2`}
        style={{ top: 'calc(8px + env(safe-area-inset-top, 0px))' }}
      >
        {/* Floating Wallet - Gold display */}
        <div className="relative">
          <img
            src="/TwilightGame/assets-optimized/ui/wallet.png"
            alt="Gold"
            className="w-[70px] h-[70px] sm:w-[88px] sm:h-[88px] drop-shadow-lg"
          />
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ paddingTop: '5px' }}
          >
            <span
              className="text-lg sm:text-xl font-bold text-yellow-300"
              style={{
                textShadow:
                  '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {gold}
            </span>
          </div>
        </div>

        {/* Equipped Item Display - only show when item is selected */}
        {selectedItemDef && (
          <div className="bg-black/60 p-2 rounded-lg border border-slate-700 flex items-center gap-2 self-center">
            {selectedItemDef.image ? (
              <img
                src={selectedItemDef.image}
                alt={selectedItemDef.displayName}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                style={{ imageRendering: 'auto' }}
              />
            ) : (
              (() => {
                const resolved = resolveIcon(selectedItemDef.icon || '📦');
                return isImageIcon(resolved) ? (
                  <img
                    src={resolved}
                    alt={selectedItemDef.displayName}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                    style={{ imageRendering: 'auto' }}
                  />
                ) : (
                  <span className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-2xl sm:text-3xl">
                    {resolved}
                  </span>
                );
              })()
            )}
            <div className="flex flex-col">
              <span
                className="text-xs sm:text-sm font-bold text-white truncate max-w-[80px]"
                style={{
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {selectedItemDef.displayName}
              </span>
              {selectedItemQuantity !== undefined && selectedItemQuantity > 1 && (
                <span className="text-xs text-slate-300">x{selectedItemQuantity}</span>
              )}
              {/* Water level for watering can */}
              {selectedItemId === 'tool_watering_can' && (
                <span className="text-xs text-cyan-300">
                  💧 {gameState.getWaterLevel()}/{WATER_CAN.MAX_CAPACITY}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Movement Effect Indicator (Floating/Flying) */}
        {movementEffect && movementTimeRemaining > 0 && (
          <div
            className="bg-black/60 px-3 py-2 rounded-lg border self-center"
            style={{
              borderColor: movementEffect.mode === 'flying' ? '#fbbf24' : '#22d3ee',
              boxShadow:
                movementEffect.mode === 'flying'
                  ? '0 0 10px rgba(251, 191, 36, 0.5)'
                  : '0 0 10px rgba(34, 211, 238, 0.5)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{movementEffect.mode === 'floating' ? '🪶' : '🦅'}</span>
              <div className="flex flex-col">
                <span
                  className="text-xs font-bold"
                  style={{
                    color: movementEffect.mode === 'flying' ? '#fbbf24' : '#22d3ee',
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {movementEffect.mode === 'floating' ? 'Floating' : 'Flying'}
                </span>
                <span className="text-xs text-white">
                  {formatTimeRemaining(movementTimeRemaining)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right HUD Panel - Clock, calendar, and location */}
      <div
        className={`absolute right-16 sm:right-20 ${zClass(Z_HUD)} pointer-events-none`}
        style={{ top: 'calc(8px + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-start gap-2">
          {/* Location info to the left of clocks (cottagecore styled) */}
          <div
            className="px-3 py-2 rounded-lg mt-2"
            style={{
              background: 'linear-gradient(135deg, #f5f0e1, #e8dcc8)',
              border: '2px solid #8b7355',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            <p
              className="text-xs font-serif font-bold whitespace-nowrap"
              style={{ color: '#5a4636' }}
            >
              {mapName}
            </p>
            {forestDepth > 0 && (
              <p className="text-[10px] font-serif" style={{ color: '#4a7c4a' }}>
                Depth: {forestDepth}
              </p>
            )}
            {caveDepth > 0 && (
              <p className="text-[10px] font-serif" style={{ color: '#6b546b' }}>
                Depth: {caveDepth}
              </p>
            )}
          </div>

          {/* Analog Clock (hours/minutes with rotating hands) */}
          <div
            className="relative rounded-full"
            style={
              cloudSyncGlow
                ? {
                    animation: 'cloudSyncPulse 1.2s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 6px rgba(147, 130, 220, 0.8))',
                  }
                : undefined
            }
          >
            <AnalogClock currentTime={currentTime} size={70} />
          </div>

          {/* Sundial Calendar (date/season) */}
          <SundialClock currentTime={currentTime} size={70} />
        </div>
      </div>
    </>
  );
};

export default HUD;
