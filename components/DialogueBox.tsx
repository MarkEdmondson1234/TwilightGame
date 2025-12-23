import React, { useState, useEffect } from 'react';
import { NPC, DialogueNode } from '../types';
import { getDialogue } from '../services/dialogueService';
import { useDialogueAnimation } from '../hooks/useDialogueAnimation';

interface DialogueBoxProps {
  npc: NPC;
  playerSprite: string; // Current player sprite (idle frame)
  onClose: () => void;
  onNodeChange?: (npcId: string, nodeId: string) => void; // Callback when dialogue node changes
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
const DialogueBox: React.FC<DialogueBoxProps> = ({ npc, playerSprite, onClose, onNodeChange }) => {
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
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Background gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(30, 30, 50, 0.85) 0%, rgba(20, 20, 35, 0.95) 100%)',
        }}
      />

      {/* Character container - positions characters behind dialogue */}
      <div className="absolute inset-0 flex items-end justify-between pointer-events-none">
        {/* Player character - LEFT side (hidden on small screens) */}
        {!isSmallScreen && (
          <div
            className="relative flex-shrink-0"
            style={{
              width: '38%',
              height: '85%',
              marginBottom: '8%',
            }}
          >
            <img
              src={playerSprite}
              alt="You"
              className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom"
              style={{
                imageRendering: 'auto',
                filter: 'drop-shadow(0 0 40px rgba(100, 200, 255, 0.4))',
                transform: 'scaleX(-1)', // Face towards NPC
              }}
            />
          </div>
        )}

        {/* Spacer when player hidden */}
        {isSmallScreen && <div className="flex-1" />}

        {/* NPC character - RIGHT side (centered on small screens) */}
        <div
          className="relative flex-shrink-0"
          style={{
            width: isSmallScreen ? '60%' : '38%',
            height: isSmallScreen ? '60%' : '85%',
            marginBottom: isSmallScreen ? '30%' : '8%',
          }}
        >
          <img
            src={npcDialogueSprite}
            alt={npc.name}
            className="absolute bottom-0 w-full h-full object-contain object-bottom"
            style={{
              imageRendering: 'auto',
              filter: 'drop-shadow(0 0 40px rgba(255, 200, 100, 0.4))',
              right: isSmallScreen ? 'auto' : '0',
              left: isSmallScreen ? '50%' : 'auto',
              transform: isSmallScreen ? 'translateX(-50%)' : 'none',
            }}
          />
        </div>

        {/* Spacer when player hidden */}
        {isSmallScreen && <div className="flex-1" />}
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
        {currentDialogue.responses && currentDialogue.responses.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-center">
            {currentDialogue.responses.map((response, index) => (
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
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={() => onClose()}
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 text-sm opacity-80 hover:opacity-100 px-4 py-2"
            >
              <span>Press E to continue</span>
              <span className="animate-bounce">▼</span>
            </button>
          </div>
        )}
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

      {/* Help text - desktop only */}
      <div className="hidden sm:block absolute bottom-0 left-1/2 transform -translate-x-1/2 text-gray-500 text-xs pb-1">
        Press ESC or E to close
      </div>
    </div>
  );
};

export default DialogueBox;
