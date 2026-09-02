/**
 * Sliding Crate Puzzle — Sokoban-style mini-game.
 *
 * Discrete grid-step movement (each key press moves exactly one tile). Walking into
 * a crate pushes it one tile further in the same direction, but only if the tile
 * beyond it is open — standard Sokoban push rules, with one addition: crates can
 * never be pushed onto the exit tile, so a bad push can never permanently plug the
 * goal. Win by walking onto the exit tile; crates just need to be out of the way.
 *
 * See levels.ts for why the puzzle uses several open floor tiles rather than a
 * single one (a single-empty-tile version is mathematically unsolvable past move one).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { CRATE_LEVELS, CellKind, type GridPosition } from './levels';
import { Direction } from '../../types';
import { gameState } from '../../GameState';
import { generateCharacterSprites, DEFAULT_CHARACTER } from '../../utils/characterSprites';
import { useTouchDevice } from '../../hooks/useTouchDevice';
import { Z_MINI_GAME, zClass } from '../../zIndex';
import { tileAssets } from '../../assets';

// Cell size is computed responsively (see useResponsiveCellSize below) so the board fills
// most of the full-screen viewport on desktop but still shrinks to fit a tablet in portrait.
const MIN_CELL_SIZE = 32;
const MAX_CELL_SIZE = 120;
// Rough space reserved for the header row and margins around the board — subtracted from
// the viewport before dividing up what's left between the grid cells. The D-pad (tablet
// only) floats over the board's bottom-right corner rather than living in the layout flow,
// so it gets its own extra bottom reserve only when it's actually going to be shown.
const HEADER_RESERVE = 96;
const MARGIN_RESERVE = 64;
const DPAD_RESERVE = 200;
// The rock_wall texture reads as noisy/busy if it repeats once per tile at small cell
// sizes, so one image spans a 4x4 area instead — matching the real game's lava floor
// tiles (data/tiles.ts's TileType.LAVA_FLOOR uses the same "bigger repeat unit" fix).
const WALL_TEXTURE_TILE_SPAN = 4;
// Small overlap to hide subpixel seams between adjacent independently-rendered wall cells
// (see cellStyle's CellKind.Wall case for the full explanation).
const WALL_OVERLAP = 1;

function useResponsiveCellSize(gridWidth: number, gridHeight: number, reserveForDPad: boolean): number {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return useMemo(() => {
    const availableWidth = viewport.width - MARGIN_RESERVE;
    const availableHeight =
      viewport.height - HEADER_RESERVE - MARGIN_RESERVE - (reserveForDPad ? DPAD_RESERVE : 0);
    const raw = Math.min(availableWidth / gridWidth, availableHeight / gridHeight);
    return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, Math.floor(raw)));
  }, [viewport, gridWidth, gridHeight, reserveForDPad]);
}

const DIRECTION_BY_KEY: Record<string, GridPosition> = {
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
};

interface Crate {
  id: string;
  x: number;
  y: number;
}

function directionFromDelta(dx: number, dy: number): Direction {
  if (dx > 0) return Direction.Right;
  if (dx < 0) return Direction.Left;
  if (dy > 0) return Direction.Down;
  return Direction.Up;
}

export const SlidingCratePuzzleGame: React.FC<MiniGameComponentProps> = ({
  onClose,
  onComplete,
}) => {
  const level = CRATE_LEVELS[0];
  const isTouchDevice = useTouchDevice();
  const cellSize = useResponsiveCellSize(level.width, level.height, isTouchDevice);

  // Crates are tracked separately from the static grid (walls/floor/exit never change)
  // so each crate can carry a stable id for a CSS-transitioned slide when it moves.
  const staticGrid = useMemo<CellKind[][]>(
    () => level.grid.map((row) => row.map((cell) => (cell === CellKind.Crate ? CellKind.Floor : cell))),
    [level]
  );

  const initialCrates = useMemo<Crate[]>(() => {
    const crates: Crate[] = [];
    level.grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === CellKind.Crate) crates.push({ id: `crate-${crates.length}`, x, y });
      });
    });
    return crates;
  }, [level]);

  // Player position and crates update together atomically (one setState call, one updater
  // function) — splitting them across two separate setState calls would mean reading a
  // "moved to" result back out before React guarantees the paired update has run.
  const [board, setBoard] = useState<{ playerPos: GridPosition; crates: Crate[] }>({
    playerPos: level.playerStart,
    crates: initialCrates,
  });
  const [facing, setFacing] = useState<Direction>(Direction.Down);
  const [won, setWon] = useState(false);

  const cellAt = useCallback(
    (x: number, y: number): CellKind => {
      if (y < 0 || y >= staticGrid.length || x < 0 || x >= staticGrid[0].length) return CellKind.Wall;
      return staticGrid[y][x];
    },
    [staticGrid]
  );

  const attemptMove = useCallback(
    (dx: number, dy: number) => {
      setFacing(directionFromDelta(dx, dy));
      if (won) return;

      setBoard((prev) => {
        const target = { x: prev.playerPos.x + dx, y: prev.playerPos.y + dy };
        if (cellAt(target.x, target.y) === CellKind.Wall) return prev;

        const crateIndex = prev.crates.findIndex((c) => c.x === target.x && c.y === target.y);
        if (crateIndex === -1) {
          // No crate in the way — a plain walk onto floor or the exit.
          if (target.x === level.exit.x && target.y === level.exit.y) setWon(true);
          return { playerPos: target, crates: prev.crates };
        }

        const beyond = { x: target.x + dx, y: target.y + dy };
        const beyondBlocked =
          cellAt(beyond.x, beyond.y) === CellKind.Wall ||
          prev.crates.some((c) => c.x === beyond.x && c.y === beyond.y) ||
          (beyond.x === level.exit.x && beyond.y === level.exit.y); // crates may never plug the exit

        if (beyondBlocked) return prev;

        // A crate cell can never be the exit, so the player landing on `target` here
        // never coincides with the exit — no win check needed on this branch.
        const crates = prev.crates.map((c, i) => (i === crateIndex ? { ...c, x: beyond.x, y: beyond.y } : c));
        return { playerPos: target, crates };
      });
    },
    [cellAt, level.exit, won]
  );

  // Discrete grid-step keyboard input. Safe to attach unconditionally — the overworld's
  // own key handling is already gated off via ui.miniGame while this overlay is open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const dir = DIRECTION_BY_KEY[e.key.toLowerCase()];
      if (!dir) return;
      e.preventDefault();
      attemptMove(dir.x, dir.y);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attemptMove]);

  const character = gameState.getSelectedCharacter() || DEFAULT_CHARACTER;
  const spriteFrames = useMemo(() => generateCharacterSprites(character), [character]);
  const playerSprite = spriteFrames[facing]?.[0] ?? spriteFrames[Direction.Down]?.[0];

  const handleClaim = useCallback(() => {
    const result: MiniGameResult = {
      success: true,
      message: 'Congratulations! You passed the Test of Wits!',
      messageType: 'success',
    };
    onComplete(result);
  }, [onComplete]);

  const boardWidth = level.width * cellSize;
  const boardHeight = level.height * cellSize;

  // Floor tiles need no per-cell div at all — a single background layer (below) tiles the
  // mine_floor texture continuously across the whole board, so it reads as one seamless
  // stone floor rather than a grid of identically-stamped image copies. Only Wall and Exit
  // cells get their own overlay on top of that shared floor.
  //
  // Wall cells are scattered (not one contiguous rectangle like the floor), so they can't
  // share a single background layer the same way. Instead each wall div samples the same
  // infinite tiling rock_wall pattern at a background-position offset by its own grid
  // coordinate — since it's the same tileable image at the same phase everywhere, adjacent
  // wall cells still line up seamlessly even though they're separate elements.
  const cellStyle = (kind: CellKind, x: number, y: number): React.CSSProperties | null => {
    switch (kind) {
      case CellKind.Wall:
        // Each wall cell is a separate element independently rasterising its own cropped
        // slice of the tiling image — adjacent cells can develop a hairline subpixel gap
        // between them (the classic seam-between-independently-rendered-tiles issue).
        // Overlapping each cell slightly into its neighbours, with backgroundPosition
        // adjusted by the same amount so the texture content itself still lines up,
        // papers over that gap without shifting what's actually visible.
        return {
          left: x * cellSize - WALL_OVERLAP,
          top: y * cellSize - WALL_OVERLAP,
          width: cellSize + WALL_OVERLAP * 2,
          height: cellSize + WALL_OVERLAP * 2,
          backgroundImage: `url(${tileAssets.rock_wall})`,
          backgroundSize: `${cellSize * WALL_TEXTURE_TILE_SPAN}px ${cellSize * WALL_TEXTURE_TILE_SPAN}px`,
          backgroundRepeat: 'repeat',
          backgroundPosition: `${-x * cellSize + WALL_OVERLAP}px ${-y * cellSize + WALL_OVERLAP}px`,
        };
      case CellKind.Exit:
        return {
          boxShadow: 'inset 0 0 0 3px #ffd76a',
          backgroundImage: `url(${tileAssets.door_1})`,
          backgroundSize: 'cover',
        };
      default:
        return null;
    }
  };

  return (
    <div
      className={zClass(Z_MINI_GAME)}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#1a1a2e',
        color: '#e0e0e0',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          boxSizing: 'border-box',
          padding: '16px 24px',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <h2 style={{ margin: 0 }}>Test of Wits</h2>
        <button onClick={onClose} style={{ background: 'transparent', color: '#e0e0e0', border: 'none', cursor: 'pointer', fontSize: 24 }}>
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          boxSizing: 'border-box',
          // Matches the sizing hook's reserveForDPad budget — without this, the board would
          // still center across the full flex area and could sit under the D-pad's corner.
          paddingBottom: isTouchDevice ? DPAD_RESERVE : 0,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: boardWidth,
            height: boardHeight,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundImage: `url(${tileAssets.mine_floor})`,
            backgroundSize: `${cellSize}px ${cellSize}px`,
            backgroundRepeat: 'repeat',
          }}
        >
        {staticGrid.map((row, y) =>
          row.map((kind, x) => {
            const style = cellStyle(kind, x, y);
            if (!style) return null;
            return (
              <div
                key={`bg-${x}-${y}`}
                style={{
                  position: 'absolute',
                  left: x * cellSize,
                  top: y * cellSize,
                  width: cellSize,
                  height: cellSize,
                  ...style,
                }}
              />
            );
          })
        )}

        {board.crates.map((crate) => (
          <div
            key={crate.id}
            style={{
              position: 'absolute',
              left: crate.x * cellSize,
              top: crate.y * cellSize,
              width: cellSize,
              height: cellSize,
              backgroundImage: `url(${tileAssets.crate})`,
              backgroundSize: 'cover',
              transition: 'left 120ms ease, top 120ms ease',
            }}
          />
        ))}

        <div
          style={{
            position: 'absolute',
            left: board.playerPos.x * cellSize,
            top: board.playerPos.y * cellSize,
            width: cellSize,
            height: cellSize,
            transition: 'left 120ms ease, top 120ms ease',
            backgroundImage: playerSprite ? `url(${playerSprite})` : undefined,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />

        {won && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 600 }}>You passed the Test of Wits!</div>
            <button
              onClick={handleClaim}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: '#ffd76a',
                color: '#1a1a2e',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Claim
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Tap-to-move-once on-screen D-pad, tablet/touch only — desktop uses the keyboard
          handler above exclusively. Floats over the board's bottom-right corner (like
          minigames/skiing's touch buttons) rather than sitting in the layout flow, so it
          doesn't eat into the board's own size budget except via the sizing hook's
          reserveForDPad flag. */}
      {isTouchDevice && (
        <div
          style={{
            position: 'absolute',
            right: 24,
            bottom: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 56px)',
            gridTemplateRows: 'repeat(3, 56px)',
            gap: 4,
          }}
        >
          <div />
          <DPadButton label="▲" onPress={() => attemptMove(0, -1)} />
          <div />
          <DPadButton label="◀" onPress={() => attemptMove(-1, 0)} />
          <div />
          <DPadButton label="▶" onPress={() => attemptMove(1, 0)} />
          <div />
          <DPadButton label="▼" onPress={() => attemptMove(0, 1)} />
          <div />
        </div>
      )}
    </div>
  );
};

const DPadButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => (
  <div
    onClick={onPress}
    style={{
      width: 56,
      height: 56,
      borderRadius: '50%',
      border: '2px solid rgba(255,255,255,0.6)',
      background: 'rgba(255,255,255,0.1)',
      color: '#fff',
      fontSize: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      touchAction: 'none',
      userSelect: 'none',
      cursor: 'pointer',
    }}
  >
    {label}
  </div>
);
