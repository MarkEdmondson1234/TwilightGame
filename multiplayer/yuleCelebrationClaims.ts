/**
 * Yule celebration gift claims — pure encoding, no Firebase imports.
 *
 * Each of the 7 celebration NPCs may be gifted once per year, by whichever
 * player gets there first — the reward is exclusive across all players, not
 * per player. Once an NPC's wish thought-bubble disappears there is no
 * remaining visible trace of "was this NPC already gifted", unlike Harvest
 * Feast's food (which stays visible as shared PlacedItems until eaten), so
 * this is the one small, additive, never-deleted record that survives that:
 * which NPC celebrationIds have been gifted this year, so a late-arriving
 * player computes the same "already claimed" answer everyone else sees.
 * Transport is firebase/yuleCelebrationService.ts.
 */

/** One year's claims as stored at `shared/world/yuleCelebration/{year}`. */
export interface YuleCelebrationClaimsWire {
  /** NPC celebrationIds gifted by any player this year. */
  g: string[];
}

/** Exactly the 7 celebration NPCs — see data/yuleCelebration.ts's YULE_NPC_CONFIGS. */
const MAX_CLAIMS = 7;

/**
 * Validate an inbound record. The security rules enforce this shape too, but
 * rules can lag a deploy and a malformed record must degrade to "ignore it"
 * rather than to a crash mid-render.
 */
export function decodeClaims(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.g)) return [];
  return d.g.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, MAX_CLAIMS);
}
