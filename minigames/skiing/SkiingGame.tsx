/**
 * Skiing Mini-Game — OutRun-style firewood gathering
 *
 * The player skis continuously forward through a winter forest, steering left/right
 * to dodge trees/brambles and collect firewood. No braking — only steering and a
 * forward boost. Crashing triggers the same "collapse and get sent home" flow as
 * stamina exhaustion; the "Stop skiing" button ends the run safely and banks the haul.
 *
 * Pseudo-3D projection is adapted from the reference project erendn/outrun-js
 * (specifically its Vector3.project() perspective-divide formula) — simplified since
 * this open field has no road/curve to track, just a camera moving through world space.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { skiingAssets } from './assets';
import { gameState } from '../../GameState';
import { Z_MINI_GAME, zClass } from '../../zIndex';

// =============================================================================
// Types
// =============================================================================

type ObstacleKind = 'tree_needle' | 'tree_spruce' | 'tree_birch' | 'brambles';
type PickupKind = 'wood_poor' | 'wood_medium' | 'wood_fine';
type ObjKind = ObstacleKind | PickupKind;

interface WorldObj {
  id: number;
  kind: ObjKind;
  worldX: number;
  worldZ: number;
}

const OBSTACLE_KINDS: ObstacleKind[] = ['tree_needle', 'tree_spruce', 'tree_birch', 'brambles'];

// =============================================================================
// Tuning constants (world units are camera-relative, not pixels — see the
// projection formula below for how they map to screen space)
// =============================================================================

// The visible world-X half-width at any depth zDiff works out to zDiff × tan(FOV/2) — at the
// old 90° (tan(45°) = 1) that's just zDiff itself, so an object spawned near the edge of the
// (now much wider) OBSTACLE_SPAWN_X_RANGE only scrolled on-screen once it was within that same
// distance of the player — i.e. invisible for most of its close-range approach, the exact
// stretch where a player would be reacting to it. Widened so more of the reachable field is
// actually visible up close, without pushing into fisheye-looking territory.
const CAMERA_FOV = 112; // degrees
const CAMERA_ALTITUDE = 150;
const HORIZON_RATIO = 0.48; // where the horizon sits, as a fraction of canvas height — objects
// were spawning right at this line (nearly zero vertical offset at Z_SPAWN), which sat above
// the artwork's own treeline, making them look like they floated over the horizon

// Per-cloud drift tuning — gives the three background clouds distinct speeds/sizes/steer-sway
// instead of moving in lockstep, so they read as separate depth layers and visibly drift past
// one another rather than holding fixed relative spacing forever.
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

// A cheap outer pre-filter only — skips the per-frame collision maths for objects still
// far away. It is NOT the real "has this reached the player" cutoff: working through the
// projection maths, an object's projected ground position (objScreenY, see update()) only
// crosses the player's own anchor line at a zDiff around ~200-280 depending on the current
// window's aspect ratio (it scales with canvas width/height). A fixed threshold this close
// to that crossing point would make the two conditions fight each other — an object could
// already read as "passed" for most or all of a fixed inner window. So the real "still in
// front of the player" gate is the dynamic objScreenY check in update(); this constant just
// needs to stay safely above the crossing point across realistic window shapes.
const Z_NEAR = 700;
// Screen offset for a given lateral worldX scales with 1/zDiff, so an object only visibly
// spreads out to its true lateral position in roughly the last 10-20% of its journey from
// Z_SPAWN — for the rest it's compressed near the vanishing point regardless of FOV (an
// unavoidable property of perspective at large distances). Kept much shorter than the old
// 10000 so a bigger share of each object's on-screen lifetime falls in that "spread out"
// window instead of the "still compressed near centre" one — trades some warning time
// (~7s at BASE_SPEED, down from ~18s) for objects actually using the width of the screen.
const Z_SPAWN = 4000; // objects spawn this far ahead of the camera
// Depth at which an object switches from drawing behind level2 (occluded, only its top
// visible above the ridge) to drawing in front of it (fully revealed) — see render().
const RIDGE_SWITCH_Z = 2200;

// These obstacle/pickup kinds are short enough that their whole sprite sits below the ridge
// line even far away — under the normal RIDGE_SWITCH_Z split they'd render fully invisible
// until suddenly popping in close to the player, giving no time to dodge. Route them straight
// to the "in front of the ridge" pass at any distance instead, like tall trees already are once
// their tip pokes above the ridge.
const NO_RIDGE_OCCLUSION_KINDS = new Set<ObjKind>([
  'tree_spruce',
  'brambles',
  'wood_poor',
  'wood_medium',
  'wood_fine',
]);

// This is an open snowfield, not a road — the whole visible width should be real, reachable
// terrain, not a narrow dodgeable lane surrounded by decorative scenery. STEER_SPEED is scaled
// with STEER_RANGE so crossing the full range still takes the same ~1.46s as before; widening
// the range alone would have made steering feel sluggish.
const STEER_RANGE = 900; // max lateral offset the player can steer to
const STEER_SPEED = 1230; // world units/sec

// level2 (the near snow ridge) sits almost directly under the player, so — unlike the
// static sky/level1 backdrop — it needs to visibly pan with steering to match how nearby
// trees shift, or the ground reads as frozen under a moving world. Drawn wider than the
// canvas ("zoomed in") so panning never exposes a transparent edge. Source art is native
// 1920x1600 (see optimize-assets.js SKI_BACKDROP_MAX) so the zoom is kept modest to avoid
// visible upscaling softness.
const GROUND_ZOOM = 1.5; // level2 drawn at this multiple of canvas width
const GROUND_PARALLAX_STRENGTH = 0.85; // fraction of the zoom's margin used at max steer (leaves a safety buffer)

// Firewood spawns within reach of STEER_RANGE so every pickup is actually collectible.
// Obstacles use the same single reachable band — every obstacle is real and dodgeable, there's
// no separate decorative-only band anymore (see LANE_COUNT below for why this doesn't just
// crowd the player).
const PICKUP_SPAWN_X_RANGE = 830;
const OBSTACLE_SPAWN_X_RANGE = 1150;

// Clear-path guarantee: every object's worldZ is fixed at spawn (only cameraZ advances),
// so two obstacles spawned close together in worldZ stay close together in zDiff for their
// whole journey — they'll always reach the danger zone at nearly the same moment. That makes
// it safe to decide "will these threaten the player at the same time" once, at spawn time,
// using worldZ alone. The band is divided into LANE_COUNT lanes; a new obstacle is only ever
// placed in a lane that isn't already occupied by another obstacle within Z_CLUSTER_WINDOW of
// it — if every lane is taken, the spawn is skipped rather than overcrowding the band.
// Guarantees at least one lane-width gap (~2×OBSTACLE_SPAWN_X_RANGE/LANE_COUNT) stays clear
// within steering reach.
const LANE_COUNT = 6;
const Z_CLUSTER_WINDOW = 900;

// Obstacles never draw larger than this fraction of canvas width, however close they
// get — without a cap, the "3x bigger" sizing left almost no visible gap to dodge into
// even on a clean miss, since the sprite could cover most of the screen right before impact.
const MAX_DRAW_WIDTH_RATIO = 0.46;

const BASE_SPEED = 550; // world Z units/sec — kept slow so obstacles are visible well before they arrive
const BOOST_SPEED = 1000;

// Progression: the run is split into fixed-distance stages, each pairing one obstacle
// density with exactly one firewood quality — no blending between stages, so each stage
// reads as a distinct, deliberate step up in difficulty/reward. Thresholds are
// BASE_SPEED × seconds — an approximation of "10s / 20s of play" in world-Z distance (most
// play happens near base speed, with boost used in bursts rather than held continuously, so
// this is a close enough proxy without needing a separate timer). Stage 3 has no further
// ramp — it's today's baseline density.
const STAGE1_END = BASE_SPEED * 20; // ≈20s — scattered obstacles, wood_poor only
const STAGE2_END = STAGE1_END + BASE_SPEED * 10; // stage 2 spans ~10s — denser obstacles, wood_medium only

// Firewood is meant to read as an occasional rare find while skiing through the forest, not
// a resource you're farming — a typical run should turn up only a handful of pieces. Kept as
// a slice of the regular (obstacle) spawn timer rather than its own stream, so it stays rare
// at every pace tier without needing separate tuning.
const PICKUP_SPAWN_CHANCE = 0.03;

const MAX_DT = 0.033; // clamp frame delta so fast obstacles can't skip the collision window

// Collision is checked in on-screen pixels using this same fraction of each sprite's
// drawn size, rather than a fixed world-space radius — see computeGap()/capDrawWidth()
// and the collision block in update(). A world-space hitbox drifted out of sync with
// MAX_DRAW_WIDTH_RATIO (which caps how large a sprite draws up close): the hitbox kept
// growing without bound as an obstacle approached even after its visible size had
// plateaued, so a clean-looking miss could still register as a hit. Using the actual
// capped draw size keeps "looks like it's touching" and "counts as a hit" in sync.
const COLLISION_FUDGE = 0.55; // fraction of the combined sprite widths that counts as touching

// Confirmed via the F3 debug overlay + [Skiing] HIT console log: at the drawn (bounding-box)
// width, objects were registering hits while still visually far from the player — e.g. a
// tree_spruce triggered a crash at zDiff=697 (barely inside the Z_NEAR collision window) with
// a 525px-wide hitbox on a 1745px canvas. The drawn sprite width includes a lot of visual
// padding/thin branches that isn't actually "solid", so the collision hitbox needs to be
// substantially narrower than the sprite's full drawn width. Only the player's own box is left
// untouched — the bug was specifically about obstacle/pickup hitboxes reading too wide, not
// the player's.
const COLLISION_WIDTH_SCALE_DEFAULT = 1 / 3;
// Per-kind multiplier on top of COLLISION_FUDGE and COLLISION_WIDTH_SCALE_DEFAULT. The birch
// is a bare winter tree — its crown is wide but mostly sparse branches with gaps of open air,
// so it needs to be narrower still than the already-narrowed default; keep it at the same
// proportion (0.55×) relative to the default it had before.
const COLLISION_WIDTH_SCALE: Partial<Record<ObjKind, number>> = {
  tree_birch: 0.55 * COLLISION_WIDTH_SCALE_DEFAULT,
};

const DRAW_BASE: Record<ObjKind, number> = {
  tree_needle: 420,
  tree_spruce: 420,
  tree_birch: 420,
  brambles: 380,
  wood_poor: 190,
  wood_medium: 190,
  wood_fine: 190,
};
const PLAYER_SCREEN_WIDTH_RATIO = 0.26; // fraction of canvas width
// How far the player sprite itself slides across the screen when steering, as a
// fraction of canvas width. The backdrop is static, so without this the only
// motion cue was the obstacles shifting — steering read as "broken" rather than
// "dodging". Object projection still uses the same cameraX for the actual dodge.
const PLAYER_SCREEN_SHIFT_RATIO = 0.38;
// The player's ground anchor sits this far up from the bottom edge, as a fraction of
// canvas height — shared by rendering and the collision Y-gate below.
const PLAYER_BOTTOM_MARGIN_RATIO = 0.03;

// =============================================================================
// Shared projection helpers (used by both collision checks and rendering, so the
// two can never drift apart the way the old fixed-world-space hitbox did)
// =============================================================================

function computeGap(canvasWidth: number): number {
  return canvasWidth / (2 * Math.tan((CAMERA_FOV * Math.PI) / 360));
}

function capDrawWidth(base: number, gap: number, zDiff: number, canvasWidth: number): number {
  return Math.min((base * gap) / zDiff, canvasWidth * MAX_DRAW_WIDTH_RATIO);
}

/**
 * Clear-path guarantee for "near" obstacle spawns — see the constants above for why this
 * only needs worldZ (not simulated arrival time). Returns a lane-safe worldX, or null if
 * every lane is already occupied by an obstacle that will threaten around the same time.
 */
function pickNearObstacleX(objects: WorldObj[], candidateWorldZ: number): number | null {
  const laneWidth = (2 * OBSTACLE_SPAWN_X_RANGE) / LANE_COUNT;
  const occupiedLanes = new Set<number>();
  for (const obj of objects) {
    if (!OBSTACLE_KINDS.includes(obj.kind as ObstacleKind)) continue;
    if (Math.abs(obj.worldZ - candidateWorldZ) >= Z_CLUSTER_WINDOW) continue;
    if (obj.worldX < -OBSTACLE_SPAWN_X_RANGE || obj.worldX > OBSTACLE_SPAWN_X_RANGE) continue;
    const lane = Math.min(
      LANE_COUNT - 1,
      Math.floor((obj.worldX + OBSTACLE_SPAWN_X_RANGE) / laneWidth)
    );
    occupiedLanes.add(lane);
  }

  const freeLanes: number[] = [];
  for (let i = 0; i < LANE_COUNT; i++) {
    if (!occupiedLanes.has(i)) freeLanes.push(i);
  }
  if (freeLanes.length === 0) return null;

  const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
  const laneStart = -OBSTACLE_SPAWN_X_RANGE + lane * laneWidth;
  return laneStart + Math.random() * laneWidth;
}

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
  | 'wood_poor'
  | 'wood_medium'
  | 'wood_fine'
  | 'player';

// =============================================================================
// Component
// =============================================================================

export const SkiingGame: React.FC<MiniGameComponentProps> = ({ context, onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Partial<Record<ImageKey, HTMLImageElement>>>({});
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [phase, setPhase] = useState<'playing' | 'crashed'>('playing');
  const [woodCounts, setWoodCounts] = useState({ wood_poor: 0, wood_medium: 0, wood_fine: 0 });

  const cameraXRef = useRef(0);
  const cameraZRef = useRef(0);
  const objectsRef = useRef<WorldObj[]>([]);
  const nextIdRef = useRef(1);
  const spawnTimerRef = useRef(600);
  const seededRef = useRef(false); // guards the one-time field pre-population below
  const woodCountsRef = useRef({ wood_poor: 0, wood_medium: 0, wood_fine: 0 });
  const phaseRef = useRef<'playing' | 'crashed'>('playing');
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
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ─── Load assets (sky picked once, matching current weather) ───
  useEffect(() => {
    const skySrc = gameState.getWeather() === 'clear' ? skiingAssets.skySunny : skiingAssets.skyOvercast;
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
    ];
    let cancelled = false;
    Promise.all(entries.map(([key, src]) => loadImage(src).then((img) => [key, img] as const)))
      .then((loaded) => {
        if (cancelled) return;
        for (const [key, img] of loaded) imagesRef.current[key] = img;
        setAssetsLoaded(true);
      })
      .catch((err) => console.error('[SkiingGame] Failed to load assets:', err));
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
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // ─── Ending the run ───
  const finishRun = useCallback(
    (success: boolean) => {
      const result: MiniGameResult = success
        ? {
            success: true,
            rewards: (Object.keys(woodCountsRef.current) as PickupKind[])
              .filter((k) => woodCountsRef.current[k] > 0)
              .map((k) => ({ itemId: k, quantity: woodCountsRef.current[k] })),
            message: 'You gathered some firewood!',
            messageType: 'success',
          }
        : {
            success: false,
            rewards: [],
            message: 'You took a tumble in the snow and lost your bearings...',
            messageType: 'warning',
          };
      onComplete(result);
    },
    [onComplete]
  );

  const handleStopSkiing = useCallback(() => {
    finishRun(true);
  }, [finishRun]);

  const handleCrash = useCallback(() => {
    if (phaseRef.current === 'crashed') return;
    phaseRef.current = 'crashed';
    setPhase('crashed');
    // Firewood collected this run is forfeited on a crash — don't add anything to inventory.
    context.actions.triggerExhaustion();
    setTimeout(() => finishRun(false), 700);
  }, [context, finishRun]);

  // ─── Spawning ───
  const spawnObject = useCallback(() => {
    const distance = cameraZRef.current;
    const worldZ = cameraZRef.current + Z_SPAWN;
    const isObstacle = Math.random() >= PICKUP_SPAWN_CHANCE;
    let kind: ObjKind;
    if (isObstacle) {
      kind = OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)];
    } else if (distance < STAGE1_END) {
      kind = 'wood_poor';
    } else if (distance < STAGE2_END) {
      kind = 'wood_medium';
    } else {
      kind = 'wood_fine';
    }
    // Every obstacle goes through the lane-reservation helper, which guarantees at least one
    // clear lane stays open among simultaneous threats — there's no separate decorative band
    // to fall back to anymore, so if every lane is taken this spawn is simply skipped rather
    // than overcrowding the reachable field. Pickups always spawn within reach so every one is
    // collectible.
    let worldX: number | null;
    if (isObstacle) {
      worldX = pickNearObstacleX(objectsRef.current, worldZ);
      if (worldX === null) return; // every lane occupied — skip this spawn
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
  }, []);

  // ─── Update ───
  const update = useCallback(
    (dt: number) => {
      const held = heldRef.current;
      if (held.left) cameraXRef.current -= STEER_SPEED * dt;
      if (held.right) cameraXRef.current += STEER_SPEED * dt;
      cameraXRef.current = Math.max(-STEER_RANGE, Math.min(STEER_RANGE, cameraXRef.current));

      const speed = held.boost ? BOOST_SPEED : BASE_SPEED;
      cameraZRef.current += speed * dt;

      const distance = cameraZRef.current;
      const spawnIntervalMs =
        distance < STAGE1_END ? 650 : distance < STAGE2_END ? 480 : 350;
      spawnTimerRef.current -= dt * 1000;
      if (spawnTimerRef.current <= 0) {
        spawnObject();
        spawnTimerRef.current = spawnIntervalMs + (Math.random() * 240 - 120);
      }

      const remaining: WorldObj[] = [];
      for (const obj of objectsRef.current) {
        const zDiff = obj.worldZ - cameraZRef.current;
        if (zDiff <= -100) continue; // passed behind the camera — despawn

        if (zDiff > 0 && zDiff <= Z_NEAR) {
          const w = canvasWidthRef.current;
          const h = canvasHeightRef.current;
          const gap = computeGap(w);
          // Once the object's projected ground position has dropped level with (or past)
          // the player's own ground anchor, it would visually be drawn beneath/in front of
          // the player — it's already "passed" and shouldn't be able to collide, even if
          // zDiff is technically still positive.
          const objScreenY = h * HORIZON_RATIO + (gap * CAMERA_ALTITUDE) / zDiff;
          const playerAnchorY = h - h * PLAYER_BOTTOM_MARGIN_RATIO;
          const screenSeparation = Math.abs((gap * (obj.worldX - cameraXRef.current)) / zDiff);
          const objDrawWidth =
            capDrawWidth(DRAW_BASE[obj.kind], gap, zDiff, w) * (COLLISION_WIDTH_SCALE[obj.kind] ?? COLLISION_WIDTH_SCALE_DEFAULT);
          const playerDrawWidth = w * PLAYER_SCREEN_WIDTH_RATIO;
          const hitThreshold = ((objDrawWidth + playerDrawWidth) / 2) * COLLISION_FUDGE;
          if (objScreenY < playerAnchorY && screenSeparation < hitThreshold) {
            if (debugRef.current) {
              const rawDrawWidth = capDrawWidth(DRAW_BASE[obj.kind], gap, zDiff, w);
              // eslint-disable-next-line no-console
              console.log(
                `[Skiing] HIT kind=${obj.kind} zDiff=${zDiff.toFixed(0)} ` +
                  `screenSeparation=${screenSeparation.toFixed(1)}px hitThreshold=${hitThreshold.toFixed(1)}px | ` +
                  `objDrawWidth: raw=${rawDrawWidth.toFixed(1)}px scale=${COLLISION_WIDTH_SCALE[obj.kind] ?? COLLISION_WIDTH_SCALE_DEFAULT} scaled=${objDrawWidth.toFixed(1)}px | ` +
                  `playerDrawWidth=${playerDrawWidth.toFixed(1)}px fudge=${COLLISION_FUDGE} | ` +
                  `objScreenY=${objScreenY.toFixed(1)} playerAnchorY=${playerAnchorY.toFixed(1)} | canvas=${w}x${h}`
              );
            }
            if (OBSTACLE_KINDS.includes(obj.kind as ObstacleKind)) {
              handleCrash();
              return; // stop processing — the run is over
            }
            const pickupKind = obj.kind as PickupKind;
            woodCountsRef.current = {
              ...woodCountsRef.current,
              [pickupKind]: woodCountsRef.current[pickupKind] + 1,
            };
            setWoodCounts(woodCountsRef.current);
            continue; // collected — remove from the world
          }
        }
        remaining.push(obj);
      }
      objectsRef.current = remaining;
    },
    [spawnObject, handleCrash]
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
      const img = images[obj.kind];
      if (!img) return;

      const screenX = playerScreenX + (gap * (obj.worldX - cameraXRef.current)) / zDiff;
      const screenY = horizonY + (gap * CAMERA_ALTITUDE) / zDiff;
      const drawWidth = capDrawWidth(DRAW_BASE[obj.kind], gap, zDiff, w);
      const drawHeight = drawWidth / (img.naturalWidth / img.naturalHeight);

      if (screenX < -drawWidth || screenX > w + drawWidth) return;
      ctx.drawImage(img, screenX - drawWidth / 2, screenY - drawHeight, drawWidth, drawHeight);
    };

    // World objects — farthest first (painter's algorithm), split around level2: distant
    // objects draw BEFORE it so its opaque snow band occludes their base (just the treetop
    // pokes above the ridge, matching the near horizon blocking the view of what's beyond
    // it), then once an object crosses RIDGE_SWITCH_Z it draws AFTER level2 instead, so the
    // full sprite — trunk included — appears "in front of" the ridge.
    const sorted = [...objectsRef.current].sort((a, b) => b.worldZ - a.worldZ);
    const farObjects = sorted.filter(
      (o) => o.worldZ - cameraZRef.current > RIDGE_SWITCH_Z && !NO_RIDGE_OCCLUSION_KINDS.has(o.kind)
    );
    const nearObjects = sorted.filter(
      (o) => o.worldZ - cameraZRef.current <= RIDGE_SWITCH_Z || NO_RIDGE_OCCLUSION_KINDS.has(o.kind)
    );

    farObjects.forEach(drawObj);
    if (images.level2) {
      const groundDrawWidth = w * GROUND_ZOOM;
      const groundMarginPx = (groundDrawWidth - w) / 2;
      const groundShiftPx = -(cameraXRef.current / STEER_RANGE) * groundMarginPx * GROUND_PARALLAX_STRENGTH;
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

    nearObjects.forEach(drawObj);

    // Player — locked near the bottom, at the same anchor used to project objects above
    if (images.player) {
      const pw = w * PLAYER_SCREEN_WIDTH_RATIO;
      const ph = pw / (images.player.naturalWidth / images.player.naturalHeight);
      ctx.drawImage(images.player, playerScreenX - pw / 2, h - ph - h * PLAYER_BOTTOM_MARGIN_RATIO, pw, ph);
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
        const y = (((seed.ySeed * span + snowT * fallSpeed) % span) + span) % span - 10;
        const drift = Math.sin(snowT * seed.driftFreq + seed.driftPhase) * SNOW_DRIFT_AMPLITUDE;
        const xSpan = w + 20;
        const x = (((seed.xSeed * xSpan + drift) % xSpan) + xSpan) % xSpan - 10;
        ctx.beginPath();
        ctx.arc(x, y, SNOW_BASE_SIZE * seed.sizeMul, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ─── Debug: collision box overlay (F3) — mirrors the exact maths update() uses to
    // decide a hit, so what you see here is what actually triggers a crash/pickup. ───
    if (debugRef.current) {
      const playerDrawWidth = w * PLAYER_SCREEN_WIDTH_RATIO;
      const playerHalfWidth = (playerDrawWidth / 2) * COLLISION_FUDGE;
      const playerAnchorY = h - h * PLAYER_BOTTOM_MARGIN_RATIO;

      ctx.save();
      ctx.lineWidth = 2;
      ctx.font = '11px monospace';
      ctx.textBaseline = 'bottom';

      // Y-gate line — an object at/below this line has visually already passed the player
      // and can no longer collide, even if it's still overlapping on X (see update()).
      ctx.strokeStyle = 'rgba(80, 180, 255, 0.5)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, playerAnchorY);
      ctx.lineTo(w, playerAnchorY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Player's own collision box — same half-width formula update() uses.
      ctx.strokeStyle = 'rgba(80, 180, 255, 0.9)';
      ctx.strokeRect(playerScreenX - playerHalfWidth, playerAnchorY - 24, playerHalfWidth * 2, 24);

      for (const obj of objectsRef.current) {
        const zDiff = obj.worldZ - cameraZRef.current;
        if (zDiff <= 0 || zDiff > Z_NEAR) continue; // matches update()'s collision-check window
        const objScreenX = playerScreenX + (gap * (obj.worldX - cameraXRef.current)) / zDiff;
        const objScreenY = horizonY + (gap * CAMERA_ALTITUDE) / zDiff;
        const objDrawWidth =
          capDrawWidth(DRAW_BASE[obj.kind], gap, zDiff, w) * (COLLISION_WIDTH_SCALE[obj.kind] ?? COLLISION_WIDTH_SCALE_DEFAULT);
        const objHalfWidth = (objDrawWidth / 2) * COLLISION_FUDGE;
        const screenSeparation = Math.abs(objScreenX - playerScreenX);
        const isHit = objScreenY < playerAnchorY && screenSeparation < playerHalfWidth + objHalfWidth;

        const color = isHit
          ? '255, 60, 60'
          : OBSTACLE_KINDS.includes(obj.kind as ObstacleKind)
            ? '255, 190, 0'
            : '80, 220, 120';
        ctx.strokeStyle = `rgba(${color}, 0.9)`;
        ctx.strokeRect(objScreenX - objHalfWidth, objScreenY - 24, objHalfWidth * 2, 24);
        ctx.fillStyle = `rgba(${color}, 0.9)`;
        ctx.fillText(`${obj.kind} z=${Math.round(zDiff)}`, objScreenX - objHalfWidth, objScreenY - 26);
      }

      ctx.fillStyle = 'rgba(80, 180, 255, 0.9)';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('F3 DEBUG — collision boxes', 12, 20);
      ctx.restore();
    }
  }, []);

  // ─── Game loop ───
  useEffect(() => {
    if (!assetsLoaded) return;

    // Pre-populate the field once, on the first run of this effect. Without this, the object
    // pipeline starts empty and every spawn takes Z_SPAWN/BASE_SPEED to arrive from the
    // horizon — the forest reads as barren for the whole opening stretch of every run. Floored
    // just above Z_NEAR (not RIDGE_SWITCH_Z) so some pre-seeded obstacles already sit close
    // enough to show their true spread-out lateral position at frame 1 — flooring further out
    // left everything still visually compressed near centre until gameplay caught up (see
    // screenshots from actual playtesting). Still comfortably above the real collision gate
    // (~200-280, see Z_NEAR's comment), so nothing is unfairly close.
    if (!seededRef.current) {
      seededRef.current = true;
      const PREFILL_MIN_Z = Z_NEAR + 200;
      const prefillCount = Math.round((Z_SPAWN - PREFILL_MIN_Z) / BASE_SPEED / 0.5); // ≈ one spawn per 0.5s of backfilled time
      for (let i = 0; i < prefillCount; i++) {
        const worldZ = PREFILL_MIN_Z + Math.random() * (Z_SPAWN - PREFILL_MIN_Z);
        const worldX = pickNearObstacleX(objectsRef.current, worldZ);
        if (worldX === null) continue; // lanes full at this depth — skip, same as a normal spawn would
        objectsRef.current.push({
          id: nextIdRef.current++,
          kind: OBSTACLE_KINDS[Math.floor(Math.random() * OBSTACLE_KINDS.length)],
          worldX,
          worldZ,
        });
      }
    }

    let lastTime = performance.now();
    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, MAX_DT);
      lastTime = time;
      if (phaseRef.current === 'playing') update(dt);
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [assetsLoaded, update, render]);

  // ─── Touch controls (mirror the keyboard held-state refs) ───
  const bindHold = (key: 'left' | 'right' | 'boost') => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      heldRef.current[key] = true;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      heldRef.current[key] = false;
    },
    onMouseDown: () => {
      heldRef.current[key] = true;
    },
    onMouseUp: () => {
      heldRef.current[key] = false;
    },
    onMouseLeave: () => {
      heldRef.current[key] = false;
    },
  });

  const touchButtonStyle: React.CSSProperties = {
    width: 72,
    height: 72,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.6)',
    background: 'rgba(30,41,59,0.55)',
    color: '#fff',
    fontSize: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    touchAction: 'none',
    userSelect: 'none',
  };

  return (
    <div
      ref={containerRef}
      className={zClass(Z_MINI_GAME)}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0f172a',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
      />

      {!assetsLoaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 20,
          }}
        >
          Loading...
        </div>
      )}

      {assetsLoaded && (
        <>
          {/* HUD: firewood counts */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              display: 'flex',
              gap: 12,
              background: 'rgba(15,23,42,0.55)',
              borderRadius: 12,
              padding: '8px 12px',
              color: '#fff',
              fontFamily: 'sans-serif',
              fontSize: 14,
            }}
          >
            {(['wood_poor', 'wood_medium', 'wood_fine'] as PickupKind[]).map((kind) => (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img
                  src={skiingAssets[kind === 'wood_poor' ? 'woodPoor' : kind === 'wood_medium' ? 'woodMedium' : 'woodFine']}
                  alt=""
                  style={{ width: 22, height: 22, objectFit: 'contain' }}
                />
                <span>{woodCounts[kind]}</span>
              </div>
            ))}
          </div>

          {/* Stop skiing button */}
          <button
            onClick={handleStopSkiing}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(15,23,42,0.75)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 10,
              padding: '10px 16px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Stop skiing
          </button>

          {phase === 'crashed' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.35)',
                color: '#1e293b',
                fontFamily: 'sans-serif',
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              You took a tumble!
            </div>
          )}

          {/* Touch controls */}
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              display: 'flex',
              gap: 16,
            }}
          >
            <div style={touchButtonStyle} {...bindHold('left')}>
              ◀
            </div>
            <div style={touchButtonStyle} {...bindHold('right')}>
              ▶
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: 24, right: 24 }}>
            <div style={touchButtonStyle} {...bindHold('boost')}>
              ⏩
            </div>
          </div>
        </>
      )}
    </div>
  );
};
