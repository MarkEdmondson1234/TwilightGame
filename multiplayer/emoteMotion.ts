/** Small pixel offsets shared by the Pixi and DOM emote renderers. */
export function getEmoteMotion(id: string | null, elapsedMs: number, reducedMotion = false) {
  const still = { x: 0, y: 0, rotation: 0 };
  if (reducedMotion || !id) return still;
  const time = Math.max(0, elapsedMs);
  const phase = (period: number) => (time / period) * Math.PI * 2;
  switch (id) {
    case 'wave': {
      const sway = Math.sin(phase(900));
      return { x: 5 * sway, y: 0, rotation: 0.1 * sway };
    }
    case 'laugh':
      return { x: 0, y: -7 * Math.abs(Math.sin(phase(700))), rotation: 0 };
    case 'heart':
      return { x: 0, y: -3 * (1 - Math.cos(phase(1400))), rotation: 0.035 * Math.sin(phase(1400)) };
    case 'question':
      return { x: 2 * Math.sin(phase(1200)), y: 0, rotation: 0.12 * Math.sin(phase(1200)) };
    case 'yes':
      return { x: 0, y: 2.5 * (1 - Math.cos(phase(650))), rotation: 0 };
    case 'sad':
      return { x: 2 * Math.sin(phase(1800)), y: 0, rotation: 0.045 * Math.sin(phase(1800)) };
    case 'dance': {
      const sway = Math.sin(phase(800));
      return { x: 6 * sway, y: -8 * Math.abs(sway), rotation: 0.12 * sway };
    }
    case 'followme': {
      const sway = Math.sin(phase(1000));
      return { x: 7 * sway, y: -2 * Math.abs(sway), rotation: 0.08 * sway };
    }
    default:
      // Item emotes and unknown ids remain still.
      return still;
  }
}

let motionPreference: MediaQueryList | undefined;
/** The live matches value reflects setting changes without per-sprite listeners. */
export function prefersReducedEmoteMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  motionPreference ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return motionPreference.matches;
}
