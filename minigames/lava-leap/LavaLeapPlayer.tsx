import React from 'react';
import { PLAYER } from './engine';
import { playerArtworkBounds } from './playerArtwork';

export const VISIBLE_PLAYER_HEIGHT = 76;
export const VISIBLE_PLAYER_WIDTH = 50;

export function LavaLeapPlayer({
  x,
  y,
  sprite,
  rescued,
  gliding,
}: {
  x: number;
  y: number;
  sprite?: string;
  rescued: boolean;
  gliding: boolean;
}) {
  const bounds = sprite ? playerArtworkBounds(sprite) : undefined;
  return (
    <div
      className={`ll-player ${rescued ? 'rescued' : ''}`}
      style={{
        left: x + PLAYER.w / 2 - VISIBLE_PLAYER_WIDTH / 2,
        top: y + PLAYER.h - VISIBLE_PLAYER_HEIGHT,
        width: VISIBLE_PLAYER_WIDTH,
        height: VISIBLE_PLAYER_HEIGHT,
      }}
    >
      {sprite && bounds ? (
        <svg
          viewBox={`${bounds[1]} ${bounds[2]} ${bounds[3] - bounds[1] + 1} ${bounds[4] - bounds[2] + 1}`}
          preserveAspectRatio="xMidYMax meet"
          role="img"
          aria-label="Your character"
          width="100%"
          height="100%"
        >
          <image href={sprite} width={bounds[0]} height={bounds[0]} />
        </svg>
      ) : sprite ? (
        <img src={sprite} alt="Your character" />
      ) : (
        <span>🧙</span>
      )}
      {gliding && <span className="ll-wind-trail">≈</span>}
    </div>
  );
}
