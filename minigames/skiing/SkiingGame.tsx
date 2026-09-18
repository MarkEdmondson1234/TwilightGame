/** Winter forest travel: contact-plane collisions, level progression and salvage. */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { skiingAssets } from './assets';
import {
  CAMERA_ALTITUDE,
  HORIZON_RATIO,
  playerDrawWidth,
  playerBottomMargin,
  computeGap,
  capDrawWidth,
  getPlayerCollisionAnchorY,
  contactForSprite,
} from './geometry';
import { gameState } from '../../GameState';
import { Z_MINI_GAME, zClass } from '../../zIndex';
import { debugLog } from '../../utils/debugLog';
import { SkiingHud, type SkiPhase, type TrailStatus } from './SkiingHud';
import {
  beginWolfLeap,
  wolfLeapPose,
  type WolfLeap,
  crossesContact,
  deerWalkPose,
  pickObstacleX,
  emptyWood,
  forestLevel,
  levelTuning,
  retainedWood,
  runScore,
  STRETCH_DISTANCE,
  SCORE_VERSION,
  validRecord,
  type SkiRecord,
} from './rules';

// =============================================================================
// Types
// =============================================================================

type ObstacleKind =
  | 'tree_needle'
  | 'tree_spruce'
  | 'tree_birch'
  | 'brambles'
  | 'wolf'
  | 'deer'
  | 'dead_spruce'
  | 'small_spruce'
  | 'hazel';
type PickupKind = 'wood_poor' | 'wood_medium' | 'wood_fine';
type ObjKind = ObstacleKind | PickupKind;

interface WorldObj {
  id: number;
  kind: ObjKind;
  worldX: number;
  worldZ: number;
  passed?: boolean;
  leap?: WolfLeap;
  walk?: { startX: number; elapsed: number };
}

const OBSTACLE_KINDS: ObstacleKind[] = [
  'tree_needle',
  'tree_spruce',
  'tree_birch',
  'brambles',
  'wolf',
  'deer',
  'dead_spruce',
  'small_spruce',
  'hazel',
];

const TRAIL_OBSTACLES: ObstacleKind[] = [
  'tree_needle',
  'tree_spruce',
  'tree_birch',
  'brambles',
  'dead_spruce',
  'small_spruce',
  'hazel',
];

// The painted sky and near snowbank have independent parallax.
const CLOUD_LAYERS = [
  { speedMul: 0.5, scaleMul: 0.8, xParallaxMul: 0.5 }, // farthest, slowest, smallest
  { speedMul: 0.8, scaleMul: 0.9, xParallaxMul: 0.75 },
  { speedMul: 1.1, scaleMul: 1.0, xParallaxMul: 1.0 }, // baseline
  { speedMul: 1.4, scaleMul: 1.1, xParallaxMul: 1.25 },
  { speedMul: 1.8, scaleMul: 1.25, xParallaxMul: 1.5 }, // nearest, fastest, largest
];

// Falling snow, shown only while gameState.getWeather() === 'snow' (checked live in render()).
const SNOW_FLAKE_COUNT = 120;
const SNOW_FALL_SPEED = 90; // px/sec at speedMul = 1
const SNOW_DRIFT_AMPLITUDE = 18; // px of sideways sway
const SNOW_BASE_SIZE = 2.2; // px radius at sizeMul = 1

// Static per-flake identity, generated once at module load (mirrors CLOUD_LAYERS giving each
// cloud a fixed identity rather than re-randomizing every frame). Screen position is recomputed
// fresh each render() call from real elapsed time, so flakes never need persisted/updated state
// and stay correct across canvas resizes.
const SNOW_SEEDS = Array.from({ length: SNOW_FLAKE_COUNT }, () => ({
  xSeed: Math.random(),
  ySeed: Math.random(),
  speedMul: 0.6 + Math.random() * 0.8,
  driftFreq: 0.5 + Math.random() * 1.5,
  driftPhase: Math.random() * Math.PI * 2,
  sizeMul: 0.5 + Math.random(),
}));

const Z_NEAR = 700; // Debug drawing range only; contact has no arbitrary near cutoff.
const Z_SPAWN = 4000;
const RIDGE_SWITCH_Z = 2200;
// Short sprites must remain visible above the snowbank throughout their approach.
const NO_RIDGE_OCCLUSION_KINDS = new Set<ObjKind>([
  'tree_spruce',
  'brambles',
  'wolf',
  'deer',
  'dead_spruce',
  'small_spruce',
  'hazel',
  'wood_poor',
  'wood_medium',
  'wood_fine',
]);

const STEER_RANGE = 900;
const STEER_SPEED = 1230;
const GROUND_ZOOM = 1.5;
const GROUND_PARALLAX_STRENGTH = 0.85;
const PICKUP_SPAWN_X_RANGE = 830;
const FIXED_DT = 1 / 120;
const WARNING_SECONDS = 0.75;
const PICKUP_SPAWN_CHANCE = 0.16;
// Hitboxes follow solid trunks/feet rather than transparent sprite padding and branches.
const COLLISION_WIDTH_SCALE_DEFAULT = 1 / 3;
const COLLISION_WIDTH_SCALE: Partial<Record<ObjKind, number>> = {
  tree_birch: 0.55 / 3,
  deer: 0.55,
  dead_spruce: 0.12,
  small_spruce: 0.3,
  hazel: 0.28,
};

const DRAW_BASE: Record<ObjKind, number> = {
  tree_needle: 420,
  tree_spruce: 420,
  tree_birch: 420,
  brambles: 380,
  wolf: 240,
  deer: 320,
  dead_spruce: 620,
  small_spruce: 340,
  hazel: 330,
  wood_poor: 190,
  wood_medium: 190,
  wood_fine: 190,
};

// Transparent margin beneath the visible ground contact, measured from each image.
const GROUND_PAD_RATIO: Record<ObjKind, number> = {
  tree_needle: 0.066,
  tree_spruce: 0.064,
  tree_birch: 0.035,
  brambles: 0.043,
  wolf: 0.238,
  deer: 0.192,
  dead_spruce: 0.078125,
  small_spruce: 0.0703125,
  hazel: 0.263671875,
  wood_poor: 0.212,
  wood_medium: 0.131,
  wood_fine: 0.125,
};
const PLAYER_SCREEN_SHIFT_RATIO = 0.38;

// =============================================================================
// Asset loading
// =============================================================================

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type ImageKey =
  | 'sky'
  | 'level1'
  | 'level2'
  | 'cloud1'
  | 'cloud2'
  | 'cloud3'
  | 'cloud4'
  | 'cloud5'
  | 'tree_needle'
  | 'tree_spruce'
  | 'tree_birch'
  | 'brambles'
  | 'wolf'
  | 'deer'
  | 'dead_spruce'
  | 'small_spruce'
  | 'hazel'
  | 'wood_poor'
  | 'wood_medium'
  | 'wood_fine'
  | 'deerStep2'
  | 'deerStep3'
  | 'player';

const DEER_FRAMES: ImageKey[] = ['deer', 'deerStep2', 'deerStep3'];
const DEER_FRAME_PADDING = [0.192, 0.179, 0.176];

// =============================================================================
// Component
// =============================================================================

export const SkiingGame: React.FC<MiniGameComponentProps> = ({ context, onComplete, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Partial<Record<ImageKey, HTMLImageElement>>>({});
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [phase, setPhase] = useState<SkiPhase>('ready');
  const [loadError, setLoadError] = useState(false);
  const startLevel = useRef(Math.max(1, Math.min(30, gameState.getForestDepth()))).current;
  const [stored] = useState(() =>
    context.storage.load<{ version: number; bests: Record<string, SkiRecord> }>()
  );
  const previousBest = stored?.version === SCORE_VERSION ? stored.bests?.[startLevel] : null;
  const [record, setRecord] = useState<SkiRecord | null>(
    validRecord(previousBest) ? previousBest : null
  );
  const [best, setBest] = useState(validRecord(previousBest) ? previousBest.score : 0);
  const [trail, setTrail] = useState<TrailStatus>({ level: startLevel, progress: 0, score: 0 });
  const hudTimeRef = useRef(0);
  const contactRef = useRef<Partial<Record<ObjKind, { z: number; halfWidth: number }>>>({});
  const warningRef = useRef<WorldObj | null>(null);
  const completedRef = useRef(false);
  const endedRef = useRef(false);
  const [woodCounts, setWoodCounts] = useState(emptyWood);

  const cameraXRef = useRef(0);
  const cameraZRef = useRef(0);
  const objectsRef = useRef<WorldObj[]>([]);
  const nextIdRef = useRef(1);
  const spawnTimerRef = useRef(600);
  const seededRef = useRef(false); // guards the one-time field pre-population below
  const woodCountsRef = useRef(emptyWood());
  const phaseRef = useRef<SkiPhase>('ready');
  const heldRef = useRef({ left: false, right: false, boost: false });
  const rafRef = useRef(0);
  const canvasWidthRef = useRef(0);
  const canvasHeightRef = useRef(0);
  // F3 collision-box overlay — self-contained like the rest of this minigame's input (see
  // below); doesn't touch the main game's DEBUG/debugOpen state since that's gated off while
  // a minigame owns the keyboard. Read as a ref (not state) since render() polls it every
  // frame anyway via requestAnimationFrame — no need to trigger a React re-render on toggle.
  const debugRef = useRef(false);

  // ─── Input: keyboard (self-contained — main game's controls are already gated
  // off via ui.miniGame while this is open, see hooks/useKeyboardControls.ts) ───
  useEffect(() => {
    const STEER_KEYS = new Set(['a', 'd', 'arrowleft', 'arrowright']);
    const BOOST_KEYS = new Set(['w', 'arrowup']);
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (phaseRef.current !== 'playing' && key !== 'f3') return;
      if (key === 'escape') {
        e.preventDefault();
        heldRef.current = { left: false, right: false, boost: false };
        phaseRef.current = 'paused';
        setPhase('paused');
      }
      if (key === 'a' || key === 'arrowleft') heldRef.current.left = true;
      if (key === 'd' || key === 'arrowright') heldRef.current.right = true;
      if (BOOST_KEYS.has(key)) heldRef.current.boost = true;
      if (key === 'f3') {
        e.preventDefault();
        debugRef.current = !debugRef.current;
      }
      if (STEER_KEYS.has(key) || BOOST_KEYS.has(key)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') heldRef.current.left = false;
      if (key === 'd' || key === 'arrowright') heldRef.current.right = false;
      if (BOOST_KEYS.has(key)) heldRef.current.boost = false;
    };
    const interrupt = () => {
      heldRef.current = { left: false, right: false, boost: false };
      if (phaseRef.current === 'playing') {
        phaseRef.current = 'paused';
        setPhase('paused');
      }
    };
    const visibility = () => {
      if (document.hidden) interrupt();
    };
    window.addEventListener('blur', interrupt);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('blur', interrupt);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ─── Load assets (sky picked once, matching current weather) ───
  useEffect(() => {
    const skySrc =
      gameState.getWeather() === 'clear' ? skiingAssets.skySunny : skiingAssets.skyOvercast;
    const entries: Array<[ImageKey, string]> = [
      ['sky', skySrc],
      ['level1', skiingAssets.level1],
      ['level2', skiingAssets.level2],
      ['cloud1', skiingAssets.cloud1],
      ['cloud2', skiingAssets.cloud2],
      ['cloud3', skiingAssets.cloud3],
      ['cloud4', skiingAssets.cloud4],
      ['cloud5', skiingAssets.cloud5],
      ['tree_needle', skiingAssets.needleTree],
      ['tree_spruce', skiingAssets.spruce],
      ['tree_birch', skiingAssets.birch],
      ['brambles', skiingAssets.brambles],
      ['wood_poor', skiingAssets.woodPoor],
      ['wood_medium', skiingAssets.woodMedium],
      ['wood_fine', skiingAssets.woodFine],
      ['player', skiingAssets.player],
      ['wolf', skiingAssets.wolf],
      ['deer', skiingAssets.deer],
      ['deerStep2', skiingAssets.deerStep2],
      ['deerStep3', skiingAssets.deerStep3],
      ['dead_spruce', skiingAssets.deadSpruce],
      ['small_spruce', skiingAssets.smallSpruce],
      ['hazel', skiingAssets.hazel],
    ];
    let cancelled = false;
    Promise.all(entries.map(([key, src]) => loadImage(src).then((img) => [key, img] as const)))
      .then((loaded) => {
        if (cancelled) return;
        for (const [key, img] of loaded) imagesRef.current[key] = img;
        contactRef.current = {};
        setAssetsLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(true);
        console.error('[SkiingGame] Failed to load assets:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Canvas sizing ───
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasWidthRef.current = canvas.width;
    canvasHeightRef.current = canvas.height;
    contactRef.current = {};
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // Ground contact is solved once per sprite/viewport, using the exact rendered anchor.
  const getContact = useCallback((kind: ObjKind) => {
    if (contactRef.current[kind]) return contactRef.current[kind]!;
    const image = imagesRef.current[kind];
    const contact = contactForSprite(
      canvasWidthRef.current,
      canvasHeightRef.current,
      DRAW_BASE[kind],
      image ? image.naturalWidth / image.naturalHeight : 1,
      GROUND_PAD_RATIO[kind],
      COLLISION_WIDTH_SCALE[kind] ?? COLLISION_WIDTH_SCALE_DEFAULT,
      kind.startsWith('wood_')
    );
    contactRef.current[kind] = contact;
    return contact;
  }, []);

  const endRun = useCallback(
    (crashed: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      phaseRef.current = crashed ? 'crashed' : 'stopped';
      heldRef.current = { left: false, right: false, boost: false };
      warningRef.current = null;
      setPhase(phaseRef.current);
      const distance = Math.floor(cameraZRef.current);
      const level = forestLevel(startLevel, distance);
      const score = runScore(distance, woodCountsRef.current);
      setTrail({ level, score, progress: (distance % STRETCH_DISTANCE) / STRETCH_DISTANCE });
      const next = { distance, level, score };
      const old = stored?.version === SCORE_VERSION ? stored.bests : {};
      const oldRecord = old?.[startLevel];
      const winner = validRecord(oldRecord) && oldRecord.score >= score ? oldRecord : next;
      context.storage.save({ version: SCORE_VERSION, bests: { ...old, [startLevel]: winner } });
      setBest(winner.score);
      setRecord(winner);
    },
    [context.storage, startLevel, stored]
  );

  const finishRun = useCallback(
    (retry = false) => {
      if (completedRef.current) return;
      completedRef.current = true;
      const crashed = phaseRef.current === 'crashed';
      const wood = retainedWood(woodCountsRef.current, crashed);
      const rewards = Object.entries(wood)
        .filter(([, n]) => n > 0)
        .map(([itemId, quantity]) => ({ itemId, quantity }));
      const result: MiniGameResult = {
        success: !crashed,
        score: runScore(cameraZRef.current, woodCountsRef.current),
        ...(crashed ? { salvageRewards: rewards } : { rewards }),
        skiingDestination: {
          depth: crashed ? 1 : forestLevel(startLevel, cameraZRef.current),
          crashed,
          retry,
        },
        message: crashed
          ? 'Back at the forest entrance. Ready for another run.'
          : 'Skis off — time to explore the forest.',
        messageType: crashed ? 'info' : 'success',
      };
      onComplete(result);
    },
    [onComplete, startLevel]
  );

  const handleStopSkiing = useCallback(() => {
    if (phaseRef.current === 'ready') {
      onClose();
      return;
    }
    endRun(false);
  }, [endRun, onClose]);

  const startPlaying = () => {
    heldRef.current = { left: false, right: false, boost: false };
    phaseRef.current = 'playing';
    setPhase('playing');
  };

  // ─── Spawning ───
  const spawnObject = useCallback(() => {
    const distance = cameraZRef.current;
    const tuning = levelTuning(startLevel + distance / STRETCH_DISTANCE);
    const worldZ = distance + Z_SPAWN;
    const isObstacle = Math.random() >= PICKUP_SPAWN_CHANCE;
    const kind: ObjKind = !isObstacle
      ? tuning.wood
      : Math.random() < tuning.wolfChance
        ? 'wolf'
        : Math.random() < tuning.deerChance
          ? 'deer'
          : TRAIL_OBSTACLES[Math.floor(Math.random() * TRAIL_OBSTACLES.length)];
    // Reserve a clear lane at spawn; skip overcrowded bands. Moving wildlife can
    // cross that lane later, so its approach stays visible. Pickups remain reachable.
    let worldX: number | null;
    if (isObstacle) {
      worldX = pickObstacleX(objectsRef.current, worldZ);
      if (worldX === null) return; // Preserve the escape lane.
    } else {
      worldX = (Math.random() * 2 - 1) * PICKUP_SPAWN_X_RANGE;
    }
    objectsRef.current.push({
      id: nextIdRef.current++,
      kind,
      worldX,
      worldZ,
    });
    // Cap array size defensively so a stalled tab can't accumulate forever — sized generously
    // above the estimated steady-state count. shift() removes the OLDEST entry, which is the
    // one closest to reaching the player, so trimming too eagerly here would silently drop
    // soon-to-be-relevant obstacles/pickups.
    if (objectsRef.current.length > 260) objectsRef.current.shift();
  }, [startLevel]);

  // Fixed-step simulation; swept contact remains reliable even across a dropped frame.
  const update = useCallback(
    (dt: number) => {
      const previousX = cameraXRef.current;
      const previousZ = cameraZRef.current;
      const held = heldRef.current;
      cameraXRef.current = Math.max(
        -STEER_RANGE,
        Math.min(
          STEER_RANGE,
          previousX + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * STEER_SPEED * dt
        )
      );
      const tuning = levelTuning(startLevel + previousZ / STRETCH_DISTANCE);
      const speed = tuning.speed * (held.boost ? 1.6 : 1);
      cameraZRef.current += speed * dt;
      spawnTimerRef.current -= dt * 1000;
      if (spawnTimerRef.current <= 0) {
        spawnObject();
        spawnTimerRef.current += tuning.spawnMs + (Math.random() * 160 - 80);
      }
      warningRef.current = null;
      let nearestWarning = Infinity;
      // Compact in place: avoid creating new arrays for every simulation step.
      let write = 0;
      for (const obj of objectsRef.current) {
        const z = obj.worldZ - cameraZRef.current;
        if (z <= 0) continue;
        const contact = getContact(obj.kind);
        const previousObjX = obj.worldX;
        let lateralVelocity = 0;
        if (obj.kind === 'deer') {
          obj.walk ??= { startX: obj.worldX, elapsed: 0 };
          obj.walk.elapsed += dt;
          const pose = deerWalkPose(obj.walk.startX, obj.walk.elapsed);
          obj.worldX = pose.x;
          lateralVelocity = pose.velocity;
        }
        if (obj.kind === 'wolf' && !obj.passed) {
          obj.leap ??= beginWolfLeap(
            obj.worldZ - previousZ - contact.z,
            tuning.speed,
            obj.worldX,
            previousX
          );
          if (obj.leap) {
            obj.leap.elapsed += dt;
            obj.worldX = wolfLeapPose(obj.leap).x;
          }
        }
        const offset = obj.worldX - cameraXRef.current;
        if (!obj.passed && z <= contact.z) {
          obj.passed = true;
          if (
            crossesContact(
              obj.worldZ - previousZ,
              z,
              contact.z,
              previousObjX - previousX,
              offset,
              contact.halfWidth
            )
          ) {
            if (OBSTACLE_KINDS.includes(obj.kind as ObstacleKind)) {
              if (debugRef.current) debugLog('Skiing', `Contact ${obj.kind} at z=${z.toFixed(1)}`);
              endRun(true);
              return;
            }
            const kind = obj.kind as PickupKind;
            woodCountsRef.current = {
              ...woodCountsRef.current,
              [kind]: woodCountsRef.current[kind] + 1,
            };
            setWoodCounts(woodCountsRef.current);
            continue;
          }
        }
        const timeToContact = (z - contact.z) / speed;
        if (
          !obj.passed &&
          OBSTACLE_KINDS.includes(obj.kind as ObstacleKind) &&
          timeToContact > 0 &&
          timeToContact < WARNING_SECONDS &&
          Math.abs(offset + lateralVelocity * timeToContact) < contact.halfWidth * 1.4 &&
          timeToContact < nearestWarning
        ) {
          nearestWarning = timeToContact;
          warningRef.current = obj;
        }
        objectsRef.current[write++] = obj;
      }
      objectsRef.current.length = write;
      hudTimeRef.current += dt;
      if (hudTimeRef.current >= 0.1) {
        hudTimeRef.current = 0;
        setTrail({
          level: forestLevel(startLevel, cameraZRef.current),
          score: runScore(cameraZRef.current, woodCountsRef.current),
          progress: (cameraZRef.current % STRETCH_DISTANCE) / STRETCH_DISTANCE,
        });
      }
    },
    [spawnObject, getContact, endRun, startLevel]
  );

  // ─── Render ───
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const images = imagesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const horizonY = h * HORIZON_RATIO;
    const gap = computeGap(w);

    // Backdrop layers (each is a full-frame image; transparent regions let the
    // layer below show through — see minigames/skiing/assets.ts)
    if (images.sky) ctx.drawImage(images.sky, 0, 0, w, h);
    if (images.level1) ctx.drawImage(images.level1, 0, 0, w, h);

    // The player sprite visibly slides left/right when steering (see below). Objects
    // must be projected relative to that SAME on-screen anchor, not a fixed screen
    // centre — otherwise a true world-space collision (obj.worldX ≈ cameraX) renders
    // the object near screen-centre while the player sprite has slid away from centre,
    // making a real hit look like a clean miss (and vice versa).
    const playerShiftPx = (cameraXRef.current / STEER_RANGE) * (w * PLAYER_SCREEN_SHIFT_RATIO);
    const playerScreenX = w / 2 + playerShiftPx;

    const drawObj = (obj: WorldObj) => {
      const zDiff = obj.worldZ - cameraZRef.current;
      if (zDiff <= 0) return;
      const walkPose = obj.walk ? deerWalkPose(obj.walk.startX, obj.walk.elapsed) : undefined;
      const img = images[walkPose ? DEER_FRAMES[walkPose.frame] : obj.kind];
      if (!img) return;

      const screenX = playerScreenX + (gap * (obj.worldX - cameraXRef.current)) / zDiff;
      const screenY = horizonY + (gap * CAMERA_ALTITUDE) / zDiff;
      const drawWidth = capDrawWidth(DRAW_BASE[obj.kind], gap, zDiff, w);
      const drawHeight = drawWidth / (img.naturalWidth / img.naturalHeight);

      if (screenX < -drawWidth || screenX > w + drawWidth) return;
      const leapPose = obj.leap ? wolfLeapPose(obj.leap) : undefined;
      if (leapPose && !obj.passed) {
        ctx.save();
        ctx.fillStyle = leapPose.windingUp ? 'rgba(244, 172, 53, 0.7)' : 'rgba(25, 40, 50, 0.25)';
        ctx.beginPath();
        ctx.ellipse(
          screenX,
          screenY - drawHeight * GROUND_PAD_RATIO.wolf,
          drawWidth * 0.4,
          Math.max(3, drawWidth * 0.08),
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();
        if (leapPose.windingUp) {
          ctx.fillStyle = '#543700';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Boost or dodge!', screenX, screenY - drawHeight - 12);
        }
        ctx.restore();
      }
      const lift = (leapPose?.lift ?? 0) * drawHeight * 0.22;
      if (walkPose) {
        // Align every walking frame to the same hoof plane; flip to face travel.
        const framePadding = DEER_FRAME_PADDING[walkPose.frame];
        ctx.save();
        ctx.translate(screenX, screenY + drawHeight * (framePadding - GROUND_PAD_RATIO.deer));
        ctx.scale(walkPose.velocity < 0 ? -1 : 1, 1);
        ctx.drawImage(img, -drawWidth / 2, -drawHeight, drawWidth, drawHeight);
        ctx.restore();
        return;
      }
      ctx.drawImage(
        img,
        screenX - drawWidth / 2,
        screenY - drawHeight - lift,
        drawWidth,
        drawHeight
      );
    };

    // World objects — farthest first (painter's algorithm), split around level2: distant
    // objects draw BEFORE it so its opaque snow band occludes their base (just the treetop
    // pokes above the ridge, matching the near horizon blocking the view of what's beyond
    // it), then once an object crosses RIDGE_SWITCH_Z it draws AFTER level2 instead, so the
    // full sprite — trunk included — appears "in front of" the ridge.
    const isFar = (o: WorldObj) =>
      o.worldZ - cameraZRef.current > RIDGE_SWITCH_Z && !NO_RIDGE_OCCLUSION_KINDS.has(o.kind);
    for (let i = objectsRef.current.length - 1; i >= 0; i--) {
      const obj = objectsRef.current[i];
      if (isFar(obj)) drawObj(obj);
    }
    if (images.level2) {
      const groundDrawWidth = w * GROUND_ZOOM;
      const groundMarginPx = (groundDrawWidth - w) / 2;
      const groundShiftPx =
        -(cameraXRef.current / STEER_RANGE) * groundMarginPx * GROUND_PARALLAX_STRENGTH;
      ctx.drawImage(images.level2, -groundMarginPx + groundShiftPx, 0, groundDrawWidth, h);
    }

    // Drifting clouds — slowly right to left, staying inside the sky's transparent band
    // in ski_level1.png (measured: fully transparent above ~22% of image height, treeline
    // starts around 22-25%). Sized from canvas HEIGHT rather than width so that band-fit
    // holds regardless of the window's aspect ratio.
    const cloudImgs = [images.cloud1, images.cloud2, images.cloud3, images.cloud4, images.cloud5];
    const t = cameraZRef.current;
    cloudImgs.forEach((img, i) => {
      if (!img) return;
      const layer = CLOUD_LAYERS[i];
      const cw = h * 0.56 * layer.scaleMul; // doubled — the transparent sky band is shallow, so
      // height stays near the very top edge (minimal vertical stagger) to fit the bigger clouds under it
      const ch = cw / (img.naturalWidth / img.naturalHeight);
      const cycle = w + cw; // each cloud's own width, so faster/slower clouds wrap on
      // different-length loops and drift apart instead of holding fixed spacing forever
      // Negative t term makes the loop travel right-to-left; the double-modulo keeps the
      // result positive regardless of sign (JS '%' can return negative for negative input).
      const raw = i * (w * 0.6) - t * 0.012 * layer.speedMul;
      const wrapped = ((raw % cycle) + cycle) % cycle;
      const cx = wrapped - cw - cameraXRef.current * 0.03 * layer.xParallaxMul;
      const cy = h * (0.005 + i * 0.008);
      ctx.drawImage(img, cx, cy, cw, ch);
    });

    for (let i = objectsRef.current.length - 1; i >= 0; i--) {
      const obj = objectsRef.current[i];
      if (!isFar(obj)) drawObj(obj);
    }

    // A short, steady amber marker under the skis leaves the escape route visible.
    if (warningRef.current && phaseRef.current === 'playing') {
      const anchorY = getPlayerCollisionAnchorY(w, h);
      ctx.save();
      ctx.strokeStyle = '#f4ac35';
      ctx.fillStyle = 'rgba(255, 192, 65, 0.25)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(playerScreenX, anchorY, Math.max(25, w * 0.045), 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#543700';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Steer clear!', playerScreenX, anchorY - playerDrawWidth(w, h) * 0.62 - 24);
      ctx.restore();
    }

    // Player — locked near the bottom, at the same anchor used to project objects above
    if (images.player) {
      const pw = playerDrawWidth(w, h);
      const ph = pw / (images.player.naturalWidth / images.player.naturalHeight);
      ctx.save();
      if (phaseRef.current === 'crashed') {
        ctx.translate(playerScreenX, getPlayerCollisionAnchorY(w, h));
        ctx.rotate(-0.65);
        ctx.translate(-playerScreenX, -getPlayerCollisionAnchorY(w, h));
      }
      ctx.drawImage(
        images.player,
        playerScreenX - pw / 2,
        h - ph - playerBottomMargin(w, h),
        pw,
        ph
      );
      ctx.restore();
    }

    // Falling snow — reacts live to weather (unlike the sky image, which is only picked once at
    // asset-load time). Positions are pure functions of real elapsed time + each flake's static
    // seed, so no per-frame particle state is needed — same approach as the cloud layer above.
    // Drawn last so it reads as precipitation in front of the whole scene.
    if (gameState.getWeather() === 'snow') {
      const snowT = performance.now() / 1000;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const seed of SNOW_SEEDS) {
        const fallSpeed = SNOW_FALL_SPEED * seed.speedMul;
        const span = h + 20;
        const y = ((((seed.ySeed * span + snowT * fallSpeed) % span) + span) % span) - 10;
        const drift = Math.sin(snowT * seed.driftFreq + seed.driftPhase) * SNOW_DRIFT_AMPLITUDE;
        const xSpan = w + 20;
        const x = ((((seed.xSeed * xSpan + drift) % xSpan) + xSpan) % xSpan) - 10;
        ctx.beginPath();
        ctx.arc(x, y, SNOW_BASE_SIZE * seed.sizeMul, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // F3 shows the exact predicted contact footprint (including pickup forgiveness).
    if (debugRef.current) {
      const anchorY = getPlayerCollisionAnchorY(w, h);
      ctx.save();
      ctx.lineWidth = 2;
      ctx.font = '11px monospace';
      ctx.strokeStyle = '#50b4ff';
      ctx.beginPath();
      ctx.moveTo(0, anchorY);
      ctx.lineTo(w, anchorY);
      ctx.stroke();
      for (const obj of objectsRef.current) {
        const depth = obj.worldZ - cameraZRef.current;
        if (depth <= 0 || depth > Z_NEAR) continue;
        const contact = getContact(obj.kind);
        const offset = obj.worldX - cameraXRef.current;
        const x = playerScreenX + (gap * offset) / contact.z;
        const half = (gap * contact.halfWidth) / contact.z;
        ctx.strokeStyle = obj.passed
          ? '#9da9ad'
          : Math.abs(offset) < contact.halfWidth
            ? '#e65737'
            : '#e8b64e';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.strokeRect(x - half, anchorY - 16, half * 2, 16);
        ctx.fillText(
          `${obj.kind}: contact z=${Math.round(contact.z)}, now=${Math.round(depth)}`,
          x - half,
          anchorY - 22
        );
      }
      ctx.fillStyle = '#50b4ff';
      ctx.fillText('F3 — predicted contact footprints', 12, h - 110);
      ctx.restore();
    }
  }, [getContact]);

  // ─── Game loop ───
  useEffect(() => {
    if (!assetsLoaded) return;

    // A gentle opening: obstacles have at least two seconds of approach time.
    if (!seededRef.current) {
      seededRef.current = true;
      for (let i = 0; i < 8; i++) {
        const worldZ = 1800 + i * 300;
        const worldX = pickObstacleX(objectsRef.current, worldZ);
        if (worldX !== null)
          objectsRef.current.push({
            id: nextIdRef.current++,
            kind: TRAIL_OBSTACLES[i % TRAIL_OBSTACLES.length],
            worldX,
            worldZ,
          });
      }
      objectsRef.current.sort((a, b) => a.worldZ - b.worldZ);
    }
    let lastTime = performance.now();
    let accumulator = 0;
    let lastDraw = '';
    const loop = (time: number) => {
      const elapsed = (time - lastTime) / 1000;
      lastTime = time;
      if (phaseRef.current === 'playing') {
        // An interrupted frame should pause, never fast-forward into an unseen tree.
        if (elapsed > 0.25) {
          phaseRef.current = 'paused';
          setPhase('paused');
          heldRef.current = { left: false, right: false, boost: false };
        } else {
          accumulator += elapsed;
          while (accumulator >= FIXED_DT && phaseRef.current === 'playing') {
            update(FIXED_DT);
            accumulator -= FIXED_DT;
          }
        }
      } else accumulator = 0;
      const drawKey = `${phaseRef.current}:${canvasWidthRef.current}:${canvasHeightRef.current}:${debugRef.current}`;
      if (!document.hidden && (phaseRef.current === 'playing' || drawKey !== lastDraw)) {
        render();
        lastDraw = drawKey;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [assetsLoaded, update, render]);

  return (
    <div
      ref={containerRef}
      className={zClass(Z_MINI_GAME)}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#16383f',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
      />
      {!assetsLoaded && (
        <div className="ski-ui">
          <div className="ski-scrim">
            <section className="ski-panel">
              <h1>{loadError ? 'The trail could not load' : 'Finding the winter trail…'}</h1>
              {loadError && (
                <>
                  <p>Please try again when your connection is ready.</p>
                  <button onClick={onClose}>Back to the forest</button>
                </>
              )}
            </section>
          </div>
        </div>
      )}
      {assetsLoaded && (
        <SkiingHud
          phase={phase}
          trail={trail}
          wood={woodCounts}
          kept={retainedWood(woodCounts, phase === 'crashed')}
          best={best}
          record={record}
          startLevel={startLevel}
          onStart={startPlaying}
          onResume={startPlaying}
          onStop={handleStopSkiing}
          onExit={() => finishRun()}
          onRetry={() => finishRun(true)}
          onHold={(key, held) => {
            heldRef.current[key] = held;
          }}
        />
      )}
    </div>
  );
};
