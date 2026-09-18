import React, { useEffect, useState } from 'react';
import { getAuthService, getSkiingScoreService } from '../../firebase/safe';
import type { SkiingLeader, ScoreStatus } from '../../firebase/skiingScoreService';
import type { SkiRecord, WoodCounts } from './rules';
import './skiing.css';

export type SkiPhase = 'ready' | 'playing' | 'paused' | 'crashed' | 'stopped';
export interface TrailStatus {
  level: number;
  progress: number;
  score: number;
}

function Leaderboard({ startLevel, record }: { startLevel: number; record: SkiRecord | null }) {
  const [rows, setRows] = useState<SkiingLeader[]>([]);
  const [status, setStatus] = useState<ScoreStatus>('signed-out');
  const [saved, setSaved] = useState<boolean | null>(null);
  const [authTick, setAuthTick] = useState(0);
  useEffect(() => getAuthService().onAuthStateChange(() => setAuthTick((n) => n + 1)), []);
  useEffect(
    () =>
      getSkiingScoreService().watch(startLevel, (entries, next) => {
        setRows(entries);
        setStatus(next);
      }),
    [startLevel, authTick]
  );
  useEffect(() => {
    let cancelled = false;
    setSaved(null);
    if (record && status === 'ready') {
      void getSkiingScoreService()
        .submit(startLevel, record)
        .then((ok) => {
          if (!cancelled) setSaved(ok);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [record, status, startLevel, authTick]);
  return (
    <div className="ski-records">
      <h3>
        Trail records <small>Starting at forest level {startLevel}</small>
      </h3>
      {status === 'signed-out' ? (
        <p>Sign in to compare scores with other skiers. Your best is saved on this device.</p>
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

export function SkiingHud({
  phase,
  trail,
  wood,
  kept,
  best,
  record,
  startLevel,
  onStart,
  onResume,
  onStop,
  onExit,
  onRetry,
  onHold,
}: {
  phase: SkiPhase;
  trail: TrailStatus;
  wood: WoodCounts;
  kept: WoodCounts;
  best: number;
  record: SkiRecord | null;
  startLevel: number;
  onStart: () => void;
  onResume: () => void;
  onStop: () => void;
  onExit: () => void;
  onRetry: () => void;
  onHold: (key: 'left' | 'right' | 'boost', held: boolean) => void;
}) {
  const ended = phase === 'crashed' || phase === 'stopped';
  const total = (counts: WoodCounts) => Object.values(counts).reduce((a, b) => a + b, 0);
  const hold = (key: 'left' | 'right' | 'boost') => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      onHold(key, true);
    },
    onPointerUp: () => onHold(key, false),
    onPointerCancel: () => onHold(key, false),
    onLostPointerCapture: () => onHold(key, false),
  });
  return (
    <div className="ski-ui">
      <header className="ski-hud">
        <div className="ski-trail">
          <strong>Forest level {trail.level}</strong>
          <span>{trail.level >= 4 ? 'Wolf country' : 'Winter trail'}</span>
          <progress value={trail.progress} max={1} aria-label="Progress to next forest level" />
        </div>
        <div className="ski-score">
          <strong>{trail.score.toLocaleString()}</strong>
          <span>Score · best {best.toLocaleString()}</span>
        </div>
        <button onClick={onStop} disabled={ended}>
          {phase === 'ready' ? 'Back to forest' : 'Stop safely'}
        </button>
        <div className="ski-wood" aria-label="Collected firewood">
          Firewood: <b>{wood.wood_poor}</b> poor / <b>{wood.wood_medium}</b> medium /{' '}
          <b>{wood.wood_fine}</b> fine
        </div>
      </header>
      {phase === 'playing' && (
        <nav className="ski-controls" aria-label="Ski controls">
          <div>
            <button aria-label="Steer left" {...hold('left')}>
              ◀
            </button>
            <button aria-label="Steer right" {...hold('right')}>
              ▶
            </button>
          </div>
          <button aria-label="Boost" {...hold('boost')}>
            Boost
          </button>
        </nav>
      )}
      {phase !== 'playing' && (
        <div className="ski-scrim">
          <section className="ski-panel" aria-label="Skiing" aria-live="polite">
            <h1>
              {phase === 'ready'
                ? 'Through the winter woods'
                : phase === 'paused'
                  ? 'A moment on the trail'
                  : phase === 'crashed'
                    ? 'A tumble in the snow'
                    : 'A good place to stop'}
            </h1>
            {phase === 'ready' && (
              <>
                <p>
                  Follow the trail deeper into the forest. Stop safely at any time to explore the
                  level you’ve reached.
                </p>
                <p>
                  <strong>← → or A / D</strong> to steer. <strong>↑ or W</strong> to boost. Amber
                  snow marks an approaching collision — steer away.
                </p>
                <p>
                  A tumble returns you to the forest entrance with a quarter of your firewood,
                  rounded up. Speed builds as you travel. From level 4, wolves prepare, then leap
                  towards your path — boost past or dodge their landing.
                </p>
                <button className="ski-primary" onClick={onStart}>
                  Start skiing
                </button>
                <button onClick={onStop}>Back to the forest</button>
              </>
            )}
            {phase === 'paused' && (
              <>
                <p>Your run is paused.</p>
                <button className="ski-primary" onClick={onResume}>
                  Continue skiing
                </button>
                <button onClick={onStop}>Stop safely</button>
              </>
            )}
            {ended && (
              <>
                <div className="ski-result">
                  <strong>{trail.score.toLocaleString()}</strong>
                  <span>points · forest level {trail.level}</span>
                </div>
                <p>
                  {phase === 'crashed'
                    ? `You kept ${total(kept)} of ${total(wood)} logs. Catch your breath at the forest entrance.`
                    : `You’re keeping all ${total(wood)} logs. Step into forest level ${trail.level}.`}
                </p>
                <p>
                  Personal best from level {startLevel}: <strong>{best.toLocaleString()}</strong>
                </p>
                <button className="ski-primary" onClick={onExit}>
                  {phase === 'crashed'
                    ? 'Back to the forest entrance'
                    : `Explore forest level ${trail.level}`}
                </button>
                {phase === 'crashed' && (
                  <button onClick={onRetry}>Ski again from the entrance</button>
                )}
              </>
            )}
            {phase !== 'paused' && <Leaderboard startLevel={startLevel} record={record} />}
          </section>
        </div>
      )}
    </div>
  );
}
