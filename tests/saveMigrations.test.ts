/** @vitest-environment node */
import { describe, it, expect, vi } from 'vitest';
import { runSaveMigrations, SAVE_VERSION } from '../GameState';

/**
 * The save-migration framework (GameState.ts).
 *
 * What breaks if these fail: a save written by one build fails to load, or loads with the
 * wrong shape, in another build. The chain must run every step between a save's version and
 * the current one exactly once and in order, stamp the result, and never downgrade a save
 * from a newer build. Real migrations live in SAVE_MIGRATIONS; these tests inject their own
 * so the framework is verified independently of whatever migrations exist today.
 */

describe('runSaveMigrations', () => {
  it('stamps a versionless (legacy) save up to the target version', () => {
    const save: Record<string, unknown> = { gold: 5 };
    runSaveMigrations(save, {}, 3);
    expect(save.saveVersion).toBe(3);
  });

  it('runs every step between the save version and the target, in order', () => {
    const order: number[] = [];
    const save: Record<string, unknown> = { saveVersion: 1 };
    runSaveMigrations(
      save,
      {
        2: (s) => {
          order.push(2);
          s.two = true;
        },
        3: (s) => {
          order.push(3);
          s.three = true;
        },
      },
      3
    );
    expect(order).toEqual([2, 3]);
    expect(save).toMatchObject({ saveVersion: 3, two: true, three: true });
  });

  it('skips migrations at or below the save version (idempotent re-load)', () => {
    const ran: number[] = [];
    const save: Record<string, unknown> = { saveVersion: 2 };
    runSaveMigrations(save, { 2: () => ran.push(2), 3: () => ran.push(3) }, 3);
    expect(ran).toEqual([3]); // 2 already applied, only 3 runs
  });

  it('leaves a save from a newer build untouched and does not downgrade it', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const save: Record<string, unknown> = { saveVersion: 99, futureField: 'keep me' };
    runSaveMigrations(save, {}, SAVE_VERSION);
    expect(save.saveVersion).toBe(99);
    expect(save.futureField).toBe('keep me');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('is a no-op that only stamps when already at the target version', () => {
    const save: Record<string, unknown> = { saveVersion: SAVE_VERSION, data: 1 };
    runSaveMigrations(save);
    expect(save).toEqual({ saveVersion: SAVE_VERSION, data: 1 });
  });
});
