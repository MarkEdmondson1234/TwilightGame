/**
 * DialogueFrame - Animated dialogue frame with character portraits
 *
 * Uses the same frame positioning as the original DialogueBox — the name
 * sits on the wooden nameplate, content fills the grey text area.
 */

import React, { useState, useEffect } from 'react';
import { useDialogueAnimation } from '../../hooks/useDialogueAnimation';
import { useTouchDevice } from '../../hooks/useTouchDevice';
import { useMenuViewport } from '../../hooks/useMenuViewport';
import '../../src/styles/mobileMenus.css';
import FittedName from './FittedName';
import { Z_DIALOGUE, zClass } from '../../zIndex';

interface DialogueFrameProps {
  npcName: string;
  npcSprite: string;
  playerSprite: string;
  nameExtra?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

const LEAVE_FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

const DialogueFrame: React.FC<DialogueFrameProps> = ({
  npcName,
  npcSprite,
  playerSprite,
  nameExtra,
  onClose,
  children,
}) => {
  const isTouchDevice = useTouchDevice();
  const viewport = useMenuViewport();
  const { currentFrame } = useDialogueAnimation(150, true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsSmallScreen(window.innerWidth < 768 || window.innerHeight < 500);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div
      className={`fixed inset-0 ${zClass(Z_DIALOGUE)} overflow-hidden`}
      style={isTouchDevice ? viewport : undefined}
      data-mobile-menu={isTouchDevice ? 'dialogue' : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={`Conversation with ${npcName}`}
      data-game-ui="true"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
    >
      {/* Background gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(30, 30, 50, 0.85) 0%, rgba(20, 20, 35, 0.95) 100%)',
        }}
      />

      {/* Character portraits */}
      <div className="absolute inset-0 flex items-end justify-between pointer-events-none">
        {!isSmallScreen && (
          <div
            className="relative flex-shrink-0"
            style={{ width: '45%', height: '95%', marginBottom: '8%' }}
          >
            <img
              src={playerSprite}
              alt="You"
              className="absolute bottom-0 left-0 w-full h-full object-contain object-bottom"
              style={{
                imageRendering: 'auto',
                filter: 'drop-shadow(0 0 40px rgba(100, 200, 255, 0.4))',
                transform: 'scaleX(-1)',
              }}
            />
          </div>
        )}

        {isSmallScreen && <div className="flex-1" />}

        <div
          className="relative flex-shrink-0"
          style={{
            width: isSmallScreen ? '70%' : '45%',
            height: isSmallScreen ? '70%' : '95%',
            marginBottom: isSmallScreen ? '35%' : '8%',
          }}
        >
          <img
            src={npcSprite}
            alt={npcName}
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

        {isSmallScreen && <div className="flex-1" />}
      </div>

      {/*
       * The painted portion of each 1000x1000 frame occupies y=490..800.
       * Cropping that region lets the artwork follow the responsive panel height.
       */}
      <div
        data-dialogue-panel
        className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto overflow-hidden"
        style={{
          width: isTouchDevice ? undefined : 'min(95vw, 900px)',
          height: isTouchDevice ? undefined : 'min(64dvh, 350px)',
          bottom: isTouchDevice ? undefined : '20px',
        }}
      >
        {/* Crop to the painted region; artwork and labels share one coordinate system. */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 490 1000 310"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <image href={currentFrame} width="1000" height="1000" />
        </svg>

        {/* Content overlay */}
        <div className="absolute inset-0">
          {/* Name — bounded to the painted nameplate in the cropped image */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              top: '8%',
              left: '15%',
              width: '20.5%',
              height: '17%',
              fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
              fontWeight: 'bold',
              color: '#4a3228',
              textShadow: '0 1px 2px rgba(255,255,255,0.5)',
            }}
          >
            <FittedName name={npcName} extra={nameExtra} />
          </div>

          {/* Chat + controls — fills the grey content area, extends to bottom for buttons */}
          <div
            data-dialogue-content
            className="absolute flex flex-col"
            style={{
              top: '30%',
              left: '10%',
              right: '10%',
              bottom: 'calc(9% + 48px)',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {children}
          </div>

          {/* Leave button — always visible, bottom-right under the animated arrow */}
          <button
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            className="absolute text-s transition-colors duration-200"
            style={{
              bottom: '9%',
              minHeight: 44,
              minWidth: 64,
              touchAction: 'manipulation',
              right: '17%',
              fontFamily: LEAVE_FONT,
              color: 'rgba(180, 160, 140, 0.7)',
              background: 'none',
              border: 'none',
              padding: '2px 6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#d4a373')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180, 160, 140, 0.7)')}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogueFrame;
