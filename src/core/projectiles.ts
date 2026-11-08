import { config } from '../data/config';
import { MAX_ENEMY_RADIUS } from '../data/enemies';
import { damageEnemy, type Enemy } from './enemies';
import { angleDiff } from './math';
import type { Poolable } from './pool';
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
  target: null,
  targetUid: 0,
  hits: [],
  dead: false,
});

const alive = (e: Enemy | null, uid: number): e is Enemy =>
  !!e && e.uid === uid && !e.dead && e.poolIndex >= 0;

/** Nearest living enemy to (x, y) within `range`, skipping uids in `exclude`. Uses the spatial hash. */
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
    if (e.dead || (exclude && exclude.includes(e.uid))) continue;
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
    if (!alive(p.target, p.targetUid)) {
      p.target = nearestEnemy(world, p.x, p.y, config.weapons.seekRange, p.hits);
      p.targetUid = p.target ? p.target.uid : 0;
    }
    if (p.target) {
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
      if (e.dead || p.hits.includes(e.uid)) continue;
      const r = p.radius + e.def.radius;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      if (dx * dx + dy * dy > r * r) continue;
      damageEnemy(world, e, p.damage, cos, sin, p.knockback);
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
