import { config } from '../data/config';
import { MAX_ENEMY_RADIUS } from '../data/enemies';
import { expire, type Timed } from './effects';
import { applyDot, damageEnemy, type Enemy } from './enemies';
import type { OwnedWeapon } from './weapons';
import type { World } from './world';

/**
 * A patch on the ground that hurts every `config.zones.tick`: frost slows what stands in it; burning ground
 * (Espada de Fogo) sets it alight instead.
 */
export interface Zone extends Timed {
  slows: boolean;
  /** Burning: damage per second it sets on whoever stands in it, and for how long (0 = none). */
  burnDps: number;
  burnFor: number;
  x: number;
  y: number;
  radius: number;
  damage: number;
  /** Seconds to the next damage tick. */
  tick: number;
  /** Total lifetime, so the renderer can fade it. */
  duration: number;
  source: OwnedWeapon | null;
}

export const createZone = (): Zone => ({
  poolIndex: -1,
  ttl: 0,
  slows: true,
  burnDps: 0,
  burnFor: 0,
  x: 0,
  y: 0,
  radius: 0,
  damage: 0,
  tick: 0,
  duration: 0,
  source: null,
});

export function addZone(
  world: World,
  x: number,
  y: number,
  radius: number,
  duration: number,
  damage: number,
  source: OwnedWeapon | null = null,
): Zone {
  const z = world.zones.acquire();
  z.slows = true;
  z.burnDps = z.burnFor = 0;
  z.x = x;
  z.y = y;
  z.radius = radius;
  z.damage = damage;
  z.ttl = z.duration = duration;
  z.tick = 0;
  z.source = source;
  return z;
}

export function updateZones(world: World, dt: number): void {
  const list = world.enemies.active;
  const { tick } = config.zones;
  const zones = world.zones.active;
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i] as Zone;
    z.tick -= dt;
    if (z.tick > 0) continue;
    z.tick += tick;
    const ids = world.enemyHash.query(z.x, z.y, z.radius + MAX_ENEMY_RADIUS, world.scratch);
    for (let n = 0; n < ids.length; n++) {
      const e = list[ids[n] as number] as Enemy;
      const r = z.radius + e.def.radius * 0.5;
      if (e.dead || (e.x - z.x) ** 2 + (e.y - z.y) ** 2 > r * r) continue;
      damageEnemy(world, e, z.damage, 0, 0, 0, z.source);
      // Slowed until a little after the next tick, so standing in frost keeps it on.
      if (z.slows) e.slow = tick * 1.5;
      if (z.burnDps > 0) applyDot(e, 'burn', z.burnDps, z.burnFor, z.source);
    }
  }
  expire(world.zones, dt);
}
