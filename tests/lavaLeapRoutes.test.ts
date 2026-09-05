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
import { isVentSealed, ventPhase } from '../minigames/lava-leap/vents';

const idle: Input = { left: false, right: false, jump: false, power: false };
const dt = 1 / 120;
function expedition(id: CourseId) {
  return enterBranch({ ...createState(), won: true, collected: [0, 2] }, id);
}

describe('Lava Leap deeper passages', () => {
  it('has four linked pressure groups with safe checkpoints outside every jet', () => {
    const course = COURSES.forge;
    expect(course.chutes).toHaveLength(12);
    expect(new Set(course.chutes.map((c) => c.pressureGroup)).size).toBe(4);
    for (const x of course.checkpoints) {
      expect(course.chutes.every((c) => x + 30 <= c.x - 18 || x >= c.x + 18)).toBe(true);
    }
  });

  it('seals the whole connected group, not unrelated chutes, then restores the danger', () => {
    const s = expedition('forge');
    s.x = 310;
    s.time = 8;
    activatePower(s);
    const course = COURSES.forge;
    expect(course.chutes.filter((c) => isVentSealed(course, c, s.sealedVent, s.time))).toHaveLength(
      3
    );
    for (const vent of course.chutes.slice(0, 3)) {
      expect(ventPhase(course, vent, s.sealedVent, 11.99)).toBe('quiet');
      expect(ventPhase(course, vent, s.sealedVent, 12)).toBe('erupting');
    }
    expect(ventPhase(course, course.chutes[3], s.sealedVent, 9)).toBe('erupting');
  });

  it.each([0, 2, 3.5, 5, 6, 12])(
    'cannot glide over an unsealed pressure jet at time %s',
    (time) => {
      const s = expedition('forge');
      s.x = 450;
      s.y = 30;
      s.time = time + 1.3;
      s.grounded = false;
      s.glide = 2;
      s.crystal = 'wind';
      step(s, idle, dt);
      expect(s.rescues).toBe(1);
    }
  );

  it('the first pressure warning ends before a player can reach the first jet', () => {
    const s = expedition('forge');
    for (let i = 0; i < 400 && !s.rescues; i++) step(s, { ...idle, right: true }, dt);
    expect(s.rescues).toBe(1);
    expect(s.won).toBe(false);
  });
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
        if (vent && !isVentSealed(COURSES[id], vent, s.sealedVent, s.time)) activatePower(s);
        const wait = vent && !isVentSealed(COURSES[id], vent, s.sealedVent, s.time);
        step(s, { ...idle, right: !wait }, dt);
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
      walk(780);
      jump(940);
      walk(1380);
      jump(1540);
    }
    walk(COURSES[id].width - 139);
    expect(s.won).toBe(true);
    expect(s.rescues).toBe(0);
  });

  it('Earth protects against an erupting vent, expires and clears when switching', () => {
    const s = expedition('forge');
    s.x = 450;
    s.time = 5;
    expect(activatePower(s)).toBe(true);
    step(s, idle, dt);
    expect(s.rescues).toBe(0);
    s.x = 310;
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
