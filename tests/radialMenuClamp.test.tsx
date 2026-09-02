/**
 * @vitest-environment jsdom
 *
 * The radial menu must stay on screen.
 *
 * It is a vertical column centred on the click point, and it used to be positioned with
 * no reference to the viewport at all. That was survivable while it only ever opened on
 * a centre-screen inventory slot. It is not survivable now that right-click and
 * long-press open it anywhere in the world: a press near an edge — which on a phone is
 * most of the screen — pushed half the options out of view, and a five-option menu is
 * taller than an iPhone in landscape however carefully it is centred.
 *
 * jsdom lays nothing out, so the element's size is stubbed. The menu measures itself
 * rather than estimating from label lengths, and this is the seam that makes that
 * testable.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import RadialMenu, { type RadialMenuOption } from '../components/RadialMenu';

const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 400; // Roughly an iPhone in landscape.
const MENU_WIDTH = 200;
const MENU_HEIGHT = 350; // Five options — nearly the full height of that viewport.

/** The measured box the component reads back for its column container. */
function stubMenuSize(width: number, height: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement
  ) {
    // Only the flex column reports a size; buttons are irrelevant to the clamp.
    const isColumn = this.style.flexDirection === 'column';
    const w = isColumn ? width : 0;
    const h = isColumn ? height : 0;
    return { width: w, height: h, top: 0, left: 0, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  });
}

function options(count: number): RadialMenuOption[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `option_${i}`,
    label: `Option ${i}`,
    onSelect: () => {},
  }));
}

/** The positioned column the component renders. */
function menuElement(): HTMLElement {
  const button = screen.getByText('Option 0');
  const column = button.closest('div[style*="flex-direction: column"]');
  if (!column) throw new Error('menu column not found');
  return column as HTMLElement;
}

function positionOf(el: HTMLElement): { x: number; y: number } {
  return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
}

describe('RadialMenu viewport clamping', () => {
  beforeEach(() => {
    window.innerWidth = VIEWPORT_WIDTH;
    window.innerHeight = VIEWPORT_HEIGHT;
    stubMenuSize(MENU_WIDTH, MENU_HEIGHT);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('leaves a menu clicked in open space centred on the click', () => {
    // Small enough to fit with room to spare: nothing to correct.
    stubMenuSize(MENU_WIDTH, 120);
    render(<RadialMenu position={{ x: 400, y: 200 }} options={options(2)} onClose={() => {}} />);

    expect(positionOf(menuElement())).toEqual({ x: 400, y: 200 });
  });

  it('pulls a menu back inside the top edge', () => {
    render(<RadialMenu position={{ x: 400, y: 5 }} options={options(5)} onClose={() => {}} />);

    const { y } = positionOf(menuElement());
    // Centre must sit at least half the menu's height down the screen.
    expect(y).toBeGreaterThanOrEqual(MENU_HEIGHT / 2);
  });

  it('pulls a menu back inside the bottom edge', () => {
    render(
      <RadialMenu
        position={{ x: 400, y: VIEWPORT_HEIGHT - 5 }}
        options={options(5)}
        onClose={() => {}}
      />
    );

    const { y } = positionOf(menuElement());
    expect(y).toBeLessThanOrEqual(VIEWPORT_HEIGHT - MENU_HEIGHT / 2);
  });

  it('pulls a menu back inside the left and right edges', () => {
    const { unmount } = render(
      <RadialMenu position={{ x: 2, y: 200 }} options={options(3)} onClose={() => {}} />
    );
    expect(positionOf(menuElement()).x).toBeGreaterThanOrEqual(MENU_WIDTH / 2);
    unmount();

    render(
      <RadialMenu
        position={{ x: VIEWPORT_WIDTH - 2, y: 200 }}
        options={options(3)}
        onClose={() => {}}
      />
    );
    expect(positionOf(menuElement()).x).toBeLessThanOrEqual(VIEWPORT_WIDTH - MENU_WIDTH / 2);
  });

  it('pins a menu taller than the viewport to the top, so the first option is reachable', () => {
    stubMenuSize(MENU_WIDTH, VIEWPORT_HEIGHT * 2);
    render(<RadialMenu position={{ x: 400, y: 200 }} options={options(9)} onClose={() => {}} />);

    const { y } = positionOf(menuElement());
    // Centred below the halfway point means the top of the column is on screen.
    expect(y).toBeGreaterThanOrEqual(VIEWPORT_HEIGHT);
  });

  it('lifts a long-press menu clear of the finger that opened it', () => {
    const at = { x: 400, y: 200 };
    stubMenuSize(MENU_WIDTH, 120);

    const { unmount } = render(
      <RadialMenu position={at} options={options(2)} onClose={() => {}} />
    );
    const byMouse = positionOf(menuElement()).y;
    unmount();

    render(<RadialMenu position={at} options={options(2)} onClose={() => {}} openedByTouch />);
    const byTouch = positionOf(menuElement()).y;

    expect(byTouch).toBeLessThan(byMouse);
  });
});
