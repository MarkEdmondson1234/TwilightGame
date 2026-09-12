import React, { useRef } from 'react';
import { getEmoteImage } from '../multiplayer/emotes';
import { getEmoteMotion, prefersReducedEmoteMotion } from '../multiplayer/emoteMotion';

/** The overlay supplies its existing frame clock; no extra animation loop is needed. */
export function AnimatedEmoteImage({ id, now }: { id: string; now: number }) {
  const startedAt = useRef(now);
  const src = getEmoteImage(id);
  if (!src) return null;
  const motion = getEmoteMotion(id, now - startedAt.current, prefersReducedEmoteMotion());
  return (
    <img
      src={src}
      alt="Emote"
      className="w-12 h-12 object-contain"
      style={{
        transformOrigin: '50% 100%',
        transform: `translate(${motion.x}px, ${motion.y}px) rotate(${motion.rotation}rad)`,
      }}
    />
  );
}
