/**
 * Regression for issue #15: ambient audio was silent on first load because
 * hooks/useAudio.ts — the only place that ever called audioManager.resume() on
 * a user gesture — was never mounted anywhere in the app. audioManager.resume()
 * needs a real user gesture to satisfy browser autoplay policy, so
 * useEnvironmentController.ts now wires up the resume-on-gesture listeners
 * itself via attachAudioUnlockListeners.
 *
 * Uses jsdom (the project default environment) for a real EventTarget.
 */
import { describe, it, expect, vi } from 'vitest';
import { attachAudioUnlockListeners } from '../hooks/useEnvironmentController';

describe('attachAudioUnlockListeners (#15)', () => {
  it('calls onResume on the first click', () => {
    const onResume = vi.fn();
    attachAudioUnlockListeners(document, onResume);

    document.dispatchEvent(new Event('click'));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('calls onResume on the first keydown (not just click)', () => {
    const onResume = vi.fn();
    attachAudioUnlockListeners(document, onResume);

    document.dispatchEvent(new KeyboardEvent('keydown'));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('calls onResume on the first touchstart', () => {
    const onResume = vi.fn();
    attachAudioUnlockListeners(document, onResume);

    document.dispatchEvent(new Event('touchstart'));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('only ever calls onResume once, even across multiple gesture types', () => {
    const onResume = vi.fn();
    attachAudioUnlockListeners(document, onResume);

    document.dispatchEvent(new Event('click'));
    document.dispatchEvent(new Event('click'));
    document.dispatchEvent(new KeyboardEvent('keydown'));
    document.dispatchEvent(new Event('touchstart'));

    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('removes its listeners after firing, so later events do nothing', () => {
    const onResume = vi.fn();
    attachAudioUnlockListeners(document, onResume);

    document.dispatchEvent(new Event('click'));
    onResume.mockClear();
    document.dispatchEvent(new Event('click'));

    expect(onResume).not.toHaveBeenCalled();
  });

  it('the returned cleanup function removes listeners without calling onResume', () => {
    const onResume = vi.fn();
    const cleanup = attachAudioUnlockListeners(document, onResume);

    cleanup();
    document.dispatchEvent(new Event('click'));

    expect(onResume).not.toHaveBeenCalled();
  });
});
