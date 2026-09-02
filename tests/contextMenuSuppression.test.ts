/**
 * @vitest-environment jsdom
 *
 * Right-click is a game input (emote picker on yourself, action menu on an
 * inventory item). When the browser's own menu appears instead, right-click
 * reads as broken even where the handlers are wired — which is exactly what was
 * reported: the inventory handles onContextMenu per slot, but a click on the
 * gaps, the panel background or the HUD fell through to the browser.
 *
 * This guards the document-level suppressor that covers everything the game's
 * canvas listener cannot see.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { suppressBrowserContextMenu } from '../utils/suppressBrowserContextMenu';

function rightClick(target: EventTarget, init: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

describe('browser context menu suppression', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    suppressBrowserContextMenu();
  });

  it('suppresses the browser menu anywhere in the document', () => {
    expect(rightClick(document.body).defaultPrevented).toBe(true);
  });

  it('suppresses it over UI the game canvas listener never sees', () => {
    // The HUD is a sibling overlay of the canvas container, so useMouseControls'
    // own listener is not on this path at all.
    const hud = document.createElement('div');
    document.body.appendChild(hud);
    expect(rightClick(hud).defaultPrevented).toBe(true);
  });

  it('still lets a component handle the event itself', () => {
    // The inventory calls preventDefault and then opens its action menu; the
    // suppressor must not stop that handler running.
    const slot = document.createElement('button');
    const handler = vi.fn();
    slot.addEventListener('contextmenu', handler);
    document.body.appendChild(slot);

    rightClick(slot);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('leaves Shift+right-click alone in development, so inspect element works', () => {
    const wasDev = import.meta.env.DEV;
    const event = rightClick(document.body, { shiftKey: true });
    expect(event.defaultPrevented).toBe(!wasDev);
  });
});
