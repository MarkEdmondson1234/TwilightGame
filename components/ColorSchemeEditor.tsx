import React, { useState, useEffect } from 'react';
import { getPalette, GamePalette, updatePaletteColor, exportPalette, PaletteColor } from '../palette';
import { TimeManager, Season } from '../utils/TimeManager';
import { mapManager } from '../maps';
import { ColorScheme } from '../types';

interface ColorSchemeEditorProps {
  onClose: () => void;
}

type TileColorKey = keyof ColorScheme['colors'];
type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';
type TimeKey = 'day' | 'night';

const TILE_TYPES: { key: TileColorKey; label: string; description: string }[] = [
  { key: 'grass', label: 'Grass', description: 'Ground/outdoor grass tiles' },
  { key: 'rock', label: 'Rock', description: 'Rock tiles (usually matches grass)' },
  { key: 'water', label: 'Water', description: 'Water/pond tiles' },
  { key: 'path', label: 'Path', description: 'Path background (stepping stones)' },
  { key: 'floor', label: 'Floor', description: 'Indoor floor tiles' },
  { key: 'wall', label: 'Wall', description: 'Indoor wall tiles' },
  { key: 'carpet', label: 'Carpet', description: 'Indoor carpet tiles' },
  { key: 'door', label: 'Door', description: 'Door tiles' },
  { key: 'special', label: 'Special', description: 'Special tiles (exits, mine entrance)' },
  { key: 'furniture', label: 'Furniture', description: 'Tables, chairs' },
  { key: 'mushroom', label: 'Mushroom', description: 'Decorative mushrooms' },
  { key: 'background', label: 'Background', description: 'Map background color' },
];

const ColorSchemeEditor: React.FC<ColorSchemeEditorProps> = ({ onClose }) => {
  const [palette, setPalette] = useState<GamePalette>(getPalette());
  const paletteColors = Object.keys(palette) as (keyof GamePalette)[];

  const currentMap = mapManager.getCurrentMap();
  const currentScheme = mapManager.getCurrentColorScheme();

  const [selectedTile, setSelectedTile] = useState<TileColorKey>('grass');
  const [activeTab, setActiveTab] = useState<'palette' | 'base' | 'seasonal' | 'timeOfDay'>('palette');
  const [editedScheme, setEditedScheme] = useState<ColorScheme | null>(currentScheme);
  const [showExport, setShowExport] = useState(false);
  const [selectedPaletteColor, setSelectedPaletteColor] = useState<keyof GamePalette | null>(null);

  // Refresh palette display when colors change
  useEffect(() => {
    const interval = setInterval(() => {
      setPalette(getPalette());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const currentTime = TimeManager.getCurrentTime();
  const currentSeason = currentTime.season.toLowerCase() as SeasonKey;
  const currentTimeOfDay = currentTime.timeOfDay.toLowerCase() as TimeKey;

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

  const handleBaseColorChange = (tileKey: TileColorKey, colorKey: keyof GamePalette) => {
    setEditedScheme(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        colors: {
          ...prev.colors,
          [tileKey]: `bg-palette-${colorKey}`,
        },
      };
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

      return {
        ...prev,
        seasonalModifiers: Object.keys(newModifiers).length > 0 ? newModifiers : undefined,
      };
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

      return {
        ...prev,
        timeOfDayModifiers: Object.keys(newModifiers).length > 0 ? newModifiers : undefined,
      };
    });
  };

  const applyChanges = () => {
    if (!editedScheme) return;

    // Update the color scheme in MapManager
    mapManager.registerColorScheme(editedScheme);

    // Force map reload to apply changes
    if (currentMap) {
      mapManager.loadMap(currentMap.id);
    }

    // TODO: Save to GameState
    alert('Changes applied! Walk around to see the effect.');
  };

  const exportScheme = () => {
    if (!editedScheme) return;

    const code = generateColorSchemeCode(editedScheme);
    navigator.clipboard.writeText(code).then(() => {
      alert('Color scheme code copied to clipboard!');
    });
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

  const extractColorName = (colorClass: string): keyof GamePalette | null => {
    const match = colorClass.match(/bg-palette-(\w+)/);
    return match ? (match[1] as keyof GamePalette) : null;
  };

  const selectedTileData = TILE_TYPES.find(t => t.key === selectedTile)!;
  const currentColorClass = getCurrentColor(selectedTile);
  const currentColorName = extractColorName(currentColorClass);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Color Scheme Editor</h2>
            <p className="text-sm text-gray-400">
              Map: {currentMap.name} ({editedScheme.name} scheme)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Current Context */}
        <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-400">Season: </span>
              <span className="text-white font-semibold">{currentTime.season}</span>
              <span className="text-gray-400 ml-4">Time: </span>
              <span className="text-white font-semibold">{currentTime.timeOfDay}</span>
            </div>
            <div className="text-xs text-gray-500">
              Changes apply immediately - walk around to see the effect!
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-700">
          <button
            onClick={applyChanges}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white font-semibold"
          >
            ✓ Apply Scheme
          </button>
          <button
            onClick={() => {
              const paletteJson = exportPalette();
              navigator.clipboard.writeText(paletteJson).then(() => {
                alert('Palette colors copied to clipboard!');
              });
            }}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-white font-semibold"
          >
            Copy Palette
          </button>
          <button
            onClick={exportScheme}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
          >
            Copy Scheme
          </button>
          <button
            onClick={() => setShowExport(!showExport)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white font-semibold"
          >
            {showExport ? 'Hide' : 'Show'} Export
          </button>
        </div>

        {/* Export View */}
        {showExport && (
          <div className="p-4 bg-gray-900 border-b border-gray-700">
            <div className="mb-2 text-sm font-semibold text-gray-400">
              Code for maps/colorSchemes.ts:
            </div>
            <div className="bg-black rounded p-3 max-h-48 overflow-y-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre">
                {generateColorSchemeCode(editedScheme)}
              </pre>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Tile Type List */}
          <div className="w-64 border-r border-gray-700 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-400 mb-2 px-2">TILE TYPES</div>
              {TILE_TYPES.map(tile => {
                const isActive = selectedTile === tile.key;
                const colorClass = getCurrentColor(tile.key);
                const colorName = extractColorName(colorClass);
                const hexColor = colorName ? palette[colorName]?.hex : '#000000';

                return (
                  <button
                    key={tile.key}
                    onClick={() => setSelectedTile(tile.key)}
                    className={`w-full text-left p-2 rounded mb-1 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-600"
                        style={{ backgroundColor: hexColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{tile.label}</div>
                        <div className="text-xs text-gray-400 truncate">{colorName || 'none'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Color Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab('palette')}
                className={`px-6 py-3 font-semibold transition-colors ${
                  activeTab === 'palette'
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🎨 Edit Palette
              </button>
              <button
                onClick={() => setActiveTab('base')}
                className={`px-6 py-3 font-semibold transition-colors ${
                  activeTab === 'base'
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Base Color
              </button>
              <button
                onClick={() => setActiveTab('seasonal')}
                className={`px-6 py-3 font-semibold transition-colors ${
                  activeTab === 'seasonal'
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Seasonal
              </button>
              <button
                onClick={() => setActiveTab('timeOfDay')}
                className={`px-6 py-3 font-semibold transition-colors ${
                  activeTab === 'timeOfDay'
                    ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Day/Night
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Palette Tab - Edit hex colors */}
              {activeTab === 'palette' && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-white mb-1">Edit Palette Colors</h3>
                    <p className="text-sm text-gray-400">
                      Change the actual hex colors in the palette. These changes apply everywhere this color is used.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {paletteColors.map(colorKey => {
                      const color = palette[colorKey] as PaletteColor;
                      const isSelected = selectedPaletteColor === colorKey;

                      return (
                        <div
                          key={colorKey}
                          className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 shadow-lg shadow-blue-500/50'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => setSelectedPaletteColor(colorKey)}
                        >
                          {/* Color Preview */}
                          <div
                            className="h-20 w-full"
                            style={{ backgroundColor: color.hex }}
                          />

                          {/* Color Info */}
                          <div className="p-2 bg-gray-900">
                            <div className="text-xs font-semibold text-white mb-1">
                              {colorKey}
                            </div>
                            <div className="text-xs text-gray-400 mb-2">
                              {color.description}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={color.hex}
                                onChange={(e) => {
                                  updatePaletteColor(colorKey, e.target.value);
                                  setPalette(getPalette());
                                }}
                                className="w-8 h-8 rounded cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <input
                                type="text"
                                value={color.hex}
                                onChange={(e) => {
                                  if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                    updatePaletteColor(colorKey, e.target.value);
                                    setPalette(getPalette());
                                  }
                                }}
                                className="flex-1 px-2 py-1 bg-black border border-gray-700 rounded text-xs font-mono text-white"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded">
                    <p className="text-sm text-blue-300">
                      💡 <strong>Tip:</strong> First customize your palette colors here, then use the other tabs to map them to tiles!
                    </p>
                  </div>
                </div>
              )}

              {/* Tile-specific tabs only show when not on palette tab */}
              {activeTab !== 'palette' && (
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-1">{selectedTileData.label}</h3>
                  <p className="text-sm text-gray-400">{selectedTileData.description}</p>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-400">Currently showing: </span>
                    <span className="text-white font-semibold">{currentColorName || 'none'}</span>
                  </div>
                </div>
              )}

              {/* Base Color Tab */}
              {activeTab === 'base' && (
                <div>
                  <div className="mb-3 text-sm text-gray-400">
                    Select the base color for {selectedTileData.label.toLowerCase()} tiles:
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {paletteColors.map(colorKey => {
                      const color = palette[colorKey];
                      const isActive = editedScheme.colors[selectedTile] === `bg-palette-${colorKey}`;

                      return (
                        <button
                          key={colorKey}
                          onClick={() => handleBaseColorChange(selectedTile, colorKey)}
                          className={`p-3 rounded border-2 transition-all ${
                            isActive
                              ? 'border-blue-500 shadow-lg'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div
                            className="w-full h-12 rounded mb-2"
                            style={{ backgroundColor: color.hex }}
                          />
                          <div className="text-xs font-semibold text-white">{colorKey}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Seasonal Tab */}
              {activeTab === 'seasonal' && (
                <div>
                  <div className="mb-3 text-sm text-gray-400">
                    Override {selectedTileData.label.toLowerCase()} color for specific seasons (optional):
                  </div>
                  {(['spring', 'summer', 'autumn', 'winter'] as SeasonKey[]).map(season => {
                    const seasonalColor = editedScheme.seasonalModifiers?.[season]?.[selectedTile];
                    const activeColor = seasonalColor ? extractColorName(seasonalColor) : null;

                    return (
                      <div key={season} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-white capitalize">{season}</h4>
                          {activeColor && (
                            <button
                              onClick={() => handleSeasonalColorChange(season, selectedTile, 'none')}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Clear Override
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {paletteColors.map(colorKey => {
                            const color = palette[colorKey];
                            const isActive = activeColor === colorKey;

                            return (
                              <button
                                key={colorKey}
                                onClick={() => handleSeasonalColorChange(season, selectedTile, colorKey)}
                                className={`p-2 rounded border transition-all ${
                                  isActive
                                    ? 'border-blue-500 shadow-lg'
                                    : 'border-gray-700 hover:border-gray-600'
                                }`}
                                title={colorKey}
                              >
                                <div
                                  className="w-full h-8 rounded"
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
              )}

              {/* Time of Day Tab */}
              {activeTab === 'timeOfDay' && (
                <div>
                  <div className="mb-3 text-sm text-gray-400">
                    Override {selectedTileData.label.toLowerCase()} color for day/night (optional):
                  </div>
                  {(['day', 'night'] as TimeKey[]).map(time => {
                    const timeColor = editedScheme.timeOfDayModifiers?.[time]?.[selectedTile];
                    const activeColor = timeColor ? extractColorName(timeColor) : null;

                    return (
                      <div key={time} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-white capitalize">{time}</h4>
                          {activeColor && (
                            <button
                              onClick={() => handleTimeOfDayColorChange(time, selectedTile, 'none')}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Clear Override
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {paletteColors.map(colorKey => {
                            const color = palette[colorKey];
                            const isActive = activeColor === colorKey;

                            return (
                              <button
                                key={colorKey}
                                onClick={() => handleTimeOfDayColorChange(time, selectedTile, colorKey)}
                                className={`p-2 rounded border transition-all ${
                                  isActive
                                    ? 'border-blue-500 shadow-lg'
                                    : 'border-gray-700 hover:border-gray-600'
                                }`}
                                title={colorKey}
                              >
                                <div
                                  className="w-full h-8 rounded"
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
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900 border-t border-gray-700 text-sm text-gray-400">
          <div className="mb-2 font-semibold text-white">How to use:</div>
          <ul className="space-y-1 text-xs">
            <li>• <strong className="text-white">🎨 Edit Palette</strong> - Customize the actual hex colors (e.g., make sage greener)</li>
            <li>• <strong className="text-white">Base Color</strong> - Choose which palette color each tile type uses</li>
            <li>• <strong className="text-white">Seasonal</strong> - Override tile colors per season (optional)</li>
            <li>• <strong className="text-white">Day/Night</strong> - Override tile colors for day/night (optional)</li>
            <li>• Click <strong className="text-green-400">"Apply Scheme"</strong> to see tile mapping changes immediately</li>
            <li>• Click <strong className="text-orange-400">"Copy Palette"</strong> to get hex values for palette.ts</li>
            <li>• Click <strong className="text-blue-400">"Copy Scheme"</strong> to get tile mappings for colorSchemes.ts</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ColorSchemeEditor;
