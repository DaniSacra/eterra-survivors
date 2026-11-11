import { BossAct, bossAbility } from '../core/bosses';
import type { Enemy } from '../core/enemies';

/** What a pixel enemy is doing, for the frames it shows (death is played apart, by the corpse the render leaves). */
export type EnemyPose = 'walk' | 'windup' | 'strike' | 'death';

/** Frames per pose and speed, for an enemy whose sheets are `<sprite>.<pose>` (PixelLab, one strip per pose). */
export interface EnemyAnim {
  /** Frame size in texture px (art px x ART_RES). */
  w: number;
  h: number;
  /** Frames per pose; a pose it lacks is shown as the walk (the crowd has a walk only). */
  frames: Partial<Record<EnemyPose, number>> & { walk: number };
  /** Frames per second of the timed poses (walk, and strike or death when they have no progress to follow). */
  fps: Record<EnemyPose, number>;
}

/** `frames`: walk, windup, strike, death (or walk alone for the crowd). Sizes are art px; strips are at ART_RES. */
const anim = (w: number, h: number, frames: [number, number?, number?, number?], walkFps = 8): EnemyAnim => ({
  w: w * 2,
  h: h * 2,
  frames: {
    walk: frames[0],
    ...(frames[1]
      ? { windup: frames[1], strike: frames[2] ?? frames[1], death: frames[3] ?? frames[1] }
      : {}),
  },
  fps: { walk: walkFps, windup: 8, strike: 12, death: 8 },
});

/** Enemies with state animations, by sprite key (bosses and elites first; the crowd follows). */
export const ENEMY_ANIMS: Record<string, EnemyAnim> = {
  'enemy.blackKnight': anim(128, 160, [7, 7, 4, 7]),
  'enemy.spiderMother': anim(160, 112, [7, 9, 4, 9]),
  'enemy.oldWolf': anim(160, 128, [7, 9, 6, 7]),
  'enemy.golem': anim(96, 112, [7, 9, 5, 9]),
  'enemy.witch': anim(96, 112, [7, 5, 5, 7]),
  // The crowd: a walk only (the still is its first frame). Sizes are the final display size, scale 1.
  'enemy.bat': anim(32, 32, [5], 12),
  'enemy.rat': anim(40, 32, [5]),
  'enemy.graveRat': anim(36, 32, [5]),
  'enemy.spider': anim(40, 32, [5]),
  'enemy.spiderEgg': anim(32, 32, [5], 6),
  'enemy.spiderNest': anim(64, 56, [5], 6),
  'enemy.thiefRat': anim(44, 36, [5], 10),
  'enemy.crow': anim(40, 32, [5], 12),
  'enemy.frostWolf': anim(64, 48, [5], 10),
  'enemy.hooded': anim(56, 64, [5]),
  'enemy.goblin': anim(56, 56, [5]),
  'enemy.frostBoar': anim(72, 56, [5], 10),
  'enemy.warBanner': anim(48, 80, [5], 5),
  // Cripta crowd (older art, kept at its own scale in SPRITE_SCALE): the walk added in 2026-11.
  'enemy.bones': anim(44, 61, [5]),
  'enemy.skeleton': anim(54, 62, [5]),
  'enemy.emberBones': anim(35, 63, [5]),
  'enemy.ghost': anim(56, 61, [5], 6),
  'enemy.coldSpirit': anim(50, 59, [5], 6),
  'enemy.slime': anim(58, 48, [5], 6),
  'enemy.vampireBat': anim(58, 56, [5], 12),
};

/** How far through a thrower's or digger's windup the throw or the blow begins. */
const SWING_AT = 0.7;

/** Texture key of one pose's strip. */
export const poseKey = (sprite: string, pose: EnemyPose): string => `${sprite}.${pose}`;

/**
 * What an enemy shows now. `k` is how far through the pose it is (0 to 1) when the core knows it (a windup counts
 * down its timer, a leap its air time), or -1 when the render keeps the time itself (a strike, the walk).
 */
export function enemyPose(e: Enemy, a: EnemyAnim): { pose: Exclude<EnemyPose, 'death'>; k: number } {
  const def = e.def;
  if (a.frames.windup && e.act === BossAct.Windup) {
    const total = def.shoot?.windup ?? def.dig?.windup ?? def.leap?.windup ?? bossAbility(e)?.windup ?? 0;
    const k = total > 0 ? Math.min(1, Math.max(0, 1 - e.actT / total)) : 0;
    // A thrower or a digger has no strike phase of its own: the last of its windup is the throw or the blow.
    if ((def.shoot || def.dig) && a.frames.strike && k >= SWING_AT)
      return { pose: 'strike', k: (k - SWING_AT) / (1 - SWING_AT) };
    return { pose: 'windup', k: def.shoot || def.dig ? k / SWING_AT : k };
  }
  if (a.frames.strike && e.act === BossAct.Active && (def.boss || def.leap))
    return { pose: 'strike', k: def.leap ? Math.min(1, Math.max(0, 1 - e.actT / def.leap.air)) : -1 };
  return { pose: 'walk', k: -1 };
}

/** The frame of a pose: by progress `k` when known, else by `seconds` in the pose (looping the walk only). */
export function poseFrame(a: EnemyAnim, pose: EnemyPose, k: number, seconds: number): number {
  const n = a.frames[pose] ?? a.frames.walk;
  if (k >= 0) return Math.min(n - 1, Math.floor(k * n));
  const f = Math.floor(seconds * a.fps[pose]);
  return pose === 'walk' ? f % n : Math.min(n - 1, f);
}
