/**
 * TimeManager - Single Source of Truth for game time
 *
 * Time system:
 * - Real time: 1 month (30 days) = 1 week (7 days real time)
 * - Day length: 1 real day = ~4.3 in-game days
 * - Each season = 7 in-game days = ~1.6 real days
 * - Full year (28 days) = ~6.5 real days
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
  DAY = 'Day',
  NIGHT = 'Night',
}

export interface GameTime {
  year: number;        // Years since October 17, 2025
  season: Season;      // Current season
  day: number;         // Day within season (1-7)
  totalDays: number;   // Total days since game start
  hour: number;        // Hour of day (0-23)
  timeOfDay: TimeOfDay; // Day or Night (even hours = day, odd hours = night)
  totalHours: number;  // Total hours since game start
}

export class TimeManager {
  // Game start date: October 17, 2025 00:00:00 UTC
  private static readonly GAME_START_DATE = new Date('2025-10-17T00:00:00Z').getTime();

  // Time constants
  private static readonly DAYS_PER_SEASON = 7;
  private static readonly SEASONS_PER_YEAR = 4;
  private static readonly DAYS_PER_YEAR = TimeManager.DAYS_PER_SEASON * TimeManager.SEASONS_PER_YEAR; // 28 days

  // Real time to game time conversion
  // 1 real month (30 days) = 1 game year (28 days)
  // 1 real day = 28/30 game days = 0.933 game days
  private static readonly MS_PER_GAME_DAY = (30 * 24 * 60 * 60 * 1000) / TimeManager.DAYS_PER_YEAR;

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

    // Calculate day within the year (0-27)
    const dayInYear = totalDays % TimeManager.DAYS_PER_YEAR;

    // Calculate season (0-3)
    const seasonIndex = Math.floor(dayInYear / TimeManager.DAYS_PER_SEASON);
    const season = TimeManager.SEASON_ORDER[seasonIndex];

    // Calculate day within season (1-7)
    const day = (dayInYear % TimeManager.DAYS_PER_SEASON) + 1;

    // Calculate hours - 24 hours per game day
    const msPerGameHour = TimeManager.MS_PER_GAME_DAY / 24;
    const totalHours = Math.floor(msSinceStart / msPerGameHour);
    const hour = totalHours % 24; // 0-23

    // Determine time of day based on even/odd hours
    const timeOfDay = hour % 2 === 0 ? TimeOfDay.DAY : TimeOfDay.NIGHT;

    return {
      year,
      season,
      day,
      totalDays,
      hour,
      timeOfDay,
      totalHours,
    };
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
    const timeOfDay = hour >= 6 && hour < 20 ? TimeOfDay.DAY : TimeOfDay.NIGHT;

    TimeManager.timeOverride = {
      year,
      season,
      day,
      totalDays,
      hour,
      timeOfDay,
      totalHours,
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
