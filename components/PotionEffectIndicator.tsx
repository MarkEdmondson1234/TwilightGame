/**
 * PotionEffectIndicator — HUD badges for timed potion effects that are currently active.
 *
 * These effects (Beast Tongue, Beastward Balm, Revealing Tonic) change what the world does
 * rather than how the player looks, so without a badge there is nothing on screen telling the
 * player the potion is still working — or that it has quietly worn off. Beast Tongue in
 * particular was easy to mistake for broken: you drink it, walk to the forest, and the animals
 * are back to "*purr*" with no explanation.
 *
 * Data-driven: a new timed effect only needs an entry in POTION_EFFECT_DISPLAY. Effects with
 * no entry are deliberately not shown, so internal flags never leak into the HUD. Movement
 * effects (Floating/Flying) have their own badge in HUD.tsx — they are stored separately in
 * GameState, not as potion effects.
 */

import React, { useEffect, useState } from 'react';
import { gameState } from '../GameState';

interface PotionEffectDisplay {
  /** Short name shown on the badge. */
  label: string;
  /** Emoji shown beside the label, matching the Floating/Flying badge style. */
  icon: string;
  /** Border/text colour (hex), used for the glow as well. */
  colour: string;
}

/** Which potion effects earn a HUD badge, and how they present. */
export const POTION_EFFECT_DISPLAY: Record<string, PotionEffectDisplay> = {
  beast_tongue: { label: 'Beast Tongue', icon: '🐾', colour: '#a78bfa' },
  beast_ward: { label: 'Beastward', icon: '🛡️', colour: '#facc15' },
  reveal_gift_preference: { label: 'Revealing', icon: '🎁', colour: '#f472b6' },
};

/**
 * Format a remaining duration for effects that can last a full game day (2 real hours).
 * HUD's own formatTimeRemaining shows m:ss, which reads as "120:00" for a day-long potion.
 */
function formatDuration(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (totalMinutes >= 1) return `${totalMinutes}m`;
  return `${Math.ceil(ms / 1000)}s`;
}

const PotionEffectIndicator: React.FC = () => {
  const [effects, setEffects] = useState<Array<{ type: string; remainingMs: number }>>([]);

  useEffect(() => {
    const refresh = () => {
      setEffects(
        gameState
          .getActivePotionEffects()
          .filter((type) => POTION_EFFECT_DISPLAY[type])
          .map((type) => ({ type, remainingMs: gameState.getPotionEffectRemainingMs(type) }))
      );
    };

    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  if (effects.length === 0) return null;

  return (
    <>
      {effects.map(({ type, remainingMs }) => {
        const display = POTION_EFFECT_DISPLAY[type];
        return (
          <div
            key={type}
            className="bg-black/60 px-3 py-2 rounded-lg border self-center"
            style={{
              borderColor: display.colour,
              boxShadow: `0 0 10px ${display.colour}80`,
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{display.icon}</span>
              <div className="flex flex-col">
                <span
                  className="text-xs font-bold"
                  style={{
                    color: display.colour,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                  }}
                >
                  {display.label}
                </span>
                <span className="text-xs text-white">{formatDuration(remainingMs)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default PotionEffectIndicator;
