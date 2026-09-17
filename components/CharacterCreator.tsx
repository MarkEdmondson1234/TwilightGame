import React, { useState } from 'react';
import { CharacterCustomization, gameState } from '../GameState';
import {
  DEFAULT_OUTFIT,
  getOutfits,
  getSpriteDir,
  resolveOutfit,
} from '../utils/characterOutfits';
import { getItem } from '../data/items';
import { Z_CHARACTER_CREATOR, zClass } from '../zIndex';

interface CharacterCreatorProps {
  onComplete: (character: CharacterCustomization) => void;
}

const CHARACTER_OPTIONS = [
  { id: 'character1', label: 'Boy' },
  { id: 'character2', label: 'Girl' },
];

const CharacterCreator: React.FC<CharacterCreatorProps> = ({ onComplete }) => {
  const existingCharacter = gameState.getSelectedCharacter();
  const isEditMode = existingCharacter !== null;

  const [selectedId, setSelectedId] = useState(existingCharacter?.characterId || 'character1');
  // Outfits are unlocked by owning their clothing item (bought from Mushra's
  // shop) — chips only show for outfits in the bag, so the creator never
  // offers clothes the player has not bought.
  const ownedOutfitIds = new Set(
    gameState
      .loadInventory()
      .items.map((invItem) => getItem(invItem.itemId)?.outfitId)
      .filter((id): id is string => typeof id === 'string')
  );
  // Worn costume — only meaningful for characters with owned outfits.
  // Resolved on read so a save carrying an unknown/foreign id starts sensibly,
  // and dropped to everyday if the worn costume is somehow not owned.
  const [outfitId, setOutfitId] = useState(() => {
    if (!existingCharacter) return DEFAULT_OUTFIT;
    const worn = resolveOutfit(existingCharacter.characterId, existingCharacter.outfit);
    return worn === DEFAULT_OUTFIT || ownedOutfitIds.has(worn) ? worn : DEFAULT_OUTFIT;
  });
  const [name, setName] = useState(existingCharacter?.name || '');

  const outfitChoices = getOutfits(selectedId).filter((outfit) =>
    ownedOutfitIds.has(outfit.id)
  );
  /** Card/chip preview: the chosen costume's set, or the character's base art. */
  const previewUrl = (characterId: string, outfit: string) =>
    `/TwilightGame/assets/${getSpriteDir(characterId, outfit)}/down_0.png`;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onComplete({
      characterId: selectedId,
      outfit: outfitId,
      name: name.trim(),
      // Defaults for backward compatibility with CharacterCustomization interface
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
    });
  };

  return (
    <div
      className={`fixed inset-0 bg-slate-900 text-white flex items-center justify-center ${zClass(Z_CHARACTER_CREATOR)}`}
    >
      <div className="w-full max-w-lg mx-4 flex flex-col items-center gap-6 p-6">
        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-teal-300 text-center">
          {isEditMode ? 'Change Your Character' : 'Choose Your Character'}
        </h2>

        {/* Character Cards */}
        <div className="flex gap-4 sm:gap-6 w-full justify-center">
          {CHARACTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setSelectedId(option.id);
                // A costume belongs to one character — reset rather than carry
                // a foreign id into the next selection.
                setOutfitId(DEFAULT_OUTFIT);
              }}
              className={`flex flex-col items-center p-4 sm:p-6 rounded-xl border-3 transition-all flex-1 max-w-[200px] ${
                selectedId === option.id
                  ? 'border-teal-400 bg-slate-700 shadow-lg shadow-teal-500/20 scale-105'
                  : 'border-slate-600 bg-slate-800 hover:border-slate-400 hover:bg-slate-750'
              }`}
            >
              <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mb-3">
                <img
                  src={
                    selectedId === option.id && outfitChoices.length > 0
                      ? previewUrl(option.id, outfitId)
                      : `/TwilightGame/assets/${option.id}/base/down_0.png`
                  }
                  alt={option.label}
                  className="w-full h-full object-contain"
                />
              </div>
              <span
                className={`text-lg sm:text-xl font-bold ${
                  selectedId === option.id ? 'text-teal-300' : 'text-slate-300'
                }`}
              >
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* Outfit Picker — shown when the selected character has costumes */}
        {outfitChoices.length > 0 && (
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={() => setOutfitId(DEFAULT_OUTFIT)}
              className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all w-24 ${
                outfitId === DEFAULT_OUTFIT
                  ? 'border-teal-400 bg-slate-700'
                  : 'border-slate-600 bg-slate-800 hover:border-slate-400'
              }`}
            >
              <img
                src={previewUrl(selectedId, DEFAULT_OUTFIT)}
                alt="Everyday"
                className="w-14 h-14 object-contain"
              />
              <span className="text-xs font-bold text-slate-300 mt-1">Everyday</span>
            </button>
            {outfitChoices.map((outfit) => (
              <button
                key={outfit.id}
                onClick={() => setOutfitId(outfit.id)}
                className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all w-24 ${
                  outfitId === outfit.id
                    ? 'border-teal-400 bg-slate-700'
                    : 'border-slate-600 bg-slate-800 hover:border-slate-400'
                }`}
              >
                <img
                  src={outfit.iconUrl ?? previewUrl(selectedId, outfit.id)}
                  alt={outfit.label}
                  className="w-14 h-14 object-contain"
                />
                <span className="text-xs font-bold text-slate-300 mt-1">{outfit.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Name Input */}
        <div className="w-full max-w-sm">
          <label className="block text-sm font-bold text-teal-300 mb-2 text-center">
            What's your name?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            placeholder="Enter your name..."
            maxLength={20}
            autoFocus
            className="w-full bg-slate-700 text-white text-center text-lg px-4 py-3 rounded-lg border border-slate-600 focus:outline-none focus:border-teal-400 placeholder-slate-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full max-w-sm">
          {isEditMode && (
            <button
              onClick={() => onComplete(existingCharacter!)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-colors border border-slate-600"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className={`flex-1 font-bold py-3 px-4 rounded-lg transition-all text-lg ${
              name.trim()
                ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg hover:shadow-teal-500/50'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isEditMode ? 'Save Changes' : 'Start Adventure'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreator;
