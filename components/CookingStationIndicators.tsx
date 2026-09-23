import React, { useEffect, useMemo, useState } from 'react';
import { Position } from '../types';
import { TILE_SIZE } from '../constants';
import { Z_ACTION_PROMPTS } from '../zIndex';
import { COTTAGE_COLOURS } from '../utils/transitionIcons';
import { useTouchDevice } from '../hooks/useTouchDevice';
import { cookingManager } from '../utils/CookingManager';
import { eventBus, GameEvent } from '../utils/EventBus';
import {
  getCookingStationsOnMap,
  getNearbyCookingStation,
  type CookingStation,
} from '../utils/cookingStations';
import GameIcon from './GameIcon';
import './CookingStationIndicators.css';

interface CookingStationIndicatorsProps {
  currentMapId: string;
  playerPos: Position;
  gridOffset?: Position; // Offset for background-image rooms with centred layers
  tileSize?: number; // Effective tile size (includes viewport scaling for background-image rooms)
  /** Hide everything while a menu, dialogue or cutscene is up. */
  blocked?: boolean;
  /** Open cooking. Only offered beside a station, so this should always succeed. */
  onCook: () => void;
}

/** Glow diameter, in tiles. */
const GLOW_TILES = 2.2;

/** Recipe-book and tea-lesson state, refreshed whenever either can change. */
function useCookingProgress() {
  const read = () => ({
    bookUnlocked: cookingManager.isRecipeBookUnlocked(),
    teaLessonPending: cookingManager.isTeaLessonPending(),
  });
  const [progress, setProgress] = useState(read);
  useEffect(() => {
    const refresh = () => setProgress(read());
    const offMilestone = eventBus.on(GameEvent.PLAYER_MILESTONE, refresh);
    const offBook = eventBus.on(GameEvent.RECIPE_BOOK_UNLOCKED, refresh);
    return () => {
      offMilestone();
      offBook();
    };
  }, []);
  return progress;
}

/** Placed campfires come and go; recount the stations when placed items change. */
function useStations(mapId: string): CookingStation[] {
  const [revision, setRevision] = useState(0);
  useEffect(
    () =>
      eventBus.on(GameEvent.PLACED_ITEMS_CHANGED, (payload) => {
        if (!payload?.mapId || payload.mapId === mapId) setRevision((r) => r + 1);
      }),
    [mapId]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- revision invalidates the placed-item read
  return useMemo(() => getCookingStationsOnMap(mapId), [mapId, revision]);
}

/**
 * Makes every place the player can cook impossible to miss (#151/#157).
 *
 * Each cooking station on the current map — Mum's fireplace, a stove, a placed campfire —
 * glows gently the whole time the player is on the map. Standing beside one brings up a big
 * pulsing "Cook here" button: a real button, at least 56px tall, so it works on a touch
 * screen; keyboard players can press E or C instead.
 *
 * Nothing shows until Mum has given the recipe book, because cooking needs it.
 * While the first tea lesson is pending, the fireplace marker is a kettle instead.
 */
const CookingStationIndicators: React.FC<CookingStationIndicatorsProps> = ({
  currentMapId,
  playerPos,
  gridOffset,
  tileSize = TILE_SIZE,
  blocked = false,
  onCook,
}) => {
  const isTouchDevice = useTouchDevice();
  const { bookUnlocked, teaLessonPending } = useCookingProgress();
  const stations = useStations(currentMapId);
  if (!bookUnlocked || stations.length === 0) return null;

  const offsetX = gridOffset?.x ?? 0;
  const offsetY = gridOffset?.y ?? 0;
  const nearby = blocked ? null : getNearbyCookingStation(playerPos, currentMapId);

  return (
    <>
      {stations.map((station) => {
        const screenX = station.centre.x * tileSize + offsetX;
        const screenY = station.centre.y * tileSize + offsetY;
        const isTeaFire = teaLessonPending && station.kind === 'fireplace';
        const icon = isTeaFire ? '☕' : station.kind === 'stove' ? '🍳' : '🔥';
        const isNearby = nearby?.id === station.id;
        const glowSize = GLOW_TILES * tileSize;

        return (
          <React.Fragment key={station.id}>
            <div
              className="cooking-station-glow"
              data-cooking-station={station.id}
              style={{
                left: screenX,
                top: screenY,
                width: glowSize,
                height: glowSize,
                zIndex: Z_ACTION_PROMPTS,
              }}
            />
            {!blocked && !isNearby && (
              <div
                className="absolute pointer-events-none animate-float-gentle"
                style={{
                  left: screenX,
                  top: screenY - tileSize,
                  transform: 'translate(-50%, -100%)',
                  zIndex: Z_ACTION_PROMPTS,
                }}
              >
                <div
                  className="animate-pulse-glow"
                  role="img"
                  aria-label={isTeaFire ? 'Make your tea here' : 'You can cook here'}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: isTeaFire ? '#92400e' : '#c2410c',
                    border: `2px solid ${COTTAGE_COLOURS.warmBrownBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GameIcon icon={icon} size={18} />
                </div>
              </div>
            )}
            {isNearby && (
              <div
                className="cooking-station-cue"
                data-game-ui
                style={{ left: screenX, top: screenY - tileSize, zIndex: Z_ACTION_PROMPTS + 1 }}
              >
                <button
                  type="button"
                  className="cooking-here-button"
                  aria-label={isTeaFire ? 'Cook here: make your tea' : 'Cook here'}
                  onClick={(event) => {
                    event.stopPropagation();
                    onCook();
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onMouseUp={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                >
                  <GameIcon icon={icon} size={26} />
                  <span>
                    Cook here
                    {isTeaFire && <span className="cooking-here-hint">Make your tea here</span>}
                  </span>
                  {!isTouchDevice && <span className="cooking-here-key">E</span>}
                </button>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default CookingStationIndicators;
