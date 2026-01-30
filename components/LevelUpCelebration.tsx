/**
 * LevelUpCelebration - Visual celebration when player advances to a new magic level
 *
 * Displays a magical overlay with:
 * - Starry particle effects radiating outward
 * - Congratulatory text with the new level name
 * - Auto-dismisses after a few seconds or on click
 *
 * Follows existing patterns from MagicBurstEffect and Modal.
 */

import React, { useEffect, useMemo, useCallback } from 'react';
import { PotionLevel } from '../data/potionRecipes';
import { Z_MODAL, zClass } from '../zIndex';

interface LevelUpCelebrationProps {
  /** The new level the player has achieved */
  newLevel: PotionLevel;
  /** Callback when celebration is dismissed */
  onDismiss: () => void;
  /** Duration in ms before auto-dismiss (default 5000) */
  duration?: number;
}

/** Level display configuration */
const LEVEL_CONFIG: Record<PotionLevel, { title: string; emoji: string; colour: string; secondaryColour: string }> = {
  novice: {
    title: 'Novice Witch',
    emoji: '🧪',
    colour: '#8B5CF6', // Purple
    secondaryColour: '#C4B5FD',
  },
  journeyman: {
    title: 'Journeyman Witch',
    emoji: '✨',
    colour: '#3B82F6', // Blue
    secondaryColour: '#93C5FD',
  },
  master: {
    title: 'Master Witch',
    emoji: '🌟',
    colour: '#F59E0B', // Gold
    secondaryColour: '#FCD34D',
  },
};

const LevelUpCelebration: React.FC<LevelUpCelebrationProps> = ({
  newLevel,
  onDismiss,
  duration = 5000,
}) => {
  const config = LEVEL_CONFIG[newLevel];
  const numStars = 24;
  const numSparkles = 16;

  // Generate unique animation ID
  const animId = useMemo(
    () => `levelup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  // Generate star particles
  const stars = useMemo(() => {
    return Array.from({ length: numStars }, (_, i) => {
      const angle = (i / numStars) * Math.PI * 2;
      const distance = 150 + Math.random() * 100;
      const delay = (i / numStars) * 400;
      const size = 8 + Math.random() * 8;

      return {
        angle,
        delay,
        endX: Math.cos(angle) * distance,
        endY: Math.sin(angle) * distance,
        size,
        rotation: Math.random() * 360,
      };
    });
  }, [numStars]);

  // Generate sparkle particles (smaller, faster)
  const sparkles = useMemo(() => {
    return Array.from({ length: numSparkles }, (_, i) => {
      const angle = (i / numSparkles) * Math.PI * 2 + Math.PI / numSparkles;
      const distance = 80 + Math.random() * 60;
      const delay = 200 + (i / numSparkles) * 300;

      return {
        angle,
        delay,
        endX: Math.cos(angle) * distance,
        endY: Math.sin(angle) * distance,
        size: 4 + Math.random() * 4,
      };
    });
  }, [numSparkles]);

  // Auto-dismiss after duration
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  // Handle click to dismiss
  const handleClick = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center ${zClass(Z_MODAL + 10)} cursor-pointer`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-label="Dismiss celebration"
    >
      {/* Semi-transparent backdrop with radial gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at center, ${config.colour}40 0%, rgba(0,0,0,0.85) 70%)`,
          animation: `${animId}-backdrop 1s ease-out forwards`,
        }}
      />

      {/* Central glow */}
      <div
        className="absolute"
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${config.colour}60 0%, ${config.colour}30 40%, transparent 70%)`,
          animation: `${animId}-glow 2s ease-in-out infinite`,
        }}
      />

      {/* Star particles */}
      {stars.map((star, i) => (
        <div
          key={`star-${i}`}
          className="absolute"
          style={{
            width: star.size,
            height: star.size,
            opacity: 0,
            animation: `${animId}-star-${i} 1.5s ease-out forwards`,
            animationDelay: `${star.delay}ms`,
          }}
        >
          <svg viewBox="0 0 24 24" fill={i % 2 === 0 ? config.colour : config.secondaryColour}>
            <path d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" />
          </svg>
        </div>
      ))}

      {/* Sparkle particles */}
      {sparkles.map((sparkle, i) => (
        <div
          key={`sparkle-${i}`}
          className="absolute rounded-full"
          style={{
            width: sparkle.size,
            height: sparkle.size,
            backgroundColor: i % 2 === 0 ? config.secondaryColour : '#FFFFFF',
            boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.size / 2}px ${config.secondaryColour}`,
            opacity: 0,
            animation: `${animId}-sparkle-${i} 1.2s ease-out forwards`,
            animationDelay: `${sparkle.delay}ms`,
          }}
        />
      ))}

      {/* Text content */}
      <div
        className="relative text-center"
        style={{
          animation: `${animId}-text 0.8s ease-out forwards`,
          animationDelay: '300ms',
          opacity: 0,
        }}
      >
        {/* Level up banner */}
        <div
          className="text-2xl font-bold mb-2 tracking-widest"
          style={{
            color: config.secondaryColour,
            textShadow: `0 0 20px ${config.colour}, 0 0 40px ${config.colour}`,
            fontFamily: '"Georgia", "Times New Roman", serif',
          }}
        >
          LEVEL UP!
        </div>

        {/* Emoji */}
        <div className="text-6xl my-4" style={{ animation: `${animId}-bounce 1s ease-in-out infinite` }}>
          {config.emoji}
        </div>

        {/* New level title */}
        <div
          className="text-3xl font-bold"
          style={{
            color: '#FFFFFF',
            textShadow: `0 0 10px ${config.colour}, 0 0 20px ${config.colour}`,
            fontFamily: '"Georgia", "Times New Roman", serif',
          }}
        >
          You are now a
        </div>
        <div
          className="text-4xl font-bold mt-2"
          style={{
            color: config.colour,
            textShadow: `0 0 20px ${config.secondaryColour}`,
            fontFamily: '"Georgia", "Times New Roman", serif',
          }}
        >
          {config.title}!
        </div>

        {/* Subtitle */}
        <div
          className="text-sm mt-4 italic"
          style={{
            color: config.secondaryColour,
            opacity: 0.8,
          }}
        >
          New recipes have been unlocked in your magic book
        </div>

        {/* Click to dismiss hint */}
        <div
          className="text-xs mt-6"
          style={{
            color: 'rgba(255,255,255,0.5)',
            animation: `${animId}-pulse 1.5s ease-in-out infinite`,
          }}
        >
          Click anywhere to continue
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes ${animId}-backdrop {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes ${animId}-glow {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        @keyframes ${animId}-text {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes ${animId}-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes ${animId}-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }

        ${stars
          .map(
            (star, i) => `
          @keyframes ${animId}-star-${i} {
            0% {
              transform: translate(0, 0) rotate(0deg) scale(0);
              opacity: 0;
            }
            20% {
              opacity: 1;
              transform: translate(${star.endX * 0.3}px, ${star.endY * 0.3}px) rotate(${star.rotation * 0.3}deg) scale(1.2);
            }
            100% {
              transform: translate(${star.endX}px, ${star.endY}px) rotate(${star.rotation}deg) scale(0.5);
              opacity: 0;
            }
          }
        `
          )
          .join('\n')}

        ${sparkles
          .map(
            (sparkle, i) => `
          @keyframes ${animId}-sparkle-${i} {
            0% {
              transform: translate(0, 0) scale(0);
              opacity: 0;
            }
            30% {
              opacity: 1;
              transform: translate(${sparkle.endX * 0.4}px, ${sparkle.endY * 0.4}px) scale(1);
            }
            100% {
              transform: translate(${sparkle.endX}px, ${sparkle.endY}px) scale(0);
              opacity: 0;
            }
          }
        `
          )
          .join('\n')}
      `}</style>
    </div>
  );
};

export default LevelUpCelebration;
