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
            left: p.x + p.w / 2 - 105,
            top: p.y - 185,
            width: 210,
            height: 190,
            objectFit: 'contain',
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}
