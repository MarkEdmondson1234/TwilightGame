/**
 * BattleSpectator — watching somebody else's fight.
 *
 * Deliberately a HUD panel and not a modal. The whole point is that you are
 * still standing in the cave next to them: you can walk about, chat, and back
 * away from the goblin while you watch. A full-screen takeover would make
 * spectating feel like being dragged into a fight you are not in.
 *
 * It shows only what the fighter's client publishes (see `multiplayer/battle.ts`)
 * — round, enemy health, their stamina and the latest line. There is no local
 * simulation, so there is nothing here that can disagree with what the fighter
 * is actually seeing.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Z_BATTLE_SPECTATOR, zClass } from '../zIndex';
import { CHEER_COOLDOWN_MS } from '../multiplayer/battle';
import type { BattleWire } from '../multiplayer/battle';

const SERIF_FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

interface BattleSpectatorProps {
  battle: BattleWire;
  onCheer: () => void;
}

const BattleSpectator: React.FC<BattleSpectatorProps> = ({ battle, onCheer }) => {
  /**
   * Local cooldown, purely so the button reads as spent. The fighter's client
   * enforces the real one (`shouldActOnCheer`) — a spectator's clock is not
   * something to trust with a gameplay effect.
   */
  const [cheeredAt, setCheeredAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!cheeredAt) return;
    timerRef.current = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [cheeredAt]);

  const onCooldown = cheeredAt > 0 && now - cheeredAt < CHEER_COOLDOWN_MS;
  const healthPct = Math.max(0, Math.min(100, (battle.h / Math.max(1, battle.hm)) * 100));
  const staminaPct = Math.max(0, Math.min(100, battle.st));
  const staminaColour = staminaPct > 50 ? '#4ade80' : staminaPct > 25 ? '#facc15' : '#ef4444';

  return (
    <div
      className={`${zClass(Z_BATTLE_SPECTATOR)} no-touch-callout`}
      style={{
        position: 'fixed',
        top: 96,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(340px, calc(100vw - 32px))',
        padding: '12px 14px',
        borderRadius: 12,
        background: 'rgba(28, 22, 18, 0.92)',
        border: '1px solid rgba(212, 201, 168, 0.35)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        fontFamily: SERIF_FONT,
        color: '#d4c9a8',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ fontSize: 14, marginBottom: 8, lineHeight: 1.3 }}>
        <strong>{battle.n}</strong> is fighting the {battle.e}!
      </div>

      {/* Enemy health */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 12, minWidth: 52 }}>{battle.e}</span>
        <div
          style={{
            flex: 1,
            height: 12,
            borderRadius: 6,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${healthPct}%`,
              height: '100%',
              background: '#b45309',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Fighter stamina — a spectator can see when they are in trouble */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, minWidth: 52 }}>Stamina</span>
        <div
          style={{
            flex: 1,
            height: 12,
            borderRadius: 6,
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.15)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${staminaPct}%`,
              height: '100%',
              background: staminaColour,
              transition: 'width 0.4s ease, background 0.4s ease',
            }}
          />
        </div>
      </div>

      {battle.l && (
        <div style={{ fontSize: 13, fontStyle: 'italic', opacity: 0.9, marginBottom: 10 }}>
          {battle.l}
        </div>
      )}

      <button
        onClick={() => {
          if (onCooldown) return;
          setCheeredAt(Date.now());
          setNow(Date.now());
          onCheer();
        }}
        disabled={onCooldown}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 8,
          border: '1px solid rgba(212, 201, 168, 0.4)',
          background: onCooldown ? 'rgba(80, 70, 60, 0.6)' : 'rgba(180, 83, 9, 0.85)',
          color: '#f5efe0',
          fontFamily: SERIF_FONT,
          fontSize: 14,
          cursor: onCooldown ? 'default' : 'pointer',
          opacity: onCooldown ? 0.6 : 1,
        }}
      >
        {onCooldown ? 'Cheering…' : `Cheer ${battle.n} on!`}
      </button>
    </div>
  );
};

export default BattleSpectator;
