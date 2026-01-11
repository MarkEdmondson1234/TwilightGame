/**
 * Lightning Bolt Effect
 *
 * Dramatic lightning strike with:
 * - Full-screen white flash
 * - Jagged SVG bolt from top of screen
 * - Glow effect at strike point
 * - Flicker animation
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Z_SCREEN_FLASH } from '../../zIndex';

interface LightningBoltEffectProps {
  /** X position of strike point on screen */
  strikeX: number;
  /** Y position of strike point on screen */
  strikeY: number;
  /** Called when effect completes */
  onComplete: () => void;
}

const DURATION = 700; // Total effect duration in ms

/**
 * Generate a jagged lightning bolt path using SVG
 */
function generateBoltPath(startX: number, startY: number, endX: number, endY: number): string {
  const segments = 6 + Math.floor(Math.random() * 4); // 6-10 segments
  let path = `M ${startX} ${startY}`;

  const deltaX = endX - startX;
  const deltaY = endY - startY;

  for (let i = 1; i <= segments; i++) {
    const progress = i / segments;
    // Add randomness that decreases as we approach the target
    const jitter = (1 - progress * 0.7) * 80;
    const x = startX + deltaX * progress + (Math.random() - 0.5) * jitter;
    const y = startY + deltaY * progress;
    path += ` L ${x} ${y}`;
  }

  return path;
}

/**
 * Generate a secondary branch bolt
 */
function generateBranchPath(
  mainPath: string,
  branchPoint: number // 0-1 along the main path
): string {
  // Extract a point along the main path to branch from
  const pathParts = mainPath.split(' L ');
  const branchIndex = Math.floor(pathParts.length * branchPoint);

  if (branchIndex < 1 || branchIndex >= pathParts.length) return '';

  const [branchX, branchY] = pathParts[branchIndex].split(' ').map(Number);

  // Create a short branch
  const branchLength = 40 + Math.random() * 60;
  const branchAngle = (Math.random() - 0.5) * Math.PI * 0.5;
  const endX = branchX + Math.cos(branchAngle) * branchLength;
  const endY = branchY + Math.sin(branchAngle) * branchLength + branchLength * 0.5;

  return `M ${branchX} ${branchY} L ${endX} ${endY}`;
}

const LightningBoltEffect: React.FC<LightningBoltEffectProps> = ({
  strikeX,
  strikeY,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'flash' | 'bolt' | 'fade'>('flash');

  // Generate bolt paths once on mount
  const { mainBolt, branches } = useMemo(() => {
    const viewportWidth = window.innerWidth;
    const startX = viewportWidth / 2 + (Math.random() - 0.5) * 100;
    const main = generateBoltPath(startX, -20, strikeX, strikeY);

    // Generate 1-2 branches
    const branchCount = 1 + Math.floor(Math.random() * 2);
    const branchPaths: string[] = [];
    for (let i = 0; i < branchCount; i++) {
      const branchPoint = 0.3 + Math.random() * 0.4;
      const branch = generateBranchPath(main, branchPoint);
      if (branch) branchPaths.push(branch);
    }

    return { mainBolt: main, branches: branchPaths };
  }, [strikeX, strikeY]);

  // Animation sequence
  useEffect(() => {
    // Phase 1: Flash (0-100ms)
    const flashTimer = setTimeout(() => setPhase('bolt'), 100);

    // Phase 2: Bolt visible (100-500ms)
    const fadeTimer = setTimeout(() => setPhase('fade'), 500);

    // Phase 3: Fade out and complete
    const completeTimer = setTimeout(onComplete, DURATION);

    return () => {
      clearTimeout(flashTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <>
      {/* Full-screen flash */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#FFFFFF',
          opacity: phase === 'flash' ? 0.9 : 0,
          transition: 'opacity 100ms ease-out',
          pointerEvents: 'none',
          zIndex: Z_SCREEN_FLASH,
        }}
      />

      {/* Lightning bolt SVG */}
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: Z_SCREEN_FLASH - 1,
          opacity: phase === 'fade' ? 0 : 1,
          transition: 'opacity 200ms ease-out',
        }}
      >
        {/* Glow filter */}
        <defs>
          <filter id="lightning-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="lightning-glow-intense" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main bolt - outer glow (blue) */}
        <path
          d={mainBolt}
          fill="none"
          stroke="#87CEEB"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lightning-glow-intense)"
          style={{
            opacity: phase === 'bolt' ? 0.8 : 0,
          }}
        />

        {/* Main bolt - core (white) */}
        <path
          d={mainBolt}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lightning-glow)"
          style={{
            opacity: phase === 'bolt' ? 1 : 0,
          }}
        />

        {/* Branch bolts */}
        {branches.map((branch, i) => (
          <g key={i}>
            <path
              d={branch}
              fill="none"
              stroke="#87CEEB"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lightning-glow)"
              style={{
                opacity: phase === 'bolt' ? 0.6 : 0,
              }}
            />
            <path
              d={branch}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                opacity: phase === 'bolt' ? 1 : 0,
              }}
            />
          </g>
        ))}
      </svg>

      {/* Strike point glow */}
      <div
        style={{
          position: 'fixed',
          left: strikeX - 60,
          top: strikeY - 30,
          width: 120,
          height: 60,
          background: `radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, rgba(135,206,235,0.6) 40%, transparent 70%)`,
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: Z_SCREEN_FLASH - 2,
          opacity: phase === 'bolt' ? 1 : phase === 'fade' ? 0.3 : 0,
          transition: 'opacity 200ms ease-out',
          transform: 'scaleY(0.5)',
        }}
      />

      {/* Inline keyframes for flicker effect */}
      <style>{`
        @keyframes lightning-flicker {
          0%, 100% { opacity: 1; }
          10% { opacity: 0.8; }
          20% { opacity: 1; }
          30% { opacity: 0.7; }
          40% { opacity: 1; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </>
  );
};

export default LightningBoltEffect;
