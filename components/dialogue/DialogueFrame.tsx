/**
 * DialogueFrame - Animated dialogue frame with character portraits
 *
 * Uses the same frame positioning as the original DialogueBox — the name
 * sits on the wooden nameplate, content fills the grey text area.
 */

import React, { useState, useEffect } from 'react';
import { useDialogueAnimation } from '../../hooks/useDialogueAnimation';
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
    <div className={`fixed inset-0 ${zClass(Z_DIALOGUE)} overflow-hidden`}>
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
       * Dialogue window — uses EXACT original DialogueBox positioning.
       * The frame image is 1000x1000. With these values the wooden nameplate
       * appears at the top of the visible area, content fills the grey box.
       */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 pointer-events-auto overflow-hidden"
        style={{
          width: 'min(95vw, 900px)',
          height: 'min(48vh, 350px)',
          bottom: '20px',
        }}
      >
        {/* Frame image — original positioning that aligns nameplate correctly */}
        <img
          src={currentFrame}
          alt=""
          className="absolute"
          style={{ imageRendering: 'auto', width: '100%', height: 'auto', bottom: '-45%' }}
        />

        {/* Content overlay */}
        <div className="absolute inset-0">
          {/* Name — positioned over the wooden nameplate (original values) */}
          <div
            className="absolute flex items-center justify-center"
            style={{ top: '17%', left: '9%', width: '32%', height: '20%' }}
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
              {npcName}
            </span>
            {nameExtra}
          </div>

          {/* Chat + controls — fills the grey content area, extends to bottom for buttons */}
          <div
            className="absolute flex flex-col"
            style={{ top: '35%', left: '10%', right: '10%', bottom: '6%' }}
          >
            {children}
          </div>

          {/* Leave button — always visible, bottom-right under the animated arrow */}
          <button
            onClick={onClose}
            className="absolute text-s transition-colors duration-200"
            style={{
              bottom: '4%',
              right: '10%',
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
