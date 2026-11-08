import { config } from '../data/config';
import type { Pool, Poolable } from './pool';
import type { World } from './world';

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
}
export const createSlash = (): Slash => ({ poolIndex: -1, ttl: 0, angle: 0, arc: 0, range: 0 });

/** A lightning bolt hitting the ground for a moment (purely visual). */
export interface Bolt extends Timed {
  x: number;
  y: number;
  radius: number;
}
export const createBolt = (): Bolt => ({ poolIndex: -1, ttl: 0, x: 0, y: 0, radius: 0 });

export function addBolt(world: World, x: number, y: number, radius: number): void {
  const b = world.bolts.acquire();
  b.x = x;
  b.y = y;
  b.radius = radius;
  b.ttl = config.effects.boltTtl;
}

export interface DamageNumber extends Timed {
  x: number;
  y: number;
  value: number;
}
export const createDamageNumber = (): DamageNumber => ({ poolIndex: -1, ttl: 0, x: 0, y: 0, value: 0 });

export function addDamageNumber(world: World, x: number, y: number, value: number): void {
  const fx = config.effects;
  if (world.damageNumbers.size >= fx.maxDamageNumbers) return;
  const d = world.damageNumbers.acquire();
  d.x = x + (world.rng.next() - 0.5) * 10;
  d.y = y;
  d.value = value;
  d.ttl = fx.damageNumberTtl;
}

export function updateEffects(world: World, dt: number): void {
  expire(world.slashes, dt);
  expire(world.bolts, dt);
  const rise = config.effects.damageNumberRise * dt;
  for (const d of world.damageNumbers.active) d.y -= rise;
  expire(world.damageNumbers, dt);
}
