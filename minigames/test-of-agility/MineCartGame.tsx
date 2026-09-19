/** Wizard trial and optional endurance run, sharing skiing's swept-contact rules. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MiniGameComponentProps } from '../types';
import { gameState } from '../../GameState';
import { testOfAgilityAssets } from './assets';
import { crossesContact, pickObstacleX } from '../skiing/rules';
import { Z_MINI_GAME, zClass } from '../../zIndex';
import { MineCartHud } from './MineCartHud';
import {
  beginGoblinLunge,
  cartRecord,
  cartTuning,
  FIXED_DT,
  goblinPose,
  SCORE_VERSION,
  TRIAL_DISTANCE,
  trialResult,
  validCartRecord,
  type CartPhase,
  type CartRecord,
  type GoblinLunge,
  type ObstacleKind,
} from './rules';
import {
  CAMERA_ALTITUDE,
  HORIZON_RATIO,
  computeGap,
  cartWidth,
  CART_ASPECT,
  cartBottom,
  cartAnchor,
  cartContact,
  obstacleWidth,
  OBSTACLES,
} from './geometry';

type ImageKey = keyof typeof testOfAgilityAssets;
interface WorldObj {
  id: number;
  kind: ObstacleKind;
  worldX: number;
  worldZ: number;
  passed?: boolean;
  lunge?: GoblinLunge;
}
const WALL_CYCLE = 3000;
function newRun() {
  return {
    x: 0,
    z: 0,
    objects: [] as WorldObj[],
    nextId: 1,
    spawnMs: 600,
    hudTime: 0,
    trialPassed: false,
    walls: [3000, 2000, 1000],
    warning: false,
  };
}
export const MineCartGame: React.FC<MiniGameComponentProps> = ({ context, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Partial<Record<ImageKey, HTMLImageElement>>>({});
  const contactsRef = useRef<Partial<Record<ObstacleKind, { z: number; halfWidth: number }>>>({});
  const run = useRef(newRun());
  const held = useRef({ left: false, right: false });
  const phaseRef = useRef<CartPhase>('ready');
  const [phase, setPhase] = useState<CartPhase>('ready');
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [distance, setDistance] = useState(0);
  const [record, setRecord] = useState<CartRecord | null>(() => {
    const saved = context.storage.load<{ version: number; best: CartRecord }>();
    return saved?.version === SCORE_VERSION && validCartRecord(saved.best) ? saved.best : null;
  });
  const recordRef = useRef(record);
  const storageRef = useRef(context.storage);
  storageRef.current = context.storage;
  const completed = useRef(false);
  const practiceRef = useRef(false);
  const [practice, setPractice] = useState(false);
  const debug = useRef(false);
  const dirty = useRef(true);
  const setRunPhase = useCallback((next: CartPhase) => {
    held.current = { left: false, right: false };
    phaseRef.current = next;
    setPhase(next);
    dirty.current = true;
  }, []);
  const saveBest = useCallback(() => {
    const next = cartRecord(run.current.z);
    if (!recordRef.current || next.score > recordRef.current.score) {
      recordRef.current = next;
      setRecord(next);
      storageRef.current.save({ version: SCORE_VERSION, best: next });
    }
    setDistance(run.current.z);
  }, []);
  const exit = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    saveBest();
    setRunPhase('paused');
    onComplete(trialResult(run.current.z, practiceRef.current));
  }, [onComplete, saveBest, setRunPhase]);
  const pause = useCallback(() => {
    if (phaseRef.current === 'playing') setRunPhase('paused');
  }, [setRunPhase]);
  const start = useCallback(
    (freePlay = false) => {
      run.current = newRun();
      practiceRef.current = freePlay;
      setPractice(freePlay);
      run.current.trialPassed = freePlay;
      // Depth ordered from the outset; leave time to read the track before the first contact.
      for (let i = 0; i < 5; i++) {
        const z = 1800 + i * 440;
        const x = pickObstacleX(run.current.objects, z);
        if (x !== null)
          run.current.objects.push({
            id: run.current.nextId++,
            kind: i % 3 === 0 ? 'rock' : 'crystal',
            worldX: x,
            worldZ: z,
          });
      }
      setDistance(0);
      setRunPhase('playing');
    },
    [setRunPhase]
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      Object.entries(testOfAgilityAssets).map(
        ([key, src]) =>
          new Promise<[ImageKey, HTMLImageElement]>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve([key as ImageKey, image]);
            image.onerror = () => reject(new Error(`Missing minecart asset: ${key}`));
            image.src = src;
          })
      )
    )
      .then((entries) => {
        if (cancelled) return;
        for (const [key, image] of entries) imagesRef.current[key] = image;
        setLoaded(true);
        dirty.current = true;
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      contactsRef.current = {};
      dirty.current = true;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'a', 'd', 'escape', 'f3'].includes(key)) e.preventDefault();
      if (key === 'escape') {
        pause();
        return;
      }
      if (key === 'f3') {
        debug.current = !debug.current;
        dirty.current = true;
        return;
      }
      if (phaseRef.current !== 'playing') return;
      if (key === 'a' || key === 'arrowleft') held.current.left = true;
      if (key === 'd' || key === 'arrowright') held.current.right = true;
    };
    const keyUp = (e: KeyboardEvent) => {
      if (['a', 'arrowleft'].includes(e.key.toLowerCase())) held.current.left = false;
      if (['d', 'arrowright'].includes(e.key.toLowerCase())) held.current.right = false;
    };
    const hidden = () => {
      if (document.hidden) pause();
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [pause]);
  const contact = useCallback((kind: ObstacleKind) => {
    const canvas = canvasRef.current!;
    return (contactsRef.current[kind] ??= cartContact(kind, canvas.width, canvas.height));
  }, []);
  const update = useCallback(
    (dt: number) => {
      const r = run.current,
        previousX = r.x,
        previousZ = r.z;
      const tuning = cartTuning(r.z);
      r.x = Math.max(
        -900,
        Math.min(
          900,
          r.x + ((held.current.right ? 1 : 0) - (held.current.left ? 1 : 0)) * 1230 * dt
        )
      );
      const nextZ = previousZ + tuning.speed * dt;
      // Process collisions through the finish plane BEFORE awarding the trial pass.
      r.z = !r.trialPassed ? Math.min(TRIAL_DISTANCE, nextZ) : nextZ;
      for (let i = 0; i < r.walls.length; i++)
        if (r.walls[i] - r.z <= 300) r.walls[i] += WALL_CYCLE;
      r.spawnMs -= dt * 1000;
      if (r.spawnMs <= 0) {
        const worldZ = r.z + 4000;
        const worldX = pickObstacleX(r.objects, worldZ);
        if (worldX !== null)
          r.objects.push({
            id: r.nextId++,
            kind:
              Math.random() < tuning.goblinChance
                ? 'goblin'
                : Math.random() < 0.25
                  ? 'rock'
                  : 'crystal',
            worldX,
            worldZ,
          });
        r.spawnMs += tuning.spawnMs + Math.random() * 100 - 50;
      }
      let write = 0;
      r.warning = false;
      for (const obj of r.objects) {
        const z = obj.worldZ - r.z;
        if (z <= 0) continue;
        const c = contact(obj.kind),
          oldX = obj.worldX;
        if (obj.kind === 'goblin' && !obj.passed) {
          obj.lunge ??= beginGoblinLunge(
            obj.worldZ - previousZ - c.z,
            tuning.speed,
            obj.worldX,
            previousX
          );
          if (obj.lunge) {
            obj.lunge.elapsed += dt;
            obj.worldX = goblinPose(obj.lunge).x;
          }
        }
        const offset = obj.worldX - r.x;
        if (!obj.passed && z <= c.z) {
          obj.passed = true;
          if (
            crossesContact(obj.worldZ - previousZ, z, c.z, oldX - previousX, offset, c.halfWidth)
          ) {
            // A crash exactly at the finish must not accidentally award a pass.
            if (!r.trialPassed) r.z = Math.min(r.z, TRIAL_DISTANCE - 1);
            saveBest();
            setRunPhase('crashed');
            return;
          }
        }
        const eta = (z - c.z) / tuning.speed;
        if (!obj.passed && eta > 0 && eta < 0.75 && Math.abs(offset) < c.halfWidth * 1.4)
          r.warning = true;
        r.objects[write++] = obj;
      }
      r.objects.length = write;
      if (!r.trialPassed && r.z >= TRIAL_DISTANCE) {
        r.trialPassed = true;
        saveBest();
        setRunPhase('passed');
        return;
      }
      r.hudTime += dt;
      if (r.hudTime >= 0.1) {
        r.hudTime = 0;
        setDistance(r.z);
      }
    },
    [contact, saveBest, setRunPhase]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current,
      images = imagesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width,
      h = canvas.height,
      r = run.current;
    const gap = computeGap(w),
      horizon = h * HORIZON_RATIO;
    const playerX = w / 2 + (r.x / 900) * w * 0.38;
    ctx.fillStyle = '#161020';
    ctx.fillRect(0, 0, w, h);
    if (images.roof) ctx.drawImage(images.roof, 0, 0, w, h);
    if (images.floor)
      ctx.drawImage(images.floor, -w * 0.25 - (r.x / 900) * w * 0.25 * 0.85, 0, w * 1.5, h);
    // Three looping cave walls, farthest first without a per-frame sort/allocation.
    const farthest =
      r.walls[0] > r.walls[1] ? (r.walls[0] > r.walls[2] ? 0 : 2) : r.walls[1] > r.walls[2] ? 1 : 2;
    for (let n = 0; n < 3; n++) {
      const i = (farthest + n) % 3,
        z = r.walls[i] - r.z;
      const img = i === 0 ? images.layer1 : i === 1 ? images.layer2 : images.layer3;
      if (!img || z <= 0) continue;
      const p = Math.max(0, Math.min(1, 1 - (z - 300) / 2700));
      ctx.globalAlpha = p < 0.08 ? p / 0.08 : p > 0.95 ? (1 - p) / 0.05 : 1;
      const width = w * (1.05 + 2.15 * p),
        height = width / (img.naturalWidth / img.naturalHeight);
      ctx.drawImage(
        img,
        playerX - (gap * r.x) / z - width / 2,
        horizon - height * (i === 2 ? 1 : 0.5),
        width,
        height
      );
    }
    ctx.globalAlpha = 1;
    for (let i = r.objects.length - 1; i >= 0; i--) {
      const obj = r.objects[i],
        z = obj.worldZ - r.z,
        img = images[obj.kind];
      if (z <= 0 || !img) continue;
      const x = playerX + (gap * (obj.worldX - r.x)) / z;
      const y = horizon + (gap * CAMERA_ALTITUDE) / z;
      const width = obstacleWidth(obj.kind, w, z, h),
        height = width / OBSTACLES[obj.kind].aspect;
      if (x < -width || x > w + width) continue;
      const pose = obj.lunge ? goblinPose(obj.lunge) : undefined;
      if (pose && !obj.passed) {
        ctx.fillStyle = pose.windingUp ? '#f3b955' : '#160d2399';
        ctx.beginPath();
        ctx.ellipse(
          x,
          y - height * OBSTACLES.goblin.padding,
          width * 0.3,
          Math.max(3, width * 0.06),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        if (pose.windingUp) {
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff4cb';
          ctx.fillText('Goblin — dodge!', x, y - height - 10);
        }
      }
      ctx.drawImage(
        img,
        x - width / 2,
        y - height - (pose?.lift ?? 0) * height * 0.18,
        width,
        height
      );
      if (debug.current && !obj.passed) {
        const c = contact(obj.kind);
        ctx.strokeStyle = '#e8b64e';
        ctx.lineWidth = 2;
        const half = (gap * c.halfWidth) / z;
        ctx.strokeRect(x - half, y - height * OBSTACLES[obj.kind].padding - 8, half * 2, 16);
      }
    }
    const anchor = cartAnchor(w, h);
    if (r.warning && phaseRef.current === 'playing') {
      ctx.strokeStyle = '#f3b955';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(playerX, anchor, cartWidth(w, h) * 0.5, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff4cb';
      ctx.fillText('Steer clear!', playerX, anchor - cartWidth(w, h) / CART_ASPECT - 10);
    }
    if (images.player) {
      const width = cartWidth(w, h),
        height = width / CART_ASPECT;
      ctx.save();
      if (phaseRef.current === 'crashed') {
        ctx.translate(playerX, anchor);
        ctx.rotate(-0.2);
        ctx.translate(-playerX, -anchor);
      }
      ctx.drawImage(
        images.player,
        playerX - width / 2,
        h - cartBottom(w, h) - height,
        width,
        height
      );
      ctx.restore();
    }
    if (debug.current) {
      ctx.strokeStyle = '#50b4ff';
      ctx.beginPath();
      ctx.moveTo(0, anchor);
      ctx.lineTo(w, anchor);
      ctx.stroke();
    }
  }, [contact]);
  useEffect(() => {
    if (!loaded) return;
    let raf = 0,
      last = performance.now(),
      accumulator = 0;
    const loop = (now: number) => {
      const elapsed = (now - last) / 1000;
      last = now;
      if (phaseRef.current === 'playing') {
        if (elapsed > 0.25) {
          pause();
          accumulator = 0;
        } else {
          accumulator += Math.max(0, elapsed);
          while (accumulator >= FIXED_DT && phaseRef.current === 'playing') {
            update(FIXED_DT);
            accumulator -= FIXED_DT;
          }
        }
        render();
        dirty.current = false;
      } else {
        accumulator = 0;
        if (dirty.current) {
          render();
          dirty.current = false;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [loaded, pause, render, update]);
  return (
    <div
      className={zClass(Z_MINI_GAME)}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#161020',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {!loaded ? (
        <div className="cart-ui">
          <div className="cart-scrim">
            <section className="cart-panel">
              <p>
                {loadError ? 'The tunnel artwork could not load.' : 'Opening the crystal tunnels…'}
              </p>
              {loadError && <button onClick={exit}>Return to antechamber</button>}
            </section>
          </div>
        </div>
      ) : (
        <MineCartHud
          practice={practice}
          canPractice={
            (record?.distance ?? 0) >= TRIAL_DISTANCE ||
            gameState.isQuestStarted('wizard_trials_patience')
          }
          onPractice={() => start(true)}
          phase={phase}
          distance={distance}
          best={record?.score ?? 0}
          record={record}
          onStart={() => start(false)}
          onResume={() => setRunPhase('playing')}
          onRetry={() => start(practiceRef.current)}
          onExit={exit}
          onHold={(key, value) => {
            held.current[key] = phaseRef.current === 'playing' && value;
          }}
        />
      )}
    </div>
  );
};
