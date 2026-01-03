import React, { useState, useEffect } from 'react';
import { NPC, DialogueNode, DialogueResponse } from '../types';
import { getDialogue, NPC_PERSONAS } from '../services/dialogueService';
import { isAIAvailable } from '../services/anthropicClient';
import { useDialogueAnimation } from '../hooks/useDialogueAnimation';
import { Z_DIALOGUE, zClass } from '../zIndex';
import { cookingManager } from '../utils/CookingManager';

interface DialogueBoxProps {
  npc: NPC;
  playerSprite: string; // Current player sprite (idle frame)
  onClose: () => void;
  onNodeChange?: (npcId: string, nodeId: string) => void; // Callback when dialogue node changes
  onSwitchToAIMode?: () => void; // Callback to switch to AI chat mode
}

/**
 * DialogueBox - Shows NPC dialogue with an animated hand-drawn window
 *
 * Layout:
 * - Full screen overlay with gradient background
 * - Player character large on the LEFT (no frame, behind dialogue)
 * - NPC character large on the RIGHT (no frame, behind dialogue)
 * - Animated dialogue window at bottom center
 * - Name in wooden nameplate, text in main area
 *
 * The dialogue frame is 1000x1000 but the actual drawn content is:
 * - Wooden nameplate: ~13% from left, ~35% from top
 * - Grey text area: ~5% from left, ~43% from top, ~90% wide, ~35% tall
 */
const DialogueBox: React.FC<DialogueBoxProps> = ({ npc, playerSprite, onClose, onNodeChange, onSwitchToAIMode }) => {
  // Check if this NPC has AI chat available
  const persona = NPC_PERSONAS[npc.id];
  const canUseAI = isAIAvailable() && persona?.aiEnabled && onSwitchToAIMode;
  const [currentNodeId, setCurrentNodeId] = useState<string>('greeting');
  const [currentDialogue, setCurrentDialogue] = useState<DialogueNode | null>(null);

  // Animate the dialogue window frame
  const { currentFrame } = useDialogueAnimation(150, true);

  // Check if we're on a small screen (for responsive adjustments)
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768 || window.innerHeight < 500);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Get the NPC sprite based on current expression
  // Priority: expression-specific > default dialogueSprite > portraitSprite > sprite
  const getNpcSprite = () => {
    // Check if current dialogue has an expression and NPC has expression sprites
    if (currentDialogue?.expression && npc.dialogueExpressions) {
      const expressionSprite = npc.dialogueExpressions[currentDialogue.expression];
      if (expressionSprite) return expressionSprite;
    }
    // Fall back to default dialogue sprite hierarchy
    return npc.dialogueExpressions?.default || npc.dialogueSprite || npc.portraitSprite || npc.sprite;
  };

  const npcDialogueSprite = getNpcSprite();

  // Filter responses based on cooking conditions
  const filterResponses = (responses: DialogueResponse[] | undefined): DialogueResponse[] => {
    if (!responses) return [];

    return responses.filter(response => {
      // Check if recipe needs to be unlocked
      if (response.requiredRecipeUnlocked) {
        if (!cookingManager.isRecipeUnlocked(response.requiredRecipeUnlocked)) {
          return false;
        }
      }

      // Check if recipe needs to be mastered
      if (response.requiredRecipeMastered) {
        if (!cookingManager.isRecipeMastered(response.requiredRecipeMastered)) {
          return false;
        }
      }

      // Check if should be hidden when recipe is unlocked
      if (response.hiddenIfRecipeUnlocked) {
        if (cookingManager.isRecipeUnlocked(response.hiddenIfRecipeUnlocked)) {
          return false;
        }
      }

      // Check if should be hidden when recipe is mastered
      if (response.hiddenIfRecipeMastered) {
        if (cookingManager.isRecipeMastered(response.hiddenIfRecipeMastered)) {
          return false;
        }
      }

      // Check if domain needs to be mastered
      if (response.requiredDomainMastered) {
        if (!cookingManager.isDomainMastered(response.requiredDomainMastered as any)) {
          return false;
        }
      }

      // Check if domain needs to be started (at least one recipe unlocked)
      if (response.requiredDomainStarted) {
        const domainRecipes = cookingManager.getRecipesByCategory(response.requiredDomainStarted as any);
        const anyUnlocked = domainRecipes.some(r => cookingManager.isRecipeUnlocked(r.id));
        if (!anyUnlocked) {
          return false;
        }
      }

      // Check if should be hidden when domain is started (any recipe unlocked)
      if (response.hiddenIfDomainStarted) {
        const domainRecipes = cookingManager.getRecipesByCategory(response.hiddenIfDomainStarted as any);
        const anyUnlocked = domainRecipes.some(r => cookingManager.isRecipeUnlocked(r.id));
        if (anyUnlocked) {
          return false;
        }
      }

      // Check if should be hidden when domain is mastered
      if (response.hiddenIfDomainMastered) {
        if (cookingManager.isDomainMastered(response.hiddenIfDomainMastered as any)) {
          return false;
        }
      }

      // Check if should be hidden when any domain is started but not mastered
      if (response.hiddenIfAnyDomainStarted) {
        const masteredCount = cookingManager.getMasteredDomainCount();
        const unlockedRecipes = cookingManager.getUnlockedRecipes();
        const hasStartedDomain = unlockedRecipes.some(r =>
          r.category === 'savoury' || r.category === 'dessert' || r.category === 'baking'
        );
        if (hasStartedDomain && masteredCount < 3) {
          return false;
        }
      }

      return true;
    });
  };

  // Load dialogue node with seasonal/time-of-day context
  useEffect(() => {
    const loadDialogue = async () => {
      const dialogue = await getDialogue(npc, currentNodeId);
      setCurrentDialogue(dialogue);

      // Notify parent when dialogue starts (greeting node) for friendship tracking
      if (currentNodeId === 'greeting' && onNodeChange) {
        onNodeChange(npc.id, currentNodeId);
      }
    };
    loadDialogue();
  }, [npc, currentNodeId, onNodeChange]);

  const handleResponse = (nextId?: string) => {
    // Special marker to switch to AI chat mode
    if (nextId === '__AI_CHAT__' && onSwitchToAIMode) {
      onSwitchToAIMode();
      return;
    }

    if (nextId) {
      setCurrentNodeId(nextId);
      // Notify parent about node change (for handling item pickups, etc.)
      if (onNodeChange) {
        onNodeChange(npc.id, nextId);
      }
    } else {
      // No next node, close dialogue
      onClose();
    }
  };

  // Don't render until dialogue is loaded
  if (!currentDialogue) {
    return null;
  }

  return (
    <div className={`fixed inset-0 ${zClass(Z_DIALOGUE)} overflow-hidden pointer-events-none`}>
      {/* Character container - positions characters behind dialogue */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none" style={{ gap: '2%' }}>
        {/* Player character - LEFT side (hidden on small screens) */}
        {!isSmallScreen && (
          <div
            className="relative flex-shrink-0"
            style={{
              width: '38%',
              height: '95%',
              marginBottom: '8%',
            }}
          >
            <img
              src={playerSprite}
              alt="You"
              className="absolute bottom-0 right-0 w-full h-full object-contain object-bottom"
              style={{
                imageRendering: 'auto',
                filter: 'drop-shadow(0 0 40px rgba(100, 200, 255, 0.4))',
                transform: 'scaleX(-1)', // Face towards NPC
              }}
            />
          </div>
        )}

        {/* NPC character - RIGHT side (centered on small screens) */}
        <div
          className="relative flex-shrink-0"
          style={{
            width: isSmallScreen ? '70%' : '38%',
            height: isSmallScreen ? '70%' : '95%',
            marginBottom: isSmallScreen ? '35%' : '8%',
          }}
        >
          <img
            src={npcDialogueSprite}
            alt={npc.name}
            className="absolute bottom-0 w-full h-full object-contain object-bottom"
            style={{
              imageRendering: 'auto',
              filter: 'drop-shadow(0 0 40px rgba(255, 200, 100, 0.4))',
              left: isSmallScreen ? '50%' : '0',
              transform: isSmallScreen ? 'translateX(-50%)' : 'none',
            }}
          />
        </div>
      </div>

      {/* Dialogue window container - bottom of screen */}
      {/* The frame image is 1000x1000, dialogue box is in lower ~50% */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto overflow-hidden"
        style={{
          width: 'min(95vw, 950px)',
          height: 'min(45vh, 320px)',
          bottom: '60px', // Space for response buttons
        }}
      >
        {/* Animated dialogue frame background - show full image, positioned so box is visible */}
        <img
          src={currentFrame}
          alt=""
          className="absolute"
          style={{
            imageRendering: 'auto',
            width: '100%',
            height: 'auto',
            bottom: '-55%', // Position so the dialogue box portion is visible
          }}
        />

        {/* Content overlay - positioned relative to visible dialogue box */}
        <div className="absolute inset-0">
          {/* Name area - positioned over wooden nameplate */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              top: '8%',
              left: '10%',
              width: '30%',
              height: '22%',
            }}
          >
            <span
              style={{
                fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
                fontSize: 'clamp(1.1rem, 3vw, 1.6rem)',
                fontWeight: 'bold',
                color: '#4a3228',
                textShadow: '0 1px 2px rgba(255,255,255,0.5)',
                letterSpacing: '0.05em',
              }}
            >
              {npc.name}
            </span>
          </div>

          {/* Main text area - positioned in grey box with scroll */}
          <div
            className="absolute overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600"
            style={{
              top: '32%',
              left: '6%',
              right: '6%',
              height: '55%',
              padding: '2% 3%',
            }}
          >
            <p
              className="leading-relaxed"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: 'clamp(0.95rem, 2.2vw, 1.2rem)',
                color: '#e8e8e8',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                lineHeight: '1.6',
              }}
            >
              {currentDialogue.text}
            </p>
          </div>
        </div>
      </div>

      {/* Response buttons - at very bottom */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto"
        style={{
          bottom: '12px',
          width: 'min(90vw, 900px)',
        }}
      >
        {(() => {
          const filteredResponses = filterResponses(currentDialogue.responses);
          return filteredResponses.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {filteredResponses.map((response, index) => (
              <button
                key={index}
                onClick={() => handleResponse(response.nextId)}
                className="bg-slate-700 bg-opacity-90 hover:bg-slate-600 active:bg-slate-500 text-gray-100 px-4 py-2 text-sm transition-all rounded-lg border border-slate-500 hover:border-amber-400"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                {response.text}
              </button>
            ))}
            {/* AI Chat option - shown for AI-enabled NPCs */}
            {canUseAI && (
              <button
                onClick={() => handleResponse('__AI_CHAT__')}
                className="bg-amber-700 bg-opacity-80 hover:bg-amber-600 active:bg-amber-500 text-gray-100 px-4 py-2 text-sm transition-all rounded-lg border border-amber-500 hover:border-amber-300"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                Chat freely...
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center gap-4">
            {/* AI Chat option when no other responses */}
            {canUseAI && (
              <button
                onClick={() => handleResponse('__AI_CHAT__')}
                className="bg-amber-700 bg-opacity-80 hover:bg-amber-600 active:bg-amber-500 text-gray-100 px-4 py-2 text-sm transition-all rounded-lg border border-amber-500 hover:border-amber-300"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              >
                Chat freely...
              </button>
            )}
            <button
              onClick={() => onClose()}
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm opacity-80 hover:opacity-100 px-4 py-2"
            >
              <span>Click to continue</span>
              <span className="animate-bounce">▼</span>
            </button>
          </div>
        );
        })()}
      </div>

      {/* Mobile touch area for closing - tap anywhere outside dialogue */}
      <div
        className="absolute inset-0 sm:hidden"
        onClick={() => {
          if (!currentDialogue.responses || currentDialogue.responses.length === 0) {
            onClose();
          }
        }}
        style={{ zIndex: -1 }}
      />

    </div>
  );
};

export default DialogueBox;
