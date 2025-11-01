import React from 'react';
import { TimeManager, Season } from '../utils/TimeManager';

interface TimeControlPanelProps {
  onTimeChange?: () => void; // Callback when time changes
  compact?: boolean; // Compact mode for embedding in other UIs
}

const TimeControlPanel: React.FC<TimeControlPanelProps> = ({ onTimeChange, compact = false }) => {
  const currentTime = TimeManager.getCurrentTime();
  const hasOverride = TimeManager.hasTimeOverride();

  const [season, setSeason] = React.useState<Season>(currentTime.season);
  const [day, setDay] = React.useState<number>(currentTime.day);
  const [hour, setHour] = React.useState<number>(currentTime.hour);

  // Sync state when time changes externally
  React.useEffect(() => {
    const newTime = TimeManager.getCurrentTime();
    setSeason(newTime.season);
    setDay(newTime.day);
    setHour(newTime.hour);
  }, [currentTime]);

  const handleSeasonChange = (newSeason: Season) => {
    setSeason(newSeason);
    TimeManager.setTimeOverride({ season: newSeason, day, hour });
    onTimeChange?.();
  };

  const handleDayChange = (newDay: number) => {
    setDay(newDay);
    TimeManager.setTimeOverride({ season, day: newDay, hour });
    onTimeChange?.();
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    TimeManager.setTimeOverride({ season, day, hour: newHour });
    onTimeChange?.();
  };

  const handleResetToRealTime = () => {
    TimeManager.clearTimeOverride();
    const realTime = TimeManager.getCurrentTime();
    setSeason(realTime.season);
    setDay(realTime.day);
    setHour(realTime.hour);
    onTimeChange?.();
  };

  const handleQuickSeason = (targetSeason: Season) => {
    handleSeasonChange(targetSeason);
  };

  const handleToggleDayNight = () => {
    // Toggle between day (even hour) and night (odd hour)
    // Use hour 12 for day, hour 13 for night
    const currentTime = TimeManager.getCurrentTime();
    const newHour = currentTime.timeOfDay === 'Day' ? 13 : 12;
    handleHourChange(newHour);
  };

  // Use TimeManager's calculated time-of-day (single source of truth)
  const timeOfDay = TimeManager.getCurrentTime().timeOfDay;

  if (compact) {
    // Compact mode: Quick season buttons + day/night toggle
    return (
      <div className="flex flex-col gap-2">
        {hasOverride && (
          <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded px-2 py-1">
            ⚠ Time Override Active
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold">Season:</span>
          <div className="flex gap-1">
            {([Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER] as Season[]).map(s => (
              <button
                key={s}
                onClick={() => handleQuickSeason(s)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  season === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                title={`Jump to ${s.toLowerCase()}`}
              >
                {s.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold">Time:</span>
          <button
            onClick={handleToggleDayNight}
            className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            {timeOfDay === 'Day' ? '☀️ Day' : '🌙 Night'} → Toggle
          </button>
          <span className="text-xs text-gray-500">
            ({hour}:00)
          </span>
        </div>

        <button
          onClick={handleResetToRealTime}
          className="px-3 py-1 text-xs text-gray-400 hover:text-white border border-gray-600 hover:border-gray-500 rounded transition-colors"
        >
          ↺ Reset to Real Time
        </button>
      </div>
    );
  }

  // Full mode: Detailed controls with sliders
  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-900/50 border border-gray-700 rounded">
      {hasOverride && (
        <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded px-3 py-2">
          ⚠ <strong>Time Override Active</strong> - Using custom time instead of real-world time
        </div>
      )}

      <div className="text-sm text-white">
        <div className="flex items-center justify-between mb-2">
          <strong>Current Time:</strong>
          <span className="text-gray-300">
            {TimeManager.getFormattedDate()} • {timeOfDay} ({hour}:00)
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-white mb-1">
          Season
        </label>
        <select
          value={season}
          onChange={(e) => handleSeasonChange(e.target.value as Season)}
          className="w-full px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:border-blue-500 focus:outline-none"
        >
          <option value={Season.SPRING}>Spring</option>
          <option value={Season.SUMMER}>Summer</option>
          <option value={Season.AUTUMN}>Autumn</option>
          <option value={Season.WINTER}>Winter</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-white mb-1">
          Day ({day}/7)
        </label>
        <input
          type="range"
          min="1"
          max="7"
          value={day}
          onChange={(e) => handleDayChange(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-white mb-1">
          Hour ({hour}:00 - {timeOfDay})
        </label>
        <input
          type="range"
          min="0"
          max="23"
          value={hour}
          onChange={(e) => handleHourChange(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      <button
        onClick={handleResetToRealTime}
        className="px-3 py-2 text-sm font-semibold text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
      >
        ↺ Reset to Real Time
      </button>
    </div>
  );
};

export default TimeControlPanel;
