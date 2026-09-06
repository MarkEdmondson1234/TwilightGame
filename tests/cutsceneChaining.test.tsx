/**
 * Regression test for a dialogue choice's `triggerCutscene` chaining into a second
 * cutscene inside CutscenePlayer.
 *
 * The bug: CutscenePlayer.handleChoice's triggerCutscene branch calls
 * cutsceneManager.endCutscene() (ending cutscene A) then startCutscene() (starting
 * cutscene B) synchronously. App.tsx's own subscriber flips isCutscenePlaying back
 * to true in the same React batch, so this CutscenePlayer instance is never
 * unmounted in between — its onCompleteCalledRef guard, tripped by A's spurious
 * end, used to permanently swallow B's real completion, so anything depending on
 * B's onComplete (a map transition, in the real Wizard Trials case) silently never
 * ran. See components/CutscenePlayer.tsx's cutsceneManager.subscribe effect for the
 * fix (re-arming the guard and completion-action ref when the cutscene id changes).
 *
 * Uses jsdom (the project default environment).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CutscenePlayer from '../components/CutscenePlayer';
import { cutsceneManager } from '../utils/CutsceneManager';
import type { CutsceneDefinition } from '../types';

const CUTSCENE_A: CutsceneDefinition = {
  id: 'test_chain_a',
  name: 'Test Chain A',
  canSkip: false,
  onComplete: { action: 'none' },
  trigger: { type: 'manual', id: 'test_chain_a' },
  scenes: [
    {
      id: 'a_choice',
      backgroundLayers: [],
      dialogue: {
        speaker: 'Test',
        text: 'Which way?',
        choices: [{ text: 'Go to B', triggerCutscene: 'test_chain_b' }],
      },
    },
  ],
};

const CUTSCENE_B: CutsceneDefinition = {
  id: 'test_chain_b',
  name: 'Test Chain B',
  canSkip: false,
  onComplete: { action: 'transition', mapId: 'test_map_b', position: { x: 1, y: 1 } },
  trigger: { type: 'manual', id: 'test_chain_b' },
  scenes: [
    {
      id: 'b_only',
      backgroundLayers: [],
      dialogue: { speaker: 'Test', text: 'Arrived at B.' },
    },
  ],
};

describe('CutscenePlayer — triggerCutscene chaining', () => {
  beforeEach(() => {
    cutsceneManager.registerCutscene(CUTSCENE_A);
    cutsceneManager.registerCutscene(CUTSCENE_B);
    cutsceneManager.startCutscene('test_chain_a');
  });

  afterEach(() => {
    cutsceneManager.endCutscene();
  });

  it("fires the chained cutscene's own onComplete, not the first cutscene's", async () => {
    const onComplete = vi.fn();
    render(<CutscenePlayer onComplete={onComplete} />);

    // Dialogue appears after a short mount delay (see CutscenePlayer's showDialogue timer).
    fireEvent.click(await screen.findByText('Go to B'));

    // B's only scene has no choices — advance past it via the continue control.
    fireEvent.click(await screen.findByText(/continue/i));

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'transition',
        mapId: 'test_map_b',
        cutsceneId: 'test_chain_b',
      })
    );
  });
});
