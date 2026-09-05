import React from 'react';
import { tileAssets } from '../../assets';
import { CHECKPOINTS, CHUTES, LAVA_Y, PLATFORMS, chutePhase } from './engine';
import './scenery.css';

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
}: {
  time: number;
  checkpoint: number;
  checkpointTime: number;
}) {
  return (
    <>
      {CHECKPOINTS.map((x, i) => {
        const ground = PLATFORMS.find((p) => x >= p.x && x < p.x + p.w)!.y;
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
              <path
                d="M36 87L32 58L47 29L62 59L58 87Z"
                fill={lit ? '#69b9b7' : '#556675'}
                stroke={lit ? '#caffee' : '#91a4ab'}
                strokeWidth="2"
              />
              <path
                d="M47 29L47 88L32 58ZM47 29L62 59L47 69"
                fill={lit ? '#d9fff0' : '#7f929d'}
                opacity=".75"
              />
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
      {CHUTES.map((chute, i) => {
        const phase = chutePhase(time, chute.phase);
        const cycle = (time + chute.phase) % 6;
        const base = PLATFORMS.find((p) => chute.x >= p.x && chute.x < p.x + p.w)?.y ?? LAVA_Y;
        const height = base - 170;
        const warning = phase === 'warning' ? (cycle - 3.5) / 1.3 : 0;
        const wave = Math.sin(time * 24 + i) * 5;
        return (
          <div
            key={i}
            className={`ll-vent ${phase}`}
            style={{ left: chute.x - 65, top: 130, height: base - 130 + 22 }}
            aria-label={`Lava chute: ${phase}`}
          >
            <svg
              width="130"
              height={base - 130 + 22}
              viewBox={`0 0 130 ${base - 130 + 22}`}
              aria-hidden="true"
            >
              <ellipse
                cx="65"
                cy={base - 130 + 4}
                rx="33"
                ry="12"
                fill="#382c34"
                stroke="#97817f"
                strokeWidth="4"
              />
              <ellipse
                cx="65"
                cy={base - 130}
                rx="21"
                ry="6"
                fill={phase === 'quiet' ? '#a64526' : '#ffbc57'}
              />
              {phase === 'warning' && (
                <>
                  <ellipse
                    cx="65"
                    cy={base - 138}
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
                      cy={base - 145 - ((time * 33 + n * 7) % 26)}
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
                      cy={base - 145 - t * 55}
                      rx={6 + t * 13}
                      ry={4 + t * 8}
                      fill="#d5c6c5"
                      opacity={(1 - t) * (phase === 'warning' ? 0.35 : 0.13)}
                    />
                  );
                })}
            </svg>
            <span>
              {phase === 'warning'
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
