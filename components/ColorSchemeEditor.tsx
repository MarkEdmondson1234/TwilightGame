import React, { useState, useEffect, useMemo } from 'react';
import { getPalette, GamePalette, updatePaletteColor, exportPalette, PaletteColor } from '../palette';
import { TimeManager, Season } from '../utils/TimeManager';
import { mapManager } from '../maps';
import { ColorScheme, TileType } from '../types';
import { COLOR_SCHEMES } from '../maps/colorSchemes';
import { TILE_LEGEND } from '../constants';

interface ColorSchemeEditorProps {
  onClose: () => void;
  onColorChange: () => void;  // Callback to trigger re-render in App
}

type TileColorKey = keyof ColorScheme['colors'];
type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
type TimeKey = 'day' | 'night';

const TILE_TYPES: { key: TileColorKey; label: string; description: string }[] = [
  { key: 'grass', label: 'Grass', description: 'Ground/outdoor grass tiles' },
  { key: 'rock', label: 'Rock', description: 'Background under rock sprites' },
  { key: 'water', label: 'Water', description: 'Water/pond tiles' },
  { key: 'path', label: 'Path', description: 'Background under path sprites' },
  { key: 'floor', label: 'Floor', description: 'Indoor floor tiles' },
  { key: 'wall', label: 'Wall', description: 'Indoor wall tiles' },
  { key: 'carpet', label: 'Carpet', description: 'Indoor carpet tiles' },
  { key: 'door', label: 'Door', description: 'Background under door sprites' },
  { key: 'special', label: 'Special', description: 'Special tiles (exits, mine entrance)' },
  { key: 'furniture', label: 'Furniture', description: 'Background under furniture sprites' },
  { key: 'mushroom', label: 'Mushroom', description: 'Background under mushroom sprites' },
  { key: 'background', label: 'Background', description: 'Map background color (empty space)' },
];

// Map TileType enum to ColorScheme color keys
const TILE_TYPE_TO_COLOR_KEY: Partial<Record<TileType, TileColorKey>> = {
  [TileType.GRASS]: 'grass',
  [TileType.ROCK]: 'rock',
  [TileType.WATER]: 'water',
  [TileType.WATER_CENTER]: 'water',
  [TileType.WATER_LEFT]: 'water',
  [TileType.WATER_RIGHT]: 'water',
  [TileType.WATER_TOP]: 'water',
  [TileType.WATER_BOTTOM]: 'water',
  [TileType.PATH]: 'path',
  [TileType.FLOOR]: 'floor',
  [TileType.FLOOR_LIGHT]: 'floor',
  [TileType.FLOOR_DARK]: 'floor',
  [TileType.WALL]: 'wall',
  [TileType.WALL_BOUNDARY]: 'wall',
  [TileType.BUILDING_WALL]: 'wall',
  [TileType.CARPET]: 'carpet',
  [TileType.RUG]: 'carpet',
  [TileType.DOOR]: 'door',
  [TileType.EXIT_DOOR]: 'door',
  [TileType.SHOP_DOOR]: 'door',
  [TileType.BUILDING_DOOR]: 'door',
  [TileType.MINE_ENTRANCE]: 'special',
  [TileType.TABLE]: 'furniture',
  [TileType.CHAIR]: 'furniture',
  [TileType.MUSHROOM]: 'mushroom',
  [TileType.SOIL_FALLOW]: 'grass',
  [TileType.SOIL_TILLED]: 'path',
  [TileType.SOIL_PLANTED]: 'grass',
  [TileType.SOIL_WATERED]: 'path',
  [TileType.SOIL_READY]: 'grass',
  [TileType.SOIL_WILTING]: 'grass',
  [TileType.SOIL_DEAD]: 'grass',
};

/**
 * Check if a tile type's background color is visible
 * (i.e., not completely obscured by a sprite image)
 */
const isTileColorVisible = (tileType: TileType): boolean => {
  const tileData = TILE_LEGEND[tileType];

  // If tile has no images or seasonal images, background is fully visible
  if (!tileData.image && !tileData.seasonalImages) {
    return true;
  }

  // If tile has images, check if they exist (array length > 0)
  const hasImages = (tileData.image && tileData.image.length > 0) ||
    (tileData.seasonalImages && tileData.seasonalImages.default.length > 0);

  // If tile has images, background is typically not visible
  // Exception: Some tiles like water and path have transparent sprites that show background
  // We'll consider these specific cases as visible
  const transparentTiles = [
    TileType.WATER, TileType.WATER_CENTER, TileType.WATER_LEFT,
    TileType.WATER_RIGHT, TileType.WATER_TOP, TileType.WATER_BOTTOM,
    TileType.GRASS, TileType.FLOOR, TileType.FLOOR_LIGHT, TileType.FLOOR_DARK,
    TileType.WALL, TileType.CARPET, TileType.RUG, TileType.PATH
  ];

  if (transparentTiles.includes(tileType)) {
    return true;
  }

  // For tiles with opaque sprites, background isn't visible
  return !hasImages;
};

/**
 * Check if a color key has any visible tiles using it on the current map
 */
const isColorKeyVisible = (colorKey: TileColorKey, grid: TileType[][]): boolean => {
  // Background is always visible
  if (colorKey === 'background') {
    return true;
  }

  // Check all tiles on the map
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tileType = grid[y][x];
      const tileColorKey = TILE_TYPE_TO_COLOR_KEY[tileType];

      // If this tile uses our color key and its color is visible
      if (tileColorKey === colorKey && isTileColorVisible(tileType)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Analyze current map to count tile usage
 */
const analyzeMapTiles = (grid: TileType[][]): Map<TileColorKey, number> => {
  const tileUsage = new Map<TileColorKey, number>();

  // Always show background
  tileUsage.set('background', 1);

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tileType = grid[y][x];
      const colorKey = TILE_TYPE_TO_COLOR_KEY[tileType];
      if (colorKey) {
        tileUsage.set(colorKey, (tileUsage.get(colorKey) || 0) + 1);
      }
    }
  }

  return tileUsage;
};

const ColorSchemeEditor: React.FC<ColorSchemeEditorProps> = ({ onClose, onColorChange }) => {
  const [palette, setPalette] = useState<GamePalette>(getPalette());
  const paletteColors = Object.keys(palette) as (keyof GamePalette)[];

  const currentMap = mapManager.getCurrentMap();
  const currentScheme = mapManager.getCurrentColorScheme();

  // Get current time context
  const currentTime = TimeManager.getCurrentTime();
  const currentSeason = currentTime.season.toLowerCase() as SeasonKey;
  // Even hours = day, odd hours = night (matches TimeManager logic)
  const currentTimeOfDay: TimeKey = currentTime.hour % 2 === 0 ? 'day' : 'night';

  const [selectedTile, setSelectedTile] = useState<TileColorKey>('grass');
  const [activeTab, setActiveTab] = useState<'quick' | 'advanced'>('quick');
  const [editedScheme, setEditedScheme] = useState<ColorScheme | null>(currentScheme);
  const [showExport, setShowExport] = useState(false);
  const [expandedTiles, setExpandedTiles] = useState<Set<TileColorKey>>(new Set());

  // Quick Edit: which season/time are we editing?
  const [editingSeason, setEditingSeason] = useState<SeasonKey | 'base'>(currentSeason);
  const [editingTime, setEditingTime] = useState<TimeKey | 'base'>(currentTimeOfDay);

  // Quick Edit: show palette picker for a specific tile
  const [showPalettePicker, setShowPalettePicker] = useState<TileColorKey | null>(null);

  // Analyze which tiles are actually used on this map
  const tileUsage = useMemo(() => {
    if (!currentMap) return new Map<TileColorKey, number>();
    return analyzeMapTiles(currentMap.grid);
  }, [currentMap?.id]);

  // Filter to show only tiles that exist on this map
  const relevantTiles = useMemo(() => {
    return TILE_TYPES.filter(tile => tileUsage.has(tile.key));
  }, [tileUsage]);

  // Filter to show only VISIBLE tiles (those where color actually matters)
  const visibleRelevantTiles = useMemo(() => {
    if (!currentMap) return [];
    return relevantTiles.filter(tile => isColorKeyVisible(tile.key, currentMap.grid));
  }, [relevantTiles, currentMap]);

  // Refresh palette display when colors change
  useEffect(() => {
    const interval = setInterval(() => {
      setPalette(getPalette());
    }, 100);
    return () => clearInterval(interval);
  }, []);


  // Update edited scheme when map changes
  useEffect(() => {
    setEditedScheme(mapManager.getCurrentColorScheme());
  }, [currentMap?.id]);

  if (!editedScheme || !currentMap) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg p-8 text-white">
          <p>No map loaded</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 rounded">Close</button>
        </div>
      </div>
    );
  }

  // Live update function - applies changes immediately
  const applyChangesLive = (newScheme: ColorScheme) => {
    console.log('[ColorSchemeEditor] Applying changes live:', newScheme.name);

    // Update the color scheme in MapManager
    mapManager.registerColorScheme(newScheme);

    // Force map reload to apply changes
    if (currentMap) {
      console.log('[ColorSchemeEditor] Reloading map:', currentMap.id);
      mapManager.loadMap(currentMap.id);

      // Notify App component to trigger TileRenderer re-render
      onColorChange();
    }
  };

  const handleQuickColorChange = (tileKey: TileColorKey, colorKey: keyof GamePalette) => {
    setEditedScheme(prev => {
      if (!prev) return prev;

      const newScheme = { ...prev };

      // For quick edit, we modify the color that's currently active
      // This could be base, seasonal, or time-of-day depending on current context

      // Check if there's a time-of-day override active
      if (prev.timeOfDayModifiers?.[currentTimeOfDay]?.[tileKey]) {
        newScheme.timeOfDayModifiers = {
          ...prev.timeOfDayModifiers,
          [currentTimeOfDay]: {
            ...prev.timeOfDayModifiers[currentTimeOfDay],
            [tileKey]: `bg-palette-${colorKey}`,
          },
        };
      }
      // Check if there's a seasonal override active
      else if (prev.seasonalModifiers?.[currentSeason]?.[tileKey]) {
        newScheme.seasonalModifiers = {
          ...prev.seasonalModifiers,
          [currentSeason]: {
            ...prev.seasonalModifiers[currentSeason],
            [tileKey]: `bg-palette-${colorKey}`,
          },
        };
      }
      // Otherwise modify base color
      else {
        newScheme.colors = {
          ...prev.colors,
          [tileKey]: `bg-palette-${colorKey}`,
        };
      }

      // Apply changes live
      applyChangesLive(newScheme);

      return newScheme;
    });
  };

  const handleBaseColorChange = (tileKey: TileColorKey, colorKey: keyof GamePalette) => {
    setEditedScheme(prev => {
      if (!prev) return prev;
      const newScheme = {
        ...prev,
        colors: {
          ...prev.colors,
          [tileKey]: `bg-palette-${colorKey}`,
        },
      };
      applyChangesLive(newScheme);
      return newScheme;
    });
  };

  const handleSeasonalColorChange = (season: SeasonKey, tileKey: TileColorKey, colorKey: keyof GamePalette | 'none') => {
    setEditedScheme(prev => {
      if (!prev) return prev;

      const newModifiers = { ...prev.seasonalModifiers };

      if (!newModifiers[season]) {
        newModifiers[season] = {};
      }

      if (colorKey === 'none') {
        // Remove the override
        delete newModifiers[season]![tileKey];
        // If season has no overrides, remove it
        if (Object.keys(newModifiers[season]!).length === 0) {
          delete newModifiers[season];
        }
      } else {
        newModifiers[season]![tileKey] = `bg-palette-${colorKey}`;
      }

      const newScheme = {
        ...prev,
        seasonalModifiers: Object.keys(newModifiers).length > 0 ? newModifiers : undefined,
      };
      applyChangesLive(newScheme);
      return newScheme;
    });
  };

  const handleTimeOfDayColorChange = (timeOfDay: TimeKey, tileKey: TileColorKey, colorKey: keyof GamePalette | 'none') => {
    setEditedScheme(prev => {
      if (!prev) return prev;

      const newModifiers = { ...prev.timeOfDayModifiers };

      if (!newModifiers[timeOfDay]) {
        newModifiers[timeOfDay] = {};
      }

      if (colorKey === 'none') {
        // Remove the override
        delete newModifiers[timeOfDay]![tileKey];
        // If timeOfDay has no overrides, remove it
        if (Object.keys(newModifiers[timeOfDay]!).length === 0) {
          delete newModifiers[timeOfDay];
        }
      } else {
        newModifiers[timeOfDay]![tileKey] = `bg-palette-${colorKey}`;
      }

      const newScheme = {
        ...prev,
        timeOfDayModifiers: Object.keys(newModifiers).length > 0 ? newModifiers : undefined,
      };
      applyChangesLive(newScheme);
      return newScheme;
    });
  };

  const exportScheme = () => {
    if (!editedScheme) return;

    const code = generateColorSchemeCode(editedScheme);
    navigator.clipboard.writeText(code).then(() => {
      alert('Color scheme code copied to clipboard!');
    });
  };

  const resetToOriginal = () => {
    if (!currentMap || !editedScheme) return;

    // Find the original color scheme from COLOR_SCHEMES
    const originalScheme = COLOR_SCHEMES[editedScheme.name];

    if (!originalScheme) {
      alert('Could not find original color scheme!');
      return;
    }

    if (confirm(`Reset to original ${originalScheme.name} color scheme? This will undo all your changes.`)) {
      // Create a deep copy of the original scheme
      const resetScheme: ColorScheme = {
        name: originalScheme.name,
        colors: { ...originalScheme.colors },
        seasonalModifiers: originalScheme.seasonalModifiers
          ? JSON.parse(JSON.stringify(originalScheme.seasonalModifiers))
          : undefined,
        timeOfDayModifiers: originalScheme.timeOfDayModifiers
          ? JSON.parse(JSON.stringify(originalScheme.timeOfDayModifiers))
          : undefined,
      };

      setEditedScheme(resetScheme);
      applyChangesLive(resetScheme);
    }
  };

  const generateColorSchemeCode = (scheme: ColorScheme): string => {
    let code = `  ${scheme.name}: {\n`;
    code += `    name: '${scheme.name}',\n`;
    code += `    colors: {\n`;

    Object.entries(scheme.colors).forEach(([key, value]) => {
      code += `      ${key}: '${value}',\n`;
    });

    code += `    },\n`;

    if (scheme.seasonalModifiers && Object.keys(scheme.seasonalModifiers).length > 0) {
      code += `    seasonalModifiers: {\n`;
      Object.entries(scheme.seasonalModifiers).forEach(([season, colors]) => {
        code += `      ${season}: {\n`;
        Object.entries(colors).forEach(([key, value]) => {
          code += `        ${key}: '${value}',\n`;
        });
        code += `      },\n`;
      });
      code += `    },\n`;
    }

    if (scheme.timeOfDayModifiers && Object.keys(scheme.timeOfDayModifiers).length > 0) {
      code += `    timeOfDayModifiers: {\n`;
      Object.entries(scheme.timeOfDayModifiers).forEach(([time, colors]) => {
        code += `      ${time}: {\n`;
        Object.entries(colors).forEach(([key, value]) => {
          code += `        ${key}: '${value}',\n`;
        });
        code += `      },\n`;
      });
      code += `    },\n`;
    }

    code += `  },`;
    return code;
  };

  const getCurrentColor = (tileKey: TileColorKey): string => {
    const baseColor = editedScheme.colors[tileKey];

    // Check for time of day override
    if (editedScheme.timeOfDayModifiers?.[currentTimeOfDay]?.[tileKey]) {
      return editedScheme.timeOfDayModifiers[currentTimeOfDay][tileKey]!;
    }

    // Check for seasonal override
    if (editedScheme.seasonalModifiers?.[currentSeason]?.[tileKey]) {
      return editedScheme.seasonalModifiers[currentSeason][tileKey]!;
    }

    return baseColor;
  };

  // Get color for a specific editing context (season/time)
  const getColorForContext = (tileKey: TileColorKey, season: SeasonKey | 'base', time: TimeKey | 'base'): string => {
    if (!editedScheme) return 'bg-palette-sage';

    // Check for time override first (if not base)
    if (time !== 'base' && editedScheme.timeOfDayModifiers?.[time]?.[tileKey]) {
      return editedScheme.timeOfDayModifiers[time][tileKey]!;
    }

    // Check for seasonal override (if not base)
    if (season !== 'base' && editedScheme.seasonalModifiers?.[season]?.[tileKey]) {
      return editedScheme.seasonalModifiers[season][tileKey]!;
    }

    // Fall back to base color
    return editedScheme.colors[tileKey];
  };

  // Set color for a specific editing context
  const setColorForContext = (tileKey: TileColorKey, paletteColorKey: keyof GamePalette, season: SeasonKey | 'base', time: TimeKey | 'base') => {
    console.log('[setColorForContext]', { tileKey, paletteColorKey, season, time });

    // Priority: Time > Season > Base
    // If user selected a specific time (not base), modify time-of-day
    if (time !== 'base') {
      console.log('[setColorForContext] Calling handleTimeOfDayColorChange');
      handleTimeOfDayColorChange(time, tileKey, paletteColorKey);
    }
    // If user selected a specific season (not base), modify seasonal
    else if (season !== 'base') {
      console.log('[setColorForContext] Calling handleSeasonalColorChange');
      handleSeasonalColorChange(season, tileKey, paletteColorKey);
    }
    // Otherwise, modify base colors
    else {
      console.log('[setColorForContext] Calling handleBaseColorChange');
      handleBaseColorChange(tileKey, paletteColorKey);
    }
  };

  const extractColorName = (colorClass: string): keyof GamePalette | null => {
    const match = colorClass.match(/bg-palette-(\w+)/);
    return match ? (match[1] as keyof GamePalette) : null;
  };

  const selectedTileData = TILE_TYPES.find(t => t.key === selectedTile)!;
  const currentColorClass = getCurrentColor(selectedTile);
  const currentColorName = extractColorName(currentColorClass);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2">
      <div className="bg-gray-800 rounded shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col text-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <div>
            <h2 className="text-base font-bold text-white">Colour Scheme Editor</h2>
            <p className="text-xs text-gray-400">
              {currentMap.name} • {visibleRelevantTiles.length} colours
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none px-2"
            title="Close (ESC)"
          >
            ×
          </button>
        </div>

        {/* Controls - Compact row */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Now:</span>
            <span className="px-1.5 py-0.5 bg-green-600/80 rounded text-white">{currentTime.season}</span>
            <span className="px-1.5 py-0.5 bg-blue-600/80 rounded text-white">{currentTime.timeOfDay}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={resetToOriginal}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
              title="Reset to original"
            >
              ↺
            </button>
            <button
              onClick={() => setShowExport(!showExport)}
              className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 rounded text-white text-xs"
              title="Export code"
            >
              {showExport ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Export View */}
        {showExport && (
          <div className="p-4 bg-gray-900 border-b border-gray-700">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  const paletteJson = exportPalette();
                  navigator.clipboard.writeText(paletteJson).then(() => {
                    alert('Palette JSON copied to clipboard!');
                  });
                }}
                className="px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-white text-sm font-semibold"
                title="Copy palette hex colors as JSON"
              >
                📋 Copy Palette JSON
              </button>
              <button
                onClick={exportScheme}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-semibold"
                title="Copy color scheme code for colorSchemes.ts"
              >
                📋 Copy Scheme Code
              </button>
            </div>
            <div className="bg-black rounded p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre">
                {generateColorSchemeCode(editedScheme)}
              </pre>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-700 bg-gray-900/50">
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-4 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'quick'
                  ? 'bg-gray-700 text-white border-b-2 border-green-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚡ Quick
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-4 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'advanced'
                  ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🔧 Advanced
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden flex">

            {/* Quick Edit Tab - Simple color picker interface */}
            {activeTab === 'quick' && (
              <div className="flex-1 overflow-y-auto">
                {/* Season/Time Selector */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-b border-purple-600/50 p-2">
                  <div className="text-xs text-white font-bold mb-1">
                    ✏️ Editing: {editingSeason === 'base' ? 'Base' : editingSeason} • {editingTime === 'base' ? 'Day' : 'Night'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Season Selector */}
                    <div>
                      <div className="text-[10px] text-gray-500 mb-0.5">Season</div>
                      <div className="grid grid-cols-5 gap-0.5">
                        <button
                          onClick={() => setEditingSeason('base')}
                          className={`px-1 py-0.5 text-[10px] rounded ${editingSeason === 'base' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                        >
                          Base
                        </button>
                        {(['spring', 'summer', 'autumn', 'winter'] as SeasonKey[]).map(season => (
                          <button
                            key={season}
                            onClick={() => setEditingSeason(season)}
                            className={`px-1 py-0.5 text-[10px] rounded capitalize ${
                              editingSeason === season
                                ? 'bg-green-600 text-white'
                                : season === currentSeason
                                ? 'bg-green-900/30 text-green-300'
                                : 'bg-gray-700 text-gray-300'
                            }`}
                          >
                            {season === currentSeason ? '●' : ''}{season.slice(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Selector */}
                    <div>
                      <div className="text-[10px] text-gray-500 mb-0.5">Time</div>
                      <div className="grid grid-cols-2 gap-0.5">
                        <button
                          onClick={() => setEditingTime('base')}
                          className={`px-1 py-0.5 text-[10px] rounded ${
                            editingTime === 'base'
                              ? 'bg-blue-600 text-white'
                              : currentTimeOfDay === 'day'
                              ? 'bg-blue-900/30 text-blue-300'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {currentTimeOfDay === 'day' ? '●' : ''}Day
                        </button>
                        <button
                          onClick={() => setEditingTime('night')}
                          className={`px-1 py-0.5 text-[10px] rounded ${
                            editingTime === 'night'
                              ? 'bg-orange-600 text-white'
                              : currentTimeOfDay === 'night'
                              ? 'bg-orange-900/30 text-orange-300'
                              : 'bg-gray-700 text-gray-300'
                          }`}
                        >
                          {currentTimeOfDay === 'night' ? '●' : ''}Night
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  {/* Table Layout */}
                  <table className="w-full text-xs">
                    <thead className="border-b border-gray-700 sticky top-0 bg-gray-800">
                      <tr className="text-[10px] text-gray-400">
                        <th className="text-left py-1 px-2">Tile</th>
                        <th className="text-center py-1 px-1">Count</th>
                        <th className="text-center py-1 px-1">Current</th>
                        <th className="text-center py-1 px-1">Default</th>
                        <th className="text-center py-1 px-1">Pick</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRelevantTiles.map(tile => {
                        // Get color for the current editing context
                        const editingColorClass = getColorForContext(tile.key, editingSeason, editingTime);
                        const editingColorName = extractColorName(editingColorClass);
                        const editingHex = editingColorName ? palette[editingColorName]?.hex : '#000000';
                        const count = tileUsage.get(tile.key) || 0;

                        // Get original color from COLOR_SCHEMES (base color always)
                        const originalScheme = COLOR_SCHEMES[editedScheme.name];
                        const originalColorClass = originalScheme?.colors[tile.key];
                        const originalColorName = originalColorClass ? extractColorName(originalColorClass) : null;
                        const originalHex = originalColorName ? palette[originalColorName]?.hex : '#000000';

                        const isPalettePickerOpen = showPalettePicker === tile.key;

                        return (
                          <React.Fragment key={tile.key}>
                            <tr className="border-b border-gray-700/50 hover:bg-gray-700/30">
                              {/* Tile Name */}
                              <td className="py-1 px-2 text-white font-semibold">{tile.label}</td>

                              {/* Count */}
                              <td className="py-1 px-1 text-center text-gray-400 text-[10px]">{count}</td>

                              {/* Current Color */}
                              <td className="py-1 px-1">
                                <div className="flex flex-col items-center gap-0.5">
                                  <div
                                    className="w-8 h-8 rounded border border-green-500"
                                    style={{ backgroundColor: editingHex }}
                                    title={editingColorName || ''}
                                  />
                                  <div className="text-[9px] text-white capitalize">{editingColorName}</div>
                                </div>
                              </td>

                              {/* Default Color */}
                              <td className="py-1 px-1">
                                <div className="flex flex-col items-center gap-0.5">
                                  <div
                                    className="w-8 h-8 rounded border border-gray-600 cursor-pointer hover:border-blue-500"
                                    style={{ backgroundColor: originalHex }}
                                    title={`Reset to ${originalColorName}`}
                                    onClick={() => {
                                      if (originalColorName) {
                                        setColorForContext(tile.key, originalColorName, editingSeason, editingTime);
                                      }
                                    }}
                                  />
                                  <div className="text-[9px] text-gray-400 capitalize">{originalColorName}</div>
                                </div>
                              </td>

                              {/* Pick Button */}
                              <td className="py-1 px-1">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => setShowPalettePicker(isPalettePickerOpen ? null : tile.key)}
                                    className="w-8 h-8 rounded border border-purple-500 hover:border-purple-400 bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center"
                                    title="Choose colour"
                                  >
                                    <span className="text-sm">🎨</span>
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Palette Picker Row */}
                            {isPalettePickerOpen && (
                              <tr>
                                <td colSpan={5} className="py-2 px-2 bg-gray-800/50 border-b border-gray-700">
                                  <div className="text-[10px] font-semibold text-white mb-1">Choose colour:</div>
                                  <div className="grid grid-cols-12 gap-1 mb-2">
                                    {paletteColors.map(colorKey => {
                                      const color = palette[colorKey];
                                      const isActive = editingColorName === colorKey;

                                      return (
                                        <button
                                          key={colorKey}
                                          onClick={() => {
                                            setColorForContext(tile.key, colorKey, editingSeason, editingTime);
                                            setShowPalettePicker(null);
                                          }}
                                          className={`p-0.5 rounded border ${
                                            isActive
                                              ? 'border-green-500'
                                              : 'border-gray-700 hover:border-purple-500'
                                          }`}
                                          title={colorKey}
                                        >
                                          <div
                                            className="w-full h-6 rounded"
                                            style={{ backgroundColor: color.hex }}
                                          />
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400">Custom:</span>
                                    <input
                                      type="color"
                                      value={editingHex}
                                      onChange={(e) => {
                                        if (editingColorName && editedScheme) {
                                          // Update the palette color
                                          updatePaletteColor(editingColorName, e.target.value);
                                          setPalette(getPalette());

                                          // Trigger map reload to show the change
                                          applyChangesLive(editedScheme);
                                        }
                                      }}
                                      className="h-6 w-12 rounded cursor-pointer border border-gray-600"
                                      title="Custom colour"
                                    />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Advanced Tab - Full control */}
            {activeTab === 'advanced' && (
              <div className="flex-1 overflow-hidden flex">
                {/* Left: Tile selector (shows ALL tiles) */}
                <div className="w-64 border-r border-gray-700 overflow-y-auto bg-gray-900/30">
                  <div className="p-2">
                    <div className="text-xs font-semibold text-gray-400 mb-2 px-2">
                      ALL TILE TYPES ({TILE_TYPES.length})
                    </div>
                    {TILE_TYPES.map(tile => {
                      const isActive = selectedTile === tile.key;
                      const colorClass = getCurrentColor(tile.key);
                      const colorName = extractColorName(colorClass);
                      const hexColor = colorName ? palette[colorName]?.hex : '#000000';
                      const count = tileUsage.get(tile.key);
                      const onThisMap = count !== undefined;
                      const isVisible = currentMap ? isColorKeyVisible(tile.key, currentMap.grid) : false;

                      return (
                        <button
                          key={tile.key}
                          onClick={() => setSelectedTile(tile.key)}
                          className={`w-full text-left p-2 rounded mb-1 transition-colors ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : onThisMap
                              ? 'hover:bg-gray-700 text-gray-200'
                              : 'hover:bg-gray-800 text-gray-500'
                          }`}
                          title={
                            !onThisMap
                              ? 'Not on this map'
                              : !isVisible
                              ? `${count} tiles (color hidden by sprites)`
                              : `${count} tiles on this map`
                          }
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded border ${onThisMap ? 'border-gray-600' : 'border-gray-800'}`}
                              style={{ backgroundColor: hexColor }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold truncate flex items-center gap-1">
                                {tile.label}
                                {onThisMap && <span className="text-xs">({count})</span>}
                                {onThisMap && !isVisible && <span className="text-xs text-yellow-500" title="Color hidden by sprite">👁️</span>}
                              </div>
                              <div className="text-xs text-gray-400 truncate">{colorName || 'none'}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Advanced editing options */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Sub-tabs for advanced features */}
                  <div className="flex border-b border-gray-700 bg-gray-800/50">
                    <button
                      onClick={() => setSelectedTile(selectedTile)} // Dummy to show we're in base color mode
                      className="px-4 py-2 font-semibold text-white bg-gray-700 border-b-2 border-blue-500 text-sm"
                    >
                      Base Color
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                    {/* Tile info header */}
                    <div className="mb-4 p-3 bg-gray-900/70 border border-gray-700 rounded">
                      <h3 className="text-lg font-bold text-white mb-1">{selectedTileData.label}</h3>
                      <p className="text-sm text-gray-400">{selectedTileData.description}</p>
                      <div className="mt-2 text-sm">
                        <span className="text-gray-400">Currently showing: </span>
                        <span className="text-white font-semibold">{currentColorName || 'none'}</span>
                        {tileUsage.get(selectedTile) && (
                          <span className="ml-2 text-gray-500">
                            • {tileUsage.get(selectedTile)} tiles on this map
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Base Color Selection */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-white mb-2">Base Color</h4>
                      <div className="mb-2 text-xs text-gray-400">
                        Select the default color for {selectedTileData.label.toLowerCase()} tiles:
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {paletteColors.map(colorKey => {
                          const color = palette[colorKey];
                          const isActive = editedScheme.colors[selectedTile] === `bg-palette-${colorKey}`;

                          return (
                            <button
                              key={colorKey}
                              onClick={() => handleBaseColorChange(selectedTile, colorKey)}
                              className={`p-2 rounded border-2 transition-all hover:scale-105 ${
                                isActive
                                  ? 'border-blue-500 shadow-lg'
                                  : 'border-gray-700 hover:border-gray-600'
                              }`}
                              title={`${colorKey} (${color.hex})`}
                            >
                              <div
                                className="w-full h-10 rounded mb-1"
                                style={{ backgroundColor: color.hex }}
                              />
                              <div className="text-xs font-semibold text-white truncate">{colorKey}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Seasonal Overrides */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-white mb-2">Seasonal Overrides (Optional)</h4>
                      <div className="mb-3 text-xs text-gray-400">
                        Override {selectedTileData.label.toLowerCase()} color for specific seasons:
                      </div>
                      <div className="space-y-3">
                        {(['spring', 'summer', 'autumn', 'winter'] as SeasonKey[]).map(season => {
                          const seasonalColor = editedScheme.seasonalModifiers?.[season]?.[selectedTile];
                          const activeColor = seasonalColor ? extractColorName(seasonalColor) : null;

                          return (
                            <div key={season} className="p-3 bg-gray-900/50 border border-gray-700 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-semibold text-white capitalize">{season}</h5>
                                {activeColor && (
                                  <button
                                    onClick={() => handleSeasonalColorChange(season, selectedTile, 'none')}
                                    className="text-xs text-red-400 hover:text-red-300"
                                  >
                                    ✕ Clear
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-8 gap-1">
                                {paletteColors.map(colorKey => {
                                  const color = palette[colorKey];
                                  const isActive = activeColor === colorKey;

                                  return (
                                    <button
                                      key={colorKey}
                                      onClick={() => handleSeasonalColorChange(season, selectedTile, colorKey)}
                                      className={`p-1 rounded border transition-all ${
                                        isActive
                                          ? 'border-green-500 shadow-lg'
                                          : 'border-gray-700 hover:border-gray-500'
                                      }`}
                                      title={colorKey}
                                    >
                                      <div
                                        className="w-full h-6 rounded"
                                        style={{ backgroundColor: color.hex }}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time of Day Overrides */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Night Override (Optional)</h4>
                      <div className="mb-3 text-xs text-gray-400">
                        Override {selectedTileData.label.toLowerCase()} colour at night (day uses base/seasonal colours):
                      </div>
                      <div className="space-y-3">
                        {(['night'] as TimeKey[]).map(time => {
                          const timeColor = editedScheme.timeOfDayModifiers?.[time]?.[selectedTile];
                          const activeColor = timeColor ? extractColorName(timeColor) : null;

                          return (
                            <div key={time} className="p-3 bg-gray-900/50 border border-gray-700 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="text-sm font-semibold text-white capitalize">{time}</h5>
                                {activeColor && (
                                  <button
                                    onClick={() => handleTimeOfDayColorChange(time, selectedTile, 'none')}
                                    className="text-xs text-red-400 hover:text-red-300"
                                  >
                                    ✕ Clear
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-8 gap-1">
                                {paletteColors.map(colorKey => {
                                  const color = palette[colorKey];
                                  const isActive = activeColor === colorKey;

                                  return (
                                    <button
                                      key={colorKey}
                                      onClick={() => handleTimeOfDayColorChange(time, selectedTile, colorKey)}
                                      className={`p-1 rounded border transition-all ${
                                        isActive
                                          ? 'border-green-500 shadow-lg'
                                          : 'border-gray-700 hover:border-gray-500'
                                      }`}
                                      title={colorKey}
                                    >
                                      <div
                                        className="w-full h-6 rounded"
                                        style={{ backgroundColor: color.hex }}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-900 to-gray-800 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400">
              <strong className="text-white">Quick Edit:</strong> Simple color pickers - Current, Default, Experiment •
              <strong className="text-white ml-2">Advanced:</strong> Palette grid with full seasonal/time control
            </div>
            <div className="text-xs text-gray-500">
              <strong className="text-red-400">↺ Reset</strong> to restore defaults •
              <strong className="text-purple-400">▼ Export</strong> to copy code
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorSchemeEditor;
