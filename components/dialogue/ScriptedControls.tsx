/**
 * ScriptedControls - Scripted dialogue response buttons
 *
 * Handles response filtering (cooking, quests, decorations, friendships)
 * and renders compact response buttons inside the dialogue frame.
 */

import React from 'react';
import { DialogueNode, DialogueResponse } from '../../types';
import { cookingManager } from '../../utils/CookingManager';
import { decorationManager } from '../../utils/DecorationManager';
import { TEXT_FONT } from './dialogueHelpers';

interface ScriptedControlsProps {
  dialogue: DialogueNode;
  canUseAI: boolean;
  onResponse: (response: DialogueResponse | string) => void;
  onClose: () => void;
}

/** Filter responses based on cooking / quest / decoration conditions */
function filterResponses(responses: DialogueResponse[] | undefined): DialogueResponse[] {
  if (!responses) return [];

  return responses.filter((response) => {
    if (response.requiredRecipeUnlocked) {
      if (!cookingManager.isRecipeUnlocked(response.requiredRecipeUnlocked)) return false;
    }
    if (response.requiredRecipeMastered) {
      if (!cookingManager.isRecipeMastered(response.requiredRecipeMastered)) return false;
    }
    if (response.hiddenIfRecipeUnlocked) {
      if (cookingManager.isRecipeUnlocked(response.hiddenIfRecipeUnlocked)) return false;
    }
    if (response.hiddenIfRecipeMastered) {
      if (cookingManager.isRecipeMastered(response.hiddenIfRecipeMastered)) return false;
    }
    if (response.requiredDomainMastered) {
      if (!cookingManager.isDomainMastered(response.requiredDomainMastered as any)) return false;
    }
    if (response.requiredDomainStarted) {
      const recipes = cookingManager.getRecipesByCategory(response.requiredDomainStarted as any);
      if (!recipes.some((r) => cookingManager.isRecipeUnlocked(r.id))) return false;
    }
    if (response.hiddenIfDomainStarted) {
      const recipes = cookingManager.getRecipesByCategory(response.hiddenIfDomainStarted as any);
      if (recipes.some((r) => cookingManager.isRecipeUnlocked(r.id))) return false;
    }
    if (response.hiddenIfDomainMastered) {
      if (cookingManager.isDomainMastered(response.hiddenIfDomainMastered as any)) return false;
    }
    if (response.hiddenIfAnyDomainStarted) {
      const masteredCount = cookingManager.getMasteredDomainCount();
      const unlockedRecipes = cookingManager.getUnlockedRecipes();
      const hasStarted = unlockedRecipes.some(
        (r) => r.category === 'savoury' || r.category === 'dessert' || r.category === 'baking'
      );
      if (hasStarted && masteredCount < 3) return false;
    }
    if (response.hiddenIfHasEasel) {
      if (decorationManager.getHasEasel()) return false;
    }
    return true;
  });
}

const ScriptedControls: React.FC<ScriptedControlsProps> = ({
  dialogue,
  canUseAI,
  onResponse,
  onClose,
}) => {
  const filtered = filterResponses(dialogue.responses);

  if (filtered.length === 0 && !canUseAI) {
    return (
      <div className="flex-shrink-0 flex justify-center" style={{ padding: '6px 6% 8px' }}>
        <button
          onClick={onClose}
          className="text-xs transition-colors duration-200"
          style={{ fontFamily: TEXT_FONT, color: 'rgba(180, 160, 140, 0.8)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#d4a373')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180, 160, 140, 0.8)')}
        >
          Click to continue ▼
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex-shrink-0 overflow-y-auto"
      style={{ padding: '6px 6% 8px', maxHeight: '90px' }}
    >
      <div className="flex flex-wrap gap-1.5 justify-center">
        {filtered.map((response, index) => (
          <button
            key={index}
            onClick={() => onResponse(response)}
            className="px-3 py-1 text-xs transition-all duration-200 ease-out transform hover:scale-105 active:scale-95"
            style={{
              fontFamily: TEXT_FONT,
              background:
                'linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.95) 100%)',
              color: '#faebd7',
              border: '1.5px solid rgba(210, 160, 90, 0.7)',
              borderRadius: '6px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(180deg, rgba(160, 110, 55, 0.9) 0%, rgba(120, 80, 40, 0.95) 100%)';
              e.currentTarget.style.borderColor = 'rgba(230, 180, 100, 0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(180deg, rgba(139, 90, 43, 0.85) 0%, rgba(101, 67, 33, 0.95) 100%)';
              e.currentTarget.style.borderColor = 'rgba(210, 160, 90, 0.7)';
            }}
          >
            {response.text}
          </button>
        ))}

        {/* AI chat option */}
        {canUseAI && (
          <button
            onClick={() => onResponse('__AI_CHAT__')}
            className="px-3 py-1 text-xs transition-all duration-200 ease-out transform hover:scale-105 active:scale-95"
            style={{
              fontFamily: TEXT_FONT,
              background:
                'linear-gradient(180deg, rgba(160, 110, 55, 0.7) 0%, rgba(120, 80, 40, 0.85) 100%)',
              color: '#faebd7',
              border: '1.5px solid rgba(210, 160, 90, 0.5)',
              borderRadius: '6px',
              boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(180deg, rgba(180, 130, 65, 0.8) 0%, rgba(140, 95, 50, 0.9) 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                'linear-gradient(180deg, rgba(160, 110, 55, 0.7) 0%, rgba(120, 80, 40, 0.85) 100%)';
            }}
          >
            Chat freely...
          </button>
        )}
      </div>
    </div>
  );
};

export default ScriptedControls;
