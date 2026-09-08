/**
 * Regression for issue #108: Queen Avaricia's `queen_lore_wizard` dialogue froze on
 * mobile — the typewriter stopped mid-sentence ("I was brutally murdered by this") and
 * the response options never appeared. Root cause was not the suspected main-thread
 * stall: a 10,069-space paste accident inside the node's text made the typewriter
 * reveal ~10k invisible characters at 40 chars/second — ~4 minutes of nothing — while
 * the response options wait on isComplete.
 *
 * Two layers of guard:
 * 1. useTypewriter reveals whole whitespace runs in one tick, so even a future paste
 *    accident can only cost one tick per run, not minutes.
 * 2. A data sweep over every registered NPC's dialogue (all variants) rejects runs of
 *    3+ spaces, so corrupted dialogue strings fail CI instead of shipping.
 */
/** @vitest-environment jsdom */
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTypewriter } from '../hooks/useTypewriter';
import { initializeMaps, mapManager } from '../maps';
import { npcManager } from '../NPCManager';

let intervalCallback: (() => void) | undefined;

function renderTypewriter(text: string) {
  let latest: { displayText: string; isComplete: boolean } | null = null;
  function Probe() {
    const state = useTypewriter(text);
    latest = state;
    return null;
  }
  render(<Probe />);
  return () => latest!;
}

/** Advance the mocked interval by n simulated 40cps ticks. */
function advance(ticks: number) {
  act(() => {
    for (let i = 0; i < ticks; i++) intervalCallback?.();
  });
}

describe('issue #108: whitespace runs cannot stall the typewriter', () => {
  beforeEach(() => {
    // jsdom timers never fire in tests — capture the interval callback and drive it
    // manually so reveal steps are deterministic.
    vi.stubGlobal(
      'setInterval',
      vi.fn((cb: () => void) => {
        intervalCallback = cb;
        return 1;
      })
    );
    vi.stubGlobal('clearInterval', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reveals a 10k-space run in a single tick instead of ~4 minutes', () => {
    const run = ' '.repeat(10069);
    const text = `I was brutally murdered by this${run}wizard's apprentice.`;
    const read = renderTypewriter(text);
    // 25 ticks cover the visible chars up to 'i' of "this"; the next tick reveals 's'
    // plus the entire run in ONE step (pre-fix the run cost 10,069 ticks ≈ 4.2 min).
    advance(25);
    expect(read()!.displayText).toBe('I was brutally murdered by thi');
    advance(1);
    // One tick jumped the rest of "this" and the whole run (the 'w' needs its own tick).
    expect(read()!.displayText).toBe(`I was brutally murdered by this${run}`);
    advance(text.length); // plenty for the remaining ~19 visible chars
    expect(read()!.isComplete).toBe(true);
  });

  it('normal text still reveals one character per tick', () => {
    const read = renderTypewriter('Hello world');
    advance(1);
    expect(read()!.displayText).toBe('H');
    advance(1);
    expect(read()!.displayText).toBe('He');
    advance(9);
    expect(read()!.isComplete).toBe(true);
  });
});

describe('issue #108: dialogue data contains no pathological whitespace', () => {
  beforeEach(() => {
    initializeMaps();
  });

  it('no NPC dialogue text contains a run of 3+ spaces', () => {
    const offenders: string[] = [];
    const check = (npcId: string, nodeId: string, field: string, text: string | undefined) => {
      if (text && / {3,}/.test(text)) {
        offenders.push(`${npcId}/${nodeId} (${field}): ${text.slice(0, 80)}…`);
      }
    };

    for (const mapId of mapManager.getAllMapIds()) {
      for (const npc of npcManager.getNPCsForMap(mapId)) {
        for (const node of npc.dialogue) {
          check(npc.id, node.id, 'text', node.text);
          for (const [season, text] of Object.entries(node.seasonalText ?? {})) {
            check(npc.id, node.id, `seasonalText.${season}`, text);
          }
          for (const [period, text] of Object.entries(node.timeOfDayText ?? {})) {
            check(npc.id, node.id, `timeOfDayText.${period}`, text);
          }
          for (const [weather, text] of Object.entries(node.weatherText ?? {})) {
            check(npc.id, node.id, `weatherText.${weather}`, text);
          }
          for (const [form, text] of Object.entries(node.transformationText ?? {})) {
            check(npc.id, node.id, `transformationText.${form}`, text);
          }
          for (const response of node.responses ?? []) {
            check(npc.id, node.id, `response "${response.text}"`, response.text);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
