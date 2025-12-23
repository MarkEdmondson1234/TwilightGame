import { useState, useEffect, useCallback } from 'react';
import { dialogueFrames } from '../assets';

/**
 * useDialogueAnimation - Cycles through dialogue window animation frames
 * Creates a subtle animation effect for the dialogue box
 *
 * @param frameSpeed - Milliseconds between frames (default: 150ms)
 * @param isPlaying - Whether to animate (default: true)
 * @returns Current frame URL and frame index
 */
export function useDialogueAnimation(frameSpeed: number = 150, isPlaying: boolean = true) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % dialogueFrames.length);
    }, frameSpeed);

    return () => clearInterval(interval);
  }, [frameSpeed, isPlaying]);

  // Get current frame URL
  const currentFrame = dialogueFrames[frameIndex];

  // Reset to first frame
  const reset = useCallback(() => {
    setFrameIndex(0);
  }, []);

  return {
    currentFrame,
    frameIndex,
    totalFrames: dialogueFrames.length,
    reset,
  };
}
