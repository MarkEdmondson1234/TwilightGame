import React from 'react';
import { Position } from '../types';
import { getTileData } from '../utils/mapUtils';
import { PLAYER_SIZE } from '../constants';
import { mapManager } from '../maps';
import { TimeManager } from '../utils/TimeManager';
import { ColorResolver } from '../utils/ColorResolver';
import { getColorHex } from '../palette';
import { Z_DEBUG_PANEL, zClass } from '../zIndex';

interface DebugInfoPanelProps {
  playerPos: Position;
  clickedTile?: Position | null;
  onClearClick?: () => void;
}

const DebugInfoPanel: React.FC<DebugInfoPanelProps> = ({ playerPos, clickedTile, onClearClick }) => {
  const currentTileX = Math.floor(playerPos.x);
  const currentTileY = Math.floor(playerPos.y);
  const tileData = getTileData(currentTileX, currentTileY);

  // Get clicked tile data if available
  const clickedTileData = clickedTile ? getTileData(clickedTile.x, clickedTile.y) : null;
  const clickedColorTrace = clickedTileData ? ColorResolver.traceTileColor(clickedTileData.type) : null;
  const clickedColorName = clickedColorTrace?.finalColor?.match(/bg-palette-(\w+)/)?.[1] || 'unknown';
  const clickedColorHex = clickedColorName !== 'unknown' ? getColorHex(clickedColorName as any) : '#000000';

  const halfSize = PLAYER_SIZE / 2;

  const minTileX = Math.floor(playerPos.x - halfSize);
  const maxTileX = Math.floor(playerPos.x + halfSize);
  const minTileY = Math.floor(playerPos.y - halfSize);
  const maxTileY = Math.floor(playerPos.y + halfSize);

  // Color system debug info
  const currentMap = mapManager.getCurrentMap();
  const colorScheme = mapManager.getCurrentColorScheme();
  const gameTime = TimeManager.getCurrentTime();

  // Get resolved color with full trace for current tile
  const colorTrace = tileData ? ColorResolver.traceTileColor(tileData.type) : null;
  const colorName = colorTrace?.finalColor?.match(/bg-palette-(\w+)/)?.[1] || 'unknown';
  const colorHex = colorName !== 'unknown' ? getColorHex(colorName as any) : '#000000';

  // Source labels for display
  const sourceLabels: Record<string, { label: string; color: string }> = {
    base: { label: 'BASE', color: 'text-gray-400' },
    scheme: { label: 'SCHEME', color: 'text-blue-300' },
    time: { label: 'TIME', color: 'text-purple-300' },
    seasonal: { label: 'SEASON', color: 'text-yellow-300' },
  };
  const sourceInfo = colorTrace ? sourceLabels[colorTrace.source] : null;


  return (
    <div className={`fixed bottom-4 right-4 bg-black/70 p-3 rounded-lg border border-slate-700 text-sm text-white font-mono space-y-1 ${zClass(Z_DEBUG_PANEL)}`}>
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
      <div className="pt-1 mt-1 border-t border-slate-600">
        <div className="text-cyan-300 font-bold">Colour System</div>
        <div>Map: {currentMap?.name || 'none'}</div>
        <div>Scheme: {colorScheme?.name || 'none'}</div>
        <div>Season: <span className="text-yellow-300">{gameTime.season}</span> Day {gameTime.day}</div>
        <div>Time: <span className={gameTime.timeOfDay === 'Day' ? 'text-yellow-200' : 'text-blue-300'}>{gameTime.timeOfDay}</span> (Hour {gameTime.hour})</div>
        {tileData && colorTrace && (
          <>
            <div className="flex items-center gap-2">
              <span>Tile Colour:</span>
              <span
                className="inline-block w-4 h-4 border border-white/50 rounded-sm"
                style={{ backgroundColor: colorHex }}
                title={`${colorName} (${colorHex})`}
              />
              <span className="text-green-300">{colorName}</span>
              {sourceInfo && (
                <span className={`text-xs px-1 rounded ${sourceInfo.color} bg-white/10`}>
                  {sourceInfo.label}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <div>Key: {colorTrace.colorKey || 'none'}</div>
              <div className="mt-1">Resolution chain:</div>
              {colorTrace.trace.map((step, i) => (
                <div key={i} className={`pl-2 ${step.applied ? 'text-white' : 'text-gray-500'}`}>
                  {step.applied ? '→' : '○'} {step.layer}: {step.color}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Clicked Tile Section */}
      {clickedTile && clickedTileData && (
        <div className="pt-1 mt-1 border-t border-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-yellow-300 font-bold">🎯 Clicked Tile</span>
            {onClearClick && (
              <button
                onClick={onClearClick}
                className="text-xs text-gray-400 hover:text-white px-1 rounded hover:bg-white/20"
              >
                ✕ Clear
              </button>
            )}
          </div>
          <div>Position: <span className="text-yellow-200">({clickedTile.x}, {clickedTile.y})</span></div>
          <div>Tile: {clickedTileData.name}</div>
          <div>Type: <span className="text-gray-400">{clickedTileData.type}</span></div>
          <div>Solid: <span className={clickedTileData.isSolid ? 'text-red-500' : 'text-green-500'}>{clickedTileData.isSolid.toString()}</span></div>
          <div className="flex items-center gap-2">
            <span>Colour:</span>
            <span
              className="inline-block w-4 h-4 border border-white/50 rounded-sm"
              style={{ backgroundColor: clickedColorHex }}
            />
            <span className="text-green-300">{clickedColorName}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Click another tile to inspect, or Clear to dismiss
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugInfoPanel;