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

      {/* Dialogue Box (Bottom) */}
      {currentScene.dialogue && showDialogue && !isTransitioning && (
        <DialogueDisplay
          dialogue={currentScene.dialogue}
          onAdvance={() => handleAdvance()}
          onChoice={handleChoice}
        />
      )}

      {/* Skip Hint */}
      <div className="absolute top-4 right-4 text-white text-sm opacity-70">
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
  const getTransform = (animation?: CutsceneLayerAnimation): string => {
    if (!animation || animation.type === 'static') {
      return `translate(${layer.offsetX || 0}%, ${layer.offsetY || 0}%)`;
    }

    // Start with base offset
    let transform = `translate(${layer.offsetX || 0}%, ${layer.offsetY || 0}%)`;

    // For simple animations, we'll use CSS transitions
    // More complex animations would need @keyframes in a stylesheet
    if (animation.type === 'zoom') {
      const zoom = animation.zoomTo || 1.2;
      transform += ` scale(${zoom})`;
    }

    return transform;
  };

  const getTransition = (animation?: CutsceneLayerAnimation): string => {
    if (!animation || animation.type === 'static') {
      return 'opacity 500ms';
    }

    const duration = animation.duration || 5000;
    const easing = animation.easing || 'ease-in-out';
    return `opacity 500ms, transform ${duration}ms ${easing}`;
  };

  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{
        backgroundImage: `url(/assets/cutscenes/${layer.image})`,
        zIndex: layer.zIndex,
        opacity: isTransitioning ? 0 : (layer.opacity || 1),
        transform: getTransform(layer.animation),
        transition: getTransition(layer.animation),
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
    <div className="absolute bottom-0 left-0 right-0 p-6 animate-fade-in">
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

export default CutscenePlayer;
