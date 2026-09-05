export interface Platform {
  x: number;
  y: number;
  w: number;
}
export type CourseId = 'lava' | 'grotto' | 'heights' | 'forge';
export interface Course {
  id: CourseId;
  name: string;
  description: string;
  power: 'frost' | 'wind' | 'earth';
  width: number;
  platforms: Platform[];
  checkpoints: number[];
  gems: { x: number; y: number }[];
  chutes: { x: number; phase: number }[];
}
export const COURSES: Record<CourseId, Course> = {
  lava: {
    id: 'lava',
    name: 'Lava crossing',
    description: 'Learn Frost and Wind before choosing a deeper passage.',
    power: 'frost',
    width: 3900,
    platforms: [
      { x: 0, y: 410, w: 380 },
      { x: 650, y: 410, w: 330 },
      { x: 1130, y: 380, w: 320 },
      { x: 1650, y: 410, w: 370 },
      { x: 2180, y: 330, w: 180 },
      { x: 2520, y: 410, w: 300 },
      { x: 3060, y: 410, w: 150 },
      { x: 2990, y: 250, w: 160 },
      { x: 3430, y: 390, w: 470 },
    ],
    checkpoints: [80, 720, 1210, 1740, 2610, 3520],
    gems: [
      { x: 505, y: 380 },
      { x: 860, y: 345 },
      { x: 1280, y: 310 },
      { x: 1560, y: 320 },
      { x: 2270, y: 260 },
      { x: 2720, y: 340 },
      { x: 3070, y: 180 },
      { x: 3310, y: 350 },
    ],
    chutes: [
      { x: 1360, phase: 0 },
      { x: 2770, phase: 2.5 },
      { x: 3180, phase: 1 },
    ],
  },
  grotto: {
    id: 'grotto',
    name: 'Crystal Grotto',
    description: 'Cool stepping stones across the deep pools. Follow the crystal shore.',
    power: 'frost',
    width: 2600,
    platforms: [
      { x: 0, y: 410, w: 360 },
      { x: 650, y: 410, w: 230 },
      { x: 1130, y: 390, w: 220 },
      { x: 1620, y: 410, w: 270 },
      { x: 2180, y: 410, w: 420 },
    ],
    checkpoints: [80, 700, 1180, 1690, 2290],
    gems: [
      { x: 510, y: 380 },
      { x: 760, y: 345 },
      { x: 1000, y: 370 },
      { x: 1240, y: 310 },
      { x: 1480, y: 380 },
      { x: 2000, y: 380 },
    ],
    chutes: [],
  },
  heights: {
    id: 'heights',
    name: 'Mushroom Heights',
    description: 'Lift and glide between ancient columns above the glowing mushrooms.',
    power: 'wind',
    width: 2700,
    platforms: [
      { x: 0, y: 410, w: 350 },
      { x: 550, y: 270, w: 190 },
      { x: 980, y: 190, w: 190 },
      { x: 1450, y: 280, w: 210 },
      { x: 1940, y: 210, w: 210 },
      { x: 2360, y: 390, w: 340 },
    ],
    checkpoints: [80, 590, 1020, 1500, 1990, 2430],
    gems: [
      { x: 450, y: 220 },
      { x: 660, y: 200 },
      { x: 1090, y: 120 },
      { x: 1540, y: 210 },
      { x: 2050, y: 140 },
      { x: 2260, y: 240 },
    ],
    chutes: [],
  },
  forge: {
    id: 'forge',
    name: 'Old Forge',
    description:
      'Use Earth near a vent to seal it for four seconds. Cross while its stone lid holds.',
    power: 'earth',
    width: 2700,
    platforms: [
      { x: 0, y: 410, w: 280 },
      { x: 400, y: 410, w: 390 },
      { x: 930, y: 380, w: 440 },
      { x: 1500, y: 410, w: 440 },
      { x: 2090, y: 410, w: 610 },
    ],
    checkpoints: [80, 450, 980, 1560, 2140],
    gems: [
      { x: 540, y: 340 },
      { x: 730, y: 340 },
      { x: 1090, y: 310 },
      { x: 1310, y: 310 },
      { x: 1820, y: 340 },
      { x: 2430, y: 340 },
    ],
    chutes: [
      { x: 610, phase: 0 },
      { x: 1140, phase: 2 },
      { x: 1690, phase: 4 },
      { x: 2300, phase: 1 },
    ],
  },
};
export const BRANCHES: CourseId[] = ['grotto', 'heights', 'forge'];
