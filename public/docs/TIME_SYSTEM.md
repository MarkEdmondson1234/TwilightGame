# Time System Documentation

## Overview

The time system provides a game calendar with seasons and days that progress based on **real-world time**. The system is **completely stateless** - all time values are calculated from timestamps, requiring no persistent state beyond normal gameplay data.

## Core Principle: Stateless Time

**Key Design Decision**: Time is **always calculated** from the current real-world timestamp, never stored or incremented.

### Why Stateless?

- **No drift**: Time is always accurate, never gets out of sync
- **No saving required**: No time state needs to be persisted
- **Works offline**: When player returns after days/weeks, time has naturally progressed
- **Simple**: No complex state management or synchronization
- **Consistent**: All players experience the same in-game date at the same real-world time

### What Gets Stored?

**Nothing!** The only "state" is:
- `GameState.lastKnownTime` (optional) - For display purposes only, not authoritative
- Gameplay effects (crops planted on Day X, events scheduled for Day Y, etc.)

The actual current time is **always recalculated** via `TimeManager.getCurrentTime()`.

## Time Configuration

### Epoch (Year 0)
- **Start Date**: October 17, 2025 00:00:00 UTC
- All in-game years are calculated from this timestamp
- Year 0 = any time during the first 28 in-game days

### Time Scaling

Real-world time maps to in-game time with this ratio:
- **1 real month (30 days) = 1 game year (28 days)**
- **1 real day ≈ 0.933 game days**
- **1 game day ≈ 25.7 real hours**

### Calendar Structure

**Year Structure:**
- 4 seasons per year
- 7 days per season
- **28 total days per year**

**Season Order:**
1. Spring (Days 1-7)
2. Summer (Days 8-14)
3. Autumn (Days 15-21)
4. Winter (Days 22-28)

### Duration Examples

| Real Time | In-Game Time |
|-----------|--------------|
| 1 day | ~1 day |
| 1 week | ~6.5 days (almost 1 season) |
| 2 weeks | ~13 days (nearly 2 seasons) |
| 1 month | 1 full year (28 days) |

## API Reference

### TimeManager Class

Located in: `utils/TimeManager.ts`

This is the **Single Source of Truth** for all game time.

#### Methods

**`getCurrentTime(): GameTime`**
- Returns the current in-game date
- Calculates from current timestamp every time
- Never uses cached values

```typescript
const time = TimeManager.getCurrentTime();
// { year: 0, season: Season.SPRING, day: 3, totalDays: 2 }
```

**`getFormattedDate(): string`**
- Returns formatted date: "Spring 5, Year 0"

```typescript
const date = TimeManager.getFormattedDate();
// "Spring 5, Year 0"
```

**`getShortFormattedDate(): string`**
- Returns short format: "Spring 5"

```typescript
const date = TimeManager.getShortFormattedDate();
// "Spring 5"
```

**`isCurrentSeason(season: Season): boolean`**
- Check if it's currently a specific season

```typescript
if (TimeManager.isCurrentSeason(Season.WINTER)) {
  // Winter-specific logic
}
```

**`getSeasonForDay(totalDays: number): Season`**
- Get the season for a given day count
- Useful for calculating what season a future/past day was

```typescript
const season = TimeManager.getSeasonForDay(15);
// Season.AUTUMN (day 15 is in autumn)
```

**`getMsUntilNextDay(): number`**
- Returns milliseconds until the next in-game day
- Useful for scheduling day-change events

```typescript
const ms = TimeManager.getMsUntilNextDay();
setTimeout(() => {
  console.log('New day!');
}, ms);
```

### GameTime Interface

```typescript
interface GameTime {
  year: number;        // Years since October 17, 2025 (0, 1, 2...)
  season: Season;      // Current season (SPRING/SUMMER/AUTUMN/WINTER)
  day: number;         // Day within season (1-7)
  totalDays: number;   // Total days since epoch
}
```

### Season Enum

```typescript
enum Season {
  SPRING = 'Spring',
  SUMMER = 'Summer',
  AUTUMN = 'Autumn',
  WINTER = 'Winter',
}
```

## Usage Patterns

### Display Current Date

The HUD component shows current time:

```typescript
const [currentTime, setCurrentTime] = useState(TimeManager.getCurrentTime());

useEffect(() => {
  const interval = setInterval(() => {
    setCurrentTime(TimeManager.getCurrentTime());
  }, 1000); // Update every second

  return () => clearInterval(interval);
}, []);
```

### Seasonal Logic

```typescript
// Check current season
if (TimeManager.isCurrentSeason(Season.WINTER)) {
  // Crops grow slower in winter
}

// Get current season
const { season } = TimeManager.getCurrentTime();
switch (season) {
  case Season.SPRING:
    // Spring planting bonus
    break;
  case Season.SUMMER:
    // Faster growth
    break;
  // ...
}
```

### Day-Based Events

```typescript
// Store when something happened
const plantedOnDay = TimeManager.getCurrentTime().totalDays;

// Later, check how many days have passed
const currentDay = TimeManager.getCurrentTime().totalDays;
const daysGrown = currentDay - plantedOnDay;

if (daysGrown >= 7) {
  // Crop is ready to harvest
}
```

### Scheduled Events

```typescript
// Schedule something for a specific future day
const targetDay = TimeManager.getCurrentTime().totalDays + 5; // 5 days from now

// Later, check if we've reached that day
if (TimeManager.getCurrentTime().totalDays >= targetDay) {
  // Event should trigger
}
```

## Integration Points

### Farming System

Crops use `totalDays` to track growth:
- Plant time stored as `totalDays` value
- Growth calculated as: `currentTotalDays - plantedTotalDays`
- Watering/harvesting events use day counts

### Quest/Event System (Future)

Events can be scheduled by:
- Specific season (e.g., "Spring Festival")
- Specific day (e.g., "Day 1 of every year")
- Day count (e.g., "7 days after quest started")

### Seasonal Effects (Future)

Potential seasonal mechanics:
- **Spring**: Increased crop growth, special seeds
- **Summer**: Faster growth, heat events
- **Autumn**: Harvest bonuses, foraging
- **Winter**: Slower growth, indoor activities

## Mathematical Details

### Time Calculation

Given current real-world timestamp `now`:

```typescript
const GAME_START = new Date('2025-10-17T00:00:00Z').getTime();
const MS_PER_GAME_DAY = (30 * 24 * 60 * 60 * 1000) / 28;

const msSinceStart = now - GAME_START;
const totalDays = Math.floor(msSinceStart / MS_PER_GAME_DAY);
const year = Math.floor(totalDays / 28);
const dayInYear = totalDays % 28;
const seasonIndex = Math.floor(dayInYear / 7);
const day = (dayInYear % 7) + 1;
```

### Why 28 Days?

- Divides evenly into 4 seasons (7 days each)
- Close to real-world month (30 days)
- Simple mental math for players
- Allows ~13 years per real-world year

## Testing

To test different times without waiting:

```typescript
// Override GAME_START_DATE temporarily for testing
// NOTE: This requires modifying TimeManager for test mode

// Test Year 0, Spring 1
const testDate = new Date('2025-10-17T00:00:00Z');

// Test Year 0, Summer 5
const testDate = new Date('2025-10-21T12:00:00Z'); // ~4.5 days later

// Test Year 1, Winter 1
const testDate = new Date('2025-11-14T00:00:00Z'); // ~28 days later
```

## Performance

- `getCurrentTime()` is fast (simple math operations)
- Can be called frequently without performance issues
- No database lookups or complex state management
- Updates every second in HUD with negligible impact

## Future Enhancements

Possible additions while maintaining stateless design:

1. **Time of Day** (Morning/Afternoon/Evening/Night)
   - Could add sub-day time based on real-world hour
   - Still calculated, not stored

2. **Festivals/Events**
   - Triggered when `totalDays % X === Y`
   - No state needed, just check current day

3. **Time Speed Controls** (optional)
   - Multiply `MS_PER_GAME_DAY` by speed factor
   - Store speed preference in settings

4. **Pause Time** (optional)
   - Store pause timestamp and duration
   - Subtract paused duration from calculations
   - Only if players explicitly request this feature

## Important Notes

⚠️ **Never manually increment or decrement time values**
- Always call `TimeManager.getCurrentTime()`
- Don't store time in state unless for display only
- Don't try to "save" current time

✅ **Do store day counts for events**
- "Planted on day 15" → Store `15`
- "Quest started on day 42" → Store `42`
- Compare stored day to `getCurrentTime().totalDays`

✅ **Time is global and consistent**
- All players see the same in-game date at the same real time
- Multiplayer-ready (if added in future)
- No per-player time zones or offsets
