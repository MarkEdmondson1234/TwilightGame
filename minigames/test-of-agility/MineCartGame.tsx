/**
 * Test of Agility — mine cart dodge run
 *
 * Third trial in the Wizard Trials series. The player rides a runaway mine cart
 * through a crystal-lined tunnel, steering left/right to dodge crystal outcrops
 * for a set distance. No braking, no boost — the cart is already rushing forward
 * on its own; only steering is player input. Any crash ends the run immediately.
 *
 * Engine adapted from minigames/skiing/SkiingGame.tsx (OutRun-style pseudo-3D
 * projection) — see that file for the full reasoning behind the shared collision/
 * rendering maths. This version drops skiing's pickups, boost and weather, and
 * adds a new "walls rushing past" middle-ground layer technique that skiing
 * doesn't need (see drawWallLayer below).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { testOfAgilityAssets } from './assets';
import { Z_MINI_GAME, zClass } from '../../zIndex';
import { debugLog } from '../../utils/debugLog';

// =============================================================================
// Types
// =============================================================================

interface WorldObj {
  id: number;
  worldX: number;
  worldZ: number;
}

// =============================================================================
// Tuning constants (world units are camera-relative, not pixels — see the
// projection formula below for how they map to screen space). Mirrors
// minigames/skiing/SkiingGame.tsx's constant block; see that file for the
// reasoning behind values reused unchanged here.
// =============================================================================

const CAMERA_FOV = 112; // degrees
const CAMERA_ALTITUDE = 150;
const HORIZON_RATIO = 0.48; // where the horizon sits, as a fraction of canvas height

const Z_NEAR = 700; // outer pre-filter for the collision check (see SkiingGame.tsx's comment)
const Z_SPAWN = 4000; // obstacles spawn this far ahead of the camera

const STEER_RANGE = 900; // max lateral offset the player can steer to
const STEER_SPEED = 1230; // world units/sec

// The floor (mine-cart tracks) sits almost directly under the player — like skiing's
// level2, it needs to visibly pan with steering or it reads as frozen under a moving cart.
const GROUND_ZOOM = 1.5; // floor drawn at this multiple of canvas width
const GROUND_PARALLAX_STRENGTH = 0.85; // fraction of the zoom's margin used at max steer

const OBSTACLE_SPAWN_X_RANGE = 1150; // lateral spawn band — the whole reachable width is real, dodgeable terrain
const LANE_COUNT = 6; // clear-path guarantee — see pickNearObstacleX
const Z_CLUSTER_WINDOW = 900;

const MAX_DRAW_WIDTH_RATIO = 0.46; // obstacles never draw larger than this fraction of canvas width

const BASE_SPEED = 550; // world Z units/sec — no boost, the cart's speed is constant

// Progression: spawn density ramps up in fixed-distance stages, same style as skiing's
// firewood/obstacle stages (just without a paired reward tier, since there's nothing to gather).
const STAGE1_END = BASE_SPEED * 20; // ≈20s — scattered crystals
const STAGE2_END = STAGE1_END + BASE_SPEED * 10; // stage 2 spans ~10s — denser crystals

// Distance to survive to pass the trial. Placeholder — tune via playtesting, per design brief.
const WIN_DISTANCE = 12000;

const MAX_DT = 0.033; // clamp frame delta so fast obstacles can't skip the collision window

// Collision hitbox narrowing — see SkiingGame.tsx's COLLISION_FUDGE/COLLISION_WIDTH_SCALE_DEFAULT
// comments for why sprite draw width isn't used directly. Placeholder until measured against
// crystal.png/mine_cart_male.png's actual alpha-channel bounds (same F3-debug-overlay method).
const COLLISION_FUDGE = 0.55;
const CRYSTAL_COLLISION_WIDTH_SCALE = 1 / 3;
const CRYSTAL_DRAW_BASE = 380;
// Placeholder ground padding — the fraction of the sprite's drawn height that is fully
// transparent margin below the visible artwork (see SkiingGame.tsx's GROUND_PAD_RATIO comment).
const CRYSTAL_GROUND_PAD_RATIO = 0.05;

const PLAYER_SCREEN_WIDTH_RATIO = 0.22; // fraction of canvas width
const PLAYER_SCREEN_SHIFT_RATIO = 0.38; // how far the player sprite slides when steering
const PLAYER_BOTTOM_MARGIN_RATIO = 0.03;
// mine_cart_male.png is portrait (not square, unlike skiing's player sprite) — draw height is
// derived from the image's real aspect ratio at each call site, not assumed 1:1.
const PLAYER_GROUND_PAD_RATIO = 0.1; // placeholder, tune against the real alpha bounds
const PLAYER_COLLISION_WIDTH_SCALE = 0.3; // placeholder

// "Walls rushing past" middle-ground layers — layer1/layer2/layer3 each behave like a
// non-collidable object centred on the track (worldX = 0), advancing through a 0->1 phase per
// cycle that drives opacity (fade in/out at the edges) and on-screen scale, then re-looping.
// The fade (not a hard cutoff) is what hides the worldZ reset — by the time it jumps back to
// WALL_CYCLE_DISTANCE the layer is already at zero opacity. The three layers are seeded at
// evenly-spaced fractions of the cycle so they're always at different points in it — one
// mid-growth/opaque while another is fading — giving a continuous alternating rush instead of
// synchronized pops.
//
// Scale is a direct min->max interpolation over phase, NOT derived from the perspective
// divide (gap/zDiff) the way obstacle scale is. A pure perspective divide ties the ratio
// between the smallest and largest size in the cycle to WALL_CYCLE_DISTANCE/WALL_NEAR_CUTOFF
// (a fixed ~10x here) — tuning it to keep the far end big enough to cover the canvas forces
// the near end to an absurd multiple, while tuning it modestly leaves the far end visibly
// undersized (a small rectangle with visible edges right as it fades into view — the bug this
// replaces). Interpolating directly between two tuned canvas-width multiples, both already
// bigger than the canvas, guarantees neither end ever shows an edge inside the frame.
const WALL_CYCLE_DISTANCE = 3000;
const WALL_NEAR_CUTOFF = 300;
const WALL_FADE_IN_END = 0.08; // phase fraction over which opacity ramps 0→1 after (re)spawn
const WALL_FADE_OUT_START = 0.95; // phase fraction after which opacity ramps 1→0 toward cutoff
// Start just a hair over exact canvas-width alignment (not 1.6x+) — the ask is for the wall's
// borders to align with the frame at spawn, not to already be visibly zoomed in from the start.
const WALL_MIN_SCALE = 1.05; // ×canvas width at phase=0 — borders roughly aligned with the frame
const WALL_MAX_SCALE = 3.2; // ×canvas width at phase=1 (near cutoff)

const HUD_UPDATE_INTERVAL_MS = 160; // ~6/sec — the distance readout doesn't need per-frame precision
const METERS_PER_WORLD_UNIT = 1 / 6; // cosmetic conversion only, for a readable HUD number

// =============================================================================
// Shared projection helpers (used by both collision checks and rendering, so the
// two can never drift apart)
// =============================================================================

function computeGap(canvasWidth: number): number {
  return canvasWidth / (2 * Math.tan((CAMERA_FOV * Math.PI) / 360));
}

function capDrawWidth(base: number, gap: number, zDiff: number, canvasWidth: number): number {
  return Math.min((base * gap) / zDiff, canvasWidth * MAX_DRAW_WIDTH_RATIO);
}

function getCollisionAnchorY(
  rawAnchorY: number,
  drawWidth: number,
  img: HTMLImageElement | undefined
): number {
  const pad = img ? (drawWidth / (img.naturalWidth / img.naturalHeight)) * CRYSTAL_GROUND_PAD_RATIO : 0;
  return rawAnchorY - pad;
}

function getPlayerDrawHeight(canvasWidth: number, img: HTMLImageElement | undefined): number {
  const pw = canvasWidth * PLAYER_SCREEN_WIDTH_RATIO;
  const aspect = img ? img.naturalWidth / img.naturalHeight : 1;
  return pw / aspect;
}

function getPlayerCollisionAnchorY(
  canvasWidth: number,
  canvasHeight: number,
  img: HTMLImageElement | undefined
): number {
  const drawHeight = getPlayerDrawHeight(canvasWidth, img);
  return canvasHeight - canvasHeight * PLAYER_BOTTOM_MARGIN_RATIO - drawHeight * PLAYER_GROUND_PAD_RATIO;
}

function getPlayerCollisionWidth(canvasWidth: number): number {
  return canvasWidth * PLAYER_SCREEN_WIDTH_RATIO * PLAYER_COLLISION_WIDTH_SCALE;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * Clear-path guarantee for obstacle spawns — see SkiingGame.tsx's pickNearObstacleX comment
 * for the full reasoning. Returns a lane-safe worldX, or null if every lane is occupied.
 */
function pickNearObstacleX(objects: WorldObj[], candidateWorldZ: number): number | null {
  const laneWidth = (2 * OBSTACLE_SPAWN_X_RANGE) / LANE_COUNT;
  const occupiedLanes = new Set<number>();
  for (const obj of objects) {
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

type ImageKey = 'roof' | 'layer1' | 'layer2' | 'layer3' | 'floor' | 'crystal' | 'player';

// =============================================================================
// Component
// =============================================================================

export const MineCartGame: React.FC<MiniGameComponentProps> = ({ onComplete }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<Partial<Record<ImageKey, HTMLImageElement>>>({});
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [phase, setPhase] = useState<'playing' | 'crashed'>('playing');
  const [distancePct, setDistancePct] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);

  const cameraXRef = useRef(0);
  const cameraZRef = useRef(0);
  const objectsRef = useRef<WorldObj[]>([]);
  const nextIdRef = useRef(1);
  const spawnTimerRef = useRef(600);
  const seededRef = useRef(false);
  const phaseRef = useRef<'playing' | 'crashed'>('playing');
  const heldRef = useRef({ left: false, right: false });
  const rafRef = useRef(0);
  const crashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasWidthRef = useRef(0);
  const canvasHeightRef = useRef(0);
  const lastHudUpdateRef = useRef(0);
  // Seeded at evenly-spaced fractions of WALL_CYCLE_DISTANCE so the three layers are always at
  // different points in their cycle — one mid-growth/opaque while another is fading, etc.
  const layer1WorldZRef = useRef(WALL_CYCLE_DISTANCE);
  const layer2WorldZRef = useRef((WALL_CYCLE_DISTANCE * 2) / 3);
  const layer3WorldZRef = useRef(WALL_CYCLE_DISTANCE / 3);
  // F3 collision-box overlay — mirrors SkiingGame.tsx's debug tooling for tuning hitboxes
  // against the real alpha-channel bounds of crystal.png/mine_cart_male.png.
  const debugRef = useRef(false);

  // ─── Input: keyboard (self-contained — main game's controls are already gated
  // off via ui.miniGame while this is open) ───
  useEffect(() => {
    const STEER_KEYS = new Set(['a', 'd', 'arrowleft', 'arrowright']);
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') heldRef.current.left = true;
      if (key === 'd' || key === 'arrowright') heldRef.current.right = true;
      if (key === 'f3') {
        e.preventDefault();
        debugRef.current = !debugRef.current;
      }
      if (STEER_KEYS.has(key)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') heldRef.current.left = false;
      if (key === 'd' || key === 'arrowright') heldRef.current.right = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // ─── Load assets ───
  useEffect(() => {
    const entries: Array<[ImageKey, string]> = [
      ['roof', testOfAgilityAssets.roof],
      ['layer1', testOfAgilityAssets.layer1],
      ['layer2', testOfAgilityAssets.layer2],
      ['layer3', testOfAgilityAssets.layer3],
      ['floor', testOfAgilityAssets.floor],
      ['crystal', testOfAgilityAssets.crystal],
      ['player', testOfAgilityAssets.player],
    ];
    let cancelled = false;
    Promise.all(entries.map(([key, src]) => loadImage(src).then((img) => [key, img] as const)))
      .then((loaded) => {
        if (cancelled) return;
        for (const [key, img] of loaded) imagesRef.current[key] = img;
        setAssetsLoaded(true);
      })
      .catch((err) => console.error('[MineCartGame] Failed to load assets:', err));
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
            rewards: [],
            message: 'You made it through the tunnel! You have passed the Test of Agility.',
            messageType: 'success',
          }
        : {
            success: false,
            rewards: [],
            message: 'The mine cart crashed! You are cast back to the antechamber...',
            messageType: 'warning',
          };
      onComplete(result);
    },
    [onComplete]
  );

  const handleCrash = useCallback(() => {
    if (phaseRef.current === 'crashed') return;
    phaseRef.current = 'crashed';
    setPhase('crashed');
    crashTimeoutRef.current = setTimeout(() => {
      crashTimeoutRef.current = null;
      finishRun(false);
    }, 500);
  }, [finishRun]);

  useEffect(() => {
    return () => {
      if (crashTimeoutRef.current !== null) clearTimeout(crashTimeoutRef.current);
    };
  }, []);

  // ─── Spawning ───
  const spawnObject = useCallback(() => {
    const worldZ = cameraZRef.current + Z_SPAWN;
    const worldX = pickNearObstacleX(objectsRef.current, worldZ);
    if (worldX === null) return; // every lane occupied — skip this spawn
    objectsRef.current.push({ id: nextIdRef.current++, worldX, worldZ });
    if (objectsRef.current.length > 260) objectsRef.current.shift();
  }, []);

  // ─── Update ───
  const update = useCallback(
    (dt: number) => {
      const held = heldRef.current;
      if (held.left) cameraXRef.current -= STEER_SPEED * dt;
      if (held.right) cameraXRef.current += STEER_SPEED * dt;
      cameraXRef.current = Math.max(-STEER_RANGE, Math.min(STEER_RANGE, cameraXRef.current));

      cameraZRef.current += BASE_SPEED * dt;

      if (cameraZRef.current >= WIN_DISTANCE) {
        finishRun(true);
        return;
      }

      // Advance the wall layers' loop cycles (see WALL_CYCLE_DISTANCE comment above).
      for (const wallZRef of [layer1WorldZRef, layer2WorldZRef, layer3WorldZRef]) {
        const zDiff = wallZRef.current - cameraZRef.current;
        if (zDiff <= WALL_NEAR_CUTOFF) wallZRef.current += WALL_CYCLE_DISTANCE;
      }

      const distance = cameraZRef.current;
      const spawnIntervalMs = distance < STAGE1_END ? 650 : distance < STAGE2_END ? 480 : 350;
      spawnTimerRef.current -= dt * 1000;
      if (spawnTimerRef.current <= 0) {
        spawnObject();
        spawnTimerRef.current = spawnIntervalMs + (Math.random() * 240 - 120);
      }

      const now = performance.now();
      if (now - lastHudUpdateRef.current >= HUD_UPDATE_INTERVAL_MS) {
        lastHudUpdateRef.current = now;
        setDistancePct(Math.min(100, (distance / WIN_DISTANCE) * 100));
        setDistanceMeters(Math.round(distance * METERS_PER_WORLD_UNIT));
      }

      const remaining: WorldObj[] = [];
      for (const obj of objectsRef.current) {
        const zDiff = obj.worldZ - cameraZRef.current;
        if (zDiff <= -100) continue; // passed behind the camera — despawn

        if (zDiff > 0 && zDiff <= Z_NEAR) {
          const w = canvasWidthRef.current;
          const h = canvasHeightRef.current;
          const gap = computeGap(w);
          const rawDrawWidth = capDrawWidth(CRYSTAL_DRAW_BASE, gap, zDiff, w);
          const objScreenY = getCollisionAnchorY(
            h * HORIZON_RATIO + (gap * CAMERA_ALTITUDE) / zDiff,
            rawDrawWidth,
            imagesRef.current.crystal
          );
          const playerAnchorY = getPlayerCollisionAnchorY(w, h, imagesRef.current.player);
          const screenSeparation = Math.abs((gap * (obj.worldX - cameraXRef.current)) / zDiff);
          const objDrawWidth = rawDrawWidth * CRYSTAL_COLLISION_WIDTH_SCALE;
          const playerCollisionWidth = getPlayerCollisionWidth(w);
          const hitThreshold = ((objDrawWidth + playerCollisionWidth) / 2) * COLLISION_FUDGE;
          if (objScreenY < playerAnchorY && screenSeparation < hitThreshold) {
            if (debugRef.current) {
              debugLog(
                'TestOfAgility',
                `HIT zDiff=${zDiff.toFixed(0)} screenSeparation=${screenSeparation.toFixed(1)}px ` +
                  `hitThreshold=${hitThreshold.toFixed(1)}px | canvas=${w}x${h}`
              );
            }
            handleCrash();
            return; // stop processing — the run is over
          }
        }
        remaining.push(obj);
      }
      objectsRef.current = remaining;
    },
    [spawnObject, handleCrash, finishRun]
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

    // Roof — static full-frame backdrop, never moves.
    if (images.roof) ctx.drawImage(images.roof, 0, 0, w, h);

    const playerShiftPx = (cameraXRef.current / STEER_RANGE) * (w * PLAYER_SCREEN_SHIFT_RATIO);
    const playerScreenX = w / 2 + playerShiftPx;

    // Floor — drawn "zoomed in" wider than the canvas, panned opposite steering, mirrors
    // SkiingGame.tsx's level2 ground layer.
    if (images.floor) {
      const groundDrawWidth = w * GROUND_ZOOM;
      const groundMarginPx = (groundDrawWidth - w) / 2;
      const groundShiftPx =
        -(cameraXRef.current / STEER_RANGE) * groundMarginPx * GROUND_PARALLAX_STRENGTH;
      ctx.drawImage(images.floor, -groundMarginPx + groundShiftPx, 0, groundDrawWidth, h);
    }

    // Wall layers — "rushing past" tunnel walls (see WALL_* constants above). Anchor is
    // per-layer since the art isn't uniform: layer1/layer2 have their visible rock content
    // concentrated near their own top edge, so centring on the horizon shows it correctly;
    // layer3 is a near-full-frame texture meant to align its lower edge with the horizon line
    // (where the tunnel continues into the distance), so it needs bottom-anchoring instead.
    const drawWallLayer = (
      img: HTMLImageElement | undefined,
      wallZRef: React.RefObject<number>,
      anchor: 'center' | 'bottom'
    ) => {
      if (!img) return;
      const zDiff = wallZRef.current - cameraZRef.current;
      if (zDiff <= 0) return;
      const phase = clamp01(1 - (zDiff - WALL_NEAR_CUTOFF) / (WALL_CYCLE_DISTANCE - WALL_NEAR_CUTOFF));
      const opacity =
        phase < WALL_FADE_IN_END
          ? phase / WALL_FADE_IN_END
          : phase > WALL_FADE_OUT_START
            ? (1 - phase) / (1 - WALL_FADE_OUT_START)
            : 1;
      if (opacity <= 0) return;
      const drawWidth = w * (WALL_MIN_SCALE + (WALL_MAX_SCALE - WALL_MIN_SCALE) * phase);
      const drawHeight = drawWidth / (img.naturalWidth / img.naturalHeight);
      const screenX = playerScreenX - (gap * cameraXRef.current) / zDiff;
      const drawY = anchor === 'bottom' ? horizonY - drawHeight : horizonY - drawHeight / 2;
      ctx.globalAlpha = opacity;
      ctx.drawImage(img, screenX - drawWidth / 2, drawY, drawWidth, drawHeight);
      ctx.globalAlpha = 1;
    };
    // Farther layer first (painter's algorithm) so the nearer one draws on top.
    [
      { img: images.layer1, ref: layer1WorldZRef, anchor: 'center' as const },
      { img: images.layer2, ref: layer2WorldZRef, anchor: 'center' as const },
      { img: images.layer3, ref: layer3WorldZRef, anchor: 'bottom' as const },
    ]
      .sort((a, b) => b.ref.current - a.ref.current)
      .forEach(({ img, ref, anchor }) => drawWallLayer(img, ref, anchor));

    // Crystals — farthest first (painter's algorithm).
    const sorted = [...objectsRef.current].sort((a, b) => b.worldZ - a.worldZ);
    for (const obj of sorted) {
      const zDiff = obj.worldZ - cameraZRef.current;
      if (zDiff <= 0) continue;
      const img = images.crystal;
      if (!img) continue;

      const screenX = playerScreenX + (gap * (obj.worldX - cameraXRef.current)) / zDiff;
      const screenY = horizonY + (gap * CAMERA_ALTITUDE) / zDiff;
      const drawWidth = capDrawWidth(CRYSTAL_DRAW_BASE, gap, zDiff, w);
      const drawHeight = drawWidth / (img.naturalWidth / img.naturalHeight);

      if (screenX < -drawWidth || screenX > w + drawWidth) continue;
      ctx.drawImage(img, screenX - drawWidth / 2, screenY - drawHeight, drawWidth, drawHeight);
    }

    // Player — locked near the bottom, at the same anchor used to project obstacles above.
    if (images.player) {
      const pw = w * PLAYER_SCREEN_WIDTH_RATIO;
      const ph = getPlayerDrawHeight(w, images.player);
      ctx.drawImage(images.player, playerScreenX - pw / 2, h - ph - h * PLAYER_BOTTOM_MARGIN_RATIO, pw, ph);
    }

    // ─── Debug: collision box overlay (F3) — mirrors the exact maths update() uses. ───
    if (debugRef.current) {
      const playerCollisionWidth = getPlayerCollisionWidth(w);
      const playerHalfWidth = (playerCollisionWidth / 2) * COLLISION_FUDGE;
      const playerAnchorY = getPlayerCollisionAnchorY(w, h, images.player);

      ctx.save();
      ctx.lineWidth = 2;
      ctx.font = '11px monospace';
      ctx.textBaseline = 'bottom';

      ctx.strokeStyle = 'rgba(80, 180, 255, 0.5)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, playerAnchorY);
      ctx.lineTo(w, playerAnchorY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = 'rgba(80, 180, 255, 0.9)';
      ctx.strokeRect(playerScreenX - playerHalfWidth, playerAnchorY - 24, playerHalfWidth * 2, 24);

      for (const obj of objectsRef.current) {
        const zDiff = obj.worldZ - cameraZRef.current;
        if (zDiff <= 0 || zDiff > Z_NEAR) continue;
        const objScreenX = playerScreenX + (gap * (obj.worldX - cameraXRef.current)) / zDiff;
        const rawDrawWidth = capDrawWidth(CRYSTAL_DRAW_BASE, gap, zDiff, w);
        const objScreenY = getCollisionAnchorY(
          horizonY + (gap * CAMERA_ALTITUDE) / zDiff,
          rawDrawWidth,
          images.crystal
        );
        const objDrawWidth = rawDrawWidth * CRYSTAL_COLLISION_WIDTH_SCALE;
        const objHalfWidth = (objDrawWidth / 2) * COLLISION_FUDGE;
        const screenSeparation = Math.abs(objScreenX - playerScreenX);
        const isHit = objScreenY < playerAnchorY && screenSeparation < playerHalfWidth + objHalfWidth;

        ctx.strokeStyle = isHit ? 'rgba(255, 60, 60, 0.9)' : 'rgba(255, 190, 0, 0.9)';
        ctx.strokeRect(objScreenX - objHalfWidth, objScreenY - 24, objHalfWidth * 2, 24);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillText(`z=${Math.round(zDiff)}`, objScreenX - objHalfWidth, objScreenY - 26);
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

    // Pre-populate the tunnel once, on the first run of this effect — see
    // SkiingGame.tsx's identical prefill comment for why this matters.
    if (!seededRef.current) {
      seededRef.current = true;
      const PREFILL_MIN_Z = Z_NEAR + 200;
      const prefillCount = Math.round((Z_SPAWN - PREFILL_MIN_Z) / BASE_SPEED / 0.5);
      for (let i = 0; i < prefillCount; i++) {
        const worldZ = PREFILL_MIN_Z + Math.random() * (Z_SPAWN - PREFILL_MIN_Z);
        const worldX = pickNearObstacleX(objectsRef.current, worldZ);
        if (worldX === null) continue;
        objectsRef.current.push({ id: nextIdRef.current++, worldX, worldZ });
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
  const bindHold = (key: 'left' | 'right') => ({
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
          {/* HUD: distance progress */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(15,23,42,0.55)',
              borderRadius: 12,
              padding: '8px 16px',
              color: '#fff',
              fontFamily: 'sans-serif',
            }}
          >
            <div
              style={{
                width: 220,
                height: 8,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.2)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${distancePct}%`,
                  height: '100%',
                  background: '#a78bfa',
                  transition: 'width 0.15s linear',
                }}
              />
            </div>
            <span style={{ fontSize: 13 }}>
              {distanceMeters}m / {Math.round(WIN_DISTANCE * METERS_PER_WORLD_UNIT)}m
            </span>
          </div>

          {phase === 'crashed' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,80,80,0.35)',
                color: '#1e293b',
                fontFamily: 'sans-serif',
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              The cart crashed!
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
        </>
      )}
    </div>
  );
};
