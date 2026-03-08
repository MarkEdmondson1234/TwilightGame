import React from 'react';
import { Z_SPRITE_BACKGROUND } from '../zIndex';
import { TIMING } from '../constants';

interface WeatherTintOverlayProps {
  weather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';
  visible: boolean;
}

/**
 * WeatherTintOverlay - Applies weather visual effects over NPCs
 *
 * Since NPCs are rendered as DOM elements above the PixiJS canvas,
 * this overlay ensures they're visually affected by weather.
 * Renders above NPCs but below the HUD.
 *
 * Always renders the div (with opacity 0 for clear weather) so that
 * CSS transitions can animate smoothly when weather changes.
 */
const WeatherTintOverlay: React.FC<WeatherTintOverlayProps> = ({ weather, visible }) => {
  const isClear = !visible || weather === 'clear' || weather === 'cherry_blossoms';

  const getOverlayStyle = (): React.CSSProperties => {
    // When weather is not visible (indoor/cave), skip the fade transition entirely
    const transitionDuration = isClear ? '0s' : `${TIMING.WEATHER_TRANSITION_S}s`;
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: Z_SPRITE_BACKGROUND,
      transition: `background-color ${transitionDuration} ease-in-out, opacity ${transitionDuration} ease-in-out`,
      opacity: isClear ? 0 : 1,
    };

    if (isClear) return baseStyle;

    switch (weather) {
      case 'fog':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(220, 220, 220, 0.35)',
          mixBlendMode: 'lighten',
        };
      case 'mist':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(240, 240, 240, 0.2)',
          mixBlendMode: 'lighten',
        };
      case 'rain':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(100, 120, 140, 0.15)',
          mixBlendMode: 'multiply',
        };
      case 'storm':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(80, 90, 110, 0.25)',
          mixBlendMode: 'multiply',
        };
      case 'snow':
        return {
          ...baseStyle,
          backgroundColor: 'rgba(245, 248, 255, 0.2)',
          mixBlendMode: 'lighten',
        };
      default:
        return baseStyle;
    }
  };

  return <div style={getOverlayStyle()} />;
};

export default React.memo(WeatherTintOverlay);
