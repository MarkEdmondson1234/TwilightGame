/**
 * Smoke test for SplashScreen — the first component test in this repo (the
 * suite has otherwise been logic-level: utils/hooks/data, no React Testing
 * Library renders). Written specifically because Chrome tooling wasn't
 * available this session to visually confirm the new title screen renders —
 * this at least catches a render-time crash (bad import, missing prop,
 * undefined access) and confirms the two interactive paths (Play, Help)
 * actually fire, which typecheck alone wouldn't catch.
 *
 * Uses jsdom (the project default environment).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SplashScreen from '../components/SplashScreen';

describe('SplashScreen', () => {
  it('renders the title and a Play button without throwing', () => {
    render(<SplashScreen onPlay={() => {}} />);
    expect(screen.getByText('Clover Village')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('calls onPlay when the Play button is clicked', () => {
    const onPlay = vi.fn();
    render(<SplashScreen onPlay={onPlay} />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it('opens the Help browser in place of the splash when Help is clicked, without calling onPlay', () => {
    const onPlay = vi.fn();
    render(<SplashScreen onPlay={onPlay} />);

    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    // HelpBrowser rendered instead — its own close control appears, the
    // splash's Play button no longer does, and onPlay was never invoked.
    expect(screen.queryByRole('button', { name: 'Play' })).not.toBeInTheDocument();
    expect(onPlay).not.toHaveBeenCalled();
  });
});
