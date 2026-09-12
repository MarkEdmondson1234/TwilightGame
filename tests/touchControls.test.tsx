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
describe('D-pad pointer ownership', () => {
  it('ignores an unrelated finger release and releases the owner once', () => {
    const { up, press, release } = setup();
    pointer(up, 'pointerdown', 1);
    pointer(up, 'pointerdown', 2);
    pointer(up, 'pointerup', 2);
    expect(press).toHaveBeenCalledTimes(1);
    expect(release).not.toHaveBeenCalled();
    pointer(up, 'pointerup', 1);
    pointer(up, 'lostpointercapture', 1);
    expect(release).toHaveBeenCalledExactlyOnceWith('up');
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
  it.each(['blur', 'orientationchange', 'visibilitychange'])('releases on %s', (event) => {
    const { up, release } = setup();
    pointer(up, 'pointerdown', 1);
    act(() => (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event)));
    expect(release).toHaveBeenCalledExactlyOnceWith('up');
    expect(up.getAttribute('aria-pressed')).toBe('false');
  });
  it('releases when an overlay unmounts the D-pad', () => {
    const { up, release, unmount } = setup();
    pointer(up, 'pointerdown', 1);
    unmount();
    expect(release).toHaveBeenCalledExactlyOnceWith('up');
  });
});
