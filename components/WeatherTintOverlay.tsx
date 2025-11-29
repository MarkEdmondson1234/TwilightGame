import React from 'react';

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
 */
const WeatherTintOverlay: React.FC<WeatherTintOverlayProps> = ({ weather, visible }) => {
  if (!visible || weather === 'clear' || weather === 'cherry_blossoms') {
    return null;
  }

  // Weather-specific visual effects
  const getOverlayStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 50, // Above game world, below HUD (HUD is z-index 100+)
    };

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

export default WeatherTintOverlay;
