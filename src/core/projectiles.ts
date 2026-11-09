import { config } from '../data/config';
import { MAX_ENEMY_RADIUS } from '../data/enemies';
import { isFaded } from './behaviours';
import { damageEnemy, type Enemy } from './enemies';
import { addBolt } from './effects';
import { angleDiff } from './math';
import type { Poolable } from './pool';
import type { OwnedWeapon } from './weapons';
import type { World } from './world';

export interface Projectile extends Poolable {
  x: number;
  y: number;
  /** Heading in radians; velocity = speed * (cos, sin). */
  angle: number;
  speed: number;
  turnRate: number;
  damage: number;
  knockback: number;
  radius: number;
  pierce: number;
  ttl: number;
  /** Bursts on the first enemy it meets, hurting everything within this radius (0 = a plain hit). */
  blast: number;
  /** Chance of a critical hit, and its damage multiplier. */
  critChance: number;
  critMult: number;
  /** Asset key (one per weapon). */
  sprite: string;
  /** The weapon credited with its damage. */
  source: OwnedWeapon | null;
  target: Enemy | null;
  targetUid: number;
  /** Uids already hit, so a piercing shot doesn't hit the same enemy twice. */
  hits: number[];
  dead: boolean;
}

export const createProjectile = (): Projectile => ({
  poolIndex: -1,
  x: 0,
  y: 0,
  angle: 0,
  speed: 0,
  turnRate: 0,
  damage: 0,
  knockback: 0,
  radius: 0,
  pierce: 0,
  ttl: 0,
  blast: 0,
  critChance: 0,
  critMult: 1,
  sprite: '',
  source: null,
  target: null,
  targetUid: 0,
  hits: [],
  dead: false,
});

const alive = (e: Enemy | null, uid: number): e is Enemy =>
  !!e && e.uid === uid && !e.dead && e.poolIndex >= 0 && !isFaded(e);

/**
 * Nearest living, hittable enemy to (x, y) within `range`, skipping uids in `exclude` (faded ghosts can't be
 * hit, so they are never a target). Uses the spatial hash.
 */
export function nearestEnemy(
  world: World,
  x: number,
  y: number,
  range: number,
  exclude?: number[],
): Enemy | null {
  const list = world.enemies.active;
  const ids = world.enemyHash.query(x, y, range, world.scratch);
  let best: Enemy | null = null;
  let bestSq = range * range;
  for (let i = 0; i < ids.length; i++) {
    const e = list[ids[i] as number] as Enemy;
    if (e.dead || isFaded(e) || (exclude && exclude.includes(e.uid))) continue;
    const dx = e.x - x;
    const dy = e.y - y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestSq) {
      bestSq = dSq;
      best = e;
    }
  }
  return best;
}

/**
 * A random living enemy inside the rectangle of half-size (hw, hh) around the player (the visible area), not
 * in `exclude`. A few random probes of the active list (no allocation, no full scan); null when none hit.
 */
export function randomEnemyNear(world: World, hw: number, hh: number, exclude: number[]): Enemy | null {
  const list = world.enemies.active;
  if (list.length === 0) return null;
  const p = world.player;
  for (let tries = 0; tries < 12; tries++) {
    const e = list[world.rng.int(list.length)] as Enemy;
    if (e.dead || isFaded(e) || exclude.includes(e.uid)) continue;
    if (Math.abs(e.x - p.x) <= hw && Math.abs(e.y - p.y) <= hh) return e;
  }
  return null;
}

export function updateProjectiles(world: World, dt: number): void {
  const list = world.projectiles.active;
  const enemies = world.enemies.active;
  const near = world.scratch;
  for (let i = 0; i < list.length; i++) {
    const p = list[i] as Projectile;
    p.ttl -= dt;
    if (p.ttl <= 0) {
      p.dead = true;
      continue;
    }
    // Only seeking shots look for a new target; thrown ones fly straight.
    if (p.turnRate > 0 && !alive(p.target, p.targetUid)) {
      p.target = nearestEnemy(world, p.x, p.y, config.weapons.seekRange, p.hits);
      p.targetUid = p.target ? p.target.uid : 0;
    }
    if (p.target && p.turnRate > 0) {
      const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
      const diff = angleDiff(p.angle, want);
      const maxTurn = p.turnRate * dt;
      p.angle += diff > maxTurn ? maxTurn : diff < -maxTurn ? -maxTurn : diff;
    }
    const cos = Math.cos(p.angle);
    const sin = Math.sin(p.angle);
    p.x += cos * p.speed * dt;
    p.y += sin * p.speed * dt;

    world.enemyHash.query(p.x, p.y, p.radius + MAX_ENEMY_RADIUS, near);
    for (let n = 0; n < near.length; n++) {
      const e = enemies[near[n] as number] as Enemy;
      // A faded ghost lets shots pass through without using up their pierce.
      if (e.dead || isFaded(e) || p.hits.includes(e.uid)) continue;
      const r = p.radius + e.def.radius;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > r * r) continue;
      if (p.blast > 0) {
        burst(world, p);
        p.dead = true;
        break;
      }
      const crit = p.critChance > 0 && world.rng.next() < p.critChance;
      damageEnemy(world, e, crit ? p.damage * p.critMult : p.damage, cos, sin, p.knockback, p.source);
      p.hits.push(e.uid);
      if (--p.pierce < 0) {
        p.dead = true;
        break;
      }
    }
  }
  world.projectiles.releaseWhere(isDead);
}

const isDead = (p: Projectile): boolean => p.dead;

/** A bursting shot: everything within `blast` of where it struck is hit, pushed out from the centre. */
function burst(world: World, p: Projectile): void {
  const list = world.enemies.active;
  const ids = world.enemyHash.query(p.x, p.y, p.blast + MAX_ENEMY_RADIUS, world.targetsScratch);
  if (p.source) addBolt(world, p.x, p.y, p.blast, p.source.id);
  world.numberBudget = config.effects.strikeNumbers;
  for (let i = 0; i < ids.length; i++) {
    const e = list[ids[i] as number] as Enemy;
    if (e.dead || isFaded(e)) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    const r = p.blast + e.def.radius;
    if (dx * dx + dy * dy > r * r) continue;
    const d = Math.hypot(dx, dy) || 1;
    damageEnemy(world, e, p.damage, dx / d, dy / d, p.knockback, p.source);
  }
  world.numberBudget = Infinity;
}
