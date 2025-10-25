import React from 'react';
import { WEATHER_ANIMATIONS, TILE_SIZE } from '../constants';

interface WeatherOverlayProps {
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';
  layer: 'background' | 'midground' | 'foreground';
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * WeatherOverlay - Renders fullscreen weather animations
 *
 * Unlike tile-based animations, weather animations cover the entire viewport
 * and are triggered by the current weather state.
 */
const WeatherOverlay: React.FC<WeatherOverlayProps> = ({
  weather,
  layer,
  viewportWidth,
  viewportHeight,
}) => {
  // Filter animations for this layer and current weather
  const layerAnimations = WEATHER_ANIMATIONS.filter(
    anim => anim.layer === layer && anim.weather === weather
  );

  if (layerAnimations.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        width: viewportWidth,
        height: viewportHeight,
      }}
    >
      {layerAnimations.map((animation) => {
        const scale = animation.scale ?? 1;
        const opacity = animation.opacity ?? 1;

        return (
          <img
            key={animation.id}
            src={animation.image}
            alt={`Weather effect ${animation.id}`}
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) scale(${scale})`,
              transformOrigin: 'center center',
              opacity: opacity,
              pointerEvents: 'none',
              imageRendering: 'auto', // Smooth rendering for effects
              width: 'auto',
              height: 'auto',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
        );
      })}
    </div>
  );
};

export default WeatherOverlay;
