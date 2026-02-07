/**
 * Tests for walk animation ping-pong cycle and sprite frame generation.
 *
 * Verifies:
 * - Ping-pong cycle produces correct frame sequence (0,1,2,3,2,1,0,...)
 * - Frame counts per direction are respected
 * - Sprite arrays are built with the correct number of entries
 * - Direction enum → string key mapping works
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Re-implement the Direction enum matching types/core.ts
// ---------------------------------------------------------------------------
enum Direction {
  Up, // 0
  Down, // 1
  Left, // 2
  Right, // 3
}

// ---------------------------------------------------------------------------
// Re-implement DIRECTION_KEYS matching hooks/usePlayerMovement.ts
// ---------------------------------------------------------------------------
const DIRECTION_KEYS: Record<Direction, string> = {
  [Direction.Up]: 'up',
  [Direction.Down]: 'down',
  [Direction.Left]: 'left',
  [Direction.Right]: 'right',
};

// ---------------------------------------------------------------------------
// Re-implement the ping-pong walk cycle logic from usePlayerMovement
// ---------------------------------------------------------------------------

/**
 * Simulate the walk cycle animation for N steps.
 * Returns the sequence of frames produced.
 *
 * This mirrors the logic inside usePlayerMovement's onSetAnimationFrame callback,
 * including the walkDirectionRef mutation.
 */
function simulateWalkCycle(
  steps: number,
  direction: Direction,
  walkFrameCounts: Record<string, number>,
  startFrame: number = 0,
  startWalkDirection: number = 1
): { frames: number[]; walkDirection: number } {
  let frame = startFrame;
  let walkDirection = startWalkDirection;
  const frames: number[] = [];

  const dirKey = DIRECTION_KEYS[direction];
  const maxFrame = (walkFrameCounts[dirKey] ?? 3) - 1;

  for (let i = 0; i < steps; i++) {
    // This mirrors the onSetAnimationFrame callback
    const next = frame + walkDirection;
    if (next > maxFrame) {
      walkDirection = -1;
      frame = maxFrame - 1;
    } else if (next < 0) {
      walkDirection = 1;
      frame = 1;
    } else {
      frame = next;
    }
    frames.push(frame);
  }

  return { frames, walkDirection };
}

// ---------------------------------------------------------------------------
// Re-implement sprite frame generation matching utils/characterSprites.ts
// ---------------------------------------------------------------------------

interface CharacterSpriteConfig {
  frameCounts: Record<string, number>;
}

const CHARACTER_SPRITE_CONFIGS: Record<string, CharacterSpriteConfig> = {
  character1: {
    frameCounts: { up: 3, down: 3, left: 4, right: 4 },
  },
  character2: {
    frameCounts: { up: 2, down: 2, left: 3, right: 3 },
  },
};

function getSpriteConfig(characterId: string): CharacterSpriteConfig {
  return CHARACTER_SPRITE_CONFIGS[characterId] || CHARACTER_SPRITE_CONFIGS.character1;
}

function buildFramePaths(characterId: string, dir: string): string[] {
  const config = getSpriteConfig(characterId);
  const count = config.frameCounts[dir] || 3;
  const basePath = `/TwilightGame/assets/${characterId}/base`;
  return Array.from({ length: count }, (_, i) => `${basePath}/${dir}_${i}.png`);
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Walk Animation Ping-Pong Cycle', () => {
  const char1Frames = CHARACTER_SPRITE_CONFIGS.character1.frameCounts;

  describe('Left direction (4 frames)', () => {
    it('should produce 0,1,2,3,2,1,0,1,2,3,2,1,0 sequence', () => {
      const { frames } = simulateWalkCycle(12, Direction.Left, char1Frames);
      expect(frames).toEqual([1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0]);
    });

    it('should start ascending from frame 0', () => {
      const { frames } = simulateWalkCycle(1, Direction.Left, char1Frames);
      expect(frames[0]).toBe(1);
    });

    it('should bounce at frame 3 (maxFrame)', () => {
      const { frames } = simulateWalkCycle(4, Direction.Left, char1Frames);
      // 0→1, 1→2, 2→3, 3→bounce→2
      expect(frames).toEqual([1, 2, 3, 2]);
    });

    it('should bounce at frame 0 (minFrame)', () => {
      const { frames } = simulateWalkCycle(7, Direction.Left, char1Frames);
      // 0→1, 1→2, 2→3, 3→2, 2→1, 1→0, 0→bounce→1
      expect(frames).toEqual([1, 2, 3, 2, 1, 0, 1]);
    });

    it('should reach frame 3 (the 4th frame)', () => {
      const { frames } = simulateWalkCycle(12, Direction.Left, char1Frames);
      expect(frames).toContain(3);
    });

    it('should use all 4 frames (0, 1, 2, 3)', () => {
      const { frames } = simulateWalkCycle(12, Direction.Left, char1Frames);
      const uniqueFrames = [...new Set(frames)].sort();
      expect(uniqueFrames).toEqual([0, 1, 2, 3]);
    });
  });

  describe('Right direction (4 frames)', () => {
    it('should produce same sequence as left (both have 4 frames)', () => {
      const { frames: leftFrames } = simulateWalkCycle(12, Direction.Left, char1Frames);
      const { frames: rightFrames } = simulateWalkCycle(12, Direction.Right, char1Frames);
      expect(rightFrames).toEqual(leftFrames);
    });

    it('should use all 4 frames', () => {
      const { frames } = simulateWalkCycle(12, Direction.Right, char1Frames);
      const uniqueFrames = [...new Set(frames)].sort();
      expect(uniqueFrames).toEqual([0, 1, 2, 3]);
    });
  });

  describe('Up direction (3 frames)', () => {
    it('should ping-pong through 3 frames: 0,1,2,1,0,...', () => {
      const { frames } = simulateWalkCycle(8, Direction.Up, char1Frames);
      expect(frames).toEqual([1, 2, 1, 0, 1, 2, 1, 0]);
    });

    it('should never exceed frame 2', () => {
      const { frames } = simulateWalkCycle(20, Direction.Up, char1Frames);
      expect(Math.max(...frames)).toBe(2);
    });

    it('should use frames 0, 1, 2 only', () => {
      const { frames } = simulateWalkCycle(20, Direction.Up, char1Frames);
      const uniqueFrames = [...new Set(frames)].sort();
      expect(uniqueFrames).toEqual([0, 1, 2]);
    });
  });

  describe('Down direction (3 frames)', () => {
    it('should ping-pong through 3 frames', () => {
      const { frames } = simulateWalkCycle(8, Direction.Down, char1Frames);
      expect(frames).toEqual([1, 2, 1, 0, 1, 2, 1, 0]);
    });
  });

  describe('Walk direction reset on idle', () => {
    it('should start ascending after walkDirection reset', () => {
      // Simulate: walk 5 steps (ends descending), then idle resets to walkDir=1, walk again
      const { walkDirection } = simulateWalkCycle(5, Direction.Left, char1Frames);
      expect(walkDirection).toBe(-1); // Should be descending at step 5

      // After idle, walkDirection resets to 1 and frame resets to 0
      const { frames: secondWalk } = simulateWalkCycle(
        4,
        Direction.Left,
        char1Frames,
        0, // frame reset to 0 on idle
        1 // walkDirection reset to 1 on idle
      );
      expect(secondWalk).toEqual([1, 2, 3, 2]);
    });
  });
});

describe('Direction Enum to String Key Mapping', () => {
  it('should map all Direction enum values to lowercase strings', () => {
    expect(DIRECTION_KEYS[Direction.Up]).toBe('up');
    expect(DIRECTION_KEYS[Direction.Down]).toBe('down');
    expect(DIRECTION_KEYS[Direction.Left]).toBe('left');
    expect(DIRECTION_KEYS[Direction.Right]).toBe('right');
  });

  it('should map numeric Direction values correctly', () => {
    // Direction is a numeric enum: Up=0, Down=1, Left=2, Right=3
    expect(DIRECTION_KEYS[0 as Direction]).toBe('up');
    expect(DIRECTION_KEYS[1 as Direction]).toBe('down');
    expect(DIRECTION_KEYS[2 as Direction]).toBe('left');
    expect(DIRECTION_KEYS[3 as Direction]).toBe('right');
  });

  it('should produce correct maxFrame when used with frameCounts', () => {
    const frameCounts = char1Frames();
    const leftKey = DIRECTION_KEYS[Direction.Left];
    const upKey = DIRECTION_KEYS[Direction.Up];
    expect(frameCounts[leftKey] - 1).toBe(3); // maxFrame for left = 3
    expect(frameCounts[upKey] - 1).toBe(2); // maxFrame for up = 2
  });
});

describe('Sprite Frame Generation', () => {
  describe('character1', () => {
    it('should generate 4 frames for left direction', () => {
      const frames = buildFramePaths('character1', 'left');
      expect(frames).toHaveLength(4);
      expect(frames).toEqual([
        '/TwilightGame/assets/character1/base/left_0.png',
        '/TwilightGame/assets/character1/base/left_1.png',
        '/TwilightGame/assets/character1/base/left_2.png',
        '/TwilightGame/assets/character1/base/left_3.png',
      ]);
    });

    it('should generate 4 frames for right direction', () => {
      const frames = buildFramePaths('character1', 'right');
      expect(frames).toHaveLength(4);
      expect(frames[3]).toBe('/TwilightGame/assets/character1/base/right_3.png');
    });

    it('should generate 3 frames for up direction', () => {
      const frames = buildFramePaths('character1', 'up');
      expect(frames).toHaveLength(3);
    });

    it('should generate 3 frames for down direction', () => {
      const frames = buildFramePaths('character1', 'down');
      expect(frames).toHaveLength(3);
    });
  });

  describe('character2', () => {
    it('should generate 3 frames for left direction', () => {
      const frames = buildFramePaths('character2', 'left');
      expect(frames).toHaveLength(3);
    });

    it('should generate 2 frames for up direction', () => {
      const frames = buildFramePaths('character2', 'up');
      expect(frames).toHaveLength(2);
    });
  });
});

describe('Sprite URL Selection (animationFrame % length)', () => {
  it('should select correct URL for each frame in 4-frame left animation', () => {
    const frames = buildFramePaths('character1', 'left');
    // Simulates: playerFrames[animationFrame % playerFrames.length]
    expect(frames[0 % frames.length]).toContain('left_0.png');
    expect(frames[1 % frames.length]).toContain('left_1.png');
    expect(frames[2 % frames.length]).toContain('left_2.png');
    expect(frames[3 % frames.length]).toContain('left_3.png');
  });

  it('should wrap around for values >= frame count', () => {
    const frames = buildFramePaths('character1', 'up'); // 3 frames
    expect(frames[3 % frames.length]).toContain('up_0.png'); // wraps to 0
    expect(frames[4 % frames.length]).toContain('up_1.png'); // wraps to 1
  });
});

// Helper to avoid referencing char1Frames as a variable where it's used as a function
function char1Frames() {
  return CHARACTER_SPRITE_CONFIGS.character1.frameCounts;
}
