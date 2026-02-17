/**
 * Pumpkin Carving Mini-Game
 *
 * A real canvas-based carving game where the player drags a knife across
 * a pumpkin to cut away the surface and reveal the glowing interior.
 *
 * - Uses the actual pumpkin crop asset as the surface image
 * - Drag to carve (erase the front surface, revealing glow beneath)
 * - Three knife sizes: fine, medium, and bold
 * - Multiple candle/lighting options with flicker effect
 * - Score based on how much was carved
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { MiniGameComponentProps, MiniGameResult } from '../types';
import { groceryAssets } from '../../assets';

// =============================================================================
// Constants
// =============================================================================

const CANVAS_W = 400;
const CANVAS_H = 400;

/** Pumpkin bounding box — image fills this area */
const PUMPKIN = {
  cx: CANVAS_W / 2,
  cy: CANVAS_H / 2,
  rx: 140,
  ry: 170,
};

const KNIFE_SIZES = [
  { id: 'fine', label: 'Fine', radius: 6 },
  { id: 'medium', label: 'Medium', radius: 14 },
  { id: 'bold', label: 'Bold', radius: 24 },
] as const;

type KnifeSize = (typeof KNIFE_SIZES)[number]['id'];

/** Candle glow colour presets */
const CANDLE_COLOURS = [
  { id: 'warm', label: 'Warm', emoji: '🕯️', stops: ['#fff7c2', '#fcd34d', '#f59e0b', '#92400e'] },
  { id: 'fire', label: 'Fire', emoji: '🔥', stops: ['#fff3c4', '#fb923c', '#dc2626', '#7c2d12'] },
  { id: 'eerie', label: 'Eerie', emoji: '👻', stops: ['#d4ffd4', '#4ade80', '#16a34a', '#064e3b'] },
  {
    id: 'spectral',
    label: 'Spectral',
    emoji: '💀',
    stops: ['#e9d5ff', '#a78bfa', '#7c3aed', '#3b0764'],
  },
  { id: 'ice', label: 'Ice', emoji: '❄️', stops: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0c4a6e'] },
] as const;

type CandleColour = (typeof CANDLE_COLOURS)[number]['id'];

// =============================================================================
// Helpers
// =============================================================================

/** Check if a point is inside the pumpkin ellipse */
function isInsidePumpkin(x: number, y: number): boolean {
  const dx = (x - PUMPKIN.cx) / PUMPKIN.rx;
  const dy = (y - PUMPKIN.cy) / PUMPKIN.ry;
  return dx * dx + dy * dy <= 1;
}

/** Load an image from a URL and return as HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// =============================================================================
// Component
// =============================================================================

export const PumpkinCarvingGame: React.FC<MiniGameComponentProps> = ({
  context,
  onClose,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceCanvasRef = useRef<HTMLCanvasElement>(null);
  const pumpkinImageRef = useRef<HTMLImageElement | null>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const flickerRAF = useRef<number>(0);

  const [knifeSize, setKnifeSize] = useState<KnifeSize>('medium');
  const [candleLit, setCandleLit] = useState(false);
  const [candleColour, setCandleColour] = useState<CandleColour>('warm');
  const [flickerEnabled, setFlickerEnabled] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [carvePercent, setCarvePercent] = useState(0);

  const getKnifeRadius = () => KNIFE_SIZES.find((k) => k.id === knifeSize)!.radius;

  // ─── Load pumpkin asset image ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadImage(groceryAssets.pumpkin).then((img) => {
      if (cancelled) return;
      pumpkinImageRef.current = img;
      setImageLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Initialise surface canvas once image is loaded ──────────────────────
  useEffect(() => {
    if (!imageLoaded) return;
    const surface = surfaceCanvasRef.current;
    const img = pumpkinImageRef.current;
    if (!surface || !img) return;
    const ctx = surface.getContext('2d');
    if (!ctx) return;

    // Draw the pumpkin asset image as the front surface (carved away by player)
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw the pumpkin image centred and scaled to fill the canvas
    const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height) * 0.95;
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (CANVAS_W - w) / 2;
    const y = (CANVAS_H - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  }, [imageLoaded]);

  // ─── Render composited frame ────────────────────────────────────────────
  const renderFrame = useCallback(
    (flickerAlpha = 1) => {
      const canvas = canvasRef.current;
      const surface = surfaceCanvasRef.current;
      if (!canvas || !surface) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // 1. Draw the interior (revealed by carving)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(PUMPKIN.cx, PUMPKIN.cy, PUMPKIN.rx, PUMPKIN.ry, 0, 0, Math.PI * 2);
      ctx.clip();

      if (candleLit) {
        const preset = CANDLE_COLOURS.find((c) => c.id === candleColour)!;
        // Bright glow with selected colour
        const glow = ctx.createRadialGradient(
          PUMPKIN.cx,
          PUMPKIN.cy + 30,
          10,
          PUMPKIN.cx,
          PUMPKIN.cy,
          PUMPKIN.ry
        );
        glow.addColorStop(0, preset.stops[0]);
        glow.addColorStop(0.3, preset.stops[1]);
        glow.addColorStop(0.6, preset.stops[2]);
        glow.addColorStop(1, preset.stops[3]);
        ctx.fillStyle = glow;
        ctx.globalAlpha = flickerAlpha;
      } else {
        // Dark hollow interior
        const hollow = ctx.createRadialGradient(
          PUMPKIN.cx,
          PUMPKIN.cy + 20,
          10,
          PUMPKIN.cx,
          PUMPKIN.cy,
          PUMPKIN.ry
        );
        hollow.addColorStop(0, '#4a2800');
        hollow.addColorStop(0.5, '#2d1500');
        hollow.addColorStop(1, '#1a0a00');
        ctx.fillStyle = hollow;
      }
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();

      // 2. Composite the surface layer on top (carved areas are transparent)
      ctx.drawImage(surface, 0, 0);
    },
    // imageLoaded ensures renderFrame gets a new ref after the surface canvas
    // is painted, which triggers the flicker/render effect to re-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candleLit, candleColour, imageLoaded]
  );

  // ─── Candle flicker animation ─────────────────────────────────────────
  useEffect(() => {
    if (candleLit && flickerEnabled) {
      let startTime = 0;
      const animate = (time: number) => {
        if (!startTime) startTime = time;
        const t = (time - startTime) / 1000;
        // Organic flicker: layered sine waves for irregular rhythm
        const flicker =
          0.85 + 0.08 * Math.sin(t * 8.3) + 0.04 * Math.sin(t * 13.7) + 0.03 * Math.sin(t * 21.1);
        renderFrame(flicker);
        flickerRAF.current = requestAnimationFrame(animate);
      };
      flickerRAF.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(flickerRAF.current);
    }
    // Static render when flicker is off or candle is out
    renderFrame(1);
    return () => cancelAnimationFrame(flickerRAF.current);
  }, [candleLit, flickerEnabled, renderFrame]);

  // ─── Carving logic ──────────────────────────────────────────────────────
  const carveAt = useCallback(
    (x: number, y: number) => {
      if (!isInsidePumpkin(x, y)) return;

      const surface = surfaceCanvasRef.current;
      if (!surface) return;
      const ctx = surface.getContext('2d');
      if (!ctx) return;

      const r = getKnifeRadius();

      // Erase a circle from the surface (reveals interior)
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Interpolate between last position for smooth strokes
      if (lastPos.current) {
        const dx = x - lastPos.current.x;
        const dy = y - lastPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.ceil(dist / (r * 0.5));
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const ix = lastPos.current.x + dx * t;
          const iy = lastPos.current.y + dy * t;
          if (isInsidePumpkin(ix, iy)) {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(ix, iy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      lastPos.current = { x, y };
      renderFrame();
    },
    [renderFrame, knifeSize]
  );

  const getCanvasPos = (
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = null;
    const pos = getCanvasPos(e);
    if (pos) carveAt(pos.x, pos.y);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    if (pos) carveAt(pos.x, pos.y);
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    lastPos.current = null;
    updateCarvePercent();
  };

  // ─── Original pixel snapshot for carve % ───────────────────────────────
  const originalAlphaRef = useRef<Uint8Array | null>(null);

  // Capture the original alpha channel after the pumpkin image is drawn
  useEffect(() => {
    if (!imageLoaded) return;
    const surface = surfaceCanvasRef.current;
    if (!surface) return;
    const ctx = surface.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const alpha = new Uint8Array(CANVAS_W * CANVAS_H);
    for (let i = 0; i < alpha.length; i++) {
      alpha[i] = imageData.data[i * 4 + 3];
    }
    originalAlphaRef.current = alpha;
  }, [imageLoaded]);

  // ─── Score calculation ──────────────────────────────────────────────────
  const updateCarvePercent = useCallback(() => {
    const surface = surfaceCanvasRef.current;
    const origAlpha = originalAlphaRef.current;
    if (!surface || !origAlpha) return;
    const ctx = surface.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    const data = imageData.data;

    let pumpkinPixels = 0;
    let carvedPixels = 0;

    // Compare current alpha to original — pixels that were opaque but are
    // now transparent have been carved away
    for (let i = 0; i < origAlpha.length; i++) {
      if (origAlpha[i] > 128) {
        // This pixel was part of the pumpkin image
        pumpkinPixels++;
        if (data[i * 4 + 3] < 128) {
          carvedPixels++;
        }
      }
    }

    const pct = pumpkinPixels > 0 ? Math.round((carvedPixels / pumpkinPixels) * 100) : 0;
    setCarvePercent(pct);
  }, [imageLoaded]);

  // ─── Finish carving ─────────────────────────────────────────────────────
  const handleFinish = useCallback(() => {
    updateCarvePercent();

    // Score: 0-100 based on carve %. Sweet spot is 15-40% (a nice face).
    // Too much (>60%) means you destroyed the pumpkin.
    let score: number;
    let message: string;
    let messageType: 'success' | 'info' | 'warning';

    if (carvePercent >= 10 && carvePercent <= 50) {
      score = Math.min(100, carvePercent * 3);
      message =
        carvePercent >= 25
          ? "Brilliant carving! A proper jack-o'-lantern!"
          : 'A lovely little face. Well done!';
      messageType = 'success';
    } else if (carvePercent > 50) {
      score = Math.max(20, 100 - (carvePercent - 50) * 2);
      message = "You got a bit carried away! But it's still charming.";
      messageType = 'info';
    } else {
      score = carvePercent * 5;
      message = 'A subtle carving. Perhaps a bit more next time?';
      messageType = 'info';
    }

    const result: MiniGameResult = {
      success: carvePercent >= 5,
      score,
      goldReward: Math.floor(score / 5),
      message,
      messageType,
      progressData: {
        lastScore: score,
        carvePercent,
        totalCarvings: (context.storage.load<{ totalCarvings?: number }>()?.totalCarvings ?? 0) + 1,
      },
    };

    onComplete(result);
  }, [carvePercent, context.storage, onComplete, updateCarvePercent]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!imageLoaded) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a0a00 0%, #2d1500 50%, #1a0a00 100%)',
          borderRadius: 16,
          padding: 40,
          color: '#fde68a',
          textAlign: 'center',
        }}
      >
        Loading pumpkin...
      </div>
    );
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1a0a00 0%, #2d1500 50%, #1a0a00 100%)',
        borderRadius: 16,
        padding: 20,
        color: '#fde68a',
        fontFamily: 'inherit',
        userSelect: 'none',
        touchAction: 'none',
        maxWidth: CANVAS_W + 40,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#fbbf24' }}>Pumpkin Carving</h2>
        <p style={{ margin: 0, fontSize: 12, color: '#d97706', opacity: 0.8 }}>
          Drag your knife across the pumpkin to carve a face
        </p>
      </div>

      {/* Canvas stack */}
      <div style={{ position: 'relative', width: '100%', maxWidth: CANVAS_W }}>
        {/* Hidden off-screen surface layer */}
        <canvas
          ref={surfaceCanvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: 'none' }}
        />
        {/* Visible composited canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: 8,
            cursor: 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Knife size selector */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
        {KNIFE_SIZES.map((k) => {
          const active = knifeSize === k.id;
          return (
            <button
              key={k.id}
              onClick={() => setKnifeSize(k.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: active ? '2px solid #fbbf24' : '2px solid rgba(251, 191, 36, 0.2)',
                background: active ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                color: '#fde68a',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: active ? 'bold' : 'normal',
              }}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      {/* Carved percentage + candle toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          fontSize: 12,
        }}
      >
        <span style={{ color: '#d97706' }}>Carved: {carvePercent}%</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setFlickerEnabled((prev) => !prev)}
            title={flickerEnabled ? 'Disable flicker' : 'Enable flicker'}
            style={{
              padding: '4px 8px',
              borderRadius: 6,
              border: '1px solid rgba(251, 191, 36, 0.3)',
              background: flickerEnabled ? 'rgba(251, 191, 36, 0.15)' : 'rgba(0, 0, 0, 0.3)',
              color: '#fde68a',
              cursor: 'pointer',
              fontSize: 11,
              opacity: candleLit ? 1 : 0.4,
            }}
          >
            {flickerEnabled ? 'Flicker on' : 'Steady'}
          </button>
          <button
            onClick={() => setCandleLit((prev) => !prev)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: '1px solid rgba(251, 191, 36, 0.3)',
              background: candleLit ? 'rgba(251, 191, 36, 0.25)' : 'rgba(0, 0, 0, 0.3)',
              color: '#fde68a',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {candleLit ? 'Blow out candle' : 'Light the candle'}
          </button>
        </div>
      </div>

      {/* Candle colour picker (shown when lit) */}
      {candleLit && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {CANDLE_COLOURS.map((c) => {
            const active = candleColour === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCandleColour(c.id)}
                title={c.label}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: active ? `2px solid ${c.stops[1]}` : '2px solid rgba(255,255,255,0.1)',
                  background: active
                    ? `linear-gradient(135deg, ${c.stops[3]}, ${c.stops[2]})`
                    : 'rgba(0, 0, 0, 0.3)',
                  color: active ? c.stops[0] : '#fde68a',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: active ? 'bold' : 'normal',
                }}
              >
                {c.emoji} {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: '1px solid rgba(251, 191, 36, 0.3)',
            background: 'transparent',
            color: '#fde68a',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleFinish}
          disabled={carvePercent < 1}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: carvePercent >= 1 ? '#f97316' : '#4a2800',
            color: carvePercent >= 1 ? '#fff' : '#8a6030',
            cursor: carvePercent >= 1 ? 'pointer' : 'not-allowed',
            fontSize: 14,
            fontWeight: 'bold',
          }}
        >
          Finish Carving
        </button>
      </div>
    </div>
  );
};
