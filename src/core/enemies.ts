import { config } from '../data/config';
import { ENEMIES, MAX_ENEMY_RADIUS, type EnemyDef, type EnemyId } from '../data/enemies';
import { TAU } from './math';
import { updateBoss } from './bosses';
import { behaviourStep, isFaded } from './behaviours';
import { hurtPlayer } from './player';
import type { Poolable } from './pool';
import type { OwnedWeapon } from './weapons';
import type { World } from './world';

export interface Enemy extends Poolable {
  /** Unique per spawn, so references held by projectiles survive pool reuse. */
  uid: number;
  type: EnemyId;
  def: EnemyDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  kbx: number;
  kby: number;
  flash: number;
  /** Seconds left slowed by frost. */
  slow: number;
  /** Per weapon slot: match time when an orbit weapon may hit this enemy again. */
  orbitReady: number[];
  /** Bosses only (core/bosses.ts): ability phase, seconds left in it, and the direction it aimed. */
  act: number;
  actT: number;
  aimX: number;
  aimY: number;
  dead: boolean;
}

export const createEnemy = (): Enemy => ({
  poolIndex: -1,
  uid: 0,
  type: 'skeleton',
  def: ENEMIES.skeleton,
  x: 0,
  y: 0,
  hp: 0,
  maxHp: 0,
  kbx: 0,
  kby: 0,
  flash: 0,
  slow: 0,
  orbitReady: new Array<number>(config.weapons.maxOwned).fill(0),
  act: 0,
  actT: 0,
  aimX: 1,
  aimY: 0,
  dead: false,
});

let nextUid = 1;
/** Reused output of behaviourStep. */
const STEP = { x: 0, y: 0 };

export function spawnEnemy(world: World, type: EnemyId, x: number, y: number, hpMult = 1): Enemy {
  const e = world.enemies.acquire();
  const def: EnemyDef = ENEMIES[type];
  e.uid = nextUid++;
  e.type = type;
  e.def = def;
  e.x = x;
  e.y = y;
  e.maxHp = e.hp = def.hp * hpMult;
  e.kbx = e.kby = e.flash = e.slow = 0;
  e.orbitReady.fill(0);
  e.act = 0;
  e.actT = def.ability ? def.ability.every / 2 : def.move ? 2 : 0;
  e.aimX = 1;
  e.aimY = 0;
  e.dead = false;
  return e;
}

/** Radius of the ring just outside the visible area. */
export const spawnRadius = (world: World): number =>
  Math.hypot(world.view.w, world.view.h) / 2 + config.enemies.spawnMargin;

/** Places a point on the spawn ring around the player at `angle`. */
export function ringPoint(world: World, angle: number, out: { x: number; y: number }): void {
  const r = spawnRadius(world);
  out.x = world.player.x + Math.cos(angle) * r;
  out.y = world.player.y + Math.sin(angle) * r;
}

export function spawnOnRing(world: World, type: EnemyId, hpMult = 1): Enemy {
  const e = spawnEnemy(world, type, 0, 0, hpMult);
  ringPoint(world, world.rng.next() * TAU, e);
  return e;
}

export function rebuildEnemyHash(world: World): void {
  const h = world.enemyHash;
  h.clear();
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (!e.dead) h.insert(i, e.x, e.y);
  }
}

/**
 * Damages an enemy; death is deferred to `sweepDeadEnemies`. Knockback direction (kx, ky) is a unit-ish vector.
 * `source` is credited with the damage actually dealt (for the end-of-run report).
 */
export function damageEnemy(
  world: World,
  e: Enemy,
  amount: number,
  kx = 0,
  ky = 0,
  knockback = 0,
  source: OwnedWeapon | null = null,
): void {
  if (e.dead || isFaded(e)) return;
  if (source) source.damage += Math.min(amount, e.hp);
  world.tally.hits++;
  e.hp -= amount;
  e.flash = config.enemies.hitFlash;
  const kb = knockback * (1 - e.def.knockbackResist);
  e.kbx += kx * kb;
  e.kby += ky * kb;
  world.onEnemyDamaged(e, amount, source);
  if (e.hp <= 0) e.dead = true;
}

export function updateEnemies(world: World, dt: number): void {
  const list = world.enemies.active;
  const p = world.player;
  const { separation, knockbackDecay, recycleFactor } = config.enemies;
  const recycleSq = (spawnRadius(world) * recycleFactor) ** 2;
  const near = world.scratch;
  const decay = Math.max(0, 1 - knockbackDecay * dt);
  // Sopro de Geada: nobody moves or bites while the world is frozen (knockback still applies).
  const frozen = world.freeze > 0;

  rebuildEnemyHash(world);
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;

    // Seek: straight vector to the player.
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const distSq = dx * dx + dy * dy;
    if (distSq > recycleSq && !e.def.boss) {
      // Too far behind: reappear on the ring in the direction the player is heading.
      ringPoint(world, Math.atan2(p.facing.y, p.facing.x) + (world.rng.next() - 0.5) * 1.5, e);
      continue;
    }
    const dist = Math.sqrt(distSq) || 1;
    // A boss using its ability moves on its own (or stands still) instead of walking to the hero.
    const acting = e.def.boss && updateBoss(world, e, dt);
    let speed = frozen || acting ? 0 : e.def.speed * dt;
    if (e.slow > 0) {
      e.slow -= dt;
      speed *= config.zones.slowFactor;
    }
    let mx: number;
    let my: number;
    if (e.def.move && !frozen) {
      behaviourStep(world, e, dt, dx / dist, dy / dist, dist, speed, STEP);
      mx = STEP.x;
      my = STEP.y;
      if (e.def.move === 'phase') {
        // Passes through the crowd: no separation.
        e.x += mx + e.kbx * dt;
        e.y += my + e.kby * dt;
        e.kbx *= decay;
        e.kby *= decay;
        continue;
      }
    } else {
      mx = (dx / dist) * speed;
      my = (dy / dist) * speed;
    }

    // Separation from overlapping neighbours, weighted by size so the big ones shove the small.
    const r = e.def.radius;
    world.enemyHash.query(e.x, e.y, r + MAX_ENEMY_RADIUS, near);
    for (let n = 0; n < near.length; n++) {
      const j = near[n] as number;
      if (j === i) continue;
      const o = list[j] as Enemy;
      const ox = e.x - o.x;
      const oy = e.y - o.y;
      const minD = r + o.def.radius;
      const dSq = ox * ox + oy * oy;
      if (dSq >= minD * minD) continue;
      const d = Math.sqrt(dSq);
      const r2 = o.def.radius * o.def.radius;
      const push = ((minD - d) * separation * r2) / (r * r + r2);
      if (d > 0.0001) {
        mx += (ox / d) * push;
        my += (oy / d) * push;
      } else {
        mx += (j < i ? 1 : -1) * push; // exact overlap: split deterministically
      }
    }

    e.x += mx + e.kbx * dt;
    e.y += my + e.kby * dt;
    e.kbx *= decay;
    e.kby *= decay;
  }
  rebuildEnemyHash(world);

  // Contact damage (player i-frames make only one hit land at a time).
  if (frozen) return;
  const reach = config.player.radius + MAX_ENEMY_RADIUS;
  world.enemyHash.query(p.x, p.y, reach, near);
  for (let n = 0; n < near.length; n++) {
    const e = list[near[n] as number] as Enemy;
    const minD = config.player.radius + e.def.radius;
    const cx = p.x - e.x;
    const cy = p.y - e.y;
    if (cx * cx + cy * cy < minD * minD && !isFaded(e) && hurtPlayer(p, e.def.damage)) {
      world.events.push({ type: 'playerHit' });
      break;
    }
  }
}

/** Removes dead enemies (backwards, so swap-remove is safe) and reports each death to the world. */
export function sweepDeadEnemies(world: World): void {
  const list = world.enemies.active;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i] as Enemy;
    if (!e.dead) continue;
    world.onEnemyKilled(e);
    world.enemies.release(e);
  }
}
