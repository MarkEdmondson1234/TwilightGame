import React from 'react';
import { tileAssets } from '../../assets';
import { LAVA_Y } from './engine';
import { isVentSealed, ventPhase, VENT_WARNING_SECONDS } from './vents';
import './scenery.css';
import type { Course } from './courses';
import { CrystalArtwork } from './CrystalArtwork';

const HAVEN_NAMES = [
  'Trailhead',
  'Ember rest',
  'Cinder shelter',
  'Wind refuge',
  'River lookout',
  'Homeward haven',
];

/** Animation is sampled from simulation time: pausing freezes every droplet and halo. */
export function LavaLeapScenery({
  time,
  checkpoint,
  checkpointTime,
  course,
  sealedVent,
}: {
  course: Course;
  sealedVent: { x: number; expires: number } | null;
  time: number;
  checkpoint: number;
  checkpointTime: number;
}) {
  return (
    <>
      {course.chutes
        .filter(
          (c, i, all) =>
            c.pressureGroup && all.findIndex((v) => v.pressureGroup === c.pressureGroup) === i
        )
        .map((chute) => {
          const group = course.chutes.filter((c) => c.pressureGroup === chute.pressureGroup);
          const ground = course.platforms.find((p) => chute.x >= p.x && chute.x < p.x + p.w)!.y;
          return (
            <div
              key={chute.pressureGroup}
              className={`ll-pressure-link ${isVentSealed(course, chute, sealedVent, time) ? 'sealed' : ''}`}
              style={{
                left: chute.x,
                top: ground + 13,
                width: group[group.length - 1].x - chute.x,
              }}
            />
          );
        })}
      {course.checkpoints.map((x, i) => {
        const ground = course.platforms.find((p) => x >= p.x && x < p.x + p.w)!.y;
        const lit = i <= checkpoint;
        const arrival = i === checkpoint ? Math.max(0, 1 - (time - checkpointTime) / 1.4) : 0;
        return (
          <div
            key={x}
            className={`ll-haven ${lit ? 'lit' : ''}`}
            style={{ left: x - 68, top: ground - 106 }}
            aria-label={`${HAVEN_NAMES[i]}: ${lit ? 'activated safe haven' : 'checkpoint ahead'}`}
          >
            <svg width="96" height="112" viewBox="0 0 96 112" aria-hidden="true">
              <ellipse
                cx="48"
                cy="103"
                rx="43"
                ry="7"
                fill={lit ? '#a4ebd5' : '#7b858c'}
                opacity=".28"
              />
              {lit && (
                <>
                  <ellipse
                    className="ll-haven-halo"
                    cx="48"
                    cy="70"
                    rx={30 + Math.sin(time * 2) * 2}
                    ry="34"
                    fill="none"
                    stroke="#c4ffe7"
                    opacity=".3"
                  />
                  <ellipse
                    className="ll-arrival-ring"
                    cx="48"
                    cy="99"
                    rx={42 + (1 - arrival) * 38}
                    ry={9 + (1 - arrival) * 12}
                    fill="none"
                    stroke="#c4ffe7"
                    strokeWidth="3"
                    opacity={arrival}
                  />
                </>
              )}
              <image href={tileAssets.rock_1} x="10" y="77" width="76" height="34" />
              <foreignObject x="25" y="29" width="46" height="58">
                <CrystalArtwork crystal={course.power} size={46} />
              </foreignObject>
              <path
                d="M27 96L34 93M62 94L69 96M44 99H51"
                stroke={lit ? '#dcffe5' : '#87959f'}
                strokeWidth="2"
              />
              {lit &&
                [0, 1, 2].map((n) => (
                  <circle
                    className="ll-haven-mote"
                    key={n}
                    cx={27 + n * 20 + Math.sin(time * 1.3 + n) * 6}
                    cy={80 - ((time * 14 + n * 21) % 60)}
                    r="2"
                    fill="#d4ffe9"
                    opacity=".6"
                  />
                ))}
            </svg>
            <span>{HAVEN_NAMES[i]}</span>
            <small>{lit ? 'Safe haven · lit' : 'Reach to activate'}</small>
          </div>
        );
      })}
      {course.chutes.map((chute, i) => {
        const sealed = isVentSealed(course, chute, sealedVent, time);
        const expiring = sealed && sealedVent!.expires - time < VENT_WARNING_SECONDS;
        const origin = chute.pressureGroup ? -40 : 130;
        const phase = ventPhase(course, chute, sealedVent, time);
        const cycle = (time + chute.phase) % 6;
        const base =
          course.platforms.find((p) => chute.x >= p.x && chute.x < p.x + p.w)?.y ?? LAVA_Y;
        const height = base - origin - 40;
        const warning =
          phase === 'warning'
            ? chute.pressureGroup
              ? time / VENT_WARNING_SECONDS
              : (cycle - 3.5) / VENT_WARNING_SECONDS
            : 0;
        const wave = Math.sin(time * 24 + i) * 5;
        return (
          <div
            key={i}
            className={`ll-vent ${phase} ${chute.pressureGroup ? 'pressure' : ''} ${expiring ? 'expiring' : ''}`}
            style={{ left: chute.x - 65, top: origin, height: base - origin + 22 }}
            aria-label={`${chute.pressureGroup ? 'Pressure' : 'Lava'} chute: ${sealed ? 'sealed' : phase}`}
          >
            <svg
              width="130"
              height={base - origin + 22}
              viewBox={`0 0 130 ${base - origin + 22}`}
              aria-hidden="true"
            >
              <ellipse
                cx="65"
                cy={base - origin + 4}
                rx="33"
                ry="12"
                fill="#382c34"
                stroke="#97817f"
                strokeWidth="4"
              />
              <ellipse
                cx="65"
                cy={base - origin}
                rx="21"
                ry="6"
                fill={phase === 'quiet' ? '#a64526' : '#ffbc57'}
              />
              {sealed && (
                <>
                  <image
                    href={tileAssets.rock_1}
                    x="32"
                    y={base - origin - 17}
                    width="66"
                    height="32"
                  />
                  <text
                    x="65"
                    y={base - origin - 21}
                    textAnchor="middle"
                    fill="#ffe3b1"
                    fontSize="13"
                  >
                    Sealed {Math.ceil(sealedVent!.expires - time)}s
                  </text>
                </>
              )}
              {phase === 'warning' && (
                <>
                  <ellipse
                    cx="65"
                    cy={base - origin - 8}
                    rx={20 + warning * 8}
                    ry={5 + warning * 9}
                    fill="#ffbc57"
                    opacity=".8"
                  />
                  {[0, 1, 2].map((n) => (
                    <circle
                      className="ll-pressure-bubble"
                      key={n}
                      cx={51 + n * 13}
                      cy={base - origin - 15 - ((time * 33 + n * 7) % 26)}
                      r={3 + warning * 3}
                      fill="#ffdb8b"
                    />
                  ))}
                </>
              )}
              {phase === 'erupting' && (
                <g>
                  <path
                    d={`M47 ${height + 40} L47 44 Q65 25 83 44 L83 ${height + 40}Z`}
                    fill="#e96628"
                    opacity=".9"
                  />
                  <path
                    d={`M54 ${height + 40} Q${70 + wave} ${height * 0.65} 55 ${height * 0.4} Q${54 - wave} 54 65 39 Q${76 + wave} 66 72 ${height * 0.5} L77 ${height + 40}Z`}
                    fill="#ffbe4e"
                  />
                  <path
                    d={`M61 ${height + 40} Q${58 + wave} ${height * 0.7} 66 54 Q${74 - wave} ${height * 0.65} 69 ${height + 40}Z`}
                    fill="#fff0a8"
                  />
                  {[0, 1, 2, 3, 4, 5].map((n) => {
                    const t = (time * 1.7 + n / 6) % 1;
                    return (
                      <ellipse
                        className="ll-lava-droplet"
                        key={n}
                        cx={65 + Math.sin(n * 5) * (12 + t * 25)}
                        cy={42 - Math.sin(t * Math.PI) * 22 + t * 70}
                        rx={2 + (1 - t) * 2}
                        ry="5"
                        fill="#ffcd64"
                        opacity={1 - t}
                      />
                    );
                  })}
                </g>
              )}
              {phase !== 'erupting' &&
                [0, 1, 2, 3].map((n) => {
                  const t = (time * 0.45 + n / 4) % 1;
                  return (
                    <ellipse
                      className="ll-vent-steam"
                      key={n}
                      cx={65 + Math.sin(time + n) * t * 18}
                      cy={base - origin - 15 - t * 55}
                      rx={6 + t * 13}
                      ry={4 + t * 8}
                      fill="#d5c6c5"
                      opacity={(1 - t) * (phase === 'warning' ? 0.35 : 0.13)}
                    />
                  );
                })}
            </svg>
            <span style={chute.pressureGroup ? { top: base - origin + 30 } : undefined}>
              {sealed
                ? expiring
                  ? 'Lids lifting!'
                  : 'Cross now'
                : chute.pressureGroup
                  ? 'Earth seals this group'
                  : phase === 'warning'
                    ? '⚠ Eruption coming'
                    : phase === 'erupting'
                      ? 'Wait for it…'
                      : 'Clear to cross'}
            </span>
          </div>
        );
      })}
    </>
  );
}
