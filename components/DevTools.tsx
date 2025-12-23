import React, { useState, useEffect } from 'react';
import { TimeManager, Season } from '../utils/TimeManager';
import { gameState } from '../GameState';
import { farmManager } from '../utils/farmManager';
import { mapManager } from '../maps/MapManager';
import { FarmPlotState } from '../types';
import './DevTools.css';

interface DevToolsProps {
  onClose: () => void;
  onFarmUpdate?: () => void;
}

/**
 * Farming Debug Section - controls for accelerating and testing crop growth
 */
const FarmingDebugSection: React.FC<{ onFarmUpdate?: () => void }> = ({ onFarmUpdate }) => {
  const [plotStats, setPlotStats] = useState({ total: 0, planted: 0, ready: 0 });

  // Update plot stats periodically
  useEffect(() => {
    const updateStats = () => {
      const currentMapId = mapManager.getCurrentMapId();
      if (!currentMapId) {
        setPlotStats({ total: 0, planted: 0, ready: 0 });
        return;
      }

      const plots = farmManager.getPlotsForMap(currentMapId);
      const planted = plots.filter(p =>
        p.state === FarmPlotState.PLANTED ||
        p.state === FarmPlotState.WATERED ||
        p.state === FarmPlotState.WILTING
      ).length;
      const ready = plots.filter(p => p.state === FarmPlotState.READY).length;

      setPlotStats({
        total: plots.length,
        planted,
        ready,
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  const advanceTime = (ms: number) => {
    farmManager.debugAdvanceTime(ms);
    gameState.saveFarmPlots(farmManager.getAllPlots());
    onFarmUpdate?.();
    console.log(`[DevTools] Advanced farm time by ${ms / 1000}s`);
  };

  const resetAllPlots = () => {
    const currentMapId = mapManager.getCurrentMapId();
    if (!currentMapId) return;

    // Clear all plots for current map
    const allPlots = farmManager.getAllPlots();
    const otherMapPlots = allPlots.filter(plot => plot.mapId !== currentMapId);
    farmManager.loadPlots(otherMapPlots);
    gameState.saveFarmPlots(otherMapPlots);
    onFarmUpdate?.();
    console.log(`[DevTools] Reset all farm plots for map: ${currentMapId}`);
  };

  return (
    <>
      <div className="devtools-status" style={{ marginBottom: '12px' }}>
        <p><strong>Current Map Plots:</strong> {plotStats.total}</p>
        <p><strong>Growing:</strong> {plotStats.planted} | <strong>Ready:</strong> {plotStats.ready}</p>
      </div>

      <div className="devtools-control">
        <label>Advance Growth Time</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            className="devtools-button"
            onClick={() => advanceTime(60 * 1000)}
            title="Advance by 1 minute"
          >
            +1 min
          </button>
          <button
            className="devtools-button"
            onClick={() => advanceTime(5 * 60 * 1000)}
            title="Advance by 5 minutes"
          >
            +5 min
          </button>
          <button
            className="devtools-button"
            onClick={() => advanceTime(60 * 60 * 1000)}
            title="Advance by 1 hour"
          >
            +1 hour
          </button>
        </div>
        <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
          Also available: Press F6 to advance by 1 minute
        </small>
      </div>

      <div className="devtools-control" style={{ marginTop: '12px' }}>
        <button
          className="devtools-button devtools-reset"
          onClick={resetAllPlots}
          title="Clear all plots on this map"
        >
          Reset All Plots (This Map)
        </button>
        <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
          Clears all crops and resets soil to fallow
        </small>
      </div>
    </>
  );
};

const DevTools: React.FC<DevToolsProps> = ({ onClose, onFarmUpdate }) => {
  console.log('[DevTools] Component rendering');

  const currentTime = TimeManager.getCurrentTime();
  console.log('[DevTools] Current time:', currentTime);

  const hasOverride = TimeManager.hasTimeOverride();
  console.log('[DevTools] Has override:', hasOverride);

  const currentWeather = gameState.getWeather() || 'clear';
  console.log('[DevTools] Current weather:', currentWeather);

  const currentAutomaticWeather = gameState.getAutomaticWeather();
  console.log('[DevTools] Automatic weather:', currentAutomaticWeather);

  const currentDriftSpeed = gameState.getWeatherDriftSpeed();
  console.log('[DevTools] Drift speed:', currentDriftSpeed);

  const [season, setSeason] = useState<Season>(currentTime.season);
  const [day, setDay] = useState<number>(currentTime.day);
  const [hour, setHour] = useState<number>(currentTime.hour);
  const [weather, setWeather] = useState<'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'>(currentWeather);
  const [automaticWeather, setAutomaticWeather] = useState<boolean>(currentAutomaticWeather);
  const [driftSpeed, setDriftSpeed] = useState<number>(currentDriftSpeed);

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

  const handleAutomaticWeatherToggle = (enabled: boolean) => {
    setAutomaticWeather(enabled);
    gameState.setAutomaticWeather(enabled);
    console.log(`[DevTools] Automatic weather ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleDriftSpeedChange = (newSpeed: number) => {
    setDriftSpeed(newSpeed);
    gameState.setWeatherDriftSpeed(newSpeed);
    console.log(`[DevTools] Drift speed set to ${newSpeed}x`);
  };

  const handleResetToRealTime = () => {
    TimeManager.clearTimeOverride();
    const realTime = TimeManager.getCurrentTime();
    setSeason(realTime.season);
    setDay(realTime.day);
    setHour(realTime.hour);
  };

  // Use TimeManager's calculated time-of-day (single source of truth)
  const timeOfDay = TimeManager.getCurrentTime().timeOfDay;

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
              <label>
                <input
                  type="checkbox"
                  checked={automaticWeather}
                  onChange={(e) => handleAutomaticWeatherToggle(e.target.checked)}
                />
                {' '}Automatic Weather
              </label>
              <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
                {automaticWeather ? 'Weather changes automatically based on season' : 'Manual weather control'}
              </small>
            </div>

            <div className="devtools-control">
              <label>Current Weather</label>
              <select
                value={weather}
                onChange={(e) => handleWeatherChange(e.target.value as any)}
                disabled={automaticWeather}
              >
                <option value="clear">Clear</option>
                <option value="rain">Rain</option>
                <option value="snow">Snow</option>
                <option value="fog">Fog</option>
                <option value="mist">Mist</option>
                <option value="storm">Storm</option>
                <option value="cherry_blossoms">Cherry Blossoms</option>
              </select>
              {automaticWeather && (
                <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
                  Disable automatic weather to manually change
                </small>
              )}
            </div>

            <div className="devtools-control">
              <label>Drift Speed ({driftSpeed.toFixed(1)}x)</label>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={driftSpeed}
                onChange={(e) => handleDriftSpeedChange(parseFloat(e.target.value))}
              />
              <span className="devtools-value">{driftSpeed.toFixed(1)}x</span>
              <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
                Controls particle and fog drift speed (0.1x = slow, 5x = fast)
              </small>
            </div>
          </div>

          <div className="devtools-section">
            <h3>Farming Debug</h3>
            <FarmingDebugSection onFarmUpdate={onFarmUpdate} />
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
