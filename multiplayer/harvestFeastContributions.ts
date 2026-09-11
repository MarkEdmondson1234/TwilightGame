/**
 * Harvest Feast community contributions — pure encoding, no Firebase imports.
 *
 * Individual food items placed on the feast table are ordinary shared
 * PlacedItems and disappear as villagers "eat" them over the course of the
 * event — so by the time the last dish is gone, no client can derive the
 * cumulative history of what was contributed from currently-live PlacedItems
 * alone. This is the one small, additive, never-deleted record that survives
 * that: which distinct meal item ids the community placed on the table this
 * year, so a late-arriving player computes the same closing-speech tier
 * everyone else sees. Transport is firebase/harvestFeastService.ts.
 */

/** One year's contributions as stored at `shared/world/harvestFeast/{year}`. */
export interface HarvestFeastContributionsWire {
  /** Distinct meal item ids contributed by any player this year. */
  m: string[];
}

const MAX_CONTRIBUTIONS = 20;

/**
 * Validate an inbound record. The security rules enforce this shape too, but
 * rules can lag a deploy and a malformed record must degrade to "ignore it"
 * rather than to a crash mid-render.
 */
export function decodeContributions(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object') return [];
  const d = raw as Record<string, unknown>;
  if (!Array.isArray(d.m)) return [];
  return d.m.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, MAX_CONTRIBUTIONS);
}
