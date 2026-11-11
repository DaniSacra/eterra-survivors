import { BossAct, bossAbility } from '../core/bosses';
import type { Enemy } from '../core/enemies';

/** What a pixel enemy is doing, for the frames it shows (death is played apart, by the corpse the render leaves). */
export type EnemyPose = 'walk' | 'windup' | 'strike' | 'death';

/** Frames per pose and speed, for an enemy whose sheets are `<sprite>.<pose>` (PixelLab, one strip per pose). */
export interface EnemyAnim {
  /** Frame size in texture px (art px x ART_RES). */
  w: number;
  h: number;
  frames: Record<EnemyPose, number>;
  /** Frames per second of the timed poses (walk, and strike or death when they have no progress to follow). */
  fps: Record<EnemyPose, number>;
}

const anim = (w: number, h: number, frames: [number, number, number, number]): EnemyAnim => ({
  w: w * 2,
  h: h * 2,
  frames: { walk: frames[0], windup: frames[1], strike: frames[2], death: frames[3] },
  fps: { walk: 8, windup: 8, strike: 12, death: 8 },
});

/** Enemies with state animations, by sprite key (bosses and elites first; the crowd follows). */
export const ENEMY_ANIMS: Record<string, EnemyAnim> = {
  'enemy.blackKnight': anim(128, 160, [7, 7, 4, 7]),
  'enemy.spiderMother': anim(160, 112, [7, 9, 4, 9]),
  'enemy.oldWolf': anim(160, 128, [7, 9, 6, 7]),
  'enemy.golem': anim(96, 112, [7, 9, 5, 9]),
  'enemy.witch': anim(96, 112, [7, 5, 5, 7]),
};

/** Texture key of one pose's strip. */
export const poseKey = (sprite: string, pose: EnemyPose): string => `${sprite}.${pose}`;

/**
 * What an enemy shows now. `k` is how far through the pose it is (0 to 1) when the core knows it (a windup counts
 * down its timer, a leap its air time), or -1 when the render keeps the time itself (a strike, the walk).
 */
export function enemyPose(e: Enemy): { pose: Exclude<EnemyPose, 'death'>; k: number } {
  const def = e.def;
  if (e.act === BossAct.Windup) {
    const total = def.shoot?.windup ?? def.leap?.windup ?? bossAbility(e)?.windup ?? 0;
    return { pose: 'windup', k: total > 0 ? Math.min(1, Math.max(0, 1 - e.actT / total)) : 0 };
  }
  if (e.act === BossAct.Active && (def.boss || def.leap))
    return { pose: 'strike', k: def.leap ? Math.min(1, Math.max(0, 1 - e.actT / def.leap.air)) : -1 };
  return { pose: 'walk', k: -1 };
}

/** The frame of a pose: by progress `k` when known, else by `seconds` in the pose (looping the walk only). */
export function poseFrame(a: EnemyAnim, pose: EnemyPose, k: number, seconds: number): number {
  const n = a.frames[pose];
  if (k >= 0) return Math.min(n - 1, Math.floor(k * n));
  const f = Math.floor(seconds * a.fps[pose]);
  return pose === 'walk' ? f % n : Math.min(n - 1, f);
}
