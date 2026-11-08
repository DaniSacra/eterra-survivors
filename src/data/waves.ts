import type { EnemyId } from './enemies';

/** A wave segment runs from `from` (seconds) until the next segment starts. */
export interface WaveSegment {
  from: number;
  /** Seconds between spawn batches. */
  interval: number;
  batch: number;
  /** Multiplies enemy max HP. */
  hpMult: number;
  enemies: { id: EnemyId; weight: number }[];
}

export const WAVES: WaveSegment[] = [
  { from: 0, interval: 1.2, batch: 2, hpMult: 1, enemies: [{ id: 'skeleton', weight: 1 }] },
  {
    from: 30,
    interval: 1,
    batch: 3,
    hpMult: 1,
    enemies: [
      { id: 'skeleton', weight: 3 },
      { id: 'spider', weight: 1 },
    ],
  },
  {
    from: 60,
    interval: 0.9,
    batch: 4,
    hpMult: 1.1,
    enemies: [
      { id: 'skeleton', weight: 2 },
      { id: 'spider', weight: 2 },
    ],
  },
  {
    from: 120,
    interval: 0.8,
    batch: 5,
    hpMult: 1.3,
    enemies: [
      { id: 'skeleton', weight: 3 },
      { id: 'spider', weight: 2 },
      { id: 'slime', weight: 1 },
    ],
  },
  {
    from: 180,
    interval: 0.7,
    batch: 6,
    hpMult: 1.6,
    enemies: [
      { id: 'skeleton', weight: 3 },
      { id: 'spider', weight: 3 },
      { id: 'slime', weight: 1 },
    ],
  },
  {
    from: 240,
    interval: 0.6,
    batch: 7,
    hpMult: 2,
    enemies: [
      { id: 'spider', weight: 3 },
      { id: 'slime', weight: 2 },
    ],
  },
  {
    from: 300,
    interval: 0.5,
    batch: 8,
    hpMult: 2.4,
    enemies: [
      { id: 'skeleton', weight: 3 },
      { id: 'spider', weight: 2 },
      { id: 'slime', weight: 2 },
    ],
  },
  {
    from: 390,
    interval: 0.45,
    batch: 10,
    hpMult: 3,
    enemies: [
      { id: 'skeleton', weight: 2 },
      { id: 'spider', weight: 3 },
      { id: 'slime', weight: 2 },
    ],
  },
  {
    from: 480,
    interval: 0.4,
    batch: 12,
    hpMult: 3.8,
    enemies: [
      { id: 'skeleton', weight: 3 },
      { id: 'spider', weight: 2 },
      { id: 'slime', weight: 3 },
    ],
  },
  {
    from: 540,
    interval: 0.35,
    batch: 14,
    hpMult: 4.5,
    enemies: [
      { id: 'skeleton', weight: 2 },
      { id: 'spider', weight: 3 },
      { id: 'slime', weight: 3 },
    ],
  },
  // The boss fight: a trickle of escorts.
  { from: 600, interval: 2, batch: 4, hpMult: 4.5, enemies: [{ id: 'skeleton', weight: 1 }] },
];

export const BOSS: { id: EnemyId; at: number } = { id: 'blackKnight', at: 600 };
