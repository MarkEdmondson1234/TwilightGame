import React, { useState, useEffect } from 'react';
import { TimeManager, Season } from '../utils/TimeManager';
import { gameState } from '../GameState';
import { characterData } from '../utils/CharacterData';
import { farmManager } from '../utils/farmManager';
import { mapManager } from '../maps/MapManager';
import { FarmPlotState } from '../types';
import { audioManager, SoundCategory, AudioEffects } from '../utils/AudioManager';
import { magicManager } from '../utils/MagicManager';
import { inventoryManager } from '../utils/inventoryManager';
import { decorationManager } from '../utils/DecorationManager';
import { getLocalPaintingCount, LOCAL_PAINTING_LIMIT } from '../utils/paintingImageService';
import './DevTools.css';

interface DevToolsProps {
  onClose: () => void;
  onFarmUpdate?: () => void;
  onFairyFormToggle?: (active: boolean) => void;
  isFairyForm?: boolean;
  onOpenPaintingEasel?: () => void;
  onOpenDecorationWorkshop?: () => void;
}

/**
 * Audio Debug Section - volume controls and audio testing
 */
const AudioDebugSection: React.FC = () => {
  const [audioStats, setAudioStats] = useState({
    loaded: 0,
    loading: 0,
    active: 0,
    musicPlaying: false,
  });
  const [volumes, setVolumes] = useState({
    master: audioManager.getVolume('master'),
    music: audioManager.getVolume('music'),
    ambient: audioManager.getVolume('ambient'),
    sfx: audioManager.getVolume('sfx'),
    ui: audioManager.getVolume('ui'),
  });
  const [muted, setMuted] = useState(audioManager.isMuted());

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setAudioStats(audioManager.getStats());
      setMuted(audioManager.isMuted());
    };
    updateStats();
    const interval = setInterval(updateStats, 500);
    return () => clearInterval(interval);
  }, []);

  const handleVolumeChange = (category: SoundCategory, value: number) => {
    audioManager.setVolume(category, value);
    setVolumes((prev) => ({ ...prev, [category]: value }));
  };

  const handleMuteToggle = () => {
    const newMuted = audioManager.toggleMute();
    setMuted(newMuted);
  };

  const testSound = (key: string) => {
    if (audioManager.hasSound(key)) {
      audioManager.playSfx(key);
    } else {
      console.log(`[DevTools] Sound "${key}" not loaded yet`);
    }
  };

  return (
    <>
      <div className="devtools-status" style={{ marginBottom: '12px' }}>
        <p>
          <strong>Sounds Loaded:</strong> {audioStats.loaded} | <strong>Active:</strong>{' '}
          {audioStats.active}
        </p>
        <p>
          <strong>Music:</strong> {audioStats.musicPlaying ? 'Playing' : 'Stopped'}
        </p>
      </div>

      <div className="devtools-control">
        <label>
          <input type="checkbox" checked={muted} onChange={handleMuteToggle} /> Mute All Audio
        </label>
      </div>

      <div className="devtools-control">
        <label>Master Volume ({Math.round(volumes.master * 100)}%)</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volumes.master}
          onChange={(e) => handleVolumeChange('master', parseFloat(e.target.value))}
          disabled={muted}
        />
      </div>

      <div className="devtools-control">
        <label>Music ({Math.round(volumes.music * 100)}%)</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volumes.music}
          onChange={(e) => handleVolumeChange('music', parseFloat(e.target.value))}
          disabled={muted}
        />
      </div>

      <div className="devtools-control">
        <label>Ambient ({Math.round(volumes.ambient * 100)}%)</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volumes.ambient}
          onChange={(e) => handleVolumeChange('ambient', parseFloat(e.target.value))}
          disabled={muted}
        />
      </div>

      <div className="devtools-control">
        <label>Sound Effects ({Math.round(volumes.sfx * 100)}%)</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volumes.sfx}
          onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
          disabled={muted}
        />
      </div>

      <div className="devtools-control">
        <label>UI Sounds ({Math.round(volumes.ui * 100)}%)</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volumes.ui}
          onChange={(e) => handleVolumeChange('ui', parseFloat(e.target.value))}
          disabled={muted}
        />
      </div>

      <div className="devtools-control" style={{ marginTop: '12px' }}>
        <label>Test Sounds</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          <button
            className="devtools-button"
            onClick={() => testSound('sfx_till')}
            title="Test till sound"
          >
            Till
          </button>
          <button
            className="devtools-button"
            onClick={() => testSound('sfx_hoe')}
            title="Test hoe sound"
          >
            Hoe
          </button>
          <button
            className="devtools-button"
            onClick={() => testSound('sfx_door_open')}
            title="Test door sound"
          >
            Door
          </button>
          <button
            className="devtools-button"
            onClick={() => testSound('sfx_magic_transition')}
            title="Test magic sound"
          >
            Magic
          </button>
        </div>
        <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
          Add audio files to /public/assets/audio/ to enable sounds
        </small>
      </div>
    </>
  );
};

/**
 * Audio Effects Section - filters, reverb, and presets
 */
const AudioEffectsSection: React.FC = () => {
  const [effects, setEffects] = useState<AudioEffects>(audioManager.getEffects());
  const [codeSnippet, setCodeSnippet] = useState('');

  // Update local state from audioManager
  const syncEffects = () => {
    setEffects(audioManager.getEffects());
    setCodeSnippet(audioManager.getEffectCodeSnippet());
  };

  // Low-pass filter controls
  const handleLowPassToggle = () => {
    audioManager.setLowPassFilter(!effects.lowPassEnabled);
    syncEffects();
  };

  const handleLowPassFreq = (value: number) => {
    audioManager.setLowPassFilter(effects.lowPassEnabled, value);
    syncEffects();
  };

  const handleLowPassQ = (value: number) => {
    audioManager.setLowPassFilter(effects.lowPassEnabled, undefined, value);
    syncEffects();
  };

  // High-pass filter controls
  const handleHighPassToggle = () => {
    audioManager.setHighPassFilter(!effects.highPassEnabled);
    syncEffects();
  };

  const handleHighPassFreq = (value: number) => {
    audioManager.setHighPassFilter(effects.highPassEnabled, value);
    syncEffects();
  };

  // Reverb controls
  const handleReverbToggle = () => {
    audioManager.setReverb(!effects.reverbEnabled);
    syncEffects();
  };

  const handleReverbMix = (value: number) => {
    audioManager.setReverb(effects.reverbEnabled, value);
    syncEffects();
  };

  const handleReverbDelay = (value: number) => {
    audioManager.setReverb(effects.reverbEnabled, undefined, value);
    syncEffects();
  };

  const handleReverbDecay = (value: number) => {
    audioManager.setReverb(effects.reverbEnabled, undefined, undefined, value);
    syncEffects();
  };

  // Presets
  const handlePreset = (
    preset: 'none' | 'underwater' | 'cave' | 'indoor' | 'distant' | 'dream'
  ) => {
    audioManager.applyEffectPreset(preset);
    syncEffects();
  };

  // Copy code snippet
  const copyCodeSnippet = () => {
    navigator.clipboard.writeText(codeSnippet);
  };

  return (
    <>
      {/* Presets */}
      <div className="devtools-control">
        <label>Effect Presets</label>
        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
          <button className="devtools-button" onClick={() => handlePreset('none')}>
            None
          </button>
          <button className="devtools-button" onClick={() => handlePreset('underwater')}>
            Underwater
          </button>
          <button className="devtools-button" onClick={() => handlePreset('cave')}>
            Cave
          </button>
          <button className="devtools-button" onClick={() => handlePreset('indoor')}>
            Indoor
          </button>
          <button className="devtools-button" onClick={() => handlePreset('distant')}>
            Distant
          </button>
          <button className="devtools-button" onClick={() => handlePreset('dream')}>
            Dream
          </button>
        </div>
      </div>

      {/* Low-pass Filter */}
      <div className="devtools-control" style={{ marginTop: '12px' }}>
        <label>
          <input type="checkbox" checked={effects.lowPassEnabled} onChange={handleLowPassToggle} />{' '}
          Low-Pass Filter (Muffle)
        </label>
      </div>
      {effects.lowPassEnabled && (
        <>
          <div className="devtools-control">
            <label>Frequency: {effects.lowPassFrequency} Hz</label>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={effects.lowPassFrequency}
              onChange={(e) => handleLowPassFreq(parseFloat(e.target.value))}
            />
          </div>
          <div className="devtools-control">
            <label>Resonance (Q): {effects.lowPassQ.toFixed(1)}</label>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={effects.lowPassQ}
              onChange={(e) => handleLowPassQ(parseFloat(e.target.value))}
            />
          </div>
        </>
      )}

      {/* High-pass Filter */}
      <div className="devtools-control" style={{ marginTop: '8px' }}>
        <label>
          <input
            type="checkbox"
            checked={effects.highPassEnabled}
            onChange={handleHighPassToggle}
          />{' '}
          High-Pass Filter (Tinny)
        </label>
      </div>
      {effects.highPassEnabled && (
        <div className="devtools-control">
          <label>Frequency: {effects.highPassFrequency} Hz</label>
          <input
            type="range"
            min="20"
            max="2000"
            step="10"
            value={effects.highPassFrequency}
            onChange={(e) => handleHighPassFreq(parseFloat(e.target.value))}
          />
        </div>
      )}

      {/* Reverb */}
      <div className="devtools-control" style={{ marginTop: '8px' }}>
        <label>
          <input type="checkbox" checked={effects.reverbEnabled} onChange={handleReverbToggle} />{' '}
          Reverb (Echo)
        </label>
      </div>
      {effects.reverbEnabled && (
        <>
          <div className="devtools-control">
            <label>Mix: {Math.round(effects.reverbMix * 100)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={effects.reverbMix}
              onChange={(e) => handleReverbMix(parseFloat(e.target.value))}
            />
          </div>
          <div className="devtools-control">
            <label>Delay: {effects.reverbDelay.toFixed(2)}s</label>
            <input
              type="range"
              min="0.01"
              max="0.8"
              step="0.01"
              value={effects.reverbDelay}
              onChange={(e) => handleReverbDelay(parseFloat(e.target.value))}
            />
          </div>
          <div className="devtools-control">
            <label>Decay: {Math.round(effects.reverbDecay * 100)}%</label>
            <input
              type="range"
              min="0"
              max="0.9"
              step="0.05"
              value={effects.reverbDecay}
              onChange={(e) => handleReverbDecay(parseFloat(e.target.value))}
            />
          </div>
        </>
      )}

      {/* Code Snippet */}
      <div className="devtools-control" style={{ marginTop: '12px' }}>
        <label>Copy to Code</label>
        <pre
          style={{
            background: '#1a1a2e',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: '80px',
            marginTop: '4px',
          }}
        >
          {codeSnippet || '// No effects active'}
        </pre>
        <button
          className="devtools-button"
          onClick={copyCodeSnippet}
          style={{ marginTop: '4px' }}
          title="Copy code to clipboard"
        >
          Copy Code
        </button>
      </div>
    </>
  );
};

/**
 * Magic Debug Section - controls for magic system testing
 */
const MagicDebugSection: React.FC = () => {
  const [magicBookUnlocked, setMagicBookUnlocked] = useState(magicManager.isMagicBookUnlocked());
  const [currentLevel, setCurrentLevel] = useState(magicManager.getCurrentLevel());

  // Update state periodically
  useEffect(() => {
    const updateStats = () => {
      setMagicBookUnlocked(magicManager.isMagicBookUnlocked());
      setCurrentLevel(magicManager.getCurrentLevel());
    };
    updateStats();
    const interval = setInterval(updateStats, 500);
    return () => clearInterval(interval);
  }, []);

  const handleUnlockMagicBook = () => {
    magicManager.unlockMagicBook();
    setMagicBookUnlocked(true);
    setCurrentLevel(magicManager.getCurrentLevel());
    console.log('[DevTools] Magic book unlocked!');
  };

  return (
    <>
      <div className="devtools-status" style={{ marginBottom: '12px' }}>
        <p>
          <strong>Magic Book:</strong> {magicBookUnlocked ? '✨ Unlocked' : '🔒 Locked'}
        </p>
        {magicBookUnlocked && (
          <p>
            <strong>Level:</strong> {currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}
          </p>
        )}
      </div>

      {!magicBookUnlocked && (
        <div className="devtools-control">
          <button
            className="devtools-button"
            onClick={handleUnlockMagicBook}
            title="Unlock the magic book and novice recipes"
          >
            ✨ Unlock Magic Book
          </button>
          <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
            Unlocks the magic book and all novice potion recipes
          </small>
        </div>
      )}

      {magicBookUnlocked && (
        <div className="devtools-control">
          <small style={{ opacity: 0.7 }}>
            Magic book is unlocked. Press M to open it in-game.
          </small>
        </div>
      )}
    </>
  );
};

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
      const planted = plots.filter(
        (p) =>
          p.state === FarmPlotState.PLANTED ||
          p.state === FarmPlotState.WATERED ||
          p.state === FarmPlotState.WILTING
      ).length;
      const ready = plots.filter((p) => p.state === FarmPlotState.READY).length;

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
    characterData.saveFarmPlots(farmManager.getAllPlots());
    onFarmUpdate?.();
    console.log(`[DevTools] Advanced farm time by ${ms / 1000}s`);
  };

  const resetAllPlots = () => {
    const currentMapId = mapManager.getCurrentMapId();
    if (!currentMapId) return;

    // Clear all plots for current map
    const allPlots = farmManager.getAllPlots();
    const otherMapPlots = allPlots.filter((plot) => plot.mapId !== currentMapId);
    farmManager.loadPlots(otherMapPlots);
    characterData.saveFarmPlots(otherMapPlots);
    onFarmUpdate?.();
    console.log(`[DevTools] Reset all farm plots for map: ${currentMapId}`);
  };

  return (
    <>
      <div className="devtools-status" style={{ marginBottom: '12px' }}>
        <p>
          <strong>Current Map Plots:</strong> {plotStats.total}
        </p>
        <p>
          <strong>Growing:</strong> {plotStats.planted} | <strong>Ready:</strong> {plotStats.ready}
        </p>
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

/**
 * Painting Debug Section - shortcuts for testing the painting/drawing system
 */
const PaintingDebugSection: React.FC<{
  onOpenPaintingEasel?: () => void;
  onOpenDecorationWorkshop?: () => void;
}> = ({ onOpenPaintingEasel, onOpenDecorationWorkshop }) => {
  const [status, setStatus] = useState('');

  const updateStatus = () => {
    const paintings = decorationManager.getAllPaintings();
    const localCount = getLocalPaintingCount();
    const hasEasel = decorationManager.getHasEasel();
    const hasCanvas = inventoryManager.hasItem('blank_canvas', 1);
    const unlocked = decorationManager.getUnlockedColours();
    setStatus(
      `Easel: ${hasEasel ? 'yes' : 'no'} | Canvas: ${hasCanvas ? 'yes' : 'no'} | ` +
        `Paints unlocked: ${unlocked.length} | Paintings: ${paintings.length} (${localCount}/${LOCAL_PAINTING_LIMIT} stored)`
    );
  };

  useEffect(() => {
    updateStatus();
  }, []);

  const giveArtSupplies = () => {
    // Grant easel
    if (!decorationManager.getHasEasel()) {
      decorationManager.grantEasel();
      inventoryManager.addItem('easel', 1);
    }

    // Grant blank canvases
    inventoryManager.addItem('blank_canvas', 5);

    // Grant a selection of paints (and mark them as crafted)
    const paintIds = [
      'paint_teal',
      'paint_yellow',
      'paint_violet',
      'paint_blue',
      'paint_red',
      'paint_green',
    ];
    for (const id of paintIds) {
      inventoryManager.addItem(id, 2);
    }

    // Mark paints as crafted so colours unlock in the palette
    // Dev tools: directly update the manager's internal Set + persist
    const mgr = decorationManager as unknown as { craftedPaints: Set<string> };
    for (const id of paintIds) {
      mgr.craftedPaints.add(id);
    }
    characterData.save('decoration', decorationManager.getDecorationState());

    // Save inventory
    const inv = inventoryManager.getInventoryData();
    characterData.saveInventory(inv.items, inv.tools);

    updateStatus();
    console.log('[DevTools] Granted art supplies: easel, 5 canvases, 6 paint types (x2 each)');
  };

  return (
    <>
      <div className="devtools-status" style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', lineHeight: 1.5 }}>{status || 'Loading...'}</p>
      </div>

      <div className="devtools-control">
        <label>Quick Actions</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          <button
            className="devtools-button"
            onClick={giveArtSupplies}
            title="Add easel, canvases, and paints to inventory"
          >
            🎨 Give Art Supplies
          </button>
          {onOpenPaintingEasel && (
            <button
              className="devtools-button"
              onClick={onOpenPaintingEasel}
              title="Open the freehand drawing easel"
            >
              ✏️ Open Drawing Easel
            </button>
          )}
          {onOpenDecorationWorkshop && (
            <button
              className="devtools-button"
              onClick={onOpenDecorationWorkshop}
              title="Open the decoration workshop (upload images, craft frames)"
            >
              🖼️ Open Workshop
            </button>
          )}
        </div>
        <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
          &quot;Give Art Supplies&quot; adds: easel, 5 blank canvases, 6 paint types (2 each)
        </small>
      </div>
    </>
  );
};

const DevTools: React.FC<DevToolsProps> = ({
  onClose,
  onFarmUpdate,
  onFairyFormToggle,
  isFairyForm = false,
  onOpenPaintingEasel,
  onOpenDecorationWorkshop,
}) => {
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
  const [weather, setWeather] = useState<
    'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'
  >(currentWeather);
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

  const handleWeatherChange = (
    newWeather: 'clear' | 'rain' | 'snow' | 'fog' | 'mist' | 'storm' | 'cherry_blossoms'
  ) => {
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
          {hasOverride && <div className="devtools-warning">⚠️ Time Override Active</div>}

          <div className="devtools-section">
            <h3>Time Control</h3>

            <div className="devtools-control">
              <label>Season</label>
              <select value={season} onChange={(e) => handleSeasonChange(e.target.value as Season)}>
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
              <label>
                Hour ({hour}:00 - {timeOfDay})
              </label>
              <input
                type="range"
                min="0"
                max="23"
                value={hour}
                onChange={(e) => handleHourChange(parseInt(e.target.value))}
              />
              <span className="devtools-value">{hour}:00</span>
            </div>

            <button className="devtools-button devtools-reset" onClick={handleResetToRealTime}>
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
                />{' '}
                Automatic Weather
              </label>
              <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
                {automaticWeather
                  ? 'Weather changes automatically based on season'
                  : 'Manual weather control'}
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
            <h3>Audio Control</h3>
            <AudioDebugSection />
          </div>

          <div className="devtools-section">
            <h3>Audio Effects</h3>
            <AudioEffectsSection />
          </div>

          <div className="devtools-section">
            <h3>Farming Debug</h3>
            <FarmingDebugSection onFarmUpdate={onFarmUpdate} />
          </div>

          <div className="devtools-section">
            <h3>Painting</h3>
            <PaintingDebugSection
              onOpenPaintingEasel={onOpenPaintingEasel}
              onOpenDecorationWorkshop={onOpenDecorationWorkshop}
            />
          </div>

          <div className="devtools-section">
            <h3>Magic</h3>
            <MagicDebugSection />
          </div>

          <div className="devtools-section">
            <h3>Transformations</h3>
            <div className="devtools-control">
              <label>
                <input
                  type="checkbox"
                  checked={isFairyForm}
                  onChange={(e) => onFairyFormToggle?.(e.target.checked)}
                />{' '}
                Fairy Form
              </label>
              <small style={{ display: 'block', marginTop: '4px', opacity: 0.7 }}>
                {isFairyForm ? 'Transformed into a fairy (tiny size)' : 'Normal human form'}
              </small>
            </div>
          </div>

          <div className="devtools-section">
            <h3>Current Status</h3>
            <div className="devtools-status">
              <p>
                <strong>Season:</strong> {season}
              </p>
              <p>
                <strong>Day:</strong> {day} of 7
              </p>
              <p>
                <strong>Time:</strong> {hour}:00 ({timeOfDay})
              </p>
              <p>
                <strong>Weather:</strong> {weather.charAt(0).toUpperCase() + weather.slice(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="devtools-footer">
          <p>
            Press <kbd>F4</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default DevTools;
