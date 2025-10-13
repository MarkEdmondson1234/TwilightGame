import React from 'react';
import { Position } from '../types';
import { getTileData } from '../utils/mapUtils';

interface DebugInfoPanelProps {
  playerPos: Position;
}

const DebugInfoPanel: React.FC<DebugInfoPanelProps> = ({ playerPos }) => {
  const currentTileX = Math.floor(playerPos.x);
  const currentTileY = Math.floor(playerPos.y);
  const tileData = getTileData(currentTileX, currentTileY);

  const playerSize = 0.6;
  const halfSize = playerSize / 2;

  const minTileX = Math.floor(playerPos.x - halfSize);
  const maxTileX = Math.floor(playerPos.x + halfSize);
  const minTileY = Math.floor(playerPos.y - halfSize);
  const maxTileY = Math.floor(playerPos.y + halfSize);


  return (
    <div className="absolute bottom-4 right-4 bg-black/70 p-3 rounded-lg border border-slate-700 text-sm text-white font-mono space-y-1 z-30">
      <h3 className="text-md font-bold text-cyan-300 mb-2">Debug Info (F3)</h3>
      <div>Player Pos: ({playerPos.x.toFixed(2)}, {playerPos.y.toFixed(2)})</div>
      <div>Current Tile: ({currentTileX}, {currentTileY})</div>
       {tileData && (
        <>
            <div>Tile Name: {tileData.name}</div>
            <div>Is Solid: <span className={tileData.isSolid ? 'text-red-500' : 'text-green-500'}>{tileData.isSolid.toString()}</span></div>
        </>
       )}
      <div className="pt-1 mt-1 border-t border-slate-600">
        <div>Hitbox Overlaps:</div>
        <div>X Tiles: [{minTileX}, {maxTileX}]</div>
        <div>Y Tiles: [{minTileY}, {maxTileY}]</div>
      </div>
    </div>
  );
};

export default DebugInfoPanel;
