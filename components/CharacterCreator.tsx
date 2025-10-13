import React, { useState } from 'react';
import { CharacterCustomization, gameState } from '../GameState';
import { CHARACTER_PRESETS, generatePlaceholderSprites } from '../utils/placeholderSprites';
import { Direction } from '../types';

interface CharacterCreatorProps {
  onComplete: (character: CharacterCustomization) => void;
}

// Customization options
const SKIN_COLORS = [
  { id: 'pale', name: 'Pale', color: 'bg-amber-100' },
  { id: 'light', name: 'Light', color: 'bg-amber-200' },
  { id: 'medium', name: 'Medium', color: 'bg-amber-300' },
  { id: 'tan', name: 'Tan', color: 'bg-amber-500' },
  { id: 'dark', name: 'Dark', color: 'bg-amber-700' },
  { id: 'deep', name: 'Deep', color: 'bg-amber-900' },
];

const HAIR_STYLES = [
  { id: 'short', name: 'Short' },
  { id: 'long', name: 'Long' },
  { id: 'curly', name: 'Curly' },
  { id: 'spiky', name: 'Spiky' },
  { id: 'bald', name: 'Bald' },
];

const HAIR_COLORS = [
  { id: 'black', name: 'Black', color: 'bg-gray-900' },
  { id: 'brown', name: 'Brown', color: 'bg-amber-800' },
  { id: 'blonde', name: 'Blonde', color: 'bg-yellow-300' },
  { id: 'red', name: 'Red', color: 'bg-red-600' },
  { id: 'gray', name: 'Gray', color: 'bg-gray-400' },
  { id: 'white', name: 'White', color: 'bg-gray-100' },
  { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
  { id: 'green', name: 'Green', color: 'bg-green-500' },
  { id: 'purple', name: 'Purple', color: 'bg-purple-500' },
];

const EYE_COLORS = [
  { id: 'brown', name: 'Brown', color: 'bg-amber-800' },
  { id: 'blue', name: 'Blue', color: 'bg-blue-500' },
  { id: 'green', name: 'Green', color: 'bg-green-600' },
  { id: 'hazel', name: 'Hazel', color: 'bg-amber-600' },
  { id: 'gray', name: 'Gray', color: 'bg-gray-500' },
];

const CLOTHES_STYLES = [
  { id: 'shirt', name: 'T-Shirt' },
  { id: 'tunic', name: 'Tunic' },
  { id: 'dress', name: 'Dress' },
  { id: 'hoodie', name: 'Hoodie' },
  { id: 'vest', name: 'Vest' },
];

const CLOTHES_COLORS = [
  { id: 'red', name: 'Red', color: 'bg-red-600' },
  { id: 'blue', name: 'Blue', color: 'bg-blue-600' },
  { id: 'green', name: 'Green', color: 'bg-green-600' },
  { id: 'yellow', name: 'Yellow', color: 'bg-yellow-500' },
  { id: 'purple', name: 'Purple', color: 'bg-purple-600' },
  { id: 'orange', name: 'Orange', color: 'bg-orange-600' },
  { id: 'pink', name: 'Pink', color: 'bg-pink-500' },
  { id: 'black', name: 'Black', color: 'bg-gray-900' },
  { id: 'white', name: 'White', color: 'bg-gray-100' },
];

const SHOES_STYLES = [
  { id: 'boots', name: 'Boots' },
  { id: 'sneakers', name: 'Sneakers' },
  { id: 'sandals', name: 'Sandals' },
  { id: 'shoes', name: 'Shoes' },
];

const SHOES_COLORS = [
  { id: 'brown', name: 'Brown', color: 'bg-amber-800' },
  { id: 'black', name: 'Black', color: 'bg-gray-900' },
  { id: 'white', name: 'White', color: 'bg-gray-100' },
  { id: 'red', name: 'Red', color: 'bg-red-600' },
  { id: 'blue', name: 'Blue', color: 'bg-blue-600' },
];

const GLASSES_OPTIONS = [
  { id: 'none', name: 'None' },
  { id: 'round', name: 'Round' },
  { id: 'square', name: 'Square' },
  { id: 'sunglasses', name: 'Sunglasses' },
];

const WEAPON_OPTIONS = [
  { id: 'sword', name: 'Sword', emoji: '⚔️' },
  { id: 'axe', name: 'Axe', emoji: '🪓' },
  { id: 'bow', name: 'Bow', emoji: '🏹' },
  { id: 'staff', name: 'Staff', emoji: '🪄' },
];

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onComplete }) => {
  // Load existing character data if available (for editing mode)
  const existingCharacter = gameState.getSelectedCharacter();

  const [character, setCharacter] = useState<CharacterCustomization>(
    existingCharacter || {
      name: '',
      skin: 'medium',
      hairStyle: 'short',
      hairColor: 'brown',
      eyeColor: 'brown',
      clothesStyle: 'shirt',
      clothesColor: 'blue',
      shoesStyle: 'boots',
      shoesColor: 'brown',
      glasses: 'none',
      weapon: 'sword',
    }
  );

  const isEditMode = existingCharacter !== null;

  const [expandedSection, setExpandedSection] = useState<string>('appearance');

  const updateCharacter = (field: keyof CharacterCustomization, value: string) => {
    setCharacter({ ...character, [field]: value });
  };

  const randomize = () => {
    setCharacter({
      name: character.name, // Keep the name
      skin: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)].id,
      hairStyle: HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id,
      hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id,
      eyeColor: EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)].id,
      clothesStyle: CLOTHES_STYLES[Math.floor(Math.random() * CLOTHES_STYLES.length)].id,
      clothesColor: CLOTHES_COLORS[Math.floor(Math.random() * CLOTHES_COLORS.length)].id,
      shoesStyle: SHOES_STYLES[Math.floor(Math.random() * SHOES_STYLES.length)].id,
      shoesColor: SHOES_COLORS[Math.floor(Math.random() * SHOES_COLORS.length)].id,
      glasses: GLASSES_OPTIONS[Math.floor(Math.random() * GLASSES_OPTIONS.length)].id,
      weapon: WEAPON_OPTIONS[Math.floor(Math.random() * WEAPON_OPTIONS.length)].id,
    });
  };

  const handleSubmit = () => {
    if (character.name.trim()) {
      onComplete(character);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? '' : section);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex items-center justify-center z-50 overflow-hidden">
      <div className="w-full h-full flex flex-col md:flex-row">
        {/* Left Panel - Character Preview (hidden on mobile, shown on desktop) */}
        <div className="hidden md:flex md:w-1/2 bg-slate-800 flex-col items-center justify-center p-8 border-r border-slate-600">
          <h2 className="text-3xl font-bold text-teal-300 mb-8">
            {isEditMode ? 'Customize Your Character' : 'Create Your Character'}
          </h2>

          {/* Character Preview */}
          <div className="relative w-96 h-96 bg-slate-700 rounded-lg border-4 border-slate-600 mb-4 flex items-center justify-center">
            {/* Show actual character sprite if using custom character */}
            <div className="relative flex items-center justify-center">
              <img
                src="/TwilightGame/assets/character1/base/down_0.png"
                alt="Character Preview"
                className="w-80 h-80"
                style={{ imageRendering: 'pixelated' }}
              />
              {/* Weapon indicator */}
              <div className="absolute -right-12 bottom-8 text-4xl">
                {WEAPON_OPTIONS.find(w => w.id === character.weapon)?.emoji}
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{character.name || 'Enter Name'}</p>
            <p className="text-sm text-gray-400 mt-2">
              {WEAPON_OPTIONS.find(w => w.id === character.weapon)?.name} Wielder
            </p>
          </div>
        </div>

        {/* Right Panel - Customization Options */}
        <div className="w-full md:w-1/2 bg-slate-900 overflow-y-auto">
          {/* Mobile header with small preview */}
          <div className="md:hidden bg-slate-800 p-4 border-b border-slate-600 sticky top-0 z-10">
            <h2 className="text-xl font-bold text-teal-300 mb-3 text-center">
              {isEditMode ? 'Customize Your Character' : 'Create Your Character'}
            </h2>
            <div className="flex items-center justify-center gap-4">
              <img
                src="/TwilightGame/assets/character1/base/down_0.png"
                alt="Character Preview"
                className="w-20 h-20"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="text-left">
                <p className="text-lg font-bold text-yellow-400">{character.name || 'Enter Name'}</p>
                <p className="text-xs text-gray-400">
                  {WEAPON_OPTIONS.find(w => w.id === character.weapon)?.name} Wielder
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Base Character Selection */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <label className="block text-sm font-bold text-teal-300 mb-3">Choose Your Character</label>
              <div className="grid grid-cols-2 gap-4">
                {/* Character 1 - Your daughter's character */}
                <button
                  onClick={() => setCharacter({ ...character, name: character.name || 'Character 1' })}
                  className={`flex flex-col items-center p-4 bg-slate-700 hover:bg-slate-600 rounded-lg border-2 transition-all ${
                    character.name === 'Character 1' ? 'border-teal-400' : 'border-transparent hover:border-teal-400'
                  }`}
                >
                  <img
                    src="/TwilightGame/assets/character1/base/down_0.png"
                    alt="Character 1"
                    className="w-24 h-24 mb-2"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="text-sm text-white font-medium">Character 1</span>
                </button>

                {/* Coming Soon placeholder for Character 2 */}
                <button
                  disabled
                  className="flex flex-col items-center p-4 bg-slate-700 opacity-50 rounded-lg border-2 border-transparent cursor-not-allowed"
                >
                  <div className="w-16 h-16 mb-2 bg-slate-600 rounded flex items-center justify-center text-2xl">
                    ?
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Coming Soon</span>
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Select your base character</p>
            </div>

            {/* Character Presets */}
            {!isEditMode && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                <label className="block text-sm font-bold text-teal-300 mb-3">Quick Start Presets</label>
                <div className="grid grid-cols-3 gap-3">
                  {CHARACTER_PRESETS.map((preset, index) => {
                    const presetSprites = generatePlaceholderSprites(preset);
                    const presetSprite = presetSprites[Direction.Down][0];

                    return (
                      <button
                        key={index}
                        onClick={() => setCharacter({ ...preset, name: character.name })}
                        className="flex flex-col items-center p-3 bg-slate-700 hover:bg-slate-600 rounded-lg border-2 border-transparent hover:border-teal-400 transition-all"
                      >
                        <img
                          src={presetSprite}
                          alt={preset.name}
                          className="w-12 h-12 mb-2"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <span className="text-xs text-white font-medium">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Or try these placeholder presets</p>
              </div>
            )}

            {/* Name Input */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
              <label className="block text-sm font-bold text-teal-300 mb-2">Character Name</label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => updateCharacter('name', e.target.value)}
                placeholder="Enter your name..."
                maxLength={20}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded border border-slate-600 focus:outline-none focus:border-teal-400"
              />
            </div>

            {/* Appearance Section */}
            <div className="bg-slate-800 rounded-lg border border-slate-600">
              <button
                onClick={() => toggleSection('appearance')}
                className="w-full p-4 text-left font-bold text-teal-300 hover:bg-slate-700 transition-colors flex justify-between items-center"
              >
                <span>👤 Appearance</span>
                <span>{expandedSection === 'appearance' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'appearance' && (
                <div className="p-4 space-y-4">
                  {/* Skin */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Skin Tone</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SKIN_COLORS.map((skin) => (
                        <button
                          key={skin.id}
                          onClick={() => updateCharacter('skin', skin.id)}
                          className={`p-2 rounded border-2 transition-all ${
                            character.skin === skin.id
                              ? 'border-teal-400 scale-105'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-full h-8 ${skin.color} rounded`} />
                          <p className="text-xs mt-1">{skin.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hair Style */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Hair Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {HAIR_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => updateCharacter('hairStyle', style.id)}
                          className={`p-3 rounded border-2 transition-all ${
                            character.hairStyle === style.id
                              ? 'border-teal-400 bg-slate-700'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <p className="text-sm">{style.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hair Color */}
                  {character.hairStyle !== 'bald' && (
                    <div>
                      <label className="block text-sm font-semibold mb-2">Hair Color</label>
                      <div className="grid grid-cols-3 gap-2">
                        {HAIR_COLORS.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => updateCharacter('hairColor', color.id)}
                            className={`p-2 rounded border-2 transition-all ${
                              character.hairColor === color.id
                                ? 'border-teal-400 scale-105'
                                : 'border-slate-600 hover:border-slate-400'
                            }`}
                          >
                            <div className={`w-full h-6 ${color.color} rounded`} />
                            <p className="text-xs mt-1">{color.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Eye Color */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Eye Color</label>
                    <div className="grid grid-cols-3 gap-2">
                      {EYE_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => updateCharacter('eyeColor', color.id)}
                          className={`p-2 rounded border-2 transition-all ${
                            character.eyeColor === color.id
                              ? 'border-teal-400 scale-105'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-full h-6 ${color.color} rounded-full`} />
                          <p className="text-xs mt-1">{color.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clothing Section */}
            <div className="bg-slate-800 rounded-lg border border-slate-600">
              <button
                onClick={() => toggleSection('clothing')}
                className="w-full p-4 text-left font-bold text-teal-300 hover:bg-slate-700 transition-colors flex justify-between items-center"
              >
                <span>👕 Clothing</span>
                <span>{expandedSection === 'clothing' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'clothing' && (
                <div className="p-4 space-y-4">
                  {/* Clothes Style */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Top Style</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CLOTHES_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => updateCharacter('clothesStyle', style.id)}
                          className={`p-3 rounded border-2 transition-all ${
                            character.clothesStyle === style.id
                              ? 'border-teal-400 bg-slate-700'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <p className="text-sm">{style.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clothes Color */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Top Color</label>
                    <div className="grid grid-cols-3 gap-2">
                      {CLOTHES_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => updateCharacter('clothesColor', color.id)}
                          className={`p-2 rounded border-2 transition-all ${
                            character.clothesColor === color.id
                              ? 'border-teal-400 scale-105'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-full h-8 ${color.color} rounded`} />
                          <p className="text-xs mt-1">{color.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shoes Style */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Footwear</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SHOES_STYLES.map((style) => (
                        <button
                          key={style.id}
                          onClick={() => updateCharacter('shoesStyle', style.id)}
                          className={`p-3 rounded border-2 transition-all ${
                            character.shoesStyle === style.id
                              ? 'border-teal-400 bg-slate-700'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <p className="text-sm">{style.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shoes Color */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Footwear Color</label>
                    <div className="grid grid-cols-3 gap-2">
                      {SHOES_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => updateCharacter('shoesColor', color.id)}
                          className={`p-2 rounded border-2 transition-all ${
                            character.shoesColor === color.id
                              ? 'border-teal-400 scale-105'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-full h-6 ${color.color} rounded`} />
                          <p className="text-xs mt-1">{color.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Accessories Section */}
            <div className="bg-slate-800 rounded-lg border border-slate-600">
              <button
                onClick={() => toggleSection('accessories')}
                className="w-full p-4 text-left font-bold text-teal-300 hover:bg-slate-700 transition-colors flex justify-between items-center"
              >
                <span>👓 Accessories</span>
                <span>{expandedSection === 'accessories' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'accessories' && (
                <div className="p-4 space-y-4">
                  {/* Glasses */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Glasses</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GLASSES_OPTIONS.map((glasses) => (
                        <button
                          key={glasses.id}
                          onClick={() => updateCharacter('glasses', glasses.id)}
                          className={`p-3 rounded border-2 transition-all ${
                            character.glasses === glasses.id
                              ? 'border-teal-400 bg-slate-700'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <p className="text-sm">{glasses.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Equipment Section */}
            <div className="bg-slate-800 rounded-lg border border-slate-600">
              <button
                onClick={() => toggleSection('equipment')}
                className="w-full p-4 text-left font-bold text-teal-300 hover:bg-slate-700 transition-colors flex justify-between items-center"
              >
                <span>⚔️ Starter Equipment</span>
                <span>{expandedSection === 'equipment' ? '▼' : '▶'}</span>
              </button>
              {expandedSection === 'equipment' && (
                <div className="p-4 space-y-4">
                  {/* Weapon */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">Weapon</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEAPON_OPTIONS.map((weapon) => (
                        <button
                          key={weapon.id}
                          onClick={() => updateCharacter('weapon', weapon.id)}
                          className={`p-4 rounded border-2 transition-all ${
                            character.weapon === weapon.id
                              ? 'border-teal-400 bg-slate-700'
                              : 'border-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <div className="text-3xl mb-1">{weapon.emoji}</div>
                          <p className="text-sm">{weapon.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-slate-900 pt-4 pb-2 space-y-2">
              <button
                onClick={randomize}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                🎲 Randomize
              </button>
              {isEditMode && (
                <button
                  onClick={() => onComplete(existingCharacter!)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  ← Cancel
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!character.name.trim()}
                className={`w-full font-bold py-4 px-6 rounded-lg transition-all text-lg ${
                  character.name.trim()
                    ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-teal-500/50'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isEditMode ? '✨ Save Changes' : '✨ Start Adventure'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreator;
