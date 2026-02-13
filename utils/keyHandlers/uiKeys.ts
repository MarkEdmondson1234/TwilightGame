/**
 * UI Key Handlers
 *
 * Handles keys that toggle UI elements:
 * - Escape: Close modals
 * - I: Toggle inventory
 * - B: Toggle recipe book
 * - E/Enter: Close open UIs
 */

export interface UIKeyHandlers {
  showHelpBrowser: boolean;
  showCookingUI: boolean;
  showRecipeBook: boolean;
  showJournal: boolean;
  showInventory: boolean;
  showShopUI: boolean;
  onSetShowHelpBrowser: (show: boolean) => void;
  onSetShowCookingUI: (show: boolean) => void;
  onSetShowRecipeBook: (show: boolean) => void;
  onSetShowJournal: (show: boolean) => void;
  onSetShowInventory: (show: boolean) => void;
  onSetShowShopUI: (show: boolean) => void;
}

/**
 * Handle Escape key - Close the topmost open modal
 * Returns true if a modal was closed, false otherwise
 */
export function handleEscape(handlers: UIKeyHandlers): boolean {
  if (handlers.showHelpBrowser) {
    handlers.onSetShowHelpBrowser(false);
    return true;
  }
  if (handlers.showCookingUI) {
    handlers.onSetShowCookingUI(false);
    return true;
  }
  if (handlers.showRecipeBook) {
    handlers.onSetShowRecipeBook(false);
    return true;
  }
  if (handlers.showJournal) {
    handlers.onSetShowJournal(false);
    return true;
  }
  return false;
}

/**
 * Handle J key - Toggle journal
 */
export function handleJournal(
  handlers: Pick<UIKeyHandlers, 'showJournal' | 'onSetShowJournal'>
): void {
  handlers.onSetShowJournal(!handlers.showJournal);
}

/**
 * Handle I key - Toggle inventory
 */
export function handleInventoryToggle(
  handlers: Pick<UIKeyHandlers, 'showInventory' | 'onSetShowInventory'>
): void {
  handlers.onSetShowInventory(!handlers.showInventory);
}

/**
 * Handle B key - Open recipe book
 * Returns message if recipe book is locked, null otherwise
 */
export function handleRecipeBook(
  handlers: Pick<UIKeyHandlers, 'onSetShowRecipeBook'>
): string | null {
  // This function will check unlock state when called from keyboard/touch controls
  handlers.onSetShowRecipeBook(true);
  return null; // Unlock check happens in keyboard controls where we have access to gameState and toast
}

/**
 * Handle action key (E/Enter) closing UIs
 * Returns true if a UI was closed, false otherwise
 */
export function handleActionCloseUI(handlers: UIKeyHandlers): boolean {
  if (handlers.showCookingUI) {
    handlers.onSetShowCookingUI(false);
    return true;
  }
  if (handlers.showShopUI) {
    handlers.onSetShowShopUI(false);
    return true;
  }
  if (handlers.showRecipeBook) {
    handlers.onSetShowRecipeBook(false);
    return true;
  }
  if (handlers.showJournal) {
    handlers.onSetShowJournal(false);
    return true;
  }
  if (handlers.showInventory) {
    handlers.onSetShowInventory(false);
    return true;
  }
  return false;
}

/**
 * Check if any blocking UI is open (dialogue, cooking, shop, etc.)
 * When these are open, most gameplay keys should be ignored
 */
export function isBlockingUIOpen(
  activeNPC: string | null,
  handlers: Pick<
    UIKeyHandlers,
    'showCookingUI' | 'showShopUI' | 'showRecipeBook' | 'showJournal' | 'showInventory'
  >
): boolean {
  return !!(
    activeNPC ||
    handlers.showCookingUI ||
    handlers.showShopUI ||
    handlers.showRecipeBook ||
    handlers.showJournal ||
    handlers.showInventory
  );
}
