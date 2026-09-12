import React from 'react';
import { tileAssets } from '../../assets';
import { LAVA_Y, type State, type SharedEffects } from './engine';
import { COURSES } from './courses';
import { CourseBackdrop } from './CourseBackdrop';
import { LavaLeapScenery } from './LavaLeapScenery';
import { LavaLeapPlayer } from './LavaLeapPlayer';

export function LeapViewport({
  frame,
  scale,
  sprite,
  focusX = frame.x,
  others,
  effects,
}: {
  frame: State;
  scale: number;
  sprite?: string;
  focusX?: number;
  others?: React.ReactNode;
  effects?: SharedEffects;
}) {
  const course = COURSES[frame.courseId];
  const camera = Math.max(0, Math.min(course.width - 960, focusX - 310));
  return (
    <div
      className="ll-viewport"
      style={{ width: 960, height: 540, transform: `translate(-50%, -50%) scale(${scale})` }}
      aria-label="Side-scrolling volcanic cavern"
    >
      <div
        className={`ll-backdrop ${course.id}`}
        style={{
          backgroundImage: `linear-gradient(var(--cave-top, #18242be0), var(--cave-bottom, #352639c9)), url(${tileAssets.rock_wall})`,
          backgroundPositionX: -camera * 0.2,
        }}
      />
      <div
        className="ll-world"
        style={{ transform: `translateX(${-camera}px)`, width: course.width }}
      >
        <CourseBackdrop course={course} />
        <div
          className={`ll-lava ${course.id === 'grotto' ? 'll-pool' : ''} ${course.id === 'heights' ? 'll-mushroom-depths' : ''}`}
          style={{
            top: LAVA_Y,
            backgroundImage:
              course.id === 'grotto'
                ? `url(${tileAssets.cave_lake})`
                : `linear-gradient(#ffad3680, #b72d13a0), url(${tileAssets.lava_floor_tileable})`,
          }}
        />
        {course.platforms.map((p, i) => (
          <div
            key={i}
            className={`ll-rock ${course.id}`}
            style={{
              left: p.x,
              top: p.y,
              width: p.w,
              height: 540 - p.y,
              backgroundImage: `url(${tileAssets.rock_wall})`,
            }}
          />
        ))}
        <LavaLeapScenery
          time={frame.time}
          checkpoint={frame.checkpoint}
          checkpointTime={frame.checkpointTime}
          course={course}
          sealedVent={frame.sealedVent}
          sharedSeals={effects?.seals}
        />
        {frame.courseId === 'lava' && (
          <>
            <div className="ll-sign" style={{ left: 235, top: 245 }}>
              ❄ Frost makes a foothold
              <br />
              Use power near the edge
            </div>
            <div className="ll-sign" style={{ left: 1730, top: 200 }}>
              ≈ Wind crystal
              <br />
              Jump, then lift and glide
            </div>
            <div className="ll-sign" style={{ left: 2570, top: 215 }}>
              Crystal junction ahead
              <br />
              Cross this river to choose one of three passages
            </div>
          </>
        )}
        {frame.courseId !== 'lava' && frame.courseId !== 'forge' && (
          <div className="ll-sign" style={{ left: 135, top: 180, maxWidth: 310 }}>
            {course.name}
            <br />
            {course.description}
          </div>
        )}
        <div className="ll-exit" style={{ left: course.width - 120, top: 280 }}>
          ✧<span>{frame.courseId === 'lava' ? 'Three passages' : 'Way home'}</span>
        </div>
        {course.gems.map(
          (g, i) =>
            !frame.collected.includes(i) && (
              <img
                key={i}
                className="ll-gem"
                src={tileAssets.mine_crystal}
                alt=""
                style={{ left: g.x - 20, top: g.y - 25 }}
              />
            )
        )}
        {effects?.ice.map((ice, i) => (
          <div
            key={i}
            className="ll-ice ll-shared-ice"
            style={{ left: ice.x, top: ice.y, width: ice.w }}
          >
            <span>Teammate’s Frost</span>
          </div>
        ))}
        {frame.ice && (
          <div
            className={`ll-ice ${frame.ice.expires - frame.time < 1.5 ? 'crumbling' : ''}`}
            style={{ left: frame.ice.x, top: frame.ice.y, width: frame.ice.w }}
          >
            <span>❄ {Math.ceil(frame.ice.expires - frame.time)}s</span>
          </div>
        )}
        {others}
        <LavaLeapPlayer
          x={frame.x}
          y={frame.y}
          sprite={sprite}
          rescued={frame.rescueGlow > 0}
          gliding={frame.glide > 0}
        />
      </div>
    </div>
  );
}
