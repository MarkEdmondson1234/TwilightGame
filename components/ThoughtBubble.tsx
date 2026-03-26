/**
 * ThoughtBubble
 *
 * Displays thought bubbles above NPCs during the Yule celebration.
 * One NPC at a time has an active bubble (cycles every 15 seconds).
 * When an NPC has already received their gift the bubble disappears.
 *
 * Screen positioning uses the same formula as the radial menu:
 *   screenX = viewportCenterX + (npcPos.x - playerPos.x) * tileSize
 *   screenY = viewportCenterY + (npcPos.y - playerPos.y) * tileSize
 */

import React, { useState, useEffect, useRef } from 'react';
import { npcManager } from '../NPCManager';
import { getItem } from '../data/items';
import { YULE_NPC_CONFIGS, YULE_THOUGHT_BUBBLE_CYCLE_MS } from '../data/yuleCelebration';
import { Z_ACTION_PROMPTS, zClass } from '../zIndex';
import type { Position } from '../types';

interface ThoughtBubbleProps {
  npcWishes: Record<string, string>;   // celebrationId -> itemId
  giftsReceived: Set<string>;           // celebrationIds that already got a gift
  playerPos: Position;
  currentMapId: string;
  tileSize: number;
}

const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({
  npcWishes,
  giftsReceived,
  playerPos,
  currentMapId,
  tileSize,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build ordered list of NPCs that still need a gift
  const pendingIds = YULE_NPC_CONFIGS
    .map((c) => c.celebrationId)
    .filter((id) => !giftsReceived.has(id) && npcWishes[id]);

  // Advance the active index on a timer
  useEffect(() => {
    if (pendingIds.length === 0) return;
    cycleRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % pendingIds.length);
    }, YULE_THOUGHT_BUBBLE_CYCLE_MS);
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [pendingIds.length]);

  // Reset index when the pending list shrinks
  useEffect(() => {
    if (pendingIds.length > 0) {
      setActiveIndex((prev) => prev % pendingIds.length);
    }
  }, [pendingIds.length]);

  if (pendingIds.length === 0 || currentMapId !== 'village') return null;

  const activeId = pendingIds[activeIndex % pendingIds.length];
  const itemId = npcWishes[activeId];
  if (!itemId) return null;

  // Get the NPC's current position (may have been overridden to festival position)
  const npc = npcManager.getNPCById(activeId);
  if (!npc) return null;

  const item = getItem(itemId);
  if (!item) return null;

  // Bubble dimensions — oval (wider than tall)
  const BUBBLE_W = 88;
  const BUBBLE_H = 64;

  // Calculate screen positions
  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;
  const npcScreenX = viewportCenterX + (npc.position.x - playerPos.x) * tileSize;
  const npcScreenY = viewportCenterY + (npc.position.y - playerPos.y) * tileSize;

  // Position the triangle tip 0.1 tile above the estimated NPC sprite top.
  // NPC sprites are anchored at their feet, so the sprite top is ~scale tiles up.
  const npcScale = npc.scale ?? 3.0;
  const triangleTipY = npcScreenY - npcScale * tileSize - 0.1 * tileSize;

  // NPC display name from config
  const config = YULE_NPC_CONFIGS.find((c) => c.celebrationId === activeId);
  const npcName = config?.displayName ?? npc.name;

  return (
    <div
      className={zClass(Z_ACTION_PROMPTS)}
      style={{
        position: 'fixed',
        left: npcScreenX - BUBBLE_W / 2,
        bottom: window.innerHeight - triangleTipY,
        width: BUBBLE_W,
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'yuleBubbleFadeIn 0.4s ease',
      }}
    >
      {/* NPC label */}
      <div
        style={{
          fontSize: '0.6rem',
          color: '#4a3728',
          fontFamily: '"Georgia", serif',
          marginBottom: 2,
          textAlign: 'center',
          background: 'rgba(255,252,240,0.85)',
          padding: '1px 6px',
          borderRadius: 4,
          border: '1px solid #c8b89a',
          whiteSpace: 'nowrap',
        }}
      >
        {npcName}
      </div>

      {/* Bubble card — oval shape */}
      <div
        style={{
          background: 'rgba(255, 252, 240, 0.97)',
          border: '2px solid #c8b89a',
          borderRadius: '50%',
          width: BUBBLE_W,
          height: BUBBLE_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
          position: 'relative',
        }}
      >
        {/* Item image or emoji fallback */}
        {item.image ? (
          <img
            src={item.image}
            alt={item.displayName}
            style={{ width: 48, height: 48, objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: '2rem' }}>{item.icon ?? '🎁'}</span>
        )}

        {/* Tooltip on hover — skip since pointerEvents: none */}
      </div>

      {/* Triangle pointer pointing downward toward the NPC */}
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '10px solid #c8b89a',
          marginTop: -1,
        }}
      />

      <style>{`
        @keyframes yuleBubbleFadeIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.9); }
          to   { opacity: 1; transform: translateY(0)   scale(1);   }
        }
      `}</style>
    </div>
  );
};

export default ThoughtBubble;
