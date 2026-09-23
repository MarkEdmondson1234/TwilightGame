import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { MiniGameComponentProps } from '../minigames/types';
import {
  getWreathLayout,
  MIN_TOUCH_TARGET,
  COMPACT_GUTTER,
} from '../minigames/wreath-making/wreathLayout';
import { WREATH_CANVAS_SIZE } from '../minigames/wreath-making/wreathConstants';

/**
 * Issue #157: "The crafting wreath layout is hard to use on mobile."
 *
 * Phones and touch tablets get a stacked layout — wreath fitted to the width,
 * a scrollable strip of large flower buttons, a tool sheet and a sticky
 * Clear / Close / Create bar — and the whole lesson must be completable with
 * taps alone (select a flower, tap the ring), no dragging.
 */

const mock = vi.hoisted(() => ({ finish: vi.fn(), capture: vi.fn(), register: vi.fn() }));
vi.mock('../utils/tinyWreathLesson', () => ({ finishTinyWreathLesson: mock.finish }));
vi.mock('../utils/DecorationManager', () => ({
  decorationManager: { registerCustomDecoration: mock.register, deletePainting: vi.fn() },
}));
vi.mock('../minigames/wreath-making/wreathCapture', () => ({ captureWreathImage: mock.capture }));

import { WreathMakingGame } from '../minigames/wreath-making/WreathMakingGame';

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;
function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
}

function renderWorkshop() {
  const bag: Record<string, number> = { crop_lavender: 2, heather_sprig: 2 };
  const actions = {
    getItemQuantity: vi.fn((id: string) => bag[id] ?? 0),
    removeItem: vi.fn(() => true),
    addItem: vi.fn(() => true),
    addItemWithDecoration: vi.fn(() => true),
  };
  const onComplete = vi.fn();
  const onClose = vi.fn();
  const context = {
    actions,
    storage: { load: () => null },
  } as unknown as MiniGameComponentProps['context'];
  render(<WreathMakingGame context={context} onClose={onClose} onComplete={onComplete} />);
  return { actions, onComplete, onClose };
}

const strip = () => screen.getByTestId('wreath-flower-strip');
const ring = () => screen.getByLabelText('Wreath arrangement');
const createButton = () => screen.getByRole('button', { name: 'Create Wreath' });

function tapPlace(flowerName: RegExp) {
  fireEvent.click(within(strip()).getByRole('option', { name: flowerName }));
  fireEvent.click(ring());
}

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  mock.capture.mockResolvedValue('data:image/png;base64,test');
  mock.register.mockReturnValue('wreath-1');
});
afterEach(() => {
  cleanup();
  setViewport(originalWidth, originalHeight);
});

describe('wreath workshop layout choice', () => {
  it('uses the stacked layout on a phone, fitting the wreath inside the width', () => {
    const layout = getWreathLayout({ width: 375, height: 667, coarsePointer: true });
    expect(layout.compact).toBe(true);
    expect(WREATH_CANVAS_SIZE * layout.canvasScale).toBeLessThanOrEqual(375 - COMPACT_GUTTER * 2);
    expect(WREATH_CANVAS_SIZE * layout.canvasScale).toBeGreaterThan(200);
  });

  it('uses the stacked layout on a narrow window and on a touch tablet in landscape', () => {
    expect(getWreathLayout({ width: 700, height: 900, coarsePointer: false }).compact).toBe(true);
    expect(getWreathLayout({ width: 1024, height: 768, coarsePointer: true }).compact).toBe(true);
  });

  it('keeps the desktop layout for a mouse on a wide screen', () => {
    const layout = getWreathLayout({ width: 1440, height: 900, coarsePointer: false });
    expect(layout).toEqual({ compact: false, canvasScale: 1 });
  });

  it('never shrinks the canvas to nothing on a short landscape phone', () => {
    const layout = getWreathLayout({ width: 844, height: 390, coarsePointer: true });
    expect(WREATH_CANVAS_SIZE * layout.canvasScale).toBeGreaterThanOrEqual(200);
  });
});

describe('wreath workshop on a phone', () => {
  beforeEach(() => setViewport(375, 667));

  it('renders the stacked layout with large flower buttons and a sticky action bar', () => {
    renderWorkshop();
    expect(screen.getByTestId('wreath-workshop-compact')).toBeTruthy();
    const options = within(strip()).getAllByRole('option');
    expect(options).toHaveLength(2);
    for (const option of options) {
      expect(parseFloat(option.style.width)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(parseFloat(option.style.minHeight)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
    expect(strip().style.overflowX).toBe('auto');
    for (const name of ['Clear', 'Close', 'Create Wreath']) {
      const button = screen.getByRole('button', { name });
      expect(parseFloat(button.style.minHeight)).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
    expect((createButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('completes the starter wreath with taps alone: select, tap the ring, four times', async () => {
    const { actions, onComplete } = renderWorkshop();
    tapPlace(/Lavender/);
    // The tool sheet opens on the new flower; Done closes it
    expect(screen.getByRole('toolbar')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('toolbar')).toBeNull();
    tapPlace(/Lavender/);
    tapPlace(/Heather/);
    tapPlace(/Heather/);
    expect(within(ring()).getAllByAltText(/Lavender|Heather/)).toHaveLength(4);

    fireEvent.click(createButton());
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(actions.removeItem).toHaveBeenCalledTimes(2);
    expect(mock.finish).toHaveBeenCalledOnce();
  });

  it('places a chosen flower even when the tap lands on a flower already on the ring', () => {
    renderWorkshop();
    tapPlace(/Lavender/);
    fireEvent.click(within(strip()).getByRole('option', { name: /Heather/ }));
    // Tap straight onto the placed lavender, which overlaps most of the ring
    const lavender = within(ring())
      .getByAltText(/Lavender/)
      .closest('div[title]')!;
    fireEvent.mouseDown(lavender);
    fireEvent.click(lavender);
    expect(within(ring()).getAllByAltText(/Lavender|Heather/)).toHaveLength(2);
  });

  it('Clear takes every flower off the ring without spending anything', () => {
    const { actions } = renderWorkshop();
    tapPlace(/Lavender/);
    tapPlace(/Heather/);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(within(ring()).queryAllByAltText(/Lavender|Heather/)).toHaveLength(0);
    expect(actions.removeItem).not.toHaveBeenCalled();
  });

  it('Close closes the workshop', () => {
    const { onClose } = renderWorkshop();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('wreath workshop on a desktop', () => {
  beforeEach(() => setViewport(1440, 900));

  it('keeps the wide layout', () => {
    renderWorkshop();
    expect(screen.queryByTestId('wreath-workshop-compact')).toBeNull();
    expect(screen.getByText('Your Flowers')).toBeTruthy();
  });
});
