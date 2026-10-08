/**
 * Title shown on the splash screen: the name of the map the player will
 * resume in, so a returning player sees "Mushroom Forest" rather than always
 * "Clover Village".
 *
 * Pure so it can be tested without loading the map registry — the caller
 * passes a name lookup (MapManager in App.tsx).
 */

/** The village is the game's home, and the title a brand-new player sees. */
export const SPLASH_HOME_TITLE = 'Clover Village';

/**
 * Procedural maps (`<kind>_<seed>`) are regenerated during asset loading,
 * after the splash is already on screen, so their definitions — and names —
 * do not exist yet when it first renders. Named by kind instead. "Mines"
 * rather than the generator's "Cave" follows the game's own wording
 * ("Back to the Mines").
 */
const PROCEDURAL_TITLES: Record<string, string> = {
  forest: 'Forest',
  cave: 'Mines',
  lava: 'Lava Mines',
  shop: 'Magic Shop',
};

const PROCEDURAL_ID = /^(forest|cave|lava|shop)_\d+$/;

export function getSplashLocationName(
  mapId: string | null | undefined,
  lookupMapName: (mapId: string) => string | undefined
): string {
  if (!mapId || mapId === 'village') return SPLASH_HOME_TITLE;

  const procedural = PROCEDURAL_ID.exec(mapId);
  if (procedural) return PROCEDURAL_TITLES[procedural[1]];

  return lookupMapName(mapId) ?? SPLASH_HOME_TITLE;
}
