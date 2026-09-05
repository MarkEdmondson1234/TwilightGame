import React from 'react';
import { BRANCHES, COURSES, type CourseId } from './courses';
import { CrystalArtwork } from './CrystalArtwork';
import type { State } from './engine';
interface Props {
  mode: 'intro' | 'playing' | 'paused';
  frame: State;
  totalGems: number;
  availableGems: number;
  playtest: boolean;
  saved: { completed?: boolean; routesCompleted?: CourseId[] };
  startBranch: (id: CourseId) => void;
  finish: () => void;
  setMode: (mode: 'intro' | 'playing' | 'paused') => void;
  returnToCheckpoint: () => void;
}
export function ExpeditionOverlay({
  mode,
  frame,
  totalGems,
  availableGems,
  playtest,
  saved,
  startBranch,
  finish,
  setMode,
  returnToCheckpoint,
}: Props) {
  const course = COURSES[frame.courseId];
  return (
    <>
      {(mode !== 'playing' || frame.won) && (
        <div className="ll-overlay">
          <section className="ll-panel">
            <span className="ll-panel-icon">❄ &nbsp; ≈</span>
            <h2>
              {frame.won
                ? frame.courseId === 'lava'
                  ? 'Three paths into the deep'
                  : `${course.name} complete!`
                : mode === 'paused'
                  ? 'A moment to breathe'
                  : 'A little courage. A little crystal magic.'}
            </h2>
            {frame.won && frame.courseId === 'lava' ? (
              <>
                <p>
                  You found the Earth crystal! It seals nearby vents and linked groups for four
                  seconds. Choose a passage: each leads through a different cavern.
                </p>
                <div className="ll-route-choice">
                  {BRANCHES.map((id) => (
                    <button key={id} onClick={() => startBranch(id)}>
                      <CrystalArtwork crystal={COURSES[id].power} size={46} />
                      <strong>{COURSES[id].name}</strong>
                      <span>{COURSES[id].description}</span>
                      <small>
                        {saved.routesCompleted?.includes(id) ? 'Explored before' : 'New passage'}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            ) : frame.won ? (
              <>
                <p>
                  You found {totalGems} of {availableGems} treasures.{' '}
                  {playtest
                    ? 'Practice complete. Your saved adventure is unchanged.'
                    : saved.completed
                      ? 'Try another route next time.'
                      : 'Your first crossing earns 30 gold.'}
                </p>
                <button onClick={finish}>Return to the caverns</button>
              </>
            ) : mode === 'paused' ? (
              <>
                <p>Your adventure is paused.</p>
                <button onClick={() => setMode('playing')}>Keep exploring</button>
                <button
                  onClick={() => {
                    returnToCheckpoint();
                    setMode('playing');
                  }}
                >
                  Return to checkpoint
                </button>
              </>
            ) : (
              <>
                <p>
                  Cross the lava rivers, discover Wind and Earth, then choose one of three cave
                  passages. Falls bring you back to a safe haven with your treasures intact.
                </p>
                <p>
                  <strong>Move:</strong> A/D or arrows · <strong>Jump:</strong> Space
                  <br />
                  <strong>Power:</strong> E · <strong>Choose crystal:</strong> 1/2/3
                  <br />
                  You can also use the buttons below.
                </p>
                <p>
                  Chutes glow amber before erupting. Stop on safe ground and watch their rhythm.
                </p>
                <button onClick={() => setMode('playing')}>Enter the cavern</button>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
