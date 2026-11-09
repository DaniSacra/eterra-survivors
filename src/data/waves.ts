import type { EnemyId } from './enemies';

/** A wave segment runs from `from` (seconds) until the next segment starts. */
export interface WaveSegment {
  from: number;
  /** Seconds between spawn batches. */
  interval: number;
  batch: number;
  /** Multiplies enemy max HP. */
  hpMult: number;
  /** Multiplies the contact damage of every enemy on the field while this segment runs. */
  damage: number;
  enemies: { id: EnemyId; weight: number }[];
}

/** Each stage fills three roles with its own cast. */
export interface Roles {
  /** The common walker. */
  basic: EnemyId;
  /** Quick and fragile. */
  fast: EnemyId;
  /** Slow and tough. */
  tank: EnemyId;
  /** Optional fourth one with a way of moving of its own, mixed in from the third minute. */
  extra?: EnemyId;
}
type Role = keyof Roles;

/** The 10-minute curve shared by every stage, by role: [from, interval, batch, hpMult, damage, weights]. */
const CURVE: [number, number, number, number, number, Partial<Record<Role, number>>][] = [
  [0, 1.5, 1, 1, 1, { basic: 1 }],
  [30, 1.2, 2, 1, 1, { basic: 3, fast: 1 }],
  [60, 1, 2, 1.1, 1, { basic: 2, fast: 2 }],
  [120, 1, 3, 1.6, 1.2, { basic: 3, fast: 2, tank: 1, extra: 1 }],
  [180, 0.9, 4, 2.4, 1.4, { basic: 3, fast: 3, tank: 1, extra: 1 }],
  [240, 0.8, 6, 3.4, 1.8, { basic: 2, fast: 3, tank: 2, extra: 1 }],
  [300, 0.7, 7, 4.2, 2.1, { basic: 3, fast: 2, tank: 2, extra: 1 }],
  [390, 0.6, 9, 6.5, 3.2, { basic: 2, fast: 3, tank: 2, extra: 2 }],
  [480, 0.55, 9, 10, 4.3, { basic: 3, fast: 2, tank: 3, extra: 1 }],
  [540, 0.5, 10, 12, 4.8, { basic: 2, fast: 3, tank: 3, extra: 2 }],
  // The boss fight: a trickle of escorts.
  [600, 2, 3, 12.5, 4.8, { basic: 1 }],
];

/** The wave list of a stage: the shared curve with the stage's cast in each role. */
export function buildWaves(roles: Roles): WaveSegment[] {
  return CURVE.map(([from, interval, batch, hpMult, damage, weights]) => ({
    from,
    interval,
    batch,
    hpMult,
    damage,
    enemies: (Object.keys(weights) as Role[])
      .filter((r) => roles[r])
      .map((r) => ({ id: roles[r] as EnemyId, weight: weights[r] as number })),
  }));
}
