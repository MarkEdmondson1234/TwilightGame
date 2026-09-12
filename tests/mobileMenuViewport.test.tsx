import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MobileMenuShell from '../components/MobileMenuShell';
import { useUIState } from '../hooks/useUIState';
import { useBrowserZoomLock } from '../hooks/useBrowserZoomLock';

afterEach(() => vi.unstubAllGlobals());
describe('mobile menu viewport', () => {
  it('follows the visual viewport when the keyboard opens or pans the page', () => {
    const viewport = Object.assign(new EventTarget(), {
      width: 390,
      height: 844,
      offsetTop: 0,
      offsetLeft: 0,
    });
    vi.stubGlobal('visualViewport', viewport);
    render(
      <MobileMenuShell>
        <p>Account</p>
      </MobileMenuShell>
    );
    const shell = screen.getByText('Account').parentElement!;
    expect(shell.style.height).toBe('844px');
    act(() => {
      viewport.height = 360;
      viewport.offsetTop = 40;
      viewport.dispatchEvent(new Event('resize'));
    });
    expect(shell.style.height).toBe('360px');
    expect(shell.style.top).toBe('40px');
    act(() => {
      viewport.offsetTop = 70;
      viewport.dispatchEvent(new Event('scroll'));
    });
    expect(shell.style.top).toBe('70px');
  });
  it.each(['glamourModal', 'photoAlbum', 'furnitureCatalogueUI', 'giftModal'] as const)(
    'blocks world input for %s',
    (name) => {
      const { result } = renderHook(() => useUIState());
      expect(result.current.isAnyUIOpen()).toBe(false);
      act(() => result.current.openUI(name));
      expect(result.current.isAnyUIOpen()).toBe(true);
      act(() => result.current.closeUI(name));
      expect(result.current.isAnyUIOpen()).toBe(false);
    }
  );
  it('allows browser magnification again while a menu is open', () => {
    const { rerender } = renderHook(({ enabled }) => useBrowserZoomLock(enabled), {
      initialProps: { enabled: true },
    });
    const worldZoom = new WheelEvent('wheel', { ctrlKey: true, cancelable: true });
    window.dispatchEvent(worldZoom);
    expect(worldZoom.defaultPrevented).toBe(true);
    rerender({ enabled: false });
    const menuZoom = new WheelEvent('wheel', { ctrlKey: true, cancelable: true });
    window.dispatchEvent(menuZoom);
    expect(menuZoom.defaultPrevented).toBe(false);
  });
});
