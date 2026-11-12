import { BossAct, bossAbility } from '../core/bosses';
import { CHARGE, isFaded } from '../core/behaviours';
import type { Enemy } from '../core/enemies';
import { config } from '../data/config';

/**
 * What a pixel enemy is doing, for the frames it shows (death is played apart, by the corpse the render leaves).
 * `attack` is the bite or swing of an enemy that has reached the hero (a loop while it stays in reach); `strike` is
 * the blow of a special act (a boss's ability, a leap landing, a throw).
 */
export type EnemyPose = 'walk' | 'windup' | 'strike' | 'death' | 'attack';

/** Frames per pose and speed, for an enemy whose sheets are `<sprite>.<pose>` (PixelLab, one strip per pose). */
export interface EnemyAnim {
  /** Frame size in texture px (art px x ART_RES). */
  w: number;
  h: number;
  /** Frames per pose; a pose it lacks is shown as the walk (the crowd has a walk only). */
  frames: Partial<Record<EnemyPose, number>> & { walk: number };
  /** Frames per second of the timed poses (walk and attack, and strike or death when they have no progress to follow). */
  fps: Record<EnemyPose, number>;
  /** Hop height in art px of a walker's step, synced to the walk strip (0: the strip carries the whole motion). */
  bob: number;
}

/**
 * `frames`: walk, windup, strike, death, attack (0 or left out: the pose has no strip). Sizes are art px; strips are
 * at ART_RES. `bob` is the step's hop in art px.
 */
const anim = (
  w: number,
  h: number,
  frames: [number, number?, number?, number?, number?],
  walkFps = 8,
  bob = 0,
  attackFps = 10,
): EnemyAnim => ({
  w: w * 2,
  h: h * 2,
  frames: {
    walk: frames[0],
    ...(frames[1] ? { windup: frames[1] } : {}),
    ...(frames[2] ? { strike: frames[2] } : {}),
    ...(frames[3] ? { death: frames[3] } : {}),
    ...(frames[4] ? { attack: frames[4] } : {}),
  },
  fps: { walk: walkFps, windup: 8, strike: 12, death: 8, attack: attackFps },
  bob,
});

/** Enemies with state animations, by sprite key (bosses and elites first; the crowd follows). */
export const ENEMY_ANIMS: Record<string, EnemyAnim> = {
  'enemy.blackKnight': anim(128, 160, [7, 7, 4, 7, 6]),
  'enemy.spiderMother': anim(160, 112, [7, 9, 4, 9, 6]),
  'enemy.oldWolf': anim(160, 128, [7, 9, 6, 7, 6]),
  'enemy.golem': anim(96, 112, [7, 9, 5, 9]),
  'enemy.witch': anim(96, 112, [7, 5, 5, 7, 6]),
  'enemy.gravedigger': anim(88, 96, [7, 7, 5, 7, 6]),
  'enemy.bellRinger': anim(95, 102, [7, 7, 5, 7, 6]),
  // The crowd: walk, attack (the bite or swing at contact) and, where the behaviour has one, windup and strike.
  // [walk, windup, strike, death, attack]; then walk fps, step hop (art px) and attack fps. Sizes are the final display size.
  'enemy.bat': anim(32, 32, [5, 0, 0, 0, 6], 12, 0, 12),
  'enemy.rat': anim(40, 32, [6, 0, 0, 0, 6], 9, 1),
  'enemy.graveRat': anim(36, 32, [6, 0, 0, 0, 6], 9, 1),
  'enemy.spider': anim(40, 32, [6, 0, 0, 0, 6], 9),
  'enemy.spiderEgg': anim(32, 32, [5], 6),
  'enemy.spiderNest': anim(64, 56, [5], 6),
  'enemy.thiefRat': anim(44, 36, [5], 10, 1),
  'enemy.crow': anim(40, 32, [5, 6, 6, 0, 6], 12),
  'enemy.frostWolf': anim(64, 48, [5, 0, 0, 0, 6], 10, 1),
  'enemy.hooded': anim(56, 64, [6, 0, 0, 0, 6], 9, 1),
  'enemy.goblin': anim(56, 56, [5, 3, 6, 0, 6], 8, 1),
  'enemy.frostBoar': anim(72, 56, [5, 6, 0, 0, 6], 10, 1),
  'enemy.warBanner': anim(48, 80, [6], 5),
  // Cripta crowd (older art, kept at its own scale in SPRITE_SCALE): the walk added in 2026-11.
  'enemy.bones': anim(44, 61, [5, 0, 0, 0, 6], 8, 1),
  'enemy.skeleton': anim(68, 76, [6, 0, 0, 0, 6], 8, 1),
  'enemy.emberBones': anim(35, 63, [6, 0, 0, 0, 6], 9, 1),
  'enemy.ghost': anim(40, 44, [5, 0, 0, 0, 6], 6),
  'enemy.ghostDark': anim(40, 44, [5, 0, 0, 0, 6], 10),
  'enemy.coldSpirit': anim(50, 59, [5, 4, 6, 0, 6], 6),
  'enemy.slime': anim(56, 48, [5, 0, 0, 0, 6], 6, 2),
  'enemy.vampireBat': anim(40, 40, [6], 12),
};

/** How far through a thrower's or digger's windup the throw or the blow begins. */
const SWING_AT = 0.7;

/** Extra px around the contact range inside which an enemy already shows its attack (the crowd presses to ~0). */
const REACH_MARGIN = 6;

/** Texture key of one pose's strip. */
export const poseKey = (sprite: string, pose: EnemyPose): string => `${sprite}.${pose}`;

/** The poses an enemy has strips for: its walk, plus the others only when it declares them. */
export function declaredPoses(a: EnemyAnim): EnemyPose[] {
  return (['walk', 'windup', 'strike', 'death', 'attack'] as const).filter((p) => a.frames[p] !== undefined);
}

/**
 * What an enemy shows now. `k` is how far through the pose it is (0 to 1) when the core knows it (a windup counts
 * down its timer, a leap its air time), or -1 when the render keeps the time itself (a strike, the walk).
 */
export function enemyPose(
  e: Enemy,
  a: EnemyAnim,
  near = false,
): { pose: Exclude<EnemyPose, 'death'>; k: number } {
  const def = e.def;
  if (a.frames.windup && e.act === BossAct.Windup) {
    const total =
      def.shoot?.windup ??
      def.dig?.windup ??
      def.leap?.windup ??
      (def.move === 'charge' ? (def.charge ?? CHARGE).windup : undefined) ??
      bossAbility(e)?.windup ??
      0;
    const k = total > 0 ? Math.min(1, Math.max(0, 1 - e.actT / total)) : 0;
    // A thrower or a digger has no strike phase of its own: the last of its windup is the throw or the blow.
    if ((def.shoot || def.dig) && a.frames.strike && k >= SWING_AT)
      return { pose: 'strike', k: (k - SWING_AT) / (1 - SWING_AT) };
    return { pose: 'windup', k: def.shoot || def.dig ? k / SWING_AT : k };
  }
  if (a.frames.strike && e.act === BossAct.Active && (def.boss || def.leap))
    return { pose: 'strike', k: def.leap ? Math.min(1, Math.max(0, 1 - e.actT / def.leap.air)) : -1 };
  // A charger's dash: the strike strip follows the dash time.
  if (a.frames.strike && e.act === BossAct.Active && def.move === 'charge')
    return { pose: 'strike', k: Math.min(1, Math.max(0, 1 - e.actT / (def.charge ?? CHARGE).dash)) };
  // In reach of the hero and not in a special act: the bite or swing, on a loop while it stays (the core hurts the
  // hero by contact alone; this is how it looks).
  if (near && a.frames.attack && e.act === BossAct.Idle && e.def.damage > 0 && e.stun <= 0 && !isFaded(e))
    return { pose: 'attack', k: -1 };
  return { pose: 'walk', k: -1 };
}

/** True when `e` touches the hero at (px, py) closely enough to show its attack (contact range plus a margin). */
export function inReach(e: Enemy, px: number, py: number): boolean {
  const r = e.def.radius + config.player.radius + REACH_MARGIN;
  const dx = px - e.x;
  const dy = py - e.y;
  return dx * dx + dy * dy < r * r;
}

/** The frame of a pose: by progress `k` when known, else by `seconds` in the pose (looping the walk only). */
export function poseFrame(a: EnemyAnim, pose: EnemyPose, k: number, seconds: number): number {
  const n = a.frames[pose] ?? a.frames.walk;
  if (k >= 0) return Math.min(n - 1, Math.floor(k * n));
  const f = Math.floor(seconds * a.fps[pose]);
  return pose === 'walk' || pose === 'attack' ? f % n : Math.min(n - 1, f);
}
