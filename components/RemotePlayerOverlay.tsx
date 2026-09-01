/**
 * RemotePlayerOverlay — DOM rendering of other players.
 *
 * The fallback for USE_PIXI_RENDERER = false. Positioning mirrors the DOM
 * player and NPC renderers exactly (top-left corner derived from the centre,
 * grid offset added, z-index from the feet Y) so remote players sort with
 * everything else in that path.
 *
 * It drives its own requestAnimationFrame rather than taking a trigger prop:
 * interpolated positions change every frame, and pushing that through React
 * state from the manager would make every remote player cost a re-render for
 * the PixiJS path too, where nothing needs it.
 */

import React, { useEffect, useState } from 'react';
import { PLAYER_SIZE } from '../constants';
import { Z_PLAYER } from '../zIndex';
import type { Position } from '../types';
import { remotePlayerManager } from '../multiplayer/RemotePlayerManager';
import { getRemoteSpriteInfo } from '../multiplayer/remoteSprites';
import { getEmoteIcon } from '../multiplayer/emotes';

interface RemotePlayerOverlayProps {
  /** Map-level scale multiplier for all characters */
  characterScale?: number;
  /** Offset for background-image rooms with centred layers */
  gridOffset?: Position;
  /** Viewport-scaled tile size */
  tileSize: number;
}

const RemotePlayerOverlay: React.FC<RemotePlayerOverlayProps> = ({
  characterScale = 1.0,
  gridOffset,
  tileSize,
}) => {
  const [, forceRender] = useState(0);

  useEffect(() => {
    let frameId = 0;
    const loop = () => {
      forceRender((n) => n + 1);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;

  return (
    <>
      {remotePlayerManager.getRemotePlayers().map((player) => {
        const { url, spriteScale, shouldFlip } = getRemoteSpriteInfo(player);
        const effectiveScale = spriteScale * characterScale;
        const size = PLAYER_SIZE * effectiveScale * tileSize;
        const left = (player.position.x - (PLAYER_SIZE * effectiveScale) / 2) * tileSize + offsetX;
        const top = (player.position.y - (PLAYER_SIZE * effectiveScale) / 2) * tileSize + offsetY;
        const zIndex = Z_PLAYER + Math.floor(player.position.y + 0.3);
        const emoteIcon = player.emote ? getEmoteIcon(player.emote) : null;

        return (
          <React.Fragment key={player.uid}>
            <img
              src={url}
              alt={player.name}
              className="absolute pointer-events-none"
              style={{
                left,
                top,
                width: size,
                height: size,
                zIndex,
                transform: shouldFlip ? 'scaleX(-1)' : undefined,
              }}
            />
            <div
              className="absolute pointer-events-none whitespace-nowrap text-center text-sm font-semibold text-white"
              style={{
                left: player.position.x * tileSize + offsetX,
                top: (player.position.y - 0.85 * characterScale) * tileSize + offsetY,
                transform: 'translate(-50%, -100%)',
                textShadow: '0 0 4px #2b2b3a, 0 0 4px #2b2b3a',
                zIndex: zIndex + 1,
              }}
            >
              {player.name}
            </div>
            {emoteIcon && (
              <div
                className="absolute pointer-events-none text-2xl"
                style={{
                  left: player.position.x * tileSize + offsetX,
                  top: (player.position.y - 1.35 * characterScale) * tileSize + offsetY,
                  transform: 'translate(-50%, -100%)',
                  zIndex: zIndex + 2,
                }}
              >
                {emoteIcon}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default RemotePlayerOverlay;
