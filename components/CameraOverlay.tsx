import React, { useState, useCallback, useEffect } from 'react';
import { CAMERA } from '../constants';
import { Z_CAMERA_OVERLAY, zStyle } from '../zIndex';

interface CameraOverlayProps {
  /** Whether to show the overlay (camera equipped + inventory closed) */
  isOpen: boolean;
  /** Called after the shutter animation completes */
  onTakePhoto: () => void;
  /** Number of photos currently in inventory */
  photoCount: number;
}

/**
 * Camera viewfinder overlay.
 *
 * Renders film-camera corner brackets over the game world and a "Take Photo"
 * button. Handles the shutter flash animation and bracket blink locally;
 * the capture itself is delegated to the onTakePhoto callback.
 */
const CameraOverlay: React.FC<CameraOverlayProps> = ({ isOpen, onTakePhoto, photoCount }) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [bracketsHidden, setBracketsHidden] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Reset animation state when overlay opens
  useEffect(() => {
    if (isOpen) {
      setIsFlashing(false);
      setBracketsHidden(false);
      setIsCapturing(false);
    }
  }, [isOpen]);

  const exposuresLeft = CAMERA.MAX_EXPOSURES - photoCount;
  const isRollFull = photoCount >= CAMERA.MAX_EXPOSURES;

  const handlePress = useCallback(() => {
    if (isCapturing || isRollFull) return;

    setIsCapturing(true);

    // 1. Flash in
    setIsFlashing(true);
    // 2. Blink brackets off
    setBracketsHidden(true);

    // 3. Flash out after FLASH_IN_MS
    const flashOutTimer = window.setTimeout(() => {
      setIsFlashing(false);
    }, CAMERA.FLASH_IN_MS + CAMERA.FLASH_OUT_MS);

    // 4. Restore brackets after blink gap
    const bracketTimer = window.setTimeout(() => {
      setBracketsHidden(false);
    }, CAMERA.FLASH_IN_MS + CAMERA.BRACKET_BLINK_MS);

    // 5. Trigger capture after flash-in completes (so the flash is captured too)
    const captureTimer = window.setTimeout(() => {
      onTakePhoto();
      setIsCapturing(false);
    }, CAMERA.FLASH_IN_MS);

    return () => {
      clearTimeout(flashOutTimer);
      clearTimeout(bracketTimer);
      clearTimeout(captureTimer);
    };
  }, [isCapturing, isRollFull, onTakePhoto]);

  if (!isOpen) return null;

  const cornerSize = 28; // px
  const cornerThickness = 3; // px
  const cornerLength = 28; // px — length of each bracket arm

  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
  };

  return (
    <div
      className="fixed inset-0 pointer-events-none select-none"
      style={zStyle(Z_CAMERA_OVERLAY)}
      id="game-viewport-camera-overlay"
    >
      {/* Shutter flash */}
      <div
        className="absolute inset-0 bg-white pointer-events-none"
        style={{
          opacity: isFlashing ? 0.85 : 0,
          transition: isFlashing
            ? `opacity ${CAMERA.FLASH_IN_MS}ms ease-in`
            : `opacity ${CAMERA.FLASH_OUT_MS}ms ease-out`,
        }}
      />

      {/* Viewfinder corner brackets — centred box inset 20% from each edge */}
      {!bracketsHidden && (
        <>
          {/* Top-left */}
          <div style={{ ...cornerStyle, top: '20%', left: '20%' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: cornerLength, height: cornerThickness, background: 'white' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: cornerThickness, height: cornerLength, background: 'white' }} />
          </div>

          {/* Top-right */}
          <div style={{ ...cornerStyle, top: '20%', right: '20%' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: cornerLength, height: cornerThickness, background: 'white' }} />
            <div style={{ position: 'absolute', top: 0, right: 0, width: cornerThickness, height: cornerLength, background: 'white' }} />
          </div>

          {/* Bottom-left */}
          <div style={{ ...cornerStyle, bottom: '30%', left: '20%' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: cornerLength, height: cornerThickness, background: 'white' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: cornerThickness, height: cornerLength, background: 'white' }} />
          </div>

          {/* Bottom-right */}
          <div style={{ ...cornerStyle, bottom: '30%', right: '20%' }}>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: cornerLength, height: cornerThickness, background: 'white' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: cornerThickness, height: cornerLength, background: 'white' }} />
          </div>
        </>
      )}

      {/* Exposure counter */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2 text-white text-xs font-mono tracking-widest"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
      >
        {photoCount}/{CAMERA.MAX_EXPOSURES}
      </div>

      {/* Take Photo button — sits above the QuickSlotBar (bottom ~100px) */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-1"
        style={{ bottom: '100px' }}>
        <button
          onClick={handlePress}
          onTouchStart={(e) => {
            e.preventDefault();
            handlePress();
          }}
          disabled={isRollFull || isCapturing}
          className={`
            px-6 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2
            ${
              isRollFull
                ? 'bg-gray-500/60 text-gray-300 cursor-not-allowed'
                : 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white border-2 border-white/70 cursor-pointer'
            }
          `}
          style={{ backdropFilter: 'blur(4px)', minHeight: '48px' }}
        >
          📷 {isRollFull ? 'Roll Full' : 'Take Photo'}
        </button>
        {!isRollFull && (
          <span className="text-white/70 text-xs"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            {exposuresLeft} exposure{exposuresLeft !== 1 ? 's' : ''} remaining
          </span>
        )}
        {isRollFull && (
          <span className="text-white/80 text-xs text-center max-w-[180px] leading-tight"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
            Send photos to album to free up space
          </span>
        )}
      </div>
    </div>
  );
};

export default CameraOverlay;
