import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MiniGameComponentProps } from '../types';
import { gameState } from '../../GameState';
import { DEFAULT_CHARACTER, generateCharacterSprites } from '../../utils/characterSprites';
import { Direction } from '../../types';
import { Z_MINI_GAME } from '../../zIndex';
import {
  CRYSTALS,
  createState,
  enterBranch,
  rescue,
  selectCrystal,
  step,
  type Crystal,
  type Input,
} from './engine';
import './lavaLeap.css';
import { lavaSoundEvents } from './soundEvents';
import { COURSES, type CourseId } from './courses';
import { ExpeditionOverlay } from './ExpeditionOverlay';
import { CrystalArtwork } from './CrystalArtwork';
import { unlockLavaPassage } from './progression';
import { LeapOnlineOverlay } from './LeapOnlineOverlay';
import { LeapViews } from './LeapViews';
import { useLeapMultiplayer } from './useLeapMultiplayer';
import { type PlayMode } from './multiplayer';

interface Progress {
  windUnlocked?: boolean;
  completed?: boolean;
  earthUnlocked?: boolean;
  routesCompleted?: CourseId[];
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
  const simulation = useRef({
    ...createState(saved.windUnlocked === true),
    earthUnlocked: saved.earthUnlocked === true,
  });
  const [frame, setFrame] = useState(() => ({ ...simulation.current }));
  const [mode, setMode] = useState<'intro' | 'playing' | 'paused'>('intro');
  const [playMode, setPlayMode] = useState<PlayMode>('solo');
  const [stacked, setStacked] = useState(false);
  const input = useRef(emptyInput());
  const keys = useRef(new Set<string>());
  const touches = useRef(new Map<number, keyof Input>());
  const claimed = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const character = gameState.getSelectedCharacter() || DEFAULT_CHARACTER;
  const multiplayer = useLeapMultiplayer(
    playMode,
    context.gameState?.currentMapId ?? 'practice',
    character.name ?? 'Explorer',
    character.characterId ?? 'character1',
    simulation
  );
  const network = useRef(multiplayer);
  network.current = multiplayer;
  const sprites = useMemo(() => generateCharacterSprites(character), [character]);
  const direction = frame.facing > 0 ? Direction.Right : Direction.Left;
  const sprite =
    sprites[direction]?.[
      frame.grounded && (input.current.left || input.current.right)
        ? Math.floor(frame.time * 9) % sprites[direction].length
        : 0
    ];
  const course = COURSES[frame.courseId];
  const totalGems = frame.bankedGems + frame.collected.length;
  const availableGems =
    (frame.courseId === 'lava' ? 0 : COURSES.lava.gems.length) + course.gems.length;
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
    const observer = new ResizeObserver(([entry]) => {
      const split = playMode === 'race';
      const vertical = entry.contentRect.width < 700;
      setStacked(vertical);
      setScale(
        Math.min(
          entry.contentRect.width / (split && !vertical ? 1920 : 960),
          entry.contentRect.height / (split && vertical ? 1080 : 540)
        )
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [playMode]);

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
          '3',
          'escape',
        ].includes(key)
      )
        return;
      // Keep Space/Enter behaviour on focused menu buttons; never launch a jump from them.
      if (
        mode !== 'playing' ||
        !network.current.ready ||
        network.current.error ||
        network.current.run?.winner
      )
        return;
      e.preventDefault();
      if (key === 'escape') {
        pause();
        return;
      }
      keys.current.add(key);
      syncMovement();
      if (e.repeat) return;
      if (['w', 'arrowup'].includes(key)) input.current.jump = true;
      if (key === ' ' || key === 'e') input.current.power = true;
      if (key === '1' || key === '2' || key === '3')
        selectCrystal(simulation.current, key === '1' ? 'frost' : key === '2' ? 'wind' : 'earth');
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
    if (playMode === 'solo' && (mode !== 'playing' || frame.won)) return;
    let handle = 0;
    let last = 0;
    let accumulator = 0;
    let painted = 0;
    const tick = (now: number) => {
      accumulator += last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const net = network.current;
      const playing = mode === 'playing' && net.ready && !net.error && !net.run?.winner;
      const hadWind = simulation.current.windUnlocked;
      const hadEarth = simulation.current.earthUnlocked;
      const shared = playMode !== 'solo' ? net.beforeStep(playing) : undefined;
      const s = simulation.current;
      const before = { ...s, collected: [...s.collected] };
      while (accumulator >= 1 / 120) {
        if (playing && !s.won) {
          const cooldown = s.cooldown;
          step(s, input.current, 1 / 120, shared);
          if (playMode !== 'solo' && input.current.power && s.cooldown > cooldown) net.recordCast();
        }
        input.current.jump = false;
        input.current.power = false;
        accumulator -= 1 / 120;
      }
      if (playMode !== 'race' && !hadWind && s.windUnlocked) {
        if (!playtest) context.storage.save({ ...saved, windUnlocked: true });
      }
      if (playMode !== 'race' && !hadEarth && s.earthUnlocked && !playtest)
        context.storage.save({ ...saved, windUnlocked: true, earthUnlocked: true });
      for (const sound of lavaSoundEvents(before, s)) context.actions.playSfx(`sfx_lava_${sound}`);
      if (now - painted >= 1000 / 30 || s.won) {
        setFrame({ ...s, collected: [...s.collected] });
        painted = now;
      }
      if (!s.won || playMode !== 'solo') handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [mode, frame.won, context.actions, context.storage, saved, playtest, playMode]);

  const choose = (crystal: Crystal) => {
    selectCrystal(simulation.current, crystal);
    setFrame({ ...simulation.current });
  };
  const finish = () => {
    if (claimed.current || !simulation.current.won || frame.courseId === 'lava') return;
    claimed.current = true;
    unlockLavaPassage(simulation.current, playtest);
    onComplete({
      success: true,
      score: totalGems,
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
            earthUnlocked: true,
            routesCompleted: [...new Set([...(saved.routesCompleted ?? []), frame.courseId])],
            completed: true,
            bestGems: Math.max(saved.bestGems ?? 0, totalGems),
          },
    });
  };
  const startBranch = (id: CourseId) => {
    clearInput();
    if (playMode === 'coop') {
      void multiplayer.branch(id);
      return;
    }
    simulation.current = enterBranch(simulation.current, id);
    setFrame({ ...simulation.current });
    setMode('playing');
  };
  const control = (action: keyof Input, label: string, text: React.ReactNode) => (
    <button
      type="button"
      aria-label={label}
      className={
        action === 'jump' || action === 'power' ? 'll-action-button' : 'll-direction-button'
      }
      disabled={
        mode !== 'playing' ||
        frame.won ||
        !multiplayer.ready ||
        !!multiplayer.error ||
        !!multiplayer.run?.winner
      }
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
            {frame.courseId !== 'lava'
              ? course.name
              : frame.x < 1650
                ? 'The broken crossing'
                : frame.x < 2520
                  ? 'The breathing cavern'
                  : 'The great lava river'}
          </span>
          {playMode !== 'solo' && (
            <span className="ll-online-status">
              {playMode === 'coop' ? 'Co-op' : 'Race'} ·{' '}
              {multiplayer.peers.length
                ? `With ${multiplayer.peers[0].name}`
                : multiplayer.run?.guest
                  ? 'Teammate disconnected — waiting for return'
                  : 'Waiting for a friend'}
            </span>
          )}
        </div>
        <div className="ll-score">
          ◆ {totalGems}/{availableGems}
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
        <LeapViews
          frame={frame}
          scale={scale}
          sprite={sprite}
          playMode={playMode}
          peers={multiplayer.peers}
          clock={multiplayer.clock}
          name={character.name}
          stacked={stacked}
        />
        <LeapOnlineOverlay
          playMode={playMode}
          multiplayer={multiplayer}
          won={frame.won}
          onClose={onClose}
          backToSolo={() => {
            clearInput();
            setPlayMode('solo');
            simulation.current = createState();
            setFrame({ ...simulation.current });
            setMode('intro');
          }}
        >
          <ExpeditionOverlay
            mode={mode}
            frame={frame}
            totalGems={totalGems}
            availableGems={availableGems}
            playtest={playtest}
            playMode={playMode}
            chooseMode={(choice) => {
              clearInput();
              simulation.current = {
                ...createState(choice === 'race'),
                earthUnlocked: choice === 'race',
              };
              setFrame({ ...simulation.current });
              setPlayMode(choice);
              setMode('playing');
            }}
            saved={saved}
            startBranch={startBranch}
            finish={finish}
            setMode={setMode}
            returnToCheckpoint={() => {
              rescue(simulation.current);
              setFrame({ ...simulation.current });
            }}
          />
        </LeapOnlineOverlay>
      </div>
      <div className="ll-notice" role="status">
        {frame.notice}
      </div>
      <footer className="ll-controls">
        <div className="ll-movement">
          {control('left', 'Move left', '◀')}
          <span className="ll-pad-centre" aria-hidden="true" />
          {control('right', 'Move right', '▶')}
        </div>
        <div className="ll-crystals">
          {(['frost', 'wind', 'earth'] as Crystal[]).map((crystal, i) => (
            <button
              key={crystal}
              aria-pressed={frame.crystal === crystal}
              disabled={
                (crystal === 'wind' && !frame.windUnlocked) ||
                (crystal === 'earth' && !frame.earthUnlocked)
              }
              onClick={() => choose(crystal)}
              style={{ '--crystal-colour': CRYSTALS[crystal].colour } as React.CSSProperties}
            >
              <CrystalArtwork crystal={crystal} size={28} /> {CRYSTALS[crystal].name}
              <small>
                {(crystal === 'wind' && !frame.windUnlocked) ||
                (crystal === 'earth' && !frame.earthUnlocked)
                  ? 'Find in the cavern'
                  : `Key ${i + 1}`}
              </small>
            </button>
          ))}
        </div>
        <div className="ll-actions">
          {control(
            'jump',
            'Jump',
            <>
              <span>Jump ↑</span>
              <small>W / ↑</small>
            </>
          )}
          {control(
            'power',
            `Use ${active.name} crystal`,
            <>
              <span>Use {active.name}</span>
              <small>
                Space ·{' '}
                {frame.blockedUntil > frame.time
                  ? `Blocked ${(frame.blockedUntil - frame.time).toFixed(1)}s`
                  : frame.cooldown > 0
                    ? `${frame.cooldown.toFixed(1)}s`
                    : frame.crystal === 'wind' && frame.windUsed
                      ? 'Land to recharge'
                      : 'Ready'}
              </small>
            </>
          )}
        </div>
      </footer>
      <div className="ll-help">
        {active.help}{' '}
        {frame.crystal === 'frost' ? 'Switching crystals makes the stone crumble.' : ''}
        {playMode === 'race' &&
          ` Nearby rival: ${frame.crystal === 'frost' ? 'brief slow' : frame.crystal === 'wind' ? 'push backwards' : 'one-second power block'}.`}
      </div>
    </div>
  );
};
