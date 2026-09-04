/**
 * Retroactive rain watering — replay deterministic weather slots that passed
 * while the game was closed.
 *
 * WHY THIS EXISTS
 * ---------------
 * Game time is wall-clock based and keeps running while the game is shut
 * (1 game day = 2 real hours — see TimeManager). Weather is deterministic per
 * time slot, but rain only *watered crops while the game was open*: the
 * WeatherManager waters on a live timer. A crop left unwatered could therefore
 * die overnight even though it rained the whole time — crops "disappeared"
 * across breaks, and the season had usually rolled on too, so the two looked
 * connected.
 *
 * THE FIX: because every player computes the same weather for the same slot
 * (getWeatherForSlot is seeded per slot + season), we can replay completed
 * slots forward from the plot's last watering and apply rain the same way the
 * live manager would have. Timestamp-based, so players stay in agreement about
 * shared farm plots — never switch this to session time.
 *
 * Rain waters at slot END (the live manager waters when a slot begins, on the
 * next poll; slot-end is the conservative deterministic approximation and
 * keeps the maths exact). A crop dies when it has been unwatered for
 * deathWindowMs; a slot ending after that moment is too late.
 */

import type { Season } from './TimeManager';

export interface RetroactiveRainParams {
  /** The plot's last watering time (real-world ms). */
  lastWateredMs: number;
  /**
   * How long the crop survives unwatered: waterNeededInterval +
   * wiltingGracePeriod + deathGracePeriod (real ms, from the crop definition).
   */
  deathWindowMs: number;
  /** Index of the weather slot containing "now" — only slots *before* it replay. */
  currentSlotIndex: number;
  /** Real ms covered by one weather slot (slotHours × TimeManager.MS_PER_GAME_HOUR). */
  msPerSlot: number;
  /** Real ms when the game clock started (TimeManager.GAME_START_DATE). */
  gameStartMs: number;
  /** Season at a slot's starting total-hour (TimeManager.seasonAtTotalHours). */
  seasonForSlot: (slotIndex: number) => Season;
  /** Whether a slot's weather waters crops (rain or storm). */
  isWetSlot: (slotIndex: number, season: Season) => boolean;
}

export interface RainWateringResult {
  /** The wet slot that last watered the plot. */
  slotIndex: number;
  /** Watering timestamp to apply (the slot's end, real-world ms). */
  wateredAtMs: number;
}

/**
 * Forward-simulate completed weather slots from the plot's last watering,
 * exactly as the live WeatherManager would have watered them. Returns the
 * final rain watering that kept the crop alive, or null when no rain reached
 * it in time (the crop died offline and must stay dead — never resurrect).
 */
export function findRainWateringTimestamp(
  params: RetroactiveRainParams
): RainWateringResult | null {
  const { deathWindowMs, currentSlotIndex, msPerSlot, gameStartMs, seasonForSlot, isWetSlot } =
    params;

  // Start at the slot containing the last watering — its end is after that
  // moment, so rain there re-waters the plot. Skip slots from before the
  // game clock started.
  let lastWateredMs = params.lastWateredMs;
  const firstSlot = Math.max(0, Math.floor((lastWateredMs - gameStartMs) / msPerSlot));

  let lastWetSlot: number | null = null;

  for (let slot = firstSlot; slot < currentSlotIndex; slot++) {
    const slotEndMs = gameStartMs + (slot + 1) * msPerSlot;

    // The crop dies once the full death window has elapsed unwatered. A slot
    // ending at or after that moment is too late to help.
    if (slotEndMs - lastWateredMs >= deathWindowMs) {
      return null;
    }

    if (isWetSlot(slot, seasonForSlot(slot))) {
      lastWateredMs = slotEndMs;
      lastWetSlot = slot;
    }
  }

  return lastWetSlot !== null ? { slotIndex: lastWetSlot, wateredAtMs: lastWateredMs } : null;
}
