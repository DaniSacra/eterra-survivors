import type { EnemyId } from '../data/enemies';
import type { World } from './world';

/**
 * The basics a new player is told once, in this order of priority (shown as short tips, never blocking). `charges`
 * is not picked by `nextLesson`: the level-up screen teaches Trocar, Pular and Banir on the second run (PX-09).
 */
export const LESSON_IDS = ['move', 'auto', 'gems', 'life', 'elite', 'boss', 'charges'] as const;
export type LessonId = (typeof LESSON_IDS)[number];
/** The lessons `nextLesson` can pick (`charges` is taught by its own screen). */
export type CoachLesson = Exclude<LessonId, 'charges'>;

/** Seconds between two lessons, and how long into the run each one may start. */
export const LESSON_GAP = 7;
/** The hero must have walked less than this (px) from the start for the "move" lesson to show. */
export const MOVE_DONE = 40;
/** The "boss" lesson shows this many seconds into the run (the boss comes much later). */
export const BOSS_LESSON_AT = 120;
/** A gem this close (px) to the hero is "on screen" for the "gems" lesson. */
export const GEM_RANGE = 420;
/** Below this share of max life the "life" lesson shows. */
export const LIFE_SHARE = 0.75;

/**
 * The next lesson to show, or null. `seen` holds the lessons already taught (kept in the save, never repeated).
 * Pure and allocation-free; the render layer decides the wording and when to call it.
 */
export function nextLesson(world: World, seen: ReadonlySet<LessonId>): CoachLesson | null {
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
  if (!seen.has('elite') && eliteOnField(world)) return 'elite';
  if (!seen.has('boss') && !world.boss && t >= BOSS_LESSON_AT) return 'boss';
  return null;
}

/** The first elite alive on the field (its enemy id), or null. The lesson names it. */
export function eliteOnField(world: World): EnemyId | null {
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e && !e.dead && e.def.elite) return e.type;
  }
  return null;
}
