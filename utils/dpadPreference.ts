/**
 * dpadPreference — whether the player has tucked the touch D-pad away.
 *
 * Tapping the ground already walks the player there, so on a small phone the
 * pad is the largest thing on screen and not the only way to move. The choice
 * is a per-device convenience, so it lives in localStorage (not the save): a
 * child who hides it on a phone still sees it on the family iPad.
 *
 * Several places need it at once — the controls, the quick bar (which slides
 * left into the freed space), the touch action menu and the camera overscroll
 * (utils/touchLayout.ts) — so it is a tiny external store read through
 * `useDpadHidden()`, not state threaded through App.
 */
import { useSyncExternalStore } from 'react';

export const DPAD_HIDDEN_STORAGE_KEY = 'twilight.touch.dpadHidden';

const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return window.localStorage.getItem(DPAD_HIDDEN_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

let hidden = typeof window === 'undefined' ? false : read();

export function isDpadHidden(): boolean {
  return hidden;
}

export function setDpadHidden(next: boolean): void {
  if (next === hidden) return;
  hidden = next;
  try {
    if (next) window.localStorage.setItem(DPAD_HIDDEN_STORAGE_KEY, '1');
    else window.localStorage.removeItem(DPAD_HIDDEN_STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the choice still holds for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDpadHidden(): boolean {
  return useSyncExternalStore(subscribe, isDpadHidden, () => false);
}
