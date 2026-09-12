import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const cloud = vi.hoisted(() => ({
  ready: false,
  signIn: vi.fn().mockResolvedValue({}),
  google: vi.fn().mockResolvedValue({}),
  prepare: vi.fn(),
  subscribe: vi.fn(),
}));
vi.mock('../firebase/safe', () => ({
  safeInitializeFirebase: cloud.prepare,
  getAuthService: () => ({
    onAuthStateChange: cloud.subscribe,
    getState: () => ({ user: null, isLoading: false, isAuthenticated: false, isAnonymous: false }),
    signIn: cloud.signIn,
    signInWithGoogle: cloud.google,
  }),
  getSyncManager: () => ({ onStateChange: () => () => {} }),
}));
vi.mock('../services/anthropicClient', () => ({
  getStoredApiKey: () => null,
  isAIAvailable: () => false,
  setStoredApiKey: vi.fn(),
  clearStoredApiKey: vi.fn(),
  reinitializeClient: vi.fn(),
}));
vi.mock('../utils/AudioManager', () => ({
  audioManager: {
    isMusicMuted: () => false,
    isSfxMuted: () => false,
  },
}));
vi.mock('../utils/errorReporting', () => ({ reportError: vi.fn() }));
import HelpBrowser from '../components/HelpBrowser';

describe('mobile account access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cloud.ready = false;
    cloud.prepare.mockImplementation(async () => {
      cloud.ready = true;
      return {};
    });
    cloud.subscribe.mockImplementation((cb) => {
      cb({ user: null, isLoading: false, isAuthenticated: false, isAnonymous: false });
      return () => {};
    });
  });

  it('opens account directly, submits the labelled form and preserves password spaces', async () => {
    render(<HelpBrowser initialTab="account" onClose={() => {}} />);
    expect(screen.queryByRole('heading', { name: 'Character' })).not.toBeInTheDocument();
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');
    fireEvent.change(email, { target: { value: 'player@example.com' } });
    fireEvent.change(password, { target: { value: ' secret ' } });
    fireEvent.submit(email.closest('form')!);
    await waitFor(() =>
      expect(cloud.signIn).toHaveBeenCalledWith('player@example.com', ' secret ')
    );
  });

  it('prepares the service before Google is tapped and resubscribes after loading', async () => {
    render(<HelpBrowser initialTab="account" onClose={() => {}} />);
    const google = await screen.findByRole('button', { name: 'Sign in with Google' });
    await waitFor(() => expect(google).toBeEnabled());
    expect(cloud.subscribe.mock.calls.length).toBeGreaterThanOrEqual(2);
    const preparations = cloud.prepare.mock.calls.length;
    fireEvent.click(google);
    expect(cloud.google).toHaveBeenCalledTimes(1);
    expect(cloud.prepare).toHaveBeenCalledTimes(preparations);
  });

  it('retains the email and shows a recoverable Google failure', async () => {
    cloud.google.mockRejectedValueOnce(
      new Error('Google sign-in could not complete. Please try again.')
    );
    render(<HelpBrowser initialTab="account" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'player@example.com' } });
    const google = await screen.findByRole('button', { name: 'Sign in with Google' });
    await waitFor(() => expect(google).toBeEnabled());
    fireEvent.click(google);
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in could not complete');
    expect(screen.getByLabelText('Email')).toHaveValue('player@example.com');
    expect(google).toBeEnabled();
  });
});
