import React, { useEffect, useState } from 'react';
import { getAuthService, getAgilityScoreService, whenFirebaseSettled } from '../../firebase/safe';
import type { AgilityLeader, ScoreStatus } from '../../firebase/agilityScoreService';
import { TRIAL_DISTANCE, type CartRecord, type CartPhase } from './rules';
import './minecart.css';

function Leaderboard({ record }: { record: CartRecord | null }) {
  const [rows, setRows] = useState<AgilityLeader[]>([]);
  const [status, setStatus] = useState<ScoreStatus>('signed-out');
  const [saved, setSaved] = useState<boolean | null>(null);
  const [authTick, setAuthTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};
    void whenFirebaseSettled()
      .then((available) => {
        if (cancelled) return;
        if (!available) {
          setStatus('unavailable');
          return;
        }
        unsubscribe = getAuthService().onAuthStateChange(() => setAuthTick((n) => n + 1));
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
  useEffect(
    () =>
      getAgilityScoreService().watch((entries, next) => {
        setRows(entries);
        setStatus(next);
      }),
    [authTick]
  );
  useEffect(() => {
    let cancelled = false;
    setSaved(null);
    if (record && status === 'ready') {
      void getAgilityScoreService()
        .submit(record)
        .then((ok) => {
          if (!cancelled) setSaved(ok);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [record, status, authTick]);
  return (
    <div className="cart-records">
      <h3>Trial records</h3>
      {status === 'signed-out' ? (
        <p>Sign in to compare scores with other riders. Your best is saved on this device.</p>
      ) : status === 'unavailable' ? (
        <p>Global records are unavailable. Your best is saved on this device.</p>
      ) : (
        <>
          <p>
            Global best:{' '}
            <strong>{rows[0]?.score.toLocaleString() ?? 'Set the first record!'}</strong>
          </p>
          <ol>
            {rows.slice(0, 5).map((row) => (
              <li key={row.id}>
                <span>{row.name}</span>
                <strong>{row.score.toLocaleString()}</strong>
              </li>
            ))}
          </ol>
          {saved === false && <p>Your score is saved locally; we’ll try sharing it next time.</p>}
        </>
      )}
    </div>
  );
}

export function MineCartHud({
  practice,
  canPractice,
  onPractice,
  phase,
  distance,
  best,
  record,
  onStart,
  onResume,
  onRetry,
  onExit,
  onHold,
}: {
  practice: boolean;
  canPractice: boolean;
  onPractice: () => void;
  phase: CartPhase;
  distance: number;
  best: number;
  record: CartRecord | null;
  onStart: () => void;
  onResume: () => void;
  onRetry: () => void;
  onExit: () => void;
  onHold: (key: 'left' | 'right', held: boolean) => void;
}) {
  const passed = distance >= TRIAL_DISTANCE;
  const hold = (key: 'left' | 'right') => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      onHold(key, true);
    },
    onPointerUp: () => onHold(key, false),
    onPointerCancel: () => onHold(key, false),
    onLostPointerCapture: () => onHold(key, false),
  });
  return (
    <div className="cart-ui">
      <header className="cart-hud">
        <div className="cart-trail">
          <strong>Test of Agility</strong>
          <span>
            {practice
              ? 'Free play · high-score run'
              : passed
                ? 'Trial passed · endurance run'
                : `Tunnel ${1 + Math.floor(distance / 4000)} · ${Math.round(Math.min(100, (distance / TRIAL_DISTANCE) * 100))}% of trial`}
          </span>
          <progress
            value={Math.min(distance, TRIAL_DISTANCE)}
            max={TRIAL_DISTANCE}
            aria-label="Trial progress"
          />
        </div>
        <div className="cart-score">
          <strong>{Math.floor(distance / 10).toLocaleString()}</strong>
          <span>Score · best {best.toLocaleString()}</span>
        </div>
        {phase === 'playing' && (
          <button onClick={onExit}>
            {practice ? 'Finish run' : passed ? 'Finish trial' : 'Leave trial'}
          </button>
        )}
      </header>
      {phase === 'playing' && (
        <nav className="cart-controls" aria-label="Minecart controls">
          <div>
            <button aria-label="Steer left" {...hold('left')}>
              ◀
            </button>
            <button aria-label="Steer right" {...hold('right')}>
              ▶
            </button>
          </div>
        </nav>
      )}
      {phase !== 'playing' && (
        <div className="cart-scrim">
          <section className="cart-panel" aria-label="Test of Agility" aria-live="polite">
            <h1>
              {phase === 'ready'
                ? 'The crystal tunnels'
                : phase === 'paused'
                  ? 'A moment in the tunnel'
                  : phase === 'passed'
                    ? 'You passed the Test of Agility'
                    : 'The cart crashed'}
            </h1>
            {phase === 'ready' && (
              <>
                <p>
                  Steer through three tunnel stretches to pass the wizard’s trial. The cart gathers
                  speed as you go.
                </p>
                <p>
                  <strong>← → or A / D</strong> to steer. <strong>Escape</strong> to pause. Amber
                  marks a collision ahead. Goblins signal before lunging—dodge after they commit.
                </p>
                <p>
                  Nothing to collect: your score comes from distance. After passing, you can keep
                  riding for a higher score.
                </p>
                <button className="cart-primary" onClick={onStart}>
                  Start trial
                </button>
                {canPractice && <button onClick={onPractice}>Play for a high score</button>}
                <button onClick={onExit}>Leave trial</button>
              </>
            )}
            {phase === 'paused' && (
              <>
                <p>Your run is paused.</p>
                <button className="cart-primary" onClick={onResume}>
                  Continue riding
                </button>
                <button onClick={onExit}>
                  {practice ? 'Finish run' : passed ? 'Finish trial' : 'Return to antechamber'}
                </button>
              </>
            )}
            {phase === 'passed' && (
              <>
                <p>
                  Continue to the Test of Patience, or brave faster tunnels for a higher score. Your
                  trial pass is secured.
                </p>
                <button className="cart-primary" onClick={onExit}>
                  Continue to Test of Patience
                </button>
                <button onClick={onResume}>Ride on for a high score</button>
              </>
            )}
            {phase === 'crashed' && (
              <>
                <div className="cart-result">
                  <strong>{Math.floor(distance / 10).toLocaleString()}</strong>
                  <span>points · tunnel {1 + Math.floor(distance / 4000)}</span>
                </div>
                <p>
                  {practice
                    ? 'Your score is saved. Ride again or return to the chamber.'
                    : passed
                      ? 'Your trial pass is secured. The Test of Patience awaits.'
                      : 'Try again from the tunnel entrance, or return to the antechamber.'}
                </p>
                {passed && !practice ? (
                  <button className="cart-primary" onClick={onExit}>
                    Continue to Test of Patience
                  </button>
                ) : (
                  <>
                    <button className="cart-primary" onClick={onRetry}>
                      Try again
                    </button>
                    <button onClick={onExit}>
                      {practice ? 'Finish run' : 'Return to antechamber'}
                    </button>
                  </>
                )}
              </>
            )}
            <p>
              Personal best: <strong>{best.toLocaleString()}</strong>
            </p>
            {phase !== 'paused' && <Leaderboard record={record} />}
          </section>
        </div>
      )}
    </div>
  );
}
