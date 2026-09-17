/**
 * useStablePoint pins an {x, y} object's identity to its value, so effects
 * keyed on it run when the offset moves and not when a parent merely
 * re-renders (design_docs/planned/PERFORMANCE_MOBILE_PLAN.md §3.1, cause A).
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStablePoint } from '../hooks/useStablePoint';

describe('useStablePoint', () => {
  it('keeps the first object while the values are unchanged', () => {
    const { result, rerender } = renderHook(({ p }) => useStablePoint(p), {
      initialProps: { p: { x: 1, y: 2 } as { x: number; y: number } | undefined },
    });
    const first = result.current;
    rerender({ p: { x: 1, y: 2 } });
    expect(result.current).toBe(first);
  });

  it('hands out the new object when a value changes', () => {
    const { result, rerender } = renderHook(({ p }) => useStablePoint(p), {
      initialProps: { p: { x: 1, y: 2 } as { x: number; y: number } | undefined },
    });
    const first = result.current;
    rerender({ p: { x: 1, y: 3 } });
    expect(result.current).not.toBe(first);
    expect(result.current).toEqual({ x: 1, y: 3 });
  });

  it('handles undefined in both directions', () => {
    const { result, rerender } = renderHook(({ p }) => useStablePoint(p), {
      initialProps: { p: undefined as { x: number; y: number } | undefined },
    });
    expect(result.current).toBeUndefined();
    rerender({ p: { x: 0, y: 0 } });
    expect(result.current).toEqual({ x: 0, y: 0 });
    rerender({ p: undefined });
    expect(result.current).toBeUndefined();
  });
});
