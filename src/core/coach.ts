import type { World } from './world';

/** The basics a new player is told once, in this order of priority (shown as short tips, never blocking). */
export const LESSON_IDS = ['move', 'auto', 'gems', 'life'] as const;
export type LessonId = (typeof LESSON_IDS)[number];

/** Seconds between two lessons, and how long into the run each one may start. */
export const LESSON_GAP = 7;
/** The hero must have walked less than this (px) from the start for the "move" lesson to show. */
export const MOVE_DONE = 40;
/** A gem this close (px) to the hero is "on screen" for the "gems" lesson. */
export const GEM_RANGE = 420;
/** Below this share of max life the "life" lesson shows. */
export const LIFE_SHARE = 0.75;

/**
 * The next lesson to show, or null. `seen` holds the lessons already taught (kept in the save, never repeated).
 * Pure and allocation-free; the render layer decides the wording and when to call it.
 */
export function nextLesson(world: World, seen: ReadonlySet<LessonId>): LessonId | null {
  const p = world.player;
  const t = world.time;
  if (!seen.has('move') && t >= 1.5 && p.x * p.x + p.y * p.y < MOVE_DONE * MOVE_DONE) return 'move';
  if (!seen.has('auto') && t >= 5 && world.tally.attacks > 0) return 'auto';
  if (!seen.has('gems') && t >= 3) {
    const gems = world.gems.active;
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i];
      if (g && (g.x - p.x) ** 2 + (g.y - p.y) ** 2 <= GEM_RANGE * GEM_RANGE) return 'gems';
    }
  }
  if (!seen.has('life') && p.hp > 0 && p.hp < p.stats.maxHp * LIFE_SHARE) return 'life';
  return null;
}
