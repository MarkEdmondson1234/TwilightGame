import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MiniGameComponentProps } from '../types';
import { tileAssets } from '../../assets';
import { gameState } from '../../GameState';
import { DEFAULT_CHARACTER, generateCharacterSprites } from '../../utils/characterSprites';
import { Direction } from '../../types';
import { Z_MINI_GAME } from '../../zIndex';
import {
  CHECKPOINTS,
  CHUTES,
  COURSE_WIDTH,
  CRYSTALS,
  GEMS,
  LAVA_Y,
  PLAYER,
  PLATFORMS,
  chutePhase,
  createState,
  rescue,
  selectCrystal,
  step,
  type Crystal,
  type Input,
} from './engine';
import './lavaLeap.css';

interface Progress {
  windUnlocked?: boolean;
  completed?: boolean;
  bestGems?: number;
}
const emptyInput = (): Input => ({ left: false, right: false, jump: false, power: false });

export const LavaLeapGame: React.FC<MiniGameComponentProps> = ({
  context,
  onClose,
  onComplete,
}) => {
  const playtest = context.triggerData?.extra?.playtest === true;
  const [saved] = useState<Progress>(() =>
    playtest ? {} : (context.storage.load<Progress>() ?? {})
  );
  const simulation = useRef(createState(saved.windUnlocked === true));
  const [frame, setFrame] = useState(() => ({ ...simulation.current }));
  const [mode, setMode] = useState<'intro' | 'playing' | 'paused'>('intro');
  const input = useRef(emptyInput());
  const keys = useRef(new Set<string>());
  const touches = useRef(new Map<number, keyof Input>());
  const claimed = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const character = gameState.getSelectedCharacter() || DEFAULT_CHARACTER;
  const sprites = useMemo(() => generateCharacterSprites(character), [character]);
  const direction = frame.facing > 0 ? Direction.Right : Direction.Left;
  const sprite =
    sprites[direction]?.[
      frame.grounded && (input.current.left || input.current.right)
        ? Math.floor(frame.time * 9) % sprites[direction].length
        : 0
    ];
  const camera = Math.max(0, Math.min(COURSE_WIDTH - 960, frame.x - 310));
  const active = CRYSTALS[frame.crystal];

  const clearInput = () => {
    keys.current.clear();
    touches.current.clear();
    input.current = emptyInput();
  };
  const syncMovement = () => {
    input.current.left =
      keys.current.has('arrowleft') ||
      keys.current.has('a') ||
      [...touches.current.values()].includes('left');
    input.current.right =
      keys.current.has('arrowright') ||
      keys.current.has('d') ||
      [...touches.current.values()].includes('right');
  };

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(entry.contentRect.width / 960, entry.contentRect.height / 540))
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const pause = () => {
      clearInput();
      setMode((m) => (m === 'playing' ? 'paused' : m));
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        ![
          'a',
          'd',
          'arrowleft',
          'arrowright',
          'arrowup',
          'w',
          ' ',
          'e',
          '1',
          '2',
          'escape',
        ].includes(key)
      )
        return;
      // Keep Space/Enter behaviour on focused menu buttons; never launch a jump from them.
      if (mode !== 'playing') return;
      e.preventDefault();
      if (key === 'escape') {
        pause();
        return;
      }
      keys.current.add(key);
      syncMovement();
      if (e.repeat) return;
      if ([' ', 'w', 'arrowup'].includes(key)) input.current.jump = true;
      if (key === 'e') input.current.power = true;
      if (key === '1' || key === '2')
        selectCrystal(simulation.current, key === '1' ? 'frost' : 'wind');
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
      syncMovement();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibility);
      clearInput();
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== 'playing' || frame.won) return;
    let handle = 0;
    let last = 0;
    let accumulator = 0;
    let painted = 0;
    const tick = (now: number) => {
      accumulator += last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const s = simulation.current;
      const hadWind = s.windUnlocked;
      const gems = s.collected.length;
      while (accumulator >= 1 / 120) {
        step(s, input.current, 1 / 120);
        input.current.jump = false;
        input.current.power = false;
        accumulator -= 1 / 120;
      }
      if (!hadWind && s.windUnlocked) {
        if (!playtest) context.storage.save({ ...saved, windUnlocked: true });
        context.actions.playSfx('sfx_magic_transition');
      } else if (s.collected.length > gems) context.actions.playSfx('sfx_harvest');
      if (now - painted >= 1000 / 30 || s.won) {
        setFrame({ ...s, collected: [...s.collected] });
        painted = now;
      }
      if (!s.won) handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [mode, frame.won, context.actions, context.storage, saved, playtest]);

  const choose = (crystal: Crystal) => {
    selectCrystal(simulation.current, crystal);
    setFrame({ ...simulation.current });
  };
  const finish = () => {
    if (claimed.current || !simulation.current.won) return;
    claimed.current = true;
    onComplete({
      success: true,
      score: frame.collected.length,
      goldReward: playtest || saved.completed ? 0 : 30,
      message: playtest
        ? 'Practice crossing complete!'
        : saved.completed
          ? 'Another brilliant crossing!'
          : 'Lava Leap complete! You earned 30 gold.',
      progressData: playtest
        ? undefined
        : {
            windUnlocked: true,
            completed: true,
            bestGems: Math.max(saved.bestGems ?? 0, frame.collected.length),
          },
    });
  };
  const control = (action: keyof Input, label: string, text: string) => (
    <button
      type="button"
      aria-label={label}
      disabled={mode !== 'playing' || frame.won}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        touches.current.set(e.pointerId, action);
        if (action === 'jump' || action === 'power') input.current[action] = true;
        syncMovement();
      }}
      onPointerUp={(e) => {
        touches.current.delete(e.pointerId);
        syncMovement();
      }}
      onPointerCancel={(e) => {
        touches.current.delete(e.pointerId);
        syncMovement();
      }}
      onLostPointerCapture={(e) => {
        touches.current.delete(e.pointerId);
        syncMovement();
      }}
      onClick={(e) => {
        if (e.detail === 0) input.current[action] = true;
      }}
    >
      {text}
    </button>
  );

  return (
    <div
      className="lava-leap"
      style={{ zIndex: Z_MINI_GAME }}
      role="dialog"
      aria-modal="true"
      aria-label="Lava Leap"
    >
      <header className="ll-header">
        <div>
          <h1>Lava Leap</h1>
          <span>
            {frame.x < 1650
              ? 'The broken crossing'
              : frame.x < 2520
                ? 'The breathing cavern'
                : 'The great lava river'}
          </span>
        </div>
        <div className="ll-score">
          ◆ {frame.collected.length}/{GEMS.length}
          <small>treasures · best {saved.bestGems ?? 0}</small>
        </div>
        <button
          onClick={() => {
            clearInput();
            setMode(mode === 'playing' ? 'paused' : 'playing');
          }}
          disabled={mode === 'intro' || frame.won}
        >
          {mode === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button onClick={onClose}>Leave</button>
      </header>
      <div className="ll-stage" ref={stage}>
        <div
          className="ll-viewport"
          style={{ width: 960, height: 540, transform: `translate(-50%, -50%) scale(${scale})` }}
          aria-label="Side-scrolling volcanic cavern"
        >
          <div
            className="ll-backdrop"
            style={{
              backgroundImage: `linear-gradient(#18242be0, #352639c9), url(${tileAssets.rock_wall})`,
              backgroundPositionX: -camera * 0.2,
            }}
          />
          <div
            className="ll-world"
            style={{ transform: `translateX(${-camera}px)`, width: COURSE_WIDTH }}
          >
            <div
              className="ll-lava"
              style={{
                top: LAVA_Y,
                backgroundImage: `linear-gradient(#ffad3680, #b72d13a0), url(${tileAssets.lava_floor_tileable})`,
              }}
            />
            {PLATFORMS.map((p, i) => (
              <div
                key={i}
                className="ll-rock"
                style={{
                  left: p.x,
                  top: p.y,
                  width: p.w,
                  height: 540 - p.y,
                  backgroundImage: `url(${tileAssets.rock_wall})`,
                }}
              />
            ))}
            {CHECKPOINTS.map((x, i) => {
              const y = PLATFORMS.find((p) => x >= p.x && x < p.x + p.w)!.y;
              return (
                <div
                  key={x}
                  className={`ll-checkpoint ${i <= frame.checkpoint ? 'lit' : ''}`}
                  style={{ left: x, top: y - 55 }}
                >
                  <span>⚑</span>
                  <small>{i === 0 ? 'Start' : 'Safe haven'}</small>
                </div>
              );
            })}
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
              Choose your route
              <br />❄ Across the river · ≈ Over the ridge
            </div>
            <div className="ll-exit" style={{ left: 3780, top: 280 }}>
              ✧<span>Way home</span>
            </div>
            {GEMS.map(
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
            {CHUTES.map((chute, i) => {
              const phase = chutePhase(frame.time, chute.phase);
              return (
                <div key={i} className={`ll-chute ${phase}`} style={{ left: chute.x - 18 }}>
                  <span>
                    {phase === 'warning'
                      ? '⚠ Stand back!'
                      : phase === 'erupting'
                        ? 'Lava!'
                        : 'Chute'}
                  </span>
                </div>
              );
            })}
            {frame.ice && (
              <div
                className={`ll-ice ${frame.ice.expires - frame.time < 1.5 ? 'crumbling' : ''}`}
                style={{ left: frame.ice.x, top: frame.ice.y, width: frame.ice.w }}
              >
                <span>❄ {Math.ceil(frame.ice.expires - frame.time)}s</span>
              </div>
            )}
            <div
              className={`ll-player ${frame.rescueGlow > 0 ? 'rescued' : ''}`}
              style={{
                left: frame.x - 14,
                top: frame.y - 16,
                width: PLAYER.w + 28,
                height: PLAYER.h + 16,
              }}
            >
              {sprite ? <img src={sprite} alt="Your character" /> : <span>🧙</span>}
              {frame.glide > 0 && <span className="ll-wind-trail">≈</span>}
            </div>
          </div>
        </div>
        {(mode !== 'playing' || frame.won) && (
          <div className="ll-overlay">
            <section className="ll-panel">
              <span className="ll-panel-icon">❄ &nbsp; ≈</span>
              <h2>
                {frame.won
                  ? 'Across the river!'
                  : mode === 'paused'
                    ? 'A moment to breathe'
                    : 'A little courage. A little crystal magic.'}
              </h2>
              {frame.won ? (
                <>
                  <p>
                    You found {frame.collected.length} of {GEMS.length} treasures.{' '}
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
                      rescue(simulation.current);
                      setFrame({ ...simulation.current });
                      setMode('playing');
                    }}
                  >
                    Return to checkpoint
                  </button>
                </>
              ) : (
                <>
                  <p>
                    Cross the lava rivers, discover the Wind crystal and find your way home. Falls
                    bring you back to a safe haven with your treasures intact.
                  </p>
                  <p>
                    <strong>Move:</strong> A/D or arrows · <strong>Jump:</strong> Space
                    <br />
                    <strong>Power:</strong> E · <strong>Choose crystal:</strong> 1/2
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
      </div>
      <div className="ll-notice" role="status">
        {frame.notice}
      </div>
      <footer className="ll-controls">
        <div className="ll-movement">
          {control('left', 'Move left', '◀')}
          {control('right', 'Move right', '▶')}
        </div>
        <div className="ll-crystals">
          {(['frost', 'wind'] as Crystal[]).map((crystal, i) => (
            <button
              key={crystal}
              aria-pressed={frame.crystal === crystal}
              disabled={crystal === 'wind' && !frame.windUnlocked}
              onClick={() => choose(crystal)}
              style={{ '--crystal-colour': CRYSTALS[crystal].colour } as React.CSSProperties}
            >
              {CRYSTALS[crystal].symbol} {CRYSTALS[crystal].name}
              <small>
                {crystal === 'wind' && !frame.windUnlocked ? 'Find in the cavern' : `Key ${i + 1}`}
              </small>
            </button>
          ))}
        </div>
        <div className="ll-actions">
          {control('jump', 'Jump', 'Jump ↑')}
          {control(
            'power',
            `Use ${active.name} crystal`,
            frame.cooldown > 0
              ? `${frame.cooldown.toFixed(1)}s`
              : frame.crystal === 'wind' && frame.windUsed
                ? 'Land to recharge'
                : `${active.symbol} Power`
          )}
        </div>
      </footer>
      <div className="ll-help">
        {active.help}{' '}
        {frame.crystal === 'frost' ? 'Switching crystals makes the stone crumble.' : ''}
      </div>
    </div>
  );
};
