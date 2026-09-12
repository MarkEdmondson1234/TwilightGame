/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
const firebase = vi.hoisted(() => ({
  signIn: vi.fn(),
  popup: vi.fn(),
  write: vi.fn(),
  read: vi.fn(),
  observe: vi.fn(),
  report: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: firebase.signIn,
  signInWithPopup: firebase.popup,
  onAuthStateChanged: firebase.observe,
  GoogleAuthProvider: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInAnonymously: vi.fn(),
  linkWithCredential: vi.fn(),
  EmailAuthProvider: {},
  signOut: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  setDoc: firebase.write,
  getDoc: firebase.read,
  serverTimestamp: vi.fn(),
}));
vi.mock('../../firebase/config', () => ({
  getFirebaseAuth: () => ({}),
  getFirebaseDb: () => ({}),
  isFirebaseInitialized: () => true,
}));
vi.mock('../../utils/errorReporting', () => ({
  reportError: firebase.report,
  setErrorReportingUser: vi.fn(),
}));
import { authService } from '../../firebase/authService';

const user = { uid: 'player', isAnonymous: false };
describe('authentication and profile failure', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    firebase.observe.mockImplementation((_, cb) => {
      cb(user);
      return () => {};
    });
    authService.initialize();
    firebase.signIn.mockResolvedValue({ user });
    firebase.popup.mockResolvedValue({ user });
  });
  it('keeps successful email login when the profile write fails', async () => {
    firebase.write.mockRejectedValue(new Error('offline'));
    await expect(authService.signIn('player@example.com', 'secret')).resolves.toBe(user);
    expect(authService.getState().isAuthenticated).toBe(true);
    expect(authService.getState().profileError).toContain('You are signed in');
  });
  it('does not misreport a Google profile read failure as an OAuth failure', async () => {
    firebase.read.mockRejectedValue(new Error('unavailable'));
    await expect(authService.signInWithGoogle()).resolves.toBe(user);
    expect(firebase.report).toHaveBeenCalledWith(expect.any(Error), 'auth', {
      action: 'syncUserProfile',
    });
    expect(firebase.write).not.toHaveBeenCalled();
  });
  it('still rejects a genuine provider failure without writing a profile', async () => {
    firebase.popup.mockRejectedValue(new Error('provider failed'));
    await expect(authService.signInWithGoogle()).rejects.toThrow('provider failed');
    expect(firebase.write).not.toHaveBeenCalled();
    expect(firebase.read).not.toHaveBeenCalled();
  });
});
