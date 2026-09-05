/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  activatePower,
  createState,
  enterBranch,
  selectCrystal,
  step,
  type Input,
} from '../minigames/lava-leap/engine';
import { BRANCHES, COURSES, type CourseId } from '../minigames/lava-leap/courses';

const idle: Input = { left: false, right: false, jump: false, power: false };
const dt = 1 / 120;
function expedition(id: CourseId) {
  return enterBranch({ ...createState(), won: true, collected: [0, 2] }, id);
}

describe('Lava Leap deeper passages', () => {
  it.each(BRANCHES)('banks treasures and equips the %s passage power', (id) => {
    const s = expedition(id);
    expect(s.courseId).toBe(id);
    expect(s.bankedGems).toBe(2);
    expect(s.collected).toEqual([]);
    expect(s.crystal).toBe(COURSES[id].power);
    expect(s.earthUnlocked && s.windUnlocked).toBe(true);
    expect(s.won).toBe(false);
  });

  it.each(BRANCHES)('can complete %s using real movement without a rescue', (id) => {
    const s = expedition(id);
    const walk = (target: number) => {
      for (let i = 0; i < 2500 && s.x < target; i++) {
        const vent = COURSES[id].chutes.find((c) => c.x > s.x && c.x - s.x < 150);
        if (vent && s.sealedVent?.x !== vent.x) activatePower(s);
        step(s, { ...idle, right: true }, dt);
      }
      expect(s.x, `walk to ${target}`).toBeGreaterThanOrEqual(target);
      expect(s.rescues).toBe(0);
    };
    const jump = (target: number, wind = false) => {
      step(s, { ...idle, jump: true, right: true }, dt);
      let boosted = false;
      for (let i = 0; i < 600; i++) {
        const power = wind && !boosted && s.vy >= -30;
        if (power) boosted = true;
        step(s, { ...idle, right: s.x < target, power }, dt);
        if (s.grounded) break;
      }
      expect(s.rescues, `jump to ${target}`).toBe(0);
      expect(s.grounded).toBe(true);
      expect(s.x, `reach ${target}`).toBeGreaterThanOrEqual(target);
    };
    if (id === 'grotto') {
      walk(330);
      activatePower(s);
      jump(500);
      jump(660);
      walk(850);
      activatePower(s);
      jump(1000);
      jump(1140);
      walk(1320);
      activatePower(s);
      jump(1480);
      jump(1640);
      walk(1860);
      activatePower(s);
      jump(2010);
      walk(2050);
      jump(2200);
    } else if (id === 'heights') {
      walk(320);
      jump(590, true);
      walk(710);
      jump(1020, true);
      walk(1140);
      jump(1500, true);
      walk(1630);
      jump(1990, true);
      walk(2120);
      jump(2430, true);
    } else {
      walk(260);
      jump(410);
      walk(770);
      jump(940);
      walk(1340);
      jump(1510);
      walk(1920);
      jump(2100);
    }
    walk(COURSES[id].width - 139);
    expect(s.won).toBe(true);
    expect(s.rescues).toBe(0);
  });

  it('Earth protects against an erupting vent, expires and clears when switching', () => {
    const s = expedition('forge');
    s.x = 610;
    s.time = 5;
    expect(activatePower(s)).toBe(true);
    step(s, idle, dt);
    expect(s.rescues).toBe(0);
    s.x = 450;
    for (let i = 0; i < 480; i++) step(s, idle, dt);
    expect(s.sealedVent).toBeNull();
    expect(activatePower(s)).toBe(true);
    selectCrystal(s, 'frost');
    expect(s.sealedVent).toBeNull();
  });

  it('Earth must be unlocked and have a vent in range', () => {
    const s = createState();
    selectCrystal(s, 'earth');
    expect(s.crystal).toBe('frost');
    s.earthUnlocked = true;
    selectCrystal(s, 'earth');
    expect(activatePower(s)).toBe(false);
    expect(s.cooldown).toBe(0);
    expect(s.notice).toContain('closer');
  });
});
