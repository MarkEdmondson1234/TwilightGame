/**
 * GameIcon Component
 *
 * Renders either a hand-drawn PNG icon or an emoji fallback.
 * Automatically maps emoji characters to their hand-drawn replacements
 * via the central iconMap. Unmapped emojis render as text.
 *
 * Usage:
 *   <GameIcon icon="👋" size={32} />           // Auto-maps to hand-drawn PNG
 *   <GameIcon icon="/path/to/icon.png" size={32} /> // Direct image URL
 *   <GameIcon icon="🌱" size={24} />           // Unmapped emoji renders as text
 */

import React from 'react';
import { resolveIcon, isImageIcon } from '../utils/iconMap';

interface GameIconProps {
  /** Emoji string or image URL */
  icon: string;
  /** Size in pixels (default 24) */
  size?: number;
  /** Alt text for image icons */
  alt?: string;
  /** Additional CSS class names */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
}

const GameIcon: React.FC<GameIconProps> = ({
  icon,
  size = 24,
  alt = '',
  className,
  style,
}) => {
  const resolved = resolveIcon(icon);

  if (isImageIcon(resolved)) {
    return (
      <img
        src={resolved}
        alt={alt}
        className={className}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          ...style,
        }}
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        fontSize: `${size}px`,
        lineHeight: 1,
        ...style,
      }}
    >
      {resolved}
    </span>
  );
};

export default GameIcon;
