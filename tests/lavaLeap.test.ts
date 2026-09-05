/** @vitest-environment node */
/** Guard real crossings, crystal limits, warning windows and loss-free retries. */
import { describe, expect, it } from 'vitest';
import {
  activatePower,
  CHUTES,
  chutePhase,
  createState,
  PLAYER,
  rescue,
  selectCrystal,
  step,
  type Input,
} from '../minigames/lava-leap/engine';

const idle: Input = { left: false, right: false, jump: false, power: false };
const dt = 1 / 120;

describe('Lava Leap', () => {
  it('creates a temporary landing surface and warns before a crystal switch removes it', () => {
    const s = createState(true);
    s.x = 350;
    expect(activatePower(s)).toBe(true);
    expect(activatePower(s)).toBe(false);
    const expiry = s.ice!.expires;
    selectCrystal(s, 'wind');
    expect(s.ice!.expires).toBeLessThan(expiry);
    expect(s.ice!.expires - s.time).toBe(1.5);
    for (let i = 0; i < 181; i++) step(s, idle, dt);
    expect(s.ice).toBeNull();
  });

  it('cannot select locked powers or use Wind repeatedly without landing', () => {
    const s = createState();
    selectCrystal(s, 'wind');
    expect(s.crystal).toBe('frost');
    s.windUnlocked = true;
    selectCrystal(s, 'wind');
    expect(activatePower(s)).toBe(true);
    s.cooldown = 0;
    expect(activatePower(s)).toBe(false);
    for (let i = 0; i < 500; i++) step(s, idle, dt);
    expect(s.grounded).toBe(true);
    expect(activatePower(s)).toBe(true);
  });

  it('rescues to solid ground without losing gems or unlocks', () => {
    const s = createState(true);
    s.checkpoint = 3;
    s.collected = [0, 2];
    s.x = 2100;
    s.y = 480;
    step(s, idle, dt);
    expect(s.x).toBe(1740);
    expect(s.y + PLAYER.h).toBe(410);
    expect(s.collected).toEqual([0, 2]);
    expect(s.windUnlocked).toBe(true);
    expect(s.rescues).toBe(1);
  });

  it('gives 1.3 seconds of warning before each 1.2 second eruption', () => {
    expect(chutePhase(3.49, 0)).toBe('quiet');
    expect(chutePhase(3.5, 0)).toBe('warning');
    expect(chutePhase(4.79, 0)).toBe('warning');
    expect(chutePhase(4.8, 0)).toBe('erupting');
    expect(chutePhase(6, 0)).toBe('quiet');
    const s = createState();
    s.x = 1350;
    s.y = 330;
    s.time = 5;
    step(s, idle, dt);
    expect(s.rescues).toBe(1);
  });

  it.each(['frost', 'wind'])(
    'allows a complete first-time crossing with the %s final route and no rescues',
    (route) => {
      const s = createState();
      const walk = (target: number) => {
        for (let i = 0; i < 3000 && s.x < target; i++) {
          const ahead = CHUTES.find((c) => c.x > s.x && c.x - s.x < 65);
          const wait =
            ahead &&
            (chutePhase(s.time, ahead.phase) !== 'quiet' ||
              chutePhase(s.time + 0.5, ahead.phase) !== 'quiet');
          step(s, { ...idle, right: !wait }, dt);
        }
        expect(s.x, `walk to ${target}`).toBeGreaterThanOrEqual(target);
      };
      const jump = (target: number, wind = false) => {
        // Start jumps during a quiet window if a chute is near the destination.
        const nearby = CHUTES.find((c) => c.x > s.x && c.x < target + 50);
        if (nearby)
          for (let i = 0; i < 720 && (s.time + nearby.phase) % 6 > 1; i++) step(s, idle, dt);
        step(s, { ...idle, jump: true, right: true }, dt);
        let boosted = false;
        for (let i = 0; i < 600; i++) {
          const power = wind && !boosted && s.vy >= -30;
          if (power) boosted = true;
          step(s, { ...idle, right: s.x < target, power }, dt);
          if (s.grounded) break;
        }
        expect(s.rescues, `jump to ${target}`).toBe(0);
        expect(s.grounded, `land at ${target}`).toBe(true);
        expect(s.x, `reach ${target}`).toBeGreaterThanOrEqual(target);
      };
      walk(350);
      activatePower(s);
      jump(520);
      jump(680);
      walk(965);
      jump(1135);
      walk(1420);
      activatePower(s);
      jump(1570);
      jump(1730);
      expect(s.windUnlocked).toBe(true);
      selectCrystal(s, 'wind');
      walk(1980);
      jump(2230, true);
      walk(2320);
      jump(2600, true);
      walk(2790);
      if (route === 'wind') {
        jump(3070, true);
        walk(3110);
        jump(3500, true);
      } else {
        selectCrystal(s, 'frost');
        activatePower(s);
        jump(2940);
        jump(3100);
        walk(3140);
        while ((s.time + 1) % 6 > 1) step(s, idle, dt);
        activatePower(s);
        jump(3300);
        jump(3460);
      }
      walk(3760);
      expect(s.won).toBe(true);
      expect(s.rescues).toBe(0);
      const x = s.x;
      step(s, { ...idle, right: true }, dt);
      expect(s.x).toBe(x);
    }
  );

  it('resets temporary powers at a checkpoint', () => {
    const s = createState(true);
    activatePower(s);
    selectCrystal(s, 'wind');
    s.glide = 2;
    rescue(s);
    expect(s.ice).toBeNull();
    expect(s.glide).toBe(0);
    expect(s.cooldown).toBe(0);
  });
});
