/** @vitest-environment node */
import { describe, it, expect } from 'vitest';

// Import the PRNG and weather functions directly
// We need to test the core logic without map manager dependencies

// Inline mulberry32 for testing (same implementation as weatherConfig.ts)
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Replicate the constants and logic from weatherConfig.ts for isolated testing
const WEATHER_SEED = 0x54574c54;
const WEATHER_SLOT_HOURS = 4;

enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter',
}

type WeatherType = 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms';

interface SeasonalWeatherProbabilities {
  clear: number;
  rain: number;
  snow: number;
  fog: number;
  mist: number;
  storm: number;
  cherry_blossoms: number;
}

const WEATHER_PROBABILITIES: Record<Season, SeasonalWeatherProbabilities> = {
  [Season.SPRING]: {
    clear: 40,
    rain: 30,
    snow: 0,
    fog: 10,
    mist: 10,
    storm: 5,
    cherry_blossoms: 5,
  },
  [Season.SUMMER]: {
    clear: 60,
    rain: 20,
    snow: 0,
    fog: 5,
    mist: 5,
    storm: 10,
    cherry_blossoms: 0,
  },
  [Season.AUTUMN]: {
    clear: 30,
    rain: 40,
    snow: 0,
    fog: 15,
    mist: 10,
    storm: 5,
    cherry_blossoms: 0,
  },
  [Season.WINTER]: {
    clear: 20,
    rain: 10,
    snow: 50,
    fog: 10,
    mist: 5,
    storm: 5,
    cherry_blossoms: 0,
  },
};

function getWeatherForSlot(slotIndex: number, season: Season): WeatherType {
  const slotSeed = WEATHER_SEED ^ Math.imul(slotIndex, 0x9e3779b9);
  const rng = mulberry32(slotSeed);

  const probabilities = WEATHER_PROBABILITIES[season];
  const total = Object.values(probabilities).reduce((sum, p) => sum + p, 0);

  let random = rng() * total;
  for (const [weather, probability] of Object.entries(probabilities)) {
    random -= probability;
    if (random <= 0) {
      return weather as WeatherType;
    }
  }

  return 'clear';
}

// ============================================================================
// Tests
// ============================================================================

describe('mulberry32 PRNG', () => {
  it('produces deterministic output for the same seed', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);

    for (let i = 0; i < 10; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    // First values should differ (with overwhelmingly high probability)
    expect(rng1()).not.toBe(rng2());
  });
});

describe('getWeatherForSlot', () => {
  it('same slot + season always produces the same weather', () => {
    const weather1 = getWeatherForSlot(100, Season.SPRING);
    const weather2 = getWeatherForSlot(100, Season.SPRING);
    expect(weather1).toBe(weather2);
  });

  it('is stable across 1000 calls with the same input', () => {
    const expected = getWeatherForSlot(42, Season.AUTUMN);
    for (let i = 0; i < 1000; i++) {
      expect(getWeatherForSlot(42, Season.AUTUMN)).toBe(expected);
    }
  });

  it('produces varied weather across different slots (statistical)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 200; i++) {
      results.add(getWeatherForSlot(i, Season.SPRING));
    }
    // Spring has 6 possible weather types (all except snow)
    // With 200 samples, we should see at least 3 different types
    expect(results.size).toBeGreaterThanOrEqual(3);
  });

  it('never produces snow in spring', () => {
    for (let i = 0; i < 2000; i++) {
      expect(getWeatherForSlot(i, Season.SPRING)).not.toBe('snow');
    }
  });

  it('never produces snow in summer', () => {
    for (let i = 0; i < 2000; i++) {
      expect(getWeatherForSlot(i, Season.SUMMER)).not.toBe('snow');
    }
  });

  it('never produces snow in autumn', () => {
    for (let i = 0; i < 2000; i++) {
      expect(getWeatherForSlot(i, Season.AUTUMN)).not.toBe('snow');
    }
  });

  it('never produces cherry blossoms in winter', () => {
    for (let i = 0; i < 2000; i++) {
      expect(getWeatherForSlot(i, Season.WINTER)).not.toBe('cherry_blossoms');
    }
  });

  it('never produces cherry blossoms in summer', () => {
    for (let i = 0; i < 2000; i++) {
      expect(getWeatherForSlot(i, Season.SUMMER)).not.toBe('cherry_blossoms');
    }
  });

  it('never produces cherry blossoms in autumn', () => {
    for (let i = 0; i < 2000; i++) {
      expect(getWeatherForSlot(i, Season.AUTUMN)).not.toBe('cherry_blossoms');
    }
  });

  it('produces snow in winter (statistical)', () => {
    let snowCount = 0;
    for (let i = 0; i < 500; i++) {
      if (getWeatherForSlot(i, Season.WINTER) === 'snow') {
        snowCount++;
      }
    }
    // Winter has 50% snow probability, so expect roughly 200-300 out of 500
    expect(snowCount).toBeGreaterThan(100);
    expect(snowCount).toBeLessThan(400);
  });

  it('always returns a valid weather type', () => {
    const validTypes: WeatherType[] = [
      'clear',
      'rain',
      'snow',
      'fog',
      'mist',
      'storm',
      'cherry_blossoms',
    ];
    for (let i = 0; i < 1000; i++) {
      for (const season of Object.values(Season)) {
        const weather = getWeatherForSlot(i, season);
        expect(validTypes).toContain(weather);
      }
    }
  });

  it('adjacent slots produce uncorrelated weather', () => {
    // Check that slot N and N+1 don't always produce the same weather
    let sameCount = 0;
    for (let i = 0; i < 100; i++) {
      if (getWeatherForSlot(i, Season.SPRING) === getWeatherForSlot(i + 1, Season.SPRING)) {
        sameCount++;
      }
    }
    // With 6 weather types, random chance of same = ~40% (clear is most likely at 40%)
    // Allow up to 70% same (very generous) — the point is they're not ALL the same
    expect(sameCount).toBeLessThan(70);
  });
});

describe('Weather slot timing', () => {
  it('WEATHER_SLOT_HOURS is 4 (6 slots per game day)', () => {
    expect(WEATHER_SLOT_HOURS).toBe(4);
    expect(24 / WEATHER_SLOT_HOURS).toBe(6);
  });

  it('slot index increases by 1 every 4 game hours', () => {
    const slot0 = Math.floor(0 / WEATHER_SLOT_HOURS);
    const slot1 = Math.floor(3 / WEATHER_SLOT_HOURS);
    const slot2 = Math.floor(4 / WEATHER_SLOT_HOURS);
    const slot3 = Math.floor(7 / WEATHER_SLOT_HOURS);
    const slot4 = Math.floor(8 / WEATHER_SLOT_HOURS);

    expect(slot0).toBe(0);
    expect(slot1).toBe(0); // 3 hours is still slot 0
    expect(slot2).toBe(1); // 4 hours is slot 1
    expect(slot3).toBe(1); // 7 hours is still slot 1
    expect(slot4).toBe(2); // 8 hours is slot 2
  });
});
