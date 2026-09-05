import React from 'react';
import { tileAssets } from '../../assets';
import type { Course } from './courses';

/** Existing cave artwork marks each passage without obscuring its landing edges. */
export function CourseBackdrop({ course }: { course: Course }) {
  if (course.id === 'lava') return null;
  const asset =
    course.id === 'heights'
      ? tileAssets.luminescent_toadstool
      : course.id === 'forge'
        ? tileAssets.stone_column
        : tileAssets.mine_crystal;
  return (
    <div className={`ll-cave-dressing ${course.id}`} aria-hidden="true">
      {course.platforms.map((p, i) => (
        <img
          key={i}
          src={asset}
          alt=""
          style={{
            position: 'absolute',
            left: p.x + p.w / 2 - (course.id === 'heights' ? 200 : 105),
            top: course.id === 'heights' ? 245 + (i % 2) * 45 : p.y - 240,
            width: course.id === 'heights' ? 400 : 210 + (i % 2) * 75,
            height: course.id === 'heights' ? 330 : 245,
            objectFit: 'contain',
            opacity: 0.5,
          }}
        />
      ))}
      {course.id === 'forge' && (
        <>
          {[300, 900, 1500, 2100].map((x) => (
            <img
              key={x}
              src={tileAssets.torch01}
              alt=""
              style={{
                position: 'absolute',
                left: x,
                top: 45,
                width: 75,
                height: 160,
                opacity: 0.65,
              }}
            />
          ))}
          <div className="ll-forge-instruction" style={{ left: 110, top: 180 }}>
            <strong>Pressure gauntlet</strong>
            These jets never stop by themselves. Select Earth, use its power, then cross all three
            linked chutes.
          </div>
        </>
      )}
    </div>
  );
}
