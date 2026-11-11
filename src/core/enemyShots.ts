import { config } from '../data/config';
import { hurtHero } from './elos';
import type { Poolable } from './pool';
import type { World } from './world';

/** Where the hero's damage came from (the sim's "DANO POR FONTE"). */
export type HurtSource = 'contact' | 'shot' | 'leap' | 'boss';
export const HURT_SOURCES: readonly HurtSource[] = ['contact', 'shot', 'leap', 'boss'];

/** A slow shot thrown by an enemy (FT-03): it flies straight and hurts only the hero. */
export interface EnemyShot extends Poolable {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  ttl: number;
  /** Seconds it has flown (the render draws its short trail from it). */
  age: number;
}

export const createEnemyShot = (): EnemyShot => ({
  poolIndex: -1,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  radius: 0,
  damage: 0,
  ttl: 0,
  age: 0,
});

/** Throws a shot from (x, y) at (tx, ty). Over the cap (config.enemyShots.max), nothing is thrown. */
export function fireEnemyShot(
  world: World,
  x: number,
  y: number,
  tx: number,
  ty: number,
  speed: number,
  radius: number,
  life: number,
  damage: number,
): boolean {
  if (world.enemyShots.size >= config.enemyShots.max) return false;
  const d = Math.hypot(tx - x, ty - y) || 1;
  const s = world.enemyShots.acquire();
  s.x = x;
  s.y = y;
  s.vx = ((tx - x) / d) * speed;
  s.vy = ((ty - y) / d) * speed;
  s.radius = radius;
  s.damage = damage;
  s.ttl = life;
  s.age = 0;
  return true;
}

/** Moves the shots (frozen by Sopro de Geada) and lands the ones that reach the hero. */
export function updateEnemyShots(world: World, dt: number): void {
  const list = world.enemyShots.active;
  const p = world.player;
  const reach = config.player.radius;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i] as EnemyShot;
    s.ttl -= dt;
    if (world.freeze <= 0) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.age += dt;
    }
    const r = reach + s.radius;
    const hit = (p.x - s.x) ** 2 + (p.y - s.y) ** 2 <= r * r;
    if (hit && hurtHero(world, null, s.damage, 'shot')) world.events.push({ type: 'playerHit' });
    if (hit || s.ttl <= 0) world.enemyShots.release(s);
  }
}
