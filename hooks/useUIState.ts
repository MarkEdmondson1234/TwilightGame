import { useState, useCallback } from 'react';
import { Position } from '../types';

/**
 * Names of all UI overlays that can be opened/closed.
 * Each overlay has a boolean "show" state.
 */
export type UIOverlayName =
  | 'inventory'
  | 'cookingUI'
  | 'brewingUI'
  | 'recipeBook'
  | 'magicBook'
  | 'helpBrowser'
  | 'characterCreator'
  | 'devTools'
  | 'spriteEditor'
  | 'vfxTestPanel'
  | 'shopUI'
  | 'giftModal'
  | 'glamourModal';

/**
 * Context data associated with specific UI overlays.
 * Some overlays need additional state beyond just "visible/hidden".
 */
export interface UIContext {
  // Cooking context
  cookingLocationType: 'stove' | 'campfire' | null;
  cookingPosition: Position | null;
  // Brewing context
  brewingPosition: Position | null;
  // Gift modal context
  giftTargetNpcId: string | null;
}

/**
 * Complete UI state including all overlay visibility and context.
 */
export interface UIState {
  // Overlay visibility flags
  inventory: boolean;
  cookingUI: boolean;
  brewingUI: boolean;
  recipeBook: boolean;
  magicBook: boolean;
  helpBrowser: boolean;
  characterCreator: boolean;
  devTools: boolean;
  spriteEditor: boolean;
  vfxTestPanel: boolean;
  shopUI: boolean;
  giftModal: boolean;
  glamourModal: boolean;
  // Context data
  context: UIContext;
}

/**
 * Options when opening a UI overlay.
 * Some overlays require additional context.
 */
export interface OpenUIOptions {
  // For cooking UI
  cookingLocationType?: 'stove' | 'campfire';
  cookingPosition?: Position;
  // For brewing UI
  brewingPosition?: Position;
  // For gift modal
  giftTargetNpcId?: string;
}

/**
 * Return type for useUIState hook.
 */
export interface UseUIStateReturn {
  ui: UIState;
  openUI: (name: UIOverlayName, options?: OpenUIOptions) => void;
  closeUI: (name: UIOverlayName) => void;
  toggleUI: (name: UIOverlayName) => void;
  closeAllUI: () => void;
  isAnyUIOpen: () => boolean;
}

const initialContext: UIContext = {
  cookingLocationType: null,
  cookingPosition: null,
  brewingPosition: null,
  giftTargetNpcId: null,
};

const initialState: UIState = {
  inventory: false,
  cookingUI: false,
  brewingUI: false,
  recipeBook: false,
  magicBook: false,
  helpBrowser: false,
  characterCreator: false,
  devTools: false,
  spriteEditor: false,
  vfxTestPanel: false,
  shopUI: false,
  giftModal: false,
  glamourModal: false,
  context: { ...initialContext },
};

/**
 * Hook to manage all UI overlay state in a centralised location.
 *
 * Instead of 12+ useState hooks in App.tsx, this provides a single
 * state object with clean open/close/toggle functions.
 *
 * @example
 * const { ui, openUI, closeUI, toggleUI } = useUIState();
 *
 * // Open inventory
 * openUI('inventory');
 *
 * // Open cooking with context
 * openUI('cookingUI', { cookingLocationType: 'stove', cookingPosition: { x: 5, y: 3 } });
 *
 * // Toggle help browser
 * toggleUI('helpBrowser');
 *
 * // Check if inventory is open
 * if (ui.inventory) { ... }
 */
export function useUIState() {
  const [state, setState] = useState<UIState>(initialState);

  /**
   * Open a UI overlay, optionally with context data.
   */
  const openUI = useCallback((name: UIOverlayName, options?: OpenUIOptions) => {
    setState((prev) => {
      const newState = { ...prev, [name]: true };

      // Set context data if provided
      if (options) {
        newState.context = { ...prev.context };
        if (options.cookingLocationType !== undefined) {
          newState.context.cookingLocationType = options.cookingLocationType;
        }
        if (options.cookingPosition !== undefined) {
          newState.context.cookingPosition = options.cookingPosition;
        }
        if (options.brewingPosition !== undefined) {
          newState.context.brewingPosition = options.brewingPosition;
        }
        if (options.giftTargetNpcId !== undefined) {
          newState.context.giftTargetNpcId = options.giftTargetNpcId;
        }
      }

      return newState;
    });
  }, []);

  /**
   * Close a UI overlay and clear its associated context.
   */
  const closeUI = useCallback((name: UIOverlayName) => {
    setState((prev) => {
      const newState = { ...prev, [name]: false };

      // Clear context data when closing specific overlays
      if (name === 'cookingUI') {
        newState.context = {
          ...prev.context,
          cookingLocationType: null,
          cookingPosition: null,
        };
      } else if (name === 'brewingUI') {
        newState.context = {
          ...prev.context,
          brewingPosition: null,
        };
      } else if (name === 'giftModal') {
        newState.context = {
          ...prev.context,
          giftTargetNpcId: null,
        };
      }

      return newState;
    });
  }, []);

  /**
   * Toggle a UI overlay on/off.
   */
  const toggleUI = useCallback((name: UIOverlayName) => {
    setState((prev) => {
      const isOpen = prev[name];
      if (isOpen) {
        // Closing - clear context
        const newState = { ...prev, [name]: false };
        if (name === 'cookingUI') {
          newState.context = {
            ...prev.context,
            cookingLocationType: null,
            cookingPosition: null,
          };
        } else if (name === 'brewingUI') {
          newState.context = {
            ...prev.context,
            brewingPosition: null,
          };
        } else if (name === 'giftModal') {
          newState.context = {
            ...prev.context,
            giftTargetNpcId: null,
          };
        }
        return newState;
      } else {
        // Opening without context
        return { ...prev, [name]: true };
      }
    });
  }, []);

  /**
   * Close all UI overlays at once (e.g., when entering cutscene).
   */
  const closeAllUI = useCallback(() => {
    setState({ ...initialState });
  }, []);

  /**
   * Check if any UI overlay is currently open.
   * Useful for disabling game input when menus are open.
   */
  const isAnyUIOpen = useCallback((): boolean => {
    return (
      state.inventory ||
      state.cookingUI ||
      state.brewingUI ||
      state.recipeBook ||
      state.magicBook ||
      state.helpBrowser ||
      state.characterCreator ||
      state.devTools ||
      state.spriteEditor ||
      state.vfxTestPanel ||
      state.shopUI ||
      state.giftModal
    );
  }, [state]);

  return {
    ui: state,
    openUI,
    closeUI,
    toggleUI,
    closeAllUI,
    isAnyUIOpen,
  };
}
