import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DisplayModeControls from '../components/DisplayModeControls';

const originals = [
  [document, 'fullscreenEnabled'],
  [document.documentElement, 'requestFullscreen'],
] as const;
const descriptors = originals.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key));
afterEach(() => {
  originals.forEach(([target, key], index) => {
    const descriptor = descriptors[index];
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
  });
});

describe('optional fullscreen', () => {
  it('explains Home Screen launch when fullscreen is unsupported', () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
    render(<DisplayModeControls />);
    expect(screen.getByText(/Add to Home Screen/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps a rejected fullscreen request recoverable', async () => {
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    const request = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: request,
    });
    render(<DisplayModeControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Fullscreen' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('keep playing'));
    expect(request).toHaveBeenCalledWith({ navigationUI: 'hide' });
  });
});
