import React from 'react';
import type { useLeapMultiplayer } from './useLeapMultiplayer';
import type { PlayMode } from './multiplayer';

/** Network waiting/results replace the adventure overlay without changing its input rules. */
export function LeapOnlineOverlay({
  playMode,
  multiplayer,
  won,
  backToSolo,
  onClose,
  children,
}: {
  playMode: PlayMode;
  multiplayer: ReturnType<typeof useLeapMultiplayer>;
  won: boolean;
  backToSolo: () => void;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (playMode !== 'solo' && (!multiplayer.ready || multiplayer.error)) {
    return (
      <div className="ll-overlay">
        <section className="ll-panel">
          <h2>
            {multiplayer.error
              ? 'Unable to play together'
              : !multiplayer.run
                ? 'Joining…'
                : !multiplayer.run.startsAt
                  ? 'Waiting for your friend'
                  : `Starting in ${Math.max(1, Math.ceil((Math.max(multiplayer.run.startsAt, multiplayer.run.courseAt) - multiplayer.clock) / 1000))}`}
          </h2>
          <p>
            {multiplayer.error ||
              `Both players should open Lava Leap at the same entrance and choose ${playMode === 'coop' ? 'Co-op' : 'Race'}.`}
          </p>
          <button onClick={backToSolo}>Back to Solo</button>
        </section>
      </div>
    );
  }
  if (playMode === 'race' && (multiplayer.run?.winner || won)) {
    return (
      <div className="ll-overlay">
        <section className="ll-panel">
          <h2>
            {!multiplayer.run?.winner
              ? 'Checking the finish…'
              : multiplayer.run.winner === multiplayer.uid
                ? 'You won the race!'
                : `${multiplayer.peers[0]?.name ?? 'Your rival'} won the race!`}
          </h2>
          <p>First to the crystal junction wins. Race mode does not change adventure rewards.</p>
          <button onClick={onClose}>Return to the caverns</button>
        </section>
      </div>
    );
  }
  return <>{children}</>;
}
