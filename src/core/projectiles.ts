import { config } from '../data/config';
import { MAX_ENEMY_RADIUS } from '../data/enemies';
import { isFaded } from './behaviours';
import { WEAPONS, type WeaponDef } from '../data/weapons';
import { applyDot, damageEnemy, type Enemy } from './enemies';
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
  /** Leque de Facas: hits left that bounce to the nearest enemy instead of ending the shot. */
  bounces: number;
  /** Estrela de Lyra's small stars: falling, they touch nothing, and burst where they land (when `ttl` ends). */
  fuse: boolean;
  /** Fúria da Forja: at this much `ttl` left the hammer turns back (0 = never); `home` once it does. */
  back: number;
  home: boolean;
  /** Escudos de Valmor: the heading turns at this rad/s (signed), so the shot flies a loop (0 = straight). */
  curve: number;
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
  bounces: 0,
  fuse: false,
  back: 0,
  home: false,
  curve: 0,
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
 * in `exclude`. A few random probes of the active list first; when they all miss (most of the crowd off screen),
 * one pass over the list from a random start. No allocation; null only when no enemy qualifies.
 */
export function randomEnemyNear(world: World, hw: number, hh: number, exclude: number[]): Enemy | null {
  const list = world.enemies.active;
  const n = list.length;
  if (n === 0) return null;
  const p = world.player;
  for (let tries = 0; tries < 12; tries++) {
    const e = list[world.rng.int(n)] as Enemy;
    if (fitsNear(e, p.x, p.y, hw, hh, exclude)) return e;
  }
  const start = world.rng.int(n);
  for (let k = 0; k < n; k++) {
    const e = list[(start + k) % n] as Enemy;
    if (fitsNear(e, p.x, p.y, hw, hh, exclude)) return e;
  }
  return null;
}

function fitsNear(e: Enemy, x: number, y: number, hw: number, hh: number, exclude: number[]): boolean {
  if (e.dead || isFaded(e) || exclude.includes(e.uid)) return false;
  return Math.abs(e.x - x) <= hw && Math.abs(e.y - y) <= hh;
}

export function updateProjectiles(world: World, dt: number): void {
  const list = world.projectiles.active;
  const enemies = world.enemies.active;
  const near = world.scratch;
  for (let i = 0; i < list.length; i++) {
    const p = list[i] as Projectile;
    p.ttl -= dt;
    if (p.fuse) {
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
      if (p.ttl <= 0) {
        burst(world, p);
        p.dead = true;
      }
      continue;
    }
    if (p.curve !== 0) {
      p.angle += p.curve * dt;
      if (p.back > 0 && p.ttl <= p.back) {
        // Halfway round the loop the shield may hit everyone again.
        p.back = 0;
        p.hits.length = 0;
      }
    } else if (p.back > 0 && p.ttl <= p.back) {
      // Halfway: the hammer turns home, and may hit everything again on the way back.
      p.back = 0;
      p.home = true;
      p.hits.length = 0;
      p.ttl += p.ttl; // time enough to come all the way back
    }
    if (p.home) {
      const pl = world.player;
      const hx = pl.x - p.x;
      const hy = pl.y - p.y;
      if (hx * hx + hy * hy < HOME_SQ) p.dead = true;
      else p.angle = Math.atan2(hy, hx);
    }
    if (p.ttl <= 0 || p.dead) {
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
      const amount = crit ? p.damage * p.critMult : p.damage;
      damageEnemy(world, e, amount, cos, sin, p.knockback, p.source);
      e.hitCrit = crit;
      p.hits.push(e.uid);
      const def = p.source ? (WEAPONS[p.source.id] as WeaponDef) : null;
      // Leque de Facas: a crit opens a wound that bleeds.
      if (crit && def?.bleed) applyDot(e, 'bleed', amount * def.bleed.dps, def.bleed.duration, p.source);
      // ...and the knife bounces to the nearest enemy it hasn't hit (this overwrites `near`: stop here).
      if (p.bounces > 0 && def?.ricochet) {
        const next = nearestEnemy(world, p.x, p.y, def.ricochet.range, p.hits);
        if (next) {
          p.bounces--;
          p.angle = Math.atan2(next.y - p.y, next.x - p.x);
          p.ttl = Math.max(p.ttl, def.ricochet.range / p.speed);
          break;
        }
      }
      if (--p.pierce < 0) {
        p.dead = true;
        break;
      }
    }
  }
  world.projectiles.releaseWhere(isDead);
}

const isDead = (p: Projectile): boolean => p.dead;
/** A returning hammer is caught this close to the hero. */
const HOME_SQ = 24 * 24;

/**
 * A bursting shot: everything within `blast` of where it struck is hit, pushed out from the centre. Estrela de
 * Lyra's orb then splits into small stars that fall around and burst again (they don't split).
 */
function burst(world: World, p: Projectile): void {
  const split = !p.fuse && p.source ? (WEAPONS[p.source.id] as WeaponDef).split : undefined;
  if (split) scatterStars(world, p, split);
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

/** Estrela de Lyra: `count` small stars thrown evenly around the burst (a random turn), landing `distance` away. */
function scatterStars(
  world: World,
  p: Projectile,
  split: { count: number; distance: number; scale: number; fall: number },
): void {
  const turn = world.rng.next() * Math.PI * 2;
  for (let k = 0; k < split.count; k++) {
    const star = world.projectiles.acquire();
    star.x = p.x;
    star.y = p.y;
    star.angle = turn + (k * Math.PI * 2) / split.count;
    star.speed = (split.distance * world.player.stats.area) / split.fall;
    star.ttl = split.fall;
    star.fuse = true;
    star.sprite = STARLET;
    star.source = p.source;
    star.damage = p.damage * split.scale;
    star.blast = p.blast * split.scale;
    star.knockback = p.knockback * split.scale;
    star.radius = 0;
    star.pierce = 0;
    star.turnRate = 0;
    star.target = null;
    star.targetUid = 0;
    star.critChance = 0;
    star.critMult = 1;
    star.bounces = 0;
    star.back = 0;
    star.home = false;
    star.hits.length = 0;
    star.dead = false;
  }
}

/** Asset key of Estrela de Lyra's small falling stars. */
export const STARLET = 'proj.starlet';
