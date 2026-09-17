/**
 * Character Outfit Registry
 *
 * Single source of truth for costumes ("outfits") a character can wear.
 * A costume is a full replacement sprite set — a directory of frames under
 * `public/assets/{characterId}/outfits/{outfitId}/` — not a layered garment,
 * so the whole character swaps when the outfit changes.
 *
 * Adding a costume is deliberately small:
 *   1. Draw the frames into `public/assets/{characterId}/outfits/<id>/`
 *      named `{up,down,left,right}_{frame}.png` (+ optional `icon.png`
 *      for the character-creator chip).
 *   2. Add one entry to OUTFITS below.
 *   3. Add the id to the `o` validation in `database.rules.json` —
 *      `tests/characterOutfits.test.ts` fails if the two lists drift.
 *   4. Run `npm run optimize-assets`.
 *
 * Nothing else needs touching: sprite paths, the preloader, texture pinning,
 * portraits, the wire and remote players all derive from this registry.
 */

export const DEFAULT_OUTFIT = 'everyday';

export interface CharacterOutfit {
  /** Stable id — persisted in saves and published over the wire as `o`. */
  id: string;
  /** Creator chip label (British English). */
  label: string;
  /** Small art shown on the creator chip (e.g. the dress on its hanger). */
  iconUrl?: string;
  /**
   * Per-direction frame-count override. A costume may ship fewer frames than
   * the base art (the walk cycle ping-pongs through whatever it is given).
   * Directions not listed fall back to the character's own counts.
   */
  frameCounts?: Record<string, number>;
}

/**
 * Costumes per characterId, in creator display order.
 * Characters absent from this map simply have no outfit picker.
 */
const OUTFITS: Record<string, readonly CharacterOutfit[]> = {
  character2: [
    {
      id: 'polka_dress',
      label: 'Polka-Dot Dress',
      // The same hanger art the inventory item uses — buying it at Mushra's
      // shop is what unlocks this chip (see data/items/clothing.ts).
      iconUrl: '/TwilightGame/assets-optimized/items/clothing/polka_dress.png',
      // The dress art ships front and back views only (2 frames each); the
      // left/right files are copies of the front frames until side-view art
      // arrives — see design_docs/planned/ART_INTEGRATION_BACKLOG.md §3.
      frameCounts: { up: 2, down: 2, left: 2, right: 2 },
    },
  ],
};

/** All costumes for a character (empty when it has none). */
export function getOutfits(characterId: string): readonly CharacterOutfit[] {
  return OUTFITS[characterId] ?? [];
}

/** The costume entry for an id, or null for everyday/unknown. */
export function getOutfit(
  characterId: string,
  outfitId: string | null | undefined
): CharacterOutfit | null {
  if (!outfitId || outfitId === DEFAULT_OUTFIT) return null;
  return getOutfits(characterId).find((outfit) => outfit.id === outfitId) ?? null;
}

/**
 * Resolve an outfit id to something safe to build a path from.
 *
 * Saved data and remote players can carry anything — an unknown id, a costume
 * that belongs to a different character, or nothing at all. Everything funnels
 * through here, so a bad id degrades to the base art instead of 404ing.
 */
export function resolveOutfit(
  characterId: string,
  outfit: string | null | undefined
): string {
  return getOutfit(characterId, outfit) ? outfit : DEFAULT_OUTFIT;
}

/**
 * Is `outfitId` a costume id at all (for any character)?
 *
 * This is the transport-level check used by the multiplayer wire and mirrored
 * in database.rules.json — it deliberately does NOT check which character the
 * costume belongs to; rendering resolves the pairing via resolveOutfit().
 */
export function isValidOutfitId(outfitId: string): boolean {
  return Object.values(OUTFITS).some((outfits) =>
    outfits.some((outfit) => outfit.id === outfitId)
  );
}

/** Every costume id in the registry — feeds the rules-in-step test. */
export function allOutfitIds(): string[] {
  return Object.values(OUTFITS)
    .flat()
    .map((outfit) => outfit.id);
}

/**
 * Directory (relative to /assets or /assets-optimized) holding a character's
 * sprite frames: the base set, or the named costume's set.
 */
export function getSpriteDir(characterId: string, outfit: string): string {
  return outfit === DEFAULT_OUTFIT
    ? `${characterId}/base`
    : `${characterId}/outfits/${outfit}`;
}