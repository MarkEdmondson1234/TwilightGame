import React from 'react';
import { tileAssets } from '../../assets';
import type { Crystal } from './engine';

/** Crop transparent padding, preserving the game's existing hand-drawn crystal. */
export function CrystalArtwork({
  crystal = 'frost',
  size = 36,
}: {
  crystal?: Crystal;
  size?: number;
}) {
  return (
    <svg
      className={`ll-crystal-art ${crystal}`}
      width={size}
      height={size}
      viewBox="219 247 608 650"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
    >
      <image href={tileAssets.mine_crystal} width="1024" height="1024" />
    </svg>
  );
}
