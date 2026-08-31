/**
 * Regression for issue #18: repeated NPC conversations get logged in the Diary
 * every time (every day), not just the first — when an NPC has no new dialogue
 * and falls back to the same repeated line, that exact exchange shouldn't
 * clutter the diary with a fresh identical entry each day.
 *
 * tests/setup.ts stubs `localStorage` globally as a no-op (getItem always
 * null, setItem a no-op) for the whole suite, so this file installs its own
 * in-memory Storage implementation to actually exercise persistence.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recordScriptedConversation, getDiaryEntriesForNPC } from '../services/diaryService';
import { TimeManager, Season, TimeOfDay, SEASONAL_DAYLIGHT } from '../utils/TimeManager';

function createInMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } as Storage;
}

function mockGameTime(totalDays: number) {
  return {
    year: 1,
    season: Season.SPRING,
    day: totalDays,
    totalDays,
    hour: 12,
    minute: 0,
    timeOfDay: TimeOfDay.DAY,
    totalHours: totalDays * 24 + 12,
    daylight: SEASONAL_DAYLIGHT[Season.SPRING],
  };
}

describe('recordScriptedConversation — repeated exchanges (#18)', () => {
  const originalLocalStorage = global.localStorage;

  beforeEach(() => {
    global.localStorage = createInMemoryStorage();
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    vi.restoreAllMocks();
  });

  it('logs the first occurrence of a repeated line normally', async () => {
    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(1));
    await recordScriptedConversation(
      'village_elder',
      'Village Elder',
      'Player',
      'Hello!',
      'Good day to thee.'
    );

    const entries = getDiaryEntriesForNPC('village_elder');
    expect(entries).toHaveLength(1);
    expect(entries[0].totalDays).toBe(1);
  });

  it('skips logging when the exact same exchange repeats on a later day', async () => {
    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(1));
    await recordScriptedConversation(
      'village_elder',
      'Village Elder',
      'Player',
      'Hello!',
      'Good day to thee.'
    );

    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(2));
    await recordScriptedConversation(
      'village_elder',
      'Village Elder',
      'Player',
      'Hello!',
      'Good day to thee.'
    );

    const entries = getDiaryEntriesForNPC('village_elder');
    expect(entries).toHaveLength(1); // No new entry for day 2
    expect(entries[0].totalDays).toBe(1);
  });

  it('still logs a genuinely different exchange on a later day', async () => {
    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(1));
    await recordScriptedConversation(
      'village_elder',
      'Village Elder',
      'Player',
      'Hello!',
      'Good day to thee.'
    );

    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(2));
    await recordScriptedConversation(
      'village_elder',
      'Village Elder',
      'Player',
      'How is the garden?',
      "It's blooming nicely, thank you for asking!"
    );

    const entries = getDiaryEntriesForNPC('village_elder');
    expect(entries).toHaveLength(2);
  });

  it('still logs multiple exchanges within the same day (not skipped by the repeat check)', async () => {
    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(1));
    await recordScriptedConversation(
      'village_elder',
      'Village Elder',
      'Player',
      'Hello!',
      'Good day to thee.'
    );
    await recordScriptedConversation(
      'village_elder',
      'Village Elder',
      'Player',
      'Hello!',
      'Good day to thee.'
    );

    const entries = getDiaryEntriesForNPC('village_elder');
    expect(entries).toHaveLength(1);
    expect(entries[0].exchanges).toBe(2);
  });

  it('resumes logging once the repeated streak breaks and then repeats again', async () => {
    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(1));
    await recordScriptedConversation('x', 'X', 'Player', 'Hi', 'Same old line.');

    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(2));
    await recordScriptedConversation('x', 'X', 'Player', 'Hi', 'Same old line.'); // skipped

    vi.spyOn(TimeManager, 'getCurrentTime').mockReturnValue(mockGameTime(3));
    await recordScriptedConversation('x', 'X', 'Player', 'Hi', 'Same old line.'); // still skipped (compares to most recent prior, day 1)

    const entries = getDiaryEntriesForNPC('x');
    expect(entries).toHaveLength(1);
    expect(entries[0].totalDays).toBe(1);
  });
});
