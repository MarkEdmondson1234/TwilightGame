/**
 * @vitest-environment node
 *
 * NpcGardenService.startListening() wires an auth-retry listener (the pattern
 * CLAUDE.md's "every controller that joins a per-map room must retry on
 * sign-in" rule calls for). authService.onAuthStateChange() invokes its
 * callback SYNCHRONOUSLY with the current state before it returns — so when
 * the caller is already authenticated, the callback fires while
 * `this.authUnsubscribe` is still unassigned, calls startListening() again,
 * and re-enters the same unguarded branch. That shipped as an unbounded
 * recursion crash in production (`InternalError: too much recursion`,
 * JAVASCRIPT-REACT-Q) the first time a signed-in player loaded the game.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../firebase/authService', () => ({
  authService: {
    isAuthenticated: () => true,
    // Mirrors the real implementation: invokes the callback synchronously
    // with the current state before returning the unsubscribe function.
    onAuthStateChange: vi.fn((callback: (state: { isAuthenticated: boolean }) => void) => {
      callback({ isAuthenticated: true });
      return () => {};
    }),
  },
}));

vi.mock('../firebase/config', () => ({
  isFirebaseInitialized: () => true,
  getFirebaseDb: () => ({}),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => () => {}),
  runTransaction: vi.fn(),
  setDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

describe('NpcGardenService auth-retry re-entrancy', () => {
  it('does not recurse, and subscribes exactly once, when already authenticated', async () => {
    const { npcGardenService } = await import('../firebase/npcGardenService');
    const { authService } = await import('../firebase/authService');
    const { onSnapshot } = await import('firebase/firestore');

    // Before the fix this call never returns (stack overflow): the
    // synchronous onAuthStateChange callback re-enters startListening()
    // before this.authUnsubscribe is assigned, forever failing the
    // `!this.authUnsubscribe` guard.
    expect(() => npcGardenService.startListening()).not.toThrow();

    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(authService.onAuthStateChange).toHaveBeenCalledTimes(1);

    // Calling again must not re-register the auth listener or resubscribe.
    npcGardenService.startListening();
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(authService.onAuthStateChange).toHaveBeenCalledTimes(1);
  });
});
