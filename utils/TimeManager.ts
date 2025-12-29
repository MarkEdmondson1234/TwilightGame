/**
 * TimeManager - Single Source of Truth for game time
 *
 * Time system:
 * - 1 real month ≈ 1 game year
 * - 1 real week = 1 game season (84 game days)
 * - 2 real hours = 1 game day (1 hour day phase, 1 hour night phase)
 * - 5 real minutes = 1 game hour
 * - 12 game days per real day
 *
 * Seasonal day/night variation:
 * - Summer: Long days (5am-9pm = 16 hours daylight)
 * - Winter: Short days (8am-4pm = 8 hours daylight)
 * - Spring/Autumn: Medium days (6am-6pm = 12 hours daylight)
 *
 * Year 0 starts on October 17, 2025 00:00:00 UTC
 */

export enum Season {
  SPRING = 'Spring',
  SUMMER = 'Summer',
  AUTUMN = 'Autumn',
  WINTER = 'Winter',
}

export enum TimeOfDay {
  DAWN = 'Dawn',
  DAY = 'Day',
  DUSK = 'Dusk',
  NIGHT = 'Night',
}

// Seasonal sunrise/sunset times (24-hour format)
export interface DaylightHours {
  dawn: number;      // Hour when dawn begins
  sunrise: number;   // Hour when full day begins
  sunset: number;    // Hour when dusk begins
  dusk: number;      // Hour when full night begins
}

export const SEASONAL_DAYLIGHT: Record<Season, DaylightHours> = {
  [Season.SPRING]: { dawn: 5, sunrise: 6, sunset: 18, dusk: 19 },   // 12 hours daylight
  [Season.SUMMER]: { dawn: 4, sunrise: 5, sunset: 20, dusk: 21 },   // 15 hours daylight
  [Season.AUTUMN]: { dawn: 6, sunrise: 7, sunset: 17, dusk: 18 },   // 10 hours daylight
  [Season.WINTER]: { dawn: 7, sunrise: 8, sunset: 16, dusk: 17 },   // 8 hours daylight
};

export interface GameTime {
  year: number;        // Years since October 17, 2025
  season: Season;      // Current season
  day: number;         // Day within season (1-84)
  totalDays: number;   // Total days since game start
  hour: number;        // Hour of day (0-23)
  timeOfDay: TimeOfDay; // Dawn, Day, Dusk, or Night (varies by season)
  totalHours: number;  // Total hours since game start
  daylight: DaylightHours; // Current season's daylight hours
}

export class TimeManager {
  // Game start date: October 17, 2025 00:00:00 UTC
  private static readonly GAME_START_DATE = new Date('2025-10-17T00:00:00Z').getTime();

  // Time constants
  private static readonly DAYS_PER_SEASON = 84;  // 1 real week = 84 game days
  private static readonly SEASONS_PER_YEAR = 4;
  private static readonly DAYS_PER_YEAR = TimeManager.DAYS_PER_SEASON * TimeManager.SEASONS_PER_YEAR; // 336 days

  // Real time to game time conversion
  // 2 real hours = 1 game day (1 hour day phase, 1 hour night phase)
  // 12 game days per real day
  // 5 real minutes = 1 game hour
  private static readonly MS_PER_GAME_DAY = 2 * 60 * 60 * 1000; // 7,200,000 ms = 2 hours

  private static readonly SEASON_ORDER = [
    Season.SPRING,
    Season.SUMMER,
    Season.AUTUMN,
    Season.WINTER,
  ];

  // Dev mode: Override time for testing/debugging
  private static timeOverride: GameTime | null = null;

  /**
   * Get the current game time based on real-world time
   * (or override time if set via setTimeOverride)
   */
  static getCurrentTime(): GameTime {
    // Return override if set (for dev/testing)
    if (TimeManager.timeOverride) {
      return TimeManager.timeOverride;
    }

    const now = Date.now();
    const msSinceStart = now - TimeManager.GAME_START_DATE;

    // Calculate total game days elapsed
    const totalDays = Math.floor(msSinceStart / TimeManager.MS_PER_GAME_DAY);

    // Calculate year
    const year = Math.floor(totalDays / TimeManager.DAYS_PER_YEAR);

    // Calculate day within the year (0-335)
    const dayInYear = totalDays % TimeManager.DAYS_PER_YEAR;

    // Calculate season (0-3)
    const seasonIndex = Math.floor(dayInYear / TimeManager.DAYS_PER_SEASON);
    const season = TimeManager.SEASON_ORDER[seasonIndex];

    // Calculate day within season (1-84)
    const day = (dayInYear % TimeManager.DAYS_PER_SEASON) + 1;

    // Calculate hours - 24 hours per game day
    // 5 real minutes = 1 game hour
    const msPerGameHour = TimeManager.MS_PER_GAME_DAY / 24;
    const totalHours = Math.floor(msSinceStart / msPerGameHour);
    const hour = totalHours % 24; // 0-23

    // Get seasonal daylight hours
    const daylight = SEASONAL_DAYLIGHT[season];

    // Determine time of day based on seasonal sunrise/sunset
    const timeOfDay = TimeManager.getTimeOfDayForHour(hour, daylight);

    return {
      year,
      season,
      day,
      totalDays,
      hour,
      timeOfDay,
      totalHours,
      daylight,
    };
  }

  /**
   * Determine time of day based on hour and seasonal daylight hours
   */
  private static getTimeOfDayForHour(hour: number, daylight: DaylightHours): TimeOfDay {
    if (hour >= daylight.sunrise && hour < daylight.sunset) {
      return TimeOfDay.DAY;
    } else if (hour >= daylight.dawn && hour < daylight.sunrise) {
      return TimeOfDay.DAWN;
    } else if (hour >= daylight.sunset && hour < daylight.dusk) {
      return TimeOfDay.DUSK;
    } else {
      return TimeOfDay.NIGHT;
    }
  }

  /**
   * Get a formatted string for the current date
   */
  static getFormattedDate(): string {
    const time = TimeManager.getCurrentTime();
    return `${time.season} ${time.day}, Year ${time.year}`;
  }

  /**
   * Get a short formatted string for the current date
   */
  static getShortFormattedDate(): string {
    const time = TimeManager.getCurrentTime();
    return `${time.season} ${time.day}`;
  }

  /**
   * Get milliseconds until next game day
   */
  static getMsUntilNextDay(): number {
    const now = Date.now();
    const msSinceStart = now - TimeManager.GAME_START_DATE;
    const msIntoCurrentDay = msSinceStart % TimeManager.MS_PER_GAME_DAY;
    return TimeManager.MS_PER_GAME_DAY - msIntoCurrentDay;
  }

  /**
   * Get the season for a given total day count
   */
  static getSeasonForDay(totalDays: number): Season {
    const dayInYear = totalDays % TimeManager.DAYS_PER_YEAR;
    const seasonIndex = Math.floor(dayInYear / TimeManager.DAYS_PER_SEASON);
    return TimeManager.SEASON_ORDER[seasonIndex];
  }

  /**
   * Check if it's currently a specific season
   */
  static isCurrentSeason(season: Season): boolean {
    return TimeManager.getCurrentTime().season === season;
  }

  /**
   * Set a time override for development/testing
   * @param override Partial time object (missing fields calculated from provided fields)
   */
  static setTimeOverride(override: Partial<GameTime>): void {
    const currentTime = TimeManager.timeOverride || TimeManager.getCurrentTime();

    // Merge override with current time
    const season = override.season !== undefined ? override.season : currentTime.season;
    const day = override.day !== undefined ? override.day : currentTime.day;
    const hour = override.hour !== undefined ? override.hour : currentTime.hour;
    const year = override.year !== undefined ? override.year : currentTime.year;

    // Calculate derived fields
    const seasonIndex = TimeManager.SEASON_ORDER.indexOf(season);
    const dayInYear = seasonIndex * TimeManager.DAYS_PER_SEASON + (day - 1);
    const totalDays = year * TimeManager.DAYS_PER_YEAR + dayInYear;
    const totalHours = totalDays * 24 + hour;

    // Get seasonal daylight hours and determine time of day
    const daylight = SEASONAL_DAYLIGHT[season];
    const timeOfDay = TimeManager.getTimeOfDayForHour(hour, daylight);

    TimeManager.timeOverride = {
      year,
      season,
      day,
      totalDays,
      hour,
      timeOfDay,
      totalHours,
      daylight,
    };

    console.log('[TimeManager] Time override set:', TimeManager.timeOverride);
  }

  /**
   * Clear time override and return to real-world time
   */
  static clearTimeOverride(): void {
    TimeManager.timeOverride = null;
    console.log('[TimeManager] Time override cleared, using real-world time');
  }

  /**
   * Check if time is currently overridden
   */
  static hasTimeOverride(): boolean {
    return TimeManager.timeOverride !== null;
  }
}
