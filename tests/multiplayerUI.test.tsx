/**
 * Component tests for the two pieces of multiplayer UI.
 *
 * These exist because the multiplayer UI cannot be verified in the headless
 * browser: PixiJS never finishes initialising under SwiftShader, so the game
 * sits on the loading screen and the `isInWorld` gate (correctly) keeps both
 * components hidden. A render-time crash — a bad import, a missing prop, an
 * undefined access — would otherwise reach a real player before anyone noticed.
 *
 * Uses jsdom (the project default environment), following tests/splashScreen.test.tsx.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmoteWheel from '../components/EmoteWheel';
import PresenceIndicator from '../components/PresenceIndicator';
import { EMOTES } from '../multiplayer/emotes';

describe('EmoteWheel', () => {
  it('offers exactly the emotes in the vocabulary, and nothing else', () => {
    // The picker is the only player-to-player channel; anything here that is
    // not in EMOTES would be rejected by the security rules anyway.
    render(<EmoteWheel onSelect={() => {}} onClose={() => {}} />);

    for (const emote of EMOTES) {
      expect(screen.getByRole('button', { name: emote.label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('button')).toHaveLength(EMOTES.length);
  });

  it('sends the chosen emote and closes', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<EmoteWheel onSelect={onSelect} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Wave' }));

    expect(onSelect).toHaveBeenCalledWith('wave');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('picks an emote by number key, so a keyboard player never needs the mouse', () => {
    const onSelect = vi.fn();
    render(<EmoteWheel onSelect={onSelect} onClose={() => {}} />);

    fireEvent.keyDown(window, { key: '2' });

    expect(onSelect).toHaveBeenCalledWith(EMOTES[1].id);
  });

  it('ignores a number key with no emote behind it', () => {
    const onSelect = vi.fn();
    render(<EmoteWheel onSelect={onSelect} onClose={() => {}} />);

    fireEvent.keyDown(window, { key: '9' });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes on Escape without sending anything', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(<EmoteWheel onSelect={onSelect} onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('PresenceIndicator', () => {
  it('renders nothing when you are alone — single-player is untouched', () => {
    const { container } = render(<PresenceIndicator count={0} names={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uses the singular for one friend', () => {
    render(<PresenceIndicator count={1} names={['Sanne']} />);
    expect(screen.getByText('1 friend here')).toBeInTheDocument();
  });

  it('uses the plural for several', () => {
    render(<PresenceIndicator count={3} names={['Sanne', 'Mark', 'Juniper']} />);
    expect(screen.getByText('3 friends here')).toBeInTheDocument();
  });
});
