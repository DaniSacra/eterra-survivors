import { config } from '../data/config';
import type { Pool, Poolable } from './pool';
import type { World } from './world';
import type { WeaponId } from '../data/weapons';

/** Anything that disappears after a while. */
export interface Timed extends Poolable {
  ttl: number;
}

/** Ticks `ttl` down and releases expired items (backwards: swap-remove safe). */
export function expire<T extends Timed>(pool: Pool<T>, dt: number): void {
  const list = pool.active;
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i] as T;
    it.ttl -= dt;
    if (it.ttl <= 0) pool.release(it);
  }
}

/** A sword swing drawn around the player for a moment (purely visual). */
export interface Slash extends Timed {
  angle: number;
  arc: number;
  range: number;
  /** The weapon that swung it (each is drawn in its own colors). */
  weapon: WeaponId;
}
export const createSlash = (): Slash => ({
  poolIndex: -1,
  ttl: 0,
  angle: 0,
  arc: 0,
  range: 0,
  weapon: 'blade',
});

/** Something falling from the sky (lightning, fire) and hitting the ground for a moment (purely visual). */
export interface Bolt extends Timed {
  x: number;
  y: number;
  radius: number;
  /** The weapon that cast it (each is drawn in its own look). */
  weapon: WeaponId;
}
export const createBolt = (): Bolt => ({ poolIndex: -1, ttl: 0, x: 0, y: 0, radius: 0, weapon: 'lightning' });

export function addBolt(world: World, x: number, y: number, radius: number, weapon: WeaponId): void {
  const b = world.bolts.acquire();
  b.x = x;
  b.y = y;
  b.radius = radius;
  b.weapon = weapon;
  b.ttl = config.effects.boltTtl;
}

export interface DamageNumber extends Timed {
  x: number;
  y: number;
  value: number;
  /** The enemy it belongs to: hits on it within `damageMergeTime` add up here instead of stacking. */
  uid: number;
  /** A big hit (value >= config.effects.strongHit), drawn larger and in gold. */
  strong: boolean;
}
export const createDamageNumber = (): DamageNumber => ({
  poolIndex: -1,
  ttl: 0,
  x: 0,
  y: 0,
  value: 0,
  uid: 0,
  strong: false,
});

/** Shows a hit on enemy `uid` at (x, y), adding it to that enemy's fresh number if there is one. */
export function addDamageNumber(world: World, uid: number, x: number, y: number, value: number): void {
  const fx = config.effects;
  const list = world.damageNumbers.active;
  const fresh = fx.damageNumberTtl - fx.damageMergeTime;
  for (let i = 0; i < list.length; i++) {
    const d = list[i] as DamageNumber;
    if (d.uid !== uid || d.ttl < fresh) continue;
    d.value += value;
    d.strong = d.value >= fx.strongHit;
    return;
  }
  if (world.damageNumbers.size >= fx.maxDamageNumbers) return;
  const d = world.damageNumbers.acquire();
  // Spread from the enemy's uid: purely visual, so it must never draw from the run's Rng.
  d.x = x + ((uid * 7919) % 11) - 5;
  d.y = y;
  d.value = value;
  d.uid = uid;
  d.strong = value >= fx.strongHit;
  d.ttl = fx.damageNumberTtl;
}

/** A short puff where something vanished: an enemy dying, or a gem or item being picked up (purely visual). */
export interface Puff extends Timed {
  x: number;
  y: number;
  /** Size, world px. */
  r: number;
  kind: 'death' | 'gem' | 'item';
}
export const createPuff = (): Puff => ({ poolIndex: -1, ttl: 0, x: 0, y: 0, r: 0, kind: 'death' });

export function addPuff(world: World, x: number, y: number, r: number, kind: Puff['kind']): void {
  if (world.puffs.size >= config.effects.maxPuffs) return;
  const p = world.puffs.acquire();
  p.x = x;
  p.y = y;
  p.r = r;
  p.kind = kind;
  p.ttl = config.effects.puffTtl;
}

export function updateEffects(world: World, dt: number): void {
  expire(world.puffs, dt);
  expire(world.slashes, dt);
  expire(world.bolts, dt);
  const rise = config.effects.damageNumberRise * dt;
  const nums = world.damageNumbers.active;
  for (let i = 0; i < nums.length; i++) (nums[i] as DamageNumber).y -= rise;
  expire(world.damageNumbers, dt);
}
