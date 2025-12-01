/**
 * CutscenePlayer - Fullscreen cutscene playback component
 *
 * Features:
 * - Animated background layers (Ken Burns-style panning/zooming)
 * - Character sprite positioning
 * - Bottom-positioned dialogue
 * - Scene transitions
 * - Dialogue advancement (E key, Enter, click)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CutsceneScene,
  CutsceneBackgroundLayer,
  CutsceneCharacter,
  CutsceneDialogue,
  CutsceneLayerAnimation,
  CutsceneWeatherEffect,
} from '../types';
import { cutsceneManager } from '../utils/CutsceneManager';
import { TimeManager } from '../utils/TimeManager';
import { npcManager } from '../NPCManager';
import { gameState } from '../GameState';
import { getPortraitSprite } from '../utils/portraitSprites';

interface CutscenePlayerProps {
  onComplete: (action: { action: string; mapId?: string; position?: { x: number; y: number } }) => void;
}

const CutscenePlayer: React.FC<CutscenePlayerProps> = ({ onComplete }) => {
  const [currentScene, setCurrentScene] = useState<CutsceneScene | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showDialogue, setShowDialogue] = useState(false);

  // Load current scene from manager
  useEffect(() => {
    const scene = cutsceneManager.getCurrentScene();
    if (scene) {
      setCurrentScene(scene);
      setShowDialogue(false);
      // Show dialogue after a brief delay for scene to settle
      const timer = setTimeout(() => setShowDialogue(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // Subscribe to cutscene manager state changes
  useEffect(() => {
    const unsubscribe = cutsceneManager.subscribe((state) => {
      if (!state.isPlaying) {
        // Cutscene ended
        return;
      }

      const scene = cutsceneManager.getCurrentScene();
      if (scene && scene.id !== currentScene?.id) {
        // Scene changed - trigger transition
        handleSceneTransition(scene);
      }
    });

    return unsubscribe;
  }, [currentScene]);

  // Handle scene transitions
  const handleSceneTransition = (newScene: CutsceneScene) => {
    setIsTransitioning(true);
    setShowDialogue(false);

    const transitionDuration = currentScene?.transitionOut?.duration || 500;

    setTimeout(() => {
      setCurrentScene(newScene);
      setIsTransitioning(false);
      setTimeout(() => setShowDialogue(true), 300);
    }, transitionDuration);
  };

  // Advance to next scene
  const handleAdvance = useCallback((nextSceneIndex?: number) => {
    cutsceneManager.advanceScene(nextSceneIndex);
  }, []);

  // Handle dialogue choice selection
  const handleChoice = useCallback((choiceIndex: number) => {
    if (!currentScene?.dialogue?.choices) return;

    const choice = currentScene.dialogue.choices[choiceIndex];

    if (choice.action === 'end') {
      const result = cutsceneManager.endCutscene();
      if (result) {
        onComplete(result);
      }
      return;
    }

    if (choice.triggerCutscene) {
      // Trigger a different cutscene
      const state = cutsceneManager.getState();
      cutsceneManager.endCutscene();
      cutsceneManager.startCutscene(choice.triggerCutscene, state.savedPosition);
      return;
    }

    // Advance to specified scene or next scene
    handleAdvance(choice.nextSceneIndex);
  }, [currentScene, handleAdvance, onComplete]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Skip cutscene
        const skipped = cutsceneManager.skipCutscene();
        if (skipped) {
          const result = cutsceneManager.endCutscene();
          if (result) {
            onComplete(result);
          }
        }
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        // Advance dialogue/scene
        if (currentScene?.dialogue?.choices) {
          // Don't auto-advance if there are choices
          return;
        }
        handleAdvance();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentScene, handleAdvance, onComplete]);

  // Auto-advance if scene has duration
  useEffect(() => {
    if (!currentScene) return;

    if (currentScene.duration) {
      const timer = setTimeout(() => {
        handleAdvance();
      }, currentScene.duration);

      return () => clearTimeout(timer);
    }

    // Auto-advance for dialogue if configured
    if (currentScene.dialogue?.autoAdvance && !currentScene.dialogue.choices) {
      const timer = setTimeout(() => {
        handleAdvance();
      }, currentScene.dialogue.autoAdvance.delay);

      return () => clearTimeout(timer);
    }
  }, [currentScene, handleAdvance]);

  if (!currentScene) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Background Layers */}
      <div className="absolute inset-0">
        {currentScene.backgroundLayers
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer, index) => (
            <BackgroundLayer
              key={`${currentScene.id}-layer-${index}`}
              layer={layer}
              isTransitioning={isTransitioning}
            />
          ))}
      </div>

      {/* Character Sprites */}
      {currentScene.characters && (
        <div className="absolute inset-0">
          {currentScene.characters.map((character, index) => (
            <CharacterSprite
              key={`${currentScene.id}-char-${index}`}
              character={character}
              isTransitioning={isTransitioning}
            />
          ))}
        </div>
      )}

      {/* Weather Effect Overlay */}
      {currentScene.weatherEffect && (
        <WeatherEffectOverlay
          effect={currentScene.weatherEffect}
          isTransitioning={isTransitioning}
        />
      )}

      {/* Dialogue Box (Bottom) - MUST BE ON TOP */}
      {currentScene.dialogue && showDialogue && !isTransitioning && (
        <DialogueDisplay
          dialogue={currentScene.dialogue}
          onAdvance={() => handleAdvance()}
          onChoice={handleChoice}
        />
      )}

      {/* Skip Hint */}
      <div className="absolute top-4 right-4 text-white text-sm opacity-70 z-50">
        Press ESC to skip
      </div>
    </div>
  );
};

/**
 * Background Layer Component
 * Handles animated backgrounds with Ken Burns effects
 */
interface BackgroundLayerProps {
  layer: CutsceneBackgroundLayer;
  isTransitioning: boolean;
}

const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ layer, isTransitioning }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    // Small delay to ensure CSS transition triggers
    const timer = setTimeout(() => setIsAnimating(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const getPanOffset = (direction: 'left' | 'right' | 'top' | 'bottom' | 'center', zoom: number = 1.0): { x: number; y: number } => {
    // Pan amount scales with zoom (more zoom = more visible pan)
    const panAmount = (zoom - 1.0) * 50; // Pan by 50% of the extra zoom area

    switch (direction) {
      case 'left': return { x: panAmount, y: 0 };
      case 'right': return { x: -panAmount, y: 0 };
      case 'top': return { x: 0, y: panAmount };
      case 'bottom': return { x: 0, y: -panAmount };
      case 'center':
      default: return { x: 0, y: 0 };
    }
  };

  const getTransform = (animating: boolean): string => {
    const animation = layer.animation;
    const baseOffsetX = layer.offsetX || 0;
    const baseOffsetY = layer.offsetY || 0;

    if (!animation || animation.type === 'static') {
      return `translate(${baseOffsetX}%, ${baseOffsetY}%)`;
    }

    if (animation.type === 'zoom') {
      const zoomFrom = animation.zoomFrom || 1.0;
      const zoomTo = animation.zoomTo || 1.2;
      const zoom = animating ? zoomTo : zoomFrom;
      return `translate(${baseOffsetX}%, ${baseOffsetY}%) scale(${zoom})`;
    }

    if (animation.type === 'pan') {
      const panFrom = getPanOffset(animation.panFrom || 'left');
      const panTo = getPanOffset(animation.panTo || 'right');
      const pan = animating ? panTo : panFrom;
      return `translate(${baseOffsetX + pan.x}%, ${baseOffsetY + pan.y}%)`;
    }

    if (animation.type === 'pan-and-zoom') {
      const zoomFrom = animation.zoomFrom || 1.0;
      const zoomTo = animation.zoomTo || 1.2;
      const zoom = animating ? zoomTo : zoomFrom;
      const panFrom = getPanOffset(animation.panFrom || 'left', zoomFrom);
      const panTo = getPanOffset(animation.panTo || 'right', zoomTo);
      const pan = animating ? panTo : panFrom;
      return `translate(${baseOffsetX + pan.x}%, ${baseOffsetY + pan.y}%) scale(${zoom})`;
    }

    return `translate(${baseOffsetX}%, ${baseOffsetY}%)`;
  };

  const getTransition = (): string => {
    if (!layer.animation || layer.animation.type === 'static') {
      return 'opacity 500ms';
    }

    const duration = layer.animation.duration || 5000;
    const easing = layer.animation.easing || 'ease-in-out';
    return `opacity 500ms, transform ${duration}ms ${easing}`;
  };

  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{
        backgroundImage: `url(/TwilightGame/assets-optimized/cutscenes/${layer.image})`,
        zIndex: layer.zIndex,
        opacity: isTransitioning ? 0 : (layer.opacity || 1),
        transform: getTransform(isAnimating),
        transition: getTransition(),
      }}
    />
  );
};

/**
 * Character Sprite Component
 * Positions and animates character sprites in cutscenes
 */
interface CharacterSpriteProps {
  character: CutsceneCharacter;
  isTransitioning: boolean;
}

const CharacterSprite: React.FC<CharacterSpriteProps> = ({ character, isTransitioning }) => {
  const [spriteUrl, setSpriteUrl] = useState<string>('');
  const [isEntering, setIsEntering] = useState(true);

  // Load sprite URL
  useEffect(() => {
    if (character.spriteUrl) {
      setSpriteUrl(character.spriteUrl);
      return;
    }

    // Load from NPC or player
    if (character.characterId === 'player') {
      // Get player's portrait sprite
      const selectedChar = gameState.getSelectedCharacter();
      if (selectedChar) {
        // Use portrait sprite helper (Direction.Down = 1)
        const portraitUrl = getPortraitSprite(selectedChar, 1);
        setSpriteUrl(portraitUrl);
      }
    } else {
      const npc = npcManager.getNPCById(character.characterId);
      if (npc) {
        setSpriteUrl(npc.portraitSprite || npc.sprite);
      }
    }
  }, [character]);

  // Handle entrance animation
  useEffect(() => {
    if (character.entrance?.type === 'none') {
      setIsEntering(false);
      return;
    }

    const duration = character.entrance?.duration || 500;
    const timer = setTimeout(() => setIsEntering(false), duration);
    return () => clearTimeout(timer);
  }, [character]);

  const getEntranceStyle = (): React.CSSProperties => {
    if (!character.entrance || character.entrance.type === 'none' || !isEntering) {
      return {};
    }

    if (character.entrance.type === 'fade') {
      return { opacity: 0 };
    }

    if (character.entrance.type === 'slide') {
      const translateMap: Record<string, string> = {
        left: 'translateX(-100vw)',
        right: 'translateX(100vw)',
        top: 'translateY(-100vh)',
        bottom: 'translateY(100vh)',
      };
      return {
        transform: translateMap[character.entrance.from || 'left'],
      };
    }

    return {};
  };

  return (
    <div
      className="absolute transition-all duration-500"
      style={{
        left: `${character.position.x}%`,
        top: `${character.position.y}%`,
        transform: `translate(-50%, -50%) scale(${character.scale || 1.0}) scaleX(${character.flipHorizontal ? -1 : 1})`,
        opacity: isTransitioning ? 0 : (character.opacity || 1),
        ...getEntranceStyle(),
      }}
    >
      <img
        src={spriteUrl}
        alt={character.characterId}
        className="max-w-none"
        style={{
          imageRendering: 'auto',
          maxHeight: '80vh',
        }}
      />
    </div>
  );
};

/**
 * Dialogue Display Component
 * Shows dialogue at bottom of screen with choices
 */
interface DialogueDisplayProps {
  dialogue: CutsceneDialogue;
  onAdvance: () => void;
  onChoice: (index: number) => void;
}

const DialogueDisplay: React.FC<DialogueDisplayProps> = ({ dialogue, onAdvance, onChoice }) => {
  // Get contextual text based on season/time
  const getText = (): string => {
    const gameTime = TimeManager.getCurrentTime();

    // Check seasonal text
    if (dialogue.seasonalText) {
      const seasonKey = gameTime.season.toLowerCase() as 'spring' | 'summer' | 'autumn' | 'winter';
      if (dialogue.seasonalText[seasonKey]) {
        return dialogue.seasonalText[seasonKey]!;
      }
    }

    // Check time-of-day text
    if (dialogue.timeOfDayText) {
      const timeKey = gameTime.timeOfDay.toLowerCase() as 'day' | 'night';
      if (dialogue.timeOfDayText[timeKey]) {
        return dialogue.timeOfDayText[timeKey]!;
      }
    }

    return dialogue.text;
  };

  const dialogueText = getText();

  return (
    <div className="absolute bottom-0 left-0 right-0 p-6 animate-fade-in z-[100]">
      <div className="max-w-5xl mx-auto bg-gradient-to-b from-slate-900/95 to-black/95 border-t-4 border-amber-600 rounded-t-lg shadow-2xl">
        {/* Speaker Name */}
        {dialogue.speaker && (
          <div className="px-6 pt-4 pb-2">
            <div className="inline-block bg-amber-600 text-slate-900 font-bold px-4 py-1 rounded">
              {dialogue.speaker}
            </div>
          </div>
        )}

        {/* Dialogue Text */}
        <div className="px-6 py-4">
          <p className="text-gray-100 text-lg leading-relaxed font-serif">
            "{dialogueText}"
          </p>
        </div>

        {/* Choices or Continue */}
        <div className="px-6 pb-4">
          {dialogue.choices && dialogue.choices.length > 0 ? (
            <div className="space-y-2 mt-4">
              {dialogue.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => onChoice(index)}
                  className="w-full bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-gray-100 px-4 py-3 text-left transition-all border-l-4 border-transparent hover:border-amber-500 rounded"
                >
                  <span className="text-amber-400 mr-2">▶</span>
                  {choice.text}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center mt-2">
              <button
                onClick={onAdvance}
                className="text-gray-400 hover:text-amber-400 transition-colors text-sm"
              >
                Press E or Enter to continue...
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Weather Effect Overlay Component
 * Renders CSS-based particle effects for cutscenes
 */
interface WeatherEffectOverlayProps {
  effect: CutsceneWeatherEffect;
  isTransitioning: boolean;
}

const WeatherEffectOverlay: React.FC<WeatherEffectOverlayProps> = ({ effect, isTransitioning }) => {
  const getParticleCount = (): number => {
    switch (effect.intensity) {
      case 'light': return 30;
      case 'heavy': return 100;
      case 'medium':
      default: return 60;
    }
  };

  const opacity = isTransitioning ? 0 : (effect.opacity ?? 0.7);
  const particleCount = getParticleCount();

  // Get effect-specific styles
  // Durations are deliberately slow for a gentle, cinematic feel
  const getEffectStyles = () => {
    switch (effect.type) {
      case 'rain':
        return {
          particleClass: 'weather-rain',
          animationDuration: '2.5s', // Slower rain
          particleStyle: {
            width: '2px',
            height: '20px',
            background: 'linear-gradient(to bottom, rgba(174,194,224,0) 0%, rgba(174,194,224,0.8) 100%)',
            borderRadius: '0 0 2px 2px',
          },
        };
      case 'snow':
        return {
          particleClass: 'weather-snow',
          animationDuration: '12s', // Very slow, gentle snowfall
          particleStyle: {
            width: '8px',
            height: '8px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.3) 100%)',
            borderRadius: '50%',
            boxShadow: '0 0 4px rgba(255,255,255,0.5)',
          },
        };
      case 'cherry_blossoms':
        return {
          particleClass: 'weather-petals',
          animationDuration: '15s', // Slow, dreamy petal fall
          particleStyle: {
            width: '12px',
            height: '12px',
            background: 'radial-gradient(ellipse at 30% 30%, rgba(255,192,203,0.9) 0%, rgba(255,182,193,0.7) 50%, rgba(255,105,180,0.4) 100%)',
            borderRadius: '50% 0 50% 50%',
          },
        };
      case 'falling_leaves':
        return {
          particleClass: 'weather-leaves',
          animationDuration: '12s', // Slow, tumbling leaves
          particleStyle: {
            width: '14px',
            height: '10px',
            background: 'linear-gradient(135deg, rgba(210,105,30,0.9) 0%, rgba(139,69,19,0.8) 50%, rgba(184,134,11,0.7) 100%)',
            borderRadius: '50% 0',
          },
        };
      case 'fog':
        return {
          particleClass: 'weather-fog',
          animationDuration: '40s', // Very slow fog drift
          particleStyle: {
            width: '200px',
            height: '100px',
            background: 'radial-gradient(ellipse, rgba(200,200,200,0.3) 0%, rgba(200,200,200,0) 70%)',
            borderRadius: '50%',
          },
        };
      case 'mist':
        return {
          particleClass: 'weather-mist',
          animationDuration: '30s', // Slow mist drift
          particleStyle: {
            width: '150px',
            height: '80px',
            background: 'radial-gradient(ellipse, rgba(220,220,220,0.2) 0%, rgba(220,220,220,0) 70%)',
            borderRadius: '50%',
          },
        };
      case 'fireflies':
        return {
          particleClass: 'weather-fireflies',
          animationDuration: '5s', // Slower, more gentle glow
          particleStyle: {
            width: '6px',
            height: '6px',
            background: 'radial-gradient(circle, rgba(255,255,150,1) 0%, rgba(255,200,50,0.6) 50%, rgba(255,150,0,0) 100%)',
            borderRadius: '50%',
            boxShadow: '0 0 8px rgba(255,255,100,0.8), 0 0 16px rgba(255,200,50,0.4)',
          },
        };
      default:
        return {
          particleClass: '',
          animationDuration: '8s',
          particleStyle: {},
        };
    }
  };

  const { particleClass, animationDuration, particleStyle } = getEffectStyles();

  // Generate particles with random positions and delays
  const particles = Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * parseFloat(animationDuration)}s`,
    animationDuration: `${parseFloat(animationDuration) * (0.8 + Math.random() * 0.4)}s`,
  }));

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
      style={{ opacity, transition: 'opacity 500ms' }}
    >
      <style>{`
        @keyframes weather-fall {
          0% { transform: translateY(-20px) translateX(0); }
          100% { transform: translateY(110vh) translateX(10px); }
        }
        @keyframes weather-fall-snow {
          0% { transform: translateY(-20px) translateX(0) rotate(0deg); }
          25% { transform: translateY(27vh) translateX(8px) rotate(45deg); }
          50% { transform: translateY(55vh) translateX(-8px) rotate(90deg); }
          75% { transform: translateY(82vh) translateX(6px) rotate(135deg); }
          100% { transform: translateY(110vh) translateX(0) rotate(180deg); }
        }
        @keyframes weather-fall-petal {
          0% { transform: translateY(-20px) translateX(0) rotate(0deg); }
          20% { transform: translateY(22vh) translateX(-15px) rotate(72deg); }
          40% { transform: translateY(44vh) translateX(12px) rotate(144deg); }
          60% { transform: translateY(66vh) translateX(-10px) rotate(216deg); }
          80% { transform: translateY(88vh) translateX(8px) rotate(288deg); }
          100% { transform: translateY(110vh) translateX(0) rotate(360deg); }
        }
        @keyframes weather-fall-leaf {
          0% { transform: translateY(-20px) translateX(0) rotate(0deg) scaleX(1); }
          20% { transform: translateY(22vh) translateX(-20px) rotate(36deg) scaleX(0.8); }
          40% { transform: translateY(44vh) translateX(15px) rotate(72deg) scaleX(-0.9); }
          60% { transform: translateY(66vh) translateX(-12px) rotate(108deg) scaleX(0.85); }
          80% { transform: translateY(88vh) translateX(10px) rotate(144deg) scaleX(-0.95); }
          100% { transform: translateY(110vh) translateX(0) rotate(180deg) scaleX(1); }
        }
        @keyframes weather-drift {
          0% { transform: translateX(-100px) translateY(0); }
          50% { transform: translateX(50vw) translateY(10px); }
          100% { transform: translateX(calc(100vw + 200px)) translateY(0); }
        }
        @keyframes weather-glow {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .weather-rain { animation: weather-fall linear infinite; }
        .weather-snow { animation: weather-fall-snow ease-in-out infinite; }
        .weather-petals { animation: weather-fall-petal ease-in-out infinite; }
        .weather-leaves { animation: weather-fall-leaf ease-in-out infinite; }
        .weather-fog, .weather-mist { animation: weather-drift ease-in-out infinite; }
        .weather-fireflies { animation: weather-glow ease-in-out infinite; }
      `}</style>
      {particles.map((particle) => (
        <div
          key={particle.id}
          className={`absolute ${particleClass}`}
          style={{
            ...particleStyle,
            left: particle.left,
            top: effect.type === 'fog' || effect.type === 'mist' || effect.type === 'fireflies'
              ? `${Math.random() * 80}%`
              : '-20px',
            animationDelay: particle.animationDelay,
            animationDuration: particle.animationDuration,
          }}
        />
      ))}
    </div>
  );
};

export default CutscenePlayer;
