import React, { useState, useEffect } from 'react';
import { TimeManager, Season } from '../utils/TimeManager';
import { gameState } from '../GameState';
import './DevTools.css';

interface DevToolsProps {
  onClose: () => void;
}

const DevTools: React.FC<DevToolsProps> = ({ onClose }) => {
  console.log('[DevTools] Component rendering');

  const currentTime = TimeManager.getCurrentTime();
  console.log('[DevTools] Current time:', currentTime);

  const hasOverride = TimeManager.hasTimeOverride();
  console.log('[DevTools] Has override:', hasOverride);

  const currentWeather = gameState.getWeather() || 'clear';
  console.log('[DevTools] Current weather:', currentWeather);

  const [season, setSeason] = useState<Season>(currentTime.season);
  const [day, setDay] = useState<number>(currentTime.day);
  const [hour, setHour] = useState<number>(currentTime.hour);
  const [weather, setWeather] = useState<'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'>(currentWeather);

  // Sync state when time changes externally
  useEffect(() => {
    const newTime = TimeManager.getCurrentTime();
    setSeason(newTime.season);
    setDay(newTime.day);
    setHour(newTime.hour);
  }, [currentTime]);

  useEffect(() => {
    setWeather(currentWeather);
  }, [currentWeather]);

  const handleSeasonChange = (newSeason: Season) => {
    setSeason(newSeason);
    TimeManager.setTimeOverride({ season: newSeason, day, hour });
  };

  const handleDayChange = (newDay: number) => {
    setDay(newDay);
    TimeManager.setTimeOverride({ season, day: newDay, hour });
  };

  const handleHourChange = (newHour: number) => {
    setHour(newHour);
    TimeManager.setTimeOverride({ season, day, hour: newHour });
  };

  const handleWeatherChange = (newWeather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms') => {
    setWeather(newWeather);
    gameState.setWeather(newWeather);
  };

  const handleResetToRealTime = () => {
    TimeManager.clearTimeOverride();
    const realTime = TimeManager.getCurrentTime();
    setSeason(realTime.season);
    setDay(realTime.day);
    setHour(realTime.hour);
  };

  const timeOfDay = hour >= 6 && hour < 20 ? 'Day' : 'Night';

  return (
    <div className="devtools-overlay">
      <div className="devtools-panel">
        <div className="devtools-header">
          <h2>Developer Tools</h2>
          <button className="devtools-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="devtools-content">
          {hasOverride && (
            <div className="devtools-warning">
              ⚠️ Time Override Active
            </div>
          )}

          <div className="devtools-section">
            <h3>Time Control</h3>

            <div className="devtools-control">
              <label>Season</label>
              <select
                value={season}
                onChange={(e) => handleSeasonChange(e.target.value as Season)}
              >
                <option value={Season.SPRING}>Spring</option>
                <option value={Season.SUMMER}>Summer</option>
                <option value={Season.AUTUMN}>Autumn</option>
                <option value={Season.WINTER}>Winter</option>
              </select>
            </div>

            <div className="devtools-control">
              <label>Day ({day} of 7)</label>
              <input
                type="range"
                min="1"
                max="7"
                value={day}
                onChange={(e) => handleDayChange(parseInt(e.target.value))}
              />
              <span className="devtools-value">{day}</span>
            </div>

            <div className="devtools-control">
              <label>Hour ({hour}:00 - {timeOfDay})</label>
              <input
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => handleHourChange(parseInt(e.target.value))}
              />
              <span className="devtools-value">{hour}:00</span>
            </div>

            <button
              className="devtools-button devtools-reset"
              onClick={handleResetToRealTime}
            >
              Reset to Real Time
            </button>
          </div>

          <div className="devtools-section">
            <h3>Weather Control</h3>

            <div className="devtools-control">
              <label>Current Weather</label>
              <select
                value={weather}
                onChange={(e) => handleWeatherChange(e.target.value as any)}
              >
                <option value="clear">Clear</option>
                <option value="rain">Rain</option>
                <option value="snow">Snow</option>
                <option value="fog">Fog</option>
                <option value="mist">Mist</option>
                <option value="storm">Storm</option>
                <option value="cherry_blossoms">Cherry Blossoms</option>
              </select>
            </div>
          </div>

          <div className="devtools-section">
            <h3>Current Status</h3>
            <div className="devtools-status">
              <p><strong>Season:</strong> {season}</p>
              <p><strong>Day:</strong> {day} of 7</p>
              <p><strong>Time:</strong> {hour}:00 ({timeOfDay})</p>
              <p><strong>Weather:</strong> {weather.charAt(0).toUpperCase() + weather.slice(1)}</p>
            </div>
          </div>
        </div>

        <div className="devtools-footer">
          <p>Press <kbd>F4</kbd> to close</p>
        </div>
      </div>
    </div>
  );
};

export default DevTools;
