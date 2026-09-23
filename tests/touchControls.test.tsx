import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TouchControls from '../components/TouchControls';

function setup() {
  const press = vi.fn(),
    release = vi.fn();
  const view = render(
    <TouchControls onDirectionPress={press} onDirectionRelease={release} compact />
  );
  for (const button of screen.getAllByRole('button')) button.setPointerCapture = vi.fn();
  return {
    ...view,
    press,
    release,
    up: screen.getByRole('button', { name: 'Move up' }),
    right: screen.getByRole('button', { name: 'Move right' }),
  };
}
function pointer(target: Element, type: string, pointerId: number) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, { pointerId: { value: pointerId }, button: { value: 0 } });
  fireEvent(target, event);
}
function touch(type: string, remainingTouches: number) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, 'touches', { value: { length: remainingTouches } });
  act(() => {
    document.body.dispatchEvent(event);
  });
}
describe('D-pad pointer ownership', () => {
  it('ignores an unrelated finger release and releases the owner once', () => {
    const { up, right, press, release } = setup();
    pointer(up, 'pointerdown', 1);
    pointer(right, 'pointerup', 2);
    expect(press).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
    pointer(up, 'pointerup', 1);
    pointer(up, 'lostpointercapture', 1);
    expect(release).toHaveBeenCalledExactlyOnceWith('up');
  });

  // Issue #150: a release iOS never delivered left the arm owned by a dead
  // pointer, which then ignored every later press and release on it.
  it('unsticks a direction whose release was lost when it is pressed again', () => {
    const { up, release } = setup();
    pointer(up, 'pointerdown', 1); // pointerup for 1 never arrives
    pointer(up, 'pointerdown', 7);
    pointer(up, 'pointerup', 7);
    expect(release).toHaveBeenCalledExactlyOnceWith('up');
    expect(up.getAttribute('aria-pressed')).toBe('false');
  });

  it('releases a finger that lifts off its button, wherever the pointerup lands', () => {
    const { up, release } = setup();
    pointer(up, 'pointerdown', 3);
    pointer(document.body, 'pointerup', 3);
    expect(release).toHaveBeenCalledExactlyOnceWith('up');
  });

  it('releases everything when the last finger leaves the screen', () => {
    const { up, right, release } = setup();
    pointer(up, 'pointerdown', 1);
    pointer(right, 'pointerdown', 2);
    touch('touchend', 1); // a finger is still down — keep holding
    expect(release).not.toHaveBeenCalled();
    touch('touchcancel', 0);
    expect(release).toHaveBeenCalledTimes(2);
    expect(up.getAttribute('aria-pressed')).toBe('false');
    expect(right.getAttribute('aria-pressed')).toBe('false');
  });
  it('cancels one direction while another finger keeps moving', () => {
    const { up, right, release } = setup();
    pointer(up, 'pointerdown', 1);
    pointer(right, 'pointerdown', 2);
    pointer(up, 'pointercancel', 1);
    expect(release).toHaveBeenCalledExactlyOnceWith('up');
    expect(right.getAttribute('aria-pressed')).toBe('true');
    pointer(right, 'lostpointercapture', 2);
    expect(release).toHaveBeenLastCalledWith('right');
  });
  it.each(['blur', 'pagehide', 'orientationchange', 'visibilitychange'])(
    'releases on %s',
    (event) => {
      const { up, release } = setup();
      pointer(up, 'pointerdown', 1);
      act(() => (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event)));
      expect(release).toHaveBeenCalledExactlyOnceWith('up');
      expect(up.getAttribute('aria-pressed')).toBe('false');
    }
  );
  it('suppresses the iOS callout and text selection on a held arm', () => {
    setup();
    const pad = screen.getByLabelText('Movement');
    expect(pad.classList.contains('no-touch-callout')).toBe(true);
    expect(pad.classList.contains('select-none')).toBe(true);
  });
  it('releases when an overlay unmounts the D-pad', () => {
    const { up, release, unmount } = setup();
    pointer(up, 'pointerdown', 1);
    unmount();
    expect(release).toHaveBeenCalledExactlyOnceWith('up');
  });
});

describe('D-pad hand-drawn frames', () => {
  it('shows the idle frame when nothing is held and lights the held direction', () => {
    const { up, right } = setup();
    expect(screen.getByTestId('dpad-frame-idle')).toBeVisible();
    expect(screen.getByTestId('dpad-frame-up')).not.toBeVisible();
    pointer(up, 'pointerdown', 1);
    expect(screen.getByTestId('dpad-frame-up')).toBeVisible();
    expect(screen.getByTestId('dpad-frame-idle')).not.toBeVisible();
    // A second held direction lights only the most recent one.
    pointer(right, 'pointerdown', 2);
    expect(screen.getByTestId('dpad-frame-right')).toBeVisible();
    expect(screen.getByTestId('dpad-frame-up')).not.toBeVisible();
    pointer(up, 'pointerup', 1);
    pointer(right, 'pointerup', 2);
    expect(screen.getByTestId('dpad-frame-idle')).toBeVisible();
  });
  it('renders every frame stacked so switching never waits on a decode', () => {
    setup();
    for (const state of ['idle', 'up', 'down', 'left', 'right']) {
      expect(screen.getByTestId(`dpad-frame-${state}`)).toBeInTheDocument();
    }
  });
});
